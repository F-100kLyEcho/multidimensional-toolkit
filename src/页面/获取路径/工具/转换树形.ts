import type { 树形节点 } from '../类型/index'

// 从 类型/index 重新导出，保持向后兼容
export type { 树形节点 }

/**
 * 将扁平路径数组转换为树形节点列表（按 '/' 分割）
 * @param paths 相对路径数组
 * @param 强制文件夹路径 这些路径强制作为文件夹处理（即使没有子路径），用于全局规则中的占位文件夹
 * @returns 根层级节点列表
 */
export function 转换为树形(paths: string[], 强制文件夹路径?: Set<string>): 树形节点[] {
  const rootList: 树形节点[] = []

  for (const fullPath of paths) {
    const segments = fullPath.split('/')
    let currentLevel = 0
    let parentList = rootList
    let currentPath = ''

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]!
      const isLast = i === segments.length - 1
      currentPath = currentPath ? `${currentPath}/${segment}` : segment

      let node = parentList.find((n) => n.name === segment)
      if (!node) {
        // 判断是否为文件夹：
        // 1. 不是最后一个 segment（有子路径）
        // 2. 或者该路径在强制文件夹路径列表中
        const 是文件夹 = !isLast || (强制文件夹路径?.has(currentPath) ?? false)
        node = {
          name: segment,
          path: currentPath,
          isFolder: 是文件夹,
          children: 是文件夹 ? [] : null,
          level: currentLevel,
        }
        parentList.push(node)
      }

      if (!isLast) {
        if (!node.children) {
          node.children = []
        }
        parentList = node.children
        currentLevel++
      }
    }
  }

  return rootList
}
