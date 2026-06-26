import { useEffect, useState } from 'react';
import { Banner, Modal, Radio, RadioGroup } from '@douyinfe/semi-ui';
import type { AppData } from '@/types';
import type { ImportMode } from '@/store/types';
import { summarize } from '@/utils/backup';

interface Props {
  data: AppData | null;
  onConfirm: (mode: ImportMode) => void;
  onClose: () => void;
}

export default function ImportConfirmModal({ data, onConfirm, onClose }: Props) {
  const [mode, setMode] = useState<ImportMode>('replace');

  useEffect(() => {
    if (data) setMode('replace');
  }, [data]);

  const summary = data ? summarize(data) : null;

  return (
    <Modal
      title="导入数据"
      visible={data !== null}
      onCancel={onClose}
      onOk={() => onConfirm(mode)}
      okText="确认导入"
      cancelText="取消"
      width={440}
    >
      {summary && (
        <div className="import-confirm">
          <Banner
            type="info"
            closeIcon={null}
            description={`版本 v${summary.version}　账户 ${summary.accounts}　变动 ${summary.transactions}　周期组 ${summary.series}　分类 ${summary.categories}`}
          />
          <div className="form-field">
            <label className="form-label">导入方式</label>
            <RadioGroup
              direction="vertical"
              value={mode}
              onChange={(e) => setMode(e.target.value as ImportMode)}
            >
              <Radio value="replace">覆盖：清空现有数据后写入</Radio>
              <Radio value="merge">合并：按 ID 合并，同 ID 以导入数据为准</Radio>
            </RadioGroup>
          </div>
        </div>
      )}
    </Modal>
  );
}
