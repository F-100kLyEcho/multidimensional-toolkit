<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { 使用快捷键仓库 } from '@/页面/启动/仓库/快捷键仓库'
import KeyRecorder from './按键录制器.vue'

const 快捷键仓库 = 使用快捷键仓库()
const { 启动快捷键 } = storeToRefs(快捷键仓库)
</script>

<template>
  <div class="设置项">
    <div class="设置标签">启动全部卡片</div>
    <KeyRecorder v-model:模型值="启动快捷键" />
  </div>
  <div class="说明">启动当前选中二级菜单下的所有卡片，常态与紧凑模式均可用。焦点在输入框时不触发。</div>
</template>

<style scoped>
.设置项 {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 20px 0 8px;
}
.设置标签 {
  font-size: 15px;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  flex-shrink: 0;
}
.说明 {
  font-size: 14px;
  color: var(--全站通用文字颜色);
  line-height: 1.6;
  margin-top: 16px;
  padding: 0 2px;
}
</style>
