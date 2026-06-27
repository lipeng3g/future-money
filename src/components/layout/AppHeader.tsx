import { useRef, useState, type ChangeEvent } from 'react';
import { Button, Popconfirm, Toast } from '@douyinfe/semi-ui';
import { IconMoon, IconSun } from '@douyinfe/semi-icons';
import type { AppData } from '@/types';
import type { ImportMode } from '@/store/types';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { exportToFile, importFromFile } from '@/utils/backup';
import { today } from '@/utils/date';
import ImportConfirmModal from './ImportConfirmModal';

interface Props {
  onManageCategories: () => void;
}

export default function AppHeader({ onManageCategories }: Props) {
  const { theme, toggleTheme } = useTheme();
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const loadSeed = useStore((s) => s.loadSeed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);

  const handleExport = () => {
    const data = exportData();
    if (!data.accounts.length && !data.transactions.length) {
      Toast.info('暂无数据可导出');
      return;
    }
    exportToFile(data, `future-money-${today().replace(/-/g, '')}.json`);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPending(await importFromFile(file));
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : '导入失败');
    }
  };

  const handleConfirmImport = (mode: ImportMode) => {
    if (!pending) return;
    importData(pending, mode);
    Toast.success(
      `已${mode === 'merge' ? '合并' : '导入'}：账户 ${pending.accounts.length} 个，变动 ${pending.transactions.length} 笔`,
    );
    setPending(null);
  };

  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand__logo">₣</span>
        <span className="brand__name">FutureMoney</span>
        <span className="brand__tagline">资金未来推演</span>
      </div>
      <div className="header-actions">
        <Button theme="borderless" type="tertiary" onClick={onManageCategories}>
          分类管理
        </Button>
        <Button theme="borderless" type="tertiary" onClick={handleExport}>
          导出
        </Button>
        <Button theme="borderless" type="tertiary" onClick={() => fileRef.current?.click()}>
          导入
        </Button>
        <Popconfirm
          title="载入示例数据"
          content="将用一组示例账户、分类与收支替换当前全部数据"
          okText="载入"
          cancelText="取消"
          onConfirm={() => {
            loadSeed();
            Toast.success('已载入示例数据');
          }}
        >
          <Button theme="borderless" type="tertiary">
            载入示例
          </Button>
        </Popconfirm>
        <Popconfirm
          title="清空所有数据"
          content="将删除全部账户、变动与分类，且无法恢复"
          okType="danger"
          okText="清空"
          cancelText="取消"
          onConfirm={() => {
            resetAll();
            Toast.success('已清空数据');
          }}
        >
          <Button theme="borderless" type="danger">
            清空
          </Button>
        </Popconfirm>
        <Button
          theme="borderless"
          type="tertiary"
          icon={theme === 'dark' ? <IconSun /> : <IconMoon />}
          onClick={toggleTheme}
          aria-label="切换主题"
        />
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleFileChange}
        />
      </div>
      <ImportConfirmModal
        data={pending}
        onConfirm={handleConfirmImport}
        onClose={() => setPending(null)}
      />
    </header>
  );
}
