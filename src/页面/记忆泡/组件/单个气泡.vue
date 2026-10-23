<script setup lang="ts">
defineProps<{
  内容: string
  时间: string
}>()
</script>

<template>
  <div class="记忆泡-单个气泡">
    <div class="记忆泡-气泡体">{{ 内容 }}</div>
    <div class="记忆泡-气泡时间">{{ 时间 }}</div>
  </div>
</template>

<style scoped>
.记忆泡-单个气泡 {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-bottom: 12px;
}

.记忆泡-气泡体 {
  max-width: 70%;
  padding: 10px 14px;
  border-radius: 14px 14px 14px 4px;
  background: var(--记忆泡-气泡背景);
  border: 1px solid var(--记忆泡-气泡边框);
  color: var(--记忆泡-文字);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.记忆泡-气泡时间 {
  margin-top: 4px;
  font-size: 11px;
  color: var(--记忆泡-弱文字);
}
</style>