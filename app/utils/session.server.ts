import {
  createCookie,
  createCookieSessionStorage,
  redirect,
} from '@remix-run/node';
import { CSRF } from 'remix-utils/csrf/server';

// TODO: Add SESSION_SECRET to .env
const sessionSecret = process.env.SESSION_SECRET ?? 'development-secret';

if (!sessionSecret) {
  throw new Error('SESSION_SECRET must be set');
}

const cookie = createCookie('parkbench_session', {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secrets: [process.env.SESSION_SECRET!],
  secure: process.env.NODE_ENV === 'production',
});

export const sessionStorage = createCookieSessionStorage({
  cookie,
});

const USER_SESSION_KEY = 'userId';

/**
 * Get the user ID from the session cookie.
 * @param request The request object.
 * @returns The user ID or `undefined` if the user is not logged in.
 */
export async function getUserId(request: Request): Promise<string | undefined> {
  const session = await sessionStorage.getSession(
    request.headers.get('Cookie')
  );
  const userId = session.get(USER_SESSION_KEY);
  if (!userId || typeof userId !== 'string') return undefined;
  return userId;
}

/**
 * Require a user ID for a route.
 * @param request The request object.
 * @throws {Response} If the user is not logged in, redirects to the sign-in page.
 * @returns The user ID.
 */
export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserId(request);
  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/sign-in?${searchParams}`);
  }
  return userId;
}

/**
 * Create a user session and redirect.
 * @param userId The ID of the user to log in.
 * @param redirectTo The path to redirect to after logging in.
 * @returns A redirect response.
 */
export async function createUserSession(userId: string, redirectTo: string) {
  const session = await sessionStorage.getSession();
  session.set(USER_SESSION_KEY, userId);
  return redirect(redirectTo, {
    headers: {
      'Set-Cookie': await sessionStorage.commitSession(session),
    },
  });
}

export const csrf = new CSRF({ cookie });

/**
 * A helper function to validate the CSRF token.
 * @param request The request object.
 * @throws {Response} If the CSRF token is invalid.
 */
export async function validateCsrfToken(request: Request) {
  const formData = await request.clone().formData();
  await csrf.validate(formData, request.headers);
}
