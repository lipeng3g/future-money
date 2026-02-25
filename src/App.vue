<template>
  <a-config-provider :theme="themeConfig">
    <div class="app-shell">
      <AppHeader />
      <main class="app-main">
        <MainLayout />
      </main>
      <footer class="app-footer">
        <p class="footer-desc">
          FutureMoney — 数据仅存于浏览器本地，请定期导出备份。
        </p>
        <div class="footer-links">
          <a href="https://github.com/lipeng3g/future-money" target="_blank" rel="noopener noreferrer">GitHub</a>
          <span class="footer-sep">·</span>
          <a href="https://future-money.pages.dev" target="_blank" rel="noopener noreferrer">在线体验</a>
          <span class="footer-sep">·</span>
          <a href="https://linux.do/t/topic/1224494" target="_blank" rel="noopener noreferrer">讨论</a>
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

.footer-desc {
  margin: 0;
  color: #94a3b8;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.footer-links a {
  color: #64748b;
  text-decoration: none;
}

.footer-links a:hover {
  color: #4f46e5;
}

.footer-sep {
  color: #cbd5e1;
  font-size: 0.7rem;
}
</style>
