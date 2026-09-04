/**
 * 卡片存储管理
 * 提供卡片数据的分文件读写功能
 * 数据存储结构：
 *   userData/多维工具/启动/
 *   ├── 配置.json          # 自增ID计数器
 *   ├── 菜单结构.json       # 菜单树（一级菜单→二级菜单）
 *   ├── 主题.json           # 毛玻璃主题参数
 *   ├── 卡片/               # 每个二级菜单一个子文件夹
 *   │   └── sub{菜单ID}/    # 子文件夹，以二级菜单ID命名
 *   │       ├── 卡片数据.json
 *   │       └── 图片/       # 该菜单下的卡片图片
 *   └── 图标缓存/           # 临时缓存
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { 获取模块路径 } from '../../工具/模块路径'
import { 确保目录存在 } from '../../工具/文件操作'

// ----- 常量 -----
const 启动路径 = () => 获取模块路径('启动')
const 卡片根目录 = () => path.join(启动路径(), '卡片')

// ----- 类型定义 -----
export interface 配置数据 {
  下一级菜单ID: number
  下一级卡片ID: number
  折叠状态: Record<number, boolean>
  是否紧凑: boolean
}

/** 保存配置时允许只传部分字段 */
export type 配置数据部分 = Partial<配置数据>

export interface 菜单结构数据 {
  一级菜单列表: 一级菜单节点[]
}

export interface 一级菜单节点 {
  唯一ID: number
  菜单名称: string
  排序: number
  子菜单: 二级菜单节点[]
}

export interface 二级菜单节点 {
  唯一ID: number
  菜单名称: string
  排序: number
  关联卡片ID: number | null
}

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
  图标类型: 'default' | 'text' | 'image'
  图标文字: string | null
}

export interface 卡片文件数据 {
  版本: string
  最后更新: number
  归属菜单ID: number
  卡片列表: 卡片节点[]
}

// ----- 默认值 -----
const 默认配置: 配置数据 = { 下一级菜单ID: 0, 下一级卡片ID: 0, 折叠状态: {}, 是否紧凑: false }
const 默认菜单结构: 菜单结构数据 = { 一级菜单列表: [] }

// ========== 配置读写 ==========

/**
 * 读取配置.json（自增ID计数器）
 */
export async function 读取配置(): Promise<配置数据> {
  const 文件路径 = path.join(启动路径(), '配置.json')
  try {
    if (!existsSync(文件路径)) return { ...默认配置 }
    const 内容 = await fs.readFile(文件路径, 'utf-8')
    return JSON.parse(内容) as 配置数据
  } catch {
    return { ...默认配置 }
  }
}

/**
 * 保存配置.json
 * 字段级合并写入：先读取磁盘上的最新配置，再用传入的数据覆盖对应字段。
 * 这样菜单仓库和卡片仓库各自保存时，不会互相覆盖对方刚更新的计数器值。
 * 注意：调用方应只传发生了变化的字段（例如菜单仓库只传 { 下一级菜单ID }），以避免误覆盖。
 */
export async function 保存配置(数据: 配置数据部分): Promise<void> {
  const 文件路径 = path.join(启动路径(), '配置.json')
  await 确保目录存在(path.dirname(文件路径))

  // 读取当前磁盘上的最新配置
  const 当前配置 = await 读取配置()

  // 合并：传入的值覆盖对应字段，未传入的字段保留磁盘上的最新值
  const 新配置: 配置数据 = {
    下一级菜单ID: 数据.下一级菜单ID ?? 当前配置.下一级菜单ID,
    下一级卡片ID: 数据.下一级卡片ID ?? 当前配置.下一级卡片ID,
    折叠状态: 数据.折叠状态 ?? 当前配置.折叠状态,
    是否紧凑: 数据.是否紧凑 ?? 当前配置.是否紧凑,
  }

  const 内容 = JSON.stringify({ 版本: '1.0', 最后更新: Date.now(), ...新配置 }, null, 2)
  await fs.writeFile(文件路径, 内容, 'utf-8')
}

// ========== 菜单结构读写 ==========

/**
 * 读取菜单结构.json（完整的菜单树）
 */
export async function 读取菜单结构(): Promise<菜单结构数据> {
  const 文件路径 = path.join(启动路径(), '菜单结构.json')
  try {
    if (!existsSync(文件路径)) return { 一级菜单列表: [] }
    const 内容 = await fs.readFile(文件路径, 'utf-8')
    return JSON.parse(内容) as 菜单结构数据
  } catch {
    return { 一级菜单列表: [] }
  }
}

/**
 * 保存菜单结构.json
 */
export async function 保存菜单结构(数据: 菜单结构数据): Promise<void> {
  const 文件路径 = path.join(启动路径(), '菜单结构.json')
  await 确保目录存在(path.dirname(文件路径))
  const 内容 = JSON.stringify({ 版本: '1.0', 最后更新: Date.now(), ...数据 }, null, 2)
  await fs.writeFile(文件路径, 内容, 'utf-8')
}

// ========== 卡片读写 ==========

/**
 * 获取卡片文件夹路径
 */
function 获取卡片文件夹路径(归属菜单ID: number): string {
  return path.join(卡片根目录(), `sub${归属菜单ID}`)
}

/**
 * 获取卡片数据文件路径
 */
function 获取卡片文件路径(归属菜单ID: number): string {
  return path.join(获取卡片文件夹路径(归属菜单ID), '卡片数据.json')
}

/**
 * 读取卡片文件（单个二级菜单下的卡片列表）
 */
export async function 读取卡片文件(归属菜单ID: number): Promise<卡片节点[]> {
  const 文件路径 = 获取卡片文件路径(归属菜单ID)
  try {
    if (!existsSync(文件路径)) return []
    const 内容 = await fs.readFile(文件路径, 'utf-8')
    const 数据 = JSON.parse(内容) as 卡片文件数据
    return 数据.卡片列表
  } catch {
    return []
  }
}

/**
 * 保存卡片文件（单个二级菜单下的卡片列表）
 * 若列表为空则删除文件和空文件夹
 */
export async function 保存卡片文件(归属菜单ID: number, 卡片列表: 卡片节点[]): Promise<void> {
  const 文件夹路径 = 获取卡片文件夹路径(归属菜单ID)
  const 文件路径 = 获取卡片文件路径(归属菜单ID)

  if (卡片列表.length === 0) {
    // 列表为空，递归删除整个文件夹（含图片等子内容）
    try {
      await fs.rm(文件夹路径, { recursive: true, force: true })
    } catch {
      /* 文件夹不存在，忽略 */
    }
    return
  }

  await 确保目录存在(文件夹路径)
  const 数据: 卡片文件数据 = {
    版本: '1.0',
    最后更新: Date.now(),
    归属菜单ID,
    卡片列表,
  }
  const 内容 = JSON.stringify(数据, null, 2)
  await fs.writeFile(文件路径, 内容, 'utf-8')
}

/**
 * 删除整个卡片文件夹（含图片）
 */
export async function 删除卡片文件夹(归属菜单ID: number): Promise<void> {
  const 文件夹路径 = 获取卡片文件夹路径(归属菜单ID)
  try {
    await fs.rm(文件夹路径, { recursive: true, force: true })
  } catch {
    /* 文件夹不存在，忽略 */
  }
}

/**
 * 列出所有卡片（遍历所有子文件夹合并卡片列表）
 */
export async function 列出所有卡片(): Promise<卡片节点[]> {
  const 所有卡片: 卡片节点[] = []
  try {
    if (!existsSync(卡片根目录())) return 所有卡片

    const 条目列表 = await fs.readdir(卡片根目录(), { withFileTypes: true })
    for (const 条目 of 条目列表) {
      if (!条目.isDirectory()) continue
      if (!条目.name.startsWith('sub')) continue

      const 菜单IDStr = 条目.name.slice(3) // 去掉 "sub" 前缀
      const 菜单ID = parseInt(菜单IDStr, 10)
      if (isNaN(菜单ID)) continue

      const 卡片列表 = await 读取卡片文件(菜单ID)
      所有卡片.push(...卡片列表)
    }
  } catch {
    // 目录不存在或其他错误，返回空列表
  }
  return 所有卡片
}

/**
 * 将卡片按归属菜单ID分组
 */
export function 按菜单分组卡片(卡片列表: 卡片节点[]): Map<number, 卡片节点[]> {
  const 分组 = new Map<number, 卡片节点[]>()
  for (const 卡片 of 卡片列表) {
    const 已有 = 分组.get(卡片.归属菜单ID) || []
    已有.push(卡片)
    分组.set(卡片.归属菜单ID, 已有)
  }
  return 分组
}
