import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateBuildBudget } from './build-budget-core.mjs';

const distAssetsDir = path.resolve('dist/assets');
const baselinePath = path.resolve('.meta/build-budget-baseline.json');

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

const result = evaluateBuildBudget({ stats, baseline });

if (result.missingChunks.length) {
  throw new Error(`缺少关键 chunk：${result.missingChunks.join(', ')}`);
}

console.log('Build chunk summary:');
for (const item of result.stats.slice(0, 10)) {
  console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
}

if (result.oversizeChunks.length) {
  console.log('\nChunks above Vite warning threshold (500kB):');
  for (const item of result.oversizeChunks) {
    console.log(`- ${item.file}: ${(item.size / 1024).toFixed(1)} kB`);
  }
}

if (result.warnings.length) {
  console.warn('\nBuild chunk budget warnings:');
  for (const item of result.warnings) {
    console.warn(`- ${item}`);
  }
}

if (result.failures.length) {
  throw new Error(`构建产物超过预算：\n${result.failures.map((item) => `- ${item}`).join('\n')}`);
}

console.log('\nBuild chunk budget check passed.');
