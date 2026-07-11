import type { APIRoute } from 'astro';
import { IssueService, ApiError } from '../../../lib/IssueService';

const handleApiError = (err: any) => {
  if (err instanceof ApiError) {
    return new Response(JSON.stringify({ error: err.message }), { status: err.statusCode, headers: { 'Content-Type': 'application/json' } });
  }
  console.error('API Error:', err);
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const { id } = params;
  const user = locals.user!;
  if (!id) return new Response('Bad Request', { status: 400 });

  try {
    const data = await request.json();
    await IssueService.update(id, data, user.id, user.is_sysadmin, user.username);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return handleApiError(err);
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  const { id } = params;
  const user = locals.user!;
  if (!id) return new Response('Bad Request', { status: 400 });

  try {
    await IssueService.delete(id, user.id, user.is_sysadmin);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return handleApiError(err);
  }
};
