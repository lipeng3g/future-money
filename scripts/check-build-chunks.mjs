import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distAssetsDir = path.resolve('dist/assets');
const chunkWarnLimit = 500 * 1024;
const appEntrySoftLimit = 95 * 1024;

const files = await readdir(distAssetsDir);
const jsFiles = files.filter((file) => file.endsWith('.js'));

const stats = await Promise.all(jsFiles.map(async (file) => {
  const fullPath = path.join(distAssetsDir, file);
  const buffer = await readFile(fullPath);
  return {
    file,
    size: buffer.byteLength,
  };
}));

stats.sort((a, b) => b.size - a.size);

const findChunk = (prefix) => stats.find((item) => item.file.startsWith(prefix));
const appEntry = findChunk('index-');
const vendorCharts = findChunk('vendor-charts-');
const balanceRuntime = findChunk('chart-balance-runtime-');
const cashflowRuntime = findChunk('chart-cashflow-runtime-');

const oversizeChunks = stats.filter((item) => item.size > chunkWarnLimit);

if (!appEntry) {
  throw new Error('未找到应用入口 chunk（index-*.js）');
}

if (!vendorCharts) {
  throw new Error('未找到 vendor-charts chunk；图表运行时可能重新并回主包或 UI vendor 包');
}

if (!balanceRuntime || !cashflowRuntime) {
  throw new Error('未找到图表 runtime chunk；按需加载链路可能退化');
}

if (appEntry.size > appEntrySoftLimit) {
  throw new Error(`应用入口 chunk 体积回退到 ${(appEntry.size / 1024).toFixed(1)}kB，超过软阈值 ${(appEntrySoftLimit / 1024).toFixed(1)}kB`);
}

const vendorAntd = findChunk('vendor-antd-');

if (!vendorAntd) {
  throw new Error('未找到 vendor-antd chunk；UI 依赖可能重新并回主包');
}

if (vendorCharts.size > 600 * 1024) {
  throw new Error(`vendor-charts 体积回退到 ${(vendorCharts.size / 1024).toFixed(1)}kB，超过 600kB 软阈值`);
}

if (vendorAntd.size > 760 * 1024) {
  throw new Error(`vendor-antd 体积回退到 ${(vendorAntd.size / 1024).toFixed(1)}kB，超过 760kB 软阈值`);
}

console.log('Build chunk summary:');
for (const item of stats.slice(0, 8)) {
  console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
}

if (oversizeChunks.length) {
  console.log('\nChunks above Vite warning threshold (500kB):');
  for (const item of oversizeChunks) {
    console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
  }
} else {
  console.log('\nNo chunks above 500kB.');
}
