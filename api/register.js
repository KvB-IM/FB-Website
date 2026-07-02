const fs = require('fs');
const https = require('https');

// Path to Zoho MCP OAuth config files
const tokensPath = '/Users/Work/.mcp-auth/mcp-remote-0.1.37/ffbea0455b66e4e46198c79cef6a5283_tokens.json';
const clientInfoPath = '/Users/Work/.mcp-auth/mcp-remote-0.1.37/ffbea0455b66e4e46198c79cef6a5283_client_info.json';

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

// Global in-memory cache for token
let cachedAccessToken = null;

// Function to refresh the access token directly via HTTP POST
async function refreshAccessToken() {
  console.log('Refreshing Zoho CRM access token via HTTP POST...');

  let refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  let clientId = process.env.ZOHO_CLIENT_ID;
  let tokenEndpoint = process.env.ZOHO_TOKEN_ENDPOINT || 'https://mcp.zoho.com/baas/mcp/v1/oauth/6f2a4a91336a7705d9708e245487b1a0/41167000000013038/token';

  // Fallback to local files if environment variables are not set
  if (!refreshToken || !clientId) {
    console.log('Environment variables ZOHO_REFRESH_TOKEN or ZOHO_CLIENT_ID not found, falling back to local OAuth config files...');
    if (fs.existsSync(tokensPath) && fs.existsSync(clientInfoPath)) {
      try {
        const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        const clientInfo = JSON.parse(fs.readFileSync(clientInfoPath, 'utf8'));
        refreshToken = tokens.refresh_token;
        clientId = clientInfo.client_id;
      } catch (err) {
        throw new Error('Failed to read local OAuth configuration files: ' + err.message);
      }
    } else {
      throw new Error('No Zoho OAuth credentials found (neither environment variables nor local files).');
    }
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  });

  const parsedUrl = new URL(tokenEndpoint);

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.access_token) {
            cachedAccessToken = result.access_token;
            console.log('Access token refreshed and loaded successfully via HTTP request.');
            
            // Try saving to local file for local dev, but catch errors if file system is read-only
            if (fs.existsSync(tokensPath)) {
              try {
                const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
                tokens.access_token = result.access_token;
                fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2), 'utf8');
                console.log('Updated local token store file.');
              } catch (writeErr) {
                console.warn('Could not write back to local tokens path (might be read-only filesystem):', writeErr.message);
              }
            }
            resolve(result.access_token);
          } else {
            reject(new Error('Token refresh response did not contain access_token: ' + data));
          }
        } catch (e) {
          reject(new Error('Failed to parse token refresh response: ' + data));
        }
      });
    });

    req.on('error', reject);
    req.write(params.toString());
    req.end();
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

// Serverless / Express request handler
module.exports = async function handler(req, res) {
  // Set CORS headers if needed, and handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

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
        '2026-07-22T14:00:00-04:00': 'Wednesday, July 22 at 2:00 PM EDT',
        '2026-07-29T14:00:00-04:00': 'Wednesday, July 29 at 2:00 PM EDT',
        '2026-08-05T14:00:00-04:00': 'Wednesday, August 5 at 2:00 PM EDT',
        '2026-08-12T14:00:00-04:00': 'Wednesday, August 12 at 2:00 PM EDT',
        '2026-08-19T14:00:00-04:00': 'Wednesday, August 19 at 2:00 PM EDT'
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

    // Read current access token from memory cache or file fallback
    let accessToken = cachedAccessToken;
    if (!accessToken) {
      if (fs.existsSync(tokensPath)) {
        try {
          const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
          accessToken = tokens.access_token;
          cachedAccessToken = accessToken;
        } catch (err) {
          console.warn('Failed to read local tokens file:', err.message);
        }
      }
    }

    let crmResponse;
    if (accessToken) {
      crmResponse = await insertLeadIntoCRM(accessToken, leadPayload);
    } else {
      // Force refresh if no cached token exists
      crmResponse = { code: 'INVALID_TOKEN' };
    }

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
};
