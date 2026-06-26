import { useMemo, useState } from 'react';
import { Button, Popconfirm, Select, Table, Tag } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconList, IconPlus } from '@douyinfe/semi-icons';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import type { Transaction } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import TransactionFormModal from '@/components/transactions/TransactionFormModal';
import SeriesManageModal from '@/components/transactions/SeriesManageModal';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/utils/money';

interface LedgerRow {
  id: string;
  date: string;
  accountName: string;
  accountColor: string;
  categoryName?: string;
  amount: number;
  note?: string;
  seriesId?: string;
}

interface MonthGroup {
  month: string;
  net: number;
  rows: LedgerRow[];
}

export default function LedgerTable() {
  const transactions = useStore((s) => s.transactions);
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const removeTransaction = useStore((s) => s.removeTransaction);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [manageSeriesId, setManageSeriesId] = useState<string | null>(null);

  const txMap = useMemo(() => new Map(transactions.map((t) => [t.id, t])), [transactions]);
  const openEdit = (id: string) => {
    setEditing(txMap.get(id) ?? null);
    setFormVisible(true);
  };
  const openCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };

  const groups = useMemo<MonthGroup[]>(() => {
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const filtered = transactions
      .filter((t) => (!accountId || t.accountId === accountId) && (!categoryId || t.categoryId === categoryId))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    const map = new Map<string, MonthGroup>();
    for (const t of filtered) {
      const ym = t.date.slice(0, 7);
      const acc = accMap.get(t.accountId);
      const cat = t.categoryId ? catMap.get(t.categoryId) : undefined;
      const group = map.get(ym) ?? { month: ym, net: 0, rows: [] };
      group.rows.push({
        id: t.id,
        date: t.date,
        accountName: acc?.name ?? '—',
        accountColor: acc?.color ?? '#ccc',
        categoryName: cat?.name,
        amount: t.amount,
        note: t.note,
        seriesId: t.seriesId,
      });
      group.net += t.amount;
      map.set(ym, group);
    }
    return [...map.values()];
  }, [transactions, accounts, categories, accountId, categoryId]);

  const columns: ColumnProps<LedgerRow>[] = [
    { title: '日期', dataIndex: 'date', width: 120 },
    {
      title: '账户',
      dataIndex: 'accountName',
      render: (name: string, row) => (
        <span className="ledger-account">
          <span className="account-dot" style={{ background: row.accountColor }} />
          {name}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'categoryName',
      render: (name?: string) => (name ? <Tag size="small" color="grey">{name}</Tag> : '—'),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      align: 'right',
      render: (amount: number) => (
        <span className={`mono-num ${amount >= 0 ? 'amount-pos' : 'amount-neg'}`}>
          {formatMoney(amount, { withSign: true })}
        </span>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      render: (note: string | undefined, row) => (
        <span>
          {note ?? ''}
          {row.seriesId && (
            <Tag
              size="small"
              style={{ marginLeft: 6, cursor: 'pointer' }}
              onClick={() => setManageSeriesId(row.seriesId ?? null)}
            >
              周期
            </Tag>
          )}
        </span>
      ),
    },
    {
      title: '',
      dataIndex: 'id',
      width: 120,
      align: 'right',
      render: (id: string, row) => (
        <span className="ledger-row-actions">
          {row.seriesId && (
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              icon={<IconList />}
              onClick={() => setManageSeriesId(row.seriesId ?? null)}
              aria-label="管理整组"
            />
          )}
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            icon={<IconEdit />}
            onClick={() => openEdit(id)}
            aria-label="编辑"
          />
          <Popconfirm
            title="删除这笔变动"
            okType="danger"
            okText="删除"
            cancelText="取消"
            onConfirm={() => removeTransaction(id)}
          >
            <Button
              size="small"
              theme="borderless"
              type="danger"
              icon={<IconDelete />}
              aria-label="删除"
            />
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <div className="ledger-area">
      <div className="ledger-toolbar">
        <span className="zone-title">账本明细</span>
        <Select
          placeholder="全部账户"
          value={accountId}
          onChange={(v) => setAccountId(v as string | undefined)}
          style={{ width: 140 }}
          showClear
        >
          {accounts.map((a) => (
            <Select.Option key={a.id} value={a.id}>
              {a.name}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="全部分类"
          value={categoryId}
          onChange={(v) => setCategoryId(v as string | undefined)}
          style={{ width: 140 }}
          showClear
        >
          {categories.map((c) => (
            <Select.Option key={c.id} value={c.id}>
              {c.name}
            </Select.Option>
          ))}
        </Select>
        <Button
          theme="solid"
          icon={<IconPlus />}
          onClick={openCreate}
          style={{ marginLeft: 'auto' }}
        >
          记一笔
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="暂无变动记录" description="添加收支后，将按月份在这里展示明细" />
      ) : (
        groups.map((g) => (
          <div className="ledger-group" key={g.month}>
            <div className="ledger-group__head">
              <span>{g.month}</span>
              <span className={`mono-num ${g.net >= 0 ? 'amount-pos' : 'amount-neg'}`}>
                净 {formatMoney(g.net, { withSign: true })}
              </span>
            </div>
            <Table
              columns={columns}
              dataSource={g.rows}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        ))
      )}

      <TransactionFormModal
        visible={formVisible}
        transaction={editing}
        onClose={() => setFormVisible(false)}
      />
      <SeriesManageModal
        visible={manageSeriesId !== null}
        seriesId={manageSeriesId}
        onClose={() => setManageSeriesId(null)}
      />
    </div>
  );
}
