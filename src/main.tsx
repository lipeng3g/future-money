import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@douyinfe/semi-ui/dist/css/semi.min.css';
import '@/styles/global.css';
import App from '@/App';

const container = document.getElementById('root');
if (!container) throw new Error('未找到 #root 挂载节点');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
