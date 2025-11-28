<template>
  <a-config-provider :theme="themeConfig">
    <div class="app-shell">
      <AppHeader />
      <main class="app-main">
        <MainLayout />
      </main>
      <footer class="app-footer">
        <div class="footer-title">FutureMoney</div>
        <p class="footer-desc">
          一个用时间线管理个人收支和余额预测的小工具，
          <strong class="footer-warning">所有数据仅保存在浏览器本地，请及时导出数据备份，防止丢失。</strong>
        </p>
        <div class="footer-links">
          <a
            href="https://github.com/lipeng3g/future-money"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub 仓库
          </a>
          <a
            href="https://future-money.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
          >
            在线体验
          </a>
          <a
            href="https://linux.do/t/topic/1224494"
            target="_blank"
            rel="noopener noreferrer"
          >
            Linux.do 讨论帖
          </a>
        </div>
      </footer>
      <OnboardingGuide />
    </div>
  </a-config-provider>
</template>

<script setup lang="ts">
import AppHeader from '@/layouts/AppHeader.vue';
import MainLayout from '@/layouts/MainLayout.vue';
import OnboardingGuide from '@/components/common/OnboardingGuide.vue';

const themeConfig = {
  token: {
    colorPrimary: '#4f46e5',
    borderRadius: 8,
    fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif",
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
  },
};
</script>

<style scoped>
.app-footer {
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  padding: 16px 16px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
}

.footer-title {
  font-weight: 600;
  color: #0f172a;
}

.footer-desc {
  margin: 0;
}

.footer-warning {
  color: #ef4444;
  font-weight: 600;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 4px;
}

.footer-links a {
  color: #4f46e5;
  text-decoration: none;
}

.footer-links a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .app-footer {
    flex-direction: column;
    align-items: center;
  }
}
</style>
