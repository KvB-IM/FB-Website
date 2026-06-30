const express = require('express');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to Zoho MCP OAuth config files
const tokensPath = '/Users/Work/.mcp-auth/mcp-remote-0.1.37/ffbea0455b66e4e46198c79cef6a5283_tokens.json';
const clientInfoPath = '/Users/Work/.mcp-auth/mcp-remote-0.1.37/ffbea0455b66e4e46198c79cef6a5283_client_info.json';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from project root
app.use(express.static(path.join(__dirname)));

// Helper to map values to human-readable names for notes
const serviceMap = {
  '0-5': '0 – 5 years',
  '6-10': '6 – 10 years',
  '11-20': '11 – 20 years',
  '21+': '21+ years'
};

const topicMap = {
  'fegli': 'FEGLI Life Insurance',
  'tsp': 'TSP Retirement',
  'fehb': 'FEHB Health Insurance',
  'all': 'All three equally'
};

// Function to refresh the access token via Zoho MCP Proxy by calling tools/list using mcp-remote bridge
async function refreshAccessToken() {
  console.log('Refreshing Zoho CRM access token via mcp-remote proxy...');
  if (!fs.existsSync(tokensPath) || !fs.existsSync(clientInfoPath)) {
    throw new Error('OAuth credential files do not exist at expected paths.');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('/usr/local/bin/npx', [
      'mcp-remote',
      'https://insurance-masters-calendar-919064954.zohomcp.com/mcp/af8a1bf13c36a72983ec1a47caef0e89/message',
      '--transport',
      'http-only'
    ]);

    let resolved = false;
    let stdoutData = '';

    child.stdout.on('data', (data) => {
      const str = data.toString();
      stdoutData += str;
      if (stdoutData.includes('{') && !resolved) {
        resolved = true;
        child.kill();
        // Read the updated token from tokensPath after a brief delay
        setTimeout(() => {
          try {
            const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
            console.log('Access token refreshed and loaded successfully via mcp-remote.');
            resolve(tokens.access_token);
          } catch (err) {
            reject(err);
          }
        }, 500);
      }
    });

    child.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('Proxy established successfully') && !resolved) {
        // Send a request to list tools to trigger session token exchange
        const request = JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: 1
        }) + '\n';
        child.stdin.write(request);
      }
    });

    child.on('close', (code) => {
      if (!resolved) {
        reject(new Error(`mcp-remote exited with code ${code} before token refresh could resolve`));
      }
    });

    // Timeout after 12 seconds
    setTimeout(() => {
      if (!resolved) {
        child.kill();
        reject(new Error('mcp-remote token refresh timed out'));
      }
    }, 12000);
  });
}

// Function to perform lead insertion in Zoho CRM module FB_Clients_Leads
async function insertLeadIntoCRM(accessToken, leadData) {
  const payload = JSON.stringify({
    data: [leadData]
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'www.zohoapis.com',
      path: '/crm/v6/FB_Clients_Leads',
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error('Parse error in lead insertion response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// REST Endpoint to handle registrations
app.post('/api/register', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, yearsService, topic, webinarDate, agency } = req.body;

    if (!firstName || !lastName || !email || !webinarDate) {
      return res.status(400).json({ success: false, error: 'First Name, Last Name, Email, and Webinar Date are required.' });
    }

    // Format fields
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const registrationAgency = agency || 'Federal';
    
    // Format Notes_Questions from service/topic selection
    let notes = '';
    if (webinarDate) {
      const dateMap = {
        '2026-07-02T19:00:00-04:00': 'Thursday, July 2 at 7:00 PM EDT',
        '2026-07-09T19:00:00-04:00': 'Thursday, July 9 at 7:00 PM EDT',
        '2026-07-16T19:00:00-04:00': 'Thursday, July 16 at 7:00 PM EDT'
      };
      const humanDate = dateMap[webinarDate] || webinarDate;
      notes += `Selected Webinar: ${humanDate}\n`;
    }
    if (yearsService && serviceMap[yearsService]) {
      if (registrationAgency === 'USPS') {
        notes += `Years with USPS: ${serviceMap[yearsService]}\n`;
      } else {
        notes += `Years of Federal Service: ${serviceMap[yearsService]}\n`;
      }
    }
    if (topic && topicMap[topic]) {
      notes += `Most Interested Topic: ${topicMap[topic]}\n`;
    }
    notes += `Registration Origin: ${registrationAgency === 'USPS' ? 'USPS Landing Page' : 'General Federal Home Page'}\n`;

    const leadPayload = {
      Name: fullName,
      Client_First_Name: firstName.trim(),
      Email: email.trim(),
      Mobile_Phone: cleanPhone,
      Leads_Agent: 'FB Website',
      Stage: 'Webinar',
      Webinar_Appointment: webinarDate,
      Notes_Questions: notes.trim()
    };

    console.log('Sending lead payload to Zoho CRM:', JSON.stringify(leadPayload, null, 2));

    // Read current access token
    if (!fs.existsSync(tokensPath)) {
      return res.status(500).json({ success: false, error: 'Zoho token store not initialized on server.' });
    }
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    let accessToken = tokens.access_token;

    let crmResponse = await insertLeadIntoCRM(accessToken, leadPayload);

    // If token expired/invalid, try to refresh and retry once
    const isTokenError = crmResponse.code === 'INVALID_TOKEN' || 
                         (crmResponse.status === 'error' && (crmResponse.message || '').includes('token'));
                         
    if (isTokenError) {
      console.log('Access token expired or invalid. Attempting refresh...');
      try {
        accessToken = await refreshAccessToken();
        console.log('Re-submitting lead with new token...');
        crmResponse = await insertLeadIntoCRM(accessToken, leadPayload);
      } catch (refreshErr) {
        console.error('Failed to refresh access token:', refreshErr.message);
        return res.status(401).json({ success: false, error: 'Authentication failed with Zoho CRM.' });
      }
    }

    console.log('CRM API response:', JSON.stringify(crmResponse, null, 2));

    // Handle Zoho API errors
    if (crmResponse.data && crmResponse.data[0]) {
      const recordStatus = crmResponse.data[0];
      if (recordStatus.status === 'success') {
        return res.status(200).json({ success: true, id: recordStatus.details.id });
      } else {
        return res.status(400).json({ success: false, error: recordStatus.message, details: recordStatus.details });
      }
    }

    return res.status(500).json({ success: false, error: 'Unexpected response from Zoho CRM.', details: crmResponse });
  } catch (err) {
    console.error('Error registering lead:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback for SPA routing if needed (e.g. blog or home redirect)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
