import { useEffect, useMemo, useState } from 'react';
import {
  Banner,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Toast,
} from '@douyinfe/semi-ui';
import type { Frequency, RecurrenceEnd, Transaction } from '@/types';
import { useStore } from '@/store/useStore';
import { addMonths, today } from '@/utils/date';
import { centsToYuan, yuanToCents } from '@/utils/money';
import {
  FREQUENCY_LABELS,
  MAX_OCCURRENCES,
  RECURRING_FREQUENCIES,
  recurrenceDates,
} from '@/utils/recurrence';

interface Props {
  visible: boolean;
  transaction?: Transaction | null;
  defaultDate?: string;
  defaultAccountId?: string;
  onClose: () => void;
}

export default function TransactionFormModal({
  visible,
  transaction,
  defaultDate,
  defaultAccountId,
  onClose,
}: Props) {
  const accounts = useStore((s) => s.accounts);
  const categories = useStore((s) => s.categories);
  const addTransaction = useStore((s) => s.addTransaction);
  const addRecurring = useStore((s) => s.addRecurring);
  const updateTransaction = useStore((s) => s.updateTransaction);

  const isEdit = Boolean(transaction);
  const activeAccounts = accounts.filter((a) => !a.archived);

  const [accountId, setAccountId] = useState<string | undefined>();
  const [date, setDate] = useState(today);
  const [direction, setDirection] = useState<'in' | 'out'>('in');
  const [amount, setAmount] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [interval, setIntervalValue] = useState(1);
  const [endKind, setEndKind] = useState<'count' | 'until'>('count');
  const [count, setCount] = useState(12);
  const [until, setUntil] = useState(() => addMonths(today(), 12));

  useEffect(() => {
    if (!visible) return;
    if (transaction) {
      setAccountId(transaction.accountId);
      setDate(transaction.date);
      setDirection(transaction.amount < 0 ? 'out' : 'in');
      setAmount(Math.abs(centsToYuan(transaction.amount)));
      setCategoryId(transaction.categoryId);
      setNote(transaction.note ?? '');
      setRecurring(false);
    } else {
      setAccountId(defaultAccountId ?? activeAccounts[0]?.id);
      setDate(defaultDate ?? today());
      setDirection('in');
      setAmount(0);
      setCategoryId(undefined);
      setNote('');
      setRecurring(false);
      setFrequency('monthly');
      setIntervalValue(1);
      setEndKind('count');
      setCount(12);
      setUntil(addMonths(today(), 12));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, transaction]);

  const end: RecurrenceEnd =
    endKind === 'count' ? { kind: 'count', count } : { kind: 'until', date: until };

  const preview = useMemo(() => {
    if (!recurring || !accountId) return null;
    const dates = recurrenceDates({
      accountId,
      frequency,
      interval,
      baseAmount: 1,
      startDate: date,
      end,
    });
    return { count: dates.length, first: dates[0], last: dates[dates.length - 1] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurring, accountId, frequency, interval, date, endKind, count, until]);

  const handleOk = () => {
    if (!accountId) {
      Toast.warning('请选择账户');
      return;
    }
    if (!amount || amount <= 0) {
      Toast.warning('请输入大于 0 的金额');
      return;
    }
    const signed = yuanToCents(amount) * (direction === 'out' ? -1 : 1);

    if (isEdit && transaction) {
      updateTransaction(transaction.id, { accountId, date, amount: signed, categoryId, note });
    } else if (recurring) {
      if (preview && preview.count >= MAX_OCCURRENCES) {
        Toast.error(`生成笔数达到上限 ${MAX_OCCURRENCES}，请收紧结束条件`);
        return;
      }
      addRecurring({
        accountId,
        frequency,
        interval,
        baseAmount: signed,
        startDate: date,
        end,
        categoryId,
        note,
      });
    } else {
      addTransaction({ accountId, date, amount: signed, categoryId, note });
    }
    onClose();
  };

  return (
    <Modal
      title={isEdit ? '编辑变动' : '记一笔'}
      visible={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      width={460}
    >
      {activeAccounts.length === 0 ? (
        <Banner type="warning" description="请先创建一个账户再记录变动" />
      ) : (
        <>
          <div className="form-field">
            <label className="form-label">账户</label>
            <Select
              value={accountId}
              onChange={(v) => setAccountId(v as string)}
              style={{ width: '100%' }}
              placeholder="选择账户"
            >
              {activeAccounts.map((a) => (
                <Select.Option key={a.id} value={a.id}>
                  {a.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="form-row">
            <div className="form-field form-field--grow">
              <label className="form-label">方向</label>
              <RadioGroup
                type="button"
                value={direction}
                onChange={(e) => setDirection(e.target.value as 'in' | 'out')}
              >
                <Radio value="in">存入</Radio>
                <Radio value="out">取出</Radio>
              </RadioGroup>
            </div>
            <div className="form-field form-field--grow">
              <label className="form-label">金额（元）</label>
              <InputNumber
                value={amount}
                onNumberChange={setAmount}
                min={0}
                precision={2}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">{recurring ? '起始日期' : '日期'}</label>
            <DatePicker
              type="date"
              value={date}
              onChange={(_, str) => setDate(typeof str === 'string' ? str : date)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-field">
            <label className="form-label">分类（可选）</label>
            <Select
              value={categoryId}
              onChange={(v) => setCategoryId(v as string | undefined)}
              placeholder="不分类"
              style={{ width: '100%' }}
              showClear
            >
              {categories.map((c) => (
                <Select.Option key={c.id} value={c.id}>
                  {c.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="form-field">
            <label className="form-label">备注（可选）</label>
            <Input value={note} onChange={setNote} placeholder="如 工资、房租" maxLength={50} showClear />
          </div>

          {!isEdit && (
            <div className="form-field form-field--inline">
              <span className="form-label">周期重复</span>
              <Switch checked={recurring} onChange={setRecurring} />
            </div>
          )}

          {!isEdit && recurring && (
            <div className="recurrence-box">
              <div className="form-row">
                <div className="form-field form-field--grow">
                  <label className="form-label">频率</label>
                  <Select
                    value={frequency}
                    onChange={(v) => setFrequency(v as Frequency)}
                    style={{ width: '100%' }}
                  >
                    {RECURRING_FREQUENCIES.map((f) => (
                      <Select.Option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                <div className="form-field form-field--grow">
                  <label className="form-label">间隔</label>
                  <InputNumber
                    value={interval}
                    onNumberChange={(v) => setIntervalValue(Math.max(1, v))}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">结束条件</label>
                <RadioGroup
                  value={endKind}
                  onChange={(e) => setEndKind(e.target.value as 'count' | 'until')}
                >
                  <Radio value="count">按次数</Radio>
                  <Radio value="until">按截止日期</Radio>
                </RadioGroup>
              </div>

              {endKind === 'count' ? (
                <InputNumber
                  value={count}
                  onNumberChange={(v) => setCount(Math.max(1, v))}
                  min={1}
                  prefix="共"
                  suffix="笔"
                  style={{ width: '100%' }}
                />
              ) : (
                <DatePicker
                  type="date"
                  value={until}
                  onChange={(_, str) => setUntil(typeof str === 'string' ? str : until)}
                  style={{ width: '100%' }}
                />
              )}

              {preview && (
                <Banner
                  type={preview.count >= MAX_OCCURRENCES ? 'danger' : 'info'}
                  description={
                    preview.count
                      ? `将生成 ${preview.count} 笔，从 ${preview.first} 到 ${preview.last}`
                      : '当前条件不会生成任何记录'
                  }
                  closeIcon={null}
                />
              )}
              <div className="form-hint">提示：按月/季/年重复时，若起始日为月末，将自动对齐到每月最后一天。</div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
