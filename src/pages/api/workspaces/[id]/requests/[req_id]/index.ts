import type { APIRoute } from 'astro';
import db from '../../../../../../lib/db';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;
  if (!user || user.is_guest) return new Response('Unauthorized', { status: 401 });
  
  const workspaceId = params.id;
  const reqId = params.req_id;
  if (!workspaceId || !reqId) return new Response('Missing parameters', { status: 400 });

  const wsReq = db.prepare('SELECT user_id, status FROM workspace_join_requests WHERE id = ? AND workspace_id = ?').get(reqId, workspaceId) as any;
  if (!wsReq) return new Response('Request not found', { status: 404 });
  
  // Only sender can cancel
  if (wsReq.user_id !== user.id) return new Response('Forbidden', { status: 403 });

  if (wsReq.status !== 'pending') return new Response('Request is not pending', { status: 400 });

  db.prepare("UPDATE workspace_join_requests SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(reqId);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
