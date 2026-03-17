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

const sizeToKb = (value, unit) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  const normalized = String(unit).toLowerCase();
  if (normalized === 'kb') return n;
  if (normalized === 'mb') return n * 1000;
  if (normalized === 'mib') return n * 1024;
  return null;
};

const parseViteAssetLine = (line) => {
  // Vite output examples (depending on version/terminal):
  // dist/assets/vendor-antd-CCw70g6z.js               640.22 kB │ gzip: 191.50 kB
  // dist/assets/vendor-antd-CCw70g6z.js               640.22 kB | gzip: 191.50 kB
  // dist/assets/vendor-antd-CCw70g6z.js               640.22 kB

  const match = line.match(
    /^(dist\/assets\/\S+)\s+(\d+(?:\.\d+)?)\s+(kB|KB|MB|MiB)(?:\s*[│|]\s*gzip:\s*(\d+(?:\.\d+)?)\s+(kB|KB|MB|MiB))?\s*$/,
  );
  if (!match) return null;

  const sizeKb = sizeToKb(match[2], match[3]);
  const gzipKb = match[4] ? sizeToKb(match[4], match[5]) : null;
  if (sizeKb == null) return null;

  return {
    file: match[1],
    sizeKb,
    gzipKb,
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
      const gzipPart = item.gzipKb == null ? '' : ` (gzip: ${item.gzipKb.toFixed(2)} kB)`;
      console.warn(`- ${item.file}: ${item.sizeKb.toFixed(2)} kB${gzipPart}`);
    }

    // Optional strict mode for CI.
    if (process.env.CI && process.env.CI_STRICT_VITE_OVERSIZE === '1') {
      throw new Error(`CI strict mode: found ${oversize.length} oversize chunks in ${path.basename(logPath)}.`);
    }
  } else {
    // Vite has already told us something is oversize, but the exact asset line
    // format can change between versions. Make this visible in logs.
    console.warn(
      `\nVite oversize warning detected, but no parseable dist/assets lines were found. ` +
        `If Vite changed its output format, update scripts/check-build-log.mjs to match.`,
    );

    if (process.env.CI && process.env.CI_STRICT_VITE_OVERSIZE === '1') {
      throw new Error(
        `CI strict mode: oversize warning present in ${path.basename(logPath)}, but chunk details could not be parsed.`,
      );
    }
  }
}

console.log(`Build log check passed: ${path.basename(logPath)} looks complete and has no circular chunk warnings.`);
