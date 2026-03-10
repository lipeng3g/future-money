import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('tmp-browser-chart-smoke');
await mkdir(outDir, { recursive: true });

const payload = {
  note: [
    '通过在 localStorage 写入这个标记，可让图表 runtime loader 故意失败，',
    '用于验证真实页面的「下载失败/离线」兜底 CTA 是否能出现。',
    '无需引入任何新依赖。',
  ].join(''),
  localStorageKey: 'futureMoney.debug.chartRuntimeFail.v1',
  localStorageValue: '1',
  createdAt: new Date().toISOString(),
};

await writeFile(path.join(outDir, 'runtime-failure-flag.json'), JSON.stringify(payload, null, 2));
console.log(`[chart-runtime-failure-smoke] wrote ${path.join(outDir, 'runtime-failure-flag.json')}`);
