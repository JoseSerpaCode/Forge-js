import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  return new Response(JSON.stringify({ status: 'ok', query_results: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
