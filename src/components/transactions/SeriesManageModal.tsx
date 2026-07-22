import { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  Button,
  Checkbox,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  RadioGroup,
  Select,
  Table,
  Toast,
} from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useStore } from '@/store/useStore';
import { today } from '@/utils/date';
import { formatMoney, yuanToCents } from '@/utils/money';
import { FREQUENCY_LABELS } from '@/utils/recurrence';

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

  useEffect(() => {
    if (!visible) return;
    setSelected(rows.map((r) => r.id));
    setEditAmount(false);
    setEditCategory(false);
    setAmount(0);
    setNewCategoryId(undefined);
    setDirection('in');
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

  return (
    <Modal title="管理周期组" visible={visible} onCancel={onClose} footer={null} width={640}>
      {target && (
        <div className="series-manage">
          <Banner
            type="info"
            closeIcon={null}
            description={
              `${accName} · ${FREQUENCY_LABELS[target.frequency]}（每 ${target.interval} 次）` +
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

          <div className="series-manage__footer">
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
            <div className="series-manage__footer-right">
              <Button onClick={onClose}>取消</Button>
              <Button theme="solid" onClick={handleUpdate} disabled={selected.length === 0}>
                应用修改
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
