/**
 * A simple email utility for sending emails.
 * In a real application, this would be replaced with a proper email service.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends an email.
 * @param options - The email options.
 */
/* eslint-disable no-console */
async function sendEmail(options: EmailOptions): Promise<void> {
  console.log('--- Sending Email ---');
  console.log(`To: ${options.to}`);
  console.log(`Subject: ${options.subject}`);
  console.log('---------------------');
  // In a real app, you'd use a service like Resend, Postmark, or Nodemailer
  // For now, we'll just log to the console.
  return Promise.resolve();
}

export default sendEmail;
