import {
  json,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';
import { useForm, getFormProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import AuthForm from '~/components/AuthForm';
import prisma from '~/utils/db.server';
import { sendMagicLink } from '~/lib/auth.server';

// Define the validation schema for the sign-in form
const SignInSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address'),
});

export const meta: MetaFunction = () => [{ title: 'Sign In | Parkbench' }];

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: SignInSchema });

  if (submission.status !== 'success') {
    return json(submission.reply());
  }

  const { email } = submission.value;

  const user = await prisma.user.findUnique({ where: { email } });

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
}

export default function SignInRoute() {
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
      {/* The `getFormProps` helper is designed to be used with the spread operator. */}
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <div className="space-y-4">
          <div>
            <label
              htmlFor={fields.email.id}
              className="block text-sm font-medium text-gray-700"
            >
              Email
              {/* Due to the design of conform library, we need to spread props which is required for proper form handling */}
              <input
                type="email"
                id={fields.email.id}
                name={fields.email.name}
                aria-invalid={Boolean(fields.email.errors)}
                aria-describedby={fields.email.errorId}
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full px-4 py-2 mt-6 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Send Magic Link
          </button>
        )}
      </fetcher.Form>
    </AuthForm>
  );
}
