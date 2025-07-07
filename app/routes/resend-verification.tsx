import {
  json,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import { resendVerificationEmail } from '~/utils/user.server';
import { getUserId } from '~/utils/session.server';

/**
 * Loader function for the resend verification page.
 * Ensures the user is logged in.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);

  if (!userId) {
    return redirect('/signin?redirectTo=/resend-verification');
  }

  return json({ userId });
}

/**
 * Action function to handle resending the verification email.
 */
export async function action({ request }: ActionFunctionArgs) {
  type ActionResponse = { success: boolean; error?: string };
  const userId = await getUserId(request);

  if (!userId) {
    return json<ActionResponse>(
      { success: false, error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // Get the base URL for the verification link
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const success = await resendVerificationEmail(userId, baseUrl);

  if (success) {
    return json<ActionResponse>({ success: true });
  }

  return json<ActionResponse>({
    success: false,
    error:
      'Unable to resend verification email. Your email may already be verified.',
  });
}

/**
 * Resend verification email page component.
 */
export default function ResendVerification() {
  useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="container mx-auto p-8 max-w-md">
      <h1 className="text-2xl font-bold mb-6">Resend Verification Email</h1>

      {actionData?.success && (
        <div
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Success!</strong>
          <p>Verification email has been sent. Please check your inbox.</p>
        </div>
      )}
      {!actionData?.success && actionData?.error && (
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          <strong className="font-bold">Error:</strong>
          <p>{actionData.error}</p>
        </div>
      )}

      <p className="mb-4">
        Click the button below to resend your verification email:
      </p>

      <Form method="post">
        <button
          type="submit"
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Resend Verification Email
        </button>
      </Form>
    </div>
  );
}
