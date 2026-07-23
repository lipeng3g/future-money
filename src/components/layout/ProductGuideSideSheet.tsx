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
    description: '数据只保存在当前浏览器本机，建议定期导出 JSON 文件。',
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
          <p>四步熟悉核心流程，不需要注册，也不会上传你的财务数据。</p>
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
          <strong>数据仅保存在本机</strong>
          <span>清理浏览器数据前请先导出备份；本项目不提供云端恢复能力。</span>
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
