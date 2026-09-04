<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { 快捷键配置 } from '@/页面/启动/仓库/快捷键仓库'
import { 格式化快捷键, 检测冲突 } from '@/页面/启动/仓库/快捷键仓库'

const props = defineProps<{ 模型值: 快捷键配置 }>()
const emit = defineEmits<{ 'update:模型值': [值: 快捷键配置] }>()

const 录制中 = ref(false)
const 冲突文本 = ref<string | null>(null)

const 显示值 = computed(() => 格式化快捷键(props.模型值))

function 开始录制() {
  录制中.value = true
  冲突文本.value = null
}

function 停止录制() {
  录制中.value = false
}

function 处理按键(e: KeyboardEvent) {
  if (!录制中.value) return
  // Escape 取消录制
  if (e.key === 'Escape' && !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
    e.preventDefault()
    e.stopImmediatePropagation()
    录制中.value = false
    冲突文本.value = null
    return
  }
  // 忽略纯修饰键
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return
  e.preventDefault()
  e.stopImmediatePropagation()
  const 配置: 快捷键配置 = {
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    key: e.key.toLowerCase(),
  }
  const 冲突 = 检测冲突(配置)
  if (冲突) {
    冲突文本.value = 冲突
    return
  }
  emit('update:模型值', 配置)
  录制中.value = false
}

onMounted(() => {
  window.addEventListener('keydown', 处理按键, true)
})
onUnmounted(() => {
  window.removeEventListener('keydown', 处理按键, true)
})
</script>

<template>
  <div class="按键录制器" :class="{ 录制中, 冲突: 冲突文本 }" tabindex="0" @focus="开始录制" @blur="停止录制">
    <span v-if="冲突文本" class="冲突提示">与「{{ 冲突文本 }}」冲突</span>
    <span v-else-if="录制中">按下快捷键…（Esc 取消）</span>
    <span v-else>{{ 显示值 }}</span>
  </div>
</template>

<style scoped>
.按键录制器 {
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  text-align: center;
  min-width: 110px;
  transition: border-color 0.15s;
  user-select: none;
}
.按键录制器:hover {
  border-color: var(--全站通用文字颜色);
}
.按键录制器.录制中 {
  border-color: #3eb489;
  background: rgba(62, 180, 137, 0.15);
}
.按键录制器.冲突 {
  border-color: #ff6b6b;
  background: rgba(255, 107, 107, 0.15);
}
.冲突提示 {
  color: #ff8a8a;
}
</style>
