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

// Email verification function removed as part of WBS-62

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
