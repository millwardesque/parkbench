import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { getUserId } from '~/utils/session.server';
import { resendVerificationEmail } from '~/utils/user.server';

/**
 * Loader function for the verification required page.
 * Gets the user's information and handles resending if requested.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  const url = new URL(request.url);
  const resend = url.searchParams.get('resend') === 'true';

  if (!userId) {
    return json({ emailSent: false });
  }

  let emailSent = false;
  if (resend) {
    // Get the base URL for the verification link
    const baseUrl = `${url.protocol}//${url.host}`;
    emailSent = await resendVerificationEmail(userId, baseUrl);
  }

  return json({ emailSent });
}

/**
 * Verification required page component.
 * Informs users they need to verify their email and allows resending.
 */
export default function VerificationRequired() {
  const { emailSent } = useLoaderData<typeof loader>();

  return (
    <div className="container mx-auto p-8 max-w-md">
      <div
        className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4"
        role="alert"
      >
        <h1 className="text-2xl font-bold mb-4">Email Verification Required</h1>
        <p className="mb-4">
          You need to verify your email address before you can access this
          feature.
        </p>
        <p className="mb-4">
          Please check your email for a verification link. If you didn&apos;t
          receive an email, you can request a new one.
        </p>

        {emailSent ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            A new verification email has been sent. Please check your inbox.
          </div>
        ) : null}

        <div className="mt-4 space-y-4">
          <Link
            to="/verification-required?resend=true"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded block text-center"
          >
            Resend Verification Email
          </Link>

          <Link
            to="/"
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded block text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
