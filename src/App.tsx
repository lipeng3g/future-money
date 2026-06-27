import { useState } from 'react';
import { Button, Toast } from '@douyinfe/semi-ui';
import { IconImport } from '@douyinfe/semi-icons';
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
  const loadSeed = useStore((s) => s.loadSeed);

  return (
    <div className="app">
      <AppHeader onManageCategories={() => setCategoryVisible(true)} />

      <main className="app-main">
        {hasAccounts ? (
          <>
            <OverviewStats />
            <AccountPanel />
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
              description="先创建第一个账户，再记录收支或周期性变动，即可看到资金走势曲线与未来预测。也可一键载入示例数据快速体验。"
              action={
                <Button
                  theme="solid"
                  icon={<IconImport />}
                  onClick={() => {
                    loadSeed();
                    Toast.success('已载入示例数据');
                  }}
                >
                  载入示例数据
                </Button>
              }
            />
          </div>
        )}
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
