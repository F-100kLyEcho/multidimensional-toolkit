import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export interface 快捷键配置 {
  ctrl: boolean
  shift: boolean
  alt: boolean
  meta: boolean
  key: string
}

const 存储键 = '快捷键设置'

const 默认启动快捷键: 快捷键配置 = { ctrl: false, shift: false, alt: false, meta: false, key: 'f' }

/** 已占用的保留快捷键（冲突检测用） */
const 保留快捷键: 快捷键配置[] = [
  { ctrl: false, shift: false, alt: false, meta: false, key: '1' },
  { ctrl: false, shift: false, alt: false, meta: false, key: '2' },
  { ctrl: false, shift: false, alt: false, meta: false, key: '3' },
  { ctrl: true, shift: false, alt: false, meta: false, key: '1' },
  { ctrl: true, shift: false, alt: false, meta: false, key: '2' },
  { ctrl: true, shift: false, alt: false, meta: false, key: '3' },
  { ctrl: false, shift: false, alt: false, meta: false, key: 'tab' },
  { ctrl: false, shift: false, alt: false, meta: false, key: 'escape' },
  { ctrl: true, shift: false, alt: false, meta: false, key: 'f' },
  { ctrl: false, shift: false, alt: false, meta: false, key: 't' },
]

function 读取启动快捷键(): 快捷键配置 {
  try {
    const raw = localStorage.getItem(`${存储键}_启动`)
    if (raw) {
      const 解析 = JSON.parse(raw) as 快捷键配置
      if (typeof 解析.key === 'string') return { ...默认启动快捷键, ...解析 }
    }
  } catch {
    /* 静默 */
  }
  return { ...默认启动快捷键 }
}

export const 使用快捷键仓库 = defineStore('快捷键仓库', () => {
  const 启动快捷键 = ref<快捷键配置>(读取启动快捷键())

  function 保存启动快捷键() {
    localStorage.setItem(`${存储键}_启动`, JSON.stringify(启动快捷键.value))
  }

  watch(启动快捷键, 保存启动快捷键, { deep: true })

  return { 启动快捷键 }
})

/** 匹配 KeyboardEvent 与快捷键配置 */
export function 匹配快捷键(e: KeyboardEvent, 配置: 快捷键配置): boolean {
  return (
    e.ctrlKey === 配置.ctrl &&
    e.shiftKey === 配置.shift &&
    e.altKey === 配置.alt &&
    e.metaKey === 配置.meta &&
    e.key.toLowerCase() === 配置.key
  )
}

/** 格式化快捷键为显示文本，如 "Ctrl + S" / "F" */
export function 格式化快捷键(配置: 快捷键配置): string {
  const 部分: string[] = []
  if (配置.ctrl) 部分.push('Ctrl')
  if (配置.shift) 部分.push('Shift')
  if (配置.alt) 部分.push('Alt')
  if (配置.meta) 部分.push('Meta')
  const k = 配置.key
  if (k === ' ') 部分.push('Space')
  else if (k === 'tab') 部分.push('Tab')
  else if (k === 'escape') 部分.push('Esc')
  else if (k.length === 1) 部分.push(k.toUpperCase())
  else 部分.push(k)
  return 部分.join(' + ')
}

/** 检测快捷键是否与保留快捷键冲突，返回冲突的显示文本或 null */
export function 检测冲突(配置: 快捷键配置): string | null {
  // F1/F2 等功能键单独处理
  if (配置.key === 'f1' || 配置.key === 'f2') {
    return 配置.key.toUpperCase()
  }
  for (const 保留 of 保留快捷键) {
    if (
      保留.ctrl === 配置.ctrl &&
      保留.shift === 配置.shift &&
      保留.alt === 配置.alt &&
      保留.meta === 配置.meta &&
      保留.key === 配置.key
    ) {
      return 格式化快捷键(保留)
    }
  }
  return null
}
