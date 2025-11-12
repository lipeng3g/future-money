<template>
  <header class="app-header">
    <div class="branding">
      <div>
        <h1>FutureMoney</h1>
        <p class="subtitle">把所有固定收支放在一条时间线上</p>
      </div>
      <div class="control-stack">
        <label>当前可用现金</label>
        <a-input-number
          :value="store.account.initialBalance"
          :min="0"
          :step="100"
          addon-after="元"
          @change="handleBalanceChange"
        />
      </div>
      <div class="control-stack">
        <label>预警阈值</label>
        <a-input-number
          :value="store.account.warningThreshold"
          :min="0"
          :step="100"
          addon-after="元"
          @change="handleThresholdChange"
        />
      </div>
    </div>
    <div class="actions">
      <a-button @click="openPreferences">偏好设置</a-button>
      <a-button @click="triggerImport">导入数据</a-button>
      <a-button @click="exportData">导出数据</a-button>
      <a-button danger ghost @click="confirmReset">清空</a-button>
    </div>
    <input ref="fileInput" type="file" accept="application/json" class="file-input" @change="handleFileChange" />
    <PreferencesModal
      :open="preferencesOpen"
      :preferences="store.preferences"
      @save="savePreferences"
      @cancel="preferencesOpen = false"
    />
  </header>
</template>

<script setup lang="ts">
import { ref, h } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { UserPreferences } from '@/types/account';
import { useFinanceStore } from '@/stores/finance';
import PreferencesModal from '@/components/common/PreferencesModal.vue';

const store = useFinanceStore();
const preferencesOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const handleBalanceChange = (value: number | null) => {
  if (typeof value === 'number') {
    store.updateAccount({ initialBalance: value });
  }
};

const handleThresholdChange = (value: number | null) => {
  if (typeof value === 'number') {
    store.updateAccount({ warningThreshold: value });
  }
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      store.importState(String(reader.result));
      message.success('导入成功');
    } catch (error) {
      console.error(error);
      message.error('导入失败，请检查文件内容');
    } finally {
      target.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
};

const exportData = () => {
  const content = store.exportState();
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `future-money-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  message.success('导出成功');
};

const confirmReset = () => {
  let inputValue = '';

  Modal.confirm({
    title: '确定清空所有数据？',
    content: h('div', [
      h('p', { style: 'color: #ef4444; margin-bottom: 12px;' }, '此操作不可恢复！'),
      h('p', { style: 'margin-bottom: 8px;' }, '请输入"清空数据"以确认：'),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: '请输入：清空数据',
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '清空',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() === '清空数据') {
        store.resetState();
        message.success('数据已清空');
      } else {
        message.error('输入的文字不正确，操作已取消');
        return Promise.reject();
      }
    },
  });
};

const openPreferences = () => {
  preferencesOpen.value = true;
};

const savePreferences = (prefs: UserPreferences) => {
  store.updateUserPreferences(prefs);
  preferencesOpen.value = false;
  message.success('偏好已保存');
};
</script>

<style scoped>
.app-header {
  padding: 24px 32px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(to bottom, #ffffff 0%, #fafbfc 100%);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.branding {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
  align-items: flex-end;
}

.branding h1 {
  margin: 0 0 2px;
  font-size: 1.75rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 400;
}

.control-stack {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-stack label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control-stack :deep(.ant-input-number) {
  min-width: 160px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.file-input {
  display: none;
}
</style>
