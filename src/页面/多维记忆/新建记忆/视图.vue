<script setup lang="ts">
import { computed } from 'vue'
import '../记忆泡/样式/main.css'
import MemoryInput from '../记忆泡/组件/输入框.vue'
import { 使用多维记忆仓库 } from '../仓库/多维记忆仓库'
import { 深色 } from '../组合式函数/使用皮肤'
import { 应用标题栏符号色, 由深色模式取符号色 } from '@/组合式函数/使用标题栏颜色'

const 仓库 = 使用多维记忆仓库()

const 历史场景 = computed(() => {
  const 集 = new Set<string>()
  仓库.列表.forEach((项) => 集.add(项.场景))
  return [...集]
})

应用标题栏符号色(() => 由深色模式取符号色(深色.value))
</script>

<template>
  <div class="多维记忆 新建记忆-窗口" :class="{ 浅色: !深色 }">
    <div class="新建记忆-拖拽区"></div>
    <div class="新建记忆-容器">
      <MemoryInput :历史场景="历史场景" @发送="仓库.发送" />
    </div>
  </div>
</template>

<style scoped>
.新建记忆-窗口 {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--记忆泡-背景);
}

.新建记忆-拖拽区 {
  height: 32px;
  flex-shrink: 0;
  -webkit-app-region: drag;
}

.新建记忆-容器 {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 0 16px 16px;
  -webkit-app-region: no-drag;
  min-height: 0;
}

.新建记忆-容器 :deep(.记忆泡-输入框) {
  width: 100%;
  max-width: 724px;
  height: 100%;
}

.新建记忆-容器 :deep(.记忆泡-输入文本) {
  flex: 1;
  resize: none;
  height: auto;
}
</style>
