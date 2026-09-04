/**
 * 图片扫描
 * 扫描程序所在目录的图片文件，提取 exe 官方图标
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { 提取程序图标单方法, 保存图片到缓存, 读取缓存图片 } from './图片管理'

// ===== 常量 =====

/** 支持的图片扩展名 */
const 图片扩展名白名单 = new Set(['.png', '.ico', '.jpg', '.jpeg', '.bmp', '.gif', '.svg'])

/** 最大图片尺寸（宽或高任一超过此值则过滤） */
const 最大图片尺寸 = 1000

/** 递归扫描最大深度（-1 表示无限制） */
const 最大递归深度 = -1

// ===== 类型 =====

export interface 图标项 {
  文件名: string
  完整路径: string
  是官方图标: boolean
  尺寸?: { 宽: number; 高: number }
}

export interface 扫描结果 {
  成功: boolean
  图标列表?: 图标项[]
  错误信息?: string
}

// ===== 工具函数 =====

/**
 * 获取图片尺寸（通过读取文件头信息）
 * 支持 PNG、JPEG、GIF、BMP、ICO
 * @param 文件路径 图片文件路径
 * @returns 宽高对象，无法读取时返回 null
 */
async function 获取图片尺寸(文件路径: string): Promise<{ 宽: number; 高: number } | null> {
  try {
    const 文件句柄 = await fs.open(文件路径, 'r')
    const buffer = Buffer.alloc(24)
    await 文件句柄.read(buffer, 0, 24, 0)
    await 文件句柄.close()

    const 扩展名 = path.extname(文件路径).toLowerCase()

    if (扩展名 === '.png') {
      // PNG: 8字节签名后，IHDR块包含宽高（从第16字节开始）
      if (buffer.length >= 24) {
        const 宽 = buffer.readUInt32BE(16)
        const 高 = buffer.readUInt32BE(20)
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.jpg' || 扩展名 === '.jpeg') {
      // JPEG: 从 SOF 标记读取
      let offset = 2
      while (offset < buffer.length - 1) {
        if (buffer[offset] === 0xff && buffer[offset + 1] === 0xc0) {
          // SOF0 标记
          const 高 = buffer.readUInt16BE(offset + 5)
          const 宽 = buffer.readUInt16BE(offset + 7)
          if (宽 > 0 && 高 > 0) return { 宽, 高 }
          break
        }
        offset++
      }
    } else if (扩展名 === '.gif') {
      // GIF: 第6-7字节为宽，第8-9字节为高（小端）
      if (buffer.length >= 10) {
        const 宽 = buffer.readUInt16LE(6)
        const 高 = buffer.readUInt16LE(8)
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.bmp') {
      // BMP: 第18-21字节为宽，第22-25字节为高
      if (buffer.length >= 26) {
        const 宽 = buffer.readUInt32LE(18)
        const 高 = Math.abs(buffer.readInt32LE(22))
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.ico') {
      // ICO: 第6字节为图片数量，第8-9字节为第一个图片的宽高
      if (buffer.length >= 10) {
        const 宽 = buffer[6] === 0 ? 256 : buffer[6]
        const 高 = buffer[7] === 0 ? 256 : buffer[7]
        if (宽 > 0 && 高 > 0) return { 宽, 高 }
      }
    } else if (扩展名 === '.svg') {
      // SVG 是矢量图，不过滤尺寸
      return { 宽: 0, 高: 0 }
    }

    return null
  } catch {
    return null
  }
}

/**
 * 判断图片是否超过尺寸限制
 */
function 是否超过尺寸限制(尺寸: { 宽: number; 高: number } | null): boolean {
  if (!尺寸) return false // 无法读取尺寸的不过滤
  if (尺寸.宽 === 0 && 尺寸.高 === 0) return false // SVG 不过滤
  return 尺寸.宽 > 最大图片尺寸 || 尺寸.高 > 最大图片尺寸
}

/**
 * 递归扫描目录下的图片文件
 * @param 目录路径 要扫描的目录
 * @param 当前深度 当前递归深度
 * @returns 图片文件路径列表
 */
async function 扫描目录图片(目录路径: string, 当前深度 = 0): Promise<string[]> {
  // -1 表示无限制深度
  if (最大递归深度 !== -1 && 当前深度 > 最大递归深度) return []

  const 结果: string[] = []

  try {
    const 条目列表 = await fs.readdir(目录路径, { withFileTypes: true })

    for (const 条目 of 条目列表) {
      const 完整路径 = path.join(目录路径, 条目.name)

      if (条目.isDirectory()) {
        // 递归扫描子目录
        const 子目录结果 = await 扫描目录图片(完整路径, 当前深度 + 1)
        结果.push(...子目录结果)
      } else if (条目.isFile()) {
        const 扩展名 = path.extname(条目.name).toLowerCase()
        if (图片扩展名白名单.has(扩展名)) {
          结果.push(完整路径)
        }
      }
    }
  } catch {
    // 权限不足等错误，跳过该目录
  }

  return 结果
}

// ===== 主函数 =====

/**
 * 扫描程序目录图片
 * 1. 尝试提取 exe 官方图标
 * 2. 扫描程序所在目录的图片文件
 * 3. 过滤大图片，合并结果
 *
 * @param 程序路径 可执行文件路径
 * @returns 扫描结果
 */
export async function 扫描程序目录图片(程序路径: string): Promise<扫描结果> {
  try {
    if (!程序路径) {
      return { 成功: false, 错误信息: '程序路径为空' }
    }

    if (!existsSync(程序路径)) {
      return { 成功: false, 错误信息: '程序文件不存在' }
    }

    const 图标列表: 图标项[] = []

    // 1. 并行：提取官方图标 + 扫描目录图片
    const [官方图标结果, 目录图片路径列表] = await Promise.all([
      // 尝试提取官方图标
      (async (): Promise<图标Item | null> => {
        try {
          const 结果 = await 提取程序图标单方法(程序路径)
          if (结果.成功 && 结果.图标列表 && 结果.图标列表.length > 0) {
            // 取第一个成功尺寸的图标
            const 首个图标 = 结果.图标列表[0]
            return {
              文件名: `官方图标_${path.basename(程序路径)}`,
              完整路径: 首个图标.临时文件名,
              是官方图标: true,
              尺寸: 首个图标.像素尺寸,
            }
          }
          return null
        } catch {
          return null
        }
      })(),

      // 扫描目录图片
      (async (): Promise<string[]> => {
        try {
          const 目录路径 = path.dirname(程序路径)
          return await 扫描目录图片(目录路径)
        } catch {
          return []
        }
      })(),
    ])

    // 2. 如果有官方图标，作为第一项
    if (官方图标结果) {
      图标列表.push(官方图标结果)
    }

    // 3. 处理目录图片：读取尺寸、过滤大图
    const 图片项列表: 图标项[] = []
    for (const 图片路径 of 目录图片路径列表) {
      const 尺寸 = await 获取图片尺寸(图片路径)
      if (是否超过尺寸限制(尺寸)) continue

      图片项列表.push({
        文件名: path.basename(图片路径),
        完整路径: 图片路径,
        是官方图标: false,
        尺寸: 尺寸 || undefined,
      })
    }

    // 4. 按文件名排序
    图片项列表.sort((a, b) => a.文件名.localeCompare(b.文件名))

    // 5. 合并结果
    图标列表.push(...图片项列表)

    return {
      成功: true,
      图标列表,
    }
  } catch (e) {
    return {
      成功: false,
      错误信息: `扫描失败: ${(e as Error).message}`,
    }
  }
}

// 内部类型
interface 图标Item {
  文件名: string
  完整路径: string
  是官方图标: boolean
  尺寸?: { 宽: number; 高: number }
}
