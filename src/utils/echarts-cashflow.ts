import { use } from 'echarts/core';

// Import ECharts installers directly from `echarts/lib/*` to keep the chart runtime
// chunk minimal. The upstream barrel exports (`echarts/charts`, `echarts/components`)
// are marked as side-effectful and can cause extra chart/component code to be bundled.
import { install as BarChart } from 'echarts/lib/chart/bar/install.js';
import { install as LineChart } from 'echarts/lib/chart/line/install.js';
import { install as TooltipComponent } from 'echarts/lib/component/tooltip/install.js';
import { install as GridComponent } from 'echarts/lib/component/grid/installSimple.js';
import { install as LegendComponent } from 'echarts/lib/component/legend/installLegendPlain.js';
import { install as CanvasRenderer } from 'echarts/lib/renderer/installCanvasRenderer.js';

use([
  BarChart,
  LineChart,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  CanvasRenderer,
]);
