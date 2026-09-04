<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

watch(
  () => router.currentRoute.value,
  (路由) => {
    const 标题 = (路由.meta?.title as string) ?? '多维工具箱'
    document.title = 标题
  },
  { immediate: true },
)

onMounted(async () => {
  if (router.currentRoute.value.path !== '/') return
  if (typeof window === 'undefined' || !window.electronAPI) return
  try {
    const 结果 = await window.electronAPI.首页读取默认启动页()
    if (结果.成功 && 结果.路由 && 结果.路由 !== '/') {
      router.replace(结果.路由)
    }
  } catch {
    // 忽略
  }
})
</script>

<template>
  <!-- 直接渲染路由视图，不再包裹主布局 -->
  <router-view />
</template>
<style>
/* 仅重置边距，不强制隐藏溢出 */
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
}
#app {
  height: 100vh; /* 撑满视口高度，但允许滚动 */
}
</style>
