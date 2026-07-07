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

  // Inject role context based on current workspace
  // SECURITY WARNING: sessionData.role is derived from last_workspace_id, which is fallible 
  // with parallel tabs. This field is EXCLUSIVELY for UI presentation (e.g. Sidebar text).
  // NEVER use sessionData.role or user.role for backend authorization decisions. 
  // Always use guard.ts (checkWorkspaceAccess) which queries the DB directly.
  const currentWsTag = sessionData.last_workspace_id;
  if (sessionData.is_sysadmin === 1) {
    sessionData.role = 'owner';
  } else if (currentWsTag) {
    const roleQuery = db.prepare('SELECT wm.ws_role FROM workspace_members wm JOIN workspaces w ON w.id = wm.workspace_id WHERE w.sys_tag = ? AND wm.user_id = ?').get(currentWsTag, sessionData.id) as any;
    sessionData.role = roleQuery ? roleQuery.ws_role : 'viewer';
  } else {
    sessionData.role = 'viewer';
  }

  // Inyectar usuario
  context.locals.user = sessionData;

  if (context.url.pathname === '/login') {
    return context.redirect('/');
  }

  return next();
});
