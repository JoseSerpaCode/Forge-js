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

    if (data.type !== undefined) {
      db.prepare('UPDATE issues SET type = ? WHERE id = ?').run(data.type, id);
    }

    if (data.title !== undefined) {
      db.prepare('UPDATE issues SET title = ? WHERE id = ?').run(data.title, id);
    }
    
    if (data.assignee_id !== undefined) {
      db.prepare('UPDATE issues SET assignee_id = ? WHERE id = ?').run(data.assignee_id, id);
      
      if (data.assignee_id) {
        const ws = db.prepare('SELECT sys_tag FROM workspaces WHERE id = ?').get(issue.workspace_id) as any;
        if (ws) {
          const crypto = require('crypto');
          db.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, link_url)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(), 
            data.assignee_id, 
            'Task Assigned', 
            `${user.username} assigned you to issue ${id.substring(0,8)}`, 
            'info', 
            `/w/${ws.sys_tag}/board?issue=${id}`
          );
        }
      }
    }

    if (data.reporter_id !== undefined) {
      db.prepare('UPDATE issues SET reporter_id = ? WHERE id = ?').run(data.reporter_id, id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  const user = locals.user;
  if (!user || !id) return new Response('Unauthorized', { status: 401 });

  try {
    const issue = db.prepare('SELECT id, workspace_id FROM issues WHERE id = ?').get(id) as any;
    if (!issue) return new Response('Not Found', { status: 404 });

    const access = checkWorkspaceAccess(user.id, user.is_sysadmin, issue.workspace_id, 'editor');
    if (!access.granted) {
      if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
      return new Response(access.error || 'Forbidden', { status: 403 });
    }

    db.prepare('DELETE FROM issues WHERE id = ?').run(id);

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
