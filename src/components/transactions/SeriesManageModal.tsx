import { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Checkbox,
  Input,
  InputNumber,
  Popconfirm,
  Radio,
  RadioGroup,
  Select,
  SideSheet,
  Table,
  Toast,
} from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useStore } from '@/store/useStore';
import { today } from '@/utils/date';
import { formatMoney, yuanToCents } from '@/utils/money';
import { extendRecurrence, formatRecurrenceRule } from '@/utils/recurrence';
import RecurrencePreviewList from './RecurrencePreviewList';

interface Props {
  visible: boolean;
  seriesId: string | null;
  onClose: () => void;
}

interface Row {
  id: string;
  date: string;
  amount: number;
  categoryName: string;
  note: string;
}

export default function SeriesManageModal({ visible, seriesId, onClose }: Props) {
  const series = useStore((s) => s.series);
  const transactions = useStore((s) => s.transactions);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts);
  const batchUpdate = useStore((s) => s.batchUpdateTransactions);
  const batchDelete = useStore((s) => s.batchDeleteTransactions);
  const extendRecurring = useStore((s) => s.extendRecurring);

  const target = series.find((s) => s.id === seriesId);

  const rows = useMemo<Row[]>(() => {
    const catMap = new Map(categories.map((c) => [c.id, c.name]));
    return transactions
      .filter((t) => t.seriesId === seriesId)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
      .map((t) => ({
        id: t.id,
        date: t.date,
        amount: t.amount,
        categoryName: t.categoryId ? catMap.get(t.categoryId) ?? '—' : '—',
        note: t.note ?? '',
      }));
  }, [transactions, categories, seriesId]);

  const [selected, setSelected] = useState<string[]>([]);
  const [editAmount, setEditAmount] = useState(false);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState(0);
  const [editCategory, setEditCategory] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState<string | undefined>();
  const [extendCount, setExtendCount] = useState(12);
  const [extendConfirmVisible, setExtendConfirmVisible] = useState(false);
  const [extendDirection, setExtendDirection] = useState<'in' | 'out'>('in');
  const [extendAmount, setExtendAmount] = useState(0);
  const [extendCategoryId, setExtendCategoryId] = useState<string | undefined>();
  const [extendNote, setExtendNote] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSelected(rows.map((r) => r.id));
    setEditAmount(false);
    setEditCategory(false);
    setAmount(0);
    setNewCategoryId(undefined);
    setDirection('in');
    setExtendCount(12);
    setExtendConfirmVisible(false);
    setExtendDirection((target?.baseAmount ?? 0) < 0 ? 'out' : 'in');
    setExtendAmount(Math.abs((target?.baseAmount ?? 0) / 100));
    setExtendCategoryId(target?.categoryId);
    setExtendNote(target?.note ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, seriesId]);

  const t0 = today();
  const selectAll = () => setSelected(rows.map((r) => r.id));
  const invert = () => {
    const set = new Set(selected);
    setSelected(rows.filter((r) => !set.has(r.id)).map((r) => r.id));
  };
  const onlyFuture = () => setSelected(rows.filter((r) => r.date >= t0).map((r) => r.id));
  const onlyPast = () => setSelected(rows.filter((r) => r.date < t0).map((r) => r.id));

  const accName = accounts.find((a) => a.id === target?.accountId)?.name ?? '—';
  const latestDate = rows[rows.length - 1]?.date;
  const extensionPreview = useMemo(
    () => (target ? extendRecurrence(target, latestDate, extendCount) : null),
    [target, latestDate, extendCount],
  );
  const extendSignedAmount =
    yuanToCents(extendAmount || 0) * (extendDirection === 'out' ? -1 : 1);

  const handleUpdate = () => {
    if (selected.length === 0) {
      Toast.warning('请先选择要修改的记录');
      return;
    }
    if (!editAmount && !editCategory) {
      Toast.warning('请勾选要修改的内容');
      return;
    }
    const patch: { amount?: number; categoryId?: string } = {};
    if (editAmount) {
      if (!amount || amount <= 0) {
        Toast.warning('请输入大于 0 的金额');
        return;
      }
      patch.amount = yuanToCents(amount) * (direction === 'out' ? -1 : 1);
    }
    if (editCategory) patch.categoryId = newCategoryId;
    batchUpdate(selected, patch);
    Toast.success(`已修改 ${selected.length} 笔`);
    onClose();
  };

  const handleDelete = () => {
    batchDelete(selected);
    Toast.success(`已删除 ${selected.length} 笔`);
    onClose();
  };

  const handleExtend = () => {
    if (!target) return;
    if (!extendAmount || extendAmount <= 0) {
      Toast.warning('请输入大于 0 的续期金额');
      return;
    }
    const result = extendRecurring(target.id, extendCount, {
      baseAmount: extendSignedAmount,
      categoryId: extendCategoryId,
      note: extendNote.trim() || undefined,
    });
    if (!result.added) {
      Toast.warning('没有生成新的周期记录');
      return;
    }
    Toast.success(`已新增 ${result.added} 笔，生成至 ${result.last}`);
    setExtendConfirmVisible(false);
    onClose();
  };

  const columns: ColumnProps<Row>[] = [
    { title: '日期', dataIndex: 'date', width: 120 },
    {
      title: '金额',
      dataIndex: 'amount',
      align: 'right',
      render: (v: number) => (
        <span className={`mono-num ${v >= 0 ? 'amount-pos' : 'amount-neg'}`}>
          {formatMoney(v, { withSign: true })}
        </span>
      ),
    },
    { title: '分类', dataIndex: 'categoryName' },
    { title: '备注', dataIndex: 'note', render: (n: string) => n || '—' },
  ];

  const footer = extendConfirmVisible ? (
    <div className="sheet-footer">
      <Button onClick={() => setExtendConfirmVisible(false)}>返回修改</Button>
      <Button theme="solid" onClick={handleExtend}>
        生成 {extensionPreview?.dates.length ?? 0} 笔
      </Button>
    </div>
  ) : (
    <div className="sheet-footer sheet-footer--split">
      <Popconfirm
        title={`删除选中的 ${selected.length} 笔记录`}
        okType="danger"
        okText="删除"
        cancelText="取消"
        disabled={selected.length === 0}
        onConfirm={handleDelete}
      >
        <Button theme="borderless" type="danger" disabled={selected.length === 0}>
          删除选中
        </Button>
      </Popconfirm>
      <div className="sheet-footer__actions">
        <Button onClick={onClose}>取消</Button>
        <Button theme="solid" onClick={handleUpdate} disabled={selected.length === 0}>
          应用修改
        </Button>
      </div>
    </div>
  );

  return (
    <SideSheet
      title={extendConfirmVisible ? '确认继续生成' : '管理周期组'}
      visible={visible}
      onCancel={extendConfirmVisible ? () => setExtendConfirmVisible(false) : onClose}
      width="min(720px, 100vw)"
      className="product-sheet series-sheet"
      footer={footer}
    >
      {target && !extendConfirmVisible && (
        <div className="series-manage">
          <Banner
            type="info"
            closeIcon={null}
            description={
              `${accName} · ${formatRecurrenceRule(target.frequency, target.interval)}` +
              ` · 基准 ${formatMoney(target.baseAmount, { withSign: true })} · 共 ${rows.length} 笔`
            }
          />

          <div className="series-manage__quick">
            <span className="form-label">快捷选择</span>
            <Button size="small" onClick={selectAll}>全选</Button>
            <Button size="small" onClick={invert}>反选</Button>
            <Button size="small" onClick={onlyFuture}>仅未来</Button>
            <Button size="small" onClick={onlyPast}>仅过去</Button>
            <span className="series-manage__count">已选 {selected.length}/{rows.length}</span>
          </div>

          <Table
            columns={columns}
            dataSource={rows}
            rowKey="id"
            size="small"
            pagination={false}
            scroll={{ y: 260 }}
            rowSelection={{
              selectedRowKeys: selected,
              onChange: (keys) => setSelected((keys ?? []) as string[]),
            }}
          />

          <div className="series-manage__extend">
            <div className="series-manage__extend-copy">
              <div className="series-manage__extend-title">继续生成</div>
              <div className="series-manage__extend-desc">
                当前至 {latestDate ?? '—'}；预计新增 {extensionPreview?.dates.length ?? 0} 笔：
                {extensionPreview?.dates[0] ?? '—'} ～ {extensionPreview?.dates.at(-1) ?? '—'}
              </div>
            </div>
            <InputNumber
              value={extendCount}
              onNumberChange={(value) => setExtendCount(Math.min(5000, Math.max(1, value)))}
              min={1}
              max={5000}
              prefix="新增"
              suffix="期"
              style={{ width: 130 }}
            />
            <Button theme="solid" onClick={() => setExtendConfirmVisible(true)}>
              查看并确认
            </Button>
          </div>

          <div className="series-manage__edit">
            <div className="series-manage__edit-title">批量修改（仅作用于勾选记录）</div>
            <div className="series-manage__edit-row">
              <Checkbox checked={editAmount} onChange={(e) => setEditAmount(Boolean(e.target.checked))}>
                修改金额
              </Checkbox>
              {editAmount && (
                <>
                  <RadioGroup
                    type="button"
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
                  >
                    <Radio value="in">存入</Radio>
                    <Radio value="out">取出</Radio>
                  </RadioGroup>
                  <InputNumber
                    value={amount}
                    onNumberChange={setAmount}
                    min={0}
                    precision={2}
                    prefix="¥"
                    style={{ width: 150 }}
                  />
                </>
              )}
            </div>
            <div className="series-manage__edit-row">
              <Checkbox checked={editCategory} onChange={(e) => setEditCategory(Boolean(e.target.checked))}>
                修改分类
              </Checkbox>
              {editCategory && (
                <Select
                  value={newCategoryId}
                  onChange={(v) => setNewCategoryId(v as string | undefined)}
                  placeholder="不分类"
                  style={{ width: 180 }}
                  showClear
                >
                  {categories.map((c) => (
                    <Select.Option key={c.id} value={c.id}>
                      {c.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
            </div>
          </div>

        </div>
      )}
      {target && extensionPreview && extendConfirmVisible && (
        <div className="series-extend-confirm">
          <Banner
            type="info"
            closeIcon={null}
            description={
              `${accName} · ${formatRecurrenceRule(target.frequency, target.interval)}` +
              ' · 仅新增记录使用以下参数，已有记录保持不变'
            }
          />
          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="form-label">方向</label>
              <RadioGroup
                type="button"
                value={extendDirection}
                onChange={(e) => setExtendDirection(e.target.value as 'in' | 'out')}
              >
                <Radio value="in">存入</Radio>
                <Radio value="out">取出</Radio>
              </RadioGroup>
            </div>
            <div className="form-field form-field--grow">
              <label className="form-label">新批次金额（元）</label>
              <InputNumber
                value={extendAmount}
                onNumberChange={setExtendAmount}
                min={0}
                precision={2}
                prefix="¥"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div className="form-field">
            <label className="form-label">新批次分类（可选）</label>
            <Select
              value={extendCategoryId}
              onChange={(value) => setExtendCategoryId(value as string | undefined)}
              placeholder="不分类"
              style={{ width: '100%' }}
              showClear
            >
              {categories.map((category) => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="form-field">
            <label className="form-label">新批次备注（可选）</label>
            <Input
              value={extendNote}
              onChange={setExtendNote}
              placeholder="如 调薪后工资"
              maxLength={50}
              showClear
            />
          </div>
          <RecurrencePreviewList
            dates={extensionPreview.dates}
            amount={extendSignedAmount}
            title="待新增数据"
          />
        </div>
      )}
    </SideSheet>
  );
}
