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

async function logChange(action, userId, entity, entityId, entityName, details = {}) {
    try {
      // Fetch user name from users collection
      let userName = 'Unknown';
      try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
          userName = userDoc.data().name || 'Unnamed User';
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
      }
  
      const logEntry = {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        action,
        userId: userId || 'unknown',
        userName,
        entity,
        entityId,
        entityName: entityName || 'N/A',
        details,
      };
      await db.collection('logs').add(logEntry);
      console.log(`Logged: ${action} on ${entity} (${entityId}, ${entityName}) by ${userId} (${userName})`);
    } catch (error) {
      console.error('Error logging change:', error);
    }
  }

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

        await logChange('CREATE', patientId, 'Caretaker', caretakerRef.id, name, { data: req.body });
        console.log('Caretaker added with ID:', caretakerRef.id); // Debug: Log caretaker ID
        res.json({ message: 'Caretaker added successfully', id: caretakerRef.id });
    } catch (error) {
        console.error('Error adding caretaker to Firebase:', error); // Log full error object
        res.status(500).json({ error: 'Failed to add caretaker', details: error.message });
    }
});
app.get('/api/caretaker/get', async (req, res) => {
    const { patientId } = req.query;

    if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
    }

    try {
        const snapshot = await db.collection('caretakers')
            .where('patientId', '==', patientId)
            .get();

        if (snapshot.empty) {
            console.log('No caretakers found for patientId:', patientId);
            return res.json([]);
        }

        const caretakers = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log('Caretakers retrieved:', caretakers);
        res.json(caretakers);
    } catch (error) {
        console.error('Error fetching caretakers from Firebase:', error);
        res.status(500).json({ error: 'Failed to fetch caretakers', details: error.message });
    }
});

app.post('/api/caretaker/update', async (req, res) => {
    const { id, patientId, name, relation, phone, email } = req.body;

    if (!id || !patientId) {
        return res.status(400).json({ error: 'id and patientId are required' });
    }

    try {
        const caretakerRef = db.collection('caretakers').doc(id);
        const doc = await caretakerRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Caretaker not found' });
        }

        const caretakerData = doc.data();
        if (caretakerData.patientId !== patientId) {
            return res.status(403).json({ error: 'Unauthorized to update this caretaker' });
        }

        await caretakerRef.update({
            name,
            relation,
            phone,
            email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await logChange('UPDATE', patientId, 'Caretaker', id, name, { oldData: caretakerData, newData: req.body });
        console.log('Caretaker updated successfully:', { id });
        res.json({ message: 'Caretaker updated successfully' });
    } catch (error) {
        console.error('Error updating caretaker in Firebase:', error);
        res.status(500).json({ error: 'Failed to update caretaker', details: error.message });
    }
});

// Delete a caretaker
app.delete('/api/caretaker/delete', async (req, res) => {
    const { id, patientId } = req.body;

    if (!id || !patientId) {
        return res.status(400).json({ error: 'id and patientId are required' });
    }

    try {
        const caretakerRef = db.collection('caretakers').doc(id);
        const doc = await caretakerRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Caretaker not found' });
        }

        const caretakerData = doc.data();
        if (caretakerData.patientId !== patientId) {
            return res.status(403).json({ error: 'Unauthorized to delete this caretaker' });
        }

        await logChange('DELETE', patientId, 'Caretaker', id, caretakerData.name, { data: caretakerData });
        await caretakerRef.delete();

        console.log('Caretaker deleted successfully:', { id });
        res.json({ message: 'Caretaker deleted successfully' });
    } catch (error) {
        console.error('Error deleting caretaker from Firebase:', error);
        res.status(500).json({ error: 'Failed to delete caretaker', details: error.message });
    }
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => console.log(`Caretaker Service running on port ${PORT}`));