import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import prisma from '~/utils/db.server';
import { commitSession, getSession } from '~/utils/session.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const session = await getSession(request.headers.get('Cookie'));

  if (!token) {
    session.flash('error', 'Verification link is missing a token.');
    return redirect('/auth/signin', {
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
    session.flash('error', 'Invalid verification token.');
    return redirect('/auth/signin', {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  }

  if (new Date() > user.email_verification_token_expires_at) {
    session.flash('error', 'Verification token has expired.');
    return redirect('/auth/signin', {
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

  session.flash('success', 'Email successfully verified. You can now sign in.');
  return redirect('/auth/signin', {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
};

export default function VerifyPage() {
  return (
    <div className="flex min-h-full flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Verifying your email...
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please wait while we verify your email address. You will be redirected
          shortly.
        </p>
      </div>
    </div>
  );
}
