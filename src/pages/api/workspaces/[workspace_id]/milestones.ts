import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';
import crypto from 'crypto';

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user!;

  const workspaceId = params.workspace_id;
  if (!workspaceId) return new Response('Bad Request', { status: 400 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'viewer');
  if (!access.granted) return new Response('Forbidden', { status: 403 });

  try {
    const milestones = db.prepare(`
      SELECT id, name, target_date, status, description
      FROM milestones WHERE workspace_id = ?
      ORDER BY target_date ASC
    `).all(workspaceId);
    return new Response(JSON.stringify(milestones), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('GET milestones error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};

export const POST: APIRoute = async ({ params, request, locals }) => {
  const user = locals.user!;

  const workspaceId = params.workspace_id;
  if (!workspaceId) return new Response('Bad Request', { status: 400 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'editor');
  if (!access.granted) return new Response('Forbidden', { status: 403 });

  try {
    const { name, target_date, description } = await request.json();
    if (!name) return new Response(JSON.stringify({ error: 'Name is required' }), { status: 400 });

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO milestones (id, workspace_id, name, target_date, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, workspaceId, name, target_date || null, description || null);

    return new Response(JSON.stringify({ id, success: true }), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('POST milestones error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
