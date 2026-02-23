import type { APIRoute } from 'astro';
import { signToken, buildAuthCookie } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env as App.Locals['runtime']['env'];

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { password } = body;
  const expectedPassword = env?.UPLOAD_PASSWORD ?? '';
  const secret = env?.AUTH_SECRET ?? '';

  if (!password || password !== expectedPassword) {
    return new Response(JSON.stringify({ error: 'Invalid password' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Sign a token containing the current timestamp
  const payload = `auth:${Date.now()}`;
  const token = await signToken(payload, secret);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildAuthCookie(token),
    },
  });
};
