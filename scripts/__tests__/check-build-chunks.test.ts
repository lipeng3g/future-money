import { describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.resolve(repoRoot, 'scripts/check-build-chunks.mjs');

async function writeSizedFile(filePath: string, size: number) {
  const content = Buffer.alloc(size, 'a');
  await writeFile(filePath, content);
}

async function setupTempProject() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'future-money-build-chunks-'));
  await mkdir(path.join(dir, 'dist', 'assets'), { recursive: true });
  await mkdir(path.join(dir, '.meta'), { recursive: true });
  return dir;
}

async function writeBaseline(tempDir: string, baseline: unknown) {
  const baselinePath = path.join(tempDir, '.meta', 'build-budget-baseline.json');
  await writeFile(baselinePath, JSON.stringify(baseline, null, 2), 'utf8');
}

async function runCheckBuildChunks(cwd: string, env?: NodeJS.ProcessEnv) {
  return execFileAsync(process.execPath, [scriptPath], {
    cwd,
    env: {
      ...process.env,
      ...env,
    },
  });
}

describe('scripts/check-build-chunks.mjs', () => {
  it('passes for a small dist/assets set within baseline budgets', async () => {
    const tempDir = await setupTempProject();

    await writeBaseline(tempDir, {
      requiredChunks: ['index-', 'vendor-vue-'],
      chunks: {
        'index-': { maxBytes: 1024 },
        'vendor-vue-': { maxBytes: 2048 },
      },
    });

    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'index-aaa.js'), 512);
    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'vendor-vue-bbb.js'), 1024);

    const result = await runCheckBuildChunks(tempDir);
    expect(result.stdout).toContain('Build chunk budget check passed.');
  });

  it('fails with a clear hint when dist/assets is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'future-money-build-chunks-missing-dist-'));
    await mkdir(path.join(tempDir, '.meta'), { recursive: true });

    await writeBaseline(tempDir, {
      requiredChunks: ['index-'],
      chunks: {
        'index-': { maxBytes: 1024 },
      },
    });

    await expect(runCheckBuildChunks(tempDir)).rejects.toMatchObject({
      stderr: expect.stringContaining('未找到构建产物目录'),
    });
  });

  it('fails with a clear hint when baseline file is missing', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'future-money-build-chunks-missing-baseline-'));
    await mkdir(path.join(tempDir, 'dist', 'assets'), { recursive: true });

    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'index-aaa.js'), 512);

    await expect(runCheckBuildChunks(tempDir)).rejects.toMatchObject({
      stderr: expect.stringContaining('未找到 build budget baseline 文件'),
    });
  });

  it('fails when required chunks are missing', async () => {
    const tempDir = await setupTempProject();

    await writeBaseline(tempDir, {
      requiredChunks: ['index-', 'vendor-vue-'],
      chunks: {
        'index-': { maxBytes: 1024 },
        'vendor-vue-': { maxBytes: 2048 },
      },
    });

    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'index-aaa.js'), 512);

    await expect(runCheckBuildChunks(tempDir)).rejects.toMatchObject({
      stderr: expect.stringContaining('缺少关键 chunk'),
    });
  });

  it('fails in CI strict build budget mode when warnings are present', async () => {
    const tempDir = await setupTempProject();

    await writeBaseline(tempDir, {
      chunks: {
        'index-': { maxBytes: 100 },
      },
      toleranceBytes: 10,
    });

    // 105B is above maxBytes (100) but within tolerance (10) => warning.
    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'index-aaa.js'), 105);

    await expect(
      runCheckBuildChunks(tempDir, {
        CI: '1',
        CI_STRICT_BUILD_BUDGET: '1',
      }),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining('CI build budget warnings detected'),
    });
  });

  it('prints warnings but passes by default when within tolerance (non-strict)', async () => {
    const tempDir = await setupTempProject();

    await writeBaseline(tempDir, {
      chunks: {
        'index-': { maxBytes: 100 },
      },
      toleranceBytes: 10,
    });

    await writeSizedFile(path.join(tempDir, 'dist', 'assets', 'index-aaa.js'), 105);

    const result = await runCheckBuildChunks(tempDir, {
      CI: '',
      CI_STRICT_BUILD_BUDGET: '',
    });

    // console.warn goes to stderr
    expect(result.stderr).toContain('Build chunk budget warnings');
    expect(result.stdout).toContain('Build chunk budget check passed.');
  });
});
