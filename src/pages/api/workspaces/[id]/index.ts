import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';

import { WorkspaceService, ApiError } from '../../../../services/WorkspaceService';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  const workspaceId = params.id;
  
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!workspaceId) return new Response('Missing workspace ID', { status: 400 });

  try {
    await WorkspaceService.delete(workspaceId, user.id, user.is_sysadmin);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    if (err instanceof ApiError) {
      return new Response(err.message, { status: err.statusCode });
    }
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
    
    // [M-2 FIX] Validate sys_tag format — same rule as POST /api/workspaces
    if (!/^[a-z0-9\-]+$/.test(sys_tag)) {
      return new Response('Invalid sys_tag format (lowercase letters, numbers and dashes only)', { status: 400 });
    }

    // Check if tag is taken
    const existing = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ? AND id != ?').get(sys_tag, workspaceId);
    if (existing) return new Response('System tag already in use', { status: 400 });
    
    const oldWs = db.prepare('SELECT sys_tag FROM workspaces WHERE id = ?').get(workspaceId) as any;
    
    db.prepare('UPDATE workspaces SET name = ?, sys_tag = ?, icon = ? WHERE id = ?').run(name, sys_tag, icon || null, workspaceId);
    
    if (oldWs && oldWs.sys_tag !== sys_tag) {
      db.prepare('UPDATE users SET last_workspace_id = ? WHERE last_workspace_id = ?').run(sys_tag, oldWs.sys_tag);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
