import { ref, computed } from 'vue'
import type { 树形节点, 预览模式 } from '../类型/index'

// 重新导出类型，保持向后兼容
export type { 预览模式 }

/**
 * 递归过滤掉被排除且未豁免的节点，生成仅包含正常 + 豁免项的树形列表
 *
 * 过滤规则：
 * - 被排除 且 未豁免 → 跳过（不输出）
 * - 正常（未排除）→ 保留
 * - 被排除 且 已豁免 → 保留（以浅橙色样式展示）
 */
function 过滤未排除节点(节点列表: 树形节点[], 是否被排除: (路径: string) => boolean, 是否被豁免?: (路径: string) => boolean): 树形节点[] {
  const 结果: 树形节点[] = []
  for (const 节点 of 节点列表) {
    // 排除且未豁免 → 跳过该节点
    if (是否被排除(节点.path) && !(是否被豁免?.(节点.path) ?? false)) continue

    const 新节点: 树形节点 = {
      ...节点,
      children: 节点.children ? 过滤未排除节点(节点.children, 是否被排除, 是否被豁免) : null,
    }
    结果.push(新节点)
  }
  return 结果
}

/**
 * 预览模式组合式函数
 * 管理三种预览模式的状态切换、文本生成、复制和保存功能
 *
 * @param 获取根节点列表 - 返回最新树形节点列表的 getter 函数（支持响应式更新）
 * @param 是否被排除 - 判断路径是否被排除的函数（不含豁免判断）
 * @param 是否被豁免 - 判断路径是否被豁免的函数（含传递性）
 * @param 自定义保存 - 自定义保存函数，用于 Electron 环境下通过 IPC 写入文件
 */
export function 使用预览模式(获取根节点列表: () => 树形节点[], 是否被排除?: (路径: string) => boolean, 是否被豁免?: (路径: string) => boolean, 自定义保存?: (内容: string) => Promise<boolean>) {
  const 当前模式 = ref<预览模式>('tree')
  const 复制提示 = ref('')
  const 保存提示 = ref('')
  const 复制成功标志 = ref(false)
  const 保存成功标志 = ref(false)
  let 复制定时器: ReturnType<typeof setTimeout> | null = null
  let 保存定时器: ReturnType<typeof setTimeout> | null = null

  // 模式列表（供模板渲染用）
  const 模式列表: { key: 预览模式; label: string }[] = [
    { key: 'tree', label: '树形' },
    { key: 'text', label: '纯文本' },
    { key: 'flat', label: '扁平' },
  ]

  // 切换模式
  function 切换模式(模式: 预览模式) {
    当前模式.value = 模式
  }

  // === 仅包含未排除节点（排除且未豁免）的树形列表（用于右栏展示） ===
  const 未排除节点列表 = computed(() => {
    const 当前节点列表 = 获取根节点列表()
    if (!是否被排除) return 当前节点列表
    return 过滤未排除节点(当前节点列表, 是否被排除, 是否被豁免)
  })

  // === 统计信息 ===
  const 文件计数 = computed(() => {
    let 文件数 = 0
    let 文件夹数 = 0
    function 遍历(节点列表: 树形节点[]) {
      for (const 节点 of 节点列表) {
        if (节点.isFolder) {
          文件夹数++
          if (节点.children) 遍历(节点.children)
        } else {
          文件数++
        }
      }
    }
    遍历(未排除节点列表.value)
    return { 文件数, 文件夹数 }
  })

  // === 文本生成函数 ===

  function 生成树形文本(节点列表: 树形节点[], 层级 = 0): string {
    let result = ''
    for (const 节点 of 节点列表) {
      const 缩进 = '  '.repeat(层级)
      const 图标 = 节点.isFolder ? '📁' : '📄'
      result += `${缩进}${图标} ${节点.name}\n`
      if (节点.children && 节点.children.length > 0) {
        result += 生成树形文本(节点.children, 层级 + 1)
      }
    }
    return result
  }

  function 生成纯文本(节点列表: 树形节点[], 层级 = 0): string {
    let result = ''
    for (const 节点 of 节点列表) {
      const 缩进 = '  '.repeat(层级)
      result += `${缩进}${节点.name}\n`
      if (节点.children && 节点.children.length > 0) {
        result += 生成纯文本(节点.children, 层级 + 1)
      }
    }
    return result
  }

  function 生成扁平文本(节点列表: 树形节点[], 前缀 = ''): string {
    let result = ''
    for (const 节点 of 节点列表) {
      const 当前路径 = 前缀 ? `${前缀}/${节点.name}` : 节点.name
      if (!节点.isFolder) {
        result += `${当前路径}\n`
      }
      if (节点.children && 节点.children.length > 0) {
        result += 生成扁平文本(节点.children, 当前路径)
      }
    }
    return result
  }

  // 当前预览文本（基于未排除的节点）
  const 当前预览文本 = computed(() => {
    const 列表 = 未排除节点列表.value
    switch (当前模式.value) {
      case 'tree':
        return 生成树形文本(列表)
      case 'text':
        return 生成纯文本(列表)
      case 'flat':
        return 生成扁平文本(列表)
      default:
        return ''
    }
  })

  // 是否为空（基于未排除的节点）
  const 是否为空 = computed(() => 未排除节点列表.value.length === 0)

  // 复制到剪贴板
  async function 复制内容() {
    try {
      await navigator.clipboard.writeText(当前预览文本.value)
      复制成功标志.value = true
    } catch {
      复制提示.value = '复制失败'
      if (复制定时器) clearTimeout(复制定时器)
      复制定时器 = setTimeout(() => {
        复制提示.value = ''
      }, 2000)
      return
    }
    if (复制定时器) clearTimeout(复制定时器)
    复制定时器 = setTimeout(() => {
      复制成功标志.value = false
    }, 500)
  }

  // 保存为 .md 文件
  async function 保存文件() {
    const 内容 = 当前预览文本.value

    if (自定义保存) {
      // Electron 环境下通过 IPC 写入文件
      const 成功 = await 自定义保存(内容)
      if (成功) {
        保存成功标志.value = true
      } else {
        保存提示.value = '保存失败'
      }
    } else {
      // 非 Electron 环境下使用浏览器下载
      const 项目名 = '项目清单'
      const blob = new Blob([内容], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${项目名}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      保存成功标志.value = true
    }

    if (保存定时器) clearTimeout(保存定时器)
    保存定时器 = setTimeout(() => {
      保存成功标志.value = false
      保存提示.value = ''
    }, 500)
  }

  return {
    当前模式,
    模式列表,
    复制提示,
    保存提示,
    复制成功标志,
    保存成功标志,
    未排除节点列表,
    文件计数,
    切换模式,
    当前预览文本,
    是否为空,
    复制内容,
    保存文件,
  }
}
