import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import '@/styles/global.css';
import App from '@/App';
import EmailVerificationResultPage from '@/components/auth/EmailVerificationResultPage';
import ResetPasswordPage from '@/components/auth/ResetPasswordPage';

const container = document.getElementById('root');
if (!container) throw new Error('未找到 #root 挂载节点');

const pathname = window.location.pathname.replace(/\/$/, '') || '/';
const page = pathname === '/reset-password'
  ? <ResetPasswordPage />
  : pathname === '/auth/email-verified'
    ? <EmailVerificationResultPage />
    : <App />;

createRoot(container).render(
  <StrictMode>
    {page}
  </StrictMode>,
);
