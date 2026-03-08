<template>
  <header class="app-header" :class="{ 'app-header--multi': store.isMultiAccountView }">
    <!-- 左侧：品牌 + 账户/视图状态 -->
    <div class="header-left">
      <div class="title-block">
        <div class="title-row">
          <h1>FutureMoney</h1>
          <a
            class="github-link"
            href="https://github.com/lipeng3g/future-money"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="在 GitHub 查看 FutureMoney 源码"
          >
            <span class="github-icon" />
            <span class="github-text">GitHub 仓库</span>
          </a>
        </div>
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
        <div class="metric-card" @click="handleBalanceTap">
          <div class="metric-label">当前账户余额</div>
          <div class="metric-value" :class="{ 'not-reconciled': !store.latestReconciliation }">
            <template v-if="store.latestReconciliation">
              ¥{{ currentBalance.toLocaleString('zh-CN') }}
            </template>
            <template v-else>
              未对账
            </template>
          </div>
          <p class="metric-helper">
            <template v-if="store.latestReconciliation">
              最近对账：{{ store.latestReconciliation.date }}
            </template>
            <template v-else>
              请先完成首次对账
            </template>
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
        <div v-if="store.simulatedToday" class="simulated-date-indicator">
          模拟日期: {{ store.todayStr }}
        </div>
        <a-date-picker
          v-if="showSimDatePicker || store.simulatedToday"
          :value="simulatedDateValue"
          size="small"
          placeholder="模拟日期"
          :allow-clear="true"
          style="width: 140px"
          @change="handleSimulatedDateChange"
        />
        <a-button
          size="small"
          :type="store.needsReconciliation ? 'primary' : 'default'"
          :disabled="store.isReadOnly"
          @click="openReconcileModal"
        >
          {{ store.needsReconciliation ? '对账' : '对账' }}
        </a-button>
        <a-button size="small" @click="openReconciliationHistory">对账历史</a-button>
        <a-button size="small" @click="openPreferences">偏好设置</a-button>
        <a-button size="small" :disabled="store.isReadOnly" @click="accountManageOpen = true">账户管理</a-button>
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
      v-if="preferencesOpen"
      :open="preferencesOpen"
      :preferences="store.preferences"
      @save="savePreferences"
      @cancel="preferencesOpen = false"
    />
    <ReconciliationHistory
      v-if="reconciliationHistoryOpen"
      :open="reconciliationHistoryOpen"
      @close="reconciliationHistoryOpen = false"
    />
    <ReconciliationModal
      v-if="reconcileOpen"
      :open="reconcileOpen"
      @cancel="reconcileOpen = false"
      @done="handleReconcileDone"
    />
    <CreateAccountModal
      v-if="createAccountOpen"
      :open="createAccountOpen"
      :default-warning-threshold="store.currentAccount.warningThreshold"
      @submit="handleCreateAccountSubmit"
      @cancel="createAccountOpen = false"
    />
    <AccountMultiSelectModal
      v-if="multiAccountOpen"
      :open="multiAccountOpen"
      :accounts="store.accounts"
      :initial-selected="store.selectedAccountIds"
      :latest-reconciliation-map="latestReconciliationMap"
      :today="store.todayStr"
      @confirm="handleMultiAccountConfirm"
      @cancel="multiAccountOpen = false"
    />
    <AccountManageModal
      v-if="accountManageOpen"
      :open="accountManageOpen"
      @close="accountManageOpen = false"
      @import="handleManageImport"
      @export="handleManageExport"
      @clear="handleManageClear"
      @delete="handleManageDelete"
    />
  </header>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, h } from 'vue';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Modal, message } from 'ant-design-vue';
import type { UserPreferences } from '@/types/account';
import { useFinanceStore } from '@/stores/finance';
import { formatLocalISODate } from '@/utils/date';

const PreferencesModal = defineAsyncComponent(() => import('@/components/common/PreferencesModal.vue'));
const ReconciliationHistory = defineAsyncComponent(() => import('@/components/reconciliation/ReconciliationHistory.vue'));
const ReconciliationModal = defineAsyncComponent(() => import('@/components/reconciliation/ReconciliationModal.vue'));
const AccountMultiSelectModal = defineAsyncComponent(() => import('@/components/account/AccountMultiSelectModal.vue'));
const CreateAccountModal = defineAsyncComponent(() => import('@/components/account/CreateAccountModal.vue'));
const AccountManageModal = defineAsyncComponent(() => import('@/components/account/AccountManageModal.vue'));

type ImportExportMode = 'current' | 'all';

interface LatestReconciliationBrief {
  date: string;
  balance: number;
}

const store = useFinanceStore();
const preferencesOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const fileActionMode = ref<ImportExportMode>('current');
const reconciliationHistoryOpen = ref(false);
const reconcileOpen = ref(false);
const multiAccountOpen = ref(false);
const createAccountOpen = ref(false);
const accountManageOpen = ref(false);

// 点击余额 10 次解锁模拟日期
const showSimDatePicker = ref(false);
const balanceTapCount = ref(0);
let balanceTapTimer: ReturnType<typeof setTimeout> | null = null;

const handleBalanceTap = () => {
  if (showSimDatePicker.value) return;
  balanceTapCount.value++;
  if (balanceTapTimer) clearTimeout(balanceTapTimer);
  balanceTapTimer = setTimeout(() => { balanceTapCount.value = 0; }, 3000);
  if (balanceTapCount.value >= 10) {
    showSimDatePicker.value = true;
    message.success('已解锁模拟日期');
  }
};

const simulatedDateValue = computed(() => {
  return store.simulatedToday ? dayjs(store.simulatedToday) : null;
});

const handleSimulatedDateChange = (date: Dayjs | null) => {
  store.setSimulatedToday(date ? date.format('YYYY-MM-DD') : null);
};

const accountOptions = computed(() =>
  store.accounts.map((acc) => ({
    label: acc.name,
    value: acc.id,
  })),
);

const currentBalance = computed(
  () => store.latestReconciliation?.balance ?? store.currentAccount.initialBalance,
);

const latestReconciliationMap = computed<Record<string, LatestReconciliationBrief | null>>(() => {
  const map: Record<string, LatestReconciliationBrief | null> = {};
  store.accounts.forEach((acc) => {
    map[acc.id] = null;
  });

  store.reconciliations.forEach((recon) => {
    const existing = map[recon.accountId];
    if (!existing || recon.date > existing.date) {
      map[recon.accountId] = {
        date: recon.date,
        balance: recon.balance,
      };
    }
  });

  return map;
});

const handleThresholdChange = (value: number | null) => {
  if (typeof value === 'number' && !store.isReadOnly) {
    store.updateAccount({ warningThreshold: value });
  }
};

const openReconcileModal = () => {
  reconcileOpen.value = true;
};

const handleReconcileDone = () => {
  reconcileOpen.value = false;
  message.success('对账完成');
};

const triggerImport = (mode: ImportExportMode) => {
  fileActionMode.value = mode;
  fileInput.value?.click();
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const mode = fileActionMode.value;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      store.importState(String(reader.result), mode);
      message.success(mode === 'all' ? '已恢复全部账户数据' : '已导入当前账户数据');
    } catch (error) {
      console.error(error);
      message.error(mode === 'all' ? '恢复失败，请检查备份文件内容' : '导入失败，请检查文件内容');
    } finally {
      target.value = '';
      fileActionMode.value = 'current';
    }
  };
  reader.readAsText(file, 'utf-8');
};

const exportData = (mode: ImportExportMode) => {
  const content = store.exportState(mode);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const accountSlug = store.currentAccount.name.trim().replace(/\s+/g, '-');
  link.href = url;
  link.download = mode === 'all'
    ? `future-money-all-accounts-${formatLocalISODate()}.json`
    : `future-money-${accountSlug || 'account'}-${formatLocalISODate()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  message.success(mode === 'all' ? '已导出全部账户数据' : '已导出当前账户数据');
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

const handleManageImport = (mode: ImportExportMode) => {
  accountManageOpen.value = false;
  triggerImport(mode);
};

const handleManageExport = (mode: ImportExportMode) => {
  accountManageOpen.value = false;
  exportData(mode);
};

const handleManageClear = () => {
  accountManageOpen.value = false;
  confirmReset();
};

const handleManageDelete = () => {
  accountManageOpen.value = false;
  confirmDeleteAccount();
};

const confirmDeleteAccount = () => {
  let inputValue = '';
  const name = store.currentAccount.name;

  Modal.confirm({
    title: `确定删除账户「${name}」？`,
    content: h('div', [
      h('p', { style: 'color: #ef4444; margin-bottom: 12px;' }, '该账户及其所有数据将被永久删除，不可恢复！'),
      h('p', { style: 'margin-bottom: 8px;' }, `请输入"${name}"以确认：`),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: `请输入：${name}`,
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '删除账户',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() === name) {
        const result = store.deleteAccount(store.currentAccount.id);
        if (result.success) {
          message.success('账户已删除');
        } else {
          message.error(result.message ?? '删除失败');
        }
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

const openReconciliationHistory = () => {
  reconciliationHistoryOpen.value = true;
};

const openMultiAccountModal = () => {
  multiAccountOpen.value = true;
};

const handleMultiAccountConfirm = (ids: string[]) => {
  if (ids.length < 2) {
    message.warning('请选择至少两个账户进入多账户视图');
    return;
  }

  const accountMap = new Map(store.accounts.map((acc) => [acc.id, acc]));
  const selectedAccounts = ids
    .map((id) => accountMap.get(id))
    .filter((acc): acc is NonNullable<typeof acc> => !!acc);

  if (selectedAccounts.length < 2) {
    message.warning('请选择至少两个有效账户进入多账户视图');
    return;
  }

  const missingReconciliation = selectedAccounts.filter(
    (acc) => !latestReconciliationMap.value[acc.id],
  );
  if (missingReconciliation.length) {
    message.warning(`以下账户未完成首次对账：${missingReconciliation.map((acc) => acc.name).join('、')}`);
    return;
  }

  const reconciliationDates = new Set(
    selectedAccounts
      .map((acc) => latestReconciliationMap.value[acc.id]?.date)
      .filter((date): date is string => !!date),
  );

  if (reconciliationDates.size > 1) {
    const detail = selectedAccounts
      .map((acc) => `${acc.name}(${latestReconciliationMap.value[acc.id]?.date ?? '未对账'})`)
      .join('，');
    message.warning(`仅支持最新对账日一致的账户：${detail}`);
    return;
  }

  store.viewMode = 'multi';
  store.multiAccountSelection = selectedAccounts.map((acc) => acc.id);
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

const handleCreateAccountSubmit = (payload: { name: string; typeLabel?: string; warningThreshold?: number }) => {
  store.addAccount(payload);
  createAccountOpen.value = false;
  message.success('账户已创建，请进行首次对账');
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
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  background: var(--fm-surface-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 20px -2px rgba(15, 23, 42, 0.05);
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

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-block h1 {
  margin: 0 0 2px;
  font-size: 1.4rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.github-link {
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 500;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 0.15s, border-color 0.15s;
}

.github-icon {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #334155;
}

.github-link:hover {
  color: #4f46e5;
  border-color: #c7d2fe;
}

.github-text {
  white-space: nowrap;
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

.metric-value {
  font-family: 'SF Pro Rounded', ui-monospace, sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
}

.metric-value.not-reconciled {
  font-size: 1.1rem;
  color: #9ca3af;
  font-weight: 500;
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

.simulated-date-indicator {
  padding: 2px 8px;
  border-radius: 4px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}
</style>
