import { getAdminDatabase } from './_lib/firebase-database.js';
import { isSameOrigin, verifyAdminSession } from './_lib/admin-auth.js';

const PUBLIC_PATHS = new Set(['settings/site', 'settings/wallet', 'products/plane', 'products/apple']);

function readBody(req) {
    if (typeof req.body === 'string') return JSON.parse(req.body);
    return req.body || {};
}

function adminPathAllowed(path) {
    return PUBLIC_PATHS.has(path) || /^products\/(plane|apple)\/[A-Za-z0-9_-]{1,100}$/.test(path) || /^keys\/[A-Z0-9-]{1,40}$/.test(path) || /^orders\/[A-Za-z0-9_-]{1,100}$/.test(path);
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    try {
        const database = getAdminDatabase();
        if (req.method === 'GET') {
            const path = String(req.query?.path || 'public');
            if (path === 'public') {
                const [site, wallet, plane, apple] = await Promise.all([
                    database.ref('settings/site').once('value'),
                    database.ref('settings/wallet').once('value'),
                    database.ref('products/plane').once('value'),
                    database.ref('products/apple').once('value')
                ]);
                return res.status(200).json({
                    site: site.val(),
                    wallet: wallet.val() || process.env.DEFAULT_WALLET_NUMBER || '01069311729',
                    walletStored: wallet.exists(),
                    products: { plane: plane.val(), apple: apple.val() }
                });
            }

            if (PUBLIC_PATHS.has(path)) {
                const snapshot = await database.ref(path).once('value');
                return res.status(200).json({ value: snapshot.val() });
            }

            if (!verifyAdminSession(req)) return res.status(401).json({ error: 'سجل دخول الإدارة أولاً' });
            if (!['keys', 'orders'].includes(path) && !/^keys\/[A-Z0-9-]{1,40}$/.test(path)) return res.status(400).json({ error: 'مسار البيانات غير صالح' });
            const snapshot = await database.ref(path).once('value');
            return res.status(200).json({ value: snapshot.val() });
        }

        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        if (!isSameOrigin(req)) return res.status(403).json({ error: 'طلب غير مسموح' });

        const body = readBody(req);
        if (body.action === 'check-plane-key') {
            const code = String(body.code || '').trim().toUpperCase();
            if (!/^DARK-[A-Z0-9]{10}$/.test(code)) return res.status(400).json({ error: 'صيغة الكود غير صحيحة' });
            const snapshot = await database.ref(`keys/${code}`).once('value');
            const key = snapshot.val();
            if (!key || key.product !== 'plane' || Number(key.users) < 1 || !Number.isFinite(new Date(key.expiry).getTime()) || new Date(key.expiry).getTime() <= Date.now()) {
                return res.status(404).json({ error: 'كود الطيارة غير صالح أو منتهي' });
            }
            return res.status(200).json({ ok: true, expiry: key.expiry });
        }

        if (body.action === 'consume-key') {
            const code = String(body.code || '').trim().toUpperCase();
            const product = String(body.product || '').trim();
            if (!/^DARK-[A-Z0-9]{10}$/.test(code) || !['plane', 'apple'].includes(product)) {
                return res.status(400).json({ error: 'بيانات الكود غير صالحة' });
            }
            const keyRef = database.ref(`keys/${code}`);
            let rejected = 'الكود خطأ أو منتهي أو محروق';
            const transaction = await keyRef.transaction(current => {
                const expiry = new Date(current?.expiry).getTime();
                if (!current || Number(current.users) < 1 || !Number.isFinite(expiry) || expiry <= Date.now()) return;
                if (current.product !== product) {
                    rejected = current.product === 'plane' ? 'هذا الكود مخصص للطيارة فقط' : 'هذا الكود مخصص للتفاحة فقط';
                    return;
                }
                return { ...current, users: Number(current.users) - 1 };
            }, undefined, false);
            if (!transaction.committed) return res.status(400).json({ error: rejected });
            return res.status(200).json({ ok: true, key: transaction.snapshot.val() });
        }

        if (!verifyAdminSession(req)) return res.status(401).json({ error: 'سجل دخول الإدارة أولاً' });
        const path = String(body.path || '');
        if (!adminPathAllowed(path)) return res.status(400).json({ error: 'مسار البيانات غير مسموح' });
        if (path === 'settings/wallet') {
            const wallet = String(body.value || '').trim();
            if (!/^\d{8,15}$/.test(wallet.replace(/[\s()+-]/g, ''))) {
                return res.status(400).json({ error: 'أدخل رقم محفظة صحيحًا من 8 إلى 15 رقمًا' });
            }
            body.value = wallet;
        }
        const reference = database.ref(path);
        if (body.value === null) await reference.remove();
        else await reference.set(body.value);
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Admin data API error:', error);
        return res.status(503).json({ error: 'تعذر الوصول إلى قاعدة البيانات المشتركة. تحقق من إعدادات Firebase على Vercel.' });
    }
}