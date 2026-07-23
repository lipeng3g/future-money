import { useEffect, useState } from 'react';
import { formatMoney } from '@/utils/money';

const MAX_VISIBLE_ROWS = 100;
const HEAD_ROWS = 80;
const TAIL_ROWS = 20;

interface Props {
  dates: string[];
  amount: number;
  title?: string;
}

interface PreviewRow {
  date: string;
  index: number;
}

export default function RecurrencePreviewList({ dates, amount, title = '生成数据预览' }: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [dates]);

  const rows: Array<PreviewRow | null> =
    dates.length <= MAX_VISIBLE_ROWS
      ? dates.map((date, index) => ({ date, index }))
      : [
          ...dates.slice(0, HEAD_ROWS).map((date, index) => ({ date, index })),
          null,
          ...dates.slice(-TAIL_ROWS).map((date, offset) => ({
            date,
            index: dates.length - TAIL_ROWS + offset,
          })),
        ];
  const omitted = Math.max(0, dates.length - MAX_VISIBLE_ROWS);

  return (
    <div className={`recurrence-preview${expanded ? ' is-expanded' : ''}`}>
      <div className="recurrence-preview__head">
        <span className="recurrence-preview__heading">
          <strong>{title}</strong>
          {dates.length > 0 && (
            <span>{dates[0]} ～ {dates.at(-1)}</span>
          )}
        </span>
        <span>共 {dates.length} 笔</span>
      </div>
      <div className="recurrence-preview__list" role="table" aria-label={title}>
        <div className="recurrence-preview__row recurrence-preview__row--head" role="row">
          <span role="columnheader">序号</span>
          <span role="columnheader">日期</span>
          <span role="columnheader">金额</span>
        </div>
        {rows.map((row) =>
          row ? (
            <div className="recurrence-preview__row" role="row" key={`${row.index}-${row.date}`}>
              <span role="cell">{row.index + 1}</span>
              <span role="cell" className="mono-num">{row.date}</span>
              <span
                role="cell"
                className={`mono-num ${amount >= 0 ? 'amount-pos' : 'amount-neg'}`}
              >
                {formatMoney(amount, { withSign: true })}
              </span>
            </div>
          ) : (
            <div className="recurrence-preview__omitted" key="omitted">
              中间省略 {omitted} 笔
            </div>
          ),
        )}
      </div>
      <div className="recurrence-preview__foot">
        <span>
          {omitted > 0
            ? `显示前 ${HEAD_ROWS} 笔和后 ${TAIL_ROWS} 笔，中间省略 ${omitted} 笔`
            : '可滚动核对每一笔日期与金额'}
        </span>
        <button
          type="button"
          className="recurrence-preview__toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? '收起预览' : '展开预览'}
        </button>
      </div>
    </div>
  );
}
