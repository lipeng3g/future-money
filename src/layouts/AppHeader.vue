<template>
  <header class="app-header" :class="{ 'app-header--multi': store.isMultiAccountView }">
    <!-- 左侧：品牌 + 账户/视图状态 -->
    <div class="header-left">
      <div class="title-block">
        <h1>FutureMoney</h1>
        <p class="subtitle">把所有固定收支放在一条时间线上</p>
      </div>

      <!-- 单账户视图下：账户选择 + 历史提示 -->
      <div v-if="!store.isMultiAccountView" class="single-account-meta">
        <div class="account-row">
          <a-select
            v-model:value="store.currentAccountId"
            :options="accountOptions"
            :disabled="store.isMultiAccountView"
            size="small"
            style="min-width: 180px"
          />
          <a-button size="small" type="primary" :disabled="store.isReadOnly" @click="openCreateAccount">
            新建账户
          </a-button>
          <a-button size="small" @click="openMultiAccountModal">多账户视图</a-button>
        </div>
        <p v-if="store.isHistoricalView && lastSnapshotDate" class="history-banner">
          当前正在查看历史快照 {{ lastSnapshotDate }}，所有账户与事件编辑已锁定。
          <a-button type="link" size="small" @click="store.setViewSnapshot(null)">返回最新</a-button>
        </p>
      </div>

      <!-- 多账户视图下：只展示视图状态 + 返回 -->
      <div v-else class="multi-account-meta">
        <span class="multi-badge">多账户视图</span>
        <span class="multi-text">
          正在查看多账户汇总视图（{{ selectedAccountNames }}），所有编辑已锁定。
        </span>
        <a-button type="link" size="small" @click="exitMultiAccountView">返回单账户</a-button>
      </div>
    </div>

    <!-- 右侧：单账户视图的余额 / 阈值 / 操作按钮 -->
    <div v-if="!store.isMultiAccountView" class="header-right">
      <div class="metric-row">
        <div class="metric-card">
          <div class="metric-label">当前账户余额</div>
          <div class="metric-input-row">
            <a-input-number
              id="balance-input"
              :value="currentBalance"
              :min="0"
              :step="100"
              addon-after="元"
              :disabled="store.isReadOnly"
              @change="handleQuickCalibrate"
            />
            <a-button size="small" type="link" :disabled="store.isReadOnly" @click="openCalibrateModal">
              校准
            </a-button>
          </div>
          <p class="metric-helper">
            最近校准：
            <span v-if="lastSnapshotDate">{{ lastSnapshotDate }}</span>
            <span v-else>尚未校准</span>
          </p>
        </div>
        <div class="metric-card">
          <div class="metric-label">预警阈值</div>
          <a-input-number
            id="threshold-input"
            :value="store.currentAccount.warningThreshold"
            :min="0"
            :step="100"
            addon-after="元"
            :disabled="store.isReadOnly"
            @change="handleThresholdChange"
          />
        </div>
      </div>
      <div class="actions-row">
        <a-button size="small" @click="openSnapshotHistory">快照历史</a-button>
        <a-button size="small" @click="openPreferences">偏好设置</a-button>
        <a-button size="small" :disabled="store.isReadOnly" @click="triggerImport">导入当前账户数据</a-button>
        <a-button size="small" :disabled="store.isReadOnly" @click="exportData">导出当前账户数据</a-button>
        <a-button size="small" danger ghost :disabled="store.isReadOnly" @click="confirmReset">清空当前账户</a-button>
      </div>
    </div>

    <!-- 右侧：多账户视图下，只展示汇总资产信息 -->
    <div v-else class="header-right header-right--multi">
      <div class="metric-card multi-summary-card">
        <div class="metric-label">多账户总资产</div>
        <p class="summary-text">
          当前总余额：
          <strong>¥{{ store.timeline.at(-1)?.balance?.toLocaleString('zh-CN') ?? '-' }}</strong>
        </p>
        <p class="metric-helper">
          预警阈值（汇总）：¥{{ store.warningThreshold.toLocaleString('zh-CN') }}
        </p>
      </div>
    </div>
    <input ref="fileInput" type="file" accept="application/json" class="file-input" @change="handleFileChange" />
    <PreferencesModal
      :open="preferencesOpen"
      :preferences="store.preferences"
      @save="savePreferences"
      @cancel="preferencesOpen = false"
    />
    <SnapshotHistory :open="snapshotHistoryOpen" @close="snapshotHistoryOpen = false" />
    <CreateAccountModal
      :open="createAccountOpen"
      :default-warning-threshold="store.currentAccount.warningThreshold"
      @submit="handleCreateAccountSubmit"
      @cancel="createAccountOpen = false"
    />
    <AccountMultiSelectModal
      :open="multiAccountOpen"
      :accounts="store.accounts"
      :initial-selected="store.selectedAccountIds"
      @confirm="handleMultiAccountConfirm"
      @cancel="multiAccountOpen = false"
    />
    <CalibrateBalanceModal
      :open="calibrateOpen"
      :default-date="todayIso()"
      :default-balance="currentBalance"
      @submit="handleCalibrateSubmit"
      @cancel="calibrateOpen = false"
    />
  </header>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { UserPreferences } from '@/types/account';
import { useFinanceStore } from '@/stores/finance';
import PreferencesModal from '@/components/common/PreferencesModal.vue';
import SnapshotHistory from '@/components/account/SnapshotHistory.vue';
import CalibrateBalanceModal from '@/components/common/CalibrateBalanceModal.vue';
import AccountMultiSelectModal from '@/components/account/AccountMultiSelectModal.vue';
import CreateAccountModal from '@/components/account/CreateAccountModal.vue';

const store = useFinanceStore();
const preferencesOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const calibrateOpen = ref(false);
const snapshotHistoryOpen = ref(false);
const multiAccountOpen = ref(false);
const createAccountOpen = ref(false);

const accountOptions = computed(() =>
  store.accounts.map((acc) => ({
    label: acc.name,
    value: acc.id,
  })),
);

const currentBalance = computed(
  () => store.activeSnapshot?.balance ?? store.currentAccount.initialBalance,
);

const lastSnapshotDate = computed(
  () => store.activeSnapshot?.date ?? '',
);

const todayIso = () => new Date().toISOString().split('T')[0];

const handleQuickCalibrate = (value: number | null) => {
  if (typeof value === 'number' && !store.isReadOnly) {
    store.addSnapshot(value, todayIso());
    message.success('已快速校准当前余额');
  }
};

const openCalibrateModal = () => {
  calibrateOpen.value = true;
};

const handleCalibrateSubmit = (payload: { date: string; balance: number; note?: string }) => {
  store.addSnapshot(payload.balance, payload.date, payload.note);
  calibrateOpen.value = false;
  message.success('余额已校准');
};

const handleThresholdChange = (value: number | null) => {
  if (typeof value === 'number' && !store.isReadOnly) {
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
      message.success('已导入当前账户数据');
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
    title: '确定清空当前账户数据？',
    content: h('div', [
      h('p', { style: 'color: #ef4444; margin-bottom: 12px;' }, '仅清空当前选中账户的所有事件和快照，此操作不可恢复！'),
      h('p', { style: 'margin-bottom: 8px;' }, '请输入"清空当前账户"以确认：'),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: '请输入：清空当前账户',
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '清空当前账户',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() === '清空当前账户') {
        store.clearCurrentAccount();
        message.success('当前账户数据已清空');
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

const openSnapshotHistory = () => {
  snapshotHistoryOpen.value = true;
};

const openMultiAccountModal = () => {
  multiAccountOpen.value = true;
};

const handleMultiAccountConfirm = (ids: string[]) => {
  if (ids.length < 2) {
    message.warning('请选择至少两个账户进入多账户视图');
    return;
  }
  store.viewMode = 'multi';
  store.multiAccountSelection = ids;
  multiAccountOpen.value = false;
};

const exitMultiAccountView = () => {
  store.viewMode = 'single';
};

const selectedAccountNames = computed(() => {
  const idSet = new Set(store.selectedAccountIds);
  const names = store.accounts.filter((acc) => idSet.has(acc.id)).map((acc) => acc.name);
  return names.join('、');
});

const openCreateAccount = () => {
  if (store.isReadOnly) return;
  createAccountOpen.value = true;
};

const handleCreateAccountSubmit = (payload: { name: string; typeLabel?: string; initialBalance?: number; warningThreshold?: number }) => {
  store.addAccount(payload);
  createAccountOpen.value = false;
  message.success('账户已创建');
};

const savePreferences = (prefs: UserPreferences) => {
  store.updateUserPreferences(prefs);
  preferencesOpen.value = false;
  message.success('偏好已保存');
};
</script>

<style scoped>
.app-header {
  padding: 16px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--fm-shadow-sm);
}

.app-header--multi {
  padding-bottom: 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.title-block h1 {
  margin: 0 0 2px;
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #4f46e5 0%, #0f172a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.03em;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
  font-weight: 400;
  white-space: nowrap;
}

.single-account-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-row {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-banner {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #f97316;
  display: flex;
  align-items: center;
  gap: 8px;
}

.multi-account-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: #f97316;
}

.multi-badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.06);
  color: #2563eb;
  font-size: 0.75rem;
}

.multi-text {
  white-space: nowrap;
}

.header-right {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.metric-row {
  display: flex;
  gap: 16px;
}

.metric-card {
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.metric-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-card :deep(.ant-input-number) {
  min-width: 160px;
}

.metric-helper {
  margin: 0;
  font-size: 0.75rem;
  color: #94a3b8;
}

.summary-text {
  margin: 0;
  font-size: 0.9rem;
  color: #111827;
}

.actions-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.header-right--multi {
  align-items: flex-end;
}

/* 头部内输入框 / 下拉的统一样式 */
.app-header :deep(.ant-input-number),
.app-header :deep(.ant-select-selector) {
  border-radius: 8px !important;
  border-color: var(--fm-border-subtle) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  background: rgba(255, 255, 255, 0.5) !important;
}

.app-header :deep(.ant-input-number-focused),
.app-header :deep(.ant-select-focused .ant-select-selector) {
  border-color: var(--fm-primary) !important;
  box-shadow: 0 0 0 2px var(--fm-primary-light) !important;
  background: #fff !important;
}

.file-input {
  display: none;
}
</style>
