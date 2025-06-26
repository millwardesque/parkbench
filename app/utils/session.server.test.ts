import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  MockInstance,
} from 'vitest';
import {
  createUserSession,
  getUserId,
  requireUserId,
  sessionStorage,
} from './session.server';

describe('Session Management Utilities', () => {
  let commitSessionSpy: MockInstance;

  beforeEach(() => {
    commitSessionSpy = vi.spyOn(sessionStorage, 'commitSession');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('getUserId', () => {
    it('should return undefined for a request without a session', async () => {
      const request = new Request('http://localhost');
      const userId = await getUserId(request);
      expect(userId).toBeUndefined();
    });

    it('should return the user ID for a request with a valid session', async () => {
      const session = await sessionStorage.getSession();
      session.set('userId', 'test-user-id');
      const cookie = await sessionStorage.commitSession(session);
      const request = new Request('http://localhost', {
        headers: { Cookie: cookie },
      });
      const userId = await getUserId(request);
      expect(userId).toBe('test-user-id');
    });
  });

  describe('requireUserId', () => {
    it('should throw a redirect response for an unauthenticated user', async () => {
      const request = new Request('http://localhost/profile');
      try {
        await requireUserId(request);
      } catch (response) {
        expect(response).toBeInstanceOf(Response);
        const location = (response as Response).headers.get('Location');
        expect(location).toBe('/auth/signin?redirectTo=%2Fprofile');
      }
    });

    it('should return the user ID for an authenticated user', async () => {
      const session = await sessionStorage.getSession();
      session.set('userId', 'test-user-id');
      const cookie = await sessionStorage.commitSession(session);
      const request = new Request('http://localhost', {
        headers: { Cookie: cookie },
      });
      const userId = await requireUserId(request);
      expect(userId).toBe('test-user-id');
    });
  });

  describe('createUserSession', () => {
    it('should return a redirect response with a session cookie', async () => {
      commitSessionSpy.mockResolvedValue('mock-cookie');

      const response = await createUserSession('new-user-id', '/dashboard');

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/dashboard');
      expect(response.headers.get('Set-Cookie')).toBe('mock-cookie');
      expect(commitSessionSpy).toHaveBeenCalledTimes(1);
    });
  });
});
