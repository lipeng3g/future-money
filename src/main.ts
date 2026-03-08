import { createApp } from 'vue';
import { createPinia } from 'pinia';
import {
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Popover,
  Radio,
  Segmented,
  Select,
  Steps,
  Switch,
} from 'ant-design-vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent, MarkLineComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import 'ant-design-vue/dist/reset.css';
import '@/assets/styles/global.css';
import App from './App.vue';

use([LineChart, BarChart, TitleComponent, TooltipComponent, GridComponent, LegendComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer]);

const app = createApp(App);
app.use(createPinia());

[
  Button,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Drawer,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Menu,
  Modal,
  Popover,
  Radio,
  Segmented,
  Select,
  Steps,
  Switch,
].forEach((component) => {
  app.use(component);
});

app.component('VChart', VChart);
app.mount('#app');
