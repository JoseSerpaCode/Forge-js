import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { checkWorkspaceAccess } from '../../../lib/guard';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const data = await request.json();
    const { name, workspaceId, start_date, end_date } = data;
    
    if (!name || !workspaceId) return new Response('Missing name or workspaceId', { status: 400 });

    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'editor');
    if (!access.granted) return new Response(access.error, { status: 403 });

    const newId = crypto.randomUUID();
    
    db.prepare(`
      INSERT INTO sprints (id, workspace_id, name, start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, 'planned')
    `).run(newId, workspaceId, name, start_date || null, end_date || null);

    return new Response(JSON.stringify({ id: newId, name, status: 'planned' }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
