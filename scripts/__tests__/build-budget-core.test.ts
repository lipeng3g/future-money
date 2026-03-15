import { describe, expect, it } from 'vitest';
import { evaluateBuildBudget } from '../build-budget-core.mjs';

describe('evaluateBuildBudget', () => {
  it('reports missing required chunks', () => {
    const result = evaluateBuildBudget({
      stats: [{ file: 'index-aaa.js', size: 100 }],
      baseline: {
        requiredChunks: ['index-', 'vendor-vue-'],
        chunks: {
          'index-': { maxBytes: 1000 },
          'vendor-vue-': { maxBytes: 1000 },
        },
      },
    });

    expect(result.missingChunks).toEqual(['vendor-vue-']);
  });

  it('fails only when above maxBytes + toleranceBytes', () => {
    const result = evaluateBuildBudget({
      stats: [{ file: 'index-aaa.js', size: 110_592 + 3_072 }],
      baseline: {
        toleranceBytes: 3_072,
        chunks: {
          'index-': { maxBytes: 110_592 },
        },
      },
    });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  it('fails when above maxBytes + toleranceBytes', () => {
    const result = evaluateBuildBudget({
      stats: [{ file: 'index-aaa.js', size: 110_592 + 3_072 + 1 }],
      baseline: {
        toleranceBytes: 3_072,
        chunks: {
          'index-': { maxBytes: 110_592 },
        },
      },
    });

    expect(result.failures).toHaveLength(1);
  });

  it('warns when above warnBytes but not over maxBytes', () => {
    const result = evaluateBuildBudget({
      stats: [{ file: 'index-aaa.js', size: 106_497 }],
      baseline: {
        chunks: {
          'index-': { maxBytes: 110_592, warnBytes: 106_496 },
        },
      },
    });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });
});
