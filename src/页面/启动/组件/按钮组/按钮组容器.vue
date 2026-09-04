<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用快捷键仓库, 匹配快捷键 } from '@/页面/启动/仓库/快捷键仓库'
import CardFormDialog from '@/页面/启动/组件/卡片/卡片表单弹窗.vue'

const 菜单仓库 = 使用菜单仓库()
const 卡片仓库 = 使用卡片仓库()
const 快捷键仓库 = 使用快捷键仓库()

const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动打开卡片

const 是否禁用 = computed(() => {
  const id = 菜单仓库.当前选中ID
  return id === null || !菜单仓库.是否是二级菜单ID(id)
})

const 弹窗可见 = ref(false)
const 弹窗模式 = ref<'url' | 'folder' | 'app'>('url')

const 搜索模式 = ref(false)
const 搜索输入框 = ref<HTMLInputElement | null>(null)
const 本地搜索词 = ref('')
const 输入法刚结束 = ref(false)

function 打开搜索() {
  搜索模式.value = true
  nextTick(() => {
    搜索输入框.value?.focus()
  })
}

function 关闭搜索() {
  搜索模式.value = false
  本地搜索词.value = ''
  菜单仓库.搜索词 = ''
}

function 处理输入法开始() {
  输入法刚结束.value = false
}

function 处理输入法结束() {
  输入法刚结束.value = true
  setTimeout(() => {
    输入法刚结束.value = false
  }, 200)
}

watch(本地搜索词, (词) => {
  菜单仓库.搜索词 = 词
})

/** 按钮配置 */
const 按钮列表 = [
  { id: '添加网页', 图标: 'fa-link', 标签: '添加网页', 模式: 'url' as const },
  { id: '添加文件夹', 图标: 'fa-folder', 标签: '添加文件夹', 模式: 'folder' as const },
  { id: '添加程序', 图标: 'fa-mobile-alt', 标签: '添加程序', 模式: 'app' as const },
]

const 启动按钮 = { id: '启动', 标签: '启动', 颜色: '橙色' }

/** 点击反馈状态 */
const 点击中按钮ID = ref<string | null>(null)
let 点击定时器: ReturnType<typeof setTimeout> | null = null

function 处理点击(按钮ID: string) {
  if (是否禁用.value) return

  // 添加类按钮弹出对应弹窗
  const 按钮 = 按钮列表.find((b) => b.id === 按钮ID)
  if (按钮) {
    console.log('点击按钮:', 按钮ID, '模式:', 按钮.模式)
    弹窗模式.value = 按钮.模式
    弹窗可见.value = true
    console.log('弹窗可见:', 弹窗可见.value)
    return
  }

  // 启动按钮：启动当前选中二级菜单下的所有卡片
  if (按钮ID === 启动按钮.id) {
    启动所有卡片()
    return
  }
}

/** 启动当前选中的二级菜单下的所有卡片 */
async function 启动所有卡片() {
  const 二级菜单ID = 菜单仓库.最后选中二级菜单ID
  if (二级菜单ID === null) return

  const 卡片列表 = 卡片仓库.卡片列表.filter((c) => c.归属菜单ID === 二级菜单ID)
  if (卡片列表.length === 0) return

  点击中按钮ID.value = 启动按钮.id

  if (是Electron) {
    // 逐个启动卡片（不等待前一个完成，并行启动）
    await Promise.allSettled(
      卡片列表.map((卡片) =>
        window.electronAPI.启动打开卡片(卡片.类型, 卡片.值).catch((e) => {
          console.error(`启动卡片「${卡片.标题}」失败`, e)
        }),
      ),
    )
  } else {
    console.log('非 Electron 环境，跳过启动卡片')
  }

  // 点击反馈
  if (点击定时器) clearTimeout(点击定时器)
  点击定时器 = setTimeout(() => {
    点击中按钮ID.value = null
    点击定时器 = null
  }, 300)
}

function 关闭弹窗() {
  弹窗可见.value = false
}

function 处理CtrlF(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    打开搜索()
  }
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape' && !e.isComposing && !输入法刚结束.value && 搜索模式.value) {
    关闭搜索()
  }
}

function 处理启动快捷键(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  const 标签 = target?.tagName?.toLowerCase()
  if (标签 === 'input' || 标签 === 'textarea' || 标签 === 'select') return
  if (搜索模式.value) return
  if (匹配快捷键(e, 快捷键仓库.启动快捷键)) {
    e.preventDefault()
    启动所有卡片()
  }
}

onMounted(() => {
  document.addEventListener('keydown', 处理CtrlF)
  document.addEventListener('keydown', 处理Esc)
  document.addEventListener('keydown', 处理启动快捷键)
})

onUnmounted(() => {
  document.removeEventListener('keydown', 处理CtrlF)
  document.removeEventListener('keydown', 处理Esc)
  document.removeEventListener('keydown', 处理启动快捷键)
})
</script>

<template>
  <div class="按钮组容器">
    <div v-show="!菜单仓库.是否紧凑" class="按钮组内边距">
      <!-- 左侧按钮组 -->
      <div class="左侧按钮容器">
        <template v-if="!搜索模式">
          <button class="图标文字按钮 搜索按钮" title="搜索卡片（Ctrl+F）" @click="打开搜索()">
            <i class="fas fa-search"></i>
          </button>
          <button v-for="按钮 in 按钮列表" :key="按钮.id" class="图标文字按钮" :class="{ 按钮点击中: 点击中按钮ID === 按钮.id, 禁用: 是否禁用 }" :disabled="是否禁用" @click="处理点击(按钮.id)">
            <i :class="['fas', 按钮.图标]"></i>
            <span>{{ 按钮.标签 }}</span>
          </button>
        </template>
        <template v-else>
          <div class="搜索栏">
            <input ref="搜索输入框" v-model="本地搜索词" class="搜索输入框" placeholder="搜索卡片标题…" @compositionstart="处理输入法开始" @compositionend="处理输入法结束" />
            <i class="fas fa-search 搜索输入图标"></i>
            <button class="搜索关闭按钮" @click="关闭搜索()"><i class="fas fa-times"></i></button>
          </div>
        </template>
      </div>

      <div v-if="!搜索模式" class="右侧按钮容器">
        <button class="主要按钮" :class="{ 按钮点击中: 点击中按钮ID === 启动按钮.id, 禁用: 是否禁用 }" :disabled="是否禁用" @click="处理点击(启动按钮.id)">
          <span>{{ 启动按钮.标签 }}</span>
        </button>
      </div>
    </div>

    <!-- 添加卡片弹窗 -->
    <CardFormDialog :可见="弹窗可见" 模式="add" :卡片类型="弹窗模式" @关闭="关闭弹窗" />
  </div>
</template>

<style scoped>
/* ===== 容器 ===== */
.按钮组容器 {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  min-height: 70px;
  background: transparent;
}

.按钮组内边距 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
  max-width: 800px;
  padding: 12px 24px;
}

/* ===== 左区 ===== */
.左侧按钮容器 {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  justify-content: center;
}

.搜索按钮 {
  min-width: unset;
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  justify-content: center;
  background-color: #5b8cbf;
  box-shadow: 0 2px 8px rgba(91, 140, 191, 0.3);
}

.搜索按钮:hover:not(:disabled) {
  background-color: #4a7aae;
  box-shadow: 0 4px 12px rgba(91, 140, 191, 0.4);
}

.搜索栏 {
  display: flex;
  align-items: center;
  width: 320px;
  position: relative;
}

.搜索输入框 {
  width: 100%;
  padding: 8px 64px 8px 36px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 24px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.搜索输入框:focus {
  border-color: var(--全站通用文字颜色);
}

.搜索输入框::placeholder {
  color: var(--弱化文字颜色);
}

.搜索输入图标 {
  position: absolute;
  left: 14px;
  color: var(--弱化文字颜色);
  font-size: 13px;
  pointer-events: none;
}

.搜索关闭按钮 {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  transition: all 0.15s;
}

.搜索关闭按钮:hover {
  color: var(--全站通用文字颜色);
  background: rgba(255, 255, 255, 0.1);
}

/* ===== 右区 ===== */
.右侧按钮容器 {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ===== 按钮通用 ===== */
.图标文字按钮,
.主要按钮 {
  border: none;
  cursor: pointer;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  transition: all 0.2s ease;
  white-space: nowrap;
  user-select: none;
}

.图标文字按钮:disabled,
.主要按钮:disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: default;
}

/* ===== 图标文字按钮（薄荷色） ===== */
.图标文字按钮 {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 120px;
  height: 48px;
  padding: 10px 24px;
  background-color: #3eb489;
  color: #ffffff;
  border-radius: 24px;
  font-size: 0.95rem;
  box-shadow: 0 2px 8px rgba(62, 180, 137, 0.3);
  justify-content: center;
}

.图标文字按钮 i {
  font-size: 1rem;
}

.图标文字按钮:hover:not(:disabled) {
  background-color: #36a078;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(62, 180, 137, 0.4);
}

.图标文字按钮:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(62, 180, 137, 0.3);
}

/* ===== 主要按钮（橙色） ===== */
.主要按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  height: 48px;
  padding: 10px 32px;
  background-color: #ff8c00;
  color: #ffffff;
  font-weight: bold;
  border-radius: 24px;
  font-size: 1.05rem;
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

.主要按钮:hover:not(:disabled) {
  background-color: #e67e00;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 140, 0, 0.4);
}

.主要按钮:active:not(:disabled) {
  background-color: #cc7000;
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(255, 140, 0, 0.3);
}

/* ===== 点击反馈 ===== */
.图标文字按钮.按钮点击中,
.主要按钮.按钮点击中 {
  transition: none;
}

/* ===== 响应式：≤768px 纵向堆叠 ===== */
@media (max-width: 768px) {
  .按钮组内边距 {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .左侧按钮容器 {
    flex-direction: column;
    width: 100%;
    gap: 12px;
  }

  .图标文字按钮 {
    width: 100%;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
  }

  .右侧按钮容器 {
    width: 100%;
    justify-content: center;
  }

  .主要按钮 {
    width: 100%;
    max-width: 300px;
  }
}

/* ===== 响应式：≤480px 按钮换行 ===== */
@media (max-width: 480px) {
  .左侧按钮容器 {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 8px;
  }

  .图标文字按钮 {
    width: calc(50% - 4px);
    min-width: unset;
  }

  .图标文字按钮:last-child {
    width: 100%;
  }
}
</style>
