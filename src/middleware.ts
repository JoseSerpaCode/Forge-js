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
    SELECT u.id, u.username, u.is_sysadmin, u.theme_preference, u.last_workspace_id, s.expires_at 
    FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ?
  `).get(sessionId) as any;

  if (!sessionData || sessionData.expires_at < Date.now()) {
    context.cookies.delete('forge_session', { path: '/' });
    context.locals.user = null;
    if (isPublicRoute) return next();
    return context.redirect('/login');
  }

  // Update last_workspace_id if we are navigating to a workspace
  const match = context.url.pathname.match(/^\/w\/([^/]+)/);
  if (match && match[1]) {
    const sysTag = match[1];
    if (sessionData.last_workspace_id !== sysTag) {
      db.prepare('UPDATE users SET last_workspace_id = ? WHERE id = ?').run(sysTag, sessionData.id);
      sessionData.last_workspace_id = sysTag;
    }
  }

  // Inyectar usuario
  context.locals.user = sessionData;

  if (context.url.pathname === '/login') {
    return context.redirect('/');
  }

  return next();
});
