<script setup lang="ts">
import '../../样式/main.css'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNavIcons from './侧边栏/侧边栏导航图标.vue'
import SidebarDragBar from './侧边栏/侧边栏拖拽条.vue'
import SettingsPanel from './设置面板/设置面板容器.vue'
import { 使用主题 } from '@/页面/启动/组合式函数/使用主题'
import { 使用侧边栏菜单仓库 } from '@/页面/启动/仓库/侧边栏菜单仓库'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用全局快捷键 } from '@/组合式函数/使用全局快捷键'

const 主题 = 使用主题()
主题.应用主题()

const 菜单仓库 = 使用侧边栏菜单仓库()
const 启动菜单仓库 = 使用菜单仓库()
const 路由 = useRoute()

const 紧凑模式 = computed(() => 启动菜单仓库.是否紧凑)

const 显示毛玻璃 = computed(() => {
  if (是图标库.value && 紧凑模式.value) return false
  return true
})

const 是图标库 = computed(() => 路由.path === '/图标库管理')

使用全局快捷键({
  Tab: () => {
    启动菜单仓库.是否紧凑 = !启动菜单仓库.是否紧凑
  },
  Escape: () => {
    if (启动菜单仓库.是否紧凑) {
      启动菜单仓库.是否紧凑 = false
    }
  },
})
</script>

<template>
  <div class="主布局">
    <template v-if="启动菜单仓库.数据已加载">
      <!-- 毛玻璃层：覆盖图标区 + 菜单容器，单次渲染 backdrop-filter，消除接缝 -->
      <div v-show="显示毛玻璃" class="毛玻璃层" :class="{ '毛玻璃层--紧凑': 紧凑模式 && !是图标库, '毛玻璃层--展开': 菜单仓库.当前组件 && !紧凑模式, '毛玻璃层--仅图标区': 是图标库 && !紧凑模式 }"></div>

      <!-- 图标区：紧凑模式下隐藏 -->
      <aside v-show="!紧凑模式" class="图标区" :class="{ '图标区--加深': 菜单仓库.当前组件 }">
        <SidebarNavIcons />
      </aside>

      <!-- 菜单容器：紧凑模式下宽度变 45px -->
      <div v-if="菜单仓库.当前组件" class="菜单容器" :class="{ '菜单容器--紧凑': 紧凑模式 }">
        <div class="菜单区域">
          <component :is="菜单仓库.当前组件" v-bind="{ ...菜单仓库.组件属性, 紧凑模式 }" />
        </div>
        <!-- 紧凑模式下菜单宽度固定，隐藏拖拽条 -->
        <SidebarDragBar v-show="!紧凑模式" />
      </div>

      <main class="内容区">
        <slot />
      </main>
      <SettingsPanel />
    </template>
  </div>
</template>

<style scoped>
.主布局 {
  position: relative; /* 毛玻璃层的定位锚点 */
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: var(--主布局-背景色, #0a0a0a);
  background-image: var(--主布局-背景图, none);
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

/* 毛玻璃层：绝对定位，覆盖图标区 + 菜单容器，单次渲染 backdrop-filter，消除接缝 */
.毛玻璃层 {
  position: absolute;
  top: 0;
  left: 0;
  width: 46px; /* 默认仅覆盖图标区 */
  height: 100vh;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  z-index: 0;
  pointer-events: none;
  transition: width 0.2s ease;
}

.毛玻璃层--展开 {
  width: calc(46px + var(--菜单区域宽度, 180px) - 2px);
}

.毛玻璃层--紧凑 {
  width: 46px;
}

.毛玻璃层--仅图标区 {
  width: 46px;
}

.图标区 {
  width: 46px;
  flex-shrink: 0;
  height: 100vh;
  background: transparent;
  z-index: 1;
  overflow: hidden;
}
.图标区--加深 {
  background: rgba(0, 0, 0, 0.25);
}

.菜单容器 {
  display: flex;
  flex-shrink: 0;
  height: 100vh;
  width: var(--菜单宽度, 200px);
  min-width: 200px;
  overflow: visible;
  z-index: 1;
  transition: width 0.2s ease;
}

.菜单容器--紧凑 {
  width: 46px;
  min-width: 46px;
}

.菜单区域 {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  height: 100%;
  background: transparent;
}

.菜单区域::-webkit-scrollbar-track {
  background: transparent;
}

.菜单容器--紧凑 .菜单区域 {
  overflow-y: auto;
  scrollbar-gutter: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-right: none;
}

.菜单容器--紧凑 .菜单区域::-webkit-scrollbar {
  display: none;
}

.内容区 {
  flex: 1;
  overflow-y: auto;
  position: relative;
}
</style>
