<template>
  <a-config-provider :theme="themeConfig">
    <div class="app-shell">
      <AppHeader />
      <main class="app-main">
        <MainLayout />
      </main>
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
