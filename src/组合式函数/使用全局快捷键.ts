import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

type 快捷键处理器 = (e: KeyboardEvent) => void

interface 页面快捷键映射 {
  [key: string]: 快捷键处理器
}

const 页面路由映射: Record<string, string> = {
  '1': '/Q1',
  '2': '/图标库管理',
  '3': '/记忆泡',
  '4': '/H1',
}

const 路由到手册id: Record<string, string> = {
  '/': 'home',
  '/Q1': 'launch',
  '/图标库管理': 'icons',
  '/H1': 'getpath',
}

export function 使用全局快捷键(页面快捷键?: 页面快捷键映射) {
  const 路由 = useRoute()
  const 路由器 = useRouter()
  const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

  function 处理快捷键(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    const 标签 = target?.tagName?.toLowerCase()
    const 焦点在输入框 = 标签 === 'input' || 标签 === 'textarea' || 标签 === 'select'

    if (e.key === 'F1' && 是否Electron环境) {
      e.preventDefault()
      const id = 路由到手册id[路由.path]
      if (id) {
        window.electronAPI.创建独立窗口(`/manual/${id}`)
      }
      return
    }

    if (e.ctrlKey && 页面路由映射[e.key] && 是否Electron环境) {
      e.preventDefault()
      window.electronAPI.创建独立窗口(页面路由映射[e.key]!)
      return
    }

    if (焦点在输入框) return

    if (e.key === 'Home') {
      e.preventDefault()
      路由器.push('/')
      return
    }

    if (!e.ctrlKey && !e.altKey && !e.metaKey && 页面快捷键) {
      const 处理器 = 页面快捷键[e.key]
      if (处理器) {
        e.preventDefault()
        处理器(e)
        return
      }
    }

    if (!e.ctrlKey && !e.altKey && !e.metaKey && 页面路由映射[e.key]) {
      e.preventDefault()
      路由器.push(页面路由映射[e.key]!)
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', 处理快捷键)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', 处理快捷键)
  })
}
