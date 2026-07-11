import type { APIRoute } from 'astro';
import { NotificationService } from '../../../lib/NotificationService';

export const POST: APIRoute = async ({ locals }) => {
  const user = locals.user!;

  try {
    NotificationService.markAsRead(user.id);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
};
