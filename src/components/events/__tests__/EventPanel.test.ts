import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import EventPanel from '@/components/events/EventPanel.vue';
import { useFinanceStore } from '@/stores/finance';
import type { CashFlowEvent } from '@/types/event';

const { messageInfo, messageSuccess, messageError, modalConfirm } = vi.hoisted(() => ({
  messageInfo: vi.fn(),
  messageSuccess: vi.fn(),
  messageError: vi.fn(),
  modalConfirm: vi.fn(),
}));

vi.mock('ant-design-vue', async () => {
  const actual = await vi.importActual<typeof import('ant-design-vue')>('ant-design-vue');
  return {
    ...actual,
    message: {
      info: messageInfo,
      success: messageSuccess,
      error: messageError,
    },
    Modal: {
      confirm: modalConfirm,
    },
  };
});

const EventListStub = defineComponent({
  name: 'EventList',
  props: ['events', 'highlightedEventIds', 'chartFocusedEventId'],
  emits: ['focus-chart', 'edit', 'delete', 'toggle'],
  template: `
    <div class="event-list-stub">
      <button
        v-for="event in events"
        :key="event.id"
        type="button"
        class="focus-chart-trigger"
        @click="$emit('focus-chart', event)"
      >
        {{ event.name }}
      </button>
      <button
        v-for="event in events"
        :key="'edit-' + event.id"
        type="button"
        class="edit-trigger"
        @click="$emit('edit', event)"
      >
        编辑 {{ event.name }}
      </button>
      <button
        v-for="event in events"
        :key="'delete-' + event.id"
        type="button"
        class="delete-trigger"
        @click="$emit('delete', event)"
      >
        删除 {{ event.name }}
      </button>
      <button
        v-for="event in events"
        :key="'toggle-' + event.id"
        type="button"
        class="toggle-trigger"
        @click="$emit('toggle', { id: event.id, enabled: !event.enabled })"
      >
        切换 {{ event.name }}
      </button>
      <div class="highlighted">{{ highlightedEventIds?.join(',') }}</div>
      <div class="chart-focused">{{ chartFocusedEventId }}</div>
    </div>
  `,
});

const EventFormModalStub = defineComponent({
  name: 'EventFormModal',
  props: ['open', 'event', 'submitError'],
  emits: ['submit', 'cancel'],
  template: `
    <div v-if="open" class="event-form-modal-stub">
      <div class="editing-name">{{ event?.name ?? 'new' }}</div>
      <div v-if="submitError" class="submit-error">{{ submitError }}</div>
      <button
        type="button"
        class="submit-edit"
        @click="$emit('submit', {
          name: '更新后的房租',
          amount: 3200,
          category: 'expense',
          type: 'monthly',
          startDate: '2026-01-01',
          monthlyDay: 12,
          enabled: true,
        })"
      >
        提交编辑
      </button>
      <button
        type="button"
        class="submit-invalid-edit"
        @click="$emit('submit', {
          name: '',
          amount: 3200,
          category: 'expense',
          type: 'monthly',
          startDate: '2026-01-01',
          monthlyDay: 12,
          enabled: true,
        })"
      >
        提交非法编辑
      </button>
      <button
        type="button"
        class="submit-create"
        @click="$emit('submit', {
          name: '兼职收入',
          amount: 1800,
          category: 'income',
          type: 'monthly',
          startDate: '2026-04-01',
          monthlyDay: 18,
          enabled: true,
        })"
      >
        提交新增
      </button>
      <button
        type="button"
        class="submit-invalid-create"
        @click="$emit('submit', {
          name: '',
          amount: 1800,
          category: 'income',
          type: 'monthly',
          startDate: '2026-04-01',
          monthlyDay: 18,
          enabled: true,
        })"
      >
        提交非法新增
      </button>
      <button type="button" class="cancel-edit" @click="$emit('cancel')">取消</button>
    </div>
  `,
});

const AButtonStub = defineComponent({
  name: 'AButton',
  props: ['disabled', 'size', 'type'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
});

const baseEvent = (overrides: Partial<CashFlowEvent> = {}): CashFlowEvent => ({
  id: overrides.id ?? 'evt-rent',
  accountId: overrides.accountId ?? 'acc-main',
  name: overrides.name ?? '房租',
  amount: overrides.amount ?? 3000,
  category: overrides.category ?? 'expense',
  type: overrides.type ?? 'monthly',
  startDate: overrides.startDate ?? '2026-01-01',
  endDate: overrides.endDate,
  onceDate: overrides.onceDate,
  monthlyDay: overrides.monthlyDay ?? 10,
  yearlyMonth: overrides.yearlyMonth,
  yearlyDay: overrides.yearlyDay,
  notes: overrides.notes,
  color: overrides.color,
  enabled: overrides.enabled ?? true,
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
});

const mountPanel = () => mount(EventPanel, {
  global: {
    stubs: {
      EventList: EventListStub,
      EventFormModal: EventFormModalStub,
      AButton: AButtonStub,
    },
  },
});

describe('EventPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    messageInfo.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
    modalConfirm.mockReset();

    const store = useFinanceStore();
    store.setSimulatedToday('2026-04-01');
    store.$patch({
      accounts: [
        {
          id: 'acc-main',
          name: '主账户',
          typeLabel: '现金账户',
          initialBalance: 5000,
          currency: 'CNY',
          warningThreshold: 1000,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      currentAccountId: 'acc-main',
      events: [
        baseEvent(),
        baseEvent({
          id: 'evt-salary',
          name: '工资',
          amount: 8000,
          category: 'income',
          monthlyDay: 5,
        }),
      ],
      reconciliations: [
        {
          id: 'recon-1',
          accountId: 'acc-main',
          date: '2026-03-01',
          balance: 5000,
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      ledgerEntries: [],
      eventOverrides: [],
    });
  });

  it('会在图表定位横幅中展示全部发生日，并支持直接切换到指定日期', async () => {
    const wrapper = mountPanel();

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();

    expect(wrapper.text()).toContain('已定位到「房租」');
    expect(wrapper.text()).toContain('当前时间窗内发生日：2026-03-10、当前：2026-04-10、2026-05-10');

    const chips = wrapper.findAll('.focus-date-chip');
    expect(chips.length).toBeGreaterThanOrEqual(3);
    expect(chips.slice(0, 3).map((chip) => chip.text())).toEqual(['2026-03-10', '2026-04-10', '2026-05-10']);
    expect(chips[1].classes()).toContain('active');

    await chips[0].trigger('click');
    await nextTick();

    expect(wrapper.emitted('focus-chart-date')?.at(-1)).toEqual(['2026-03-10']);
    expect(wrapper.text()).toContain('当前时间窗内发生日：当前：2026-03-10、2026-04-10、2026-05-10');
    expect(wrapper.findAll('.focus-date-chip')[0].classes()).toContain('active');
  });

  it('仍保留上一个/下一个日期切换能力', async () => {
    const wrapper = mountPanel();

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();

    const buttons = wrapper.findAll('.focus-banner-actions button');
    const prevButton = buttons.find((button) => button.text() === '上一个日期');
    const nextButton = buttons.find((button) => button.text() === '下一个日期');

    expect(prevButton?.attributes('disabled')).toBeUndefined();
    expect(nextButton?.attributes('disabled')).toBeUndefined();

    await nextButton?.trigger('click');
    await nextTick();

    expect(wrapper.emitted('focus-chart-date')?.at(-1)).toEqual(['2026-05-10']);
    expect(wrapper.text()).toContain('图表已跳到 2026-05-10（第 3 / 12 次发生');
  });

  it('会把事件编辑结果真正写回 store，并提示成功', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    await wrapper.find('.edit-trigger').trigger('click');
    await nextTick();

    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(true);
    expect(wrapper.find('.editing-name').text()).toBe('房租');

    await wrapper.find('.submit-edit').trigger('click');
    await nextTick();

    const updated = store.events.find((event) => event.id === 'evt-rent');
    expect(updated?.name).toBe('更新后的房租');
    expect(updated?.amount).toBe(3200);
    expect(updated?.monthlyDay).toBe(12);
    expect(messageSuccess).toHaveBeenCalledWith('已更新事件');
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(false);
  });

  it('编辑失败时会保留弹窗并展示明确错误', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    await wrapper.find('.edit-trigger').trigger('click');
    await nextTick();

    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(true);

    await wrapper.find('.submit-invalid-edit').trigger('click');
    await nextTick();

    expect(store.events.find((event) => event.id === 'evt-rent')?.name).toBe('房租');
    expect(messageError).toHaveBeenCalledWith('事件名称不能为空');
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(true);
    expect(wrapper.find('.submit-error').text()).toContain('事件名称不能为空');
    expect(wrapper.find('.editing-name').text()).toBe('房租');
  });

  it('新增失败时会保留弹窗并展示明确错误', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    const actionButtons = wrapper.findAll('.panel-actions button');
    const addButton = actionButtons.find((button) => button.text() === '添加事件');
    await addButton?.trigger('click');
    await nextTick();

    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(true);
    expect(wrapper.find('.editing-name').text()).toBe('new');

    await wrapper.find('.submit-invalid-create').trigger('click');
    await nextTick();

    expect(store.events).toHaveLength(2);
    expect(messageError).toHaveBeenCalledWith('事件名称不能为空');
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(true);
    expect(wrapper.find('.submit-error').text()).toContain('事件名称不能为空');
    expect(wrapper.find('.editing-name').text()).toBe('new');
  });

  it('新增成功时会写入 store 并关闭弹窗', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    const actionButtons = wrapper.findAll('.panel-actions button');
    const addButton = actionButtons.find((button) => button.text() === '添加事件');
    await addButton?.trigger('click');
    await nextTick();

    await wrapper.find('.submit-create').trigger('click');
    await nextTick();

    const created = store.events.find((event) => event.name === '兼职收入');
    expect(created).toBeTruthy();
    expect(created?.category).toBe('income');
    expect(created?.monthlyDay).toBe(18);
    expect(messageSuccess).toHaveBeenCalledWith('已添加事件');
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(false);
  });

  it('会在切换启用状态时真正更新 store', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    expect(store.events.find((event) => event.id === 'evt-rent')?.enabled).toBe(true);

    await wrapper.find('.toggle-trigger').trigger('click');
    await nextTick();

    expect(store.events.find((event) => event.id === 'evt-rent')?.enabled).toBe(false);
  });

  it('删除事件时会走确认框，并在确认后清掉 store 与当前焦点', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();
    expect(wrapper.text()).toContain('已定位到「房租」');

    await wrapper.find('.delete-trigger').trigger('click');
    expect(modalConfirm).toHaveBeenCalledTimes(1);

    const confirmOptions = modalConfirm.mock.calls[0]?.[0] as { title: string; onOk: () => void };
    expect(confirmOptions.title).toContain('删除「房租」？');

    confirmOptions.onOk();
    await nextTick();

    expect(store.events.some((event) => event.id === 'evt-rent')).toBe(false);
    expect(messageSuccess).toHaveBeenCalledWith('已删除事件');
    expect(wrapper.text()).not.toContain('已定位到「房租」');
    expect(wrapper.emitted('clear-focus')).toBeTruthy();
  });

  it('载入示例时会要求正确口令，错误输入不覆盖本地事件', async () => {
    const store = useFinanceStore();
    const originalNames = store.events.map((event) => event.name);
    const wrapper = mountPanel();

    const actionButtons = wrapper.findAll('.panel-actions button');
    const loadSamplesButton = actionButtons.find((button) => button.text() === '载入示例');
    await loadSamplesButton?.trigger('click');

    expect(modalConfirm).toHaveBeenCalledTimes(1);
    const confirmOptions = modalConfirm.mock.calls[0]?.[0] as {
      content: { children?: Array<{ props?: { onInput?: (event: Event) => void } }> };
      onOk: () => Promise<unknown>;
    };

    const inputNode = confirmOptions.content.children?.[2];
    inputNode?.props?.onInput?.({ target: { value: '不是口令' } } as unknown as Event);

    await expect(confirmOptions.onOk()).rejects.toBeUndefined();
    expect(messageError).toHaveBeenCalledWith('输入的文字不正确，操作已取消');
    expect(store.events.map((event) => event.name)).toEqual(originalNames);
  });

  it('载入示例在口令正确时会覆盖当前事件并提示成功', async () => {
    const store = useFinanceStore();
    const wrapper = mountPanel();

    await wrapper.find('.focus-chart-trigger').trigger('click');
    await nextTick();

    const actionButtons = wrapper.findAll('.panel-actions button');
    const loadSamplesButton = actionButtons.find((button) => button.text() === '载入示例');
    await loadSamplesButton?.trigger('click');

    const confirmOptions = modalConfirm.mock.calls[0]?.[0] as {
      content: { children?: Array<{ props?: { onInput?: (event: Event) => void } }> };
      onOk: () => void;
    };

    const inputNode = confirmOptions.content.children?.[2];
    inputNode?.props?.onInput?.({ target: { value: '载入示例' } } as unknown as Event);
    confirmOptions.onOk();
    await nextTick();

    expect(messageSuccess).toHaveBeenCalledWith('已载入示例数据');
    expect(store.events.length).toBeGreaterThan(2);
    expect(store.events.some((event) => event.name === '房租')).toBe(false);
    expect(wrapper.text()).not.toContain('已定位到「房租」');
    expect(wrapper.emitted('clear-focus')).toBeTruthy();
  });

  it('多账户只读视图会显示原因横幅，并阻止编辑类操作透传到 store', async () => {
    const store = useFinanceStore();
    store.$patch({
      viewMode: 'multi',
      multiAccountSelection: ['acc-main'],
    });

    const wrapper = mountPanel();

    expect(wrapper.text()).toContain('当前事件列表为只读');
    expect(wrapper.text()).toContain('多账户汇总视图只支持查看与定位');

    const originalEvent = store.events.find((event) => event.id === 'evt-rent');
    expect(originalEvent?.enabled).toBe(true);

    await wrapper.find('.edit-trigger').trigger('click');
    await nextTick();
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(false);

    await wrapper.find('.toggle-trigger').trigger('click');
    await nextTick();

    await wrapper.find('.delete-trigger').trigger('click');
    await nextTick();

    const actionButtons = wrapper.findAll('.panel-actions button');
    const loadSamplesButton = actionButtons.find((button) => button.text() === '载入示例');
    await loadSamplesButton?.trigger('click');

    expect(store.events.find((event) => event.id === 'evt-rent')?.enabled).toBe(true);
    expect(store.events.some((event) => event.id === 'evt-rent')).toBe(true);
    expect(modalConfirm).not.toHaveBeenCalled();
    expect(messageInfo).toHaveBeenCalled();
    expect(messageInfo.mock.calls.every(([text]) => String(text).includes('多账户汇总视图只支持查看与定位'))).toBe(true);
  });

  it('历史快照只读视图会展示原因横幅，并禁用新增按钮', async () => {
    const store = useFinanceStore();
    store.$patch({
      snapshots: [
      {
        id: 'snap-old',
        accountId: 'acc-main',
        date: '2026-02-01',
        balance: 4800,
        source: 'manual',
        note: '旧快照',
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      {
        id: 'snap-new',
        accountId: 'acc-main',
        date: '2026-03-01',
        balance: 5000,
        source: 'manual',
        note: '最新快照',
        createdAt: '2026-03-01T00:00:00.000Z',
      },
    ],
    });
    store.setViewSnapshot('snap-old');

    const wrapper = mountPanel();
    expect(wrapper.text()).toContain('历史快照视图只用于回看已冻结结果');

    const actionButtons = wrapper.findAll('.panel-actions button');
    const addButton = actionButtons.find((button) => button.text() === '添加事件');
    const loadSamplesButton = actionButtons.find((button) => button.text() === '载入示例');

    expect(addButton?.attributes('disabled')).toBeDefined();
    expect(loadSamplesButton?.attributes('disabled')).toBeDefined();
    expect(wrapper.find('.event-form-modal-stub').exists()).toBe(false);
  });
});
