<script setup lang="ts">
import { ref } from 'vue'
import './样式/main.css'
import BubbleStream from './组件/气泡流.vue'
import MemoryInput from './组件/输入框.vue'
import { 使用记忆泡仓库 } from './仓库/记忆泡仓库'

const 仓库 = 使用记忆泡仓库()

/** 皮肤：默认深色（黑），浅色即白 */
const 深色 = ref(localStorage.getItem('记忆泡_深色') !== 'false')

function 切换皮肤() {
  深色.value = !深色.value
  localStorage.setItem('记忆泡_深色', String(深色.value))
}
</script>

<template>
  <div class="记忆泡" :class="{ 浅色: !深色 }">
    <!-- 顶栏：直接到窗口顶，自身作为无边框拖拽区，右侧避让系统按钮 -->
    <header class="记忆泡-顶栏">
      <span class="记忆泡-标题">记忆泡</span>
      <button class="记忆泡-皮肤切换" @click="切换皮肤">{{ 深色 ? '浅色' : '深色' }}</button>
    </header>

    <main class="记忆泡-流容器">
      <BubbleStream :列表="仓库.列表" />
    </main>

    <footer class="记忆泡-输入区">
      <MemoryInput @发送="仓库.发送" />
    </footer>
  </div>
</template>

<style scoped>
.记忆泡-顶栏 {
  flex-shrink: 0;
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 154px 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--记忆泡-气泡边框);
}

.记忆泡-顶栏 button {
  -webkit-app-region: no-drag;
}

.记忆泡-标题 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.记忆泡-皮肤切换 {
  margin-left: auto;
  padding: 5px 12px;
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 6px;
  background: transparent;
  color: var(--记忆泡-弱文字);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s;
}

.记忆泡-皮肤切换:hover {
  color: var(--记忆泡-文字);
}

.记忆泡-流容器 {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.记忆泡-流容器::-webkit-scrollbar {
  width: 8px;
}

.记忆泡-流容器::-webkit-scrollbar-thumb {
  background: var(--记忆泡-滚动条);
  border-radius: 4px;
}

.记忆泡-流容器::-webkit-scrollbar-track {
  background: transparent;
}

.记忆泡-输入区 {
  flex-shrink: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--记忆泡-气泡边框);
}
</style>