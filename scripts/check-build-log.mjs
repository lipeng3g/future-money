import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const explicitArg = process.argv[2];
const candidatePaths = [
  explicitArg,
  process.env.BUILD_LOG_PATH,
  'build.log',
]
  .filter(Boolean)
  .map((target) => path.resolve(target));

let logPath;
for (const candidate of candidatePaths) {
  try {
    await access(candidate);
    logPath = candidate;
    break;
  } catch {
    // try next
  }
}

if (!logPath) {
  throw new Error(`未找到构建日志文件；已检查: ${candidatePaths.join(', ') || '（无候选路径）'}`);
}

const content = await readFile(logPath, 'utf8');

const lines = content.split(/\r?\n/);

const circularLines = lines.filter((line) => line.includes('Circular chunk:'));
if (circularLines.length) {
  throw new Error(`检测到 ${circularLines.length} 条 circular chunk 警告：\n${circularLines.join('\n')}`);
}

if (!content.includes('built in')) {
  throw new Error(`构建日志 ${path.basename(logPath)} 中未发现构建完成标记，无法确认这是一次完整构建`);
}

// Vite prints a generic warning when any chunk exceeds 500kB after minification.
// We keep this as a warning by default, but extract the actual chunk list to make
// build:verify output actionable.
const hasViteOversizeWarning = content.includes('Some chunks are larger than 500 kB after minification');

const parseViteAssetLine = (line) => {
  // Example:
  // dist/assets/vendor-antd-CCw70g6z.js               640.22 kB │ gzip: 191.50 kB
  const match = line.match(/^(dist\/assets\/.+?)\s+(\d+(?:\.\d+)?)\s+kB\s+│\s+gzip:\s+(\d+(?:\.\d+)?)\s+kB\s*$/);
  if (!match) return null;
  return {
    file: match[1],
    sizeKb: Number(match[2]),
    gzipKb: Number(match[3]),
  };
};

if (hasViteOversizeWarning) {
  const assets = lines.map(parseViteAssetLine).filter(Boolean);
  const oversize = assets
    .filter((item) => item.sizeKb > 500)
    .sort((a, b) => b.sizeKb - a.sizeKb);

  if (oversize.length) {
    console.warn(`\nVite oversize chunks detected (>500kB after minification):`);
    for (const item of oversize) {
      console.warn(`- ${item.file}: ${item.sizeKb.toFixed(2)} kB (gzip: ${item.gzipKb.toFixed(2)} kB)`);
    }

    // Optional strict mode for CI.
    if (process.env.CI && process.env.CI_STRICT_VITE_OVERSIZE === '1') {
      throw new Error(`CI strict mode: found ${oversize.length} oversize chunks in ${path.basename(logPath)}.`);
    }
  }
}

console.log(`Build log check passed: ${path.basename(logPath)} looks complete and has no circular chunk warnings.`);
