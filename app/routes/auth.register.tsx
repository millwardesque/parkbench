import {
  json,
  type ActionFunctionArgs,
  type MetaFunction,
} from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import { z } from 'zod';
import { useForm, getFormProps, getInputProps } from '@conform-to/react';
import { getZodConstraint, parseWithZod } from '@conform-to/zod';
import AuthForm from '~/components/AuthForm';
import { createUser, sendMagicLink } from '~/lib/auth.server';

const inputClassName =
  'w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500';

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

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: RegisterSchema });

  console.log('[CPM] action: ', submission, request); // @DEBUG

  if (submission.status !== 'success') {
    return json(submission.reply());
  }

  const { name, email, visitors } = submission.value;

  console.log('[CPM] action2: ', submission, request); // @DEBUG

  try {
    // `visitors` is now guaranteed to be a string[] by the schema transform.
    await createUser(name, email, visitors);
    await sendMagicLink(request, email);

    return json(submission.reply({ resetForm: true }));
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
}

export default function RegisterRoute() {
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

  return (
    <AuthForm title="Create your Account">
      {/* The `getFormProps` helper is designed to be used with the spread operator. */}
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <div className="space-y-4">
          <div>
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label
              htmlFor={fields.name.id}
              className="block text-sm font-medium text-gray-700"
            >
              Name
              {/* eslint-disable react/jsx-props-no-spreading */}
              <input
                {...getInputProps(fields.name, {
                  type: 'text',
                })}
                className={inputClassName}
              />
              {/* eslint-enable react/jsx-props-no-spreading */}
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
              {/* eslint-disable react/jsx-props-no-spreading */}
              <input
                {...getInputProps(fields.email, { type: 'email' })}
                className={inputClassName}
              />
              {/* eslint-enable react/jsx-props-no-spreading */}
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
              {/* eslint-disable react/jsx-props-no-spreading */}
              <input
                {...getInputProps(fields.visitors, { type: 'text' })}
                className={inputClassName}
              />
              {/* eslint-enable react/jsx-props-no-spreading */}
            </label>
            <div id={fields.visitors.errorId} className="text-sm text-red-600">
              {fields.visitors.errors}
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="w-full px-4 py-2 mt-6 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          Register
        </button>
      </fetcher.Form>
    </AuthForm>
  );
}
