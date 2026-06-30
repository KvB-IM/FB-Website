const express = require('express');
const path = require('path');
const registerHandler = require('./api/register');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from project root
app.use(express.static(path.join(__dirname)));

// REST Endpoint to handle registrations (delegated to standard API handler)
app.post('/api/register', registerHandler);

// Fallback for SPA routing if needed (e.g. blog or home redirect)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

module.exports = app;
