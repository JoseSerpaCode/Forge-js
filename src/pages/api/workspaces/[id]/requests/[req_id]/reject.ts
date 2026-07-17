import type { APIRoute } from 'astro';
import db from '../../../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../../../lib/guard';

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;
  if (!user || user.is_guest) return new Response('Unauthorized', { status: 401 });
  
  const workspaceId = params.id;
  const reqId = params.req_id;
  if (!workspaceId || !reqId) return new Response('Missing parameters', { status: 400 });

  // Only owner can reject
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response('Forbidden', { status: 403 });
  }

  const wsReq = db.prepare('SELECT user_id, status FROM workspace_join_requests WHERE id = ? AND workspace_id = ?').get(reqId, workspaceId) as any;
  if (!wsReq) return new Response('Request not found', { status: 404 });
  if (wsReq.status !== 'pending') return new Response('Request is not pending', { status: 400 });

  db.prepare("UPDATE workspace_join_requests SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reqId);
  
  // Notice: Rejection might not need a notification to avoid spam, but we can send one if desired.
  // For now, no notification on rejection is standard.

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
