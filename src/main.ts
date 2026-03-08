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
import 'ant-design-vue/dist/reset.css';
import '@/assets/styles/global.css';
import App from './App.vue';

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

app.mount('#app');
