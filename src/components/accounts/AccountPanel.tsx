import { useMemo, useState } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';
import type { Account } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store/useStore';
import AccountCard from './AccountCard';
import AccountFormModal from './AccountFormModal';

export default function AccountPanel() {
  const accounts = useStore((s) => s.accounts);
  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const { active, archived } = useMemo(
    () => ({
      active: accounts.filter((a) => !a.archived),
      archived: accounts.filter((a) => a.archived),
    }),
    [accounts],
  );

  const openCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };
  const openEdit = (account: Account) => {
    setEditing(account);
    setFormVisible(true);
  };

  return (
    <div className="account-panel">
      <div className="zone-title">账户</div>

      {accounts.length === 0 ? (
        <EmptyState
          title="还没有账户"
          description="创建你的第一个账户，开始推演未来"
          action={
            <Button theme="solid" icon={<IconPlus />} onClick={openCreate}>
              新建账户
            </Button>
          }
        />
      ) : (
        <>
          {active.map((a) => (
            <AccountCard key={a.id} account={a} onEdit={openEdit} />
          ))}

          {archived.length > 0 && (
            <>
              <div className="account-panel__subtitle">已归档</div>
              {archived.map((a) => (
                <AccountCard key={a.id} account={a} onEdit={openEdit} />
              ))}
            </>
          )}

          <Button block theme="light" icon={<IconPlus />} onClick={openCreate}>
            新建账户
          </Button>
        </>
      )}

      <AccountFormModal
        visible={formVisible}
        account={editing}
        onClose={() => setFormVisible(false)}
      />
    </div>
  );
}
