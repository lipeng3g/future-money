import { Button, Popconfirm, Tag, Tooltip } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconArchive, IconUndo } from '@douyinfe/semi-icons';
import type { Account } from '@/types';
import { useStore } from '@/store/useStore';
import { balanceAt } from '@/utils/balance';
import { today } from '@/utils/date';
import { formatMoney } from '@/utils/money';

interface Props {
  account: Account;
  onEdit: (account: Account) => void;
}

export default function AccountCard({ account, onEdit }: Props) {
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const archiveAccount = useStore((s) => s.archiveAccount);
  const removeAccount = useStore((s) => s.removeAccount);

  const balance = balanceAt(account, transactions, today());
  const category = categories.find((c) => c.id === account.categoryId);

  return (
    <div className={`account-card${account.archived ? ' is-archived' : ''}`}>
      <div className="account-card__head">
        <span className="account-dot" style={{ background: account.color }} />
        <span className="account-card__name">{account.name}</span>
        {category && (
          <Tag size="small" color="grey">
            {category.name}
          </Tag>
        )}
      </div>
      <div className="account-card__balance mono-num">{formatMoney(balance)}</div>
      <div className="account-card__actions">
        <Tooltip content="编辑">
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            icon={<IconEdit />}
            onClick={() => onEdit(account)}
            aria-label="编辑账户"
          />
        </Tooltip>
        <Tooltip content={account.archived ? '取消归档' : '归档'}>
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            icon={account.archived ? <IconUndo /> : <IconArchive />}
            onClick={() => archiveAccount(account.id, !account.archived)}
            aria-label={account.archived ? '取消归档' : '归档'}
          />
        </Tooltip>
        <Popconfirm
          title="删除账户"
          content="将同时删除该账户的所有变动记录，不可恢复"
          okType="danger"
          okText="删除"
          cancelText="取消"
          onConfirm={() => removeAccount(account.id)}
        >
          <Tooltip content="删除">
            <Button
              size="small"
              theme="borderless"
              type="danger"
              icon={<IconDelete />}
              aria-label="删除账户"
            />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  );
}
