import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

// Add a member
export const POST: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId as string, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const { username, role } = await request.json();
    if (!username || !role) return new Response('Username and role required', { status: 400 });

    const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
    if (!targetUser) return new Response('User not found', { status: 404 });

    const existing = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, targetUser.id);
    if (existing) return new Response('User is already a member', { status: 400 });

    db.prepare('INSERT INTO workspace_members (workspace_id, user_id, ws_role) VALUES (?, ?, ?)').run(workspaceId, targetUser.id, role);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

// Update a member's role
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId as string, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const { userId, role } = await request.json();
    if (!userId || !role) return new Response('User ID and role required', { status: 400 });

    // Prevent removing the last owner
    if (role !== 'owner') {
      const owners = db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND ws_role = "owner"').get(workspaceId) as any;
      const currentRole = db.prepare('SELECT ws_role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId) as any;
      
      if (currentRole && currentRole.ws_role === 'owner' && owners.count <= 1) {
        return new Response('Cannot change the role of the last owner', { status: 400 });
      }
    }

    db.prepare('UPDATE workspace_members SET ws_role = ? WHERE workspace_id = ? AND user_id = ?').run(role, workspaceId, userId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};

// Remove a member
export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const userIdToRemove = body.userId;
    if (!userIdToRemove) return new Response('User ID required', { status: 400 });

    // A user can remove themselves, or an owner can remove someone else.
    if (user.id !== userIdToRemove) {
      const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId as string, 'owner');
      if (!access.granted) {
        if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
        return new Response(access.error || 'Forbidden', { status: 403 });
      }
    }

    const currentRole = db.prepare('SELECT ws_role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userIdToRemove) as any;
    if (currentRole && currentRole.ws_role === 'owner') {
      const owners = db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND ws_role = "owner"').get(workspaceId) as any;
      if (owners.count <= 1) {
        return new Response('Cannot remove the last owner. Delete the workspace or promote someone else first.', { status: 400 });
      }
    }

    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(workspaceId, userIdToRemove);
    
    // If they were pointing to this workspace, clear it
    db.prepare('UPDATE users SET last_workspace_id = NULL WHERE id = ? AND last_workspace_id = ?').run(userIdToRemove, workspaceId);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
