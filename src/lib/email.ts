/**
 * Email Service - Resend Integration
 * --------------------------------------------------
 * Handles all transactional emails for RSL-AI
 * Currently supports: Password Reset
 * --------------------------------------------------
 */

import { Resend } from 'resend';

// Initialize Resend lazily (only when needed)
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

// --------------------------------------------------
// Email Configuration
// --------------------------------------------------
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const FROM_NAME = 'RSL-AI';
const APP_URL = process.env.APP_URL || 'https://rsl-ai-284761901690.me-central1.run.app';

// --------------------------------------------------
// Email Templates (Arabic RTL)
// --------------------------------------------------

interface PasswordResetEmailParams {
  to: string;
  userName?: string;
  resetToken: string;
}

export async function sendPasswordResetEmail({
  to,
  userName,
  resetToken,
}: PasswordResetEmailParams) {
  const resetUrl = `${APP_URL}/auth/reset-password/${resetToken}`;
  const displayName = userName || 'عزيزي المستخدم';

  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>إعادة تعيين كلمة المرور</title>
</head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif; background-color:#f1f5f9;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="100%" style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0d9488 0%, #d4a017 100%); padding:32px 24px; text-align:center;">
        <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700;">RSL-AI</h1>
        <p style="margin:8px 0 0 0; color:#ffffff; opacity:0.9; font-size:14px;">منصّة الرافدين الذكية</p>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding:40px 32px; text-align:right; direction:rtl;">
        <h2 style="margin:0 0 16px 0; color:#1a1f3d; font-size:22px; font-weight:600;">
          إعادة تعيين كلمة المرور
        </h2>
        <p style="margin:0 0 16px 0; color:#475569; font-size:16px; line-height:1.6;">
          مرحباً ${displayName}،
        </p>
        <p style="margin:0 0 24px 0; color:#475569; font-size:16px; line-height:1.6;">
          تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في RSL-AI. إذا كنت أنت من طلب ذلك، اضغط الزر أدناه لإنشاء كلمة مرور جديدة:
        </p>

        <!-- CTA Button -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:32px auto;">
          <tr>
            <td style="background:#0d9488; border-radius:8px;">
              <a href="${resetUrl}" style="display:inline-block; padding:14px 32px; color:#ffffff; text-decoration:none; font-weight:600; font-size:16px;">
                إعادة تعيين كلمة المرور
              </a>
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 16px 0; color:#64748b; font-size:14px; line-height:1.6;">
          أو انسخ الرابط التالي والصقه في متصفحك:
        </p>
        <p style="margin:0 0 24px 0; padding:12px; background:#f1f5f9; border-radius:6px; color:#0d9488; font-size:13px; word-break:break-all; direction:ltr; text-align:left;">
          ${resetUrl}
        </p>

        <!-- Warning -->
        <div style="margin-top:32px; padding:16px; background:#fef3c7; border-right:4px solid #d4a017; border-radius:6px;">
          <p style="margin:0; color:#78350f; font-size:14px; line-height:1.6;">
            ⏱️ <strong>هذا الرابط صالح لمدة ساعة واحدة فقط</strong> من وقت إرسال هذا الإيميل.
          </p>
        </div>

        <div style="margin-top:16px; padding:16px; background:#fee2e2; border-right:4px solid #ef4444; border-radius:6px;">
          <p style="margin:0; color:#7f1d1d; font-size:14px; line-height:1.6;">
            🔒 <strong>لم تطلب إعادة التعيين؟</strong> تجاهل هذا الإيميل — كلمة مرورك الحالية آمنة.
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc; padding:24px 32px; text-align:center; border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 8px 0; color:#64748b; font-size:13px;">
          هذا إيميل تلقائي — لا ترد عليه
        </p>
        <p style="margin:0; color:#94a3b8; font-size:12px;">
          © 2026 RSL-AI — منصّة الرافدين الذكية
        </p>
      </td>
    </tr>

  </table>
</body>
</html>
  `.trim();

  const text = `
إعادة تعيين كلمة المرور — RSL-AI

مرحباً ${displayName}،

تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.

لإعادة التعيين، افتح الرابط التالي:
${resetUrl}

⏱️ هذا الرابط صالح لمدة ساعة واحدة فقط.

🔒 إذا لم تطلب إعادة التعيين، تجاهل هذا الإيميل.

---
© 2026 RSL-AI — منصّة الرافدين الذكية
  `.trim();

  try {
    const result = await getResend().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: 'إعادة تعيين كلمة المرور — RSL-AI',
      html,
      text,
    });

    if (result.error) {
      console.error('[email] Resend error:', result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    console.error('[email] Send failed:', error);
    throw error;
  }
}
