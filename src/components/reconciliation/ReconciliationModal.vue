<template>
  <a-modal
    :open="open"
    :title="lastRecon ? '账户对账' : '首次对账 — 设定初始余额'"
    width="720px"
    :footer="null"
    @cancel="$emit('cancel')"
    destroy-on-close
  >
    <!-- 步骤指示器 -->
    <a-steps :current="step" size="small" style="margin-bottom: 24px">
      <a-step title="对账日期" />
      <a-step title="审核明细" />
      <a-step title="确认余额" />
      <a-step title="提交" />
    </a-steps>

    <!-- 步骤1: 选择对账日期 -->
    <div v-if="step === 0" class="step-content">
      <a-form layout="vertical">
        <a-form-item label="对账日期">
          <a-date-picker
            v-model:value="reconcileDate"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </a-form-item>
        <p class="step-hint">
          <template v-if="lastRecon">上次对账日期: {{ lastRecon.date }}，余额: ¥{{ lastRecon.balance.toLocaleString('zh-CN') }}</template>
          <template v-else>这是您的首次对账，选择日期后将设定账户的初始余额。</template>
        </p>
      </a-form>
      <div class="step-actions">
        <a-button @click="$emit('cancel')">取消</a-button>
        <a-button type="primary" :disabled="!reconcileDate" @click="goToStep(1)">下一步</a-button>
      </div>
    </div>

    <!-- 步骤2: 审核事件明细 -->
    <div v-if="step === 1" class="step-content">
      <p class="step-hint">以下是系统根据规则自动生成的事件，请确认、删除或修改：</p>
      <div class="entries-list">
        <div v-if="pendingEntries.length === 0" class="empty-entries">
          该期间内无规则事件。您可以手动添加条目。
        </div>
        <div
          v-for="(entry, index) in pendingEntries"
          :key="index"
          class="entry-row"
          :class="{ removed: entry._removed }"
        >
          <span class="entry-date">{{ entry.date }}</span>
          <span class="entry-name">{{ entry.name }}</span>
          <span class="entry-amount" :class="entry.category">
            {{ entry.category === 'income' ? '+' : '-' }}¥
            <template v-if="!entry._editing">{{ entry.amount.toLocaleString('zh-CN') }}</template>
            <a-input-number
              v-else
              v-model:value="entry.amount"
              :min="0"
              size="small"
              style="width: 120px"
            />
          </span>
          <span class="entry-actions">
            <a-button v-if="!entry._removed && !entry._editing" size="small" type="link" @click="entry._editing = true">改金额</a-button>
            <a-button v-if="entry._editing" size="small" type="link" @click="entry._editing = false">确定</a-button>
            <a-button v-if="!entry._removed" size="small" type="link" danger @click="entry._removed = true">删除</a-button>
            <a-button v-if="entry._removed" size="small" type="link" @click="entry._removed = false">恢复</a-button>
          </span>
        </div>
      </div>

      <!-- 手动添加条目 -->
      <div class="manual-add">
        <h4>手动添加条目</h4>
        <div class="manual-form">
          <a-input v-model:value="manualName" placeholder="名称" size="small" style="width: 120px" />
          <a-input-number v-model:value="manualAmount" placeholder="金额" :min="0" size="small" style="width: 120px" />
          <a-select v-model:value="manualCategory" size="small" style="width: 80px">
            <a-select-option value="income">收入</a-select-option>
            <a-select-option value="expense">支出</a-select-option>
          </a-select>
          <a-date-picker v-model:value="manualDate" size="small" style="width: 140px" />
          <a-button size="small" type="primary" :disabled="!manualName || !manualAmount" @click="addManualEntry">添加</a-button>
        </div>
      </div>

      <div class="expected-balance">
        预期余额: ¥{{ expectedBalance.toLocaleString('zh-CN') }}
        <span class="hint">（上次对账余额 + 有效条目净额）</span>
      </div>

      <div class="step-actions">
        <a-button @click="goToStep(0)">上一步</a-button>
        <a-button type="primary" @click="goToStep(2)">下一步</a-button>
      </div>
    </div>

    <!-- 步骤3: 输入真实余额 -->
    <div v-if="step === 2" class="step-content">
      <a-form layout="vertical">
        <a-form-item :label="lastRecon ? '当前真实余额' : '请输入账户当前余额'" required>
          <a-input-number
            v-model:value="actualBalance"
            :min="0"
            :step="100"
            addon-after="元"
            style="width: 100%"
          />
        </a-form-item>
      </a-form>
      <div class="balance-diff">
        <div>预期余额: ¥{{ expectedBalance.toLocaleString('zh-CN') }}</div>
        <div>真实余额: ¥{{ (actualBalance ?? 0).toLocaleString('zh-CN') }}</div>
        <div :class="{ positive: balanceDiff > 0, negative: balanceDiff < 0 }">
          差额: {{ balanceDiff >= 0 ? '+' : '' }}¥{{ balanceDiff.toLocaleString('zh-CN') }}
          <span v-if="Math.abs(balanceDiff) > 0.01" class="diff-hint">（将自动生成调整记录）</span>
        </div>
      </div>
      <a-form layout="vertical" style="margin-top: 16px">
        <a-form-item label="备注（可选）">
          <a-input v-model:value="reconcileNote" placeholder="例如：月末对账" />
        </a-form-item>
      </a-form>
      <div class="step-actions">
        <a-button @click="goToStep(lastRecon ? 1 : 0)">上一步</a-button>
        <a-button type="primary" :disabled="typeof actualBalance !== 'number'" @click="goToStep(3)">下一步</a-button>
      </div>
    </div>

    <!-- 步骤4: 确认提交 -->
    <div v-if="step === 3" class="step-content">
      <div class="summary">
        <h4>对账汇总</h4>
        <div class="summary-item"><span>对账日期:</span> {{ reconcileDate?.format('YYYY-MM-DD') }}</div>
        <div class="summary-item"><span>有效条目:</span> {{ activeEntries.length }} 条</div>
        <div class="summary-item"><span>预期余额:</span> ¥{{ expectedBalance.toLocaleString('zh-CN') }}</div>
        <div class="summary-item"><span>真实余额:</span> ¥{{ (actualBalance ?? 0).toLocaleString('zh-CN') }}</div>
        <div v-if="Math.abs(balanceDiff) > 0.01" class="summary-item">
          <span>调整金额:</span>
          <span :class="{ positive: balanceDiff > 0, negative: balanceDiff < 0 }">
            {{ balanceDiff >= 0 ? '+' : '' }}¥{{ balanceDiff.toLocaleString('zh-CN') }}
          </span>
        </div>
      </div>
      <div class="step-actions">
        <a-button @click="goToStep(2)">上一步</a-button>
        <a-button type="primary" @click="handleSubmit">确认提交</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch, reactive } from 'vue';
import dayjs, { Dayjs } from 'dayjs';
import { useFinanceStore } from '@/stores/finance';
import { ReconciliationEngine, type PendingEntry } from '@/utils/reconciliation';

interface Props {
  open: boolean;
}

interface EditablePendingEntry extends PendingEntry {
  _removed: boolean;
  _editing: boolean;
  _manual?: boolean;
  _manualDate?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'cancel'): void;
  (e: 'done'): void;
}>();

const store = useFinanceStore();
const reconciliationEngine = new ReconciliationEngine();

const step = ref(0);
const reconcileDate = ref<Dayjs | null>(dayjs(store.todayStr));
const actualBalance = ref<number | null>(null);
const reconcileNote = ref('');

// 手动添加条目
const manualName = ref('');
const manualAmount = ref<number | null>(null);
const manualCategory = ref<'income' | 'expense'>('expense');
const manualDate = ref<Dayjs | null>(null);

const lastRecon = computed(() => store.latestReconciliation);

const pendingEntries = ref<EditablePendingEntry[]>([]);

const disabledDate = (current: Dayjs) => {
  if (!lastRecon.value) return false;
  return current.isBefore(dayjs(lastRecon.value.date), 'day');
};

// 初始化
watch(
  () => props.open,
  (open) => {
    if (open) {
      step.value = 0;
      reconcileDate.value = dayjs(store.todayStr);
      actualBalance.value = lastRecon.value?.balance ?? null;
      reconcileNote.value = '';
      pendingEntries.value = [];
      manualName.value = '';
      manualAmount.value = null;
      manualCategory.value = 'expense';
      manualDate.value = null;
    }
  },
);

const goToStep = (s: number) => {
  if (s === 1 && step.value === 0) {
    if (!lastRecon.value) {
      // 首次对账：跳过审核明细，直接到余额输入
      step.value = 2;
      return;
    }
    // 进入步骤2时自动生成待确认条目
    generatePending();
  }
  step.value = s;
};

const generatePending = () => {
  if (!reconcileDate.value) return;
  const dateStr = reconcileDate.value.format('YYYY-MM-DD');
  const accountEvents = store.events.filter((e) => e.accountId === store.currentAccount.id);
  const entries = reconciliationEngine.generatePendingEntries(
    accountEvents,
    lastRecon.value,
    dateStr,
  );
  pendingEntries.value = entries.map((e) => reactive({
    ...e,
    _removed: false,
    _editing: false,
  }));
};

const addManualEntry = () => {
  if (!manualName.value || !manualAmount.value) return;
  const dateStr = manualDate.value
    ? manualDate.value.format('YYYY-MM-DD')
    : reconcileDate.value?.format('YYYY-MM-DD') ?? store.todayStr;

  pendingEntries.value.push(reactive({
    ruleId: '',
    name: manualName.value,
    amount: manualAmount.value,
    category: manualCategory.value,
    date: dateStr,
    source: 'rule' as const,
    _removed: false,
    _editing: false,
    _manual: true,
  }));

  manualName.value = '';
  manualAmount.value = null;
  manualCategory.value = 'expense';
  manualDate.value = null;
};

const activeEntries = computed(() => pendingEntries.value.filter((e) => !e._removed));

const expectedBalance = computed(() => {
  const prev = lastRecon.value?.balance ?? 0;
  const net = activeEntries.value.reduce((sum, e) => {
    return sum + (e.category === 'income' ? e.amount : -e.amount);
  }, 0);
  return Number((prev + net).toFixed(2));
});

const balanceDiff = computed(() => {
  return Number(((actualBalance.value ?? 0) - expectedBalance.value).toFixed(2));
});

const handleSubmit = () => {
  if (!reconcileDate.value || typeof actualBalance.value !== 'number') return;

  const dateStr = reconcileDate.value.format('YYYY-MM-DD');
  const entries = activeEntries.value.map((e) => ({
    ruleId: e._manual ? undefined : (e.ruleId || undefined),
    name: e.name,
    amount: e.amount,
    category: e.category,
    date: e.date,
    source: (e._manual ? 'manual' : 'rule') as 'rule' | 'manual',
  }));

  store.reconcile(dateStr, actualBalance.value, entries, reconcileNote.value || undefined);
  emit('done');
};
</script>

<style scoped>
.step-content {
  min-height: 200px;
}

.step-hint {
  color: #6b7280;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.entries-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.empty-entries {
  padding: 24px;
  text-align: center;
  color: #9ca3af;
}

.entry-row {
  display: grid;
  grid-template-columns: 100px 1fr 160px 120px;
  gap: 8px;
  padding: 8px 12px;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.85rem;
}

.entry-row:last-child {
  border-bottom: none;
}

.entry-row.removed {
  opacity: 0.4;
  text-decoration: line-through;
}

.entry-amount.income {
  color: #059669;
}

.entry-amount.expense {
  color: #dc2626;
}

.entry-actions {
  display: flex;
  gap: 4px;
}

.manual-add {
  margin-bottom: 16px;
}

.manual-add h4 {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 8px;
}

.manual-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.expected-balance {
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
}

.expected-balance .hint {
  font-weight: 400;
  color: #9ca3af;
  font-size: 0.8rem;
}

.balance-diff {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 0.9rem;
}

.balance-diff .positive {
  color: #059669;
  font-weight: 600;
}

.balance-diff .negative {
  color: #dc2626;
  font-weight: 600;
}

.diff-hint {
  color: #9ca3af;
  font-size: 0.8rem;
  font-weight: 400;
}

.summary {
  background: #f8fafc;
  border-radius: 12px;
  padding: 20px;
}

.summary h4 {
  margin: 0 0 16px;
  font-size: 1rem;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.9rem;
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item span:first-child {
  color: #6b7280;
}

.summary-item .positive {
  color: #059669;
}

.summary-item .negative {
  color: #dc2626;
}
</style>
