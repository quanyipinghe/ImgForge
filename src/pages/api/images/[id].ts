import type { APIRoute } from 'astro';
import { getImage, deleteImage } from '../../../lib/db';

export const DELETE: APIRoute = async ({ params, locals }) => {
  const env = locals.runtime?.env as App.Locals['runtime']['env'];
  const { id } = params;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const image = await getImage(env.DB, id);
    if (!image) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete from R2 first, then D1
    await env.BUCKET.delete(image.r2_key);
    await deleteImage(env.DB, id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Delete error:', err);
    return new Response(JSON.stringify({ error: 'Delete failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
