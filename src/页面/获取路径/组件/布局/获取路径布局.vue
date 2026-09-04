<script setup lang="ts">
/**
 * 获取路径页面专用布局组件
 * 包含四个区域：header（顶部控制栏）、left（文件列表）、middle（排除项）、right（最终选择预览）
 * 所有区域均可通过插槽自定义内容
 *
 * 新增功能：
 * - 拖拽分隔条调整三栏宽度
 * - 隐藏/显示中栏和右栏
 * - 布局状态持久化到 localStorage
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

const 显示快捷键提示 = ref(false)
type 主题模式类型 = '浅色' | '深色' | '跟随系统'
const 主题模式 = ref<主题模式类型>((localStorage.getItem('获取路径_主题模式') as 主题模式类型) || '浅色')

const 系统深色 = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)

const 深色模式 = computed(() => {
  if (主题模式.value === '深色') return true
  if (主题模式.value === '跟随系统') return 系统深色.value
  return false
})

function 设置主题模式(模式: 主题模式类型) {
  主题模式.value = 模式
  localStorage.setItem('获取路径_主题模式', 模式)
}

let 系统主题监听器: MediaQueryList | null = null
function 处理系统主题变化(e: MediaQueryListEvent) {
  系统深色.value = e.matches
}

function 关闭快捷键提示() {
  显示快捷键提示.value = false
}

function 处理ESC(e: KeyboardEvent) {
  if (e.key === 'Escape' && 显示快捷键提示.value) {
    关闭快捷键提示()
  }
}

onMounted(() => {
  document.addEventListener('keydown', 处理ESC)
  系统主题监听器 = window.matchMedia('(prefers-color-scheme: dark)')
  系统主题监听器.addEventListener('change', 处理系统主题变化)
})

onUnmounted(() => {
  document.removeEventListener('keydown', 处理ESC)
  系统主题监听器?.removeEventListener('change', 处理系统主题变化)
})

defineProps<{
  leftFlex: number
  middleFlex: number
  rightFlex: number
  middleVisible: boolean
  rightVisible: boolean
}>()

const emit = defineEmits<{
  startDrag: [event: MouseEvent, paneKey: 'left-middle' | 'middle-right']
  toggleMiddle: []
  toggleRight: []
  resetLayout: []
}>()

function 打开手册() {
  const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined
  if (是否Electron环境) {
    window.electronAPI.创建独立窗口('/manual/getpath')
  }
}
</script>

<template>
  <div class="获取路径布局" :class="{ 深色模式 }">
    <!-- 顶部区域 -->
    <header class="布局-顶部">
      <div class="顶部-工具栏">
        <router-link to="/" class="返回首页按钮" title="返回首页">
          <i class="fas fa-home"></i>
        </router-link>
        <div class="顶部-左侧"><slot name="header" /></div>
        <div class="主题三按钮组">
          <button class="主题模式按钮" :class="{ 激活: 主题模式 === '浅色' }" title="浅色模式" @click="设置主题模式('浅色')"><i class="fas fa-sun"></i></button>
          <button class="主题模式按钮" :class="{ 激活: 主题模式 === '深色' }" title="深色模式" @click="设置主题模式('深色')"><i class="fas fa-moon"></i></button>
          <button class="主题模式按钮" :class="{ 激活: 主题模式 === '跟随系统' }" title="跟随系统" @click="设置主题模式('跟随系统')"><i class="fas fa-circle-half-stroke"></i></button>
        </div>
        <button class="工具栏图标按钮" title="快捷键提示" @click="显示快捷键提示 = !显示快捷键提示"><i class="fas fa-keyboard"></i></button>
        <button class="手册按钮" title="使用手册（F1）" @click="打开手册"><i class="fas fa-book"></i></button>
        <button class="重置布局按钮" title="恢复默认布局（快捷键 E）" @click="emit('resetLayout')"><i class="fas fa-arrows-left-right-to-line"></i></button>
      </div>
    </header>

    <!-- 快捷键提示弹窗 -->
    <Teleport to="body">
      <div v-if="显示快捷键提示" class="快捷键提示遮罩" @click="关闭快捷键提示">
        <div class="快捷键提示弹窗" @click.stop>
          <div class="快捷键提示标题">快捷键</div>
          <div class="提示行"><kbd>Q</kbd><span>切换中栏</span></div>
          <div class="提示行"><kbd>W</kbd><span>切换右栏</span></div>
          <div class="提示行"><kbd>E</kbd><span>重置布局</span></div>
          <div class="提示行"><kbd>F1</kbd><span>使用手册</span></div>
          <div class="提示行"><kbd>Home</kbd><span>返回首页</span></div>
          <div class="提示行"><kbd>1/2/3</kbd><span>页面导航</span></div>
          <div class="提示行"><kbd>Ctrl+1/2/3</kbd><span>新窗口打开</span></div>
        </div>
      </div>
    </Teleport>

    <!-- 主体三栏区域 -->
    <div class="布局-主体">
      <!-- 左侧：文件列表与排除操作 -->
      <section class="布局-左栏" :style="{ flex: `${leftFlex} 1 0%` }">
        <slot name="left">
          <div class="左栏占位">左侧区域（文件列表展示）</div>
        </slot>
      </section>

      <!-- 分隔条：左-中（仅当中栏可见时显示） -->
      <div v-show="middleVisible" class="分隔条" @mousedown.prevent="emit('startDrag', $event, 'left-middle')" />

      <!-- 中间：排除项展示与编辑 -->
      <aside v-show="middleVisible" class="布局-中栏" :style="{ flex: `${middleFlex} 1 0%` }">
        <slot name="middle-header" />
        <div class="栏内容">
          <slot name="middle">
            <div class="中栏占位">中间区域（排除项）</div>
          </slot>
        </div>
      </aside>

      <!-- 分隔条：中-右（仅当中栏和右栏都可见时显示） -->
      <div v-show="middleVisible && rightVisible" class="分隔条" @mousedown.prevent="emit('startDrag', $event, 'middle-right')" />

      <!-- 右侧：最终选择预览 -->
      <aside v-show="rightVisible" class="布局-右栏" :style="{ flex: `${rightFlex} 1 0%` }">
        <div class="栏标题行">
          <button class="隐藏按钮" title="隐藏此栏（快捷键 W）" @click="emit('toggleRight')">
            <i class="fas fa-eye-slash"></i>
          </button>
          <span class="栏标题">最终预览</span>
          <div class="栏标题-右侧">
            <slot name="right-header" />
          </div>
        </div>
        <div class="栏内容">
          <slot name="right">
            <div class="右栏占位">右侧区域（最终预览）</div>
          </slot>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.获取路径布局 {
  display: flex;
  flex-direction: column;
  height: 100vh; /* 占满视口高度 */
  overflow: hidden; /* 防止整个页面滚动 */
}

/* 顶部固定高度，不收缩 */
.布局-顶部 {
  flex-shrink: 0;
  padding: 12px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #d0d0d0;
}

.顶部-工具栏 {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  position: relative;
}

.顶部-左侧 {
  margin-right: auto;
}

.返回首页按钮 {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.返回首页按钮:hover {
  background: #e0e0e0;
  color: #333;
}

.工具栏图标按钮 {
  flex-shrink: 0;
  padding: 4px 8px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.工具栏图标按钮:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.主题三按钮组 {
  display: flex;
  gap: 2px;
  background: #e8e8e8;
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
  color: #888;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.主题模式按钮:hover {
  color: #555;
  background: rgba(0, 0, 0, 0.06);
}

.主题模式按钮.激活 {
  background: #fff;
  color: #333;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

.手册按钮 {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}

.手册按钮:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.重置布局按钮 {
  flex-shrink: 0;
  padding: 4px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.重置布局按钮:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

/* 主体区域：剩余空间，水平排列 */
.布局-主体 {
  flex: 1;
  display: flex;
  overflow: hidden; /* 防止子元素撑破导致整体滚动 */
}

/* 分隔条 */
.分隔条 {
  width: 4px;
  cursor: col-resize;
  background: #e0e0e0;
  flex-shrink: 0;
  transition: background 0.15s;
  position: relative;
  z-index: 10;
}
.分隔条:hover {
  background: #bbb;
}

/* 左栏 */
.布局-左栏 {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 12px;
  border-right: 1px solid #e0e0e0;
  background: #ffffff;
  min-width: 0; /* 允许flex收缩 */
}

/* 中栏 */
.布局-中栏 {
  overflow: hidden;
  padding: 12px;
  border-right: 1px solid #e0e0e0;
  background: #fafafa;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 右栏 */
.布局-右栏 {
  overflow: hidden;
  padding: 12px;
  background: #f5f5f5;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 栏内容区域（内部滚动） */
.栏内容 {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 栏标题行 */
.栏标题行 {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.栏标题-左侧 {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: auto;
}

.栏标题-右侧 {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: auto;
}

.栏标题 {
  font-size: 13px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 隐藏按钮 */
.隐藏按钮 {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #999;
  cursor: pointer;
  transition: all 0.15s;
}
.隐藏按钮:hover {
  background: #e0e0e0;
  color: #555;
}

/* 占位文本样式（调试用） */
.顶部占位,
.左栏占位,
.中栏占位,
.右栏占位 {
  color: #999;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  text-align: center;
  padding: 20px;
  border: 1px dashed #ccc;
  border-radius: 6px;
  background: #fff;
}

.深色模式 .布局-顶部 {
  background: #2a2a2a;
  border-color: #444;
}

.深色模式 .主题三按钮组 {
  background: #1e1e1e;
}

.深色模式 .主题模式按钮 {
  color: #888;
}

.深色模式 .主题模式按钮:hover {
  color: #bbb;
  background: rgba(255, 255, 255, 0.06);
}

.深色模式 .主题模式按钮.激活 {
  background: #3a3a3a;
  color: #eee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.深色模式 .顶部-工具栏 .返回首页按钮,
.深色模式 .顶部-工具栏 .工具栏图标按钮,
.深色模式 .顶部-工具栏 .手册按钮,
.深色模式 .顶部-工具栏 .重置布局按钮 {
  background: #3a3a3a;
  border-color: #555;
  color: #ddd;
}

.深色模式 .顶部-工具栏 .返回首页按钮:hover,
.深色模式 .顶部-工具栏 .工具栏图标按钮:hover,
.深色模式 .顶部-工具栏 .手册按钮:hover,
.深色模式 .顶部-工具栏 .重置布局按钮:hover {
  background: #4a4a4a;
  border-color: #777;
}

.深色模式 .布局-左栏 {
  background: #2a2a2a;
  border-color: #3a3a3a;
}

.深色模式 :deep(.树形列表) {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 4px 0;
}

.深色模式 .布局-中栏 {
  background: #252525;
  border-color: #3a3a3a;
}

.深色模式 .布局-右栏 {
  background: #2a2a2a;
}

.深色模式 .栏标题行 {
  border-color: #3a3a3a;
}

.深色模式 .栏标题 {
  color: #ccc;
}

.深色模式 .隐藏按钮 {
  color: #999;
}

.深色模式 .隐藏按钮:hover {
  color: #ddd;
  background: rgba(255, 255, 255, 0.08);
}

.深色模式 .分隔条 {
  background: #3a3a3a;
}

.深色模式 .分隔条:hover {
  background: #555;
}

.快捷键提示遮罩 {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.快捷键提示弹窗 {
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  padding: 20px 24px;
  min-width: 240px;
}

.快捷键提示标题 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 14px;
}

.提示行 {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  color: #555;
}

.提示行 kbd {
  display: inline-block;
  min-width: 60px;
  text-align: center;
  padding: 2px 8px;
  background: #f0f0f0;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Microsoft YaHei', monospace;
  color: #333;
}

.提示行 span {
  font-size: 13px;
  color: #666;
}

.深色模式 .快捷键提示弹窗 {
  background: #2a2a2a;
  border-color: #444;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.深色模式 .快捷键提示标题 {
  color: #ddd;
}

.深色模式 .提示行 {
  color: #bbb;
}

.深色模式 .提示行 kbd {
  background: #3a3a3a;
  border-color: #555;
  color: #ddd;
}

.深色模式 .提示行 span {
  color: #999;
}

.深色模式 :deep(.路径输入框) {
  background: #2a2a2a;
  border-color: #555;
  color: #ddd;
}

.深色模式 :deep(.展开按钮) {
  background: #3a3a3a;
  border-color: #555;
  color: #ddd;
}

.深色模式 :deep(.展开按钮:hover) {
  background: #4a4a4a;
}

.深色模式 :deep(.规则编辑器) {
  background: #1e1e1e;
  border-color: #444;
  color: #ccc;
}

.深色模式 :deep(.预览区-主体) {
  background: #1e1e1e;
  border-color: #3a3a3a;
  color: #ddd;
}

.深色模式 :deep(.树形项 .名称) {
  color: #ddd;
}

.深色模式 :deep(.树形项-已排除 .名称) {
  color: #777;
}

.深色模式 :deep(.树形项-已豁免 .名称) {
  color: #777;
}

.深色模式 :deep(.预览区-主体 .树形项:hover) {
  background: transparent;
}

.深色模式 :deep(.预览区-主体 .折叠按钮:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #bbb;
}

.深色模式 :deep(.隐藏排除开关) {
  color: #ccc;
}

.深色模式 :deep(.顶部按钮) {
  color: #bbb;
}

.深色模式 :deep(.顶部按钮:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #eee;
}

.深色模式 :deep(.规则配置-弹窗) {
  background: #2a2a2a;
  border-color: #444;
}

.深色模式 :deep(.规则配置-标题) {
  color: #ddd;
}

.深色模式 :deep(.规则配置-关闭-button),
.深色模式 :deep(.规则配置-关闭按钮) {
  color: #999;
}

.深色模式 :deep(.规则配置-主体) {
  color: #ccc;
}

.深色模式 :deep(.规则配置-左侧),
.深色模式 :deep(.规则配置-右侧) {
  color: #ccc;
}

.深色模式 :deep(.合并-弹窗) {
  background: #2a2a2a;
  border-color: #444;
}

.深色模式 :deep(.合并-标题) {
  color: #ddd;
}

.深色模式 :deep(.合并-主体) {
  color: #ccc;
}

:deep(.树形列表::-webkit-scrollbar),
:deep(.预览区-主体::-webkit-scrollbar) {
  width: 6px;
}

:deep(.树形列表::-webkit-scrollbar-track),
:deep(.预览区-主体::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.树形列表::-webkit-scrollbar-thumb),
:deep(.预览区-主体::-webkit-scrollbar-thumb) {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

:deep(.树形列表::-webkit-scrollbar-thumb:hover),
:deep(.预览区-主体::-webkit-scrollbar-thumb:hover) {
  background: rgba(0, 0, 0, 0.25);
}

.深色模式 :deep(.树形列表::-webkit-scrollbar-thumb),
.深色模式 :deep(.预览区-主体::-webkit-scrollbar-thumb) {
  background: rgba(255, 255, 255, 0.2);
}

.深色模式 :deep(.树形列表::-webkit-scrollbar-thumb:hover),
.深色模式 :deep(.预览区-主体::-webkit-scrollbar-thumb:hover) {
  background: rgba(255, 255, 255, 0.35);
}
</style>
