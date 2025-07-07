import type { User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import prisma from '~/utils/db.server';
import sendEmail from '~/services/email.server';
import * as verificationUtils from '~/utils/verification.server';

const TOKEN_EXPIRATION_MINUTES = 10;

/**
 * Creates a secure, unguessable token and its hash.
 */
function generateMagicLinkToken() {
  const token = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/**
 * Creates and stores a new magic link token for a given email.
 * @returns The raw token string.
 */
async function createMagicLinkToken(email: string) {
  // Invalidate any existing tokens for this email
  await prisma.magicLinkToken.updateMany({
    where: { email, used_at: null },
    data: { used_at: new Date() },
  });

  // Generate a new token
  const { token, hash } = generateMagicLinkToken();

  // Store the hash in the database
  await prisma.magicLinkToken.create({
    data: {
      email,
      token_hash: hash,
      expires_at: new Date(Date.now() + TOKEN_EXPIRATION_MINUTES * 60 * 1000),
    },
  });

  return token;
}

/**
 * Creates a new user and any associated visitors.
 * Throws an error if the user already exists.
 */
export async function createUser(
  name: string,
  email: string,
  visitorNames: string[]
): Promise<User> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error('A user with this email already exists.');
  }

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email },
    });

    if (visitorNames.length > 0) {
      await tx.visitor.createMany({
        data: visitorNames.map((visitorName) => ({
          name: visitorName,
          owner_id: newUser.id,
        })),
      });
    }

    return newUser;
  });

  // Generate verification token and return the user
  return verificationUtils.createEmailVerificationToken(user.id);
}

/**
 * Generates a verification link and sends it to the user's email.
 */
export async function sendVerificationEmail(request: Request, user: User) {
  if (!user.email_verification_token) {
    // This should not happen if called right after user creation
    throw new Error('User does not have a verification token.');
  }

  const url = new URL(request.url);
  const verificationLink = new URL('/auth/verify', url.origin);
  verificationLink.searchParams.set('token', user.email_verification_token);

  await sendEmail({
    to: user.email,
    subject: 'Verify your email for Parkbench',
    html: `Hello!<br><br>Click this link to verify your email and activate your Parkbench account: <a href="${verificationLink.toString()}">Verify Email</a>. This link will expire in 1 hour.`,
    text: `Hello!\n\nCopy and paste this URL into your browser to verify your email and activate your Parkbench account: ${verificationLink.toString()}\nThis link will expire in 1 hour.`,
  });
}

/**
 * Generates a magic link and sends it to the user's email.
 */
export async function sendMagicLink(request: Request, email: string) {
  const token = await createMagicLinkToken(email);

  const url = new URL(request.url);
  const magicLink = new URL('/auth/magic', url.origin);
  magicLink.searchParams.set('token', token);
  magicLink.searchParams.set('email', email); // For easier lookup on the callback

  // In development, log the magic link to the console
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(`\n✨ Magic Link: ${magicLink.toString()}\n`);
  }

  await sendEmail({
    to: email,
    subject: 'Your Parkbench Magic Link',
    html: `Hello!<br><br>Click this link to sign in to your Parkbench account: <a href="${magicLink.toString()}">Sign In</a>. This link will expire in ${TOKEN_EXPIRATION_MINUTES} minutes.`,
    text: `Hello!\n\nCopy and paste this URL into your browser to sign in to your Parkbench account: ${magicLink.toString()}\nThis link will expire in ${TOKEN_EXPIRATION_MINUTES} minutes.`,
  });
}

/**
 * Verifies a magic link token and returns the user's email if valid.
 * Marks the token as used upon successful verification.
 * @returns The user's email or null if the token is invalid.
 */
export async function verifyMagicLinkToken(
  token: string,
  email: string
): Promise<string | null> {
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const magicLink = await prisma.magicLinkToken.findUnique({
    where: { token_hash: tokenHash },
  });

  if (!magicLink || magicLink.email !== email) {
    return null; // Token not found or email mismatch
  }

  if (magicLink.expires_at < new Date()) {
    return null; // Token expired
  }

  if (magicLink.used_at) {
    return null; // Token already used
  }

  // Mark the token as used to prevent reuse.
  await prisma.magicLinkToken.update({
    where: { id: magicLink.id },
    data: { used_at: new Date() },
  });

  return magicLink.email;
}
