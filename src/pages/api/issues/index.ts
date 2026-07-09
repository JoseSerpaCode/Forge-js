import type { APIRoute } from 'astro';
import db from '../../../lib/db';
import { checkWorkspaceAccess } from '../../../lib/guard';
import crypto from 'crypto';

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { title, type, workspaceId, sprintId } = await request.json();
  
  if (!title || !workspaceId) {
    return new Response('Title and workspaceId are required', { status: 400 });
  }

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, workspaceId, 'editor');
  if (!access.granted) {
    if (access.reason === 'not_member') return new Response('Not Found', { status: 404 });
    return new Response(access.error || 'Forbidden', { status: 403 });
  }

  if (sprintId) {
    const sprint = db.prepare('SELECT id FROM sprints WHERE id = ? AND workspace_id = ?').get(sprintId, workspaceId);
    if (!sprint) {
      return new Response('Sprint not found or belongs to another workspace', { status: 400 });
    }
  }

  const issueId = crypto.randomUUID();
  // Status starts as 'todo' by default, or 'backlog' depending on logic
  // Let's use 'todo' so it appears in the first column
  const status = 'todo';

  // Get max position to append to the end of 'todo'
  let position = 100000;
  const lastIssue = db.prepare('SELECT position FROM issues WHERE workspace_id = ? AND status = ? ORDER BY position DESC LIMIT 1').get(workspaceId, status) as any;
  if (lastIssue) {
    position = lastIssue.position + 100000;
  }

  try {
    db.prepare(`
      INSERT INTO issues (id, workspace_id, sprint_id, title, type, status, reporter_id, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(issueId, workspaceId, sprintId || null, title, type || 'task', status, user.id, position);

    const generalChannel = db.prepare("SELECT id FROM channels WHERE workspace_id = ? AND name = 'general'").get(workspaceId) as any;
    if (generalChannel) {
      process.emit('system_notification', { channelId: generalChannel.id, content: `🆕 New issue created: **${title}** (${type})` });
    }

    return new Response(JSON.stringify({ id: issueId }), { status: 200 });
  } catch (err: any) {
    console.error('[issues POST] Unhandled error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};
