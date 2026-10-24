import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'darkstorm_admin';
const SESSION_SECONDS = 8 * 60 * 60;

function safeEqual(left, right) {
    const a = Buffer.from(String(left));
    const b = Buffer.from(String(right));
    return a.length === b.length && timingSafeEqual(a, b);
}

function sessionSecret() {
    const secret = String(process.env.ADMIN_SESSION_SECRET || '');
    if (secret.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
    return secret;
}

export function isAdminCredentials(id, code) {
    const expectedId = String(process.env.ADMIN_USER_ID || '').trim().toUpperCase();
    const expectedCode = String(process.env.ADMIN_ACTIVATION_CODE || '').trim().toUpperCase();
    if (!expectedId || !expectedCode) throw new Error('Admin credentials are not configured');
    return safeEqual(String(id).trim().toUpperCase(), expectedId) &&
        safeEqual(String(code).trim().toUpperCase(), expectedCode);
}

export function createAdminSession() {
    const payload = Buffer.from(JSON.stringify({ exp: Date.now() + SESSION_SECONDS * 1000 })).toString('base64url');
    const signature = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

export function verifyAdminSession(req) {
    const cookieHeader = String(req.headers.cookie || '');
    const token = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
    if (!token) return false;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;
    const expected = createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
    if (!safeEqual(signature, expected)) return false;
    try {
        return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now();
    } catch {
        return false;
    }
}

export function adminSessionCookie(session) {
    const secure = process.env.VERCEL === '1' ? '; Secure' : '';
    return `${COOKIE_NAME}=${session}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function isSameOrigin(req) {
    const origin = String(req.headers.origin || '');
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
    try {
        return Boolean(origin && host && new URL(origin).host === host);
    } catch {
        return false;
    }
}