import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { evaluateBuildBudget } from './build-budget-core.mjs';

const distAssetsDir = path.resolve('dist/assets');
const baselinePath = path.resolve('.meta/build-budget-baseline.json');

const readAssetsDir = async () => {
  try {
    return await readdir(distAssetsDir);
  } catch (error) {
    const detail = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);

    throw new Error(
      [
        `未找到构建产物目录：${distAssetsDir}`,
        `原因：${detail}`,
        '提示：请先运行 `npm run build`（或 `npm run build:verify`）生成 dist 后再执行 build:check。',
      ].join('\n'),
    );
  }
};

const readBaseline = async () => {
  try {
    return await readFile(baselinePath, 'utf8');
  } catch (error) {
    const detail = error && typeof error === 'object' && 'message' in error
      ? String(error.message)
      : String(error);

    throw new Error(
      [
        `未找到 build budget baseline 文件：${baselinePath}`,
        `原因：${detail}`,
        '提示：baseline 用于约束关键 chunk 体积回归；请确认仓库中已包含 `.meta/build-budget-baseline.json`。',
      ].join('\n'),
    );
  }
};

const [files, baselineRaw] = await Promise.all([
  readAssetsDir(),
  readBaseline(),
]);

let baseline;
try {
  baseline = JSON.parse(baselineRaw);
} catch (error) {
  const detail = error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : String(error);

  throw new Error(
    [
      `无法解析 build budget baseline JSON：${baselinePath}`,
      `原因：${detail}`,
      '提示：请检查 `.meta/build-budget-baseline.json` 是否为合法 JSON，必要时重新生成/提交该文件。',
    ].join('\n'),
  );
}

if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
  throw new Error(
    [
      `build budget baseline 内容非法（应为 object）：${baselinePath}`,
      `实际类型：${baseline === null ? 'null' : Array.isArray(baseline) ? 'array' : typeof baseline}`,
    ].join('\n'),
  );
}

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

// CI 默认只在“超过预算/缺少关键 chunk”时失败；
// 若希望把 warning（接近预算上限 / Vite 500kB oversize 提示）也升级为失败，
// 显式设置：CI_STRICT_BUILD_BUDGET=1
const strictCi = process.env.CI && process.env.CI_STRICT_BUILD_BUDGET === '1';

if (strictCi) {
  const totalWarnings = result.warnings.length + result.oversizeChunks.length;
  if (totalWarnings) {
    throw new Error(
      `CI build budget warnings detected: ${totalWarnings} (budget: ${result.warnings.length}, oversize: ${result.oversizeChunks.length})`,
    );
  }
}


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
