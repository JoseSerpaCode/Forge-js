import type { APIRoute } from 'astro';
import db from '../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../lib/guard';

export const GET: APIRoute = async ({ params, locals }) => {
  const { sys_tag, id } = params;
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const database = db.prepare('SELECT * FROM dynamic_databases WHERE id = ?').get(id) as any;
  if (!database) return new Response('Database not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, database.workspace_id, 'viewer');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Database not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  const ws = db.prepare('SELECT sys_tag FROM workspaces WHERE id = ?').get(database.workspace_id) as any;
  if (ws.sys_tag !== sys_tag) return new Response('Workspace mismatch', { status: 400 });

  const views = db.prepare('SELECT * FROM dynamic_views WHERE database_id = ? ORDER BY created_at ASC').all(id);

  return new Response(JSON.stringify({ 
    database, 
    views 
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Optional: DELETE to remove a database completely
export const DELETE: APIRoute = async ({ params, locals }) => {
  const { sys_tag, id } = params;
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const database = db.prepare('SELECT id, workspace_id FROM dynamic_databases WHERE id = ?').get(id) as any;
  if (!database) return new Response('Database not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, database.workspace_id, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Database not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  // SQLite ON DELETE CASCADE handles dynamic_entries and dynamic_views
  db.prepare('DELETE FROM dynamic_databases WHERE id = ?').run(id);

  return new Response('OK', { status: 200 });
};
