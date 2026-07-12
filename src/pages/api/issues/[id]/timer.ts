import type { APIRoute } from 'astro';
import db from '../../../../lib/db';
import { checkWorkspaceAccess } from '../../../../lib/guard';
import crypto from 'crypto';

// Shared utility for closing an active session for a specific user
export function finalizeActiveSession(userId: string) {
  const active = db.prepare('SELECT id, issue_id, started_at, user_id FROM time_tracking_sessions WHERE user_id = ?').get(userId) as any;
  if (!active) return null;
  return processSession(active);
}

// Shared utility for closing all active sessions for a specific issue (e.g. when moved to Done)
export function finalizeIssueSessions(issueId: string) {
  const sessions = db.prepare('SELECT id, issue_id, started_at, user_id FROM time_tracking_sessions WHERE issue_id = ?').all(issueId) as any[];
  const results = [];
  for (const session of sessions) {
    const res = processSession(session);
    if (res) results.push(res);
  }
  return results;
}

function processSession(active: any) {
  
  // Calculate hours passed robustly
  let dateStr = active.started_at;
  if (!dateStr.endsWith('Z')) dateStr += 'Z';
  
  const started = new Date(dateStr).getTime();
  const now = Date.now();
  let hours = (now - started) / (1000 * 60 * 60);
  
  // Hard limit: 12 hours
  if (hours > 12) {
    hours = 12;
  }
  
  // If it's too short (e.g. less than 1 minute), don't log it, just delete
  if (hours < 0.016) {
    db.prepare('DELETE FROM time_tracking_sessions WHERE id = ?').run(active.id);
    return null;
  }
  
  // Round to 2 decimals
  hours = Math.round(hours * 100) / 100;
  
  const logId = crypto.randomUUID();
  db.transaction(() => {
    db.prepare(`
      INSERT INTO work_logs (id, issue_id, user_id, hours_spent, description, logged_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(logId, active.issue_id, active.user_id, hours, 'Session auto-logged');
    
    db.prepare(`
      UPDATE issues SET 
        logged_hours = (SELECT COALESCE(SUM(hours_spent), 0) FROM work_logs WHERE issue_id = ?)
      WHERE id = ?
    `).run(active.issue_id, active.issue_id);
    
    db.prepare('DELETE FROM time_tracking_sessions WHERE id = ?').run(active.id);
  })();
  
  return { issueId: active.issue_id, hours, logId };
}

export const GET: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const issueId = params.id as string;

  const issue = db.prepare('SELECT workspace_id FROM issues WHERE id = ?').get(issueId) as any;
  if (!issue) return new Response('Not Found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, issue.workspace_id, 'viewer');
  if (!access.granted) {
    return new Response('Forbidden', { status: access.reason === 'not_member' ? 404 : 403 });
  }

  // Passively auto-close if > 12h
  const active = db.prepare('SELECT id, started_at FROM time_tracking_sessions WHERE issue_id = ? AND user_id = ?').get(issueId, user.id) as any;
  if (active) {
    const started = new Date(active.started_at + 'Z').getTime();
    const age = (Date.now() - started) / (1000 * 60 * 60);
    if (age > 12) {
      finalizeActiveSession(user.id);
      return new Response(JSON.stringify({ active: false }), { status: 200 });
    }
    return new Response(JSON.stringify({ active: true, started_at: active.started_at, hours_elapsed: age }), { status: 200 });
  }

  return new Response(JSON.stringify({ active: false }), { status: 200 });
};

export const POST: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const issueId = params.id as string;

  const issue = db.prepare('SELECT workspace_id FROM issues WHERE id = ?').get(issueId) as any;
  if (!issue) return new Response('Not Found', { status: 404 });

  // Require editor to track time
  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, issue.workspace_id, 'editor');
  if (!access.granted) {
    return new Response('Forbidden', { status: access.reason === 'not_member' ? 404 : 403 });
  }

  // Check if same issue
  const existing = db.prepare('SELECT id FROM time_tracking_sessions WHERE issue_id = ? AND user_id = ?').get(issueId, user.id);
  if (existing) {
    return new Response(JSON.stringify({ success: true, message: 'Timer already running' }), { status: 200 });
  }

  // Finalize any other running timer
  finalizeActiveSession(user.id);

  // Start new
  db.prepare('INSERT INTO time_tracking_sessions (id, issue_id, user_id, started_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(crypto.randomUUID(), issueId, user.id);
  
  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });
  const issueId = params.id as string;

  const issue = db.prepare('SELECT workspace_id FROM issues WHERE id = ?').get(issueId) as any;
  if (!issue) return new Response('Not Found', { status: 404 });

  const access = checkWorkspaceAccess(user.id, user.is_sysadmin, issue.workspace_id, 'editor');
  if (!access.granted) {
    return new Response('Forbidden', { status: access.reason === 'not_member' ? 404 : 403 });
  }

  const result = finalizeActiveSession(user.id);
  return new Response(JSON.stringify({ success: true, logged: result }), { status: 200 });
};
