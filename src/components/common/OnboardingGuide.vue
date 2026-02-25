<template>
  <Teleport to="body">
    <transition name="guide-fade">
      <div v-if="visible" class="guide-overlay">
        <div class="guide-backdrop"></div>
        <div v-if="highlightVisible" class="guide-highlight" :style="highlightStyle"></div>
        <div class="guide-card" :style="cardStyle">
          <p class="step-indicator">步骤 {{ currentStep + 1 }} / {{ steps.length }}</p>
          <h3>{{ currentStepData?.title }}</h3>
          <p class="guide-description">
            {{ currentStepData?.description }}
          </p>
          <div class="guide-actions">
            <a-button type="text" size="small" @click="skipGuide">跳过</a-button>
            <div class="action-buttons">
              <a-button size="small" :disabled="currentStep === 0" @click="prevStep">上一步</a-button>
              <a-button type="primary" size="small" @click="nextStep">
                {{ isLastStep ? '完成' : '下一步' }}
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useFinanceStore } from '@/stores/finance';

type Placement = 'top' | 'right' | 'bottom' | 'left' | 'center';
interface Step {
  title: string;
  description: string;
  selector: string;
  placement?: Placement;
}

// 引导版本号：改动较大时可以更新 key 让老用户也重新看到一次
const STORAGE_KEY = 'futureMoney.onboarding.v3';

const steps: Step[] = [
  {
    title: '添加现金流事件',
    description:
      '点击右下角的 "+" 添加工资、房贷、信用卡还款等固定收支事件，支持月度、季度、半年、年度和一次性频率。这是时间线预测的基础。',
    selector: '#floating-add-button',
    placement: 'left',
  },
  {
    title: '完成首次对账',
    description: '添加事件后，点击顶部横幅的「立即对账」按钮，输入当前真实余额。对账会冻结历史数据，确保预测从真实数据出发。',
    selector: '#reconciliation-banner',
    placement: 'bottom',
  },
  {
    title: '设定预警线',
    description: '在右上角输入最低安全余额，图表会标出预警线，当预测余额跌破时会高亮提醒你提前做好准备。',
    selector: '#threshold-input',
    placement: 'right',
  },
  {
    title: '查看关键指标',
    description:
      '这里汇总期末余额、累计收支和预警天数，帮你快速评估账户健康度。还可以尝试「对账历史」和「多账户视图」等功能。',
    selector: '#stats-panel',
    placement: 'top',
  },
];

const store = useFinanceStore();
const visible = ref(false);
const currentStep = ref(0);
const highlightRect = ref<DOMRect | null>(null);

const currentStepData = computed(() => steps[currentStep.value]);
const isLastStep = computed(() => currentStep.value >= steps.length - 1);
const highlightVisible = computed(() => !!highlightRect.value);

// 返回视口相对坐标（因为 overlay 是 position: fixed）
const getViewportRect = (element: Element | null): DOMRect | null => {
  if (!element) return null;
  return element.getBoundingClientRect();
};

const updateHighlight = async (ensureVisible = false) => {
  await nextTick();
  const selector = currentStepData.value?.selector;
  if (!selector || typeof window === 'undefined') {
    highlightRect.value = null;
    return;
  }
  const element = document.querySelector(selector);
  if (element) {
    if (ensureVisible) {
      // 根据元素位置决定滚动策略
      const rect = element.getBoundingClientRect();
      const isNearBottom = rect.bottom > window.innerHeight - 100;

      if (isNearBottom) {
        // 底部元素：滚动到底部让元素和上方的卡片都能显示
        element.scrollIntoView({ behavior: 'instant', block: 'end', inline: 'nearest' });
      } else {
        // 其他元素：居中显示
        element.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
      }
    }
    // 滚动完成后再计算位置（使用 instant 确保同步完成）
    const rect = getViewportRect(element);
    highlightRect.value = rect;
  } else {
    highlightRect.value = null;
  }
};

let raf = 0;
const scheduleUpdate = () => {
  if (!visible.value) return;
  if (raf) cancelAnimationFrame(raf);
  raf = requestAnimationFrame(() => {
    updateHighlight(false);
    raf = 0;
  });
};

onMounted(() => {
  if (typeof window === 'undefined') return;
  const dismissed = window.localStorage.getItem(STORAGE_KEY);
  // 仅在当前账户还没有任何事件时展示引导，避免打扰已经在使用的用户
  const currentId = store.currentAccount.id;
  const hasEvents = store.events.some((e) => e.accountId === currentId);

  if (!dismissed && !hasEvents) {
    setTimeout(() => {
      visible.value = true;
      updateHighlight(true);
    }, 500);
  }
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('scroll', scheduleUpdate, true);
});

onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf);
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', scheduleUpdate);
    window.removeEventListener('scroll', scheduleUpdate, true);
  }
});

watch([visible, currentStep], ([visibleVal]) => {
  if (visibleVal) {
    updateHighlight(true);
  }
});

const padding = 12;
const highlightStyle = computed(() => {
  if (!highlightRect.value) return {};
  return {
    top: `${highlightRect.value.top - padding}px`,
    left: `${highlightRect.value.left - padding}px`,
    width: `${highlightRect.value.width + padding * 2}px`,
    height: `${highlightRect.value.height + padding * 2}px`,
  };
});

const cardStyle = computed(() => {
  const step = currentStepData.value;
  const rect = highlightRect.value;
  if (!step || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  const gutter = 16;
  const cardWidth = 320;
  const cardHeight = 200; // 预估卡片高度
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // 所有坐标都是视口相对的（overlay 是 position: fixed）
  const canPlaceRight = rect.right + gutter + cardWidth <= viewportWidth - 16;
  const canPlaceLeft = rect.left - gutter - cardWidth >= 16;
  const canPlaceBottom = rect.bottom + gutter + cardHeight <= viewportHeight - 16;
  const canPlaceTop = rect.top - gutter - cardHeight >= 16;

  // 根据首选位置和边界情况确定最终位置
  let placement = step.placement || 'bottom';

  // 如果首选位置放不下，尝试翻转或找其他位置
  if (placement === 'bottom' && !canPlaceBottom) {
    if (canPlaceTop) placement = 'top';
    else if (canPlaceRight) placement = 'right';
    else if (canPlaceLeft) placement = 'left';
  } else if (placement === 'top' && !canPlaceTop) {
    if (canPlaceBottom) placement = 'bottom';
    else if (canPlaceRight) placement = 'right';
    else if (canPlaceLeft) placement = 'left';
  } else if (placement === 'right' && !canPlaceRight) {
    if (canPlaceLeft) placement = 'left';
    else if (canPlaceBottom) placement = 'bottom';
    else if (canPlaceTop) placement = 'top';
  } else if (placement === 'left' && !canPlaceLeft) {
    if (canPlaceRight) placement = 'right';
    else if (canPlaceBottom) placement = 'bottom';
    else if (canPlaceTop) placement = 'top';
  }

  let top = rect.top;
  let left = rect.left;

  switch (placement) {
    case 'right':
      left = rect.right + gutter;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      break;
    case 'left':
      left = rect.left - gutter - cardWidth;
      top = rect.top + rect.height / 2 - cardHeight / 2;
      break;
    case 'bottom':
      top = rect.bottom + gutter;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      break;
    case 'top':
      top = rect.top - gutter - cardHeight;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      break;
    default:
      top = rect.bottom + gutter;
      left = rect.left + rect.width / 2 - cardWidth / 2;
  }

  // 最终边界限制（视口相对）
  const maxLeft = viewportWidth - cardWidth - 16;
  const minLeft = 16;
  left = Math.min(Math.max(left, minLeft), maxLeft);

  const maxTop = viewportHeight - cardHeight - 16;
  const minTop = 16;
  top = Math.min(Math.max(top, minTop), maxTop);

  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: 'translate(0, 0)',
  };
});

const persistDismiss = () => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, '1');
  }
};

const finishGuide = () => {
  visible.value = false;
  persistDismiss();
};

const nextStep = () => {
  if (isLastStep.value) {
    finishGuide();
  } else {
    currentStep.value += 1;
  }
};

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value -= 1;
  }
};

const skipGuide = () => {
  finishGuide();
};
</script>

<style scoped>
.guide-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

.guide-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(1px);
}

.guide-highlight {
  position: absolute;
  border-radius: 16px;
  box-shadow: 0 0 0 2000px rgba(15, 23, 42, 0.55);
  border: 2px solid rgba(255, 255, 255, 0.9);
  pointer-events: none;
  transition: all 0.25s ease;
}

.guide-card {
  position: absolute;
  width: 320px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
  pointer-events: auto;
  transition: all 0.25s ease;
}

.guide-card h3 {
  margin: 8px 0;
  font-size: 1.05rem;
  color: #0f172a;
}

.guide-description {
  margin: 0 0 16px;
  color: #475569;
  line-height: 1.5;
  font-size: 0.92rem;
}

.step-indicator {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.guide-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.guide-fade-enter-active,
.guide-fade-leave-active {
  transition: opacity 0.2s ease;
}

.guide-fade-enter-from,
.guide-fade-leave-to {
  opacity: 0;
}
</style>
