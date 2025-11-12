<template>
  <div class="app-shell">
    <AppHeader />
    <main class="app-main">
      <MainLayout />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/layouts/AppHeader.vue';
import MainLayout from '@/layouts/MainLayout.vue';
</script>
