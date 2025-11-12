<template>
  <svg
    v-if="icon"
    :viewBox="icon.viewBox"
    :width="resolvedSize"
    :height="resolvedSize"
    class="app-icon"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="(path, index) in icon.paths" :key="index" :d="path" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const ICONS = {
  edit: {
    viewBox: '0 0 24 24',
    paths: [
      'M16.5 2.75l4.75 4.75-11 11a4 4 0 01-1.7 1.02l-4.05 1.01 1.01-4.05a4 4 0 011.02-1.7l11-11z',
      'M18.5 4.75l-3.25-3.25',
    ],
  },
  delete: {
    viewBox: '0 0 24 24',
    paths: [
      'M4.5 7.5h15',
      'M9.75 4.5V3.75c0-.69.56-1.25 1.25-1.25h2c.69 0 1.25.56 1.25 1.25V4.5',
      'M6.75 7.5l.75 12a2.25 2.25 0 002.24 2.1h4.52a2.25 2.25 0 002.24-2.1l.75-12',
      'M10.5 11.25v6',
      'M13.5 11.25v6',
    ],
  },
  clipboard: {
    viewBox: '0 0 24 24',
    paths: [
      'M8 6.75h8a2.25 2.25 0 012.25 2.25v9.5A2.5 2.5 0 0115.75 21H8.25A2.5 2.5 0 015.75 18.5V9a2.25 2.25 0 012.25-2.25z',
      'M9.5 6.75V5.5A1.75 1.75 0 0111.25 3.75h1.5A1.75 1.75 0 0114.5 5.5v1.25',
      'M9.5 12h5',
      'M9.5 15.5h5',
      'M9.5 19h3',
    ],
  },
  chart: {
    viewBox: '0 0 24 24',
    paths: [
      'M5 5v14h14',
      'M9.5 17V10',
      'M13 17V7',
      'M16.5 17v-5',
    ],
  },
  plus: {
    viewBox: '0 0 24 24',
    paths: [
      'M12 5v14',
      'M5 12h14',
    ],
  },
} as const;

type IconName = keyof typeof ICONS;

const props = withDefaults(defineProps<{ name: IconName; size?: number | string; strokeWidth?: number }>(), {
  size: 24,
  strokeWidth: 1.6,
});

const icon = computed(() => ICONS[props.name]);
const resolvedSize = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size));
const strokeWidth = computed(() => props.strokeWidth);
</script>

<style scoped>
.app-icon {
  display: block;
}
</style>
