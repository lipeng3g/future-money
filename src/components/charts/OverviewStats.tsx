import { useMemo } from 'react';
import { parseRange } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';
import { balanceAt } from '@/utils/balance';
import { today } from '@/utils/date';
import { formatMoney } from '@/utils/money';

interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'pos' | 'neg';
}

function Stat({ label, value, hint, tone }: StatProps) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value mono-num${tone ? ` stat__value--${tone}` : ''}`}>{value}</div>
      {hint && <div className="stat__hint">{hint}</div>}
    </div>
  );
}

export default function OverviewStats() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const rangePreset = useStore((s) => s.rangePreset);

  const stats = useMemo(() => {
    const active = accounts.filter((a) => !a.archived);
    const activeIds = new Set(active.map((a) => a.id));
    const { to } = parseRange(rangePreset);
    const now = today();
    const ym = now.slice(0, 7);

    const current = active.reduce((sum, a) => sum + balanceAt(a, transactions, now), 0);
    const forecast = active.reduce((sum, a) => sum + balanceAt(a, transactions, to), 0);
    const monthNet = transactions
      .filter((t) => activeIds.has(t.accountId) && t.date.slice(0, 7) === ym)
      .reduce((sum, t) => sum + t.amount, 0);

    return { current, forecast, monthNet, to };
  }, [accounts, transactions, rangePreset]);

  return (
    <div className="overview-bar">
      <Stat label="当前总资产" value={formatMoney(stats.current)} />
      <Stat label="期末预测" value={formatMoney(stats.forecast)} hint={`至 ${stats.to}`} />
      <Stat
        label="本月净流"
        value={formatMoney(stats.monthNet, { withSign: true })}
        tone={stats.monthNet >= 0 ? 'pos' : 'neg'}
      />
    </div>
  );
}
