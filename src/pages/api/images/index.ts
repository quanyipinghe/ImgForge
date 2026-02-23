import type { APIRoute } from 'astro';
import { listImages } from '../../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env as App.Locals['runtime']['env'];
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);

  try {
    const images = await listImages(env.DB, page);
    const r2BaseUrl = env.R2_PUBLIC_URL ?? '';

    const data = images.map((img) => ({
      ...img,
      url: `${r2BaseUrl}/${img.r2_key}`,
    }));

    return new Response(JSON.stringify({ images: data, page }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('GET /api/images error:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch images' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
