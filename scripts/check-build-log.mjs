import { readFile } from 'node:fs/promises';
import path from 'node:path';

const logPath = path.resolve('build.log');
const content = await readFile(logPath, 'utf8');

const circularLines = content
  .split(/\r?\n/)
  .filter((line) => line.includes('Circular chunk:'));

if (circularLines.length) {
  throw new Error(`检测到 ${circularLines.length} 条 circular chunk 警告：\n${circularLines.join('\n')}`);
}

if (!content.includes('built in')) {
  throw new Error('build.log 中未发现构建完成标记，无法确认这是一次完整构建');
}

console.log('Build log check passed: no circular chunk warnings detected.');
