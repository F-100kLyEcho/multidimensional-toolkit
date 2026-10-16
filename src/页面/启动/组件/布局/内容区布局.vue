<script setup lang="ts">
/**
 * 内容区上下布局容器
 * - 上区（flex: 9）：卡片容器
 * - 下区（flex: 1）：按钮组容器
 *
 * 功能：上下滚动到边界时自动切换二级菜单（跨一级菜单，循环）
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import BtnGroup from '@/页面/启动/组件/按钮组/按钮组容器.vue'
import CardContainer from '@/页面/启动/组件/卡片/卡片容器.vue'

const 菜单仓库 = 使用菜单仓库()
const 卡片仓库 = 使用卡片仓库()
const 主题仓库 = 使用主题仓库()
const 上区Ref = ref<HTMLElement | null>(null)

const 粘贴菜单 = ref({ 可见: false, x: 0, y: 0 })

function 处理上区右键(event: MouseEvent) {
  if (!卡片仓库.卡片剪贴板) return
  const 当前选中 = 菜单仓库.最后选中二级菜单ID
  if (当前选中 === null) return
  event.preventDefault()
  粘贴菜单.value = { 可见: true, x: event.clientX, y: event.clientY }
}

function 关闭粘贴菜单() {
  粘贴菜单.value.可见 = false
}

function 执行粘贴() {
  const 当前选中 = 菜单仓库.最后选中二级菜单ID
  if (当前选中 !== null) {
    卡片仓库.粘贴卡片(当前选中)
  }
  关闭粘贴菜单()
}

/** 防抖切换，防止连续触发 */
let 切换锁 = false

/** 处理滚轮事件：Ctrl+滚轮缩放卡片大小 / Shift+滚轮调整卡片圆角；否则到达边界时切换二级菜单 */
function 处理滚轮(event: WheelEvent) {
  // Ctrl+滚轮：缩放卡片大小（上滚放大/下滚缩小，步长 2，范围 50–200；紧凑模式下不启用）
  if (event.ctrlKey) {
    if (菜单仓库.是否紧凑) return
    event.preventDefault()
    const 步长 = 2
    const 最小尺寸 = 50
    const 最大尺寸 = 200
    const 当前 = 主题仓库.卡片尺寸
    const 下一个 = event.deltaY < 0 ? 当前 + 步长 : 当前 - 步长
    主题仓库.卡片尺寸 = Math.max(最小尺寸, Math.min(最大尺寸, 下一个))
    return
  }

  // Shift+滚轮：调整卡片圆角（上滚增大/下滚减小，步长 1，范围 0–卡片圆角最大值；紧凑模式下不启用）
  if (event.shiftKey) {
    if (菜单仓库.是否紧凑) return
    event.preventDefault()
    const 步长 = 4
    const 当前 = 主题仓库.卡片圆角
    const 最大 = 主题仓库.卡片圆角最大值
    const 下一个 = event.deltaY < 0 ? 当前 + 步长 : 当前 - 步长
    主题仓库.卡片圆角 = Math.max(0, Math.min(最大, 下一个))
    return
  }

  const 上区 = 上区Ref.value
  if (!上区) return

  // 没有选中的二级菜单时不做操作
  const 当前选中 = 菜单仓库.最后选中二级菜单ID
  if (当前选中 === null) return

  const { scrollTop, scrollHeight, clientHeight } = 上区

  if (event.deltaY > 0) {
    // 向下滚动：检查是否到达底部
    if (scrollTop >= scrollHeight - clientHeight - 1) {
      if (切换锁) return
      切换锁 = true
      const 下一个 = 菜单仓库.获取相邻二级菜单(当前选中, 'next')
      if (下一个 !== null) {
        菜单仓库.设置选中(下一个)
        上区.scrollTop = 0
      }
      setTimeout(() => {
        切换锁 = false
      }, 300)
    }
  } else if (event.deltaY < 0) {
    // 向上滚动：检查是否到达顶部
    if (scrollTop <= 0) {
      if (切换锁) return
      切换锁 = true
      const 上一个 = 菜单仓库.获取相邻二级菜单(当前选中, 'prev')
      if (上一个 !== null) {
        菜单仓库.设置选中(上一个)
        // 切换到上一个后，让滚动条保持在底部，以便继续向上滚可以再次触发
        requestAnimationFrame(() => {
          上区.scrollTop = 上区.scrollHeight
        })
      }
      setTimeout(() => {
        切换锁 = false
      }, 300)
    }
  }
}

onMounted(() => {
  const 上区 = 上区Ref.value
  if (上区) {
    上区.addEventListener('wheel', 处理滚轮, { passive: false })
  }
})

onUnmounted(() => {
  const 上区 = 上区Ref.value
  if (上区) {
    上区.removeEventListener('wheel', 处理滚轮)
  }
})
</script>

<template>
  <div class="内容区布局">
    <!-- 上区：卡片（切换动画在 .卡片网格 上，避免 key 重建破坏 SortableJS 拖拽） -->
    <section ref="上区Ref" class="上区" @contextmenu="处理上区右键">
      <div class="卡片动画容器">
        <slot name="上区">
          <CardContainer />
        </slot>
      </div>
    </section>

    <!-- 下区：按钮组 -->
    <section class="下区"><BtnGroup /></section>

    <!-- 粘贴卡片右键菜单 -->
    <Teleport to="body">
      <div v-if="粘贴菜单.可见" class="粘贴菜单覆盖层" @mousedown="关闭粘贴菜单" @contextmenu.prevent="关闭粘贴菜单"></div>
      <div v-if="粘贴菜单.可见" class="粘贴菜单" :style="{ left: 粘贴菜单.x + 'px', top: 粘贴菜单.y + 'px' }" @click.stop>
        <div class="粘贴菜单项" @click="执行粘贴">
          <i class="fas fa-paste"></i>
          <span>粘贴卡片</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.内容区布局 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.上区 {
  flex: 9;
  display: flex;
  flex-direction: column;
  justify-content: center;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.上区::-webkit-scrollbar {
  display: none;
}

.卡片动画容器 {
  width: 100%;
  margin-top: auto;
}

.下区 {
  flex: 1;
  display: flex;
  min-height: 0;
}
</style>

<style>
.粘贴菜单覆盖层 {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.粘贴菜单 {
  position: fixed;
  z-index: 9999;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.粘贴菜单项 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: pointer;
  color: var(--全站透明文字颜色);
  font-size: 13px;
  transition: background 0.15s;
}
.粘贴菜单项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.粘贴菜单项 i {
  width: 14px;
  text-align: center;
  font-size: 12px;
}
</style>
