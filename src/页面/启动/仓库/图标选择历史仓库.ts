import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

type 图标类别 = 'fa' | 'emoji' | 'global'

const 存储键前缀 = '图标选择历史_'
const 标签存储键 = '图标面板_上次标签'
const 最大数量 = 9

function 读取历史(类别: 图标类别): string[] {
  const 原始 = localStorage.getItem(存储键前缀 + 类别)
  return 原始 ? JSON.parse(原始) : []
}

export const 使用图标选择历史仓库 = defineStore('图标选择历史仓库', () => {
  const FA历史 = ref<string[]>(读取历史('fa'))
  const Emoji历史 = ref<string[]>(读取历史('emoji'))
  const 全局历史 = ref<string[]>(读取历史('global'))

  const 上次标签 = ref<图标类别>((localStorage.getItem(标签存储键) as 图标类别) || 'fa')

  function 获取历史(类别: 图标类别): string[] {
    switch (类别) {
      case 'fa':
        return FA历史.value
      case 'emoji':
        return Emoji历史.value
      case 'global':
        return 全局历史.value
    }
  }

  function 添加(类别: 图标类别, 图标值: string) {
    if (!图标值) return
    let 列表: string[]
    switch (类别) {
      case 'fa':
        列表 = FA历史.value.filter((v) => v !== 图标值)
        列表.unshift(图标值)
        FA历史.value = 列表.slice(0, 最大数量)
        break
      case 'emoji':
        列表 = Emoji历史.value.filter((v) => v !== 图标值)
        列表.unshift(图标值)
        Emoji历史.value = 列表.slice(0, 最大数量)
        break
      case 'global':
        列表 = 全局历史.value.filter((v) => v !== 图标值)
        列表.unshift(图标值)
        全局历史.value = 列表.slice(0, 最大数量)
        break
    }
  }

  function 保存标签(标签: 图标类别) {
    上次标签.value = 标签
  }

  watch(FA历史, (值) => localStorage.setItem(存储键前缀 + 'fa', JSON.stringify(值)), { deep: true })
  watch(Emoji历史, (值) => localStorage.setItem(存储键前缀 + 'emoji', JSON.stringify(值)), { deep: true })
  watch(全局历史, (值) => localStorage.setItem(存储键前缀 + 'global', JSON.stringify(值)), { deep: true })
  watch(上次标签, (值) => localStorage.setItem(标签存储键, 值))

  return { FA历史, Emoji历史, 全局历史, 上次标签, 获取历史, 添加, 保存标签 }
})
