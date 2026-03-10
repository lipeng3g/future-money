import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const distAssetsDir = path.resolve('dist/assets');
const baselinePath = path.resolve('.meta/build-budget-baseline.json');
const viteWarningLimitBytes = 500 * 1024;

const [files, baselineRaw] = await Promise.all([
  readdir(distAssetsDir),
  readFile(baselinePath, 'utf8'),
]);

const baseline = JSON.parse(baselineRaw);
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
const requiredChunks = baseline.requiredChunks ?? [];
const missingChunks = requiredChunks.filter((prefix) => !findChunk(prefix));

if (missingChunks.length) {
  throw new Error(`缺少关键 chunk：${missingChunks.join(', ')}`);
}

const failures = [];
const warnings = [];

for (const [prefix, budget] of Object.entries(baseline.chunks ?? {})) {
  const chunk = findChunk(prefix);
  if (!chunk) {
    failures.push(`未找到 ${prefix}* chunk`);
    continue;
  }

  if (typeof budget.maxBytes === 'number' && chunk.size > budget.maxBytes) {
    failures.push(`${chunk.file} 体积 ${(chunk.size / 1024).toFixed(1)}kB，超过预算 ${(budget.maxBytes / 1024).toFixed(1)}kB`);
  } else if (typeof budget.warnBytes === 'number' && chunk.size > budget.warnBytes) {
    warnings.push(`${chunk.file} 体积 ${(chunk.size / 1024).toFixed(1)}kB，接近预算上限 ${(budget.maxBytes / 1024).toFixed(1)}kB`);
  }
}

const oversizeChunks = stats.filter((item) => item.size > viteWarningLimitBytes);

console.log('Build chunk summary:');
for (const item of stats.slice(0, 10)) {
  console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
}

if (oversizeChunks.length) {
  console.log('\nChunks above Vite warning threshold (500kB):');
  for (const item of oversizeChunks) {
    console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
  }
}

if (warnings.length) {
  console.warn('\nBuild chunk budget warnings:');
  for (const item of warnings) {
    console.warn(`- ${item}`);
  }
}

if (failures.length) {
  throw new Error(`构建产物超过预算：\n${failures.map((item) => `- ${item}`).join('\n')}`);
}

console.log('\nBuild chunk budget check passed.');
