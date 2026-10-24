import { adminSessionCookie, createAdminSession, isAdminCredentials, isSameOrigin } from './_lib/admin-auth.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    if (!isSameOrigin(req)) return res.status(403).json({ error: 'طلب غير مسموح' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
        if (!isAdminCredentials(body.id, body.code)) {
            return res.status(401).json({ error: 'بيانات دخول الإدارة غير صحيحة' });
        }

        res.setHeader('Set-Cookie', adminSessionCookie(createAdminSession()));
        return res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Admin login configuration error:', error);
        return res.status(503).json({ error: 'خدمة دخول الإدارة غير مهيأة على الخادم' });
    }
}