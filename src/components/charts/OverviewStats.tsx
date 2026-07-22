import { useMemo, type ReactNode } from 'react';
import {
  IconActivity,
  IconArrowDown,
  IconArrowUp,
  IconCoinMoneyStroked,
  IconHistogram,
} from '@douyinfe/semi-icons';
import { parseRange } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';
import { balancesAt } from '@/utils/balance';
import { today } from '@/utils/date';
import { formatMoney } from '@/utils/money';

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'up' | 'down';
  icon?: ReactNode;
}

function Stat({ label, value, hint, tone, icon }: StatProps) {
  return (
    <div className="stat fm-card">
      {icon && <div className="stat__icon">{icon}</div>}
      <div className="stat__body">
        <div className="stat__label">{label}</div>
        <div className={`stat__value mono-num${tone ? ` stat__value--${tone}` : ''}`}>
          {tone === 'up' && <IconArrowUp size="small" />}
          {tone === 'down' && <IconArrowDown size="small" />}
          {value}
        </div>
        {hint && <div className="stat__hint">{hint}</div>}
      </div>
    </div>
  );
}

export default function OverviewStats({ accountId }: { accountId?: string | null }) {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const rangePreset = useStore((s) => s.rangePreset);
  const customFrom = useStore((s) => s.customFrom);
  const customTo = useStore((s) => s.customTo);

  const stats = useMemo(() => {
    const active = accounts.filter((a) => !a.archived);
    const target = accountId ? active.filter((a) => a.id === accountId) : active;
    const targetIds = new Set(target.map((a) => a.id));
    const { to } = parseRange(rangePreset, customFrom, customTo);
    const now = today();
    const ym = now.slice(0, 7);

    const sum = (map: Map<string, number>) =>
      target.reduce((total, a) => total + (map.get(a.id) ?? 0), 0);
    const current = sum(balancesAt(target, transactions, now));
    const forecast = sum(balancesAt(target, transactions, to));
    const monthNet = transactions
      .filter((t) => targetIds.has(t.accountId) && t.date.slice(0, 7) === ym)
      .reduce((total, t) => total + t.amount, 0);

    return { current, forecast, monthNet, to };
  }, [accounts, transactions, rangePreset, customFrom, customTo, accountId]);

  return (
    <div className="overview-bar">
      <Stat
        label={accountId ? '当前余额' : '当前总资产'}
        value={formatMoney(stats.current)}
        icon={<IconCoinMoneyStroked />}
      />
      <Stat
        label="期末预测"
        value={formatMoney(stats.forecast)}
        hint={`至 ${stats.to}`}
        icon={<IconHistogram />}
      />
      <Stat
        label="本月净流"
        value={formatMoney(stats.monthNet, { withSign: true })}
        tone={stats.monthNet >= 0 ? 'up' : 'down'}
        icon={<IconActivity />}
      />
    </div>
  );
}
