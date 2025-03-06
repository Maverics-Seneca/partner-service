require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const cors = require('cors'); // Import cors
const cookieParser = require('cookie-parser'); // Import cookie-parser
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Firebase
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://middleware:3001', // Allow requests from middleware
    credentials: true, // Allow cookies to be sent
}));
app.use(bodyParser.json());
app.use(cookieParser());

// Add caretaker route
app.post('/api/caretaker/add', async (req, res) => {
    const { patientId, name, relation, email, phone } = req.body;

    try {
        // Add caretaker details to the "caretakers" collection
        const caretakerRef = await db.collection('caretakers').add({
            patientId,
            name,
            relation,
            email,
            phone,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log('Caretaker added with ID:', caretakerRef.id); // Debug: Log caretaker ID
        res.json({ message: 'Caretaker added successfully', id: caretakerRef.id });
    } catch (error) {
        console.error('Error adding caretaker to Firebase:', error); // Log full error object
        res.status(500).json({ error: 'Failed to add caretaker', details: error.message });
    }
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`Caretaker Service running on port ${PORT}`));