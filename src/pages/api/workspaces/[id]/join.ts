import type { APIRoute } from 'astro';
import db from '../../../../lib/db';

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;
  if (!user || user.is_guest) return new Response('Unauthorized', { status: 401 });
  
  const workspaceId = params.id;
  if (!workspaceId) return new Response('Missing workspace ID', { status: 400 });

  const ws = db.prepare('SELECT id, created_by, is_public, join_policy FROM workspaces WHERE id = ?').get(workspaceId) as any;
  if (!ws) return new Response('Workspace not found', { status: 404 });

  // Anti-enumeration: Check if blocked by owner
  const isBlocked = db.prepare('SELECT 1 FROM user_blocks WHERE blocker_id = ? AND blocked_id = ?').get(ws.created_by, user.id);
  if (isBlocked) return new Response('Workspace not found', { status: 404 });

  if (ws.is_public === 0 || ws.join_policy === 'disabled') {
    return new Response('Workspace is not accepting join requests', { status: 403 });
  }

  if (ws.join_policy === 'friends_only') {
    const userA = user.id < ws.created_by ? user.id : ws.created_by;
    const userB = user.id < ws.created_by ? ws.created_by : user.id;
    const friendship = db.prepare('SELECT status FROM friendships WHERE user_a_id = ? AND user_b_id = ? AND status = ?').get(userA, userB, 'accepted');
    if (!friendship) {
      return new Response('You must be friends with the owner to join', { status: 403 });
    }
  }

  // Check if already a member
  const member = db.prepare('SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, user.id);
  if (member) return new Response('Already a member', { status: 400 });

  // Check pending request
  const existingReq = db.prepare('SELECT id, status FROM workspace_join_requests WHERE workspace_id = ? AND user_id = ?').get(workspaceId, user.id) as any;
  
  const crypto = await import('crypto');

  if (existingReq) {
    if (existingReq.status === 'pending') return new Response('Request already pending', { status: 400 });
    
    // If rejected/cancelled, update to pending
    db.prepare("UPDATE workspace_join_requests SET status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(existingReq.id);
  } else {
    db.prepare("INSERT INTO workspace_join_requests (id, workspace_id, user_id, status) VALUES (?, ?, ?, 'pending')").run(crypto.randomUUID(), workspaceId, user.id);
  }

  // Notify owner
  db.prepare(`INSERT INTO notifications (id, user_id, type, title, message) VALUES (?, ?, 'system', 'New Workspace Request', 'User @' || ? || ' requested to join your workspace.')`).run(crypto.randomUUID(), ws.created_by, user.username);

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
