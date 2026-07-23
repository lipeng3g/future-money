import { useEffect, useState } from 'react';
import { Banner, Button, Input, SideSheet, Toast } from '@douyinfe/semi-ui';
import { IconLock, IconMail } from '@douyinfe/semi-icons';
import {
  authClient,
  authEmailActionsEnabled,
  turnstileSiteKey,
} from '@/services/authClient';
import TurnstileWidget from './TurnstileWidget';

type AuthMode = 'login' | 'register' | 'forgot';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AuthSideSheet({ visible, onClose }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setEmailSent(false);
    setTurnstileToken('');
    setTurnstileResetKey((key) => key + 1);
  }, [visible]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setEmailSent(false);
    setTurnstileToken('');
    setTurnstileResetKey((key) => key + 1);
  };

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Toast.warning('请输入邮箱');
      return;
    }
    if (turnstileSiteKey && !turnstileToken) {
      Toast.warning('请先完成安全验证');
      return;
    }

    const fetchOptions = turnstileSiteKey
      ? { headers: { 'x-captcha-response': turnstileToken } }
      : undefined;

    if (mode === 'forgot') {
      try {
        setSubmitting(true);
        const result = await authClient.requestPasswordReset({
          email: normalizedEmail,
          redirectTo: `${window.location.origin}/reset-password`,
          fetchOptions,
        });
        if (result.error) {
          Toast.error('暂时无法发送重置邮件，请稍后重试');
          setTurnstileResetKey((key) => key + 1);
          return;
        }
        setEmailSent(true);
      } catch {
        Toast.error('网络连接失败，请稍后重试');
        setTurnstileResetKey((key) => key + 1);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (password.length < 10) {
      Toast.warning('密码至少需要 10 位');
      return;
    }
    if (password.length > 128) {
      Toast.warning('密码最多允许 128 位');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        Toast.warning('请输入你的称呼');
        return;
      }
      if (password !== confirmPassword) {
        Toast.warning('两次输入的密码不一致');
        return;
      }

      try {
        setSubmitting(true);
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: normalizedEmail,
          password,
          callbackURL: `${window.location.origin}/auth/email-verified`,
          fetchOptions,
        });
        if (result.error) {
          Toast.error('注册失败，请检查填写内容后重试');
          setTurnstileResetKey((key) => key + 1);
          return;
        }
        setEmailSent(true);
      } catch {
        Toast.error('网络连接失败，请稍后重试');
        setTurnstileResetKey((key) => key + 1);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      setSubmitting(true);
      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        rememberMe: true,
        fetchOptions,
      });
      if (result.error) {
        Toast.error('邮箱或密码不正确，或邮箱尚未完成验证');
        setTurnstileResetKey((key) => key + 1);
        return;
      }

      Toast.success('登录成功，资金数据仍保存在当前设备');
      onClose();
    } catch {
      Toast.error('网络连接失败，请稍后重试');
      setTurnstileResetKey((key) => key + 1);
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'login' ? '登录 FutureMoney' : mode === 'register' ? '创建账号' : '找回密码';

  return (
    <SideSheet
      title={title}
      visible={visible}
      onCancel={onClose}
      width="min(440px, 100vw)"
      className="product-sheet auth-sheet"
      footer={
        <div className="sheet-footer">
          {emailSent ? (
            <Button theme="solid" onClick={onClose}>完成</Button>
          ) : (
            <>
              <Button onClick={onClose}>取消</Button>
              <Button theme="solid" loading={submitting} onClick={handleSubmit}>
                {mode === 'login' ? '登录' : mode === 'register' ? '注册并验证邮箱' : '发送重置邮件'}
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="auth-sheet__intro">
        <span className="auth-sheet__mark"><IconLock /></span>
        <div>
          <strong>{mode === 'login' ? '登录不会上传本地资金数据' : '账号用于安全保存与多设备恢复'}</strong>
          <p>当前阶段只建立用户身份；本地账本不会被自动覆盖或上传。</p>
        </div>
      </div>

      {!authEmailActionsEnabled && (
        <Banner
          type="info"
          description="邮箱注册与找回密码将在发信域名验证后开放；现有账号可以正常登录。"
        />
      )}

      {emailSent ? (
        <div className="auth-sheet__result">
          <IconMail />
          <h3>请检查你的邮箱</h3>
          <p>如果该邮箱可以执行此操作，你会收到一封来自 FutureMoney 的邮件。</p>
        </div>
      ) : (
        <>
          {mode === 'register' && (
            <div className="form-field">
              <label className="form-label">称呼</label>
              <Input value={name} onChange={setName} placeholder="用于账号菜单显示" maxLength={40} />
            </div>
          )}
          <div className="form-field">
            <label className="form-label">邮箱</label>
            <Input value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
          </div>
          {mode !== 'forgot' && (
            <div className="form-field">
              <label className="form-label">密码</label>
              <Input value={password} onChange={setPassword} placeholder="至少 10 位" mode="password" />
            </div>
          )}
          {mode === 'register' && (
            <div className="form-field">
              <label className="form-label">确认密码</label>
              <Input value={confirmPassword} onChange={setConfirmPassword} placeholder="再次输入密码" mode="password" />
            </div>
          )}
          {turnstileSiteKey && (
            <TurnstileWidget
              siteKey={turnstileSiteKey}
              resetKey={turnstileResetKey}
              onToken={setTurnstileToken}
            />
          )}
        </>
      )}

      {!emailSent && (
        <div className="auth-sheet__switches">
          {mode !== 'login' && <Button theme="borderless" onClick={() => switchMode('login')}>返回登录</Button>}
          {mode === 'login' && authEmailActionsEnabled && (
            <>
              <Button theme="borderless" onClick={() => switchMode('register')}>创建账号</Button>
              <Button theme="borderless" onClick={() => switchMode('forgot')}>忘记密码</Button>
            </>
          )}
        </div>
      )}
    </SideSheet>
  );
}
