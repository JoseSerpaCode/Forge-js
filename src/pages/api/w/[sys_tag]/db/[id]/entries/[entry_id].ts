import type { APIRoute } from 'astro';
import db from '../../../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../../../lib/guard';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { sys_tag, id, entry_id } = params;
  const user = locals.user!;

  const database = db.prepare('SELECT id, workspace_id FROM dynamic_databases WHERE id = ?').get(id) as any;
  if (!database) return new Response('Database not found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, database.workspace_id, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Database not found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  // Double check workspace matches
  const ws = db.prepare('SELECT sys_tag FROM workspaces WHERE id = ?').get(database.workspace_id) as any;
  if (ws.sys_tag !== sys_tag) return new Response('Workspace mismatch', { status: 400 });

  const entry = db.prepare('SELECT id FROM dynamic_entries WHERE id = ? AND database_id = ?').get(entry_id, database.id);
  if (!entry) return new Response('Entry not found', { status: 404 });

  db.prepare('DELETE FROM dynamic_entries WHERE id = ?').run(entry_id);

  return new Response('OK', { status: 200 });
};
