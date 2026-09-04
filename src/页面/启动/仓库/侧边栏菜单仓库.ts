import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'

export const 使用侧边栏菜单仓库 = defineStore('侧边栏菜单', () => {
  const 当前组件 = shallowRef<any>(null)
  const 组件属性 = ref<Record<string, any>>({})
  const 菜单宽度 = ref(200) // 默认宽度

  function 设置菜单(component: any, props?: Record<string, any>) {
    当前组件.value = component
    组件属性.value = props ?? {}
  }

  function 清除菜单() {
    当前组件.value = null
    组件属性.value = {}
  }

  function 设置宽度(width: number) {
    菜单宽度.value = width
    // 这里也可以同时设置 CSS 变量，但已经在组合式函数中处理了，因此仓库保持响应式数据即可
  }

  return { 当前组件, 组件属性, 菜单宽度, 设置菜单, 清除菜单, 设置宽度 }
})
