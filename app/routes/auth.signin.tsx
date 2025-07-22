import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { useFetcher, useLoaderData, Link } from '@remix-run/react';
import { z } from 'zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import AuthForm from '~/components/AuthForm';
import prisma from '~/utils/db.server';
import { sendMagicLink } from '~/lib/auth.server';
import { getSession, commitSession } from '~/lib/session.server';
import { withRateLimit } from '~/utils/limiter.server';

// Define the validation schema for the sign-in form
const SignInSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address'),
});

export const meta: MetaFunction = () => [{ title: 'Sign In | Parkbench' }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  const successMessage = session.get('successMessage') || null;
  const errorMessage = session.get('errorMessage') || null;

  return json(
    { successMessage, errorMessage },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
};

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: SignInSchema });

  if (submission.status !== 'success') {
    return json(submission.reply());
  }

  const { email } = submission.value;

  const user = await prisma.user.findUnique({ where: { email } });

  console.log('[CPM] Sign-in action called', email, submission, user); // @DEBUG

  // To prevent email enumeration, we always act like the request was successful.
  // If the user exists, we send the email. If not, we do nothing.
  if (user) {
    try {
      await sendMagicLink(request, email);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Sign-in error:', error);
      // Do not expose the error to the client to prevent leaking information.
    }
  }

  // Always return a successful-looking response to the client.
  return json(submission.reply({ resetForm: true }));
});

export default function SignInRoute() {
  const { successMessage, errorMessage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [form, fields] = useForm({
    id: 'signin-form',
    constraint: getZodConstraint(SignInSchema),
    lastResult: fetcher.data,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: SignInSchema });
    },
    shouldRevalidate: 'onInput',
  });

  const isSuccess = fetcher.data?.status === 'success';

  return (
    <AuthForm title="Sign In to your Account">
      <fetcher.Form method="post" {...getFormProps(form)}>
        {successMessage && (
          <div
            className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg"
            role="alert"
          >
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div
            className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg"
            role="alert"
          >
            {errorMessage}
          </div>
        )}
        <div className="space-y-4">
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label
              htmlFor={fields.email.id}
              className="block text-sm font-medium text-gray-700"
            >
              Email
              <input
                {...getInputProps(fields.email, { type: 'email' })}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-xs focus:ring-indigo-500 focus:border-indigo-500"
              />
            </label>
            <div id={fields.email.errorId} className="text-sm text-red-600">
              {fields.email.errors}
            </div>
          </div>
        </div>
        {isSuccess ? (
          <p className="mt-6 text-center text-green-600">
            If an account with that email exists, a magic link has been sent.
          </p>
        ) : (
          <button
            type="submit"
            className="w-full px-4 py-2 mt-6 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Send Magic Link
          </button>
        )}
        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link to="/auth/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </fetcher.Form>
    </AuthForm>
  );
}
