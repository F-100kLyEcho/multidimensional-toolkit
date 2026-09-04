/**
 * 使用渐进式扫描 —— 前端控制扫描队列，边收边渲染
 *
 * 核心设计：
 * - 后端每次只扫描一层文件夹
 * - 前端维护待扫描队列，按广度优先逐层扫描
 * - 批量合并收到的文件数据，增量渲染
 * - 支持暂停/继续扫描
 */
import { ref, shallowRef } from 'vue'

/** 文件信息（与后端类型同步） */
export interface 文件信息 {
  名称: string
  扩展名: string
  完整路径: string
}

export function 使用渐进式扫描() {
  // ==================== 核心数据 ====================

  /** 待扫描的文件夹路径队列 */
  const 待扫描队列 = ref<string[]>([])
  /** 已经扫描过的文件夹路径 */
  const 已扫描队列 = ref<string[]>([])
  /** 已收集的所有文件（浅响应，提升性能） */
  const 所有文件 = shallowRef<文件信息[]>([])
  /** 全局规则中的占位文件夹路径集合（用于强制标记为文件夹，相对路径）
   *  使用普通 Set 而非 ref，因为其变化不需要驱动 UI 重新渲染，
   *  树形转换函数在读取时会直接访问最新内容 */
  const 占位文件夹路径集合 = new Set<string>()

  /** 当前正在扫描的文件夹（用于界面显示） */
  const 当前扫描文件夹 = ref('')
  /** 是否正在扫描 */
  const 扫描中 = ref(false)
  /** 是否全部完成 */
  const 扫描完成 = ref(false)
  /** 根路径（用于将绝对路径转为相对路径） */
  let 根路径 = ''

  // ==================== 渲染优化：批量提交缓冲区 ====================

  const 待追加缓冲区 = ref<文件信息[]>([])
  let 批量定时器: ReturnType<typeof setTimeout> | null = null

  // ==================== 请求限速 ====================

  /** 两次请求之间的最小间隔（毫秒） */
  const 请求间隔 = 30
  let 上次请求时间 = 0

  /** 判断是否在 Electron 环境中 */
  const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

  // ==================== 核心方法 ====================

  /**
   * 开始扫描
   */
  async function 开始扫描(路径: string) {
    // 保存根路径用于路径转换
    根路径 = 路径.replace(/\\/g, '/')
    // 重置状态
    待扫描队列.value = [根路径]
    已扫描队列.value = []
    所有文件.value = []
    占位文件夹路径集合.clear()

    当前扫描文件夹.value = ''
    扫描完成.value = false
    扫描中.value = true
    清空缓冲区()

    // 启动循环
    await 处理下一个文件夹()
  }

  /**
   * 处理队列中的下一个文件夹
   */
  async function 处理下一个文件夹() {
    if (!扫描中.value) return

    // 队列为空 → 扫描完成
    if (待扫描队列.value.length === 0) {
      扫描完成.value = true
      扫描中.value = false
      当前扫描文件夹.value = ''
      // 最后一次刷新缓冲区
      立即刷新缓冲区()
      return
    }

    // 取出下一个文件夹
    const 文件夹路径 = 待扫描队列.value.shift()!
    当前扫描文件夹.value = 文件夹路径

    // 限速
    const 现在 = Date.now()
    const 需要等待 = 上次请求时间 + 请求间隔 - 现在
    if (需要等待 > 0) {
      await 延迟(需要等待)
    }
    上次请求时间 = Date.now()

    // 发起请求
    const 结果 = await 请求扫描文件夹(文件夹路径)

    if (结果 && 结果.成功) {
      // 1. 追加文件到缓冲区
      if (结果.文件列表 && 结果.文件列表.length > 0) {
        追加到缓冲区(结果.文件列表)
      }

      // 2. 将子文件夹加入队列尾部（广度优先）
      if (结果.子文件夹列表 && 结果.子文件夹列表.length > 0) {
        待扫描队列.value.push(...结果.子文件夹列表)
      }

      // 3. 处理占位文件夹（加入文件列表作为占位标记，加入强制文件夹集合）
      if (结果.占位文件夹列表 && 结果.占位文件夹列表.length > 0) {
        const 占位文件列表: 文件信息[] = 结果.占位文件夹列表.map((路径) => ({
          名称: 路径.split('/').pop() ?? '',
          扩展名: '',
          完整路径: 路径,
        }))
        追加到缓冲区(占位文件列表)
        // 更新占位文件夹路径集合（转为相对路径，与文件列表格式一致）
        结果.占位文件夹列表.forEach((p) => {
          const 相对路径 = p.startsWith(根路径 + '/') ? p.slice(根路径.length + 1) : p
          占位文件夹路径集合.add(相对路径)
        })
      }

      // 4. 记录已扫描
      已扫描队列.value.push(文件夹路径)
    } else {
      // 扫描失败的文件夹也计入已扫描，避免死循环
      已扫描队列.value.push(文件夹路径)
    }

    // 继续下一个（使用 setTimeout 让出主线程，避免长时间阻塞）
    await 延迟(0)
    await 处理下一个文件夹()
  }

  // ==================== 批量渲染优化 ====================

  function 追加到缓冲区(新文件列表: 文件信息[]) {
    待追加缓冲区.value.push(...新文件列表)

    if (批量定时器 !== null) return

    批量定时器 = setTimeout(() => {
      立即刷新缓冲区()
    }, 100) // 每 100 毫秒批量提交一次
  }

  function 立即刷新缓冲区() {
    if (待追加缓冲区.value.length === 0) return

    // 合并到总文件列表（浅响应，只替换整个数组）
    所有文件.value = [...所有文件.value, ...待追加缓冲区.value]
    待追加缓冲区.value = []
    批量定时器 = null
  }

  function 清空缓冲区() {
    if (批量定时器 !== null) {
      clearTimeout(批量定时器)
      批量定时器 = null
    }
    待追加缓冲区.value = []
  }

  // ==================== 暂停与继续 ====================

  function 暂停扫描() {
    扫描中.value = false
  }

  function 继续扫描() {
    if (扫描完成.value) return
    if (扫描中.value) return
    扫描中.value = true
    处理下一个文件夹()
  }

  // ==================== 辅助函数 ====================

  async function 请求扫描文件夹(路径: string) {
    if (!是否Electron环境) return null
    try {
      return await window.electronAPI.扫描单个文件夹(路径)
    } catch {
      return null
    }
  }

  function 延迟(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  return {
    所有文件,
    当前扫描文件夹,
    扫描中,
    扫描完成,
    待扫描队列,
    已扫描队列,
    占位文件夹路径集合,
    开始扫描,
    暂停扫描,
    继续扫描,
  }
}
