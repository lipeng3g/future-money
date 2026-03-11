// Minimal typings for ECharts installer entrypoints imported from `echarts/lib/*`.
//
// Why this exists:
// - ECharts provides official types for the public barrel exports (echarts/charts, echarts/components, ...).
// - The `echarts/lib/*` paths are intentionally untyped, but they are valid ESM entrypoints.
// - We use them to improve tree-shaking (the barrel exports are marked as side-effectful upstream).
//
// We only need the installer signature that `echarts/core` expects in `use([...])`.

type EChartsInstaller = (registers: any) => void;

declare module 'echarts/lib/chart/line/install.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/chart/bar/install.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/tooltip/install.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/grid/installSimple.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/dataZoom/install.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/marker/installMarkLine.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/marker/installMarkArea.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/component/legend/installLegendPlain.js' {
  export const install: EChartsInstaller;
}

declare module 'echarts/lib/renderer/installCanvasRenderer.js' {
  export const install: EChartsInstaller;
}
