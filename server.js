// Import required modules
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIALS, 'base64').toString('utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Initialize Express app
const app = express();

// Middleware setup
app.use(cors({ origin: 'http://middleware:3001', credentials: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// Constants
const PORT = process.env.PORT || 4004;

// Utility Functions

/**
 * Logs changes to Firestore for auditing purposes.
 * @param {string} action - The action performed (e.g., CREATE, UPDATE, DELETE).
 * @param {string} userId - The ID of the user performing the action.
 * @param {string} entity - The entity being modified (e.g., 'Caretaker').
 * @param {string} entityId - The ID of the entity being modified.
 * @param {string} entityName - The name of the entity being modified.
 * @param {object} details - Additional details about the change.
 */
async function logChange(action, userId, entity, entityId, entityName, details = {}) {
    try {
        let userName = 'Unknown';
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) userName = userDoc.data().name || 'Unnamed User';

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

// API Endpoints

/**
 * Add a new caretaker.
 * @route POST /api/caretaker/add
 * @param {string} patientId - The ID of the patient associated with the caretaker.
 * @param {string} name - The name of the caretaker.
 * @param {string} relation - The relationship of the caretaker to the patient.
 * @param {string} email - The email of the caretaker.
 * @param {string} phone - The phone number of the caretaker.
 */
app.post('/api/caretaker/add', async (req, res) => {
    const { patientId, name, relation, email, phone } = req.body;

    // Input validation
    if (!patientId || !name || !relation || !email || !phone) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const caretakerRef = await db.collection('caretakers').add({
            patientId,
            name,
            relation,
            email,
            phone,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await logChange('CREATE', patientId, 'Caretaker', caretakerRef.id, name, { data: req.body });
        console.log('Caretaker added with ID:', caretakerRef.id);
        res.json({ message: 'Caretaker added successfully', id: caretakerRef.id });
    } catch (error) {
        console.error('Error adding caretaker:', error.message);
        res.status(500).json({ error: 'Failed to add caretaker', details: error.message });
    }
});

/**
 * Get caretakers for a specific patient.
 * @route GET /api/caretaker/get
 * @param {string} patientId - The ID of the patient to fetch caretakers for.
 */
app.get('/api/caretaker/get', async (req, res) => {
    const { patientId } = req.query;

    // Input validation
    if (!patientId) return res.status(400).json({ error: 'patientId is required' });

    try {
        const snapshot = await db.collection('caretakers').where('patientId', '==', patientId).get();
        if (snapshot.empty) {
            console.log('No caretakers found for patientId:', patientId);
            return res.json([]);
        }
        const caretakers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Caretakers retrieved:', caretakers);
        res.json(caretakers);
    } catch (error) {
        console.error('Error fetching caretakers:', error.message);
        res.status(500).json({ error: 'Failed to fetch caretakers', details: error.message });
    }
});

/**
 * Update a caretaker's details.
 * @route POST /api/caretaker/update
 * @param {string} id - The ID of the caretaker to update.
 * @param {string} patientId - The ID of the patient associated with the caretaker.
 * @param {string} name - The updated name of the caretaker.
 * @param {string} relation - The updated relationship of the caretaker.
 * @param {string} phone - The updated phone number of the caretaker.
 * @param {string} email - The updated email of the caretaker.
 */
app.post('/api/caretaker/update', async (req, res) => {
    const { id, patientId, name, relation, phone, email } = req.body;

    // Input validation
    if (!id || !patientId) return res.status(400).json({ error: 'id and patientId are required' });

    try {
        const caretakerRef = db.collection('caretakers').doc(id);
        const doc = await caretakerRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Caretaker not found' });
        const caretakerData = doc.data();
        if (caretakerData.patientId !== patientId) return res.status(403).json({ error: 'Unauthorized' });

        await caretakerRef.update({
            name,
            relation,
            phone,
            email,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await logChange('UPDATE', patientId, 'Caretaker', id, name, { oldData: caretakerData, newData: req.body });
        console.log('Caretaker updated:', id);
        res.json({ message: 'Caretaker updated successfully' });
    } catch (error) {
        console.error('Error updating caretaker:', error.message);
        res.status(500).json({ error: 'Failed to update caretaker', details: error.message });
    }
});

/**
 * Delete a caretaker.
 * @route DELETE /api/caretaker/delete
 * @param {string} id - The ID of the caretaker to delete.
 * @param {string} patientId - The ID of the patient associated with the caretaker.
 */
app.delete('/api/caretaker/delete', async (req, res) => {
    const { id, patientId } = req.body;

    // Input validation
    if (!id || !patientId) return res.status(400).json({ error: 'id and patientId are required' });

    try {
        const caretakerRef = db.collection('caretakers').doc(id);
        const doc = await caretakerRef.get();
        if (!doc.exists) return res.status(404).json({ error: 'Caretaker not found' });
        const caretakerData = doc.data();
        if (caretakerData.patientId !== patientId) return res.status(403).json({ error: 'Unauthorized' });

        await logChange('DELETE', patientId, 'Caretaker', id, caretakerData.name, { data: caretakerData });
        await caretakerRef.delete();
        console.log('Caretaker deleted:', id);
        res.json({ message: 'Caretaker deleted successfully' });
    } catch (error) {
        console.error('Error deleting caretaker:', error.message);
        res.status(500).json({ error: 'Failed to delete caretaker', details: error.message });
    }
});

/**
 * Get all caretakers in an organization.
 * @route GET /api/caretakers/all
 * @param {string} organizationId - The ID of the organization to fetch caretakers for.
 */
app.get('/api/caretakers/all', async (req, res) => {
    const { organizationId } = req.query;

    // Input validation
    if (!organizationId) return res.status(400).json({ error: 'organizationId is required' });

    try {
        // Fetch all patients in the organization
        const patientsSnapshot = await db.collection('users')
            .where('organizationId', '==', organizationId)
            .where('role', '==', 'user')
            .get();
        const patientIds = patientsSnapshot.docs.map(doc => doc.id);

        // Fetch caretakers for all patients in the organization
        const caretakersSnapshot = await db.collection('caretakers')
            .where('patientId', 'in', patientIds.length > 0 ? patientIds : ['none']) // Avoid empty 'in' query
            .get();

        if (caretakersSnapshot.empty) {
            console.log('No caretakers found for organizationId:', organizationId);
            return res.json([]);
        }

        const caretakers = caretakersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('All caretakers retrieved:', caretakers);
        res.json(caretakers);
    } catch (error) {
        console.error('Error fetching all caretakers:', error.message);
        res.status(500).json({ error: 'Failed to fetch caretakers', details: error.message });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Caretaker Service running on port ${PORT}`));