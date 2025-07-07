/**
 * Email utility for sending emails with Resend API.
 * https://resend.com/docs/api-reference/emails/send-email
 */

/* eslint-disable no-console */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

/**
 * Creates an email verification message.
 * @param to - The recipient email address.
 * @param token - The verification token.
 * @param baseUrl - The base URL for the verification link.
 */
export function createVerificationEmail(
  to: string,
  token: string,
  baseUrl: string
) {
  const verificationUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return {
    to,
    subject: 'Verify your email address for Parkbench',
    html: `
      <h1>Verify your email address</h1>
      <p>Thanks for signing up for Parkbench! Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Verify my email</a></p>
      <p>Or copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <p>If you didn't sign up for Parkbench, you can safely ignore this email.</p>
    `,
    text: `
      Verify your email address

      Thanks for signing up for Parkbench! Please verify your email address by clicking the link below:

      ${verificationUrl}

      This link will expire in 24 hours.

      If you didn't sign up for Parkbench, you can safely ignore this email.
    `,
  };
}

/**
 * Sends an email using Resend API.
 * @param options - The email options.
 */
async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, text, from } = options;
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail =
    from || process.env.EMAIL_FROM || 'noreply@parkbench.example.com';

  if (!apiKey) {
    // Fall back to console logging in development or if API key is missing
    console.log('--- Sending Email ---');
    console.log(`From: ${fromEmail}`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${text}`);
    console.log('---------------------');
    return Promise.resolve();
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject,
        html,
        text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to send email: ${errorData.message || response.statusText}`
      );
    }

    return Promise.resolve();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export default sendEmail;
