import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import AuthForm from '~/components/AuthForm';
import { createUser } from '~/lib/auth.server';
import { getSession, commitSession } from '~/lib/session.server';
import { withRateLimit } from '~/utils/limiter.server';

const inputClassName =
  'w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-xs focus:ring-indigo-500 focus:border-indigo-500 text-white';

// Define the validation schema for the registration form
const RegisterSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, 'Name must be at least 2 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address'),
  // Visitors are optional, comma-separated names
  visitors: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        : []
    ),
});

export const meta: MetaFunction = () => [{ title: 'Register | Parkbench' }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await getSession(request);
  const errorMessage = session.get('errorMessage') || null;

  return json(
    { errorMessage },
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
};

export const action = withRateLimit(async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: RegisterSchema });

  if (submission.status !== 'success') {
    return json(submission.reply());
  }

  const { name, email, visitors } = submission.value;

  try {
    // `visitors` is now guaranteed to be a string[] by the schema transform.
    await createUser(name, email, visitors);

    return json({
      ...submission.reply({ resetForm: true }),
      successMessage: 'Success! Your account has been created.',
    });
  } catch (error) {
    // Handle duplicate email error
    if (error instanceof Error && error.message.includes('already exists')) {
      return json(
        submission.reply({
          fieldErrors: {
            email: ['A user with this email already exists.'],
          },
        })
      );
    }

    // Handle other unexpected errors
    return json(
      submission.reply({
        formErrors: ['An unexpected error occurred. Please try again.'],
      })
    );
  }
});

export default function RegisterRoute() {
  const { errorMessage } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [form, fields] = useForm({
    id: 'register-form',
    constraint: getZodConstraint(RegisterSchema),
    lastResult: fetcher.data,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: RegisterSchema });
    },
    shouldRevalidate: 'onInput',
  });

  const lastSubmission = fetcher.data;
  const isSuccess = lastSubmission?.successMessage;

  return (
    <AuthForm title="Create your Account">
      {isSuccess ? (
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            Check your email
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {lastSubmission.successMessage}
          </p>
        </div>
      ) : (
        <fetcher.Form method="post" {...getFormProps(form)}>
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
                htmlFor={fields.name.id}
                className="block text-sm font-medium text-gray-700"
              >
                Name
                <input
                  {...getInputProps(fields.name, {
                    type: 'text',
                  })}
                  className={inputClassName}
                />
              </label>
              <div id={fields.name.errorId} className="text-sm text-red-600">
                {fields.name.errors}
              </div>
            </div>
            <div>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                htmlFor={fields.email.id}
                className="block text-sm font-medium text-gray-700"
              >
                Email
                <input
                  {...getInputProps(fields.email, { type: 'email' })}
                  className={inputClassName}
                />
              </label>
              <div id={fields.email.errorId} className="text-sm text-red-600">
                {fields.email.errors}
              </div>
            </div>
            <div>
              <label
                htmlFor={fields.visitors.id}
                className="block text-sm font-medium text-gray-700"
              >
                Visitors (optional, comma-separated)
                <input
                  {...getInputProps(fields.visitors, { type: 'text' })}
                  className={inputClassName}
                />
              </label>
              <div
                id={fields.visitors.errorId}
                className="text-sm text-red-600"
              >
                {fields.visitors.errors}
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 mt-6 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Register
          </button>
        </fetcher.Form>
      )}
    </AuthForm>
  );
}
