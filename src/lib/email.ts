import {
  bookRequestEmail,
  requestStatusEmail,
  contactMessageEmail,
  type EmailContent,
} from './emailTemplates';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Lendy <onboarding@resend.dev>';

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://lendy.vercel.app';
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via the Resend REST API. If RESEND_API_KEY is not configured,
 * this no-ops gracefully (logs a warning) so the rest of the app keeps working.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs) {
  if (!RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', to);
    return { skipped: true as const };
  }
  if (!to) {
    return { skipped: true as const };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[email] Resend API error:', res.status, text);
      return { error: text };
    }

    return await res.json();
  } catch (error) {
    console.error('[email] Failed to send email:', error);
    return { error: String(error) };
  }
}

export { bookRequestEmail, requestStatusEmail, contactMessageEmail };
export type { EmailContent };
