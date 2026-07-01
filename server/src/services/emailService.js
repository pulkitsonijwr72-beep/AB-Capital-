import nodemailer from 'nodemailer';

let _transporter = null;

/**
 * Returns a singleton Nodemailer transporter.
 * - In development (SMTP_HOST empty): auto-creates an Ethereal test account
 *   and prints the preview URL to the console after each send.
 * - In production: uses SMTP_HOST / SMTP_USER / SMTP_PASS from .env.
 */
async function getTransporter() {
    if (_transporter) return _transporter;

    if (!process.env.SMTP_HOST) {
        // Development fallback — Ethereal gives a free disposable inbox
        const testAccount = await nodemailer.createTestAccount();
        console.log('\n[Email] No SMTP_HOST set — using Ethereal test account');
        console.log(`[Email] Ethereal user: ${testAccount.user}`);
        console.log(`[Email] Ethereal pass: ${testAccount.pass}`);
        _transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
    } else {
        _transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    return _transporter;
}

/**
 * Sends the password reset email.
 *
 * @param {object} opts
 * @param {string} opts.to          - Recipient email address
 * @param {string} opts.name        - Recipient display name
 * @param {string} opts.resetToken  - The raw (unhashed) reset token
 * @param {string} opts.expiresMin  - Expiry in minutes (for display)
 */
export async function sendPasswordResetEmail({ to, name, resetToken, expiresMin = 15 }) {
    const transporter = await getTransporter();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    // The reset link carries the token as a query param; the frontend reads it on the reset page
    const resetUrl = `${frontendUrl}?reset_token=${resetToken}`;

    const displayName = name || 'Valued User';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your AB Capital password</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0B0A0E; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; padding: 0 16px 48px; }
    .logo-row { text-align: center; padding: 32px 0 24px; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #C0B3FF; border-radius: 12px; font-weight: 800; font-size: 17px; color: #0B0A0E; letter-spacing: -0.02em; }
    .brand-name { display: block; color: #FFFFFF; font-size: 20px; font-weight: 700; margin-top: 12px; letter-spacing: -0.02em; }
    .brand-sub { display: block; color: #6E6A7A; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 4px; }
    .card { background: #131217; border: 1px solid #221F2A; border-radius: 16px; padding: 40px 36px; }
    .card-title { color: #FFFFFF; font-size: 22px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
    .card-sub { color: #6E6A7A; font-size: 13px; margin: 0 0 28px; line-height: 1.6; }
    .greeting { color: #E0DEE6; font-size: 14px; line-height: 1.7; margin: 0 0 24px; }
    .greeting strong { color: #FFFFFF; }
    .btn-row { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background: #C0B3FF; color: #0B0A0E; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 10px; letter-spacing: -0.01em; }
    .expiry-note { background: rgba(192,179,255,0.07); border: 1px solid rgba(192,179,255,0.14); border-radius: 10px; padding: 14px 18px; color: #C0B3FF; font-size: 12px; line-height: 1.6; margin: 24px 0; }
    .expiry-note strong { color: #FFFFFF; }
    .fallback-label { color: #6E6A7A; font-size: 11px; margin: 24px 0 8px; }
    .fallback-url { color: #C0B3FF; font-size: 11px; word-break: break-all; }
    .divider { border: none; border-top: 1px solid #221F2A; margin: 28px 0; }
    .footer { color: #6E6A7A; font-size: 11px; line-height: 1.7; }
    .footer strong { color: #E0DEE6; }
    .ignore-note { color: #6E6A7A; font-size: 11px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo-row">
      <div class="logo-badge">AB</div>
      <span class="brand-name">AB Capital</span>
      <span class="brand-sub">Private Finance Console</span>
    </div>

    <div class="card">
      <p class="card-title">Reset your password</p>
      <p class="card-sub">You requested a password reset for your account.</p>

      <p class="greeting">
        Hi <strong>${displayName}</strong>,<br /><br />
        We received a request to reset the password for the AB Capital account associated with this email address.
        Click the button below to choose a new password.
      </p>

      <div class="btn-row">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>

      <div class="expiry-note">
        ⏱ This link is valid for <strong>${expiresMin} minutes</strong> and can only be used once.
        After it expires you'll need to request a new reset link.
      </div>

      <p class="fallback-label">If the button doesn't work, copy and paste this URL into your browser:</p>
      <p class="fallback-url">${resetUrl}</p>

      <hr class="divider" />

      <p class="footer">
        <strong>Security notice:</strong> If you did not request a password reset, you can safely ignore this email.
        Your password will not change until you click the link above and create a new one.
      </p>

      <p class="ignore-note">
        This email was sent to <strong>${to}</strong>. If this was a mistake, no action is required.
      </p>
    </div>
  </div>
</body>
</html>
`.trim();

    const text = `
Reset your AB Capital password
──────────────────────────────
Hi ${displayName},

We received a request to reset the password for your AB Capital account.

Reset link (valid for ${expiresMin} minutes):
${resetUrl}

If you did not request this, please ignore this email.

— AB Capital Security Team
`.trim();

    const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"AB Capital" <no-reply@abcapital.com>',
        to,
        subject: 'Reset your AB Capital password',
        text,
        html
    });

    // In development, print the Ethereal preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
        console.log('\n[Email] Preview URL (Ethereal):', previewUrl);
    }

    return info;
}
