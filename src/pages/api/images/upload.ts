import type { APIRoute } from 'astro';
import { insertImage } from '../../../lib/db';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);

function randomId(len = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (const b of buf) id += chars[b % chars.length];
  return id;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env as App.Locals['runtime']['env'];

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const file = formData.get('file') as File | null;
  const filename = (formData.get('filename') as string | null) ?? file?.name ?? 'upload';
  const width = formData.get('width') ? parseInt(formData.get('width') as string, 10) : null;
  const height = formData.get('height') ? parseInt(formData.get('height') as string, 10) : null;

  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return new Response(JSON.stringify({ error: 'Unsupported file type' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const id = randomId();
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const r2Key = `${yyyy}/${mm}/${id}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();

    await env.BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    await insertImage(env.DB, {
      id,
      filename,
      r2_key: r2Key,
      mime_type: file.type,
      size_bytes: file.size,
      width: width ?? null,
      height: height ?? null,
      uploaded_at: now.toISOString(),
    });

    const r2BaseUrl = env.R2_PUBLIC_URL ?? '';
    const url = `${r2BaseUrl}/${r2Key}`;

    return new Response(
      JSON.stringify({
        id,
        url,
        r2_key: r2Key,
        filename,
        width,
        height,
        size_bytes: file.size,
        uploaded_at: now.toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Upload error:', err);
    return new Response(JSON.stringify({ error: 'Upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
