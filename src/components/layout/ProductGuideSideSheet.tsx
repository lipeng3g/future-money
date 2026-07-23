import { Button, SideSheet } from '@douyinfe/semi-ui';
import { IconGithubLogo, IconLock } from '@douyinfe/semi-icons';
import {
  COPYRIGHT_YEAR,
  GITHUB_URL,
  PRODUCT_NAME,
  PRODUCT_VERSION,
} from '@/config/product';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: '确认账户与期初余额',
    description: '先检查左侧账户；账户是余额计算和资金走势的起点。',
  },
  {
    title: '记录单笔或周期收支',
    description: '周期记录会先给出逐笔预览，确认日期和金额后再生成。',
  },
  {
    title: '查看历史与未来走势',
    description: '切换时间范围查看过去与预测，点击曲线可查看当天明细。',
  },
  {
    title: '定期导出备份',
    description: '本机始终保留数据；即使启用云同步，也建议定期导出 JSON 备份。',
  },
];

export default function ProductGuideSideSheet({ visible, onClose }: Props) {
  return (
    <SideSheet
      title="欢迎使用 FutureMoney"
      visible={visible}
      onCancel={onClose}
      width="min(520px, 100vw)"
      className="product-sheet guide-sheet"
      footer={
        <div className="sheet-footer">
          <span className="sheet-footer__hint">以后可通过顶栏的帮助按钮再次打开</span>
          <Button theme="solid" onClick={onClose}>开始使用</Button>
        </div>
      }
    >
      <div className="guide-hero">
        <div className="guide-hero__mark">FM</div>
        <div>
          <h2>把未来收支变成看得见的资金曲线</h2>
          <p>四步熟悉核心流程；游客模式不会上传数据，登录后也由你决定是否启用云同步。</p>
        </div>
      </div>

      <div className="guide-steps">
        {STEPS.map((step, index) => (
          <div className="guide-step" key={step.title}>
            <span className="guide-step__number">{index + 1}</span>
            <div>
              <div className="guide-step__title">{step.title}</div>
              <div className="guide-step__description">{step.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-privacy">
        <IconLock />
        <div>
          <strong>本地优先，可选加密云同步</strong>
          <span>登录不会自动覆盖或上传账本；首次启用时会明确询问，并在冲突时保留双方版本。</span>
        </div>
      </div>

      <div className="guide-about">
        <span>© {COPYRIGHT_YEAR} {PRODUCT_NAME} · v{PRODUCT_VERSION}</span>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer">
          <IconGithubLogo /> GitHub 开源地址
        </a>
      </div>
    </SideSheet>
  );
}
