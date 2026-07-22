import { useEffect, useMemo, useState } from 'react';
import { VChart } from '@visactor/react-vchart';
import type { ISpec } from '@visactor/react-vchart';
import { Button } from '@douyinfe/semi-ui';
import { IconEyeClosed, IconEyeOpened, IconRefresh } from '@douyinfe/semi-icons';
import EmptyState from '@/components/common/EmptyState';
import { TOTAL_NAME, useChartData } from '@/hooks/useChartData';
import { useStore } from '@/store/useStore';

const PALETTE = {
  light: { axis: '#64748b', grid: 'rgba(100,116,139,0.12)', bg: '#ffffff' },
  dark: { axis: '#94a3b8', grid: 'rgba(148,163,184,0.16)', bg: '#1c1f26' },
} as const;

interface Props {
  onDayClick?: (date: string) => void;
  /** 聚焦查看的单个账户；为空展示总资产 + 各账户 */
  accountId?: string | null;
}

export default function BalanceChart({ onDayClick, accountId }: Props) {
  const { values, series, labelToDate, from, to, todayLabel } = useChartData(accountId);
  const theme = useStore((s) => s.theme);
  const showLabels = useStore((s) => s.showChartLabels);
  const toggleChartLabels = useStore((s) => s.toggleChartLabels);
  const granularity = useStore((s) => s.granularity);
  const [zoomKey, setZoomKey] = useState(0);

  // 数据视窗维度变化时（范围/粒度/可见账户）自动复位缩放，避免上次缩放百分比裁剪新数据
  useEffect(() => {
    setZoomKey((k) => k + 1);
  }, [from, to, granularity]);

  const spec = useMemo<ISpec>(() => {
    const c = PALETTE[theme];
    const futureEnd = values.reduce<{ date: string; time: string } | null>(
      (latest, value) => (!latest || value.date > latest.date ? { date: value.date, time: value.time } : latest),
      null,
    );
    const hasForecast = values.some((value) => value.phase === 'forecast');
    return {
      type: 'line',
      autoFit: true,
      background: 'transparent',
      data: [{ id: 'balance', values }],
      xField: 'time',
      yField: 'value',
      seriesField: 'type',
      color: series.map((s) => s.color),
      line: {
        style: {
          lineWidth: (datum: Record<string, unknown>) => datum?.type === TOTAL_NAME ? 3 : 1.8,
          curveType: 'monotone',
          lineDash: (datum: Record<string, unknown>) => datum?.phase === 'forecast' ? [7, 5] : [],
          strokeOpacity: (datum: Record<string, unknown>) => datum?.type === TOTAL_NAME ? 1 : 0.78,
        },
      },
      point: {
        visible: false,
        state: { hover: { size: 8 } },
      },
      ...(showLabels && {
        label: {
          visible: true,
          position: 'top',
          overlap: { hideOnHit: true },
          style: { fontSize: 10, fontWeight: 500, fill: c.axis },
          formatMethod: (_text: string | string[], datum?: Record<string, unknown>) =>
            `¥${Number((datum?.value as number) ?? 0).toLocaleString('zh-CN')}`,
        },
      }),
      crosshair: { xField: { visible: true, line: { type: 'line' } } },
      tooltip: {
        dimension: {
          title: { value: (d) => `${d?.time} · ${d?.phase === 'forecast' ? '预测' : '历史'}` },
          content: [
            {
              key: (d) => d?.type,
              value: (d) => `¥${Number(d?.value ?? 0).toLocaleString('zh-CN')}`,
            },
          ],
        },
        mark: {
          title: { value: (d) => `${d?.time} · ${d?.phase === 'forecast' ? '预测' : '历史'}` },
          content: [
            {
              key: (d) => d?.type,
              value: (d) => `¥${Number(d?.value ?? 0).toLocaleString('zh-CN')}`,
            },
          ],
        },
      },
      ...(todayLabel && {
        markLine: [
          {
            x: todayLabel,
            interactive: false,
            line: { style: { stroke: c.axis, lineDash: [4, 4], strokeOpacity: 0.7 } },
            label: {
              visible: true,
              text: '今天',
              position: 'end',
              style: { fill: c.axis, fontSize: 11, fontWeight: 600 },
              labelBackground: { visible: false },
            },
          },
        ],
      }),
      ...(todayLabel && hasForecast && futureEnd && {
        markArea: [
          {
            x: todayLabel,
            x1: futureEnd.time,
            interactive: false,
            area: { style: { fill: c.axis, fillOpacity: theme === 'dark' ? 0.07 : 0.04 } },
            label: { visible: false },
          },
        ],
      }),
      dataZoom: [
        {
          orient: 'bottom',
          filterMode: 'filter',
          roamDrag: true,
          roamZoom: false,
          showDetail: true,
          height: 28,
        },
      ],
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
  }, [values, series, theme, showLabels]);

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
      <div className="chart-host__hint">
        <div className="chart-phase-legend" aria-label="曲线阶段说明">
          <span><i className="chart-phase-line" />历史</span>
          <span><i className="chart-phase-line chart-phase-line--forecast" />预测</span>
        </div>
        <div className="chart-host__hint-actions">
          <Button
            size="small"
            theme="borderless"
            type={showLabels ? 'primary' : 'tertiary'}
            icon={showLabels ? <IconEyeOpened /> : <IconEyeClosed />}
            onClick={toggleChartLabels}
          >
            {showLabels ? '隐藏金额' : '显示金额'}
          </Button>
          <Button
            size="small"
            theme="borderless"
            type="tertiary"
            icon={<IconRefresh />}
            onClick={() => setZoomKey((k) => k + 1)}
          >
            重置缩放
          </Button>
        </div>
      </div>
      <div className="chart-host__canvas">
        <VChart key={zoomKey} spec={spec} onDimensionClick={handleDimensionClick} />
      </div>
    </div>
  );
}
