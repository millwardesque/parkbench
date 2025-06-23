import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execSync } from 'child_process';
import prisma from '~/utils/db.server';

// Import the module but not the default export
import * as emailModule from '~/services/email.server';
import { createUser, sendMagicLink, verifyMagicLinkToken } from './auth.server';

// Mock the email service
vi.mock('~/services/email.server', () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(() => Promise.resolve({ success: true })),
}));

// Get a reference to the mocked function
const sendEmail = vi.mocked(emailModule.default);

// Before each test, reset the database to a clean state.
beforeEach(() => {
  // Use a separate test database.
  process.env.DATABASE_URL = 'file:./test.db';
  // The --force flag is needed for non-interactive environments.
  execSync('npx prisma migrate reset --force --skip-seed', {
    stdio: 'inherit',
  });
});

// Disconnect from the database after each test.
afterEach(async () => {
  await prisma.$disconnect();
});

describe('Authentication Utilities', () => {
  describe('createUser', () => {
    it('should create a new user with visitors', async () => {
      // Use a timestamp to ensure email uniqueness
      const uniqueEmail = `test-${Date.now()}@example.com`;
      const user = await createUser('Test User', uniqueEmail, ['Visitor 1']);
      expect(user.email).toBe(uniqueEmail);

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { visitors: true },
      });
      expect(dbUser?.visitors.length).toBe(1);
      expect(dbUser?.visitors[0].name).toBe('Visitor 1');
    });

    it('should throw an error if the user already exists', async () => {
      // Use a unique email for this test as well
      const duplicateEmail = `exists-${Date.now()}@example.com`;
      await createUser('Test User', duplicateEmail, []);
      await expect(
        createUser('Another User', duplicateEmail, [])
      ).rejects.toThrow('A user with this email already exists.');
    });
  });

  describe('Magic Link Flow', () => {
    it('should create, verify, and use a magic link token', async () => {
      const email = 'magic@example.com';
      const request = new Request('http://localhost/auth/signin');

      // 1. Send the magic link
      await sendMagicLink(request, email);
      // Verify that the sendEmail function was called with the correct email address
      expect(sendEmail).toHaveBeenCalledOnce();

      // Extract the token from the first call's payload
      const emailPayload = sendEmail.mock.calls[0][0];
      expect(emailPayload.to).toBe(email);

      // Extract token from the email HTML content
      const tokenMatch = emailPayload.html.match(/token=([^&"]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      expect(token).toBeDefined();

      // 2. Verify the token
      const verifiedEmail = await verifyMagicLinkToken(token!, email);
      expect(verifiedEmail).toBe(email);

      // 3. Ensure the token cannot be used again
      await expect(verifyMagicLinkToken(token!, email)).resolves.toBeNull();
    });

    it('should return null for an expired token', async () => {
      const email = 'expired@example.com';
      const request = new Request('http://localhost/auth/signin');

      await sendMagicLink(request, email);
      expect(sendEmail).toHaveBeenCalledTimes(1);

      // Extract the token from the email payload
      const emailPayload = sendEmail.mock.calls[0][0];
      const tokenMatch = emailPayload.html.match(/token=([^&"]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      expect(token).toBeDefined();

      // Token should be saved in the database
      const savedToken = await prisma.magicLinkToken.findFirst({
        where: { email },
      });
      expect(savedToken).toBeDefined();

      // Set token to expired
      await prisma.magicLinkToken.update({
        where: { id: savedToken!.id },
        data: { expires_at: new Date(Date.now() - 1000) },
      });

      // Try to verify the expired token
      await expect(verifyMagicLinkToken(token!, email)).resolves.toBeNull();
    });
  });
});
