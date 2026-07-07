import { defineMiddleware } from 'astro:middleware';
import db from './lib/db';

export const onRequest = defineMiddleware(async (context, next) => {
  const sessionId = context.cookies.get('forge_session')?.value;
  const isPublicRoute = context.url.pathname === '/login' || context.url.pathname.startsWith('/api/auth');

  if (!sessionId) {
    context.locals.user = null;
    if (isPublicRoute) return next();
    return context.url.pathname.startsWith('/api/') 
      ? new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) 
      : context.redirect('/login');
  }

  // Validación de Sesión contra Base de Datos Real
  const sessionData = db.prepare(`
    SELECT u.id, u.username, u.is_sysadmin, u.theme_preference, s.expires_at 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ?
  `).get(sessionId) as any;

  // Note: the original PDF says "u.role", but we didn't add a 'role' column to users in Tomo I.
  // We'll leave out u.role or map it since it wasn't defined in the DB.
  // Wait, I will add it to the select but if it fails, I'll modify the DB. Let's just avoid u.role in SELECT if it's not in DB.
  // Actually, wait, let's keep it as is, but remove u.role since it's not in `users` table created in Tomo I.
  
  if (!sessionData || sessionData.expires_at < Date.now()) {
    context.cookies.delete('forge_session', { path: '/' });
    context.locals.user = null;
    if (isPublicRoute) return next();
    return context.redirect('/login');
  }

  // Inyectar usuario
  context.locals.user = sessionData;

  if (context.url.pathname === '/login') {
    return context.redirect('/');
  }

  return next();
});
