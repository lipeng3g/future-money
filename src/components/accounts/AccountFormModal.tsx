import { useEffect, useState } from 'react';
import { DatePicker, Input, InputNumber, Modal, Select, Toast } from '@douyinfe/semi-ui';
import type { Account } from '@/types';
import ColorSwatchPicker from '@/components/common/ColorSwatchPicker';
import { useStore } from '@/store/useStore';
import { today } from '@/utils/date';
import { centsToYuan, yuanToCents } from '@/utils/money';
import { randomColor } from '@/utils/palette';

interface Props {
  visible: boolean;
  account: Account | null;
  onClose: () => void;
}

export default function AccountFormModal({ visible, account, onClose }: Props) {
  const addAccount = useStore((s) => s.addAccount);
  const updateAccount = useStore((s) => s.updateAccount);
  const categories = useStore((s) => s.categories);

  const [name, setName] = useState('');
  const [balance, setBalance] = useState<number>(0);
  const [openingDate, setOpeningDate] = useState(today);
  const [color, setColor] = useState(randomColor);
  const [categoryId, setCategoryId] = useState<string | undefined>();

  useEffect(() => {
    if (!visible) return;
    setName(account?.name ?? '');
    setBalance(account ? centsToYuan(account.openingBalance) : 0);
    setOpeningDate(account?.openingDate ?? today());
    setColor(account?.color ?? randomColor());
    setCategoryId(account?.categoryId);
  }, [visible, account]);

  const handleOk = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Toast.warning('请输入账户名称');
      return;
    }
    const payload = {
      name: trimmed,
      openingBalance: yuanToCents(balance || 0),
      openingDate,
      color,
      categoryId,
    };
    if (account) updateAccount(account.id, payload);
    else addAccount(payload);
    onClose();
  };

  return (
    <Modal
      title={account ? '编辑账户' : '新建账户'}
      visible={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
    >
      <div className="form-field">
        <label className="form-label">名称</label>
        <Input value={name} onChange={setName} placeholder="如 招行现金、理财" maxLength={20} showClear />
      </div>
      <div className="form-field">
        <label className="form-label">初始余额（元）</label>
        <InputNumber
          value={balance}
          onChange={(v) => setBalance(typeof v === 'number' ? v : 0)}
          style={{ width: '100%' }}
          precision={2}
          placeholder="可为负"
        />
      </div>
      <div className="form-field">
        <label className="form-label">起始日期</label>
        <DatePicker
          type="date"
          value={openingDate}
          onChange={(_, str) => setOpeningDate(typeof str === 'string' ? str : openingDate)}
          style={{ width: '100%' }}
        />
      </div>
      <div className="form-field">
        <label className="form-label">分类（可选）</label>
        <Select
          value={categoryId}
          onChange={(v) => setCategoryId(v as string | undefined)}
          placeholder="不归类"
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
        <label className="form-label">配色</label>
        <ColorSwatchPicker value={color} onChange={setColor} />
      </div>
    </Modal>
  );
}
