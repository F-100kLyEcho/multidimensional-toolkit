<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import './样式/main.css'
import TopBar from '../组件/顶栏.vue'
import BubbleStream from './组件/气泡流.vue'
import MemoryInput from './组件/输入框.vue'
import LeftMenu from './组件/左侧菜单.vue'
import RightCommon from './组件/右侧常用.vue'
import { 使用多维记忆仓库 } from '../仓库/多维记忆仓库'
import { 使用全局快捷键 } from '@/组合式函数/使用全局快捷键'
import { 深色 } from '../组合式函数/使用皮肤'

const router = useRouter()
const 仓库 = 使用多维记忆仓库()

/** 中栏滚动容器，用于「顶部」按钮 */
const 中栏引用 = ref<HTMLElement>()

function 回到顶部() {
  中栏引用.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

/** 浮岛加号：打开新窗口新建记忆 */
function 新建记忆窗口() {
  window.electronAPI?.创建独立窗口('/多维记忆/新建', {
    宽: 770,
    高: 240,
    最小宽: 500,
    最小高: 240,
    全屏: false,
    可缩放: true,
    无边框: true,
  })
}

/** 右侧工具控件：初次显示，3 秒无操作自动收纳；之后 hover 触发区显示 */
const 浮岛显示 = ref(true)
let 收纳定时器: number | undefined
onMounted(() => {
  收纳定时器 = window.setTimeout(() => {
    浮岛显示.value = false
  }, 3000)
})
onUnmounted(() => {
  if (收纳定时器) clearTimeout(收纳定时器)
  window.removeEventListener('mousemove', 拖拽移动)
  window.removeEventListener('mouseup', 结束拖拽)
})
function 显示浮岛() {
  if (拖拽中.value) return
  浮岛显示.value = true
  if (收纳定时器) clearTimeout(收纳定时器)
}
function 收纳浮岛() {
  if (拖拽中.value) return
  if (收纳定时器) clearTimeout(收纳定时器)
  收纳定时器 = window.setTimeout(() => {
    浮岛显示.value = false
  }, 3000)
}

/** 浮岛拖拽吸附：左右吸附 + 上下自由 top，位置存 localStorage */
type 吸附边类型 = '左' | '右'
const 位置键 = '多维记忆-浮岛位置'
const 顶栏高度 = 32

const 吸附边 = ref<吸附边类型>('右')
const 垂直位置 = ref(window.innerHeight / 2)
const 拖拽中 = ref(false)
const 拖拽x = ref(0)
let 拖拽起始Y = 0
let 拖拽起始top = 0
let 按下偏移x = 0

const 浮岛样式 = computed(() => {
  if (拖拽中.value) {
    return { top: `${垂直位置.value}px`, left: `${拖拽x.value}px`, right: 'auto' }
  }
  return { top: `${垂直位置.value}px` }
})

onMounted(() => {
  const 存 = localStorage.getItem(位置键)
  if (存) {
    try {
      const { 边, top } = JSON.parse(存) as { 边: 吸附边类型; top: number }
      吸附边.value = 边
      垂直位置.value = top
    } catch {
      /* 忽略损坏数据 */
    }
  }
})

function 开始拖拽(e: MouseEvent) {
  e.preventDefault()
  拖拽中.value = true
  浮岛显示.value = false
  拖拽起始Y = e.clientY
  拖拽起始top = 垂直位置.value
  const 浮岛左边x = 吸附边.value === '左' ? 0 : window.innerWidth - 20
  按下偏移x = e.clientX - 浮岛左边x
  拖拽x.value = 浮岛左边x
  window.addEventListener('mousemove', 拖拽移动)
  window.addEventListener('mouseup', 结束拖拽)
}

function 拖拽移动(e: MouseEvent) {
  const 新top = 拖拽起始top + (e.clientY - 拖拽起始Y)
  垂直位置.value = Math.max(顶栏高度 + 15, Math.min(window.innerHeight - 15, 新top))
  拖拽x.value = e.clientX - 按下偏移x
}

function 结束拖拽(e: MouseEvent) {
  拖拽中.value = false
  吸附边.value = e.clientX < window.innerWidth / 2 ? '左' : '右'
  localStorage.setItem(位置键, JSON.stringify({ 边: 吸附边.value, top: 垂直位置.value }))
  window.removeEventListener('mousemove', 拖拽移动)
  window.removeEventListener('mouseup', 结束拖拽)
}

/** 左侧归档筛选 */
const 选中年 = ref<number | null>(null)
const 选中月 = ref<number | null>(null)

function 处理选中(年: number | null, 月: number | null) {
  选中年.value = 年
  选中月.value = 月
}

const 筛选列表 = computed(() => {
  if (选中年.value === null) return 仓库.列表
  return 仓库.列表.filter((项) => {
    const d = new Date(项.创建时间)
    if (d.getFullYear() !== 选中年.value) return false
    if (选中月.value !== null && d.getMonth() + 1 !== 选中月.value) return false
    return true
  })
})

/** 历史场景去重，用于输入框快捷选择 */
const 历史场景 = computed(() => {
  const 集 = new Set<string>()
  仓库.列表.forEach((项) => 集.add(项.场景))
  return [...集]
})

使用全局快捷键()
</script>

<template>
  <div class="多维记忆" :class="{ 浅色: !深色 }">
    <TopBar @标题点击="router.push('/多维记忆')" />

    <div class="记忆泡-三栏">
      <aside class="记忆泡-左栏">
        <LeftMenu :列表="仓库.列表" @选中="处理选中" />
      </aside>

      <main ref="中栏引用" class="记忆泡-中栏">
        <MemoryInput :历史场景="历史场景" @发送="仓库.发送" />
        <BubbleStream :列表="筛选列表" />
      </main>

      <aside class="记忆泡-右栏">
        <RightCommon />
      </aside>
    </div>

    <div class="记忆泡-浮岛" :class="[吸附边 === '左' ? '记忆泡-浮岛-左' : '记忆泡-浮岛-右', { 拖拽中 }]" :style="浮岛样式" @mouseleave="收纳浮岛">
      <div class="记忆泡-浮岛控件" :class="{ 显示: 浮岛显示 }">
        <button class="记忆泡-浮岛按钮 记忆泡-顶部按钮" @click="回到顶部">
          <i class="fas fa-caret-up"></i>
          <span>顶部</span>
        </button>
        <button class="记忆泡-浮岛按钮 记忆泡-加号按钮" title="新记忆泡" @click="新建记忆窗口">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <button class="记忆泡-触发区" @mousedown="开始拖拽" @mouseenter="显示浮岛">
        <i class="fas fa-layer-group"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.记忆泡-三栏 {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.记忆泡-左栏 {
  width: 264px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 10px;
  background: var(--记忆泡-输入框背景);
}

.记忆泡-中栏 {
  width: 724px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.记忆泡-中栏::-webkit-scrollbar {
  width: 8px;
}

.记忆泡-中栏::-webkit-scrollbar-thumb {
  background: var(--记忆泡-滚动条);
  border-radius: 4px;
}

.记忆泡-中栏::-webkit-scrollbar-track {
  background: transparent;
}

.记忆泡-右栏 {
  width: 320px;
  flex-shrink: 0;
  overflow-y: auto;
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 10px;
  background: var(--记忆泡-输入框背景);
}

.记忆泡-浮岛 {
  position: fixed;
  transform: translateY(-50%);
  z-index: 15;
  display: flex;
  align-items: center;
}

.记忆泡-浮岛-右 {
  right: 0;
}

.记忆泡-浮岛-左 {
  left: 0;
}

.记忆泡-浮岛.拖拽中 {
  transition: none;
  user-select: none;
}

.记忆泡-浮岛.拖拽中 .记忆泡-触发区 {
  border-radius: 50%;
}

.记忆泡-触发区 {
  width: 30px;
  height: 30px;
  border: none;
  background: var(--记忆泡-输入框背景);
  color: var(--记忆泡-弱文字);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: color 0.15s;
}

.记忆泡-浮岛-右 .记忆泡-触发区 {
  border-radius: 15px 0 0 15px;
}

.记忆泡-浮岛-左 .记忆泡-触发区 {
  border-radius: 0 15px 15px 0;
}

.记忆泡-触发区:hover {
  color: var(--记忆泡-强调色);
}

.记忆泡-浮岛控件 {
  position: absolute;
  top: 50%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.记忆泡-浮岛-右 .记忆泡-浮岛控件 {
  right: 100%;
  padding-right: 6px;
  transform: translateY(-50%) translateX(10px);
}

.记忆泡-浮岛-左 .记忆泡-浮岛控件 {
  left: 100%;
  padding-left: 6px;
  transform: translateY(-50%) translateX(-10px);
}

.记忆泡-浮岛控件.显示 {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
  pointer-events: auto;
}

.记忆泡-浮岛按钮 {
  width: 44px;
  height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  border: none;
  background: var(--记忆泡-输入框背景);
  color: var(--记忆泡-弱文字);
  font-size: 11px;
  line-height: 1;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: color 0.15s;
  white-space: nowrap;
}

.记忆泡-顶部按钮 {
  border-radius: 8px;
}

.记忆泡-加号按钮 {
  border-radius: 50%;
}

.记忆泡-浮岛按钮:hover {
  color: var(--记忆泡-强调色);
}

.记忆泡-顶部按钮 i {
  font-size: 18px;
}

.记忆泡-加号按钮 i {
  font-size: 16px;
}
</style>
