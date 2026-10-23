<template>
  <div class="首页" :class="{ 浅色模式: !深色模式 }" @click="关闭右键菜单">
    <!-- 顶部拖拽条：无边框窗口拖动区 -->
    <div class="首页拖拽条"></div>
    <!-- 主内容区：按钮 -->
    <div class="按钮容器">
      <button class="按钮" @click="跳转到启动" @contextmenu.prevent="打开右键菜单($event, '/Q1')">启动</button>
      <button class="按钮" @click="跳转到图标库" @contextmenu.prevent="打开右键菜单($event, '/图标库管理')">图标库</button>
      <button class="按钮" @click="跳转到记忆泡" @contextmenu.prevent="打开右键菜单($event, '/记忆泡')">记忆</button>
      <button class="按钮" @click="跳转到获取路径" @contextmenu.prevent="打开右键菜单($event, '/H1')">获取路径</button>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="右键菜单显示" class="右键菜单" :style="{ left: 右键菜单X + 'px', top: 右键菜单Y + 'px' }">
        <div class="右键菜单-项" @click="点击弹出窗口">新窗口打开</div>
        <div class="右键菜单-分隔线"></div>
        <div class="右键菜单-项 右键菜单-取消" @click="关闭右键菜单">取消</div>
      </div>
    </Teleport>

    <!-- 底部工具栏 -->
    <DiBaoGongJuLan :工作空间列表="工作空间列表" :当前工作空间名称="当前工作空间名称" @打开设置="设置弹窗显示 = true" @切换工作空间="执行切换工作空间" @切换开机自启="执行切换开机自启" @切换默认启动页="执行切换默认启动页" @打开手册="执行打开手册" @主题变化="深色模式 = $event" />

    <!-- 工作空间管理弹窗 -->
    <GongZuoKongJianGuanLiTanChuang :显示="设置弹窗显示" :工作空间列表="工作空间列表" :当前工作空间名称="当前工作空间名称" @关闭="设置弹窗显示 = false" @刷新列表="刷新工作空间列表" @打开复制="打开复制弹窗" />

    <!-- 复制工作空间弹窗 -->
    <FuZhiGongZuoKongJianTanChuang :显示="复制弹窗显示" :源名称="复制源名称" @关闭="复制弹窗显示 = false" @复制完成="刷新工作空间列表" />

    <!-- 确认弹窗 -->
    <QueRenTanChuang :显示="确认弹窗显示" :内容="确认弹窗内容" :浅色模式="!深色模式" @确认="确认弹窗回调" @取消="确认弹窗显示 = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DiBaoGongJuLan from './组件/底部工具栏.vue'
import GongZuoKongJianGuanLiTanChuang from './组件/工作空间管理弹窗.vue'
import FuZhiGongZuoKongJianTanChuang from './组件/复制工作空间弹窗.vue'
import QueRenTanChuang from './组件/确认弹窗.vue'
import { 使用全局快捷键 } from '@/组合式函数/使用全局快捷键'
import { 应用标题栏符号色, 由深色模式取符号色 } from '@/组合式函数/使用标题栏颜色'

const router = useRouter()

// ==================== 环境检测 ====================

const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

// ==================== 右键菜单 ====================

const 右键菜单显示 = ref(false)
const 右键菜单X = ref(0)
const 右键菜单Y = ref(0)
const 当前右键路由 = ref('')

// ==================== 工作空间状态 ====================

const 工作空间列表 = ref<{ 名称: string; 路径: string }[]>([])
const 当前工作空间名称 = ref('')
const 设置弹窗显示 = ref(false)
const 复制弹窗显示 = ref(false)
const 复制源名称 = ref('')
const 深色模式 = ref(true)

// ==================== 确认弹窗 ====================

const 确认弹窗显示 = ref(false)
const 确认弹窗内容 = ref('')
const 确认弹窗回调 = ref<() => void>(() => {})

// 无边框窗口：系统按钮符号色跟随明暗模式
应用标题栏符号色(() => 由深色模式取符号色(深色模式.value))

// ==================== 生命周期 ====================

onMounted(() => {
  if (是否Electron环境) {
    刷新工作空间列表()
  }
})

使用全局快捷键()

// ==================== 路由跳转 ====================

function 跳转到启动() {
  router.push('/Q1')
}

function 跳转到图标库() {
  router.push('/图标库管理')
}

function 跳转到记忆泡() {
  router.push('/记忆泡')
}

function 跳转到获取路径() {
  router.push('/H1')
}

// ==================== 右键菜单 ====================

function 打开右键菜单(event: MouseEvent, 路由: string) {
  当前右键路由.value = 路由
  右键菜单显示.value = true
  右键菜单X.value = event.clientX
  右键菜单Y.value = event.clientY
}

function 关闭右键菜单() {
  右键菜单显示.value = false
}

async function 点击弹出窗口() {
  if (是否Electron环境) {
    await window.electronAPI.创建独立窗口(当前右键路由.value)
  }
  关闭右键菜单()
}

// ==================== 工作空间操作 ====================

async function 刷新工作空间列表() {
  if (!是否Electron环境) return
  try {
    const r = await window.electronAPI.首页读取工作空间列表()
    if (r.成功) {
      工作空间列表.value = r.工作空间列表 || []
      当前工作空间名称.value = r.当前工作空间名称 || ''
    }
  } catch {
    // 忽略
  }
}

async function 执行切换工作空间(名称: string) {
  if (!是否Electron环境) return
  确认弹窗内容.value = `确定切换到工作空间「${名称}」吗？\n应用将重启以加载新工作空间。`
  确认弹窗回调.value = async () => {
    try {
      await window.electronAPI.首页切换工作空间(名称)
    } catch {
      // 忽略
    }
  }
  确认弹窗显示.value = true
}

async function 执行切换开机自启(开启: boolean) {
  if (!是否Electron环境) return
  try {
    await window.electronAPI.首页设置开机自启(开启)
  } catch {
    // 忽略
  }
}

async function 执行切换默认启动页(路由: string) {
  if (!是否Electron环境) return
  try {
    await window.electronAPI.首页设置默认启动页(路由)
  } catch {
    // 忽略
  }
}

function 打开复制弹窗(源名称: string) {
  复制源名称.value = 源名称
  复制弹窗显示.value = true
}

function 执行打开手册() {
  if (!是否Electron环境) return
  window.electronAPI.创建独立窗口('/manual/home')
}
</script>

<style scoped>
.首页 {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  width: 100vw;
  background: #000;
  margin: 0;
  padding: 0;
  transition: background 0.3s;
}

/* 顶部拖拽条：无边框窗口拖动区，透明覆盖顶部 */
.首页拖拽条 {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 32px;
  -webkit-app-region: drag;
  z-index: 100;
}

.首页.浅色模式 {
  background: #f5f5f5;
}

.首页.浅色模式 .按钮 {
  background: rgba(0, 0, 0, 0.08);
  color: rgba(0, 0, 0, 0.85);
}

.首页.浅色模式 .按钮:hover {
  background: rgba(0, 0, 0, 0.14);
}

.按钮容器 {
  display: flex;
  flex-direction: row;
  gap: 30px;
  align-items: center;
}

.按钮 {
  width: 100px;
  height: 100px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.按钮:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.按钮:active {
  transform: scale(0.95);
}

/* 右键菜单 */
.右键菜单 {
  position: fixed;
  z-index: 9999;
  background: #2a2a2a;
  border: 1px solid #444;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  padding: 4px 0;
  min-width: 140px;
}
.右键菜单-项 {
  padding: 6px 16px;
  font-size: 13px;
  color: #e0e0e0;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}
.右键菜单-项:hover {
  background: #0078d4;
  color: #fff;
}
.右键菜单-取消 {
  color: #999;
}
.右键菜单-取消:hover {
  background: #3a3a3a;
  color: #ccc;
}
.右键菜单-分隔线 {
  height: 1px;
  background: #444;
  margin: 4px 0;
}
</style>
