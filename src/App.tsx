import { useState } from 'react';
import AppHeader from '@/components/layout/AppHeader';
import AccountPanel from '@/components/accounts/AccountPanel';
import CategoryManager from '@/components/categories/CategoryManager';
import BalanceChart from '@/components/charts/BalanceChart';
import ChartToolbar from '@/components/charts/ChartToolbar';
import LedgerTable from '@/components/charts/LedgerTable';
import OverviewStats from '@/components/charts/OverviewStats';
import EmptyState from '@/components/common/EmptyState';
import DayDetailModal from '@/components/transactions/DayDetailModal';
import { useStore } from '@/store/useStore';

export default function App() {
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const hasAccounts = useStore((s) => s.accounts.length > 0);

  return (
    <div className="app">
      <AppHeader onManageCategories={() => setCategoryVisible(true)} />

      <main className="app-main">
        <aside className="account-zone">
          <AccountPanel />
        </aside>

        <section className="content-zone">
          {hasAccounts ? (
            <>
              <OverviewStats />
              <div className="chart-card">
                <ChartToolbar />
                <BalanceChart onDayClick={setDayDate} />
              </div>
              <LedgerTable />
            </>
          ) : (
            <div className="onboarding">
              <EmptyState
                title="开始你的资金未来推演"
                description="先在左侧「账户」面板创建第一个账户，再记录收支或周期性变动，即可看到资金走势曲线与未来预测。"
              />
            </div>
          )}
        </section>
      </main>

      <CategoryManager visible={categoryVisible} onClose={() => setCategoryVisible(false)} />
      <DayDetailModal
        visible={dayDate !== null}
        date={dayDate ?? ''}
        onClose={() => setDayDate(null)}
      />
    </div>
  );
}
