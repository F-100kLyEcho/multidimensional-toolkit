/**
 * 图片管理
 * 提供程序图标提取、网页图标获取、缓存管理等图片相关功能
 * 所有图片遵循 先缓存、后确认、再持久化 的原则
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { app, nativeImage } from 'electron'
import { 获取模块路径 } from '../../工具/模块路径'
import { 确保目录存在 } from '../../工具/文件操作'
import { 提取PE程序图标 } from './PE图标提取'

// ----- 常量 -----
const 启动路径 = () => 获取模块路径('启动')
const 缓存目录 = () => path.join(启动路径(), '图标缓存')
const 卡片图片根目录 = (归属菜单ID: number) => path.join(启动路径(), '卡片', `sub${归属菜单ID}`, '图片')

/** 临时文件名格式映射 */
type 图标来源 = 'favicon' | 'appicon' | 'upload' | 'webimg'

/** 网页图片扫描结果项 */
export interface 网页图标项 {
  临时文件名: string
  来源: 'favicon' | 'webpage'
  原始URL: string
  像素尺寸: { 宽: number; 高: number }
  尺寸标注: string
}

/** 网页图片扫描诊断信息 */
export interface 扫描诊断信息 {
  HTML获取状态: number // HTTP 状态码
  HTML长度: number
  各来源命中: Record<string, number> // { 'img-src': 5, 'og:image': 1, ... }
  /** 本次扫描的网页地址（便于直接看出诊断属于哪个网址） */
  扫描网址?: string
  候选URL数: number
  下载成功数: number
  下载失败数: number
  /** 各类失败原因的计数，用于定位"扫到却下载不到"的问题 */
  失败原因?: Record<string, number>
  最终图标数: number
  错误?: string
}

// ========== 类型定义 ==========

/** 单个尺寸的图标结果 */
export interface 图标尺寸项 {
  尺寸: string
  临时文件名: string
  像素尺寸: { 宽: number; 高: number }
  /** 图标来源：pe=PE 内嵌解析，system=Windows 系统关联图标 */
  来源?: 'pe' | 'system'
}

/** 提取程序图标的结果 */
export interface 提取结果 {
  成功: boolean
  图标列表?: 图标尺寸项[]
  错误信息?: string
}

// ========== Electron 提取（多来源并行）==========

/**
 * 提取 Windows 系统关联图标（getFileIcon，上限 48×48）
 */
async function 提取系统图标(程序路径: string): Promise<提取结果> {
  const 尺寸顺序 = ['large', 'normal', 'small'] as const
  const 成功列表: 图标尺寸项[] = []

  for (const 尺寸 of 尺寸顺序) {
    try {
      const icon = await app.getFileIcon(程序路径, { size: 尺寸 })
      const buffer = icon.toPNG()
      if (buffer && buffer.length > 0) {
        const 临时文件名 = await 保存图片到缓存(buffer, 'appicon')
        const 像素 = icon.getSize()
        成功列表.push({ 尺寸, 临时文件名, 像素尺寸: { 宽: 像素.width, 高: 像素.height }, 来源: 'system' })
      }
    } catch {
      // 单个尺寸失败，继续尝试下一档
    }
  }

  if (成功列表.length > 0) {
    return { 成功: true, 图标列表: 成功列表 }
  }
  return { 成功: false, 错误信息: '系统图标提取失败' }
}

/**
 * 提取程序图标
 * 并行运行两种来源，结果同时返回并标记来源：
 *   1. 纯 JS 解析 PE 资源表（程序内嵌图标，最高 256）
 *   2. Windows 系统关联图标（getFileIcon，Windows 上限 48×48）
 * @param 程序路径 可执行文件或快捷方式路径
 * @returns 提取结果，包含两种来源的所有成功尺寸图标
 */
export async function 提取程序图标单方法(程序路径: string): Promise<提取结果> {
  const [pe结果, 系统结果] = await Promise.all([提取PE程序图标(程序路径), 提取系统图标(程序路径)])

  const 图标列表: 图标尺寸项[] = [
    ...(pe结果.成功 && pe结果.图标列表
      ? pe结果.图标列表.map((项) => ({ ...项, 来源: 'pe' as const }))
      : []),
    ...(系统结果.成功 && 系统结果.图标列表 ? 系统结果.图标列表 : []),
  ]

  if (图标列表.length > 0) {
    return { 成功: true, 图标列表 }
  }
  return {
    成功: false,
    错误信息: `PE解析失败(${pe结果.错误信息 || '未知错误'})，系统图标提取失败(${系统结果.错误信息 || '未知错误'})`,
  }
}

// ========== 缓存管理 ==========

/**
 * 获取图片的 Buffer 并保存到缓存目录
 * @param 图片Buffer 图片二进制数据
 * @param 来源 图片来源类型
 * @returns 临时文件名（如 appicon_173445.png）
 */
export async function 保存图片到缓存(图片Buffer: Buffer, 来源: 图标来源, 扩展名 = '.png'): Promise<string> {
  await 确保目录存在(缓存目录())
  const 临时文件名 = `${来源}_${Date.now()}${扩展名}`
  const 临时路径 = path.join(缓存目录(), 临时文件名)
  await fs.writeFile(临时路径, 图片Buffer)
  return 临时文件名
}

/**
 * 读取缓存目录下的图片返回 base64
 * @param 临时文件名 缓存中的文件名
 * @returns base64 编码的图片数据
 */
export async function 读取缓存图片(临时文件名: string): Promise<string> {
  const 文件路径 = path.join(缓存目录(), 临时文件名)
  if (!existsSync(文件路径)) {
    throw new Error('缓存图片不存在')
  }
  const 数据 = await fs.readFile(文件路径)
  const 扩展名 = path.extname(临时文件名).toLowerCase()
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
 * 读取卡片目录下的图片返回 base64
 * @param 归属菜单ID 卡片所属二级菜单ID
 * @param 图片路径 相对路径（如 图片/card_1.png）
 * @returns base64 编码的图片数据
 */
export async function 读取卡片图片(归属菜单ID: number, 图片相对路径: string): Promise<string> {
  const 文件路径 = path.join(启动路径(), '卡片', `sub${归属菜单ID}`, 图片相对路径)
  if (!existsSync(文件路径)) {
    throw new Error('卡片图片不存在')
  }
  const 数据 = await fs.readFile(文件路径)
  const 扩展名 = path.extname(图片相对路径).toLowerCase()
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
 * 确认保存图标：将图片从缓存移至卡片目录，清空缓存
 * @param 临时文件名 缓存中的文件名
 * @param 归属菜单ID 卡片所属二级菜单ID
 * @param 卡片ID 卡片唯一ID
 * @returns 相对路径（如 图片/appicon_173445.png）
 */
export async function 确认保存图标(临时文件名: string, 归属菜单ID: number, 卡片ID: number): Promise<string> {
  const 源路径 = path.join(缓存目录(), 临时文件名)
  if (!existsSync(源路径)) {
    throw new Error('缓存图片不存在')
  }

  // 目标文件名含时间戳：每次确认都会生成新路径，
  // 保证前端在重复选择图标时能感知路径变化并刷新显示
  const 扩展名 = path.extname(临时文件名) || '.png'
  const 目标文件名 = `card_${卡片ID}_${Date.now()}${扩展名}`
  const 目标目录 = 卡片图片根目录(归属菜单ID)
  const 目标路径 = path.join(目标目录, 目标文件名)

  // 确保目标目录存在
  await 确保目录存在(目标目录)

  // 删除该卡片已有的旧图标文件，避免时间戳文件名残留
  const 旧文件列表 = await fs.readdir(目标目录).catch(() => [] as string[])
  const 旧前缀 = `card_${卡片ID}_`
  for (const 文件 of 旧文件列表) {
    if (文件.startsWith(旧前缀)) {
      await fs.unlink(path.join(目标目录, 文件)).catch(() => {})
    }
  }

  // 移动文件
  await fs.rename(源路径, 目标路径)

  // 清空缓存目录（移动后清理）
  await 清理图标缓存()

  // 返回相对路径
  return `图片/${目标文件名}`
}

/**
 * 取消图标选择：清空整个缓存目录
 */
export async function 取消图标选择(): Promise<void> {
  await 清理图标缓存()
}

/**
 * 清空图标缓存目录
 */
export async function 清理图标缓存(): Promise<void> {
  const 路径 = 缓存目录()
  try {
    if (existsSync(路径)) {
      await fs.rm(路径, { recursive: true, force: true })
      await 确保目录存在(路径)
    }
  } catch {
    // 忽略清理错误
  }
}

/**
 * 删除卡片图片文件
 * @param 归属菜单ID 卡片所属二级菜单ID
 * @param 图片路径 相对路径（如 图片/card_123.png）
 */
export async function 删除卡片图片(归属菜单ID: number, 图片路径: string): Promise<void> {
  const 完整路径 = path.join(启动路径(), '卡片', `sub${归属菜单ID}`, 图片路径)
  try {
    if (existsSync(完整路径)) {
      await fs.unlink(完整路径)
    }
  } catch {
    // 忽略删除错误
  }
}

/**
 * 应用启动时自动清理缓存
 */
export async function 启动自动清理缓存(): Promise<void> {
  await 清理图标缓存()
}

// ========== 网页图标获取 ==========

/**
 * 获取网页 favicon 并保存到缓存
 * @param url 网页 URL
 * @returns 临时文件名
 */
export async function 获取网页图标(url: string): Promise<string> {
  try {
    const url对象 = new URL(url)

    /** 响应是否为真正的图片（避免把 HTML 错误页/跳转页存成 .png） */
    const 响应是图片 = (r: Response): boolean => {
      const 类型 = (r.headers.get('content-type') || '').toLowerCase()
      return 类型.startsWith('image/')
    }

    // 候选顺序：页面声明的 icon → /favicon.ico → Google 图标服务
    const 候选: string[] = []

    // 1) 从页面 HTML 里解析 <link rel="...icon...">（能识别 svg/webp/png 等）
    try {
      const html响应 = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        },
      })
      if (html响应.ok && (html响应.headers.get('content-type') || '').includes('html')) {
        候选.push(...从HTML提取图标链接(await html响应.text(), url对象))
      }
    } catch {
      // 解析 HTML 失败不致命，继续后面的候选
    }

    // 2) 标准路径
    候选.push(`${url对象.protocol}//${url对象.hostname}/favicon.ico`)

    // 3) Google 图标服务兜底
    候选.push(`https://www.google.com/s2/favicons?domain=${url对象.hostname}&sz=64`)

    for (const 链接 of 候选) {
      try {
        const 响应 = await fetch(链接, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        })
        if (!响应.ok) continue
        if (!响应是图片(响应)) continue // ⚠️ 关键：HTML 等非图片直接跳过

        const buffer = Buffer.from(await 响应.arrayBuffer())
        if (buffer.length === 0) continue

        const 是SVG = (响应.headers.get('content-type') || '').toLowerCase().includes('svg')
        if (是SVG) {
          // SVG 是矢量文本，nativeImage 解析不出尺寸，按原格式保存
          return 保存图片到缓存(buffer, 'favicon', '.svg')
        }

        // favicon.ico 可能含多张图，转成 PNG 统一处理
        const image = nativeImage.createFromBuffer(buffer)
        const pngBuffer = image.toPNG()
        if (pngBuffer && pngBuffer.length > 0) {
          return 保存图片到缓存(pngBuffer, 'favicon')
        }
        return 保存图片到缓存(buffer, 'favicon')
      } catch {
        continue
      }
    }

    throw new Error('未找到可用的网页图标')
  } catch (e) {
    throw new Error(`获取网页图标失败: ${(e as Error).message}`)
  }
}

/**
 * 从 HTML 中提取 <link rel="...icon..."> 指向的图标地址
 * 覆盖 icon / shortcut icon / apple-touch-icon / apple-touch-icon-precomposed / mask-icon
 * @returns 绝对 URL 列表（已去重）
 */
function 从HTML提取图标链接(html: string, 基础URL: URL): string[] {
  const 结果: string[] = []
  const 正则 = /<link\b[^>]*>/gi
  for (const [标签] of html.matchAll(正则)) {
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(标签)?.[1]?.toLowerCase() || ''
    if (!rel.includes('icon')) continue
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(标签)?.[1]
    if (!href || href.startsWith('data:')) continue
    try {
      const 绝对 = new URL(href, 基础URL).href
      if (!结果.includes(绝对)) 结果.push(绝对)
    } catch {
      // 忽略无法解析的地址
    }
  }
  return 结果
}

// ========== 网页图片扫描 ==========

/** 最大图片总像素（约 1200×1200，覆盖大多数网站配图和图标；超过视为大图排除） */
const 最大图片像素 = 1200 * 1200
/** 最小单边尺寸（过滤掉太小的图标） */
const 最小单边像素 = 32
/** 最大宽高比（排除超宽横幅/超高竖条） */
const 最大宽高比 = 4
/** 最大候选 URL 数（扩大搜索范围） */
const 最大候选数 = 100
/** 最多返回图标数 */
const 最多返回数 = 100

/**
 * 下载单张图片并检测尺寸，合格的保存到缓存
 * 过滤规则：忽略 1×1 占位、总像素过大、宽高比异常、单边过小
 * @returns 成功返回图标项，失败返回 null
 */
async function 下载并检测网页图片(图片URL: string, 基础URL: URL, 失败原因?: Record<string, number>): Promise<网页图标项 | null> {
  const 记失败 = (原因: string) => {
    if (失败原因) 失败原因[原因] = (失败原因[原因] || 0) + 1
  }
  try {
    const response = await fetch(图片URL, {
      signal: AbortSignal.timeout(8000),
      headers: { Referer: 基础URL.origin, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    if (!response.ok) {
      记失败(`HTTP ${response.status}`)
      return null
    }

    // 校验 Content-Type：非图片（HTML 错误页/登录页/跳转页）直接跳过，避免存成假图片
    const 内容类型 = (response.headers.get('content-type') || '').toLowerCase()
    if (!内容类型.startsWith('image/')) {
      记失败(`非图片(${内容类型.split(';')[0] || '未知类型'})`)
      return null
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.length === 0) {
      记失败('响应体为空')
      return null
    }

    // SVG 是矢量文本，nativeImage 解析不出尺寸（会得到 0×0）
    // → 不走尺寸过滤，按原格式保存，前端 <img> 可正常渲染
    if (内容类型.includes('svg')) {
      const 文件名 = await 保存图片到缓存(buffer, 'webimg', '.svg')
      return {
        临时文件名: 文件名,
        来源: 'webpage',
        原始URL: 图片URL,
        像素尺寸: { 宽: 0, 高: 0 },
        尺寸标注: 'SVG',
      }
    }

    // 用 Electron nativeImage 检测尺寸（部分 WebP 变体 nativeImage 解析不了）
    const image = nativeImage.createFromBuffer(buffer)
    const 类型短名 = (内容类型.split('/')[1] || '未知').split(';')[0]
    let 宽: number
    let 高: number

    if (image.isEmpty()) {
      // 兜底：WebP 直接从文件头解析尺寸
      const webp尺寸 = 内容类型.includes('webp') ? 解析WebP尺寸(buffer) : null
      if (webp尺寸) {
        宽 = webp尺寸.宽
        高 = webp尺寸.高
      } else {
        记失败(`无法识别(${类型短名})`)
        return null
      }
    } else {
      const 像素 = image.getSize()
      宽 = 像素.width
      高 = 像素.height
    }
    const 总像素 = 宽 * 高

    // 过滤条件（满足任意一条则丢弃）
    if (总像素 <= 1) {
      记失败(`尺寸无效(${宽}x${高})`)
      return null
    }
    if (总像素 > 最大图片像素) {
      记失败(`尺寸过大(${宽}x${高})`)
      return null
    }
    if (宽 < 最小单边像素 || 高 < 最小单边像素) {
      记失败(`单边过小(${宽}x${高})`)
      return null
    }
    if (宽 / 高 > 最大宽高比 || 高 / 宽 > 最大宽高比) {
      记失败(`宽高比异常(${宽}x${高})`)
      return null
    }

    // 转换为 PNG 并保存到缓存
    const pngBuffer = image.toPNG()
    const 文件名 = await 保存图片到缓存(pngBuffer && pngBuffer.length > 0 ? pngBuffer : buffer, 'webimg')

    return {
      临时文件名: 文件名,
      来源: 'webpage',
      原始URL: 图片URL,
      像素尺寸: { 宽, 高 },
      尺寸标注: `${宽}×${高}`,
    }
  } catch (e) {
    const 错 = e as NodeJS.ErrnoException
    const 细节 = [
      错?.code || 错?.name || '未知',
      错?.errno !== undefined ? `errno=${错.errno}` : '',
      错?.syscall ? `syscall=${错.syscall}` : '',
      错?.path ? `path=${错.path}` : '',
      错?.message || '',
    ].filter(Boolean).join(' | ')
    记失败(`异常: ${细节.slice(0, 200)}`)
    return null
  }
}

/**
 * 扫描网页中的图片标签，下载并过滤合适的图片
 * @param url 网页 URL
 * @returns 图标项列表
 */
/**
 * 扫描网页中的图片标签，下载并过滤合适的图片（带诊断信息）
 * @param url 网页 URL
 * @returns { 图标列表, 诊断信息 }
 */
export async function 扫描网页图片(url: string): Promise<{ 图标列表: 网页图标项[]; 诊断信息: 扫描诊断信息 }> {
  const 诊断信息: 扫描诊断信息 = {
    HTML获取状态: 0,
    HTML长度: 0,
    各来源命中: {},
    扫描网址: url,
    候选URL数: 0,
    下载成功数: 0,
    下载失败数: 0,
    失败原因: {},
    最终图标数: 0,
  }
  const 结果列表: 网页图标项[] = []

  try {
    const url对象 = new URL(url)
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      },
    })
    诊断信息.HTML获取状态 = response.status
    if (!response.ok) {
      诊断信息.错误 = `HTTP ${response.status}`
      return { 图标列表: [], 诊断信息 }
    }

    const html = await response.text()
    诊断信息.HTML长度 = html.length

    // 提取图片 URL 的辅助函数
    function 加入URL(原始URL: string) {
      if (!原始URL || 原始URL.startsWith('data:') || 原始URL.startsWith('blob:')) return
      try {
        imgSrc列表.add(new URL(原始URL, url对象).href)
      } catch {
        // 无效 URL，忽略
      }
    }

    // 提取所有图片 URL
    const imgSrc列表 = new Set<string>()

    // 日志辅助：统计各来源命中数
    const 命中统计: Record<string, number> = {}
    function 记录命中(来源名称: string, 匹配数: number) {
      if (匹配数 > 0) 命中统计[来源名称] = 匹配数
    }

    // 1. <img src="...">
    const m1 = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    m1.forEach((m) => m[1] && 加入URL(m[1]))
    记录命中('img-src', m1.filter((m) => m[1] && !m[1].startsWith('data:') && !m[1].startsWith('blob:')).length)

    // 2. <img data-src="..."> / data-lazy-src 等懒加载属性
    const m2 = [...html.matchAll(/<img[^>]+data-(?:src|lazy-src|original) *= *["']([^"']+)["']/gi)]
    m2.forEach((m) => m[1] && 加入URL(m[1]))
    记录命中('data-src', m2.length)

    // 3. <img srcset="..."> 解析多候选项
    let srcset计数 = 0
    for (const m of html.matchAll(/<img[^>]+srcset=["']([^"']+)["']/gi)) {
      const 候选项 = m[1].split(',').map((s) => s.trim().split(/\s+/)[0])
      for (const url of 候选项) {
        if (url) {
          加入URL(url)
          srcset计数++
        }
      }
    }
    记录命中('img-srcset', srcset计数)

    // 4. <source srcset="...">（picture 元素内）
    let source计数 = 0
    for (const m of html.matchAll(/<source[^>]+srcset=["']([^"']+)["']/gi)) {
      const 候选项 = m[1].split(',').map((s) => s.trim().split(/\s+/)[0])
      for (const url of 候选项) {
        if (url) {
          加入URL(url)
          source计数++
        }
      }
    }
    记录命中('source-srcset', source计数)

    // 5. <link rel="icon"> / <link rel="apple-touch-icon">
    const m5 = [...html.matchAll(/<link[^>]+rel=["'](?:apple-touch-icon|shortcut )?icon["'][^>]+href=["']([^"']+)["']/gi)]
    m5.forEach((m) => m[1] && 加入URL(m[1]))
    记录命中('link-icon', m5.length)

    // 6. <meta property="og:image">
    const m6 = [...html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi)]
    m6.forEach((m) => m[1] && 加入URL(m[1]))
    记录命中('og:image', m6.length)

    // 7. <meta name="twitter:image">
    const m7 = [...html.matchAll(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/gi)]
    m7.forEach((m) => m[1] && 加入URL(m[1]))
    记录命中('twitter:image', m7.length)

    // 8. 内联 style="background-image: url(...)"（也匹配 background / mask-image）
    let css内联计数 = 0
    for (const m of html.matchAll(/style\s*=\s*["']([^"']*?)url\(\s*["']?([^"'\s)]+)["']?\s*\)/gi)) {
      if (m[2] && !m[2].startsWith('data:') && !m[2].startsWith('blob:')) {
        加入URL(m[2])
        css内联计数++
      }
    }
    // 也匹配不带引号的 url()
    for (const m of html.matchAll(/style\s*=\s*["'][^"']*?url\(([^)"'\s]+)\)/gi)) {
      if (m[1] && !m[1].startsWith('data:') && !m[1].startsWith('blob:')) {
        加入URL(m[1])
        css内联计数++
      }
    }
    记录命中('css-inline', css内联计数)

    // 9. <style> 标签内的 CSS url()
    let css标签计数 = 0
    const 样式内容匹配 = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)
    for (const sm of 样式内容匹配) {
      const 样式内容 = sm[1]
      for (const um of 样式内容.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
        if (um[1] && !um[1].startsWith('data:') && !um[1].startsWith('blob:')) {
          加入URL(um[1])
          css标签计数++
        }
      }
    }
    记录命中('css-style', css标签计数)

    诊断信息.各来源命中 = 命中统计
    诊断信息.扫描网址 = url
    诊断信息.候选URL数 = imgSrc列表.size

    console.log(`[网页图片扫描] ${url} HTML 提取统计:`, 命中统计, `去重后共 ${imgSrc列表.size} 个候选URL`)

    if (imgSrc列表.size === 0) {
      诊断信息.错误 = 'HTML 中未找到任何图片 URL'
      return { 图标列表: [], 诊断信息 }
    }

    // 并发下载（使用最大候选数）
    const src数组 = Array.from(imgSrc列表).slice(0, 最大候选数)
    const 失败原因统计: Record<string, number> = {}
    const 下载任务 = src数组.map((src) => 下载并检测网页图片(src, url对象, 失败原因统计))

    const 下载结果 = await Promise.allSettled(下载任务)
    let 成功数 = 0
    let 失败数 = 0
    for (const r of 下载结果) {
      if (r.status === 'fulfilled' && r.value) {
        结果列表.push(r.value)
        成功数++
      } else {
        失败数++
      }
    }
    诊断信息.下载成功数 = 成功数
    诊断信息.下载失败数 = 失败数
    诊断信息.失败原因 = 失败原因统计
    诊断信息.最终图标数 = Math.min(结果列表.length, 最多返回数)

    console.log(`[网页图片扫描] ${url} 下载完成: 成功 ${成功数} 张, 失败/过滤 ${失败数} 张`, 失败原因统计)

    return { 图标列表: 结果列表.slice(0, 最多返回数), 诊断信息 }
  } catch (e) {
    诊断信息.错误 = (e as Error).message
    return { 图标列表: [], 诊断信息 }
  }
}

/**
 * 获取网页图标（并行：favicon + 网页图片扫描）
 * @param url 网页 URL
 * @returns 合并的图标列表 + 错误信息
 */
/**
 * 获取网页图标（并行：favicon + 网页图片扫描）+ 诊断信息
 * @param url 网页 URL
 * @returns 合并的图标列表 + 诊断信息 + 错误信息
 */
export async function 获取网页图标并行(url: string): Promise<{ 图标列表: 网页图标项[]; 诊断信息: 扫描诊断信息; 错误信息?: string }> {
  const [favicon结果, 扫描结果] = await Promise.allSettled([
    (async (): Promise<网页图标项 | null> => {
      try {
        const 临时文件名 = await 获取网页图标(url)
        return {
          临时文件名,
          来源: 'favicon' as const,
          原始URL: '',
          像素尺寸: { 宽: 0, 高: 0 },
          尺寸标注: 'favicon',
        }
      } catch {
        return null
      }
    })(),
    扫描网页图片(url),
  ])

  const 图标列表: 网页图标项[] = []
  let 诊断信息: 扫描诊断信息 = {
    HTML获取状态: 0,
    HTML长度: 0,
    各来源命中: {},
    候选URL数: 0,
    下载成功数: 0,
    下载失败数: 0,
    最终图标数: 0,
  }

  if (favicon结果.status === 'fulfilled' && favicon结果.value) {
    图标列表.push(favicon结果.value)
  }

  if (扫描结果.status === 'fulfilled') {
    const 扫描数据 = 扫描结果.value
    图标列表.push(...扫描数据.图标列表)
    诊断信息 = 扫描数据.诊断信息
    诊断信息.最终图标数 = 图标列表.length
  } else if (扫描结果.status === 'rejected') {
    诊断信息.错误 = `扫描异常: ${(扫描结果.reason as Error)?.message || '未知错误'}`
  }

  const 错误列表: string[] = []
  if (favicon结果.status === 'rejected' || !favicon结果.value) {
    错误列表.push('未获取到 favicon')
  }

  if (图标列表.length === 0 && 错误列表.length > 0) {
    return { 图标列表: [], 诊断信息, 错误信息: 错误列表.join('；') }
  }

  return { 图标列表, 诊断信息 }
}

/**
 * 从 WebP 文件头解析尺寸（部分 WebP 变体 nativeImage 解析不了，用它兜底）
 * 支持三种块：VP8（有损）/ VP8L（无损）/ VP8X（扩展，含动画）
 * @returns 尺寸；无法解析返回 null
 */
function 解析WebP尺寸(buffer: Buffer): { 宽: number; 高: number } | null {
  // RIFF....WEBP
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
