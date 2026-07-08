import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!workspaceId) return new Response('Missing workspace ID', { status: 400 });

  // Only owner can delete
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    // Relying on CASCADE in SQLite schema to delete pages, issues, etc.
    // Let's explicitly trigger a delete
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId);
    
    // Clear last_workspace_id if users were pointing to it
    db.prepare('UPDATE users SET last_workspace_id = NULL WHERE last_workspace_id = ?').run(workspaceId);
    
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!workspaceId) return new Response('Missing workspace ID', { status: 400 });

  // Only owner can edit
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const { name, sys_tag, icon } = await request.json();
    if (!name || !sys_tag) return new Response('Name and System Tag are required', { status: 400 });
    
    // Check if tag is taken
    const existing = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ? AND id != ?').get(sys_tag, workspaceId);
    if (existing) return new Response('System tag already in use', { status: 400 });
    
    db.prepare('UPDATE workspaces SET name = ?, sys_tag = ?, icon = ? WHERE id = ?').run(name, sys_tag, icon || null, workspaceId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
