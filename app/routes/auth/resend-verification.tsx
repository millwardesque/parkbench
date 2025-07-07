import { json, type ActionFunctionArgs } from '@remix-run/node';
import { requireUserId } from '~/utils/session.server';
import * as verificationUtils from '~/utils/verification.server';
import { sendVerificationEmail } from '~/lib/auth.server';
import prisma from '~/utils/db.server';

// eslint-disable-next-line import/prefer-default-export
export const action = async ({ request }: ActionFunctionArgs) => {
  const userId = await requireUserId(request);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // This should not happen for a logged-in user, but handle it just in case.
      return json(
        { success: false, error: 'User not found.' },
        { status: 404 }
      );
    }

    // Generate a new token and send the email
    const updatedUser =
      await verificationUtils.createEmailVerificationToken(userId);
    await sendVerificationEmail(request, updatedUser);

    return json({ success: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to resend verification email:', error);
    return json(
      { success: false, error: 'Failed to send verification email.' },
      { status: 500 }
    );
  }
};
