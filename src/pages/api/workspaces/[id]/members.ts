import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';
import crypto from 'crypto';

// Add a member
export const POST: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user!;
  const workspaceId = params.id;

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId as string, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const { username, role } = await request.json();
    if (!username || !role) return new Response('Username and role required', { status: 400 });
    
    const VALID_ROLES = ['owner', 'editor', 'viewer'];
    if (!VALID_ROLES.includes(role)) return new Response('Invalid role', { status: 400 });

    const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any;
    if (!targetUser) return new Response('User not found', { status: 404 });

    const existing = db.prepare('SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, targetUser.id);
    if (existing) return new Response('User is already a member', { status: 400 });

    // [M-3 FIX] More robust duplicate check using a dedicated column approach
    // Check if user already has a pending invite to THIS workspace
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const existingInvites = db.prepare("SELECT id, link_url, created_at FROM notifications WHERE user_id = ? AND type = 'invite'").all(targetUser.id) as any[];
    const hasPendingInvite = existingInvites.find(notif => {
      try {
        const payload = JSON.parse(notif.link_url);
        if (payload.ws_id === workspaceId) {
          const age = Date.now() - new Date(notif.created_at + 'Z').getTime();
          if (age < SEVEN_DAYS_MS) return true;
          // Clean up expired ones to allow resending
          db.prepare('DELETE FROM notifications WHERE id = ?').run(notif.id);
        }
        return false;
      } catch { return false; }
    });
    if (hasPendingInvite) return new Response('An invitation is already pending for this user', { status: 400 });

    // Rate limit: max 20 invites sent by this owner in the last 24 hours
    const recentInviteCount = db.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE type = 'invite' AND created_at >= datetime('now', '-1 day') AND message LIKE ?"
    ).get(`%${user.username} has invited%`) as any;
    if (recentInviteCount.count >= 20) {
      return new Response('Too many invitations sent today. Please try again tomorrow.', { status: 429 });
    }

    const wsInfo = db.prepare('SELECT name FROM workspaces WHERE id = ?').get(workspaceId) as any;
    db.prepare(`
      INSERT INTO notifications (id, user_id, title, message, type, link_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `).run(
      crypto.randomUUID(), 
      targetUser.id, 
      `Invitation to ${wsInfo.name}`, 
      `${user.username} has invited you to join ${wsInfo.name} as ${role}.`, 
      'invite', 
      JSON.stringify({ ws_id: workspaceId, role })
    );

    return new Response(JSON.stringify({ success: true, invited: true }), { status: 200 });
  } catch (err: any) {
    console.error('[members POST] Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};

// Update a member's role
export const PATCH: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user!;
  const workspaceId = params.id;

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId as string, 'owner');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  try {
    const { userId, role } = await request.json();
    if (!userId || !role) return new Response('User ID and role required', { status: 400 });

    const VALID_ROLES = ['owner', 'editor', 'viewer'];
    if (!VALID_ROLES.includes(role)) return new Response('Invalid role', { status: 400 });

    // Prevent removing the last owner
    if (role !== 'owner') {
      const owners = db.prepare("SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND ws_role = 'owner'").get(workspaceId) as any;
      const currentRole = db.prepare('SELECT ws_role FROM workspace_members WHERE workspace_id = ? AND user_id = ?').get(workspaceId, userId) as any;
      
      if (currentRole && currentRole.ws_role === 'owner' && owners.count <= 1) {
        return new Response('Cannot change the role of the last owner', { status: 400 });
      }
    }

    db.prepare('UPDATE workspace_members SET ws_role = ? WHERE workspace_id = ? AND user_id = ?').run(role, workspaceId, userId);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('[members PATCH] Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};

// Remove a member
export const DELETE: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user!;
  const workspaceId = params.id;

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
      const owners = db.prepare("SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND ws_role = 'owner'").get(workspaceId) as any;
      if (owners.count <= 1) {
        return new Response('Cannot remove the last owner. Delete the workspace or promote someone else first.', { status: 400 });
      }
    }

    db.prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?').run(workspaceId, userIdToRemove);
    
    // If they were pointing to this workspace, clear it
    const ws = db.prepare('SELECT sys_tag FROM workspaces WHERE id = ?').get(workspaceId) as any;
    if (ws) {
      db.prepare('UPDATE users SET last_workspace_id = NULL WHERE id = ? AND last_workspace_id = ?').run(userIdToRemove, ws.sys_tag);
    }

    // Kill Zombie sockets
    process.emit('user_removed_from_workspace', { userId: userIdToRemove, workspaceId });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('[members DELETE] Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
