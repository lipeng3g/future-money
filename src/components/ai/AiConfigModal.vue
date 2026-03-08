<template>
  <a-modal
    :open="open"
    title="配置 AI 服务"
    :width="480"
    okText="保存"
    cancelText="取消"
    @ok="handleSave"
    @cancel="$emit('cancel')"
  >
    <div class="config-body">
      <p class="config-desc">
        FutureMoney 通过浏览器直连 OpenAI 兼容 API 进行分析，你的 Key 仅保存在本地浏览器中。
      </p>
      <a-form layout="vertical">
        <a-form-item label="API 地址" required>
          <a-input v-model:value="form.baseUrl" placeholder="https://api.openai.com 或完整 /chat/completions 地址" />
        </a-form-item>
        <a-form-item label="API Key" required>
          <a-input-password v-model:value="form.apiKey" placeholder="sk-..." />
        </a-form-item>
        <a-form-item label="模型名称">
          <a-input v-model:value="form.model" placeholder="gpt-4o-mini" />
        </a-form-item>
      </a-form>
      <p class="config-tip">
        仅支持公开的 OpenAI 兼容 chat completions 接口；保存时会自动规范化地址并拦截 localhost / 内网目标。
      </p>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { message } from 'ant-design-vue';
import { loadAiConfig, saveAiConfig, type AiConfig } from '@/utils/ai';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits(['cancel', 'saved']);

const form = ref<AiConfig>({
  baseUrl: 'https://api.openai.com',
  apiKey: '',
  model: 'gpt-4o-mini',
});

watch(
  () => props.open,
  (v) => {
    if (v) {
      const saved = loadAiConfig();
      if (saved) form.value = { ...saved };
    }
  },
);

const handleSave = () => {
  try {
    saveAiConfig(form.value);
    form.value = { ...loadAiConfig() ?? form.value };
    message.success('AI 配置已保存');
    emit('saved');
  } catch (error) {
    message.warning(error instanceof Error ? error.message : 'AI 配置保存失败');
  }
};
</script>

<style scoped>
.config-body {
  padding: 4px 0;
}

.config-desc {
  margin: 0 0 20px;
  font-size: 0.85rem;
  color: var(--fm-text-secondary);
  line-height: 1.6;
}

.config-tip {
  margin: 4px 0 0;
  font-size: 0.78rem;
  line-height: 1.6;
  color: #64748b;
}
</style>
