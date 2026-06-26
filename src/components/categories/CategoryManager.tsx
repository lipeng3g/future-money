import { useState } from 'react';
import { Button, Modal, Popconfirm } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconPlus } from '@douyinfe/semi-icons';
import type { Category } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store/useStore';
import CategoryFormModal from './CategoryFormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CategoryManager({ visible, onClose }: Props) {
  const categories = useStore((s) => s.categories);
  const removeCategory = useStore((s) => s.removeCategory);

  const [formVisible, setFormVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormVisible(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setFormVisible(true);
  };

  return (
    <Modal title="分类管理" visible={visible} onCancel={onClose} footer={null}>
      {categories.length === 0 ? (
        <EmptyState title="还没有分类" description="分类可用于标记工资、房贷、投资等" />
      ) : (
        <div className="category-list">
          {categories.map((c) => (
            <div className="category-row" key={c.id}>
              <span className="account-dot" style={{ background: c.color }} />
              <span className="category-name">{c.name}</span>
              <Button
                size="small"
                theme="borderless"
                type="tertiary"
                icon={<IconEdit />}
                onClick={() => openEdit(c)}
                aria-label="编辑分类"
              />
              <Popconfirm
                title="删除分类"
                content="删除后相关记录的分类标记会被清除"
                okType="danger"
                onConfirm={() => removeCategory(c.id)}
                okText="删除"
                cancelText="取消"
              >
                <Button
                  size="small"
                  theme="borderless"
                  type="danger"
                  icon={<IconDelete />}
                  aria-label="删除分类"
                />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}
      <div className="modal-foot">
        <Button block theme="light" icon={<IconPlus />} onClick={openCreate}>
          新建分类
        </Button>
      </div>
      <CategoryFormModal
        visible={formVisible}
        category={editing}
        onClose={() => setFormVisible(false)}
      />
    </Modal>
  );
}
