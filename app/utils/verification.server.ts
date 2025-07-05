import { randomBytes } from 'crypto';
import prisma from './db.server';

const VERIFICATION_TOKEN_EXPIRATION_MINUTES = 60; // 1 hour

/**
 * Generates a secure, URL-safe verification token.
 * @returns {string} A random token.
 */
function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Creates a verification token for a user and updates the user record.
 * @param userId - The ID of the user to create the token for.
 * @returns The updated user with the new verification token.
 */
async function createEmailVerificationToken(userId: string) {
  const token = generateVerificationToken();
  const expiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRATION_MINUTES * 60 * 1000
  );

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      // Field names must match Prisma schema exactly
      email_verification_token: token,
      email_verification_token_expires_at: expiresAt,
    },
  });

  return updatedUser;
}

export default { createEmailVerificationToken };
