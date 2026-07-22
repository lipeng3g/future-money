import { fireEvent, render, screen } from '@testing-library/react';
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SeriesManageModal from '@/components/transactions/SeriesManageModal';
import { useStore } from '@/store/useStore';

vi.mock('@douyinfe/semi-ui', () => {
  const Select = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  Select.Option = ({ children }: { children?: ReactNode }) => <span>{children}</span>;

  return {
    Banner: ({ description }: { description?: ReactNode }) => <div>{description}</div>,
    Button: ({ children, onClick, disabled }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) => (
      <button type="button" onClick={onClick} disabled={disabled}>{children}</button>
    ),
    Checkbox: ({ children }: { children?: ReactNode }) => <label><input type="checkbox" />{children}</label>,
    InputNumber: () => <input type="number" />,
    Modal: ({ children, visible, onOk, okText }: {
      children?: ReactNode;
      visible?: boolean;
      onOk?: () => void;
      okText?: ReactNode;
    }) => visible ? <div>{children}{onOk && <button type="button" onClick={onOk}>{okText}</button>}</div> : null,
    Popconfirm: ({ children }: { children?: ReactNode }) => <>{children}</>,
    Radio: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
    RadioGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Select,
    Table: () => <div />,
    Toast: { success: vi.fn(), warning: vi.fn() },
  };
});

describe('SeriesManageModal', () => {
  beforeEach(() => {
    useStore.getState().resetAll();
  });

  it('展示续期预览并在原周期组追加记录', async () => {
    const seriesId = useStore.getState().addRecurring({
      accountId: 'a1',
      frequency: 'monthly',
      interval: 1,
      baseAmount: 10000,
      startDate: '2026-01-31',
      end: { kind: 'count', count: 2 },
      note: '工资',
    });
    const onClose = vi.fn();

    render(<SeriesManageModal visible seriesId={seriesId} onClose={onClose} />);

    expect(
      await screen.findByText(
        '当前至 2026-02-28；预计新增 12 笔：2026-03-31 ～ 2027-02-28',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看并确认' }));
    expect(await screen.findByRole('table', { name: '待新增数据' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '生成 12 笔' }));

    expect(useStore.getState().transactions).toHaveLength(14);
    expect(useStore.getState().series).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
