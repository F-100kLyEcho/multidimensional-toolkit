<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { 使用设置面板仓库 } from '@/页面/启动/仓库/设置面板仓库'
import ThemeSettings from './主题设置.vue'
import CardSettings from './卡片设置.vue'
import ShortcutSettings from './快捷键设置.vue'

const 设置面板仓库 = 使用设置面板仓库()
const 当前路由 = useRoute()

const 是启动页 = computed(() => 当前路由.path === '/Q1')

// 启动页与图标库页分别持久化当前面板ID
function 当前页面键() {
  return 是启动页.value ? '设置面板-启动页-当前面板ID' : '设置面板-图标库页-当前面板ID'
}

function 读取当前页面面板ID(): string {
  let 值 = localStorage.getItem(当前页面键()) || '主题面板'
  // 图标库页无快捷键面板，回退主题
  if (!是启动页.value && 值 === '快捷键面板') {
    值 = '主题面板'
  }
  return 值
}

const 当前面板ID = ref(读取当前页面面板ID())

function 切换面板(面板ID: string) {
  当前面板ID.value = 面板ID
  localStorage.setItem(当前页面键(), 面板ID)
}

// 切换页面时加载对应页面的面板ID
watch(是启动页, () => {
  当前面板ID.value = 读取当前页面面板ID()
})

function 关闭面板() {
  设置面板仓库.关闭面板()
}

function 处理全局点击(event: MouseEvent) {
  if (!设置面板仓库.面板可见) return
  const 面板元素 = document.querySelector('.设置面板')
  const 设置图标元素 = document.querySelector('#设置图标')
  const 壁纸库弹窗 = document.querySelector('.壁纸库弹窗')
  const 壁纸库右键菜单 = document.querySelector('.右键菜单')
  const 壁纸库确认弹窗 = document.querySelector('.确认弹窗')
  const 壁纸库图标面板 = document.querySelector('.壁纸库图标面板遮罩')
  const 图片右键菜单 = document.querySelector('.图片右键菜单')
  const 裁切弹窗 = document.querySelector('.裁切弹窗')
  if (面板元素?.contains(event.target as Node)) return
  if (设置图标元素?.contains(event.target as Node)) return
  if (壁纸库弹窗?.contains(event.target as Node)) return
  if (壁纸库右键菜单?.contains(event.target as Node)) return
  if (壁纸库确认弹窗?.contains(event.target as Node)) return
  if (壁纸库图标面板?.contains(event.target as Node)) return
  if (图片右键菜单?.contains(event.target as Node)) return
  if (裁切弹窗?.contains(event.target as Node)) return
  关闭面板()
}

function 处理键盘事件(event: KeyboardEvent) {
  if (event.key === 'Escape' && 设置面板仓库.面板可见) {
    关闭面板()
  }
}

onMounted(() => {
  document.addEventListener('click', 处理全局点击, true)
  document.addEventListener('keydown', 处理键盘事件)
})

onUnmounted(() => {
  document.removeEventListener('click', 处理全局点击, true)
  document.removeEventListener('keydown', 处理键盘事件)
})
</script>

<template>
  <div class="设置面板" :class="{ 显示: 设置面板仓库.面板可见 }">
    <div class="设置面板主体">
      <div class="设置菜单栏">
        <div class="设置标题">设置</div>
        <div class="设置菜单项" :class="{ 激活: 当前面板ID === '主题面板' }" @click="切换面板('主题面板')">主题</div>
        <div class="设置菜单项" :class="{ 激活: 当前面板ID === '卡片面板' }" @click="切换面板('卡片面板')">卡片</div>
        <div v-if="是启动页" class="设置菜单项" :class="{ 激活: 当前面板ID === '快捷键面板' }" @click="切换面板('快捷键面板')">快捷键</div>
      </div>
      <div class="设置内容区">
        <div id="主题面板" class="设置面板内容" :class="{ 激活: 当前面板ID === '主题面板' }">
          <ThemeSettings />
        </div>
        <div id="卡片面板" class="设置面板内容" :class="{ 激活: 当前面板ID === '卡片面板' }">
          <CardSettings />
        </div>
        <div v-if="是启动页" id="快捷键面板" class="设置面板内容" :class="{ 激活: 当前面板ID === '快捷键面板' }">
          <ShortcutSettings />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.设置面板 {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border-left: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  z-index: 999;
  transform: translateX(100%);
  opacity: 0;
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s ease;
  overflow-y: auto;
  display: flex;
}
.设置面板.显示 {
  transform: translateX(0);
  opacity: 1;
}
.设置面板主体 {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.设置菜单栏 {
  width: 100px;
  background: rgba(0, 0, 0, 0.2);
  padding: 10px 0;
}
.设置标题 {
  font-size: 20px;
  font-weight: bold;
  padding: 20px;
  color: var(--全站透明文字颜色);
}
.设置菜单项 {
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--全站透明文字颜色);
}
.设置菜单项:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.设置菜单项.激活 {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
}
.设置内容区 {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
.设置面板内容 {
  display: none;
}
.设置面板内容.激活 {
  display: block;
}
</style>
