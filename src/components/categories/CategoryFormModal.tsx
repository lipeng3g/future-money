import { useEffect, useState } from 'react';
import { Input, Modal, Toast } from '@douyinfe/semi-ui';
import type { Category } from '@/types';
import ColorSwatchPicker from '@/components/common/ColorSwatchPicker';
import { useStore } from '@/store/useStore';
import { randomColor } from '@/utils/palette';

interface Props {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
}

export default function CategoryFormModal({ visible, category, onClose }: Props) {
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);

  const [name, setName] = useState('');
  const [color, setColor] = useState(randomColor);

  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? '');
    setColor(category?.color ?? randomColor());
  }, [visible, category]);

  const handleOk = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Toast.warning('请输入分类名称');
      return;
    }
    if (category) updateCategory(category.id, { name: trimmed, color });
    else addCategory({ name: trimmed, color });
    onClose();
  };

  return (
    <Modal
      title={category ? '编辑分类' : '新建分类'}
      visible={visible}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
    >
      <div className="form-field">
        <label className="form-label">名称</label>
        <Input
          value={name}
          onChange={setName}
          placeholder="如 工资、房贷、投资"
          maxLength={20}
          showClear
        />
      </div>
      <div className="form-field">
        <label className="form-label">配色</label>
        <ColorSwatchPicker value={color} onChange={setColor} />
      </div>
    </Modal>
  );
}
