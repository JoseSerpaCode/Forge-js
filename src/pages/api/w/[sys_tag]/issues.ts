import type { APIRoute } from 'astro';
import { IssueService, ApiError } from '../../../lib/IssueService';

const handleApiError = (err: any) => {
  if (err instanceof ApiError) {
    return new Response(JSON.stringify({ error: err.message }), { status: err.statusCode, headers: { 'Content-Type': 'application/json' } });
  }
  console.error('API Error:', err);
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
};

import db from '../../../../lib/db';

export const POST: APIRoute = async ({ request, params, locals }) => {
  const user = locals.user!;
  const { sys_tag } = params;

  try {
    const data = await request.json();
    
    // Server-side workspace_id resolution
    const workspace = db.prepare('SELECT id FROM workspaces WHERE sys_tag = ?').get(sys_tag) as any;
    if (!workspace) throw new ApiError(404, 'Workspace Not Found');
    
    data.workspace_id = workspace.id;

    const result = await IssueService.create(data, user.id, user.is_sysadmin);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return handleApiError(err);
  }
};
