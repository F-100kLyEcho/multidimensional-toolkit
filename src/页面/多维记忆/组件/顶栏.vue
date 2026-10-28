<script setup lang="ts">
import { ref } from 'vue'
import { 应用标题栏符号色, 由深色模式取符号色 } from '@/组合式函数/使用标题栏颜色'
import { 深色, 设皮肤 } from '../组合式函数/使用皮肤'

const emit = defineEmits<{ 标题点击: [] }>()

const 皮肤菜单显示 = ref(false)

应用标题栏符号色(() => 由深色模式取符号色(深色.value))
</script>

<template>
  <header class="记忆泡-顶栏">
    <span class="记忆泡-标题" @click="emit('标题点击')">多维记忆</span>
    <i class="fas fa-sun 记忆泡-皮肤图标" @click="皮肤菜单显示 = !皮肤菜单显示"></i>
    <div v-if="皮肤菜单显示" class="记忆泡-皮肤菜单遮罩" @click="皮肤菜单显示 = false">
      <div class="记忆泡-皮肤菜单" @click.stop>
        <button class="记忆泡-皮肤菜单项" :class="{ 选中: 深色 }" @click="设皮肤(true)">深色</button>
        <button class="记忆泡-皮肤菜单项" :class="{ 选中: !深色 }" @click="设皮肤(false)">浅色</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.记忆泡-顶栏 {
  flex-shrink: 0;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 154px 0 16px;
  -webkit-app-region: drag;
  background: var(--记忆泡-顶栏背景);
}

.记忆泡-标题 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.记忆泡-皮肤图标 {
  margin-left: auto;
  font-size: 14px;
  color: var(--记忆泡-弱文字);
  cursor: pointer;
  -webkit-app-region: no-drag;
  transition: color 0.15s;
}

.记忆泡-皮肤图标:hover {
  color: var(--记忆泡-强调色);
}

.记忆泡-皮肤菜单遮罩 {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.记忆泡-皮肤菜单 {
  position: absolute;
  top: 32px;
  right: 150px;
  z-index: 21;
  min-width: 96px;
  padding: 4px;
  background: var(--记忆泡-背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆泡-皮肤菜单项 {
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}

.记忆泡-皮肤菜单项.选中 {
  color: var(--记忆泡-强调色);
}

.记忆泡-皮肤菜单项:hover {
  background: var(--记忆泡-输入框背景);
}
</style>
