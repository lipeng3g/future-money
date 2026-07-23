import { useEffect, useState } from 'react';
import { Banner, Button, SideSheet, Spin, Toast } from '@douyinfe/semi-ui';
import { IconGithubLogo, IconLock } from '@douyinfe/semi-icons';
import {
  authClient,
  fetchAuthProviders,
  type AuthProvider,
  type AuthProviderAvailability,
} from '@/services/authClient';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AuthSideSheet({ visible, onClose }: Props) {
  const [providers, setProviders] = useState<AuthProviderAvailability | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [signingIn, setSigningIn] = useState<AuthProvider | null>(null);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    setProviders(null);
    setLoadFailed(false);
    setSigningIn(null);

    fetchAuthProviders(controller.signal)
      .then(setProviders)
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setLoadFailed(true);
      });

    return () => controller.abort();
  }, [visible]);

  const handleSocialSignIn = async (provider: AuthProvider) => {
    try {
      setSigningIn(provider);
      const origin = window.location.origin;
      const result = await authClient.signIn.social({
        provider,
        callbackURL: origin,
        newUserCallbackURL: origin,
        errorCallbackURL: `${origin}/?auth=oauth-error`,
      });
      if (result.error) {
        Toast.error('暂时无法开始授权登录，请稍后重试');
        setSigningIn(null);
      }
    } catch {
      Toast.error('网络连接失败，请稍后重试');
      setSigningIn(null);
    }
  };

  const hasProvider = Boolean(providers?.github || providers?.google);

  return (
    <SideSheet
      title="登录 FutureMoney"
      visible={visible}
      onCancel={onClose}
      width="min(440px, 100vw)"
      className="product-sheet auth-sheet"
      footer={
        <div className="sheet-footer">
          <Button onClick={onClose}>暂不登录</Button>
        </div>
      }
    >
      <div className="auth-sheet__intro">
        <span className="auth-sheet__mark"><IconLock /></span>
        <div>
          <strong>授权登录不会上传本地资金数据</strong>
          <p>登录只建立用户身份；当前浏览器中的账本不会被自动覆盖或上传。</p>
        </div>
      </div>

      <div className="auth-provider-list" aria-live="polite">
        {!providers && !loadFailed && (
          <div className="auth-provider-list__loading">
            <Spin />
            <span>正在检查可用登录方式…</span>
          </div>
        )}

        {loadFailed && (
          <Banner
            type="warning"
            description="暂时无法获取登录方式，请稍后重新打开。游客模式仍可正常使用。"
          />
        )}

        {providers && !hasProvider && (
          <Banner
            type="info"
            description="社交账号授权正在配置中。当前可以继续使用本地游客模式。"
          />
        )}

        {providers?.github && (
          <Button
            block
            size="large"
            className="auth-provider-button"
            icon={<IconGithubLogo />}
            loading={signingIn === 'github'}
            disabled={signingIn !== null && signingIn !== 'github'}
            onClick={() => handleSocialSignIn('github')}
          >
            使用 GitHub 登录
          </Button>
        )}

        {providers?.google && (
          <Button
            block
            size="large"
            className="auth-provider-button"
            icon={<span className="auth-provider-button__google" aria-hidden="true">G</span>}
            loading={signingIn === 'google'}
            disabled={signingIn !== null && signingIn !== 'google'}
            onClick={() => handleSocialSignIn('google')}
          >
            使用 Google 登录
          </Button>
        )}
      </div>

      <div className="auth-sheet__privacy">
        <strong>我们会获取什么？</strong>
        <p>仅获取社交账号提供的用户标识、显示名称、头像和已验证邮箱，用于识别账号和保持登录状态。</p>
      </div>
    </SideSheet>
  );
}
