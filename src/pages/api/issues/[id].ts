import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { checkWorkspaceAccess } from '../../../lib/guard';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  const user = locals.user;
  if (!user || !id) return new Response('Unauthorized', { status: 401 });

  try {
    const issue = db.prepare('SELECT id, workspace_id FROM issues WHERE id = ?').get(id) as any;
    if (!issue) return new Response('Not Found', { status: 404 });

    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, issue.workspace_id, 'editor');
    if (!access.granted) {
      if (access.reason === 'not_member') {
        return new Response('Not Found', { status: 404 });
      }
      return new Response(access.error, { status: 403 });
    }

    const data = await request.json();
    
    // Updates description if passed
    if (data.description !== undefined) {
      db.prepare('UPDATE issues SET description = ? WHERE id = ?').run(data.description, id);
    }
    
    // Updates points if passed
    if (data.story_points !== undefined) {
      db.prepare('UPDATE issues SET story_points = ? WHERE id = ?').run(data.story_points, id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
