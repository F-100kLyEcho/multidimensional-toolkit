/**
 * 树形列表多选/加选/减选状态管理
 *
 * 支持 Win10 操作习惯：
 * - 单击：选中单个（清除其他）
 * - Ctrl+单击：加选/减选切换
 * - Shift+单击：连续选择（基于可见节点的展平顺序）
 */
import { ref, computed } from 'vue'
import type { 树形节点 } from '../类型/index'

/** 获取当前可见节点的展平列表（深度优先遍历，排除隐藏排除项） */
function 展平可见节点(节点列表: 树形节点[], 是否折叠: (path: string) => boolean, 隐藏排除项: boolean, 获取节点状态: (path: string) => 'normal' | 'excluded' | 'exempted' | 'placeholder'): 树形节点[] {
  const 结果: 树形节点[] = []
  function 遍历(节点: 树形节点) {
    if (隐藏排除项 && 获取节点状态(节点.path) === 'excluded') return
    结果.push(节点)
    if (节点.children && 节点.children.length > 0 && !是否折叠(节点.path)) {
      for (const 子 of 节点.children) {
        遍历(子)
      }
    }
  }
  for (const 节点 of 节点列表) {
    遍历(节点)
  }
  return 结果
}

export function 使用选择(根节点列表: () => 树形节点[], 是否折叠: (path: string) => boolean, 隐藏排除项: () => boolean, 获取节点状态: (path: string) => 'normal' | 'excluded' | 'exempted' | 'placeholder') {
  /** 当前选中的路径集合 */
  const 选中路径集合 = ref<Set<string>>(new Set())

  /** 上次单击的路径（用于 Shift 连续选择） */
  const 上次选中路径 = ref<string | null>(null)

  /** 选中的节点列表（供外部使用） */
  const 选中节点列表 = computed<树形节点[]>(() => {
    return 展平可见节点(根节点列表(), 是否折叠, 隐藏排除项(), 获取节点状态).filter((n) => 选中路径集合.value.has(n.path))
  })

  /** 是否有任何选中项 */
  const 有选中 = computed(() => 选中路径集合.value.size > 0)

  /** 选中数量 */
  const 选中数量 = computed(() => 选中路径集合.value.size)

  /** 处理节点点击（支持 Shift/Ctrl） */
  function 处理点击节点(event: MouseEvent, 节点: 树形节点) {
    if (event.shiftKey) {
      // Shift + 单击：连续选择
      处理Shift选择(节点)
    } else if (event.ctrlKey) {
      // Ctrl + 单击：加选/减选切换
      处理Ctrl选择(节点)
    } else {
      // 普通单击：仅选中当前节点
      处理普通选择(节点)
    }
  }

  /** 普通选择：仅选中当前节点 */
  function 处理普通选择(节点: 树形节点) {
    选中路径集合.value = new Set([节点.path])
    上次选中路径.value = 节点.path
  }

  /** Ctrl 选择：切换当前节点的选中状态 */
  function 处理Ctrl选择(节点: 树形节点) {
    const 新集合 = new Set(选中路径集合.value)
    if (新集合.has(节点.path)) {
      新集合.delete(节点.path)
    } else {
      新集合.add(节点.path)
    }
    选中路径集合.value = 新集合
    上次选中路径.value = 节点.path
  }

  /** Shift 选择：从上一次选中到当前节点之间的所有节点 */
  function 处理Shift选择(节点: 树形节点) {
    if (!上次选中路径.value) {
      // 没有上次选中，退化为普通选择
      处理普通选择(节点)
      return
    }

    const 可见节点 = 展平可见节点(根节点列表(), 是否折叠, 隐藏排除项(), 获取节点状态)

    const 上次索引 = 可见节点.findIndex((n) => n.path === 上次选中路径.value)
    const 当前索引 = 可见节点.findIndex((n) => n.path === 节点.path)

    if (上次索引 === -1 || 当前索引 === -1) {
      处理普通选择(节点)
      return
    }

    const 开始 = Math.min(上次索引, 当前索引)
    const 结束 = Math.max(上次索引, 当前索引)

    const 新集合 = new Set<string>()
    for (let i = 开始; i <= 结束; i++) {
      新集合.add(可见节点[i]!.path)
    }
    选中路径集合.value = 新集合
    // 不更新上次选中路径，保留 Shift 的起点
  }

  /** 检查路径是否被选中 */
  function 是否选中(路径: string): boolean {
    return 选中路径集合.value.has(路径)
  }

  /** 清空所有选中 */
  function 清空选择() {
    选中路径集合.value = new Set()
    上次选中路径.value = null
  }

  /** 设置指定路径的选中状态 */
  function 设置选中(路径: string, 选中: boolean) {
    const 新集合 = new Set(选中路径集合.value)
    if (选中) {
      新集合.add(路径)
    } else {
      新集合.delete(路径)
    }
    选中路径集合.value = 新集合
  }

  return {
    选中路径集合,
    选中节点列表,
    有选中,
    选中数量,
    处理点击节点,
    是否选中,
    清空选择,
    设置选中,
  }
}
