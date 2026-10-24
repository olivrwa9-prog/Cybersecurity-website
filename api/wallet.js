import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { isSameOrigin, verifyAdminSession } from './_lib/admin-auth.js';

const DEFAULT_WALLET = '01069311729';

function walletRef() {
    const credentials = String(process.env.FIREBASE_SERVICE_ACCOUNT || '');
    if (!credentials) throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
    const serviceAccount = JSON.parse(credentials);
    const app = getApps().find(existing => existing.name === 'darkstorm-wallet') || initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://dark-storm-21026-default-rtdb.firebaseio.com/'
    }, 'darkstorm-wallet');
    return getDatabase(app).ref('settings/wallet');
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const snapshot = await walletRef().once('value');
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).json({
                wallet: snapshot.val() || process.env.DEFAULT_WALLET_NUMBER || DEFAULT_WALLET
            });
        } catch (error) {
            console.error('Wallet read error:', error);
            return res.status(503).json({ error: 'تعذر تحميل رقم المحفظة من الخادم' });
        }
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'طلب غير مسموح' });

    try {
        if (!verifyAdminSession(req)) return res.status(401).json({ error: 'سجل دخول الإدارة أولاً' });
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        const wallet = String(body.wallet || '').trim();
        const normalized = wallet.replace(/[\s()+-]/g, '');
        if (!/^\d{8,15}$/.test(normalized)) {
            return res.status(400).json({ error: 'أدخل رقم محفظة صحيحًا من 8 إلى 15 رقمًا' });
        }

        await walletRef().set(wallet);
        return res.status(200).json({ ok: true, wallet });
    } catch (error) {
        console.error('Wallet update error:', error);
        return res.status(503).json({ error: 'تعذر تحديث المحفظة. راجع إعدادات Firebase على الخادم.' });
    }
}