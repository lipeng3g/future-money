<template>
  <a-modal
    :open="open"
    title="多账户视图"
    :ok-button-props="{ disabled: selectedIds.length < 2 }"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="$emit('cancel')"
    destroy-on-close
  >
    <div class="account-list">
      <a-checkbox-group v-model:value="selectedIds">
        <div
          v-for="acc in accounts"
          :key="acc.id"
          class="account-item"
        >
          <a-checkbox :value="acc.id">
            <span class="dot" :style="{ background: acc.color || '#64748b' }" />
            <span class="name">{{ acc.name }}</span>
            <span v-if="acc.typeLabel" class="type">{{ acc.typeLabel }}</span>
          </a-checkbox>
        </div>
      </a-checkbox-group>
    </div>
    <p class="hint">至少选择两个账户进入多账户汇总视图。</p>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { AccountConfig } from '@/types/account';

interface Props {
  open: boolean;
  accounts: AccountConfig[];
  initialSelected: string[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'confirm', ids: string[]): void;
  (e: 'cancel'): void;
}>();

const selectedIds = ref<string[]>([]);

watch(
  () => props.open,
  (open) => {
    if (open) {
      if (props.initialSelected.length) {
        selectedIds.value = [...props.initialSelected];
      } else {
        selectedIds.value = props.accounts.map((acc) => acc.id);
      }
    }
  },
  { immediate: false },
);

const handleOk = () => {
  emit('confirm', selectedIds.value);
};
</script>

<style scoped>
.account-list {
  max-height: 260px;
  overflow-y: auto;
}

.account-item {
  padding: 4px 0;
}

.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-right: 8px;
}

.name {
  margin-right: 6px;
}

.type {
  font-size: 0.75rem;
  color: #9ca3af;
}

.hint {
  margin-top: 8px;
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>

