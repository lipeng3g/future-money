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
      <button class="trigger-import-current" @click="$emit('import', 'current')">导入当前账户</button>
      <button class="trigger-import-all" @click="$emit('import', 'all')">恢复全部账户</button>
      <button class="trigger-export-current" @click="$emit('export', 'current')">导出当前账户</button>
      <button class="trigger-export-all" @click="$emit('export', 'all')">导出全部账户</button>
      <button class="trigger-undo" @click="$emit('undo-import')">撤销上次导入</button>
      <button class="trigger-clear" @click="$emit('clear')">清空当前账户</button>
      <button class="trigger-delete" @click="$emit('delete')">删除账户</button>
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
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalCreateElement = document.createElement.bind(document);
  let createObjectURLMock: ReturnType<typeof vi.fn>;
  let revokeObjectURLMock: ReturnType<typeof vi.fn>;
  let anchorClickMock: ReturnType<typeof vi.fn>;
  let createdAnchors: Array<{ href: string; download: string; click: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    window.localStorage.clear();
    setActivePinia(createPinia());
    modalConfirm.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    messageInfo.mockReset();
    messageWarning.mockReset();
    createObjectURLMock = vi.fn(() => 'blob:future-money-test');
    revokeObjectURLMock = vi.fn();
    anchorClickMock = vi.fn();
    createdAnchors = [];
    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      if (tagName.toLowerCase() === 'a') {
        const anchor = {
          href: '',
          download: '',
          click: anchorClickMock,
        };
        createdAnchors.push(anchor);
        return anchor as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tagName);
    }) as typeof document.createElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('账户管理里的导入当前账户会阻止误选整库备份，并保留现有本地数据', async () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;

    store.addEvent({
      name: '原始工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
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

    const allBackup = {
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
        events: [],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [],
        ledgerEntries: [],
        eventOverrides: [],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'wrong-scope-all.json', __text: JSON.stringify(allBackup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).not.toHaveBeenCalled();
    expect(messageError).toHaveBeenCalledWith('你选择的是“恢复当前账户”，但文件看起来是“全部账户备份”。请改用“恢复全部账户”，避免误把整库备份塞进单账户。');
    expect(store.accounts).toHaveLength(2);
    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.events.filter((event) => event.accountId === originalAccountId)).toHaveLength(1);
    expect(store.events.filter((event) => event.accountId === secondary.id)).toHaveLength(1);
  });

  it('导入当前账户前会先展示 sanitize 后摘要与事件规则 diff，并在确认后只覆盖当前账户', async () => {
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

    const noisyCurrentBackup = {
      version: '2.0.0',
      timestamp: '2026-03-09T01:00:00.000Z',
      scope: 'current',
      state: {
        version: '2.0.0',
        account: {
          id: 'imported-acc',
          name: '  导入账户  ',
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
            name: '  导入账户  ',
            typeLabel: '现金',
            initialBalance: 6600,
            currency: '¥',
            warningThreshold: 999,
            color: '#10b981',
            iconKey: 'piggy',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'ignored-blank',
            name: '   ',
            typeLabel: '脏账户',
            initialBalance: 10,
            currency: '¥',
            warningThreshold: 0,
            color: '#ef4444',
            iconKey: 'card',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-good',
            accountId: 'imported-acc',
            name: '  新工资  ',
            amount: 9000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 9,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'evt-bad',
            accountId: 'imported-acc',
            name: '坏分类',
            amount: 100,
            category: 'transfer',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 1,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [
          {
            id: 'recon-good',
            accountId: 'imported-acc',
            date: '2026-03-09',
            balance: 6600,
            note: '  导入对账  ',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-good',
            accountId: 'imported-acc',
            reconciliationId: 'recon-good',
            ruleId: 'evt-good',
            name: '  新工资入账  ',
            amount: 9000,
            category: 'income',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'ledger-bad',
            accountId: 'imported-acc',
            reconciliationId: 'recon-good',
            ruleId: 'evt-missing',
            name: '断裂引用',
            amount: 1,
            category: 'expense',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        eventOverrides: [
          {
            id: 'override-good',
            accountId: 'imported-acc',
            ruleId: 'evt-good',
            period: '2026-03',
            action: 'modified',
            amount: 9200,
            name: '  手调工资  ',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'override-bad',
            accountId: 'imported-acc',
            ruleId: 'evt-good',
            period: 'bad-period',
            action: 'modified',
            amount: 9300,
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'import-current-sanitized.json', __text: JSON.stringify(noisyCurrentBackup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);
    expect(config.title).toBe(`导入到当前账户「${originalAccountName}」？`);
    expect(contentText).toContain('单账户导入：将只覆盖当前选中账户的数据');
    expect(contentText).toContain('导入来源账户：导入账户');
    expect(contentText).toContain(`将覆盖当前账户：${originalAccountName}`);
    expect(contentText).toContain('导入后事件 / 对账 / 账本：1 / 1 / 1');
    expect(contentText).toContain('导入后覆盖记录：1');
    expect(contentText).toContain('当前账户事件规则 diff');
    expect(contentText).toContain('将新增：新工资');
    expect(contentText).toContain('将移除：原始工资');
    expect(contentText).toContain('sanitize 过滤统计');
    expect(contentText).toContain('账户：原始 2 → sanitize 后 1（过滤 1）');
    expect(contentText).toContain('事件：原始 2 → sanitize 后 1（过滤 1）');
    expect(contentText).toContain('账本记录：原始 2 → sanitize 后 1（过滤 1）');
    expect(contentText).toContain('覆盖记录：原始 2 → sanitize 后 1（过滤 1）');
    expect(contentText).not.toContain('坏分类');

    await expect(config.onOk()).rejects.toBeUndefined();
    expect(messageError).toHaveBeenCalledWith('输入的文字不正确，操作已取消');
    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe(originalAccountName);
    expect(store.events.filter((event) => event.accountId === originalAccountId)).toHaveLength(1);
    expect(store.events.filter((event) => event.accountId === secondary.id)).toHaveLength(1);

    const inputNode = config.content.children.at(-1);
    inputNode.props.onInput({ target: { value: '导入当前账户' } });
    await config.onOk();

    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe('导入账户');
    expect(store.events.filter((event) => event.accountId === originalAccountId)).toHaveLength(1);
    expect(store.events.find((event) => event.accountId === originalAccountId)?.name).toBe('新工资');
    expect(store.reconciliations.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.ledgerEntries.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.eventOverrides.filter((item) => item.accountId === originalAccountId)).toHaveLength(1);
    expect(store.events.filter((event) => event.accountId === secondary.id)).toHaveLength(1);
    expect(messageSuccess).toHaveBeenCalledWith('已导入当前账户数据，可在账户管理中撤销上次导入');
  });

  it('账户管理里的导出按钮会按 current/all 模式生成对应文件名', async () => {
    const store = useFinanceStore();
    store.currentAccount.name = '现金 主账户';

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    await wrapper.find('button.trigger-export-current').trigger('click');
    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    const currentBlob = createObjectURLMock.mock.calls[0][0] as Blob;
    expect(currentBlob).toBeInstanceOf(Blob);
    expect(messageSuccess).toHaveBeenCalledWith('已导出当前账户数据');

    expect(createdAnchors[0]?.download).toMatch(/^future-money-现金-主账户-\d{4}-\d{2}-\d{2}\.json$/);
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:future-money-test');

    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-export-all').trigger('click');

    expect(anchorClickMock).toHaveBeenCalledTimes(2);
    expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    expect(messageSuccess).toHaveBeenCalledWith('已导出全部账户数据');
    expect(createdAnchors[1]?.download).toMatch(/^future-money-all-accounts-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('账户管理里的导入在文件读取失败时会提示错误并重置导入模式', async () => {
    const wrapper = mountHeader();

    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-import-all').trigger('click');

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'broken-all.json', __failRead: true }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(messageError).toHaveBeenCalledWith('文件读取失败，无法恢复全部账户');
    expect(modalConfirm).not.toHaveBeenCalled();

    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-import-current').trigger('click');

    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'broken-current.json', __failRead: true }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(messageError).toHaveBeenCalledWith('文件读取失败，无法导入当前账户');
    expect(modalConfirm).not.toHaveBeenCalled();
  });

  it('清空当前账户前会展示真实删除范围摘要，并在确认后重置当前账户数据', async () => {
    const store = useFinanceStore();
    const targetId = store.currentAccount.id;

    const eventResult = store.addEvent({
      name: '工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
    expect(eventResult.success).toBe(true);
    if (!eventResult.success) {
      throw new Error('expected event to be created');
    }

    const createdEvent = eventResult.event;
    const reconciliation = store.reconcile('2026-03-05', 6000, [
      {
        ruleId: createdEvent.id,
        name: '工资',
        amount: 5000,
        category: 'income',
        date: '2026-03-05',
        source: 'rule',
      },
    ], '当前对账');

    store.addEventOverride(createdEvent.id, '2026-04', 'modified', { amount: 5200, name: '工资补发' });

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-clear').trigger('click');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);
    expect(config.title).toBe(`确定清空账户「${store.currentAccount.name}」的数据？`);
    expect(contentText).toContain('危险操作：会重置当前账户的本地业务数据');
    expect(contentText).toContain(`目标账户：${store.currentAccount.name}`);
    expect(contentText).toContain('将删除事件：1');
    expect(contentText).toContain('将删除对账：1');
    expect(contentText).toContain(`将删除账本记录：${store.ledgerEntries.filter((item) => item.accountId === targetId).length}`);
    expect(contentText).toContain('将删除覆盖记录：1');
    expect(contentText).toContain('清空后账户初始余额：0');

    await expect(config.onOk()).rejects.toBeUndefined();
    expect(messageError).toHaveBeenCalledWith('输入的文字不正确，操作已取消');
    expect(store.events.filter((item) => item.accountId === targetId)).toHaveLength(1);
    expect(store.reconciliations.filter((item) => item.accountId === targetId)).toHaveLength(1);
    expect(store.ledgerEntries.filter((item) => item.accountId === targetId)).toHaveLength(reconciliation ? 2 : 0);
    expect(store.eventOverrides.filter((item) => item.accountId === targetId)).toHaveLength(1);

    const inputNode = config.content.children.at(-1);
    inputNode.props.onInput({ target: { value: '清空当前账户' } });
    await config.onOk();

    expect(store.events.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.reconciliations.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.ledgerEntries.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.eventOverrides.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.currentAccount.initialBalance).toBe(0);
    expect(messageSuccess).toHaveBeenCalledWith('当前账户数据已清空');
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
    expect(contentText).toContain('恢复后会移除：现金 主账户、旅行基金');
    expect(contentText).toContain('数据规模变化');
    expect(contentText).not.toContain('账户：当前 2 → 备份 2');
    expect(contentText).toContain('事件：当前 1 → 备份 2（增加 +1）');
    expect(contentText).not.toContain('对账：当前 1 → 备份 1');
    expect(contentText).not.toContain('账本记录：当前 1 → 备份 1');
    expect(contentText).toContain('覆盖记录：当前 0 → 备份 1（增加 +1）');
    expect(contentText).toContain('按账户的数据变化');
    expect(contentText).toContain('信用卡：事件 +1');
    expect(contentText).toContain('按账户的事件规则变化');
    expect(contentText).toContain('现金账户：新增事件：工资');
    expect(contentText).toContain('信用卡：新增事件：还款');
    expect(contentText).toContain('主账户：移除事件：现有工资');
    expect(contentText).toContain('当前本地日期覆盖：2026-01-01 → 2026-03-05');
    expect(contentText).toContain('备份文件日期覆盖：2026-03-01 → 2026-03-09');
    expect(contentText).toContain('备份时间新旧正常');
    expect(contentText).toContain('当前本地最新日期：2026-03-05');
    expect(contentText).toContain('备份文件最新日期：2026-03-09');
  });

  it('整库恢复确认框会在备份明显更旧时给出旧备份预警', async () => {
    const store = useFinanceStore();

    store.addEvent({
      name: '三月工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
    store.reconcile('2026-03-20', 6800, [], '当前对账');

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    await wrapper.find('button.trigger-import-all').trigger('click');

    const staleBackup = {
      version: '2.0.0',
      timestamp: '2026-02-16T01:00:00.000Z',
      scope: 'all',
      state: {
        version: '2.0.0',
        account: {
          id: 'cash',
          name: '主账户',
          typeLabel: '现金',
          initialBalance: 3000,
          currency: '¥',
          warningThreshold: 800,
          color: '#3b82f6',
          iconKey: 'wallet',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'cash',
            name: '主账户',
            typeLabel: '现金',
            initialBalance: 3000,
            currency: '¥',
            warningThreshold: 800,
            color: '#3b82f6',
            iconKey: 'wallet',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-1',
            accountId: 'cash',
            name: '旧工资',
            amount: 8000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-01-01',
            endDate: '2026-02-15',
            monthlyDay: 8,
            enabled: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-02-15T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [],
        reconciliations: [
          {
            id: 'recon-1',
            accountId: 'cash',
            date: '2026-02-10',
            balance: 3000,
            note: '旧对账',
            createdAt: '2026-02-10T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-1',
            accountId: 'cash',
            reconciliationId: 'recon-1',
            ruleId: 'evt-1',
            name: '旧工资',
            amount: 8000,
            category: 'income',
            date: '2026-02-15',
            source: 'rule',
            createdAt: '2026-02-15T00:00:00.000Z',
            updatedAt: '2026-02-15T00:00:00.000Z',
          },
        ],
        eventOverrides: [],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'stale-restore-all.json', __text: JSON.stringify(staleBackup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);

    expect(contentText).toContain('注意：这份备份可能比当前本地更旧');
    expect(contentText).toContain('备份文件的最新日期比当前本地早约 33 天');
    expect(contentText).toContain('当前本地最新日期：2026-03-20');
    expect(contentText).toContain('备份文件最新日期：2026-02-15');
  });

  it('恢复全部账户时会先按 sanitize 后的结果展示确认摘要，并支持撤销回滚', async () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;
    const originalAccountName = store.currentAccount.name;

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

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    await wrapper.find('button.trigger-import-all').trigger('click');

    const noisyBackup = {
      version: '2.0.0',
      timestamp: '2026-03-09T01:00:00.000Z',
      scope: 'all',
      state: {
        version: '2.0.0',
        account: {
          id: 'missing-current',
          name: '坏当前账户',
          typeLabel: '现金',
          initialBalance: 1234,
          currency: '¥',
          warningThreshold: 800,
          color: '#3b82f6',
          iconKey: 'wallet',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
        accounts: [
          {
            id: 'acc-good',
            name: '  导入主账户  ',
            typeLabel: '现金',
            initialBalance: 3000,
            currency: '¥',
            warningThreshold: 600,
            color: '#3b82f6',
            iconKey: 'wallet',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'acc-blank',
            name: '   ',
            typeLabel: '脏数据',
            initialBalance: 10,
            currency: '¥',
            warningThreshold: 0,
            color: '#ef4444',
            iconKey: 'card',
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        events: [
          {
            id: 'evt-good',
            accountId: 'acc-good',
            name: '  导入工资  ',
            amount: 9000,
            category: 'income',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 9,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
          {
            id: 'evt-bad-category',
            accountId: 'acc-good',
            name: '坏分类事件',
            amount: 100,
            category: 'transfer',
            type: 'monthly',
            startDate: '2026-03-01',
            monthlyDay: 1,
            enabled: true,
            createdAt: '2026-03-01T00:00:00.000Z',
            updatedAt: '2026-03-01T00:00:00.000Z',
          },
        ],
        preferences: store.preferences,
        snapshots: [
          {
            id: 'snap-good',
            accountId: 'acc-good',
            date: '2026-03-09',
            balance: 3000,
            source: 'manual',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'snap-bad',
            accountId: 'acc-good',
            date: '2026-13-09',
            balance: 1,
            source: 'manual',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        reconciliations: [
          {
            id: 'recon-good',
            accountId: 'acc-good',
            date: '2026-03-09',
            balance: 3000,
            note: '  导入对账  ',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        ledgerEntries: [
          {
            id: 'ledger-good',
            accountId: 'acc-good',
            reconciliationId: 'recon-good',
            ruleId: 'evt-good',
            name: '  导入工资入账  ',
            amount: 9000,
            category: 'income',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'ledger-bad-rule',
            accountId: 'acc-good',
            reconciliationId: 'recon-good',
            ruleId: 'evt-missing',
            name: '断裂引用',
            amount: 1,
            category: 'expense',
            date: '2026-03-09',
            source: 'rule',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
        ],
        eventOverrides: [
          {
            id: 'override-good',
            accountId: 'acc-good',
            ruleId: 'evt-good',
            period: '2026-03',
            action: 'modified',
            amount: 9200,
            name: '  手调工资  ',
            createdAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'override-bad',
            accountId: 'acc-good',
            ruleId: 'evt-good',
            period: 'bad-period',
            action: 'modified',
            amount: 9300,
            createdAt: '2026-03-09T00:00:00.000Z',
          },
        ],
      },
    };

    const fileInput = wrapper.find('input.file-input').element as HTMLInputElement;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [{ name: 'restore-all-sanitized.json', __text: JSON.stringify(noisyBackup) }],
    });
    await wrapper.find('input.file-input').trigger('change');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const restoreConfig = modalConfirm.mock.calls[0][0];
    const restoreContentText = extractText(restoreConfig.content);
    expect(restoreContentText).toContain('备份内账户：1（导入主账户）');
    expect(restoreContentText).toContain('备份内事件 / 对账 / 账本：1 / 1 / 1');
    expect(restoreContentText).toContain('备份内覆盖记录：1');
    expect(restoreContentText).toContain('sanitize 过滤统计');
    expect(restoreContentText).toContain('账户：原始 2 → sanitize 后 1（过滤 1）');
    expect(restoreContentText).toContain('事件：原始 2 → sanitize 后 1（过滤 1）');
    expect(restoreContentText).toContain('账本记录：原始 2 → sanitize 后 1（过滤 1）');
    expect(restoreContentText).toContain('覆盖记录：原始 2 → sanitize 后 1（过滤 1）');
    expect(restoreContentText).not.toContain('acc-blank');
    const restoreInputNode = restoreConfig.content.children.at(-1);
    restoreInputNode.props.onInput({ target: { value: '恢复全部账户' } });
    await restoreConfig.onOk();

    expect(store.accounts).toHaveLength(1);
    expect(store.currentAccount.name).toBe('导入主账户');
    expect(store.currentAccountId).toBe('acc-good');
    expect(store.events).toHaveLength(1);
    expect(store.events[0].name).toBe('导入工资');
    expect(store.reconciliations).toHaveLength(1);
    expect(store.reconciliations[0].note).toBe('导入对账');
    expect(store.ledgerEntries).toHaveLength(1);
    expect(store.ledgerEntries[0].name).toBe('导入工资入账');
    expect(store.eventOverrides).toHaveLength(1);
    expect(store.eventOverrides[0].name).toBe('手调工资');
    expect(messageSuccess).toHaveBeenCalledWith('已恢复全部账户数据，可在账户管理中撤销上次恢复');

    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();
    expect(wrapper.find('.undo-summary').text()).toContain('恢复全部账户 · restore-all-sanitized.json');
    await wrapper.find('button.trigger-undo').trigger('click');

    expect(modalConfirm).toHaveBeenCalledTimes(2);
    const undoConfig = modalConfirm.mock.calls[1][0];
    const undoContentText = extractText(undoConfig.content);
    expect(undoContentText).toContain('回滚来源：restore-all-sanitized.json');
    expect(undoContentText).toContain('回滚类型：恢复全部账户前快照');
    await undoConfig.onOk();

    expect(store.currentAccountId).toBe(originalAccountId);
    expect(store.currentAccount.name).toBe(originalAccountName);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].name).toBe('现有工资');
    expect(store.rollbackSnapshot).toBeNull();
    expect(messageSuccess).toHaveBeenCalledWith('已撤销上次导入/恢复');
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

  it('账户管理里的清空当前账户会弹确认框并在确认后清空当前账户数据', async () => {
    const store = useFinanceStore();
    const targetId = store.currentAccount.id;

    const eventResult = store.addEvent({
      name: '工资',
      amount: 5000,
      category: 'income',
      type: 'monthly',
      startDate: '2026-01-01',
      monthlyDay: 10,
      enabled: true,
    });
    expect(eventResult.success).toBe(true);
    if (!eventResult.success) {
      throw new Error('expected event to be created');
    }

    const createdEvent = eventResult.event;
    store.reconcile('2026-03-09', 8000, [
      {
        ruleId: createdEvent.id,
        name: '工资',
        amount: 5000,
        category: 'income',
        date: '2026-03-09',
        source: 'rule',
      },
    ], '首次对账');
    store.addEventOverride(createdEvent.id, '2026-04', 'modified', { amount: 5200, name: '工资补发' });
    expect(store.events.filter((item) => item.accountId === targetId)).toHaveLength(1);
    expect(store.reconciliations.filter((item) => item.accountId === targetId)).toHaveLength(1);

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    await wrapper.find('button.trigger-clear').trigger('click');
    await flushPromises();

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);

    expect(config.title).toBe('确定清空账户「现金 主账户」的数据？');
    expect(contentText).toContain('危险操作：会重置当前账户的本地业务数据');
    expect(contentText).toContain('确认后会删除当前账户下的事件、对账、冻结区账本记录和事件覆盖，并把账户余额重置为 0');
    expect(contentText).toContain('目标账户：现金 主账户');
    expect(contentText).toContain('将删除事件：1');
    expect(contentText).toContain('将删除对账：1');
    expect(contentText).toContain(`将删除账本记录：${store.ledgerEntries.filter((item) => item.accountId === targetId).length}`);
    expect(contentText).toContain('将删除覆盖记录：1');
    expect(contentText).toContain('清空后账户初始余额：0');

    await expect(config.onOk()).rejects.toBeUndefined();
    expect(messageError).toHaveBeenCalledWith('输入的文字不正确，操作已取消');
    expect(store.events.filter((item) => item.accountId === targetId)).toHaveLength(1);
    expect(store.reconciliations.filter((item) => item.accountId === targetId)).toHaveLength(1);

    const inputNode = config.content.children.at(-1);
    inputNode.props.onInput({ target: { value: '清空当前账户' } });
    await config.onOk();

    expect(store.events.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.reconciliations.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.ledgerEntries.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.eventOverrides.filter((item) => item.accountId === targetId)).toHaveLength(0);
    expect(store.currentAccount.initialBalance).toBe(0);
    expect(messageSuccess).toHaveBeenCalledWith('当前账户数据已清空');
  });

  it('账户管理里的删除账户会弹确认框并在确认后删除当前账户并切换到剩余账户', async () => {
    const store = useFinanceStore();
    const originalAccountId = store.currentAccount.id;
    const secondAccount = store.addAccount({ name: '旅行基金', warningThreshold: 300 });
    store.currentAccountId = originalAccountId;

    const wrapper = mountHeader();
    await wrapper.findAll('button.a-button').find((node) => node.text() === '账户管理')?.trigger('click');
    await nextTick();

    await wrapper.find('button.trigger-delete').trigger('click');

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const config = modalConfirm.mock.calls[0][0];
    const contentText = extractText(config.content);

    expect(config.title).toBe('确定删除账户「现金 主账户」？');
    expect(contentText).toContain('该账户及其所有数据将被永久删除，不可恢复');

    await expect(config.onOk()).rejects.toBeUndefined();
    expect(messageError).toHaveBeenCalledWith('输入的文字不正确，操作已取消');
    expect(store.accounts.map((account) => account.id)).toContain(originalAccountId);

    const inputNode = config.content.children[2];
    inputNode.props.onInput({ target: { value: '现金 主账户' } });
    await config.onOk();

    expect(store.accounts.map((account) => account.id)).not.toContain(originalAccountId);
    expect(store.accounts.map((account) => account.id)).toContain(secondAccount.id);
    expect(store.currentAccount.id).toBe(secondAccount.id);
    expect(messageSuccess).toHaveBeenCalledWith('账户已删除');
  });
});
