<script setup lang="ts">
import '@fortawesome/fontawesome-free/css/all.min.css'
import { onMounted, onUnmounted, watch, nextTick } from 'vue'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用侧边栏菜单仓库 } from '@/页面/启动/仓库/侧边栏菜单仓库'
import 菜单树 from './组件/树形菜单容器.vue'
import MainLayout from './组件/布局/主布局.vue'
import ContentLayout from './组件/布局/内容区布局.vue'

const 菜单仓库 = 使用菜单仓库()
const 侧边栏菜单仓库 = 使用侧边栏菜单仓库()

/** 首次进入：恢复最后选中二级菜单或默认选中第一个二级菜单 */
function 处理首次进入() {
  const 持久化 = JSON.parse(localStorage.getItem('最后选中二级菜单ID') || 'null')
  if (持久化 !== null && 菜单仓库.是否是二级菜单ID(持久化)) {
    菜单仓库.设置选中(持久化)
  } else {
    // 查找第一个可用二级菜单
    const 第一个一级 = 菜单仓库.菜单列表[0]
    if (第一个一级?.子菜单.length) {
      const 第一个二级 = 第一个一级.子菜单[0]
      if (第一个二级) {
        菜单仓库.设置选中(第一个二级.唯一ID)
      }
    }
  }
}

/** 等待菜单数据加载后执行首次进入逻辑 */
function 等待数据并初始化() {
  // 如果已有菜单数据，直接处理
  if (菜单仓库.菜单列表.length > 0) {
    nextTick(() => 处理首次进入())
    return
  }
  // 否则等待菜单列表变化
  const 停止 = watch(
    () => 菜单仓库.菜单列表,
    (列表) => {
      if (列表.length > 0) {
        nextTick(() => 处理首次进入())
        停止()
      }
    },
  )
}

onMounted(() => {
  侧边栏菜单仓库.设置菜单(菜单树)
  等待数据并初始化()
})

onUnmounted(() => {
  侧边栏菜单仓库.清除菜单()
})
</script>

<template>
  <MainLayout>
    <ContentLayout />
  </MainLayout>
</template>
