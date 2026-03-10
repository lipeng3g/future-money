# Bundle / chunks notes

## Current chunk status (2026-03-11)

`npm run build` reports two chunks above 500 kB (minified):

- `dist/assets/vendor-antd-*.js` ~734 kB (gzip ~222 kB)
- `dist/assets/vendor-charts-*.js` ~560 kB (gzip ~188 kB)

We already extracted the *chart registration* modules into:

- `chart-balance-runtime` (registers balance chart requirements)
- `chart-cashflow-runtime` (registers cashflow chart requirements)

However, those files are tiny because **the heavy code is still in `vendor-charts`**.

## Why `chart-*-runtime` is tiny

`src/utils/echarts-balance.ts` / `src/utils/echarts-cashflow.ts` currently import from `echarts/*` (from `node_modules`) and call `use([...])`. Our `vite.config.ts` `manualChunks()` only isolates these *local* modules into `chart-*-runtime`.

But the actual ECharts implementation remains in `vendor-charts`, so the runtime chunk does not shrink.

## Next experiments (local-only, low risk)

If we want to actually reduce initial payload, we need the heavy ECharts modules to be code-split as well.

Possible directions:

1. **Dynamic import inside chart runtime loader**
   - Move ECharts imports behind `await import('echarts/core')` etc.
   - Ensure the first paint for home page is still meaningful without ECharts.

2. **Further reduce ECharts surface area**
   - Confirm we don't pull in unused components/renderers.
   - Avoid importing from `echarts` root.

3. **Ant Design optimization**
   - Consider route/feature level splitting for rarely used modals.
   - Evaluate if some heavy deps can move behind lazy-loaded modals.

Note: Any change here should be validated with:

- `npm test`
- `npm run type-check`
- `npm run build` (check chunk sizes)
- `npm run smoke`
