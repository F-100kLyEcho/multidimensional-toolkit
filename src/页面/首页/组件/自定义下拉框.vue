<template>
  <div class="自定义下拉框" :class="{ 禁用 }" ref="容器引用">
    <div class="触发器" @click="切换弹窗">
      <span class="触发器文字">{{ 显示文本 }}</span>
      <span class="下拉箭头" :class="{ 翻转: 弹窗打开 }">▼</span>
    </div>
    <Transition name="弹窗">
      <div v-if="弹窗打开" class="弹窗">
        <div
          v-for="项 in 选项"
          :key="项.值"
          class="弹窗选项"
          :class="{ 选中: 项.值 === 当前值, 浅色模式 }"
          @click="选中项(项.值)"
        >
          {{ 项.标签 }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  选项: { 值: string; 标签: string }[]
  当前值: string
  禁用?: boolean
  浅色模式?: boolean
}>()

const emit = defineEmits<{
  选中: [值: string]
}>()

const 弹窗打开 = ref(false)
const 容器引用 = ref<HTMLElement | null>(null)

const 显示文本 = computed(() => {
  const 当前项 = props.选项.find(项 => 项.值 === props.当前值)
  return 当前项 ? 当前项.标签 : props.当前值
})

function 切换弹窗() {
  if (props.禁用) return
  弹窗打开.value = !弹窗打开.value
}

function 选中项(值: string) {
  emit('选中', 值)
  弹窗打开.value = false
}

function 点击外部处理(e: MouseEvent) {
  if (!弹窗打开.value) return
  if (容器引用.value && !容器引用.value.contains(e.target as Node)) {
    弹窗打开.value = false
  }
}

function 按键处理(e: KeyboardEvent) {
  if (e.key === 'Escape' && 弹窗打开.value) {
    弹窗打开.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', 点击外部处理)
  document.addEventListener('keydown', 按键处理)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', 点击外部处理)
  document.removeEventListener('keydown', 按键处理)
})
</script>

<style scoped>
.自定义下拉框 {
  position: relative;
  display: flex;
  align-items: center;
}
.自定义下拉框.禁用 {
  opacity: 0.4;
  pointer-events: none;
}

.触发器 {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: #1a1a1a;
  cursor: pointer;
  min-width: 120px;
  user-select: none;
  transition: background 0.15s, border-color 0.15s;
}
.触发器:hover {
  background: #222;
}
.触发器:active {
  border-color: rgba(255, 255, 255, 0.3);
}

.触发器文字 {
  flex: 1;
  font-size: 13px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.下拉箭头 {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s;
  flex-shrink: 0;
}
.下拉箭头.翻转 {
  transform: rotate(180deg);
}

.弹窗 {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 4px;
  min-width: 100%;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 4px 0;
  z-index: 200;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
}

.弹窗选项 {
  padding: 6px 12px;
  font-size: 13px;
  font-family: inherit;
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.1s;
}
.弹窗选项:hover {
  background: rgba(255, 255, 255, 0.1);
}
.弹窗选项.选中 {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

/* 浅色模式 */
.浅色模式 .触发器 {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.15);
}
.浅色模式 .触发器:hover {
  background: #fafafa;
}
.浅色模式 .触发器:active {
  border-color: rgba(0, 0, 0, 0.3);
}
.浅色模式 .触发器文字 {
  color: rgba(0, 0, 0, 0.85);
}
.浅色模式 .下拉箭头 {
  color: rgba(0, 0, 0, 0.4);
}
.浅色模式 .弹窗 {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
}
.浅色模式 .弹窗选项 {
  color: rgba(0, 0, 0, 0.85);
}
.浅色模式 .弹窗选项:hover {
  background: rgba(0, 0, 0, 0.06);
}
.浅色模式 .弹窗选项.选中 {
  background: rgba(0, 0, 0, 0.1);
  color: #000;
}

/* 弹窗过渡动画 */
.弹窗-enter-active,
.弹窗-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.弹窗-enter-from,
.弹窗-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
