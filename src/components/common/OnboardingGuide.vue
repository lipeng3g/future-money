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

type Placement = 'top' | 'right' | 'bottom' | 'left' | 'center';
interface Step {
  title: string;
  description: string;
  selector: string;
  placement?: Placement;
}

const STORAGE_KEY = 'futureMoney.onboardingDismissed';

const steps: Step[] = [
  {
    title: '设置当前账户余额',
    description: '先输入你今天这个账户的当前余额（可用资金），这是未来所有预测的起点。',
    selector: '#balance-input',
    placement: 'right',
  },
  {
    title: '设定预警线',
    description: '输入最低安全余额，系统会在预测到风险时提醒你。',
    selector: '#threshold-input',
    placement: 'right',
  },
  {
    title: '添加你的第一条事件',
    description: '点击右下角的 “+” 可以快速添加工资、房贷等现金流事件。',
    selector: '#floating-add-button',
    placement: 'left',
  },
  {
    title: '查看关键指标',
    description: '这里汇总期末余额、累计收支和预警日期，方便快速评估状况。',
    selector: '#stats-panel',
    placement: 'bottom',
  },
];

const visible = ref(false);
const currentStep = ref(0);
const highlightRect = ref<DOMRect | null>(null);

const currentStepData = computed(() => steps[currentStep.value]);
const isLastStep = computed(() => currentStep.value >= steps.length - 1);
const highlightVisible = computed(() => !!highlightRect.value);

const getAbsoluteRect = (element: Element | null): DOMRect | null => {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return new DOMRect(rect.left + window.scrollX, rect.top + window.scrollY, rect.width, rect.height);
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
    const rect = getAbsoluteRect(element);
    highlightRect.value = rect;
    if (ensureVisible) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
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
  if (!dismissed) {
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
  let top = rect.top;
  let left = rect.left;

  switch (step.placement) {
    case 'right':
      left = rect.right + gutter;
      top = rect.top;
      break;
    case 'left':
      left = rect.left - gutter - 320;
      top = rect.top;
      break;
    case 'bottom':
      top = rect.bottom + gutter;
      left = rect.left;
      break;
    case 'top':
      top = rect.top - gutter - 160;
      left = rect.left;
      break;
    default:
      top = rect.top + rect.height + gutter;
      left = rect.left;
  }

  const maxLeft = window.scrollX + window.innerWidth - 340;
  const minLeft = window.scrollX + 16;
  left = Math.min(Math.max(left, minLeft), maxLeft);

  const maxTop = window.scrollY + window.innerHeight - 200;
  const minTop = window.scrollY + 16;
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
