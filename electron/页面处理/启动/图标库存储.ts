/**
 * 图标库存储管理
 * 提供图标库数据的分组管理、图片存储功能
 * 数据存储结构：
 *   userData/多维工具/启动/
 *   └── 图标库/
 *       ├── 图标库数据.json   # 所有类别的分组+图标数据
 *       ├── 图片/             # 用户上传和URL下载的图片（持久化）
 *       └── 缓存/             # 下载/上传中的图片（临时）
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { 获取模块路径 } from '../../工具/模块路径'
import { 确保目录存在 } from '../../工具/文件操作'
import { 内置FontAwesome图标, 内置Emoji列表 } from './图标常量'
import { FA分类数据 } from './FA分类数据'
import { Emoji分类数据 } from './Emoji分类数据'

// ===== 类型定义 =====

/** 单个图标项 */
export interface 图标项 {
  值: string // fa-xxx、Emoji字符、或 icons:图片/xxx.png
  显示名: string // 显示名称
  绑定域名?: string // URL下载专用，绑定的域名
}

/** 一个分组 */
export interface 图标分组 {
  名称: string
  图标: 图标项[]
  是否内置: boolean // true=不可删除分组本身，false=用户可删
}

/** 单个类别的数据 */
export interface 图标类别数据 {
  分组列表: 图标分组[]
}

/** 完整图标库数据 */
export interface 图标库数据 {
  版本: string
  最后更新: number
  fontawesome: 图标类别数据
  emoji: 图标类别数据
  userUpload: 图标类别数据
  urlDownload: 图标类别数据
}

/** 数据类型键 */
export type 图标类别键 = 'fontawesome' | 'emoji' | 'userUpload' | 'urlDownload'

// ===== 路径常量 =====

const 启动路径 = () => 获取模块路径('启动')
const 图标库目录 = () => path.join(启动路径(), '图标库')
const 图标库数据文件 = () => path.join(图标库目录(), '图标库数据.json')
const 图标库图片目录 = () => path.join(图标库目录(), '图片')
const 图标库缓存目录 = () => path.join(图标库目录(), '缓存')

// ===== 工具函数 =====

/** 生成默认的图标项列表（从图标常量生成） */
function 生成默认图标项(图标列表: { 值: string; 显示名: string }[]): 图标项[] {
  return 图标列表.map((项) => ({
    值: 项.值,
    显示名: 项.显示名,
  }))
}

/** 获取当前时间戳 */
function 当前时间戳(): number {
  return Date.now()
}

// ===== 默认数据 =====

function 创建默认数据(): 图标库数据 {
  return {
    版本: '1.0',
    最后更新: 当前时间戳(),
    fontawesome: {
      分组列表: [
        {
          名称: '默认分组',
          是否内置: false,
          图标: 生成默认图标项(内置FontAwesome图标),
        },
      ],
    },
    emoji: {
      分组列表: [
        {
          名称: '默认分组',
          是否内置: false,
          图标: 生成默认图标项(内置Emoji列表),
        },
      ],
    },
    userUpload: {
      分组列表: [
        {
          名称: '默认分组',
          是否内置: false,
          图标: [],
        },
      ],
    },
    urlDownload: {
      分组列表: [
        {
          名称: '默认分组',
          是否内置: false,
          图标: [],
        },
      ],
    },
  }
}

// ===== 读写操作 =====

/** 旧格式 FA 图标值兼容：fa-xxx → fas fa-xxx */
function 兼容图标值(值: string): string {
  if (值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')) return 值
  if (值.startsWith('fa-')) return `fas ${值}`
  return 值
}

/** 递归兼容整个图标库数据的旧 FA 图标值 */
function 兼容图标库数据(数据: 图标库数据): void {
  const 类别列表: 图标类别键[] = ['fontawesome', 'emoji', 'userUpload', 'urlDownload']
  for (const 类别 of 类别列表) {
    for (const 分组 of 数据[类别].分组列表) {
      for (const 图标 of 分组.图标) {
        图标.值 = 兼容图标值(图标.值)
      }
    }
  }
}

/**
 * 读取图标库数据
 */
export async function 读取图标库数据(): Promise<图标库数据> {
  try {
    if (!existsSync(图标库数据文件())) {
      return 创建默认数据()
    }
    const 内容 = await fs.readFile(图标库数据文件(), 'utf-8')
    const 数据 = JSON.parse(内容) as 图标库数据
    兼容图标库数据(数据)
    return 数据
  } catch {
    return 创建默认数据()
  }
}

/**
 * 保存图标库数据
 */
export async function 保存图标库数据(数据: 图标库数据): Promise<void> {
  数据.最后更新 = 当前时间戳()
  await 确保目录存在(图标库目录())
  const 内容 = JSON.stringify(数据, null, 2)
  await fs.writeFile(图标库数据文件(), 内容, 'utf-8')
}

// ===== 存储操作串行化（避免并发 read-modify-write 竞态） =====

let 存储操作队列 = Promise.resolve()
function 串行执行<T>(操作: () => Promise<T>): Promise<T> {
  const 任务 = 存储操作队列.then(操作, 操作)
  存储操作队列 = 任务.then(() => undefined, () => undefined)
  return 任务
}

// ===== 分组操作 =====

/**
 * 添加分组
 */
export async function 添加分组(类别: 图标类别键, 分组名称: string): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    类别数据.分组列表.push({
      名称: 分组名称,
      图标: [],
      是否内置: false,
    })
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 删除分组
 */
export async function 删除分组(类别: 图标类别键, 分组名称: string): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    类别数据.分组列表 = 类别数据.分组列表.filter((g) => g.名称 !== 分组名称)
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 重命名分组
 */
export async function 重命名分组(类别: 图标类别键, 旧名称: string, 新名称: string): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    const 分组 = 类别数据.分组列表.find((g) => g.名称 === 旧名称)
    if (分组) {
      分组.名称 = 新名称
    }
    await 保存图标库数据(数据)
    return 数据
  })
}

// ===== 图标操作 =====

/**
 * 添加图标到分组
 */
export async function 添加图标(类别: 图标类别键, 分组名称: string, 图标: 图标项): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    let 分组 = 类别数据.分组列表.find((g) => g.名称 === 分组名称)
    if (!分组) {
      分组 = { 名称: 分组名称, 是否内置: false, 图标: [] }
      类别数据.分组列表.push(分组)
    }
    分组.图标.push(图标)
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 删除图标（按值匹配）
 */
export async function 删除图标(类别: 图标类别键, 分组名称: string, 图标值: string): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    const 分组 = 类别数据.分组列表.find((g) => g.名称 === 分组名称)
    if (分组) {
      分组.图标 = 分组.图标.filter((i) => i.值 !== 图标值)
    }
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 移动图标：同分组内排序（源=目标）或跨分组移动
 * @param 目标索引 插入目标分组的位置；越界则末尾
 */
export async function 移动图标(类别: 图标类别键, 源分组名: string, 图标值: string, 目标分组名: string, 目标索引: number): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    const 源分组 = 类别数据.分组列表.find((g) => g.名称 === 源分组名)
    if (!源分组) return 数据
    const 图标项 = 源分组.图标.find((i) => i.值 === 图标值)
    if (!图标项) return 数据
    源分组.图标 = 源分组.图标.filter((i) => i.值 !== 图标值)
    let 目标分组 = 类别数据.分组列表.find((g) => g.名称 === 目标分组名)
    if (!目标分组) {
      目标分组 = { 名称: 目标分组名, 是否内置: false, 图标: [] }
      类别数据.分组列表.push(目标分组)
    }
    const 插入位置 = Math.max(0, Math.min(目标索引, 目标分组.图标.length))
    目标分组.图标.splice(插入位置, 0, 图标项)
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 移动分组：调整分组在列表中的顺序
 * @param 目标索引 插入位置；越界则末尾
 */
export async function 移动分组(类别: 图标类别键, 分组名: string, 目标索引: number): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    const idx = 类别数据.分组列表.findIndex((g) => g.名称 === 分组名)
    if (idx === -1) return 数据
    const [分组] = 类别数据.分组列表.splice(idx, 1)
    const 插入位置 = Math.max(0, Math.min(目标索引, 类别数据.分组列表.length))
    类别数据.分组列表.splice(插入位置, 0, 分组)
    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 编辑图标显示名
 */
export async function 编辑图标名(类别: 图标类别键, 分组名称: string, 图标值: string, 新显示名: string): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据[类别]
    const 分组 = 类别数据.分组列表.find((g) => g.名称 === 分组名称)
    if (分组) {
      const 图标 = 分组.图标.find((i) => i.值 === 图标值)
      if (图标) {
        图标.显示名 = 新显示名
      }
    }
    await 保存图标库数据(数据)
    return 数据
  })
}

// ===== 恢复默认分组 =====

/** 内置分组名称 */
const 默认分组名称 = '默认分组'

/**
 * 恢复指定类别的默认分组
 * 仅对 fontawesome 和 emoji 类别有效
 * 如果已存在"默认分组"则覆盖其图标列表，否则新建
 */
export async function 恢复默认分组(类别: 图标类别键): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()

    let 内置列表: { 值: string; 显示名: string }[]
    if (类别 === 'fontawesome') {
      内置列表 = 内置FontAwesome图标
    } else if (类别 === 'emoji') {
      内置列表 = 内置Emoji列表
    } else {
      return 数据
    }

    const 类别数据 = 数据[类别]
    const 已有分组 = 类别数据.分组列表.find((g) => g.名称 === 默认分组名称)

    if (已有分组) {
      已有分组.图标 = 生成默认图标项(内置列表)
      已有分组.是否内置 = true
    } else {
      类别数据.分组列表.unshift({
        名称: 默认分组名称,
        是否内置: true,
        图标: 生成默认图标项(内置列表),
      })
    }

    await 保存图标库数据(数据)
    return 数据
  })
}

/**
 * 按 FA 分类键恢复分组
 * 每个选中的分类创建一个独立分组，图标值格式为 "fas fa-xxx" / "far fa-xxx" / "fab fa-xxx"
 * 已存在的同名分组不覆盖，跳过
 */
export async function 按分类恢复分组(分类键列表: string[]): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据.fontawesome

    const 已有分组名集合 = new Set(类别数据.分组列表.map((g) => g.名称))

    for (const 分类键 of 分类键列表) {
      const 分类 = FA分类数据.find((c) => c.分类键 === 分类键)
      if (!分类) continue

      if (已有分组名集合.has(分类.分类名)) continue

      类别数据.分组列表.push({
        名称: 分类.分类名,
        是否内置: true,
        图标: 分类.图标列表.map((项) => ({
          值: 项.值,
          显示名: 项.显示名,
        })),
      })
      已有分组名集合.add(分类.分类名)
    }

    await 保存图标库数据(数据)
    return 数据
  })
}

/** 获取 FA 分类摘要列表（不含完整图标列表，用于前端展示选择） */
export function 获取FA分类摘要(): { 分类键: string; 分类名: string; 图标数: number }[] {
  return FA分类数据.map((c) => ({
    分类键: c.分类键,
    分类名: c.分类名,
    图标数: c.图标数,
  }))
}

/** 获取 Emoji 分类摘要列表（不含完整图标列表，用于前端展示选择） */
export function 获取Emoji分类摘要(): { 分类键: string; 分类名: string; 图标数: number }[] {
  return Emoji分类数据.map((c) => ({
    分类键: c.分类键,
    分类名: c.分类名,
    图标数: c.图标数,
  }))
}

/**
 * 按 Emoji 分类键恢复分组
 * 每个选中的分类创建一个独立分组
 * 已存在的同名分组不覆盖，跳过
 */
export async function 按Emoji分类恢复分组(分类键列表: string[]): Promise<图标库数据> {
  return 串行执行(async () => {
    const 数据 = await 读取图标库数据()
    const 类别数据 = 数据.emoji

    const 已有分组名集合 = new Set(类别数据.分组列表.map((g) => g.名称))

    for (const 分类键 of 分类键列表) {
      const 分类 = Emoji分类数据.find((c) => c.分类键 === 分类键)
      if (!分类) continue

      if (已有分组名集合.has(分类.分类名)) continue

      类别数据.分组列表.push({
        名称: 分类.分类名,
        是否内置: true,
        图标: 分类.图标列表.map((项) => ({
          值: 项.值,
          显示名: 项.显示名,
        })),
      })
      已有分组名集合.add(分类.分类名)
    }

    await 保存图标库数据(数据)
    return 数据
  })
}

// ===== 图片管理（用户上传和 URL 下载 — 持久化） =====

/**
 * 检测 Buffer 是否为 SVG 格式
 * SVG 是文本格式，前几个字符通常是 <svg 或 <?xml
 */
function 检测是否为SVG(buffer: Buffer): boolean {
  const 开头 = buffer.slice(0, 100).toString('utf8').trim()
  return 开头.startsWith('<svg') || 开头.startsWith('<?xml')
}

/**
 * 保存图片到图标库图片目录（持久化）
 * @param 图片Buffer 图片二进制数据
 * @param 来源 upload 或 download
 * @returns 相对路径（如 图片/upload_123.png）
 */
export async function 保存图标库图片(图片Buffer: Buffer, 来源: 'upload' | 'download'): Promise<string> {
  await 确保目录存在(图标库图片目录())
  const 扩展名 = 检测是否为SVG(图片Buffer) ? '.svg' : '.png'
  const 文件名 = `${来源}_${Date.now()}${扩展名}`
  const 文件路径 = path.join(图标库图片目录(), 文件名)
  await fs.writeFile(文件路径, 图片Buffer)
  return `图片/${文件名}`
}

/**
 * 读取图标库中的图片返回 base64
 * @param 相对路径 如 图片/upload_123.png 或 upload_123.png
 */
export async function 读取图标库图片(相对路径: string): Promise<string> {
  // 兼容两种格式：直接文件名 或 图片/文件名
  const 实际路径 = 相对路径.startsWith('图片/') ? 相对路径.replace('图片/', '') : 相对路径
  const 文件路径 = path.join(图标库图片目录(), 实际路径)
  if (!existsSync(文件路径)) {
    throw new Error('图标库图片不存在')
  }
  const 数据 = await fs.readFile(文件路径)
  const 扩展名 = path.extname(文件路径).toLowerCase()
  const mime映射: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
  }
  const mime = mime映射[扩展名] || 'image/png'
  return `data:${mime};base64,${数据.toString('base64')}`
}

/**
 * 覆盖写回图标库图片（裁切结果等）
 * @param 相对路径 如 图片/upload_123.png 或 upload_123.png
 * @param base64内容 图片 base64（含 dataURL 前缀或不含均可）
 */
export async function 写回图标库图片(相对路径: string, base64内容: string): Promise<void> {
  const 实际路径 = 相对路径.startsWith('图片/') ? 相对路径.replace('图片/', '') : 相对路径
  if (!实际路径 || 实际路径.includes('..') || path.isAbsolute(实际路径)) {
    throw new Error('非法的图片路径')
  }
  await 确保目录存在(图标库图片目录())
  const 文件路径 = path.join(图标库图片目录(), 实际路径)
  const base64数据 = base64内容.includes(',') ? base64内容.slice(base64内容.indexOf(',') + 1) : base64内容
  const buffer = Buffer.from(base64数据, 'base64')
  await fs.writeFile(文件路径, buffer)
}

// ===== 图标库颜色配置 =====

/** 图标库颜色配置 */
export interface 图标库颜色配置 {
  类别背景颜色: Record<图标类别键, string>
  类别透明背景: Record<图标类别键, boolean>
  颜色历史: string[]
}

const 颜色配置文件路径 = () => path.join(图标库目录(), '图标库颜色.json')

/** 创建默认颜色配置 */
function 创建默认颜色配置(): 图标库颜色配置 {
  return {
    类别背景颜色: {
      fontawesome: '#4a9fa5',
      emoji: '#4a9fa5',
      userUpload: '#4a9fa5',
      urlDownload: '#4a9fa5',
    },
    类别透明背景: {
      fontawesome: false,
      emoji: false,
      userUpload: false,
      urlDownload: false,
    },
    颜色历史: [],
  }
}

/** 读取图标库颜色配置 */
export async function 读取图标库颜色配置(): Promise<图标库颜色配置> {
  try {
    if (!existsSync(颜色配置文件路径())) {
      return 创建默认颜色配置()
    }
    const 内容 = await fs.readFile(颜色配置文件路径(), 'utf-8')
    return JSON.parse(内容) as 图标库颜色配置
  } catch {
    return 创建默认颜色配置()
  }
}

/** 保存图标库颜色配置 */
export async function 保存图标库颜色配置(配置: 图标库颜色配置): Promise<void> {
  await 确保目录存在(图标库目录())
  const 内容 = JSON.stringify(配置, null, 2)
  await fs.writeFile(颜色配置文件路径(), 内容, 'utf-8')
}

/**
 * 删除图标库中的图片
 * @param 相对路径 如 图片/upload_123.png 或 upload_123.png
 */
export async function 删除图标库图片(相对路径: string): Promise<void> {
  // 兼容两种格式：直接文件名 或 图片/文件名
  const 实际路径 = 相对路径.startsWith('图片/') ? 相对路径.replace('图片/', '') : 相对路径
  const 文件路径 = path.join(图标库图片目录(), 实际路径)
  try {
    if (existsSync(文件路径)) {
      await fs.unlink(文件路径)
    }
  } catch {
    // 忽略删除错误
  }
}

// ===== 缓存管理（先缓存，确认后持久化） =====

/**
 * 保存图片到图标库缓存目录
 * @param 图片Buffer 图片二进制数据
 * @returns 缓存文件名（如 cache_12345.png）
 */
export async function 保存图标库缓存图片(图片Buffer: Buffer): Promise<string> {
  await 确保目录存在(图标库缓存目录())
  const 文件名 = `cache_${Date.now()}.png`
  const 文件路径 = path.join(图标库缓存目录(), 文件名)
  await fs.writeFile(文件路径, 图片Buffer)
  return 文件名
}

/**
 * 读取图标库缓存中的图片返回 base64
 * @param 缓存文件名 如 cache_12345.png
 */
export async function 读取图标库缓存图片(缓存文件名: string): Promise<string> {
  const 文件路径 = path.join(图标库缓存目录(), 缓存文件名)
  if (!existsSync(文件路径)) {
    throw new Error('缓存图片不存在')
  }
  const 数据 = await fs.readFile(文件路径)
  const 扩展名 = path.extname(文件路径).toLowerCase()
  const mime映射: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
  }
  const mime = mime映射[扩展名] || 'image/png'
  return `data:${mime};base64,${数据.toString('base64')}`
}

/**
 * 确认保存：将缓存图片移至持久化图片目录
 * @param 缓存文件名 如 cache_12345.png
 * @returns 持久化相对路径（如 图片/download_12345.png）
 */
export async function 确认图标库缓存图片(缓存文件名: string): Promise<string> {
  const 源路径 = path.join(图标库缓存目录(), 缓存文件名)
  if (!existsSync(源路径)) {
    throw new Error('缓存图片不存在')
  }

  await 确保目录存在(图标库图片目录())
  const 目标文件名 = `download_${Date.now()}.png`
  const 目标路径 = path.join(图标库图片目录(), 目标文件名)

  await fs.rename(源路径, 目标路径)
  return `图片/${目标文件名}`
}

/**
 * 清空图标库缓存目录
 */
export async function 清理图标库缓存(): Promise<void> {
  const 路径 = 图标库缓存目录()
  try {
    if (existsSync(路径)) {
      const 文件列表 = await fs.readdir(路径)
      for (const 文件 of 文件列表) {
        await fs.unlink(path.join(路径, 文件))
      }
    }
  } catch {
    // 忽略清理错误
  }
}

// ===== 大图标扫描与批量清理 =====

/** 大图标判定阈值：长边像素（任一超此视为大图） */
export const 大图标长边阈值 = 1024
/** 大图标判定阈值：文件体积字节（超此视为大图） */
export const 大图标体积阈值 = 500 * 1024
/** 大图标判定阈值：宽高比（超横幅/竖条视为大图） */
export const 大图标宽高比阈值 = 2

/** 单个图标扫描结果（含所有图标，是否大图标记区分红绿徽标） */
export interface 大图标扫描项 {
  图标值: string
  显示名: string
  类别: 图标类别键
  分组名: string
  宽: number
  高: number
  体积: number
  是否大图: boolean
}

/** 所有类别键（扫描用） */
const 全部类别键: 图标类别键[] = ['fontawesome', 'emoji', 'userUpload', 'urlDownload']

/**
 * 从 WebP 文件头解析尺寸（复用图片管理模块同款逻辑）
 */
function 读取WebP尺寸(buffer: Buffer): { 宽: number; 高: number } | null {
  if (buffer.length < 30) return null
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null
  if (buffer.toString('ascii', 8, 12) !== 'WEBP') return null
  const 块标识 = buffer.toString('ascii', 12, 16)
  if (块标识 === 'VP8X') {
    return { 宽: 1 + buffer.readUIntLE(24, 3), 高: 1 + buffer.readUIntLE(27, 3) }
  }
  if (块标识 === 'VP8L') {
    const b = buffer.readUInt32LE(21)
    return { 宽: (b & 0x3fff) + 1, 高: ((b >> 14) & 0x3fff) + 1 }
  }
  if (块标识 === 'VP8 ') {
    return { 宽: buffer.readUInt16LE(26) & 0x3fff, 高: buffer.readUInt16LE(28) & 0x3fff }
  }
  return null
}

/**
 * 读取图片文件头尺寸（支持 PNG/JPEG/GIF/BMP/ICO/WebP）
 * @returns 宽高；SVG 返回 0×0；无法识别返回 null
 */
async function 读取图标图片尺寸(文件路径: string): Promise<{ 宽: number; 高: number } | null> {
  try {
    const buffer = Buffer.alloc(32)
    const 句柄 = await fs.open(文件路径, 'r')
    try {
      await 句柄.read(buffer, 0, 32, 0)
    } finally {
      await 句柄.close()
    }
    const 扩展名 = path.extname(文件路径).toLowerCase()
    if (扩展名 === '.svg') {
      return { 宽: 0, 高: 0 }
    }
    if (扩展名 === '.png') {
      if (buffer.length >= 24) {
        const 宽 = buffer.readUInt32BE(16)
        const 高 = buffer.readUInt32BE(20)
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.jpg' || 扩展名 === '.jpeg') {
      let offset = 2
      while (offset < buffer.length - 1) {
        if (buffer[offset] === 0xff && buffer[offset + 1] === 0xc0) {
          const 高 = buffer.readUInt16BE(offset + 5)
          const 宽 = buffer.readUInt16BE(offset + 7)
          if (宽 > 0 && 高 > 0) return { 宽, 高 }
          break
        }
        offset++
      }
    } else if (扩展名 === '.gif') {
      if (buffer.length >= 10) {
        const 宽 = buffer.readUInt16LE(6)
        const 高 = buffer.readUInt16LE(8)
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.bmp') {
      if (buffer.length >= 26) {
        const 宽 = buffer.readUInt32LE(18)
        const 高 = Math.abs(buffer.readInt32LE(22))
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.ico') {
      if (buffer.length >= 10) {
        const 宽 = buffer[6] === 0 ? 256 : buffer[6]
        const 高 = buffer[7] === 0 ? 256 : buffer[7]
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.webp') {
      return 读取WebP尺寸(buffer)
    }
    return null
  } catch {
    return null
  }
}

/**
 * 扫描所有图片图标，返回超过「大图标」阈值的位图（SVG 矢量不做大图预警）
 */
export async function 扫描大图标(): Promise<大图标扫描项[]> {
  const 数据 = await 读取图标库数据()
  const 结果: 大图标扫描项[] = []
  for (const 类别 of 全部类别键) {
    const 类别数据 = 数据[类别]
    if (!类别数据) continue
    for (const 分组 of 类别数据.分组列表) {
      for (const 图标 of 分组.图标) {
        if (!图标.值.startsWith('icons:')) continue
        const 相对路径 = 图标.值.replace('icons:', '')
        const 实际路径 = 相对路径.startsWith('图片/') ? 相对路径.replace('图片/', '') : 相对路径
        const 文件路径 = path.join(图标库图片目录(), 实际路径)
        if (!existsSync(文件路径)) continue
        if (path.extname(文件路径).toLowerCase() === '.svg') continue
        let 体积 = 0
        try {
          体积 = (await fs.stat(文件路径)).size
        } catch {
          continue
        }
        const 尺寸 = await 读取图标图片尺寸(文件路径)
        if (!尺寸) continue
        const 长边 = Math.max(尺寸.宽, 尺寸.高)
        const 短边 = Math.min(尺寸.宽, 尺寸.高)
        const 是否大图 =
          长边 > 大图标长边阈值 ||
          体积 > 大图标体积阈值 ||
          (短边 > 0 && 长边 / 短边 > 大图标宽高比阈值)
        结果.push({ 图标值: 图标.值, 显示名: 图标.显示名, 类别, 分组名: 分组.名称, 宽: 尺寸.宽, 高: 尺寸.高, 体积, 是否大图 })
      }
    }
  }
  return 结果
}

/**
 * 批量清理图标：从所有类别移除指定图标值并删除对应物理文件，一次写盘
 */
export async function 批量清理图标(图标值列表: string[]): Promise<图标库数据> {
  return 串行执行(async () => {
    const 待删集合 = new Set(图标值列表)
    const 数据 = await 读取图标库数据()
    for (const 类别 of 全部类别键) {
      const 类别数据 = 数据[类别]
      if (!类别数据) continue
      for (const 分组 of 类别数据.分组列表) {
        const 保留列表: 图标项[] = []
        for (const 图标 of 分组.图标) {
          if (待删集合.has(图标.值)) {
            if (图标.值.startsWith('icons:')) {
              await 删除图标库图片(图标.值.replace('icons:', ''))
            }
            continue
          }
          保留列表.push(图标)
        }
        分组.图标 = 保留列表
      }
    }
    await 保存图标库数据(数据)
    return 数据
  })
}
