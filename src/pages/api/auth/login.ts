import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit } from '../../../lib/rateLimit';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('cf-connecting-ip') || 'unknown';
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({ error: `Too many attempts. Please try again in ${rateCheck.retryAfter} seconds.` }), {
        status: 429,
        headers: { 'Retry-After': String(rateCheck.retryAfter), 'Content-Type': 'application/json' }
      });
    }
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Faltan credenciales' }), { status: 400 });
    }
    
    const user = db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return new Response(JSON.stringify({ error: 'Credenciales inválidas' }), { status: 401 });
    }
    
    // Rotación de Sesión de Seguridad
    const sessionId = crypto.randomUUID();
    const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 días
    
    db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);
    
    cookies.set('forge_session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30
    });
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
};
