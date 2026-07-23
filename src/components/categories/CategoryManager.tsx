import { useState } from 'react';
import { Button, Popconfirm, SideSheet, Toast } from '@douyinfe/semi-ui';
import { IconDelete, IconEdit, IconImport, IconPlus } from '@douyinfe/semi-icons';
import type { Category } from '@/types';
import EmptyState from '@/components/common/EmptyState';
import { useStore } from '@/store/useStore';
import { DEFAULT_CATEGORY_SEEDS } from '@/utils/seed';
import CategoryFormModal from './CategoryFormModal';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CategoryManager({ visible, onClose }: Props) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
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

  const loadPresets = () => {
    const existing = new Set(categories.map((c) => c.name));
    const added = DEFAULT_CATEGORY_SEEDS.filter((s) => !existing.has(s.name));
    added.forEach((s) => addCategory({ name: s.name, color: s.color }));
    Toast.success(added.length ? `已载入 ${added.length} 个常用分类` : '常用分类已全部存在');
  };

  return (
    <SideSheet
      title="分类管理"
      visible={visible}
      onCancel={onClose}
      width="min(440px, 100vw)"
      className="product-sheet"
      footer={
        <div className="sheet-footer category-footer">
          <Button theme="borderless" icon={<IconImport />} onClick={loadPresets}>
            载入常用分类
          </Button>
          <Button theme="solid" icon={<IconPlus />} onClick={openCreate}>
            新建分类
          </Button>
        </div>
      }
    >
      {categories.length === 0 ? (
        <EmptyState
          title="还没有分类"
          description="分类可用于标记工资、房贷、投资等，可一键载入常用分类"
          action={
            <Button theme="solid" icon={<IconImport />} onClick={loadPresets}>
              载入常用分类
            </Button>
          }
        />
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
      <CategoryFormModal
        visible={formVisible}
        category={editing}
        onClose={() => setFormVisible(false)}
      />
    </SideSheet>
  );
}
