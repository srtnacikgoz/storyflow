
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (assuming default credentials or emulator)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = getFirestore();

async function checkQueue() {
    try {
        const pendingSnapshot = await db.collection('media-queue')
            .where('status', '==', 'pending')
            .get();

        console.log(`Bekleyen (status='pending'): ${pendingSnapshot.size}`);

        pendingSnapshot.forEach(doc => {
            console.log(`- ${doc.id}: ${JSON.stringify(doc.data().productName || 'No Name')}`);
        });

        const scheduledSnapshot = await db.collection('media-queue')
            .where('status', '==', 'scheduled')
            .get();

        console.log(`Planlanan (status='scheduled'): ${scheduledSnapshot.size}`);
        scheduledSnapshot.forEach(doc => {
            console.log(`- ${doc.id}: ${JSON.stringify(doc.data().productName || 'No Name')}`);
        });

    } catch (error) {
        console.error('Error checking queue:', error);
    }
}

checkQueue();
