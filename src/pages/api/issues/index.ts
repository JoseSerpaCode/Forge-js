import type { APIRoute } from 'astro';
import { IssueService, ApiError } from '../../../lib/IssueService';

const handleApiError = (err: any) => {
  if (err instanceof ApiError) {
    return new Response(JSON.stringify({ error: err.message }), { status: err.statusCode, headers: { 'Content-Type': 'application/json' } });
  }
  console.error('API Error:', err);
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;

  try {
    const data = await request.json();
    const result = await IssueService.create(data, user.id, user.is_sysadmin);
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return handleApiError(err);
  }
};
