import { Suspense, lazy, useState } from 'react';
import { Button, Spin, Toast } from '@douyinfe/semi-ui';
import { IconBulb, IconClose } from '@douyinfe/semi-icons';
import AppHeader from '@/components/layout/AppHeader';
import AccountPanel from '@/components/accounts/AccountPanel';
import CategoryManager from '@/components/categories/CategoryManager';
import ChartToolbar from '@/components/charts/ChartToolbar';
import LedgerTable from '@/components/charts/LedgerTable';
import OverviewStats from '@/components/charts/OverviewStats';
import EmptyState from '@/components/common/EmptyState';
import DayDetailModal from '@/components/transactions/DayDetailModal';
import { useStore } from '@/store/useStore';

// VChart 体积较大，按需加载以加快首屏
const BalanceChart = lazy(() => import('@/components/charts/BalanceChart'));

export default function App() {
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [dayDate, setDayDate] = useState<string | null>(null);
  const [focusedAccountId, setFocusedAccountId] = useState<string | null>(null);
  const hasAccounts = useStore((s) => s.accounts.length > 0);
  const loadSeed = useStore((s) => s.loadSeed);
  const accounts = useStore((s) => s.accounts);
  const focusedAccount = focusedAccountId
    ? accounts.find((a) => a.id === focusedAccountId) ?? null
    : null;

  return (
    <div className="app">
      <AppHeader onManageCategories={() => setCategoryVisible(true)} />

      {hasAccounts ? (
        <div className="app-body">
          <aside className="app-sidebar">
            <AccountPanel
              focusedAccountId={focusedAccountId}
              onFocusAccount={setFocusedAccountId}
            />
          </aside>

          <main className="app-main">
            {focusedAccount && (
              <div className="focus-bar fm-card">
                <span className="account-dot" style={{ background: focusedAccount.color }} />
                <span className="focus-bar__text">
                  聚焦查看：<strong>{focusedAccount.name}</strong>
                </span>
                <Button
                  size="small"
                  theme="borderless"
                  type="tertiary"
                  icon={<IconClose />}
                  onClick={() => setFocusedAccountId(null)}
                >
                  查看全部
                </Button>
              </div>
            )}
            <OverviewStats accountId={focusedAccountId} />
            <div className="chart-card fm-card">
              <div className="fm-card__head">
                <span className="zone-title">资金走势</span>
                <span className="fm-card__hint">点击曲线查看当日明细</span>
              </div>
              <ChartToolbar accountId={focusedAccountId} />
              <Suspense
                fallback={
                  <div className="chart-host chart-host--empty">
                    <Spin size="large" />
                  </div>
                }
              >
                <BalanceChart onDayClick={setDayDate} accountId={focusedAccountId} />
              </Suspense>
            </div>
            <LedgerTable accountId={focusedAccountId} />
          </main>
        </div>
      ) : (
        <main className="app-main app-main--onboarding">
          <div className="onboarding">
            <EmptyState
              title="开始你的资金未来推演"
              description="先创建第一个账户，再记录收支或周期性变动，即可看到资金走势曲线与未来预测。也可一键载入示例数据快速体验。"
              action={
                <Button
                  theme="solid"
                  icon={<IconBulb />}
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
        </main>
      )}

      <CategoryManager visible={categoryVisible} onClose={() => setCategoryVisible(false)} />
      <DayDetailModal
        visible={dayDate !== null}
        date={dayDate ?? ''}
        onClose={() => setDayDate(null)}
      />
    </div>
  );
}
