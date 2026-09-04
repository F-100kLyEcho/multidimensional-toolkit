<script setup lang="ts">
import { onMounted } from 'vue'
import { 使用侧边栏宽度 } from '@/页面/启动/组合式函数/使用侧边栏宽度'

const { 初始化, 开始拖拽 } = 使用侧边栏宽度()

onMounted(() => {
  初始化()
})

function 处理鼠标按下(event: MouseEvent) {
  开始拖拽(event)
}
</script>

<template>
  <div class="拖拽条" @mousedown.prevent="处理鼠标按下"></div>
</template>

<style scoped>
.拖拽条 {
  position: relative;
  width: 4px;
  padding: 0 8px;
  background-clip: content-box;
  background-color: transparent;
  cursor: col-resize;
  flex-shrink: 0;
  height: 100%;
  z-index: 2;
  transition: none;
}

.拖拽条:hover {
  cursor: col-resize;
}
</style>
