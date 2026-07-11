import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;

  const { name, sys_tag } = await request.json();

  if (!name || !sys_tag) {
    return new Response('Missing name or sys_tag', { status: 400 });
  }

  // Validate sys_tag format (alphanumeric and dashes only)
  if (!/^[a-z0-9\-]+$/.test(sys_tag)) {
    return new Response('Invalid sys_tag format', { status: 400 });
  }

  // Check if sys_tag already exists
  const existing = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag);
  if (existing) {
    return new Response('Workspace tag already in use', { status: 409 });
  }

  const workspaceId = crypto.randomUUID();

  try {
    db.transaction(() => {
      // Create Workspace
      db.prepare(`
        INSERT INTO workspaces (id, name, sys_tag, created_by)
        VALUES (?, ?, ?, ?)
      `).run(workspaceId, name, sys_tag, user.id);

      // Make creator the owner
      db.prepare(`
        INSERT INTO workspace_members (workspace_id, user_id, ws_role)
        VALUES (?, ?, ?)
      `).run(workspaceId, user.id, 'owner');
      
      // Update user's last_workspace_id if it's their first workspace
      const count = db.prepare('SELECT COUNT(*) as count FROM workspace_members WHERE user_id = ?').get(user.id) as any;
      if (count && count.count === 1) {
        db.prepare('UPDATE users SET last_workspace_id = ? WHERE id = ?').run(sys_tag, user.id);
      }
    })();

    return new Response(JSON.stringify({ id: workspaceId, sys_tag }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
