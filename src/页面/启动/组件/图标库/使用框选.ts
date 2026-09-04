import { ref, onUnmounted, type Ref } from 'vue'

/** 框选组合式函数：参数化容器、项选择器、key 提取、toggle 回调，主视图与信息板共用 */
export function 使用框选(选项: {
  容器: Ref<HTMLElement | null>
  项选择器: string
  提取key: (项: HTMLElement) => string | null
  onToggle: (keys: string[]) => void
  启用条件?: () => boolean
  排除选择器?: string[]
}) {
  const 框选中 = ref(false)
  const 框选矩形 = ref({ x: 0, y: 0, w: 0, h: 0 })
  let 框选起点 = { x: 0, y: 0 }

  function 开始框选(event: MouseEvent) {
    if (选项.启用条件 && !选项.启用条件()) return
    const target = event.target as HTMLElement
    if (target.closest(选项.项选择器)) return
    for (const 排除 of 选项.排除选择器 ?? []) {
      if (target.closest(排除)) return
    }
    const 容器 = 选项.容器.value
    if (!容器) return
    const rect = 容器.getBoundingClientRect()
    框选起点 = { x: event.clientX - rect.left + 容器.scrollLeft, y: event.clientY - rect.top + 容器.scrollTop }
    框选矩形.value = { x: 框选起点.x, y: 框选起点.y, w: 0, h: 0 }
    框选中.value = true
    document.addEventListener('mousemove', 框选移动)
    document.addEventListener('mouseup', 结束框选)
  }

  function 框选移动(event: MouseEvent) {
    if (!框选中.value) return
    const 容器 = 选项.容器.value
    if (!容器) return
    const rect = 容器.getBoundingClientRect()
    const 当前x = event.clientX - rect.left + 容器.scrollLeft
    const 当前y = event.clientY - rect.top + 容器.scrollTop
    框选矩形.value = {
      x: Math.min(框选起点.x, 当前x),
      y: Math.min(框选起点.y, 当前y),
      w: Math.abs(当前x - 框选起点.x),
      h: Math.abs(当前y - 框选起点.y),
    }
  }

  function 结束框选() {
    if (!框选中.value) return
    框选中.value = false
    document.removeEventListener('mousemove', 框选移动)
    document.removeEventListener('mouseup', 结束框选)
    if (框选矩形.value.w < 5 || 框选矩形.value.h < 5) return
    const 容器 = 选项.容器.value
    if (!容器) return
    const 容器rect = 容器.getBoundingClientRect()
    const 选区 = {
      left: 容器rect.left + 框选矩形.value.x - 容器.scrollLeft,
      top: 容器rect.top + 框选矩形.value.y - 容器.scrollTop,
      right: 容器rect.left + 框选矩形.value.x + 框选矩形.value.w - 容器.scrollLeft,
      bottom: 容器rect.top + 框选矩形.value.y + 框选矩形.value.h - 容器.scrollTop,
    }
    const keys: string[] = []
    容器.querySelectorAll<HTMLElement>(选项.项选择器).forEach(项 => {
      const r = 项.getBoundingClientRect()
      if (r.left < 选区.right && r.right > 选区.left && r.top < 选区.bottom && r.bottom > 选区.top) {
        const key = 选项.提取key(项)
        if (key) keys.push(key)
      }
    })
    if (keys.length > 0) 选项.onToggle(keys)
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', 框选移动)
    document.removeEventListener('mouseup', 结束框选)
  })

  return { 框选中, 框选矩形, 开始框选 }
}
