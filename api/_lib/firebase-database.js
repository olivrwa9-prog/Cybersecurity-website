import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

export function getAdminDatabase() {
    const credentials = String(process.env.FIREBASE_SERVICE_ACCOUNT || '');
    if (!credentials) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
    const serviceAccount = JSON.parse(credentials);
    const app = getApps().find(existing => existing.name === 'darkstorm-shared') || initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://dark-storm-21026-default-rtdb.firebaseio.com/'
    }, 'darkstorm-shared');
    return getDatabase(app);
}