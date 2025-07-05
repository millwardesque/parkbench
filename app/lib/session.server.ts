import { createCookieSessionStorage } from '@remix-run/node';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set');
}

// Create a session storage utility
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === 'production',
  },
});

// Get the session from a request
export function getSession(request: Request) {
  const cookie = request.headers.get('Cookie');
  return sessionStorage.getSession(cookie);
}

// Commit the session and get the Set-Cookie header
export const { commitSession, destroySession } = sessionStorage;
