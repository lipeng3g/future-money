import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.resolve(repoRoot, 'scripts/check-build-log.mjs');

async function writeTempLog(content: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'future-money-build-log-'));
  const logPath = path.join(dir, 'build.log');
  await writeFile(logPath, content, 'utf8');
  return logPath;
}

async function runCheckBuildLog(logPath: string, env?: NodeJS.ProcessEnv) {
  return execFileAsync(process.execPath, [scriptPath, logPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe('scripts/check-build-log.mjs', () => {
  it('passes for a complete build log with no circular chunk warnings', async () => {
    const logPath = await writeTempLog([
      'vite v5.0.0 building for production...',
      'transforming...',
      '✓ built in 1.23s',
      '',
    ].join('\n'));

    const result = await runCheckBuildLog(logPath);
    expect(result.stdout).toContain('Build log check passed');
  });

  it('fails when circular chunk warnings are present', async () => {
    const logPath = await writeTempLog([
      'Circular chunk: a -> b -> a',
      '✓ built in 0.99s',
      '',
    ].join('\n'));

    await expect(runCheckBuildLog(logPath)).rejects.toMatchObject({
      stderr: expect.stringContaining('circular chunk'),
    });
  });

  it('prints oversize chunk list as warning but still passes by default', async () => {
    const logPath = await writeTempLog([
      'Some chunks are larger than 500 kB after minification.',
      'dist/assets/vendor-antd-CCw70g6z.js               640.22 kB │ gzip: 191.50 kB',
      'dist/assets/index-aaa.js                          12.10 kB │ gzip:   4.00 kB',
      '✓ built in 2.00s',
      '',
    ].join('\n'));

    const result = await runCheckBuildLog(logPath, {
      CI: '',
      CI_STRICT_VITE_OVERSIZE: '',
    });

    // console.warn goes to stderr
    expect(result.stderr).toContain('Vite oversize chunks detected');
    expect(result.stdout).toContain('Build log check passed');
  });

  it('fails in CI strict oversize mode when oversize chunks are present', async () => {
    const logPath = await writeTempLog([
      'Some chunks are larger than 500 kB after minification.',
      'dist/assets/vendor-antd-CCw70g6z.js               640.22 kB │ gzip: 191.50 kB',
      '✓ built in 2.00s',
      '',
    ].join('\n'));

    await expect(
      runCheckBuildLog(logPath, {
        CI: '1',
        CI_STRICT_VITE_OVERSIZE: '1',
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('CI strict mode'),
    });
  });

  it('fails when build completion marker is missing', async () => {
    const logPath = await writeTempLog('vite v5.0.0 building for production...\n');

    await expect(runCheckBuildLog(logPath)).rejects.toMatchObject({
      stderr: expect.stringContaining('未发现构建完成标记'),
    });
  });
});
