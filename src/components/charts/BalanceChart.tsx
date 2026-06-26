import { useMemo } from 'react';
import { VChart } from '@visactor/react-vchart';
import type { ISpec } from '@visactor/react-vchart';
import EmptyState from '@/components/common/EmptyState';
import { useChartData } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';

const PALETTE = {
  light: { axis: '#64748b', grid: 'rgba(100,116,139,0.12)' },
  dark: { axis: '#94a3b8', grid: 'rgba(148,163,184,0.16)' },
} as const;

interface Props {
  onDayClick?: (date: string) => void;
}

export default function BalanceChart({ onDayClick }: Props) {
  const { values, series, labelToDate } = useChartData();
  const theme = useStore((s) => s.theme);

  const spec = useMemo<ISpec>(() => {
    const c = PALETTE[theme];
    return {
      type: 'line',
      autoFit: true,
      background: 'transparent',
      data: [{ id: 'balance', values }],
      xField: 'time',
      yField: 'value',
      seriesField: 'type',
      color: series.map((s) => s.color),
      line: { style: { lineWidth: 2, curveType: 'monotone' } },
      point: { visible: false },
      legends: { visible: true, orient: 'top', item: { label: { style: { fill: c.axis } } } },
      tooltip: {
        mark: { content: [{ value: (d) => `¥${Number(d?.value ?? 0).toLocaleString('zh-CN')}` }] },
      },
      axes: [
        { orient: 'bottom', label: { style: { fill: c.axis } } },
        {
          orient: 'left',
          label: {
            style: { fill: c.axis },
            formatMethod: (val) => `¥${Number(val).toLocaleString('zh-CN')}`,
          },
          grid: { visible: true, style: { stroke: c.grid } },
        },
      ],
    };
  }, [values, series, theme]);

  if (!values.length) {
    return (
      <div className="chart-host chart-host--empty">
        <EmptyState title="暂无走势数据" description="创建账户并添加变动后，这里会显示资金走势曲线" />
      </div>
    );
  }

  const handleDimensionClick = (e: { dimensionInfo?: { value?: string }[] }) => {
    const label = e?.dimensionInfo?.[0]?.value;
    if (label && onDayClick) onDayClick(labelToDate[label] ?? label);
  };

  return (
    <div className="chart-host">
      <VChart spec={spec} onDimensionClick={handleDimensionClick} />
    </div>
  );
}
