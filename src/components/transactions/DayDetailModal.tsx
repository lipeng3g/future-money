import { useState } from 'react';
import { Button, Popconfirm, SideSheet, Tag } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconPlus } from '@douyinfe/semi-icons';
import type { Transaction } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store/useStore';
import { balanceAt } from '@/utils/balance';
import { formatMoney } from '@/utils/money';
import TransactionFormModal from './TransactionFormModal';

interface Props {
  visible: boolean;
  date: string;
  onClose: () => void;
}

export default function DayDetailModal({ visible, date, onClose }: Props) {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const removeTransaction = useStore((s) => s.removeTransaction);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const active = accounts.filter((a) => !a.archived);
  const dayTxs = transactions.filter((t) => t.date === date);
  const catName = (id?: string) => categories.find((c) => c.id === id)?.name;
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const openCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };
  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setFormVisible(true);
  };

  return (
    <SideSheet title={`${date} 明细`} visible={visible} onCancel={onClose} width={400}>
      <div className="day-detail">
        <div className="day-detail__section-title">当日各账户余额</div>
        <div className="day-detail__balances">
          {active.map((a) => (
            <div className="day-balance" key={a.id}>
              <span className="account-dot" style={{ background: a.color }} />
              <span className="day-balance__name">{a.name}</span>
              <span className="mono-num">{formatMoney(balanceAt(a, transactions, date))}</span>
            </div>
          ))}
        </div>

        <div className="day-detail__section-title">当日变动</div>
        {dayTxs.length === 0 ? (
          <EmptyState title="当天没有变动" />
        ) : (
          <div className="day-detail__list">
            {dayTxs.map((t) => (
              <div className="day-tx" key={t.id}>
                <div className="day-tx__main">
                  <span className="day-tx__account">{accName(t.accountId)}</span>
                  {catName(t.categoryId) && (
                    <Tag size="small" color="grey">
                      {catName(t.categoryId)}
                    </Tag>
                  )}
                  {t.note && <span className="day-tx__note">{t.note}</span>}
                </div>
                <span className={`mono-num ${t.amount >= 0 ? 'amount-pos' : 'amount-neg'}`}>
                  {formatMoney(t.amount, { withSign: true })}
                </span>
                <Button
                  size="small"
                  theme="borderless"
                  type="tertiary"
                  icon={<IconEdit />}
                  onClick={() => openEdit(t)}
                  aria-label="编辑"
                />
                <Popconfirm
                  title="删除这笔变动"
                  okType="danger"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => removeTransaction(t.id)}
                >
                  <Button
                    size="small"
                    theme="borderless"
                    type="danger"
                    icon={<IconDelete />}
                    aria-label="删除"
                  />
                </Popconfirm>
              </div>
            ))}
          </div>
        )}

        <Button block theme="solid" icon={<IconPlus />} onClick={openCreate} style={{ marginTop: 12 }}>
          新增变动
        </Button>
      </div>

      <TransactionFormModal
        visible={formVisible}
        transaction={editing}
        defaultDate={date}
        onClose={() => setFormVisible(false)}
      />
    </SideSheet>
  );
}
