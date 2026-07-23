export interface AuthEmailSender {
  sendVerificationEmail(input: { email: string; url: string }): Promise<void>;
  sendPasswordResetEmail(input: { email: string; url: string }): Promise<void>;
}

export interface AuthEmailBindings {
  RESEND_API_KEY?: string;
  AUTH_FROM_EMAIL?: string;
}

export class AuthEmailConfigurationError extends Error {
  readonly code = 'AUTH_EMAIL_NOT_CONFIGURED';

  constructor() {
    super('Authentication email provider is not configured');
    this.name = 'AuthEmailConfigurationError';
  }
}

export function createAuthEmailSender(bindings: AuthEmailBindings): AuthEmailSender {
  return {
    sendVerificationEmail: ({ email, url }) =>
      sendEmail(bindings, {
        to: email,
        subject: '验证你的 FutureMoney 邮箱',
        heading: '验证邮箱',
        description: '请点击下方链接完成 FutureMoney 邮箱验证。链接将在 1 小时后失效。',
        url,
      }),
    sendPasswordResetEmail: ({ email, url }) =>
      sendEmail(bindings, {
        to: email,
        subject: '重置你的 FutureMoney 密码',
        heading: '重置密码',
        description: '请点击下方链接重置 FutureMoney 密码。链接将在 1 小时后失效。',
        url,
      }),
  };
}

interface EmailInput {
  to: string;
  subject: string;
  heading: string;
  description: string;
  url: string;
}

async function sendEmail(bindings: AuthEmailBindings, input: EmailInput): Promise<void> {
  const apiKey = bindings.RESEND_API_KEY?.trim();
  const from = bindings.AUTH_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    throw new AuthEmailConfigurationError();
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: `${input.heading}\n\n${input.description}\n\n${input.url}\n\n如果不是你本人操作，请忽略此邮件。`,
      html: renderEmailHtml(input),
    }),
  });

  if (!response.ok) {
    throw new Error(`Authentication email provider rejected the request (${response.status})`);
  }
}

function renderEmailHtml(input: EmailInput): string {
  const heading = escapeHtml(input.heading);
  const description = escapeHtml(input.description);
  const url = escapeHtml(input.url);

  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2937">
    <div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border-radius:16px">
      <div style="font-size:14px;font-weight:700;color:#2563eb">FutureMoney</div>
      <h1 style="margin:16px 0 12px;font-size:24px">${heading}</h1>
      <p style="margin:0 0 24px;line-height:1.7;color:#4b5563">${description}</p>
      <a href="${url}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#2563eb;color:#ffffff;text-decoration:none">继续操作</a>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#9ca3af">如果不是你本人操作，请忽略此邮件。</p>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
