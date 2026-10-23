import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 记忆泡数据（第一版：仅 id + 内容 + 创建时间） */
export interface 记忆泡数据 {
  id: string
  内容: string
  创建时间: number
}

/** 生成示例数据（第一版：外观演示，暂不落盘） */
function 生成示例(): 记忆泡数据[] {
  const 现在 = Date.now()
  return [
    { id: '示例1', 内容: '把日常重复操作压缩到最少步骤。', 创建时间: 现在 - 1000 * 60 * 60 * 25 },
    { id: '示例2', 内容: '记忆泡：写一条，发给自己。\n先外观后功能，边开发边想。', 创建时间: 现在 - 1000 * 60 * 60 * 3 },
    { id: '示例3', 内容: '第一条真实记录就快来了。', 创建时间: 现在 - 1000 * 60 * 8 },
  ]
}

export const 使用记忆泡仓库 = defineStore('记忆泡仓库', () => {
  const 列表 = ref<记忆泡数据[]>(生成示例())

  /** 新增一条记忆泡（第一版仅内存，落盘在后续版本接入） */
  function 发送(内容: string) {
    const 文本 = 内容.trim()
    if (!文本) return
    列表.value.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      内容: 文本,
      创建时间: Date.now(),
    })
  }

  return { 列表, 发送 }
})