import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import prisma from '~/utils/db.server';
import { getSession, commitSession } from '~/lib/session.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    session.flash(
      'errorMessage',
      'Invalid verification link. Please try registering again.'
    );
    return redirect('/auth/register', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  const user = await prisma.user.findFirst({
    where: {
      email_verification_token: token,
    },
  });

  if (!user || !user.email_verification_token_expires_at) {
    session.flash(
      'errorMessage',
      'Invalid verification token. Please try registering again.'
    );
    return redirect('/auth/register', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  if (new Date() > user.email_verification_token_expires_at) {
    session.flash(
      'errorMessage',
      'Verification token has expired. Please try registering again.'
    );
    return redirect('/auth/register', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  // Token is valid, update the user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verified_at: new Date(),
      email_verification_token: null,
      email_verification_token_expires_at: null,
    },
  });

  session.flash(
    'successMessage',
    'Email verified successfully! You can now log in.'
  );

  return redirect('/auth/login', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
};

// This route doesn't render anything, it just handles the verification and redirects.
export default function VerifyEmailRoute() {
  return null;
}
