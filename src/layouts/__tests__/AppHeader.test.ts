import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import AppHeader from '@/layouts/AppHeader.vue';
import { useFinanceStore } from '@/stores/finance';

const { modalConfirm, messageSuccess, messageError, messageInfo, messageWarning } = vi.hoisted(() => ({
  modalConfirm: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  messageInfo: vi.fn(),
  messageWarning: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    Modal: {
      confirm: modalConfirm,
    },
    message: {
      success: messageSuccess,
      error: messageError,
      info: messageInfo,
      warning: messageWarning,
    },
  };
});

class MockFileReader {
  result: string | ArrayBuffer | null = null;

  onload: null | (() => void) = null;

  readAsText(file: Blob | { __text?: string }) {
    this.result = typeof (file as { __text?: string }).__text === 'string'
      ? (file as { __text: string }).__text
      : '';
    this.onload?.();
  }
}

vi.stubGlobal('FileReader', MockFileReader as unknown as typeof FileReader);

const AButton = defineComponent({
  name: 'AButton',
  props: ['disabled', 'type', 'size', 'danger', 'ghost'],
  emits: ['click'],
  template: '<button class="a-button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const ASelect = defineComponent({
  name: 'ASelect',
  props: ['value', 'options', 'disabled', 'size'],
  emits: ['update:value'],
  template: '<div class="a-select">{{ options?.[0]?.label }}</div>',
});

const AInputNumber = defineComponent({
  name: 'AInputNumber',
  props: ['value', 'min', 'step', 'addonAfter', 'disabled'],
  emits: ['change'],
  methods: {
    toNumber(event: Event) {
      return Number((event.target as HTMLInputElement).value);
    },
  },
  template: '<input class="a-input-number" type="number" :value="value" :disabled="disabled" @input="$emit(\'change\', toNumber($event))" />',
});

const ADatePicker = defineComponent({
  name: 'ADatePicker',
  props: ['value', 'size', 'placeholder', 'allowClear'],
  emits: ['change'],
  template: '<input class="a-date-picker" type="date" @input="$emit(\'change\', null)" />',
});

const PreferencesModalStub = defineComponent({
  name: 'PreferencesModal',
  props: ['open', 'preferences'],
  emits: ['save', 'cancel'],
  template: '<div class="preferences-modal-stub" />',
});

const ReconciliationHistoryStub = defineComponent({
  name: 'ReconciliationHistory',
  props: ['open'],
  emits: ['close'],
  template: '<div class="reconciliation-history-stub" />',
});

const ReconciliationModalStub = defineComponent({
  name: 'ReconciliationModal',
  props: ['open'],
  emits: ['cancel', 'done'],
  template: '<div class="reconciliation-modal-stub" />',
});

const CreateAccountModalStub = defineComponent({
  name: 'CreateAccountModal',
  props: ['open', 'defaultWarningThreshold'],
  emits: ['submit', 'cancel'],
  template: '<div class="create-account-modal-stub" />',
});

const AccountMultiSelectModalStub = defineComponent({
  name: 'AccountMultiSelectModal',
  props: ['open', 'accounts', 'initialSelected', 'latestReconciliationMap', 'today'],
  emits: ['confirm', 'cancel'],
  template: '<div class="account-multi-select-modal-stub" />',
});

const AccountManageModalStub = defineComponent({
  name: 'AccountManageModal',
  props: ['open', 'canUndoImport', 'undoSummary'],
  emits: ['close', 'import', 'export', 'undo-import', 'clear', 'delete'],
  template: `
    <div class="account-manage-modal-stub">
      <div class="undo-summary">{{ undoSummary }}</div>
      <div class="can-undo">{{ canUndoImport ? 'yes' : 'no' }}</div>
      <button class="trigger-import-all" @click="$emit('import', 'all')">恢复全部账户</button>
      <button class="trigger-undo" @click="$emit('undo-import')">撤销上次导入</button>
    </div>
  `,
});

const mountHeader = () => mount(AppHeader, {
  global: {
    stubs: {
      AButton,
      ASelect,
      AInputNumber,
      ADatePicker,
      PreferencesModal: PreferencesModalStub,
      ReconciliationHistory: ReconciliationHistoryStub,
      ReconciliationModal: ReconciliationModalStub,
      CreateAccountModal: CreateAccountModalStub,
      AccountMultiSelectModal: AccountMultiSelectModalStub,
      AccountManageModal: AccountManageModalStub,
    },
  },
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};

const extractText = (node: any): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((item) => extractText(item)).join(' ');
  if (typeof node === 'object') {
    return [extractText(node.children), extractText(node.component?.subTree)]
      .filter(Boolean)
      .join(' ');
  }
  return '';
};

describe('AppHeader', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    modalConfirm.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    messageInfo.mockReset();
    messageWarning.mockReset();
  });

  it('恢复全部账户前会在确认框展示账户差异与数据规模变化摘要', async () => {
    const store = useFinanceStore();

    store.addEvent({
      name: '现有工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
    store.reconcile('2026-03-05', 6000, [], '当前对账');
    store.addAccount({ name: '旅行基金', warningThreshold: 300 });

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    await wrapper.find('button.trigger-import-all').trigger('click');

    const backup = {
      version: '2.0.0',
      timestamp: '2026-03-09T01:00:00.000Z',
      scope: 'all',
      state: {
        version: '2.0.0',
        account: {
          id: 'cash',
          name: '现金账户',
          typeLabel: '现金',
          initialBalance: 3000,
          currency: '¥',
          warningThreshold: 800,
          color: '#3b82f6',
          iconKey: 'wallet',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'cash',
            name: '现金账户',
            typeLabel: '现金',
            initialBalance: 3000,
            currency: '¥',
            warningThreshold: 800,
            color: '#3b82f6',
            iconKey: 'wallet',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'card',
            name: '信用卡',
            typeLabel: '负债',
            initialBalance: -1200,
            currency: '¥',
            warningThreshold: 200,
            color: '#ef4444',
            iconKey: 'card',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-1',
            accountId: 'card',
            name: '还款',
            amount: 1200,
            category: 'expense',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 8,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'evt-2',
            accountId: 'cash',
            name: '工资',
            amount: 9000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 9,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [
          {
            id: 'recon-1',
            accountId: 'cash',
            date: '2026-03-09',
            balance: 3000,
            note: '备份对账',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-1',
            accountId: 'cash',
            reconciliationId: 'recon-1',
            ruleId: 'evt-2',
            name: '工资',
            amount: 9000,
            category: 'income',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        eventOverrides: [
          {
            id: 'override-1',
            accountId: 'cash',
            ruleId: 'evt-2',
            period: '2026-03',
            action: 'modified',
            amount: 9200,
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'restore-all.json', __text: JSON.stringify(backup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);

    expect(config.title).toBe('恢复全部账户并覆盖当前本地数据？');
    expect(contentText).toContain('账户差异速览');
    expect(contentText).toContain('恢复后会新增：现金账户、信用卡');
    expect(contentText).toContain('恢复后会移除：主账户、旅行基金');
    expect(contentText).toContain('数据规模变化');
    expect(contentText).not.toContain('账户：当前 2 → 备份 2');
    expect(contentText).toContain('事件：当前 1 → 备份 2（增加 +1）');
    expect(contentText).not.toContain('对账：当前 1 → 备份 1');
    expect(contentText).not.toContain('账本记录：当前 1 → 备份 1');
    expect(contentText).toContain('覆盖记录：当前 0 → 备份 1（增加 +1）');
    expect(contentText).toContain('按账户的数据变化');
    expect(contentText).toContain('信用卡：事件 +1');
    expect(contentText).toContain('当前本地日期覆盖：2026-01-01 → 2026-03-05');
    expect(contentText).toContain('备份文件日期覆盖：2026-03-01 → 2026-03-09');
  });

  it('账户管理里的撤销上次导入会展示回滚摘要并执行真正回退', async () => {
    const store = useFinanceStore();
    const originalAccountName = store.currentAccount.name;

    const backup = {
      version: '2.0.0',
      timestamp: '2026-03-09T01:00:00.000Z',
      scope: 'current',
      state: {
        version: '2.0.0',
        account: {
          id: 'imported-acc',
          name: '导入账户',
          typeLabel: '现金',
          initialBalance: 6600,
          currency: '¥',
          warningThreshold: 999,
          color: '#10b981',
          iconKey: 'piggy',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'imported-acc',
            name: '导入账户',
            typeLabel: '现金',
            initialBalance: 6600,
            currency: '¥',
            warningThreshold: 999,
            color: '#10b981',
            iconKey: 'piggy',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-new',
            accountId: 'imported-acc',
            name: '新工资',
            amount: 9000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-02-01',
            monthlyDay: 9,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [],
        ledgerEntries: [],
        eventOverrides: [],
      },
    };

    store.importState(JSON.stringify(backup), 'current', 'import-current.json');

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    expect(wrapper.find('.undo-summary').text()).toContain('导入当前账户 · import-current.json');
    expect(wrapper.find('.can-undo').text()).toBe('yes');

    await wrapper.find('button.trigger-undo').trigger('click');

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);

    expect(config.title).toBe('撤销上次导入/恢复？');
    expect(contentText).toContain('回滚来源：import-current.json');
    expect(contentText).toContain('回滚类型：导入当前账户前快照');

    await config.onOk();

    expect(store.currentAccount.name).toBe(originalAccountName);
    expect(store.rollbackSnapshot).toBeNull();
    expect(messageSuccess).toHaveBeenCalledWith('已撤销上次导入/恢复');
  });
});
