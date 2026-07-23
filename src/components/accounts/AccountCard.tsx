import { Button, Popconfirm, Tag, Tooltip } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconArchive, IconUndo } from '@douyinfe/semi-icons';
import type React from 'react';
import type { Account, Money } from '@/types';
import { useStore } from '@/store/useStore';
import { formatMoney } from '@/utils/money';

interface Props {
  account: Account;
  /** 当前余额（分），由父级批量计算后传入 */
  balance: Money;
  onEdit: (account: Account) => void;
  /** 是否处于聚焦态 */
  focused?: boolean;
  /** 点击卡片切换聚焦 */
  onFocus?: () => void;
}

export default function AccountCard({ account, balance, onEdit, focused, onFocus }: Props) {
  const categories = useStore((s) => s.categories);
  const archiveAccount = useStore((s) => s.archiveAccount);
  const removeAccount = useStore((s) => s.removeAccount);

  const category = categories.find((c) => c.id === account.categoryId);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFocus?.();
    }
  };

  return (
    <div
      className={`account-card${account.archived ? ' is-archived' : ''}${focused ? ' is-focused' : ''}`}
      role={onFocus ? 'button' : undefined}
      tabIndex={onFocus ? 0 : undefined}
      onClick={onFocus}
      onKeyDown={onFocus ? handleKey : undefined}
      aria-pressed={focused}
      aria-label={`${account.name}，当前余额 ${formatMoney(balance)}`}
      title={`${account.name} · ${formatMoney(balance)}`}
    >
      <span
        className="account-card__avatar"
        style={{ background: account.color }}
        aria-hidden="true"
      >
        {account.name.trim().slice(0, 1) || '账'}
      </span>
      <div className="account-card__content">
        <div className="account-card__head">
          <span className="account-card__name">{account.name}</span>
          {category && (
            <Tag size="small" color="grey">
              {category.name}
            </Tag>
          )}
          {account.archived && (
            <Tag size="small" color="orange">
              已归档
            </Tag>
          )}
        </div>
        <div className="account-card__balance mono-num">{formatMoney(balance)}</div>
      </div>
      <div className="account-card__actions" onClick={(e) => e.stopPropagation()}>
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
