import { defineMiddleware } from 'astro:middleware';
import { extractToken, verifyToken } from './lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = new URL(context.request.url);

  // Allow public paths without auth
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    context.locals.isAuthenticated = false;
    return next();
  }

  const env = context.locals.runtime?.env as App.Locals['runtime']['env'];
  const secret = env?.AUTH_SECRET ?? '';

  const cookieHeader = context.request.headers.get('cookie');
  const token = extractToken(cookieHeader);

  if (token && secret) {
    const payload = await verifyToken(token, secret);
    if (payload) {
      context.locals.isAuthenticated = true;
      return next();
    }
  }

  context.locals.isAuthenticated = false;

  // API routes return 401
  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Page routes redirect to login
  return context.redirect('/login');
});
