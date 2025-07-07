/**
 * User-related utilities for the application.
 * Handles email verification and user status.
 */

/* eslint-disable no-console */

import { randomBytes } from 'crypto';
import prisma from './db.server';
import sendEmail, { createVerificationEmail } from './email.server';

/**
 * Generates a random token for email verification.
 * @returns A random token string
 */
export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Sends a verification email to a user.
 * @param userId - The user's ID
 * @param email - The user's email address
 * @param baseUrl - The base URL for constructing the verification link
 */
export async function sendVerificationEmail(
  userId: string,
  email: string,
  baseUrl: string
): Promise<void> {
  // Generate a new verification token
  const token = generateVerificationToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

  // Update user with verification token
  await prisma.user.update({
    where: { id: userId },
    data: {
      email_verification_token: token,
      email_verification_token_expires_at: expiresAt,
    },
  });

  // Send verification email
  const emailOptions = createVerificationEmail(email, token, baseUrl);
  await sendEmail(emailOptions);
}

/**
 * Verifies a user's email with the given token.
 * @param token - The verification token
 * @returns Whether the verification was successful
 */
export async function verifyEmail(token: string): Promise<boolean> {
  const now = new Date();

  try {
    // Find user with matching token that hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        email_verification_token: token,
        email_verification_token_expires_at: {
          gt: now,
        },
        email_verified_at: null,
      },
    });

    if (!user) {
      return false;
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified_at: now,
        email_verification_token: null,
        email_verification_token_expires_at: null,
      },
    });

    return true;
  } catch (error) {
    console.error('Error verifying email:', error);
    return false;
  }
}

/**
 * Checks if a user's email is verified.
 * @param userId - The user's ID
 * @returns Whether the user's email is verified
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email_verified_at: true },
  });

  return !!user?.email_verified_at;
}

/**
 * Resends verification email to a user.
 * @param userId - The user's ID
 * @param baseUrl - The base URL for constructing the verification link
 * @returns Whether the email was resent successfully
 */
export async function resendVerificationEmail(
  userId: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, email_verified_at: true },
    });

    if (!user || user.email_verified_at) {
      return false;
    }

    await sendVerificationEmail(userId, user.email, baseUrl);
    return true;
  } catch (error) {
    console.error('Error resending verification email:', error);
    return false;
  }
}

/**
 * Prunes expired verification tokens.
 * @returns The number of tokens pruned
 */
export async function pruneExpiredVerificationTokens(): Promise<number> {
  try {
    const now = new Date();
    const result = await prisma.user.updateMany({
      where: {
        email_verification_token: { not: null },
        email_verification_token_expires_at: {
          lt: now,
        },
      },
      data: {
        email_verification_token: null,
        email_verification_token_expires_at: null,
      },
    });

    return result.count;
  } catch (error) {
    console.error('Error pruning expired verification tokens:', error);
    return 0;
  }
}
