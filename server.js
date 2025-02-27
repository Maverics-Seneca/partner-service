const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = 4004;

app.use(express.json());

// Mock Database for Partner Codes
let partnerLinks = {};

// Function to generate a random 6-character alphanumeric code
const generatePartnerCode = () => {
    return crypto.randomBytes(3).toString('hex').toUpperCase(); // Generates a 6-character hex string
};

// Generate a Partner Code for a User
app.post('/partner/generate', (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }

    const code = generatePartnerCode();
    partnerLinks[code] = userId;

    res.json({ message: "Partner code generated successfully", userId, partnerCode: code });
});

// Retrieve User ID from Partner Code
app.get('/partner/:code', (req, res) => {
    const { code } = req.params;
    const userId = partnerLinks[code];

    if (!userId) {
        return res.status(404).json({ error: "Invalid or expired partner code" });
    }

    res.json({ message: "Partner code valid", userId });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: "Partner Service is running" });
});

app.listen(PORT, () => {
    console.log(`Partner Service running on port ${PORT}`);
});
