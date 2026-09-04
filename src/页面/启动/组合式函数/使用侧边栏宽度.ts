import { ref, onUnmounted } from 'vue'
import { 使用侧边栏菜单仓库 } from '@/页面/启动/仓库/侧边栏菜单仓库'

const 存储键 = '菜单宽度'
const 最小宽度 = 200
const 最大宽度 = 500
const 有效期天数 = 30

export function 使用侧边栏宽度() {
  const 当前宽度 = ref(200)
  let 正在拖拽 = false
  let 起始X = 0
  let 起始宽度 = 200
  let 最新宽度 = 200
  let rAFId: number | null = null

  /** 获取菜单容器元素（用于控制 transition） */
  function 获取菜单容器(): HTMLElement | null {
    return document.querySelector('.菜单容器')
  }

  /** 获取毛玻璃层元素（用于控制 transition） */
  function 获取毛玻璃层(): HTMLElement | null {
    return document.querySelector('.毛玻璃层')
  }

  function 初始化() {
    const 存储宽度 = 从存储读取()
    if (存储宽度 !== null) {
      当前宽度.value = 存储宽度
      设置宽度(存储宽度)
    }
  }

  /** 拖拽条占用的总宽度（width + padding） */
  const 拖拽条占用 = 20

  /** 检测浏览器滚动条宽度 */
  let 滚动条宽度缓存: number | null = null
  function 检测滚动条宽度(): number {
    if (滚动条宽度缓存 !== null) return 滚动条宽度缓存
    const 外层 = document.createElement('div')
    外层.style.cssText = 'width:100px;height:100px;overflow:scroll;position:absolute;left:-9999px'
    document.body.appendChild(外层)
    const 内层 = document.createElement('div')
    内层.style.cssText = 'width:100%;height:100%'
    外层.appendChild(内层)
    滚动条宽度缓存 = 外层.offsetWidth - 内层.offsetWidth
    document.body.removeChild(外层)
    return 滚动条宽度缓存
  }

  function 设置宽度(宽度: number) {
    document.documentElement.style.setProperty('--菜单宽度', `${宽度}px`)
    // 菜单区域宽度 = 菜单容器宽度 - 拖拽条总占用（width 4px + padding 左右各 8px）
    const 菜单区域宽 = Math.max(0, 宽度 - 拖拽条占用)
    document.documentElement.style.setProperty('--菜单区域宽度', `${菜单区域宽}px`)
    当前宽度.value = 宽度
    const 仓库 = 使用侧边栏菜单仓库()
    仓库.设置宽度(宽度)
  }

  function 保存到存储(宽度: number) {
    try {
      const 数据 = {
        值: 宽度,
        过期时间: Date.now() + 有效期天数 * 24 * 60 * 60 * 1000,
      }
      localStorage.setItem(存储键, JSON.stringify(数据))
    } catch {}
  }

  function 从存储读取(): number | null {
    try {
      const 原始 = localStorage.getItem(存储键)
      if (!原始) return null
      const 数据 = JSON.parse(原始)
      if (Date.now() > 数据.过期时间) {
        localStorage.removeItem(存储键)
        return null
      }
      return 数据.值
    } catch {
      return null
    }
  }

  function 处理拖拽(event: MouseEvent) {
    if (!正在拖拽) return
    const 差值 = event.clientX - 起始X
    let 新宽度 = 起始宽度 + 差值
    新宽度 = Math.max(最小宽度, Math.min(最大宽度, 新宽度))
    最新宽度 = 新宽度

    if (rAFId === null) {
      rAFId = requestAnimationFrame(() => {
        设置宽度(最新宽度)
        rAFId = null
      })
    }
  }

  function 结束拖拽() {
    if (!正在拖拽) return
    正在拖拽 = false
    if (rAFId !== null) {
      cancelAnimationFrame(rAFId)
      rAFId = null
    }
    设置宽度(最新宽度)
    保存到存储(最新宽度)

    // 恢复过渡
    const 容器 = 获取菜单容器()
    if (容器) {
      容器.style.transition = 'width 0.2s ease'
    }
    const 毛玻璃 = 获取毛玻璃层()
    if (毛玻璃) {
      毛玻璃.style.transition = 'width 0.2s ease'
    }

    document.removeEventListener('mousemove', 处理拖拽)
    document.removeEventListener('mouseup', 结束拖拽)
  }

  function 开始拖拽(event: MouseEvent) {
    起始宽度 = 当前宽度.value
    起始X = event.clientX
    最新宽度 = 起始宽度
    正在拖拽 = true

    // 拖拽时移除过渡，让宽度变化立即生效
    const 容器 = 获取菜单容器()
    if (容器) {
      容器.style.transition = 'none'
    }
    const 毛玻璃 = 获取毛玻璃层()
    if (毛玻璃) {
      毛玻璃.style.transition = 'none'
    }

    document.addEventListener('mousemove', 处理拖拽)
    document.addEventListener('mouseup', 结束拖拽)
  }

  onUnmounted(() => {
    if (rAFId !== null) cancelAnimationFrame(rAFId)
    document.removeEventListener('mousemove', 处理拖拽)
    document.removeEventListener('mouseup', 结束拖拽)
  })

  return {
    当前宽度,
    初始化,
    开始拖拽,
  }
}
