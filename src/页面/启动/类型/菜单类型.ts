// 菜单节点接口（与后端数据结构一致）
export interface 一级菜单节点 {
  唯一ID: number
  菜单名称: string
  图标代码: string
  排序: number
  子菜单: 二级菜单节点[]
}

export interface 二级菜单节点 {
  唯一ID: number
  菜单名称: string
  图标代码: string
  排序: number
  关联卡片ID: number | null
}

/** 卡片图标类型 */
export type 图标类型枚举 = 'default' | 'text' | 'image'

export interface 卡片节点 {
  唯一ID: number
  标题: string
  类型: 'url' | 'folder' | 'app'
  值: string
  归属菜单ID: number
  排序: number
  背景颜色: string
  图标代码: string | null
  图片路径: string | null
  /** 图标类型：default=默认图标, text=文字图标, image=图片图标 */
  图标类型: 图标类型枚举
  /** 文字图标模式下的图标文字（最多2字） */
  图标文字: string | null
}
