import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const explicitArg = process.argv[2];
const candidatePaths = [
  explicitArg,
  process.env.BUILD_LOG_PATH,
  'build.log',
].filter(Boolean).map((target) => path.resolve(target));

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

const circularLines = content
  .split(/\r?\n/)
  .filter((line) => line.includes('Circular chunk:'));

if (circularLines.length) {
  throw new Error(`检测到 ${circularLines.length} 条 circular chunk 警告：\n${circularLines.join('\n')}`);
}

if (!content.includes('built in')) {
  throw new Error(`构建日志 ${path.basename(logPath)} 中未发现构建完成标记，无法确认这是一次完整构建`);
}

console.log(`Build log check passed: no circular chunk warnings detected in ${path.basename(logPath)}.`);
