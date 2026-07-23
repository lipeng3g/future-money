import { useRef, useState, type ChangeEvent } from 'react';
import { Button, Dropdown, Modal, Toast, Tooltip } from '@douyinfe/semi-ui';
import {
  IconApps,
  IconCloud,
  IconDelete,
  IconExport,
  IconGithubLogo,
  IconHelpCircle,
  IconImport,
  IconMoon,
  IconPlus,
  IconRestart,
  IconSetting,
  IconSun,
  IconUser,
} from '@douyinfe/semi-icons';
import type { Account, AppData } from '@/types';
import type { ImportMode } from '@/store/types';
import { GITHUB_URL } from '@/config/product';
import { useTheme } from '@/hooks/useTheme';
import { useStore } from '@/store/useStore';
import { exportToFile, importFromFile } from '@/utils/backup';
import { today } from '@/utils/date';
import ImportConfirmModal from './ImportConfirmModal';
import AuthSideSheet from '@/components/auth/AuthSideSheet';
import { authClient } from '@/services/authClient';
import { useCloudSync } from '@/components/cloud/CloudSyncProvider';

interface Props {
  onManageCategories: () => void;
  onOpenGuide: () => void;
  accountCount: number;
  focusedAccount?: Pick<Account, 'name' | 'color'> | null;
  onClearAccountFocus?: () => void;
  onPrimaryAction: () => void;
}

export default function AppHeader({
  onManageCategories,
  onOpenGuide,
  accountCount,
  focusedAccount,
  onClearAccountFocus,
  onPrimaryAction,
}: Props) {
  const { theme, toggleTheme } = useTheme();
  const exportData = useStore((s) => s.exportData);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const loadSeed = useStore((s) => s.loadSeed);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppData | null>(null);
  const [authVisible, setAuthVisible] = useState(false);
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const cloudSync = useCloudSync();

  const handleExport = () => {
    const data = exportData();
    if (!data.accounts.length && !data.transactions.length) {
      Toast.info('暂无数据可导出');
      return;
    }
    exportToFile(data, `future-money-${today().replace(/-/g, '')}.json`);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPending(await importFromFile(file));
    } catch (error) {
      Toast.error(error instanceof Error ? error.message : '导入失败');
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

  const confirmLoadSeed = () =>
    Modal.confirm({
      title: '载入示例数据',
      content: '将用一组示例账户、分类与收支替换当前全部数据',
      okText: '载入',
      cancelText: '取消',
      onOk: () => {
        loadSeed();
        Toast.success('已载入示例数据');
      },
    });

  const confirmResetAll = () =>
    Modal.confirm({
      title: '清空所有数据',
      content: '将删除全部账户、变动与分类，且无法恢复。建议先导出一份备份。',
      okText: '清空',
      cancelText: '取消',
      okButtonProps: { type: 'danger' },
      onOk: () => {
        resetAll();
        Toast.success('已清空数据');
      },
    });

  const dataMenu = (
    <Dropdown.Menu>
      <Dropdown.Item icon={<IconExport />} onClick={handleExport}>
        导出备份
      </Dropdown.Item>
      <Dropdown.Item icon={<IconImport />} onClick={() => fileRef.current?.click()}>
        导入数据
      </Dropdown.Item>
      <Dropdown.Item icon={<IconRestart />} onClick={confirmLoadSeed}>
        载入示例数据
      </Dropdown.Item>
      <Dropdown.Item icon={<IconDelete />} type="danger" onClick={confirmResetAll}>
        清空全部数据
      </Dropdown.Item>
    </Dropdown.Menu>
  );

  const userMenu = session ? (
    <Dropdown.Menu>
      <Dropdown.Title>{session.user.name || session.user.email}</Dropdown.Title>
      <Dropdown.Item disabled>{session.user.email}</Dropdown.Item>
      <Dropdown.Item icon={<IconCloud />} onClick={cloudSync.openSettings}>
        数据存储与同步
      </Dropdown.Item>
      <Dropdown.Divider />
      <Dropdown.Item
        onClick={async () => {
          try {
            const result = await authClient.signOut();
            if (result.error) {
              Toast.error('退出失败，请稍后重试');
              return;
            }
            Toast.success('已退出登录，本地资金数据保持不变');
          } catch {
            Toast.error('网络连接失败，请稍后重试');
          }
        }}
      >
        退出登录
      </Dropdown.Item>
    </Dropdown.Menu>
  ) : null;

  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="mobile-brand" aria-label="FutureMoney 资金未来推演">
          <span className="brand__logo">FM</span>
          <span className="brand__copy">
            <span className="brand__name">FutureMoney</span>
          </span>
        </div>

        <div className="page-context">
          <span
            className={`page-context__avatar${focusedAccount ? '' : ' page-context__avatar--all'}`}
            style={focusedAccount ? { background: focusedAccount.color } : undefined}
            aria-hidden="true"
          >
            {focusedAccount ? focusedAccount.name.trim().slice(0, 1) || '账' : accountCount ? '全' : <IconPlus />}
          </span>
          <span className="page-context__copy">
            <span className="page-context__title">
              {focusedAccount?.name ?? (accountCount ? '全部账户' : '尚未创建账户')}
            </span>
            <span className="page-context__subtitle">
              {focusedAccount
                ? '单账户视图 · 以今天为基准'
                : accountCount
                  ? `${accountCount} 个账户 · 以今天为基准`
                  : '创建账户后开始资金推演'}
            </span>
          </span>
          {focusedAccount && onClearAccountFocus && (
            <Button
              size="small"
              theme="borderless"
              type="tertiary"
              onClick={onClearAccountFocus}
            >
              查看全部
            </Button>
          )}
        </div>
      </div>

      <div className="header-actions">
        <Button
          className="header-primary-action"
          theme="solid"
          icon={<IconPlus />}
          onClick={onPrimaryAction}
          aria-label={accountCount ? '记一笔' : '新建账户'}
        >
          {accountCount ? '记一笔' : '新建账户'}
        </Button>

        <Button
          className="header-action header-action--categories"
          theme="borderless"
          type="tertiary"
          icon={<IconApps />}
          onClick={onManageCategories}
          aria-label="分类管理"
        >
          分类管理
        </Button>

        <Tooltip content="使用说明">
          <Button
            className="header-icon-action"
            theme="borderless"
            type="tertiary"
            icon={<IconHelpCircle />}
            onClick={onOpenGuide}
            aria-label="打开使用说明"
          />
        </Tooltip>

        <Tooltip content="在 GitHub 查看项目">
          <Button
            className="header-icon-action header-github-action"
            theme="borderless"
            type="tertiary"
            icon={<IconGithubLogo />}
            onClick={() => window.open(GITHUB_URL, '_blank', 'noopener,noreferrer')}
            aria-label="在 GitHub 查看项目"
          />
        </Tooltip>

        <Tooltip content={theme === 'dark' ? '切换为浅色' : '切换为深色'}>
          <Button
            className="header-icon-action"
            theme="borderless"
            type="tertiary"
            icon={theme === 'dark' ? <IconSun /> : <IconMoon />}
            onClick={toggleTheme}
            aria-label="切换主题"
          />
        </Tooltip>

        {session ? (
          <>
            <Tooltip content={cloudSync.detail}>
              <Button
                className={`header-sync-status is-${cloudSync.status}`}
                theme="borderless"
                type={cloudSync.status === 'conflict' || cloudSync.status === 'error' ? 'danger' : 'tertiary'}
                icon={<IconCloud />}
                onClick={cloudSync.status === 'conflict' ? cloudSync.openResolution : cloudSync.openSettings}
              >
                {cloudSync.label}
              </Button>
            </Tooltip>
            <Dropdown trigger="click" position="bottomRight" render={userMenu}>
              <Button
                className="header-action header-action--auth"
                icon={<IconUser />}
                aria-label="用户账号"
              >
                {session.user.name || session.user.email.split('@')[0]}
              </Button>
            </Dropdown>
          </>
        ) : (
          <Button
            className="header-action header-action--auth"
            theme="borderless"
            type="tertiary"
            icon={<IconUser />}
            loading={sessionPending}
            onClick={() => setAuthVisible(true)}
          >
            登录
          </Button>
        )}

        <Dropdown trigger="click" position="bottomRight" render={dataMenu}>
          <Button
            className="header-action header-action--settings"
            icon={<IconSetting />}
            aria-label="数据与设置"
          >
            数据与设置
          </Button>
        </Dropdown>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handleFileChange}
      />
      <ImportConfirmModal
        data={pending}
        onConfirm={handleConfirmImport}
        onClose={() => setPending(null)}
      />
      <AuthSideSheet visible={authVisible} onClose={() => setAuthVisible(false)} />
    </header>
  );
}
