import type { APIRoute } from 'astro';
import db from '../../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../../lib/guard';

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;
  if (!user || user.is_guest) return new Response('Unauthorized', { status: 401 });
  
  const workspaceId = params.id;
  const reqId = params.req_id;
  if (!workspaceId || !reqId) return new Response('Missing parameters', { status: 400 });

  // Only owner can accept
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response('Forbidden', { status: 403 });
  }

  const wsReq = db.prepare('SELECT user_id, status FROM workspace_join_requests WHERE id = ? AND workspace_id = ?').get(reqId, workspaceId) as any;
  if (!wsReq) return new Response('Request not found', { status: 404 });
  if (wsReq.status !== 'pending') return new Response('Request is not pending', { status: 400 });

  const crypto = await import('crypto');
  const ws = db.prepare('SELECT name FROM workspaces WHERE id = ?').get(workspaceId) as any;

  const tx = db.transaction(() => {
    db.prepare("UPDATE workspace_join_requests SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reqId);
    
    // Check if member already exists (shouldn't happen, but just in case)
    const existingMember = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, wsReq.user_id);
    if (!existingMember) {
      db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(workspaceId, wsReq.user_id, 'member');
    }
    
    db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'system', 'Workspace Request Accepted', 'Your request to join workspace ' || ? || ' was accepted.')`).run(crypto.randomUUID(), wsReq.user_id, ws.name);
  });
  
  tx();

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
