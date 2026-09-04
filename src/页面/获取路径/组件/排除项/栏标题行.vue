<script setup lang="ts">
/**
 * 栏标题行组件
 *
 * 功能组件（从左至右）：
 * 1. 隐藏按钮 – 控制中栏的显示/隐藏
 * 2. 可编辑标题 – 显示当前规则文件名称，支持编辑
 * 3. 下拉菜单按钮 – 浏览/管理已创建的规则文件列表
 * 4. 新建按钮 – 创建新的规则文件
 *
 * 标题状态机：
 * - 初始态：灰色占位符"未创建规则"，不可点击
 * - 待命名态：显示"排除规则"，不可点击（新建后进入）
 * - 编辑态：输入框，可编辑
 * - 已命名态：用户确定的名称，点击可进入编辑态
 *
 * 重名检测：提交时检查是否与已有文件重名，若重名则触发抖动动画+标红，恢复原标题
 *
 * 下拉菜单：
 * - 删除规则后菜单保持不关闭
 * - 底部有"清空全部"按钮
 * - 规则多时显示垂直滚动条，少时不显示
 */
import { ref, computed, watch } from 'vue'

defineOptions({
  name: 'BarTitleLine',
})

const props = defineProps<{
  /** 当前标题文本 */
  标题: string
  /** 是否有规则文件存在 */
  有规则文件: boolean
  /** 规则文件列表 */
  规则文件列表: string[]
  /** 是否处于待命名态（新建后不可编辑） */
  待命名: boolean
}>()

const emit = defineEmits<{
  切换中栏: []
  新建规则: []
  复制规则: []
  切换规则文件: [文件名: string]
  删除规则文件: [文件名: string]
  标题提交: [新标题: string]
  清空所有规则文件: []
}>()

// ==================== 可编辑标题状态 ====================

/** 是否处于编辑态 */
const 编辑中 = ref(false)
/** 编辑态输入框的值 */
const 编辑值 = ref('')
/** 输入框引用 */
const 输入框引用 = ref<HTMLInputElement | null>(null)

/** 标题是否可点击进入编辑态 */
const 标题可编辑 = computed(() => {
  return props.标题 !== '未创建规则' && !props.待命名
})

/** 显示的标题文本 */
const 显示标题 = computed(() => {
  if (编辑中.value) return ''
  return props.标题
})

/** 标题文本颜色样式 */
const 标题颜色类 = computed(() => {
  if (编辑中.value) return ''
  if (props.标题 === '未创建规则') return '标题-初始态'
  if (props.待命名) return '标题-待命名'
  return '标题-已命名'
})

// ==================== 重名抖动状态 ====================

/** 是否处于重名抖动状态 */
const 重名抖动 = ref(false)

/** 触发重名抖动动画 */
function 触发重名抖动() {
  重名抖动.value = true
  // 动画结束后移除抖动类
  setTimeout(() => {
    重名抖动.value = false
  }, 500)
}

// ==================== 标题交互 ====================

function 点击标题() {
  if (!标题可编辑.value) return
  进入编辑态()
}

function 进入编辑态() {
  编辑中.value = true
  编辑值.value = props.标题
  // 下一帧聚焦输入框，将光标移到末尾
  setTimeout(() => {
    const input = 输入框引用.value
    if (input) {
      input.focus()
      const len = input.value.length
      input.setSelectionRange(len, len)
    }
  }, 0)
}

function 提交编辑() {
  编辑中.value = false
  const 新值 = 编辑值.value.trim()
  if (!新值 || 新值 === props.标题) return

  // 检查重名：新文件名（加 .mdignore）是否已存在于文件列表中
  const 新文件名 = `${新值}.mdignore`
  if (props.规则文件列表.includes(新文件名)) {
    // 重名：触发抖动，恢复原标题
    触发重名抖动()
    编辑值.value = props.标题
    return
  }

  emit('标题提交', 新值)
}

function 处理键盘(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    提交编辑()
  } else if (e.key === 'Escape') {
    编辑中.value = false
    编辑值.value = props.标题
  }
}

// 当父组件标题变化时，如果不在编辑态则同步
watch(
  () => props.标题,
  () => {
    if (!编辑中.value) {
      编辑值.value = props.标题
    }
  },
)

// ==================== 下拉菜单状态 ====================

const 下拉展开 = ref(false)
const 下拉按钮引用 = ref<HTMLButtonElement | null>(null)

function 切换下拉() {
  if (!props.有规则文件) return
  下拉展开.value = !下拉展开.value
}

function 选择规则文件(文件名: string, event: MouseEvent) {
  event.stopPropagation()
  下拉展开.value = false
  emit('切换规则文件', 文件名)
}

function 删除文件(文件名: string, event: MouseEvent) {
  event.stopPropagation()
  // 删除后菜单保持不关闭
  emit('删除规则文件', 文件名)
}

function 清空全部(event: MouseEvent) {
  event.stopPropagation()
  下拉展开.value = false
  emit('清空所有规则文件')
}

function 点击外部关闭下拉(e: MouseEvent) {
  if (下拉展开.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.下拉菜单容器')) {
      下拉展开.value = false
    }
  }
}

/** Esc 键关闭下拉菜单 */
function 处理键盘关闭下拉(e: KeyboardEvent) {
  if (e.key === 'Escape' && 下拉展开.value) {
    下拉展开.value = false
  }
}

// 全局点击关闭下拉 + Esc 关闭
import { onMounted, onUnmounted } from 'vue'
onMounted(() => {
  document.addEventListener('click', 点击外部关闭下拉)
  document.addEventListener('keydown', 处理键盘关闭下拉)
})
onUnmounted(() => {
  document.removeEventListener('click', 点击外部关闭下拉)
  document.removeEventListener('keydown', 处理键盘关闭下拉)
})
</script>

<template>
  <div class="栏标题行">
    <!-- 1. 隐藏按钮 -->
    <button class="隐藏按钮" title="隐藏此栏（快捷键 Q）" @click="emit('切换中栏')">
      <i class="fas fa-eye-slash"></i>
    </button>

    <!-- 2. 可编辑标题 -->
    <div class="标题区域" :class="[标题颜色类, { '标题-重名抖动': 重名抖动 }]" @click="点击标题">
      <!-- 编辑态：输入框 -->
      <input v-if="编辑中" ref="输入框引用" v-model="编辑值" type="text" class="标题输入框" :class="{ '标题输入框-重名': 重名抖动 }" @keydown="处理键盘" @blur="提交编辑" />
      <!-- 非编辑态：显示文本 -->
      <span v-else class="标题文本">{{ 显示标题 }}</span>
    </div>

    <!-- 3. 下拉菜单按钮 -->
    <div class="下拉菜单容器">
      <button ref="下拉按钮引用" class="下拉按钮" :class="{ '下拉按钮-禁用': !有规则文件 }" :disabled="!有规则文件" title="切换规则文件" @click="切换下拉">
        <i class="fas fa-sort-down"></i>
      </button>
      <!-- 下拉菜单 -->
      <div v-if="下拉展开" class="下拉菜单">
        <!-- 文件列表区域：规则多时滚动，少时不滚动 -->
        <div class="下拉菜单-文件列表">
          <div v-for="文件名 in 规则文件列表" :key="文件名" class="下拉菜单-项" @click="选择规则文件(文件名, $event)">
            <span class="下拉菜单-文件名">{{ 文件名 }}</span>
            <button class="下拉菜单-删除" title="删除此规则文件" @click="删除文件(文件名, $event)">✕</button>
          </div>
          <div v-if="规则文件列表.length === 0" class="下拉菜单-空">暂无规则文件</div>
        </div>
        <!-- 清空全部按钮 -->
        <div v-if="规则文件列表.length > 0" class="下拉菜单-清空全部" @click="清空全部($event)">清空全部</div>
      </div>
    </div>

    <!-- 4. 复制按钮 -->
    <button class="复制按钮" :disabled="!有规则文件" title="复制当前规则文件" @click="emit('复制规则')">
      <i class="fas fa-copy"></i>
    </button>

    <!-- 5. 新建按钮 -->
    <button class="新建按钮" title="创建新的规则文件" @click="emit('新建规则')">
      <i class="fas fa-plus"></i>
    </button>
  </div>
</template>

<style scoped>
.栏标题行 {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 10px;
  flex-shrink: 0;
}

/* ======== 隐藏按钮 ======== */
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

/* ======== 标题区域 ======== */
.标题区域 {
  flex: 1;
  min-width: 0;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: default;
  transition: background 0.15s;
}
.标题区域:hover:not(.标题-初始态) {
  background: #e8e8e8;
}

.标题-初始态 {
  color: #bbb;
  cursor: default;
}
.标题-待命名 {
  color: #888;
  cursor: default;
}
.标题-已命名 {
  color: #333;
  cursor: pointer;
}

.标题文本 {
  display: block;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.标题输入框 {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid #0078d4;
  border-radius: 4px;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  background: #fff;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

/* ======== 重名抖动动画 ======== */
@keyframes 抖动 {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  50%,
  90% {
    transform: translateX(-4px);
  }
  30%,
  70% {
    transform: translateX(4px);
  }
}

.标题-重名抖动 {
  animation: 抖动 0.5s ease-in-out;
  color: #d32f2f !important;
}

.标题输入框-重名 {
  border-color: #d32f2f !important;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.25) !important;
  color: #d32f2f !important;
}

/* ======== 下拉菜单 ======== */
.下拉菜单容器 {
  position: relative;
}

.下拉按钮 {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.下拉按钮:hover:not(:disabled) {
  background: #e0e0e0;
}
.下拉按钮-禁用 {
  opacity: 0.45;
  cursor: not-allowed;
}

.下拉菜单 {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 220px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
  overflow: hidden;
}

/* 文件列表容器：规则少时自适应高度，多时滚动 */
.下拉菜单-文件列表 {
  max-height: 80vh; /* 占视口高度80% */
  overflow-y: auto; /* 超出时自动出现滚动条 */
  padding: 4px 0;
}

.下拉菜单-文件列表-可滚动 {
  max-height: 220px;
  overflow-y: auto;
}

.下拉菜单-项 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 13px;
}
.下拉菜单-项:hover {
  background: #f0f7ff;
}

.下拉菜单-文件名 {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}

.下拉菜单-删除 {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.下拉菜单-删除:hover {
  background: #ffebee;
  color: #d32f2f;
}

.下拉菜单-空 {
  padding: 12px 16px;
  color: #999;
  font-size: 13px;
  text-align: center;
}

/* 清空全部按钮 */
.下拉菜单-清空全部 {
  padding: 8px 12px;
  text-align: center;
  color: #d32f2f;
  font-size: 12px;
  cursor: pointer;
  border-top: 1px solid #eee;
  transition: background 0.1s;
}
.下拉菜单-清空全部:hover {
  background: #ffebee;
}

/* ======== 复制按钮 ======== */
.复制按钮 {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.复制按钮:hover:not(:disabled) {
  background: #e0e0e0;
  color: #333;
}
.复制按钮:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ======== 新建按钮 ======== */
.新建按钮 {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  cursor: pointer;
  transition: all 0.15s;
}
.新建按钮:hover {
  background: #e0e0e0;
  color: #333;
}
</style>
