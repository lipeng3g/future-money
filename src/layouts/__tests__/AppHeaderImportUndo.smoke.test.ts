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

  onerror: null | (() => void) = null;

  readAsText(file: Blob | { __text?: string; __failRead?: boolean }) {
    if ((file as { __failRead?: boolean }).__failRead) {
      this.onerror?.();
      return;
    }

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

const PreferencesModalStub = defineComponent({ name: 'PreferencesModal', props: ['open', 'preferences'], emits: ['save', 'cancel'], template: '<div />' });
const ReconciliationHistoryStub = defineComponent({ name: 'ReconciliationHistory', props: ['open'], emits: ['close'], template: '<div />' });
const ReconciliationModalStub = defineComponent({ name: 'ReconciliationModal', props: ['open'], emits: ['cancel', 'done'], template: '<div />' });
const CreateAccountModalStub = defineComponent({ name: 'CreateAccountModal', props: ['open', 'defaultWarningThreshold'], emits: ['submit', 'cancel'], template: '<div />' });
const AccountMultiSelectModalStub = defineComponent({ name: 'AccountMultiSelectModal', props: ['open', 'accounts', 'initialSelected', 'latestReconciliationMap', 'today'], emits: ['confirm', 'cancel'], template: '<div />' });
const AccountManageModalStub = defineComponent({
  name: 'AccountManageModal',
  props: ['open', 'canUndoImport', 'undoSummary'],
  emits: ['close', 'import', 'export', 'undo-import', 'clear', 'delete'],
  template: `
    <div class="account-manage-modal-stub">
      <div class="undo-summary">{{ undoSummary }}</div>
      <div class="can-undo">{{ canUndoImport ? 'yes' : 'no' }}</div>
      <button class="trigger-import-current" @click="$emit('import', 'current')">导入当前账户</button>
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

describe('AppHeader import/undo smoke', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    modalConfirm.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    messageInfo.mockReset();
    messageWarning.mockReset();
  });

  it('can import current-account backup via UI confirm dialog and then undo it back to the original local state', async () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;
    const originalAccountName = store.currentAccount.name;

    store.addEvent({
      name: '原始工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
    store.reconcile('2026-03-05', 6000, [], '当前对账');
    const secondary = store.addAccount({ name: '旅行基金', warningThreshold: 300 });
    store.addEvent({
      accountId: secondary.id,
      name: '副账户收入',
      amount: 800,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 5,
      enabled: true,
    });
    store.currentAccountId = originalAccountId;

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-import-current').trigger('click');

    const currentBackup = {
      version: '2.0.0',
      timestamp: '2026-03-09T12:00:00.000Z',
      scope: 'current',
      state: {
        version: '2.0.0',
        account: {
          id: 'import-source',
          name: '导入源账户',
          typeLabel: '现金',
          initialBalance: 2400,
          currency: '¥',
          warningThreshold: 600,
          color: '#14b8a6',
          iconKey: 'wallet',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'import-source',
            name: '导入源账户',
            typeLabel: '现金',
            initialBalance: 2400,
            currency: '¥',
            warningThreshold: 600,
            color: '#14b8a6',
            iconKey: 'wallet',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        events: [
          {
            id: 'event-salary',
            accountId: 'import-source',
            name: '导入工资',
            amount: 8000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-01-01',
            monthlyDay: 10,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'event-rent',
            accountId: 'import-source',
            name: '导入房租',
            amount: 2500,
            category: 'expense',
            type: 'monthly',
            startDate: '2026-01-01',
            monthlyDay: 12,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        snapshots: [],
        reconciliations: [
          {
            id: 'recon-1',
            accountId: 'import-source',
            date: '2026-03-05',
            balance: 5200,
            note: '导入对账',
            createdAt: '2026-03-05T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-1',
            accountId: 'import-source',
            reconciliationId: 'recon-1',
            date: '2026-03-06',
            amount: -120,
            category: 'expense',
            source: 'manual',
            name: '导入账本',
            createdAt: '2026-03-06T00:00:00.000Z',
          },
        ],
        eventOverrides: [
          {
            id: 'override-1',
            accountId: 'import-source',
            ruleId: 'event-rent',
            period: '2026-03',
            action: 'modified',
            amount: 2300,
            createdAt: '2026-03-07T00:00:00.000Z',
          },
        ],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'tmp-browser-import-current.json', __text: JSON.stringify(currentBackup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const importConfig = modalConfirm.mock.calls[0][0];
    const importContentText = extractText(importConfig.content);
    expect(importConfig.title).toBe(`导入到当前账户「${originalAccountName}」？`);
    expect(importContentText).toContain('当前账户事件规则 diff');
    expect(importContentText).toContain('将新增：');
    expect(importContentText).toContain('导入工资');
    expect(importContentText).toContain('导入房租');
    expect(importContentText).toContain('将移除：原始工资');
    expect(importContentText).toContain('导入后事件 / 对账 / 账本：2 / 1 / 1');
    expect(importContentText).toContain('导入后覆盖记录：1');

    const importInput = importConfig.content.children.at(-1);
    importInput.props.onInput({ target: { value: '导入当前账户' } });
    await importConfig.onOk();

    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe('导入源账户');
    expect(store.events.filter((event) => event.accountId === originalAccountId).map((event) => event.name)).toEqual(['导入工资', '导入房租']);
    expect(store.reconciliations.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.ledgerEntries.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.eventOverrides.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.events.filter((event) => event.accountId === secondary.id).map((event) => event.name)).toEqual(['副账户收入']);

    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    expect(wrapper.find('.can-undo').text()).toBe('yes');
    expect(wrapper.find('.undo-summary').text()).toContain('导入当前账户 · tmp-browser-import-current.json');
    await wrapper.find('button.trigger-undo').trigger('click');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(2);
    const undoConfig = modalConfirm.mock.calls[1][0];
    const undoContentText = extractText(undoConfig.content);
    expect(undoConfig.title).toBe('撤销上次导入/恢复？');
    expect(undoContentText).toContain('导入当前账户前快照');
    expect(undoContentText).toContain('tmp-browser-import-current.json');
    await undoConfig.onOk();

    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe(originalAccountName);
    expect(store.events.filter((event) => event.accountId === originalAccountId).map((event) => event.name)).toEqual(['原始工资']);
    expect(store.reconciliations.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.ledgerEntries.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.eventOverrides.filter((item) => item.accountId === originalAccountId)).toHaveLength(0);
    expect(store.events.filter((event) => event.accountId === secondary.id).map((event) => event.name)).toEqual(['副账户收入']);

    const persisted = JSON.parse(window.localStorage.getItem('futureMoney.state') ?? 'null');
    expect(persisted?.state?.account?.id).toBe(originalAccountId);
    expect(persisted?.state?.events?.filter((event: { accountId: string }) => event.accountId === originalAccountId)).toHaveLength(1);
    expect(window.localStorage.getItem('futureMoney.rollback')).toBeNull();
    expect(messageSuccess).toHaveBeenCalledWith('已导入当前账户数据，可在账户管理中撤销上次导入');
    expect(messageSuccess).toHaveBeenCalledWith('已撤销上次导入/恢复');
  });
});
