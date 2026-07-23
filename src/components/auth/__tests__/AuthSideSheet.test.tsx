import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Toast } from '@douyinfe/semi-ui';
import type { ChangeEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthSideSheet from '@/components/auth/AuthSideSheet';

const { signInEmail } = vi.hoisted(() => ({
  signInEmail: vi.fn(),
}));

vi.mock('@douyinfe/semi-ui', () => ({
  Banner: ({ description }: { description: ReactNode }) => <div>{description}</div>,
  Button: ({
    children,
    onClick,
    'aria-label': ariaLabel,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    'aria-label'?: string;
  }) => <button type="button" aria-label={ariaLabel} onClick={onClick}>{children}</button>,
  Input: ({
    value,
    onChange,
    placeholder,
    type,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
  }) => (
    <input
      value={value}
      placeholder={placeholder}
      type={type}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
    />
  ),
  SideSheet: ({
    visible,
    title,
    children,
    footer,
  }: {
    visible: boolean;
    title: ReactNode;
    children: ReactNode;
    footer: ReactNode;
  }) => visible ? (
    <section>
      <h2>{title}</h2>
      {children}
      <footer>{footer}</footer>
    </section>
  ) : null,
  Toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/services/authClient', () => ({
  authClient: {
    requestPasswordReset: vi.fn(),
    signIn: { email: signInEmail },
    signUp: { email: vi.fn() },
  },
  authEmailActionsEnabled: false,
  turnstileSiteKey: '',
}));

describe('AuthSideSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认展示登录，并在邮件服务开放前隐藏注册和找回入口', () => {
    render(<AuthSideSheet visible onClose={vi.fn()} />);

    expect(screen.getByText('登录 FutureMoney')).toBeInTheDocument();
    expect(screen.getByText('登录不会上传本地资金数据')).toBeInTheDocument();
    expect(screen.getByText(/邮箱注册与找回密码将在发信域名验证后开放/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '创建账号' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '忘记密码' })).not.toBeInTheDocument();
  });

  it('密码少于 10 位时不发起登录请求', () => {
    const warning = vi.spyOn(Toast, 'warning').mockImplementation(() => '');
    render(<AuthSideSheet visible onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('至少 10 位'), {
      target: { value: '123456789' },
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(warning).toHaveBeenCalledWith('密码至少需要 10 位');
    expect(signInEmail).not.toHaveBeenCalled();
  });

  it('登录时规范化邮箱，成功后关闭抽屉', async () => {
    const onClose = vi.fn();
    vi.spyOn(Toast, 'success').mockImplementation(() => '');
    signInEmail.mockResolvedValue({ data: {}, error: null });
    render(<AuthSideSheet visible onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: '  User@Example.COM  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('至少 10 位'), {
      target: { value: '1234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: '1234567890',
        rememberMe: true,
      });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  it('登录失败使用统一提示且保持抽屉打开', async () => {
    const onClose = vi.fn();
    const error = vi.spyOn(Toast, 'error').mockImplementation(() => '');
    signInEmail.mockResolvedValue({ data: null, error: { message: 'server detail' } });
    render(<AuthSideSheet visible onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('至少 10 位'), {
      target: { value: '1234567890' },
    });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(error).toHaveBeenCalledWith('邮箱或密码不正确，或邮箱尚未完成验证');
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
