import { use } from 'echarts/core';

// Import ECharts installers directly from `echarts/lib/*` to avoid pulling the entire
// re-export barrels (`echarts/charts`, `echarts/components`) which are marked as
// side-effectful upstream and can defeat tree-shaking.
import { install as LineChart } from 'echarts/lib/chart/line/install.js';
import { install as TooltipComponent } from 'echarts/lib/component/tooltip/install.js';
import { install as GridComponent } from 'echarts/lib/component/grid/installSimple.js';
import { install as DataZoomComponent } from 'echarts/lib/component/dataZoom/install.js';
import { install as MarkLineComponent } from 'echarts/lib/component/marker/installMarkLine.js';
import { install as MarkAreaComponent } from 'echarts/lib/component/marker/installMarkArea.js';
import { install as CanvasRenderer } from 'echarts/lib/renderer/installCanvasRenderer.js';

use([
  LineChart,
  TooltipComponent,
  GridComponent,
  DataZoomComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);
