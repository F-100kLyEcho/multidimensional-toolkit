// ==================== 树形节点（来自 工具/转换树形.ts） ====================

export interface 树形节点 {
  name: string
  path: string
  isFolder: boolean
  children: 树形节点[] | null
  level: number
}

// ==================== 排除规则类型（来自 组合式函数/使用排除规则.ts） ====================

/** 单条规则的展示/操作单元 */
export type 排除规则条目 = {
  类别: '精确文件夹' | '递归文件夹' | '精确文件' | '递归文件' | '豁免' | '通配符' | '占位文件夹'
  值: string
}

export type 排除来源类别 = '精确文件夹' | '递归文件夹' | '精确文件' | '递归文件' | '通配符' | '占位文件夹' | null

/**
 * 节点最终显示状态
 * - normal: 正常（绿色）
 * - excluded: 已排除（灰色）
 * - exempted: 已豁免（浅橙色背景 + 灰色文字）
 * - placeholder: 占位文件夹（红色字体）
 */
export type 节点状态 = 'normal' | 'excluded' | 'exempted' | 'placeholder'

// ==================== 预览模式类型（来自 组合式函数/使用预览模式.ts） ====================

export type 预览模式 = 'tree' | 'text' | 'flat'
