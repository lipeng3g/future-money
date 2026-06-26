import { Radio, RadioGroup, Select } from '@douyinfe/semi-ui';
import type { Granularity } from '@/types';
import { TOTAL_NAME } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';

const RANGES = [
  { label: '过去1月 ~ 未来1年', value: 'P1M-F12M' },
  { label: '过去半年 ~ 未来半年', value: 'P6M-F6M' },
  { label: '过去1年 ~ 未来1年', value: 'P12M-F12M' },
  { label: '未来2年', value: 'P0M-F24M' },
];
const TOTAL_COLOR = '#64748b';

export default function ChartToolbar() {
  const granularity = useStore((s) => s.granularity);
  const setGranularity = useStore((s) => s.setGranularity);
  const rangePreset = useStore((s) => s.rangePreset);
  const setRangePreset = useStore((s) => s.setRangePreset);
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
          style={{ width: 200 }}
        >
          {RANGES.map((r) => (
            <Select.Option key={r.value} value={r.value}>
              {r.label}
            </Select.Option>
          ))}
        </Select>
      </div>

      {active.length > 0 && (
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
