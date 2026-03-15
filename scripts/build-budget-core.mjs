/**
 * Pure build-budget evaluation helpers.
 * Kept as a standalone module so we can unit-test budget logic without touching the filesystem.
 */

export const defaultViteWarningLimitBytes = 500 * 1024;

const formatKiB = (bytes) => `${(bytes / 1024).toFixed(1)}kB`;

/**
 * @typedef {{file: string, size: number}} ChunkStat
 * @typedef {{maxBytes?: number, warnBytes?: number, toleranceBytes?: number}} ChunkBudget
 * @typedef {{generatedAt?: string, notes?: string[], toleranceBytes?: number, chunks?: Record<string, ChunkBudget>, requiredChunks?: string[]}} BudgetBaseline
 */

/**
 * @param {{stats: ChunkStat[], baseline: BudgetBaseline, viteWarningLimitBytes?: number}} input
 */
export function evaluateBuildBudget({ stats, baseline, viteWarningLimitBytes = defaultViteWarningLimitBytes }) {
  const sorted = [...stats].sort((a, b) => b.size - a.size);
  const findChunk = (prefix) => sorted.find((item) => item.file.startsWith(prefix));

  const requiredChunks = baseline.requiredChunks ?? [];
  const missingChunks = requiredChunks.filter((prefix) => !findChunk(prefix));

  const failures = [];
  const warnings = [];

  const defaultToleranceBytes = typeof baseline.toleranceBytes === 'number' ? baseline.toleranceBytes : 0;

  for (const [prefix, budget] of Object.entries(baseline.chunks ?? {})) {
    const chunk = findChunk(prefix);
    if (!chunk) {
      failures.push(`未找到 ${prefix}* chunk`);
      continue;
    }

    const toleranceBytes = typeof budget.toleranceBytes === 'number' ? budget.toleranceBytes : defaultToleranceBytes;

    if (typeof budget.maxBytes === 'number') {
      if (chunk.size > budget.maxBytes + toleranceBytes) {
        failures.push(`${chunk.file} 体积 ${formatKiB(chunk.size)}，超过预算 ${formatKiB(budget.maxBytes)}（容忍 ${formatKiB(toleranceBytes)}）`);
        continue;
      }

      if (chunk.size > budget.maxBytes) {
        warnings.push(`${chunk.file} 体积 ${formatKiB(chunk.size)}，超过预算 ${formatKiB(budget.maxBytes)}，但在容忍范围内（+${formatKiB(toleranceBytes)}）`);
        continue;
      }
    }

    if (typeof budget.warnBytes === 'number' && chunk.size > budget.warnBytes) {
      const ceilingBytes = typeof budget.maxBytes === 'number' ? budget.maxBytes : budget.warnBytes;
      warnings.push(`${chunk.file} 体积 ${formatKiB(chunk.size)}，接近预算上限 ${formatKiB(ceilingBytes)}`);
    }
  }

  const oversizeChunks = sorted.filter((item) => item.size > viteWarningLimitBytes);

  return {
    stats: sorted,
    missingChunks,
    failures,
    warnings,
    oversizeChunks,
  };
}
