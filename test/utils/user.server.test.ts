import { describe, it, expect, beforeEach, afterEach, Mock } from 'vitest';
import {
  generateVerificationToken,
  sendVerificationEmail,
  verifyEmail,
  isEmailVerified,
  resendVerificationEmail,
  pruneExpiredVerificationTokens,
} from '../../app/utils/user.server';
import prisma from '../../app/utils/db.server';
import sendEmail from '../../app/utils/email.server';

// Mock the dependencies
vi.mock('../../app/utils/email.server', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../app/utils/db.server', () => ({
  default: {
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('User email verification utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateVerificationToken', () => {
    it('should generate a random token string', () => {
      const token1 = generateVerificationToken();
      const token2 = generateVerificationToken();

      expect(token1).toEqual(expect.any(String));
      expect(token1.length).toBeGreaterThan(32); // Hexadecimal representation of 32 random bytes
      expect(token1).not.toEqual(token2); // Tokens should be unique
    });
  });

  describe('sendVerificationEmail', () => {
    it('should update user with token and expiry and send email', async () => {
      // Setup
      const userId = 'user-123';
      const email = 'test@example.com';
      const baseUrl = 'http://localhost:3000';
      const mockUpdate = prisma.user.update as Mock;

      mockUpdate.mockResolvedValue({ id: userId, email });

      // Execute
      await sendVerificationEmail(userId, email, baseUrl);

      // Assert
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockUpdate.mock.calls[0][0].where).toEqual({ id: userId });
      expect(mockUpdate.mock.calls[0][0].data).toHaveProperty(
        'email_verification_token'
      );
      expect(mockUpdate.mock.calls[0][0].data).toHaveProperty(
        'email_verification_token_expires_at'
      );

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Verify'),
          html: expect.stringContaining('verify-email?token='),
          text: expect.stringContaining('verify-email?token='),
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify a valid token and update user record', async () => {
      // Setup
      const token = 'valid-token';
      const userId = 'user-123';
      const mockFindFirst = prisma.user.findFirst as Mock;
      const mockUpdate = prisma.user.update as Mock;
      const now = new Date();
      const future = new Date(now.getTime() + 3600 * 1000);

      mockFindFirst.mockResolvedValue({
        id: userId,
        email_verification_token: token,
        email_verification_token_expires_at: future,
      });

      mockUpdate.mockResolvedValue({
        id: userId,
        email_verified_at: expect.any(Date),
      });

      // Execute
      const result = await verifyEmail(token);

      // Assert
      expect(result).toBe(true);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          email_verification_token: token,
          email_verification_token_expires_at: {
            gt: expect.any(Date),
          },
          email_verified_at: null,
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          email_verified_at: expect.any(Date),
          email_verification_token: null,
          email_verification_token_expires_at: null,
        },
      });
    });

    it('should return false for invalid or expired token', async () => {
      // Setup
      const token = 'invalid-token';
      const mockFindFirst = prisma.user.findFirst as Mock;
      mockFindFirst.mockResolvedValue(null);

      // Execute
      const result = await verifyEmail(token);

      // Assert
      expect(result).toBe(false);
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          email_verification_token: token,
          email_verification_token_expires_at: {
            gt: expect.any(Date),
          },
          email_verified_at: null,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      // Setup
      const token = 'error-token';
      const mockFindFirst = prisma.user.findFirst as Mock;
      mockFindFirst.mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await verifyEmail(token);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('isEmailVerified', () => {
    it('should return true when email is verified', async () => {
      // Setup
      const userId = 'user-123';
      const mockFindUnique = prisma.user.findUnique as Mock;
      mockFindUnique.mockResolvedValue({
        email_verified_at: new Date(),
      });

      // Execute
      const result = await isEmailVerified(userId);

      // Assert
      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { email_verified_at: true },
      });
    });

    it('should return false when email is not verified', async () => {
      // Setup
      const userId = 'user-123';
      const mockFindUnique = prisma.user.findUnique as Mock;
      mockFindUnique.mockResolvedValue({
        email_verified_at: null,
      });

      // Execute
      const result = await isEmailVerified(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when user is not found', async () => {
      // Setup
      const userId = 'nonexistent-user';
      const mockFindUnique = prisma.user.findUnique as Mock;
      mockFindUnique.mockResolvedValue(null);

      // Execute
      const result = await isEmailVerified(userId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resendVerificationEmail', () => {
    it('should resend verification email for unverified user', async () => {
      // Setup
      const userId = 'user-123';
      const email = 'test@example.com';
      const baseUrl = 'http://localhost:3000';
      const mockFindUnique = prisma.user.findUnique as Mock;

      mockFindUnique.mockResolvedValue({
        email,
        email_verified_at: null,
      });

      // Execute
      const result = await resendVerificationEmail(userId, baseUrl);

      // Assert
      expect(result).toBe(true);
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { email: true, email_verified_at: true },
      });

      // Should call sendVerificationEmail which we're not mocking here
      // Instead we check that sendEmail was called
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not resend for already verified user', async () => {
      // Setup
      const userId = 'user-123';
      const email = 'test@example.com';
      const baseUrl = 'http://localhost:3000';
      const mockFindUnique = prisma.user.findUnique as Mock;

      mockFindUnique.mockResolvedValue({
        email,
        email_verified_at: new Date(),
      });

      // Execute
      const result = await resendVerificationEmail(userId, baseUrl);

      // Assert
      expect(result).toBe(false);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should return false if user not found', async () => {
      // Setup
      const userId = 'nonexistent-user';
      const baseUrl = 'http://localhost:3000';
      const mockFindUnique = prisma.user.findUnique as Mock;

      mockFindUnique.mockResolvedValue(null);

      // Execute
      const result = await resendVerificationEmail(userId, baseUrl);

      // Assert
      expect(result).toBe(false);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('pruneExpiredVerificationTokens', () => {
    it('should update users with expired tokens', async () => {
      // Setup
      const mockUpdateMany = prisma.user.updateMany as Mock;
      mockUpdateMany.mockResolvedValue({
        count: 3,
      });

      // Execute
      const result = await pruneExpiredVerificationTokens();

      // Assert
      expect(result).toBe(3);
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          email_verification_token: { not: null },
          email_verification_token_expires_at: {
            lt: expect.any(Date),
          },
        },
        data: {
          email_verification_token: null,
          email_verification_token_expires_at: null,
        },
      });
    });

    it('should handle errors gracefully', async () => {
      // Setup
      const mockUpdateMany = prisma.user.updateMany as Mock;
      mockUpdateMany.mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await pruneExpiredVerificationTokens();

      // Assert
      expect(result).toBe(0);
    });
  });
});
