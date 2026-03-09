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
      :can-undo-import="!!rollbackSummary"
      :undo-summary="rollbackSummary ? `${rollbackSummary.mode === 'all' ? '恢复全部账户' : '导入当前账户'} · ${rollbackSummary.fileName ?? '未记录文件名'}` : undefined"
      @close="accountManageOpen = false"
      @import="handleManageImport"
      @export="handleManageExport"
      @undo-import="handleManageUndoImport"
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
import type { PersistedStateEnvelope } from '@/types';
import type { UserPreferences } from '@/types/account';
import { useFinanceStore } from '@/stores/finance';
import { formatLocalISODate } from '@/utils/date';
import { createStateRepository } from '@/utils/storage';
import {
  buildImportAccountDataDeltaSummary,
  buildImportAccountDiffSummary,
  buildImportAccountEventDiffSummary,
  buildImportDataDeltaSummary,
  buildImportDateRangeSummary,
  buildImportFreshnessSummary,
  buildImportRiskSummary,
  buildImportSanitizeDiscardSummary,
  buildImportSingleAccountEventDiffSummary,
  buildRollbackPreview,
  parseImportPreview,
} from '@/utils/import-preview';
import type { ImportExportMode } from '@/types/storage';

const PreferencesModal = defineAsyncComponent(() => import('@/components/common/PreferencesModal.vue'));
const ReconciliationHistory = defineAsyncComponent(() => import('@/components/reconciliation/ReconciliationHistory.vue'));
const ReconciliationModal = defineAsyncComponent(() => import('@/components/reconciliation/ReconciliationModal.vue'));
const AccountMultiSelectModal = defineAsyncComponent(() => import('@/components/account/AccountMultiSelectModal.vue'));
const CreateAccountModal = defineAsyncComponent(() => import('@/components/account/CreateAccountModal.vue'));
const AccountManageModal = defineAsyncComponent(() => import('@/components/account/AccountManageModal.vue'));

interface LatestReconciliationBrief {
  date: string;
  balance: number;
}

const store = useFinanceStore();
const previewStateRepository = createStateRepository();
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

const getScopeLabel = (scope: 'current' | 'all' | 'legacy-unknown') => {
  if (scope === 'current') return '当前账户备份';
  if (scope === 'all') return '全部账户备份';
  return '旧版/未标记备份';
};

const rollbackSummary = computed(() => {
  if (!store.rollbackSnapshot) return null;
  return buildRollbackPreview(store.rollbackSnapshot);
});

const validateImportMode = (mode: ImportExportMode, content: string) => {
  const summary = buildImportPreviewState(content).summary;

  if (mode === 'current' && summary.scope === 'all') {
    throw new Error('你选择的是“恢复当前账户”，但文件看起来是“全部账户备份”。请改用“恢复全部账户”，避免误把整库备份塞进单账户。');
  }

  if (mode === 'all' && summary.scope === 'current') {
    throw new Error('你选择的是“恢复全部账户”，但文件看起来只是“当前账户备份”。为避免误清空其它账户，请改用“导入当前账户”。');
  }

  return summary;
};

const buildImportPreviewState = (content: string) => {
  const parsedPreview = parseImportPreview(content);
  const incomingState = previewStateRepository.importState(content);
  const rawEnvelope = JSON.parse(content) as PersistedStateEnvelope;
  const summary = {
    ...parsedPreview,
    stateVersion: incomingState.version || parsedPreview.stateVersion,
    accountsCount: incomingState.accounts.length,
    eventsCount: incomingState.events.length,
    reconciliationsCount: incomingState.reconciliations.length,
    ledgerEntriesCount: incomingState.ledgerEntries.length,
    eventOverridesCount: incomingState.eventOverrides.length,
    accountNames: incomingState.accounts
      .map((account) => account?.name?.trim())
      .filter((name): name is string => !!name),
  };
  const rawState = rawEnvelope?.state && typeof rawEnvelope.state === 'object'
    ? rawEnvelope.state
    : undefined;
  const sanitizeDiscards = buildImportSanitizeDiscardSummary(rawState, incomingState);

  return { incomingState, summary, sanitizeDiscards };
};

const currentImportPreviewState = () => ({
  accounts: store.accounts,
  events: store.events,
  reconciliations: store.reconciliations,
  ledgerEntries: store.ledgerEntries,
  eventOverrides: store.eventOverrides,
});

const confirmImportAll = (content: string, fileName: string) => {
  validateImportMode('all', content);
  const { incomingState, summary: backupSummary, sanitizeDiscards } = buildImportPreviewState(content);
  const currentState = currentImportPreviewState();
  const risk = buildImportRiskSummary(backupSummary, currentState);
  const accountDiff = buildImportAccountDiffSummary(backupSummary, store.accounts);
  const dataDelta = buildImportDataDeltaSummary(backupSummary, currentState);
  const accountDataDelta = buildImportAccountDataDeltaSummary(incomingState, currentState);
  const accountEventDiff = buildImportAccountEventDiffSummary(incomingState, currentState);
  const dateRange = buildImportDateRangeSummary(incomingState, currentState);
  const freshness = buildImportFreshnessSummary(incomingState, currentState);
  let inputValue = '';
  const confirmText = '恢复全部账户';
  const backupTime = backupSummary.timestamp
    ? new Date(backupSummary.timestamp).toLocaleString('zh-CN', { hour12: false })
    : '未知';
  const accountNames = backupSummary.accountNames.length ? backupSummary.accountNames.join('、') : '未识别账户名';
  const riskColor = risk.level === 'high' ? '#b91c1c' : '#b45309';
  const riskBackground = risk.level === 'high' ? '#fef2f2' : '#fff7ed';
  const riskBorder = risk.level === 'high' ? '#fecaca' : '#fdba74';
  const accountDiffRows = [
    accountDiff.addedNames.length ? `恢复后会新增：${accountDiff.addedNames.join('、')}` : null,
    accountDiff.removedNames.length ? `恢复后会移除：${accountDiff.removedNames.join('、')}` : null,
    accountDiff.keptNames.length ? `两边都存在：${accountDiff.keptNames.join('、')}` : null,
  ].filter((row): row is string => !!row);
  const dataDeltaRows = dataDelta
    .filter((item) => item.delta !== 0)
    .map((item) => {
      const deltaText = item.delta > 0 ? `+${item.delta}` : `${item.delta}`;
      const direction = item.delta > 0 ? '增加' : '减少';
      return `${item.label}：当前 ${item.currentCount} → 备份 ${item.incomingCount}（${direction} ${deltaText}）`;
    });
  const accountDataDeltaRows = accountDataDelta
    .map((item) => {
      const parts = [
        item.eventsDelta !== 0 ? `事件 ${item.eventsDelta > 0 ? '+' : ''}${item.eventsDelta}` : null,
        item.reconciliationsDelta !== 0 ? `对账 ${item.reconciliationsDelta > 0 ? '+' : ''}${item.reconciliationsDelta}` : null,
        item.ledgerEntriesDelta !== 0 ? `账本 ${item.ledgerEntriesDelta > 0 ? '+' : ''}${item.ledgerEntriesDelta}` : null,
        item.eventOverridesDelta !== 0 ? `覆盖 ${item.eventOverridesDelta > 0 ? '+' : ''}${item.eventOverridesDelta}` : null,
      ].filter((part): part is string => !!part);
      return `${item.accountName}：${parts.join('，')}`;
    });
  const accountEventDiffRows = accountEventDiff.map((item) => {
    const parts = [
      item.addedEventNames.length ? `新增事件：${item.addedEventNames.join('、')}` : null,
      item.removedEventNames.length ? `移除事件：${item.removedEventNames.join('、')}` : null,
    ].filter((part): part is string => !!part);
    return `${item.accountName}：${parts.join('；')}`;
  });
  const dateRangeRows = [
    `当前本地日期覆盖：${dateRange.currentRangeLabel}`,
    `备份文件日期覆盖：${dateRange.incomingRangeLabel}`,
  ];
  const sanitizeDiscardRows = sanitizeDiscards.map((item) => (
    `${item.label}：原始 ${item.rawCount} → sanitize 后 ${item.sanitizedCount}（过滤 ${item.discardedCount}）` + (item.reason ? `；${item.reason}` : '')
  ));

  Modal.confirm({
    title: '恢复全部账户并覆盖当前本地数据？',
    width: 560,
    content: h('div', [
      h('div', { style: `background: ${riskBackground}; border: 1px solid ${riskBorder}; border-radius: 10px; padding: 12px; margin-bottom: 12px;` }, [
        h('p', { style: `color: ${riskColor}; margin-bottom: 8px; font-weight: 700;` }, risk.title),
        h('p', { style: 'margin-bottom: 6px; line-height: 1.7;' }, risk.consequence),
        h('p', { style: 'margin: 0; line-height: 1.7; color: #475569;' }, risk.replacementScope),
      ]),
      h('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
        h('div', `备份文件：${fileName}`),
        h('div', `文件类型：${getScopeLabel(backupSummary.scope)}`),
        h('div', `备份时间：${backupTime}`),
        h('div', `备份内账户：${backupSummary.accountsCount}（${accountNames}）`),
        h('div', `备份内事件 / 对账 / 账本：${backupSummary.eventsCount} / ${backupSummary.reconciliationsCount} / ${backupSummary.ledgerEntriesCount}`),
        h('div', `备份内覆盖记录：${backupSummary.eventOverridesCount}`),
        h('div', `备份版本：${backupSummary.stateVersion}`),
      ]),
      accountDiffRows.length
        ? h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '账户差异速览'),
          ...accountDiffRows.map((row) => h('div', row)),
        ])
        : null,
      dataDeltaRows.length
        ? h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '数据规模变化'),
          ...dataDeltaRows.map((row) => h('div', row)),
        ])
        : null,
      accountDataDeltaRows.length
        ? h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '按账户的数据变化'),
          ...accountDataDeltaRows.map((row) => h('div', row)),
        ])
        : null,
      accountEventDiffRows.length
        ? h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '按账户的事件规则变化'),
          ...accountEventDiffRows.map((row) => h('div', row)),
        ])
        : null,
      sanitizeDiscardRows.length
        ? h('div', { style: 'background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7; color: #9a3412;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px;' }, 'sanitize 过滤统计'),
          ...sanitizeDiscardRows.map((row) => h('div', row)),
        ])
        : null,
      freshness
        ? h('div', {
          style: `background: ${freshness.level === 'warning' ? '#fff7ed' : '#eff6ff'}; border: 1px solid ${freshness.level === 'warning' ? '#fdba74' : '#bfdbfe'}; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;`,
        }, [
          h('div', {
            style: `font-weight: 600; margin-bottom: 6px; color: ${freshness.level === 'warning' ? '#9a3412' : '#1d4ed8'};`,
          }, freshness.title),
          h('div', { style: 'margin-bottom: 6px;' }, freshness.detail),
          h('div', `当前本地最新日期：${freshness.currentLatestDate}`),
          h('div', `备份文件最新日期：${freshness.incomingLatestDate}`),
        ])
        : null,
      h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
        h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '日期覆盖范围'),
        ...dateRangeRows.map((row) => h('div', row)),
      ]),
      h('p', { style: 'margin-bottom: 8px;' }, `请输入“${confirmText}”以继续：`),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: `请输入：${confirmText}`,
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '确认恢复',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() !== confirmText) {
        message.error('输入的文字不正确，操作已取消');
        return Promise.reject();
      }
      store.importState(content, 'all', fileName);
      message.success('已恢复全部账户数据，可在账户管理中撤销上次恢复');
    },
  });
};

const confirmImportCurrent = (content: string, fileName: string) => {
  validateImportMode('current', content);
  const { incomingState, summary, sanitizeDiscards } = buildImportPreviewState(content);
  const targetAccount = store.currentAccount;
  const sourceAccountName = summary.accountNames[0] ?? '未识别账户';
  const backupTime = summary.timestamp
    ? new Date(summary.timestamp).toLocaleString('zh-CN', { hour12: false })
    : '未知';
  const incomingEvents = incomingState.events
    .filter((event) => event.accountId === incomingState.account.id);
  const currentEvents = store.events
    .filter((event) => event.accountId === targetAccount.id);
  const eventDiff = buildImportSingleAccountEventDiffSummary(incomingEvents, currentEvents);
  const eventDiffRows = [
    eventDiff.addedEventNames.length ? `将新增：${eventDiff.addedEventNames.join('、')}` : null,
    eventDiff.removedEventNames.length ? `将移除：${eventDiff.removedEventNames.join('、')}` : null,
    eventDiff.keptEventNames.length ? `保持存在：${eventDiff.keptEventNames.join('、')}` : null,
  ].filter((row): row is string => !!row);
  const sanitizeDiscardRows = sanitizeDiscards.map((item) => (
    `${item.label}：原始 ${item.rawCount} → sanitize 后 ${item.sanitizedCount}（过滤 ${item.discardedCount}）` + (item.reason ? `；${item.reason}` : '')
  ));
  let inputValue = '';
  const confirmText = '导入当前账户';

  Modal.confirm({
    title: `导入到当前账户「${targetAccount.name}」？`,
    width: 540,
    content: h('div', [
      h('div', { style: 'background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 12px; margin-bottom: 12px;' }, [
        h('p', { style: 'color: #1d4ed8; margin-bottom: 8px; font-weight: 700;' }, '单账户导入：将只覆盖当前选中账户的数据'),
        h('p', { style: 'margin-bottom: 6px; line-height: 1.7;' }, `导入后会替换当前账户「${targetAccount.name}」的事件、对账、账本记录与覆盖记录，但不会动其他账户。`),
        h('p', { style: 'margin: 0; line-height: 1.7; color: #475569;' }, '系统会按 sanitize 后的结果导入，坏字段或断裂引用会在导入前被过滤。'),
      ]),
      h('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
        h('div', `备份文件：${fileName}`),
        h('div', `文件类型：${getScopeLabel(summary.scope)}`),
        h('div', `备份时间：${backupTime}`),
        h('div', `导入来源账户：${sourceAccountName}`),
        h('div', `将覆盖当前账户：${targetAccount.name}`),
        h('div', `导入后事件 / 对账 / 账本：${summary.eventsCount} / ${summary.reconciliationsCount} / ${summary.ledgerEntriesCount}`),
        h('div', `导入后覆盖记录：${summary.eventOverridesCount}`),
        h('div', `备份版本：${summary.stateVersion}`),
      ]),
      eventDiffRows.length
        ? h('div', { style: 'background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px; color: #0f172a;' }, '当前账户事件规则 diff'),
          ...eventDiffRows.map((row) => h('div', row)),
        ])
        : h('div', { style: 'background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7; color: #9a3412;' }, '这份单账户备份里没有可导入的事件；确认后会把当前账户替换为空事件状态。'),
      sanitizeDiscardRows.length
        ? h('div', { style: 'background: #fff7ed; border: 1px dashed #fdba74; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7; color: #9a3412;' }, [
          h('div', { style: 'font-weight: 600; margin-bottom: 6px;' }, 'sanitize 过滤统计'),
          ...sanitizeDiscardRows.map((row) => h('div', row)),
        ])
        : null,
      h('p', { style: 'margin-bottom: 8px;' }, `请输入“${confirmText}”以继续：`),
      h('input', {
        type: 'text',
        class: 'ant-input',
        placeholder: `请输入：${confirmText}`,
        style: 'width: 100%;',
        onInput: (e: Event) => {
          inputValue = (e.target as HTMLInputElement).value;
        },
      }),
    ]),
    okText: '确认导入',
    cancelText: '取消',
    onOk: () => {
      if (inputValue.trim() !== confirmText) {
        message.error('输入的文字不正确，操作已取消');
        return Promise.reject();
      }
      store.importState(content, 'current', fileName);
      message.success('已导入当前账户数据，可在账户管理中撤销上次导入');
    },
  });
};

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;
  const mode = fileActionMode.value;
  const fileName = file.name;
  const reader = new FileReader();
  const resetImportState = () => {
    target.value = '';
    fileActionMode.value = 'current';
  };

  reader.onload = () => {
    try {
      const content = String(reader.result);
      if (mode === 'all') {
        confirmImportAll(content, fileName);
      } else {
        confirmImportCurrent(content, fileName);
      }
    } catch (error) {
      console.error(error);
      message.error(error instanceof Error ? error.message : (mode === 'all' ? '恢复失败，请检查备份文件内容' : '导入失败，请检查文件内容'));
    } finally {
      resetImportState();
    }
  };

  reader.onerror = () => {
    message.error(mode === 'all' ? '文件读取失败，无法恢复全部账户' : '文件读取失败，无法导入当前账户');
    resetImportState();
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
  const targetAccount = store.currentAccount;
  const eventCount = store.events.filter((event) => event.accountId === targetAccount.id).length;
  const reconciliationCount = store.reconciliations.filter((item) => item.accountId === targetAccount.id).length;
  const ledgerEntryCount = store.ledgerEntries.filter((item) => item.accountId === targetAccount.id).length;
  const overrideCount = store.eventOverrides.filter((item) => item.accountId === targetAccount.id).length;

  Modal.confirm({
    title: `确定清空账户「${targetAccount.name}」的数据？`,
    width: 540,
    content: h('div', [
      h('div', { style: 'background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 12px; margin-bottom: 12px;' }, [
        h('p', { style: 'color: #b91c1c; margin-bottom: 8px; font-weight: 700;' }, '危险操作：会重置当前账户的本地业务数据'),
        h('p', { style: 'margin-bottom: 6px; line-height: 1.7;' }, '确认后会删除当前账户下的事件、对账、冻结区账本记录和事件覆盖，并把账户余额重置为 0。'),
        h('p', { style: 'margin: 0; line-height: 1.7; color: #7f1d1d;' }, '账户本身会保留，但需要重新做首次对账。这个操作不会影响其他账户。'),
      ]),
      h('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
        h('div', `目标账户：${targetAccount.name}`),
        h('div', `将删除事件：${eventCount}`),
        h('div', `将删除对账：${reconciliationCount}`),
        h('div', `将删除账本记录：${ledgerEntryCount}`),
        h('div', `将删除覆盖记录：${overrideCount}`),
        h('div', `清空后账户初始余额：0`),
      ]),
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

const handleManageUndoImport = () => {
  accountManageOpen.value = false;

  const summary = rollbackSummary.value;
  if (!summary) {
    message.info('没有可撤销的导入/恢复记录');
    return;
  }

  const backupTime = summary.timestamp
    ? new Date(summary.timestamp).toLocaleString('zh-CN', { hour12: false })
    : '未知';
  const accountNames = summary.accountNames.length ? summary.accountNames.join('、') : '未识别账户名';
  const targetLabel = summary.mode === 'all' ? '恢复前的整库状态' : '导入前的本地状态';

  Modal.confirm({
    title: '撤销上次导入/恢复？',
    width: 540,
    content: h('div', [
      h('p', { style: 'margin-bottom: 12px; color: #475569;' }, `将回退到${targetLabel}。这会覆盖当前浏览器里的最新改动。`),
      h('div', { style: 'background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 12px; font-size: 13px; line-height: 1.7;' }, [
        h('div', `回滚来源：${summary.fileName ?? '未记录文件名'}`),
        h('div', `回滚类型：${summary.mode === 'all' ? '恢复全部账户前快照' : '导入当前账户前快照'}`),
        h('div', `快照时间：${backupTime}`),
        h('div', `账户数：${summary.accountsCount}（${accountNames}）`),
        h('div', `事件 / 对账 / 账本：${summary.eventsCount} / ${summary.reconciliationsCount} / ${summary.ledgerEntriesCount}`),
      ]),
    ]),
    okText: '确认撤销',
    okButtonProps: { danger: true },
    cancelText: '取消',
    onOk: () => {
      const result = store.undoLastImport();
      if (result.success) {
        message.success('已撤销上次导入/恢复');
      } else {
        message.error(result.message ?? '撤销失败');
        return Promise.reject();
      }
    },
  });
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
