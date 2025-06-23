import { z } from 'zod';

// Define a schema for the email payload for validation
const EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().min(1),
});

type EmailPayload = z.infer<typeof EmailSchema>;

// For local development, we can mock the email sending by logging to the console.
async function sendConsoleEmail(payload: EmailPayload) {
  const validatedPayload = EmailSchema.parse(payload);
  /* eslint-disable no-console */
  console.log('\n--- Sending Email (Console) ---');
  console.log(`To: ${validatedPayload.to}`);
  console.log(`Subject: ${validatedPayload.subject}`);
  console.log('--- HTML Body ---');
  console.log(validatedPayload.html);
  console.log('--- Text Body ---');
  console.log(validatedPayload.text);
  console.log('-----------------------------\n');
  /* eslint-enable no-console */
  return { success: true };
}

// In a real app, you would integrate with a service like Resend, Postmark, or SendGrid.
// This is where the logic for the actual email provider would go.
async function sendResendEmail(payload: EmailPayload) {
  // TODO: Implement Resend integration (WBS-7.2)
  // const { Resend } = await import('resend');
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // const validatedPayload = EmailSchema.parse(payload);
  // try {
  //   await resend.emails.send(validatedPayload);
  //   return { success: true };
  // } catch (error) {
  //   console.error('Failed to send email:', error);
  //   return { success: false, error };
  // }

  // eslint-disable-next-line no-console
  console.warn(
    'Resend email provider not yet implemented. Falling back to console.'
  );
  return sendConsoleEmail(payload);
}

/**
 * Sends an email using the configured provider.
 * In development, it defaults to logging the email to the console.
 * @param payload - The email payload (to, subject, html, text).
 */
export default async function sendEmail(payload: EmailPayload) {
  const provider = process.env.EMAIL_PROVIDER || 'console';

  if (provider === 'resend') {
    return sendResendEmail(payload);
  }

  // Default to console for development or if no provider is set
  return sendConsoleEmail(payload);
}
