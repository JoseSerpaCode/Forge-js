import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const formData = await request.formData();
  const lang = formData.get('lang')?.toString();
  const currentPath = formData.get('current_path')?.toString() || '/';

  if (lang === 'en' || lang === 'es') {
    cookies.set('forge_lang', lang, {
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  return redirect(currentPath);
};
