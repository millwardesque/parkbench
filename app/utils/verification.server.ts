import { randomBytes } from 'crypto';
import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import prisma from './db.server';
import { getUserId } from './session.server';

const VERIFICATION_TOKEN_EXPIRATION_MINUTES = 1440; // 24 hours

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

/**
 * Checks if a user's email is verified.
 * @param userId - The user's ID
 * @returns Whether the user's email is verified
 */
async function isEmailVerified(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email_verified_at: true },
  });

  return !!user?.email_verified_at;
}

/**
 * Middleware to require email verification.
 * Redirects to verification notice page if email is not verified.
 * @param request - The request object
 */
async function requireVerifiedEmail({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    const url = new URL(request.url);
    const redirectTo = url.pathname + url.search;
    return redirect(`/signin?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const verified = await isEmailVerified(userId);
  if (!verified) {
    return redirect('/verification-required');
  }

  return null; // Continue to the route handler
}

export {
  createEmailVerificationToken,
  generateVerificationToken,
  isEmailVerified,
  requireVerifiedEmail,
};
