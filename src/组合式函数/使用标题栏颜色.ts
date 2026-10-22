import { watchEffect } from 'vue'

/**
 * 由背景色值（0=纯黑，255=纯白）取对比符号色。
 * 背景越深，符号越白；背景越浅，符号越黑。
 * 与启动页 `使用主题` 中文字色计算方式一致。
 */
export function 由背景色值取符号色(背景色值: number): string {
  const 亮度 = 255 - 背景色值
  return `rgb(${亮度}, ${亮度}, ${亮度})`
}

/** 由布尔深色模式取符号色（深色背景用浅符号，浅色背景用深符号） */
export function 由深色模式取符号色(深色: boolean): string {
  return 深色 ? '#e0e0e0' : '#333333'
}

/**
 * 应用无边框窗口系统按钮符号色。
 * 传入响应式取色函数，值变化时自动同步到主进程（各不相同页面主题独立处理）。
 */
export function 应用标题栏符号色(取色: () => string): void {
  const api = typeof window !== 'undefined' ? window.electronAPI : undefined
  if (!api?.窗口设置标题栏叠层) return
  watchEffect(() => {
    api.窗口设置标题栏叠层({ symbolColor: 取色() })
  })
}