const express = require('express');
const path = require('path');

const app = express();

// Serve static files from dashboard directory
app.use(express.static(path.join(__dirname, '../dashboard')));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/index.html'));
});

app.get('/pricing', (req, res) => {
  res.sendFile(path.join(__dirname, '../dashboard/pricing.html'));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🎨 Dashboard running at http://localhost:${PORT}`);
});
