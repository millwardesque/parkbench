import {
  createCookie,
  createCookieSessionStorage,
  redirect,
} from '@remix-run/node';
import { CSRF } from 'remix-utils/csrf/server';

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
  console.log('[CPM] requireUserId: ', request); // @DEBUG
  if (!userId) {
    const searchParams = new URLSearchParams([['redirectTo', redirectTo]]);
    throw redirect(`/auth/signin?${searchParams}`);
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

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get('Cookie')
  );
  return redirect('/auth/signin', {
    headers: {
      'Set-Cookie': await sessionStorage.destroySession(session),
    },
  });
}

export const csrf = new CSRF({ cookie });

/**
 * A helper function to validate the CSRF token.
 * @param formDataOrRequest The form data or request object.
 * @param headers Optional headers if formData is provided.
 * @throws {Response} If the CSRF token is invalid.
 */
export async function validateCsrfToken(
  formDataOrRequest: FormData | Request,
  headers?: Headers
) {
  if (formDataOrRequest instanceof FormData) {
    // If FormData is provided, headers must also be provided
    if (!headers) {
      throw new Error('Headers must be provided when using FormData');
    }
    console.log('[CPM] validateCsrfToken (FormData): ', formDataOrRequest); // @DEBUG
    await csrf.validate(formDataOrRequest, headers);
  } else {
    // Legacy behavior: read from request
    const formData = await formDataOrRequest.clone().formData();
    console.log(
      '[CPM] validateCsrfToken (Request): ',
      formData,
      formDataOrRequest
    ); // @DEBUG
    await csrf.validate(formData, formDataOrRequest.headers);
  }
}
