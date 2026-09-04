<template>
  <div class="底部工具栏" :class="{ 浅色模式: !深色模式 }">
    <!-- 设置按钮 -->
    <button class="工具栏按钮" title="工作空间管理" @click="$emit('打开设置')">
      <span class="图标">⚙</span>
      <span class="文字">设置</span>
    </button>

    <!-- 工作空间下拉框 -->
    <CustomSelect
      :选项="工作空间选项"
      :当前值="当前选中工作空间"
      :禁用="!是否可用"
      :浅色模式="!深色模式"
      @选中="处理工作空间选中"
    />

    <!-- 开机自启 -->
    <label class="复选框容器" :class="{ 禁用: !是否可用 }">
      <input v-model="开机自启" type="checkbox" :disabled="!是否可用" @change="切换开机自启" />
      <span class="复选框文字">开机自启</span>
    </label>

    <!-- 默认启动页下拉 -->
    <CustomSelect
      :选项="启动页选项"
      :当前值="默认启动页"
      :禁用="!是否可用"
      :浅色模式="!深色模式"
      @选中="处理启动页选中"
    />

    <!-- 手册按钮 -->
    <button class="工具栏按钮" title="使用手册（F2）" @click="打开手册">
      <i class="fas fa-book 图标"></i>
      <span class="文字">手册</span>
    </button>

    <!-- 主题三按钮组 -->
    <div class="主题三按钮组">
      <button class="主题模式按钮" :class="{ 激活: 主题模式 === '浅色' }" title="浅色模式" @click="设置主题模式('浅色')"><i class="fas fa-sun"></i></button>
      <button class="主题模式按钮" :class="{ 激活: 主题模式 === '深色' }" title="深色模式" @click="设置主题模式('深色')"><i class="fas fa-moon"></i></button>
      <button class="主题模式按钮" :class="{ 激活: 主题模式 === '跟随系统' }" title="跟随系统" @click="设置主题模式('跟随系统')"><i class="fas fa-circle-half-stroke"></i></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import CustomSelect from './自定义下拉框.vue'

// ==================== Props & Emits ====================

const props = defineProps<{
  工作空间列表: { 名称: string; 路径: string }[]
  当前工作空间名称: string
}>()

const emit = defineEmits<{
  打开设置: []
  切换工作空间: [名称: string]
  切换开机自启: [开启: boolean]
  切换默认启动页: [路由: string]
  打开手册: []
  主题变化: [深色: boolean]
}>()

// ==================== 主题 ====================

type 主题模式类型 = '浅色' | '深色' | '跟随系统'
const 主题模式 = ref<主题模式类型>((localStorage.getItem('首页_主题模式') as 主题模式类型) || '深色')
const 系统深色 = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

const 深色模式 = computed(() => {
  if (主题模式.value === '深色') return true
  if (主题模式.value === '跟随系统') return 系统深色.value
  return false
})

function 设置主题模式(模式: 主题模式类型) {
  主题模式.value = 模式
  localStorage.setItem('首页_主题模式', 模式)
}

let 系统主题监听器: MediaQueryList | null = null
function 处理系统主题变化(e: MediaQueryListEvent) {
  系统深色.value = e.matches
}

watch(深色模式, (val) => {
  emit('主题变化', val)
}, { immediate: true })

// ==================== 状态 ====================

/** 是否 Electron 环境 */
const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

/** 控件是否可用（非 Electron 环境禁用） */
const 是否可用 = 是否Electron环境

/** 当前选中的工作空间名称 */
const 当前选中工作空间 = ref('')

/** 开机自启状态 */
const 开机自启 = ref(false)

/** 默认启动页 */
const 默认启动页 = ref('/')

/** 工作空间选项列表 */
const 工作空间选项 = computed(() =>
  props.工作空间列表.map(w => ({ 值: w.名称, 标签: w.名称 })),
)

/** 启动页选项列表 */
const 启动页选项 = [
  { 值: '/', 标签: '首页' },
  { 值: '/Q1', 标签: '启动' },
  { 值: '/图标库管理', 标签: '图标库' },
  { 值: '/H1', 标签: '获取路径' },
]

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!是否Electron环境) return

  // 读取开机自启状态
  try {
    const 结果 = await window.electronAPI.首页读取开机自启()
    if (结果.成功) {
      开机自启.value = 结果.开启 || false
    }
  } catch {
    // 忽略
  }

  // 读取默认启动页
  try {
    const 结果 = await window.electronAPI.首页读取默认启动页()
    if (结果.成功 && 结果.路由) {
      默认启动页.value = 结果.路由
    }
  } catch {
    // 忽略
  }

  // 系统主题监听
  系统主题监听器 = window.matchMedia('(prefers-color-scheme: dark)')
  系统主题监听器.addEventListener('change', 处理系统主题变化)
})

onUnmounted(() => {
  系统主题监听器?.removeEventListener('change', 处理系统主题变化)
})

// ==================== 监听外部变化 ====================

watch(
  () => props.当前工作空间名称,
  (新值) => {
    if (新值) {
      当前选中工作空间.value = 新值
    }
  },
  { immediate: true },
)

// ==================== 事件处理 ====================

function 切换工作空间() {
  if (当前选中工作空间.value) {
    emit('切换工作空间', 当前选中工作空间.value)
  }
}

function 处理工作空间选中(值: string) {
  当前选中工作空间.value = 值
  切换工作空间()
}

function 切换开机自启() {
  emit('切换开机自启', 开机自启.value)
}

function 切换默认启动页() {
  emit('切换默认启动页', 默认启动页.value)
}

function 处理启动页选中(值: string) {
  默认启动页.value = 值
  切换默认启动页()
}

function 打开手册() {
  emit('打开手册')
}
</script>

<style scoped>
.底部工具栏 {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 100;
}

.工具栏按钮 {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}
.工具栏按钮:hover {
  background: rgba(255, 255, 255, 0.2);
}

.图标 {
  font-size: 14px;
}

.文字 {
  font-size: 13px;
}

/* 复选框 */
.复选框容器 {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.复选框容器.禁用 {
  opacity: 0.4;
  pointer-events: none;
}

.复选框容器 input[type='checkbox'] {
  appearance: none;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  cursor: pointer;
  position: relative;
}
.复选框容器 input[type='checkbox']:checked {
  background: #0078d4;
  border-color: #0078d4;
}
.复选框容器 input[type='checkbox']:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 11px;
}

.复选框文字 {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
}

/* 主题三按钮组 */
.主题三按钮组 {
  display: flex;
  gap: 2px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 2px;
}

.主题模式按钮 {
  width: 28px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.主题模式按钮:hover {
  color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.08);
}

.主题模式按钮.激活 {
  background: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.浅色模式 .主题三按钮组 {
  background: rgba(0, 0, 0, 0.08);
}

.浅色模式 .主题模式按钮 {
  color: rgba(0, 0, 0, 0.45);
}

.浅色模式 .主题模式按钮:hover {
  color: rgba(0, 0, 0, 0.7);
  background: rgba(0, 0, 0, 0.06);
}

.浅色模式 .主题模式按钮.激活 {
  background: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.85);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* 浅色模式 - 底部工具栏整体 */
.底部工具栏.浅色模式 {
  background: rgba(255, 255, 255, 0.85);
  border-top-color: rgba(0, 0, 0, 0.08);
}

.底部工具栏.浅色模式 .工具栏按钮 {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.8);
}

.底部工具栏.浅色模式 .工具栏按钮:hover {
  background: rgba(0, 0, 0, 0.1);
}

.底部工具栏.浅色模式 .复选框容器 input[type='checkbox'] {
  border-color: rgba(0, 0, 0, 0.25);
  background: rgba(0, 0, 0, 0.04);
}

.底部工具栏.浅色模式 .复选框文字 {
  color: rgba(0, 0, 0, 0.75);
}
</style>
