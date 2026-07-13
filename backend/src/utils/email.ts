import nodemailer from 'nodemailer';
import config from './config';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@taskflow.com';

/**
 * Sends a production-ready email using SMTP.
 * Falls back to console logging when SMTP is not configured (dev/test).
 */
export const sendEmail = async (to: string, subject: string, html: string, text?: string) => {
  // In test mode, skip all email sending
  if (process.env.NODE_ENV === 'test') return;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`\n==================================================`);
    console.log(`[EMAIL LOG (Fallback - SMTP Not Configured)]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body (Plain text):\n${text || html.replace(/<[^>]*>/g, '')}`);
    console.log(`==================================================\n`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  await transporter.sendMail({
    from: `"TaskFlow" <${EMAIL_FROM}>`,
    to,
    subject,
    text: text || subject,
    html,
  });
};

/** Send email verification link to a newly registered user */
export const sendVerificationEmail = async (to: string, token: string) => {
  const frontendUrl = (config as any).server?.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const verifyUrl = `${frontendUrl}/auth?token=${token}`;
  await sendEmail(
    to,
    'Verify your TaskFlow email',
    `<p>Click the link below to verify your email:</p>
     <a href="${verifyUrl}">${verifyUrl}</a>
     <p>This link expires in 24 hours.</p>`,
    `Verify your email: ${verifyUrl}`
  );
};

/** Send password reset link */
export const sendPasswordResetEmail = async (to: string, token: string) => {
  const frontendUrl = (config as any).server?.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/auth?reset=${token}`;
  await sendEmail(
    to,
    'Reset your TaskFlow password',
    `<p>Click the link below to reset your password:</p>
     <a href="${resetUrl}">${resetUrl}</a>
     <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
    `Reset your password: ${resetUrl}`
  );
};

/** Send workspace invitation email */
export const sendInviteEmail = async (to: string, workspaceName: string, inviteUrl: string) => {
  await sendEmail(
    to,
    `You've been invited to ${workspaceName} on TaskFlow`,
    `<p>You've been invited to join <strong>${workspaceName}</strong>.</p>
     <p><a href="${inviteUrl}">Accept Invitation</a></p>`,
    `Accept your invite: ${inviteUrl}`
  );
};
