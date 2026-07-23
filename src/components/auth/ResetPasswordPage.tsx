import { useState } from 'react';
import { Button, Input, Toast } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconLock, IconTickCircle } from '@douyinfe/semi-icons';
import { authClient } from '@/services/authClient';

export default function ResetPasswordPage() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const invalid = params.has('error') || !token;
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async () => {
    if (password.length < 10) {
      Toast.warning('密码至少需要 10 位');
      return;
    }
    if (password.length > 128) {
      Toast.warning('密码最多允许 128 位');
      return;
    }
    if (password !== confirmPassword) {
      Toast.warning('两次输入的密码不一致');
      return;
    }

    try {
      setSubmitting(true);
      const result = await authClient.resetPassword({ newPassword: password, token: token ?? '' });
      if (result.error) {
        Toast.error('重置链接已失效，请重新发起密码重置');
        return;
      }
      setCompleted(true);
    } catch {
      Toast.error('网络连接失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  if (invalid || completed) {
    return (
      <main className="auth-page">
        <section className="auth-page__card" aria-live="polite">
          <span className={`auth-page__icon${invalid ? ' is-error' : ''}`}>
            {invalid ? <IconAlertTriangle /> : <IconTickCircle />}
          </span>
          <span className="brand__logo">FM</span>
          <h1>{invalid ? '重置链接已失效' : '密码已更新'}</h1>
          <p>
            {invalid
              ? '该链接可能已经使用或超过有效期。请返回 FutureMoney，重新发起密码重置。'
              : '你现在可以使用新密码登录。为保护账号安全，其他已登录会话已经失效。'}
          </p>
          <Button theme="solid" size="large" onClick={() => window.location.assign('/')}>
            返回 FutureMoney
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-page__card auth-page__card--form">
        <span className="auth-page__icon"><IconLock /></span>
        <span className="brand__logo">FM</span>
        <h1>设置新密码</h1>
        <p>密码需要 10–128 位。提交成功后，其他已登录会话将退出。</p>
        <div className="form-field">
          <label className="form-label">新密码</label>
          <Input
            value={password}
            onChange={setPassword}
            mode="password"
            placeholder="至少 10 位"
            autoComplete="new-password"
          />
        </div>
        <div className="form-field">
          <label className="form-label">确认新密码</label>
          <Input
            value={confirmPassword}
            onChange={setConfirmPassword}
            mode="password"
            placeholder="再次输入新密码"
            autoComplete="new-password"
          />
        </div>
        <Button block theme="solid" size="large" loading={submitting} onClick={handleSubmit}>
          更新密码
        </Button>
        <Button block theme="borderless" onClick={() => window.location.assign('/')}>
          取消并返回
        </Button>
      </section>
    </main>
  );
}
