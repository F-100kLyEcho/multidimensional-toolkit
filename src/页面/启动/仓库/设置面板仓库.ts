import { defineStore } from 'pinia'
import { ref } from 'vue'

export const 使用设置面板仓库 = defineStore('设置面板仓库', () => {
  const 面板可见 = ref(false)

  function 切换面板() {
    面板可见.value = !面板可见.value
  }

  function 打开面板() {
    面板可见.value = true
  }

  function 关闭面板() {
    面板可见.value = false
  }

  return { 面板可见, 切换面板, 打开面板, 关闭面板 }
})
