import { Button, DatePicker, Radio, RadioGroup, Select } from '@douyinfe/semi-ui';
import { IconHistory } from '@douyinfe/semi-icons';
import type { Granularity } from '@/types';
import { TOTAL_NAME } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';

const RANGES = [
  { label: '过去 3 月 ~ 今后 1 年', value: 'P3M-F12M' },
  { label: '过去 1 年 ~ 今后 1 年', value: 'P12M-F12M' },
  { label: '今后 1 年', value: 'P0M-F12M' },
  { label: '今后 2 年', value: 'P0M-F24M' },
  { label: '今后 5 年', value: 'P0M-F60M' },
  { label: '今后 10 年', value: 'P0M-F120M' },
  { label: '今后 20 年', value: 'P0M-F240M' },
  { label: '过去 5 年 ~ 今后 5 年', value: 'P60M-F60M' },
  { label: '自定义范围', value: 'custom' },
];
const TOTAL_COLOR = '#64748b';

export default function ChartToolbar({ accountId }: { accountId?: string | null }) {
  const granularity = useStore((s) => s.granularity);
  const setGranularity = useStore((s) => s.setGranularity);
  const rangePreset = useStore((s) => s.rangePreset);
  const setRangePreset = useStore((s) => s.setRangePreset);
  const customFrom = useStore((s) => s.customFrom);
  const customTo = useStore((s) => s.customTo);
  const setCustomRange = useStore((s) => s.setCustomRange);
  const showTotal = useStore((s) => s.showTotal);
  const toggleTotal = useStore((s) => s.toggleTotal);
  const accounts = useStore((s) => s.accounts);
  const visibleAccountIds = useStore((s) => s.visibleAccountIds);
  const setVisibleAccountIds = useStore((s) => s.setVisibleAccountIds);

  const active = accounts.filter((a) => !a.archived);
  const allIds = active.map((a) => a.id);
  const effective = visibleAccountIds.length ? visibleAccountIds : allIds;

  const handleToggleAccount = (id: string) => {
    const next = effective.includes(id)
      ? effective.filter((x) => x !== id)
      : [...effective, id];
    setVisibleAccountIds(next.length === allIds.length ? [] : next);
  };

  return (
    <div className="chart-toolbar">
      <div className="chart-toolbar__row">
        <RadioGroup
          type="button"
          value={granularity}
          onChange={(e) => setGranularity(e.target.value as Granularity)}
        >
          <Radio value="day">日</Radio>
          <Radio value="week">周</Radio>
          <Radio value="month">月</Radio>
        </RadioGroup>
        <Select
          value={rangePreset}
          onChange={(v) => setRangePreset(v as string)}
          style={{ width: 210 }}
        >
          {RANGES.map((r) => (
            <Select.Option key={r.value} value={r.value}>
              {r.label}
            </Select.Option>
          ))}
        </Select>
        <Button
          size="small"
          theme="borderless"
          type={rangePreset === 'P12M-F12M' ? 'primary' : 'tertiary'}
          icon={<IconHistory />}
          onClick={() => setRangePreset('P12M-F12M')}
        >
          前后一年
        </Button>
        {rangePreset === 'custom' && (
          <DatePicker
            type="dateRange"
            density="compact"
            value={customFrom && customTo ? [customFrom, customTo] : undefined}
            onChange={(_, str) => {
              const [from, to] = str as string[];
              if (from && to) setCustomRange(from, to);
            }}
            style={{ width: 260 }}
          />
        )}
      </div>

      {!accountId && active.length > 0 && (
        <div className="chart-toolbar__chips">
          <button
            type="button"
            className={`chip${showTotal ? ' is-on' : ''}`}
            onClick={toggleTotal}
          >
            <span className="account-dot" style={{ background: TOTAL_COLOR }} />
            {TOTAL_NAME}
          </button>
          {active.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`chip${effective.includes(a.id) ? ' is-on' : ''}`}
              onClick={() => handleToggleAccount(a.id)}
            >
              <span className="account-dot" style={{ background: a.color }} />
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
