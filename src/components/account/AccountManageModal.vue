<template>
  <a-modal
    :open="open"
    title="账户管理"
    width="560px"
    :footer="null"
    @cancel="$emit('close')"
  >
    <div class="manage-sections">
      <!-- 账户信息 -->
      <div class="section">
        <div class="section-title">当前账户</div>
        <div class="account-info">
          <span class="account-dot" :style="{ background: store.currentAccount.color }" />
          <span class="account-name">{{ store.currentAccount.name }}</span>
          <span v-if="store.currentAccount.typeLabel" class="account-type">{{ store.currentAccount.typeLabel }}</span>
        </div>
      </div>

      <!-- 数据操作 -->
      <div class="section">
        <div class="section-title">数据操作</div>
        <div class="action-list">
          <div class="action-item">
            <div class="action-desc">
              <strong>导入当前账户</strong>
              <span>从 JSON 文件导入，并覆盖当前账户的数据</span>
            </div>
            <a-button size="small" @click="$emit('import', 'current')">导入当前账户</a-button>
          </div>
          <div class="action-item action-item-warning">
            <div class="action-desc">
              <strong>恢复全部账户</strong>
              <span>用整份备份覆盖当前本地全部账户、事件、对账与偏好设置；选择文件后还需二次确认</span>
            </div>
            <a-button size="small" danger @click="$emit('import', 'all')">恢复全部账户</a-button>
          </div>
          <div class="action-item">
            <div class="action-desc">
              <strong>导出当前账户</strong>
              <span>仅导出当前账户的数据，便于单账户迁移或备份</span>
            </div>
            <a-button size="small" @click="$emit('export', 'current')">导出当前账户</a-button>
          </div>
          <div class="action-item">
            <div class="action-desc">
              <strong>导出全部账户</strong>
              <span>导出整份本地数据，包含所有账户、偏好与历史记录</span>
            </div>
            <a-button size="small" @click="$emit('export', 'all')">导出全部账户</a-button>
          </div>
        </div>
      </div>

      <!-- 危险操作 -->
      <div class="section danger-section">
        <div class="section-title danger">危险操作</div>
        <div class="action-list">
          <div class="action-item">
            <div class="action-desc">
              <strong>清空账户数据</strong>
              <span>删除当前账户的所有事件、对账记录，保留账户本身</span>
            </div>
            <a-button size="small" danger ghost @click="$emit('clear')">清空</a-button>
          </div>
          <div class="action-item">
            <div class="action-desc">
              <strong>删除账户</strong>
              <span>彻底删除当前账户及其所有数据，不可恢复</span>
            </div>
            <a-button
              size="small"
              danger
              :disabled="store.accounts.length <= 1"
              @click="$emit('delete')"
            >删除</a-button>
            <span v-if="store.accounts.length <= 1" class="hint">至少保留一个账户</span>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { useFinanceStore } from '@/stores/finance';

defineProps<{ open: boolean }>();
defineEmits<{
  (e: 'close'): void;
  (e: 'import', mode: 'current' | 'all'): void;
  (e: 'export', mode: 'current' | 'all'): void;
  (e: 'clear'): void;
  (e: 'delete'): void;
}>();

const store = useFinanceStore();
</script>

<style scoped>
.manage-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 10px;
}

.section-title.danger {
  color: #ef4444;
}

.account-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.account-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.account-name {
  font-weight: 600;
  color: #0f172a;
}

.account-type {
  font-size: 0.75rem;
  color: #94a3b8;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.danger-section .action-item {
  background: #fef2f2;
  border-color: #fecaca;
}

.action-item-warning {
  background: #fff7ed;
  border-color: #fdba74;
}

.action-desc {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.action-desc strong {
  font-size: 0.85rem;
  color: #1e293b;
}

.action-desc span {
  font-size: 0.75rem;
  color: #64748b;
}

.hint {
  font-size: 0.7rem;
  color: #94a3b8;
  white-space: nowrap;
}
</style>
