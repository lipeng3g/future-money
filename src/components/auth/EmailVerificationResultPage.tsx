import { Button } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconTickCircle } from '@douyinfe/semi-icons';

export default function EmailVerificationResultPage() {
  const failed = new URLSearchParams(window.location.search).has('error');

  return (
    <main className="auth-page">
      <section className="auth-page__card" aria-live="polite">
        <span className={`auth-page__icon${failed ? ' is-error' : ''}`}>
          {failed ? <IconAlertTriangle /> : <IconTickCircle />}
        </span>
        <span className="brand__logo">FM</span>
        <h1>{failed ? '验证链接已失效' : '邮箱验证成功'}</h1>
        <p>
          {failed
            ? '该链接可能已经使用或超过有效期。请返回 FutureMoney，重新发起邮箱验证。'
            : '你的账号已经可以正常登录。当前设备中的资金数据仍保存在本机，不会被自动上传。'}
        </p>
        <Button theme="solid" size="large" onClick={() => window.location.assign('/')}>
          返回 FutureMoney
        </Button>
      </section>
    </main>
  );
}
