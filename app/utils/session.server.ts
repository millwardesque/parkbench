import { createCookieSessionStorage } from '@remix-run/node';

// TODO: Add SESSION_SECRET to .env
const sessionSecret = process.env.SESSION_SECRET ?? 'development-secret';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'parkbench_session',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
    sameSite: 'lax',
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
