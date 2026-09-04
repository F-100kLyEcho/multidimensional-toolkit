/**
 * 背景图片存储
 * 管理启动页背景图片的保存、读取、删除、列出
 * 支持分组：图片存储在工作空间或全局目录下的 背景图片/{分组名}/ 文件夹
 * 支持双模式存储：工作空间（跟随工作空间隔离） / 全局（所有工作空间共享）
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { nativeImage, screen } from 'electron'
import { 获取模块路径 } from '../../工具/模块路径'
import { 确保目录存在 } from '../../工具/文件操作'
import { 读取配置, 保存配置 } from '../../工具/路径配置'

export type 存储位置类型 = '工作空间' | '全局空间'

const 启动路径 = () => 获取模块路径('启动')

function 读取全局壁纸路径(): string {
  const 配置 = 读取配置()
  if (配置.全局壁纸路径 && existsSync(配置.全局壁纸路径)) return 配置.全局壁纸路径
  return ''
}

export function 保存全局壁纸路径(路径: string): { 成功: boolean; 错误信息?: string } {
  try {
    const 配置 = 读取配置()
    配置.全局壁纸路径 = 路径
    保存配置(配置)
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export function 获取全局壁纸路径(): { 路径: string; 已设置: boolean } {
  const 路径 = 读取全局壁纸路径()
  return { 路径, 已设置: !!路径 }
}

const 背景图片根目录 = (位置: 存储位置类型 = '工作空间') => (位置 === '全局空间' ? 读取全局壁纸路径() : path.join(启动路径(), '背景图片'))
const 分组目录 = (分组名: string, 位置: 存储位置类型 = '工作空间') => path.join(背景图片根目录(位置), 分组名)

const 支持的扩展名 = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp']

function 是图片文件(文件名: string): boolean {
  const 扩展名 = path.extname(文件名).toLowerCase()
  return 支持的扩展名.includes(扩展名)
}

function 获取MIME类型(文件名: string): string {
  const 扩展名 = path.extname(文件名).toLowerCase()
  const 映射: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
  }
  return 映射[扩展名] || 'image/png'
}

export interface 壁纸分组结果 {
  名称: string
  文件列表: string[]
  图标代码: string
}

// ========== 分组图标 ==========

const 分组图标文件 = (分组名: string, 位置: 存储位置类型 = '工作空间') => path.join(分组目录(分组名, 位置), '.icon')

const 缩略图目录 = (分组名: string, 位置: 存储位置类型 = '工作空间') => path.join(分组目录(分组名, 位置), '缩略图')
const 缩略图路径 = (分组名: string, 文件名: string, 位置: 存储位置类型 = '工作空间') => {
  const ext = path.extname(文件名)
  const 基名 = path.basename(文件名, ext)
  return path.join(缩略图目录(分组名, 位置), `${基名}.jpg`)
}

async function 读取分组图标(分组名: string, 位置: 存储位置类型 = '工作空间'): Promise<string> {
  try {
    const 文件路径 = 分组图标文件(分组名, 位置)
    if (existsSync(文件路径)) {
      return (await fs.readFile(文件路径, 'utf-8')).trim()
    }
  } catch {
    // 静默
  }
  return ''
}

export async function 保存分组图标(分组名: string, 图标代码: string, 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 错误信息?: string }> {
  try {
    const 目录 = 分组目录(分组名, 位置)
    if (!existsSync(目录)) {
      return { 成功: false, 错误信息: '分组不存在' }
    }
    const 文件路径 = 分组图标文件(分组名, 位置)
    await fs.writeFile(文件路径, 图标代码, 'utf-8')
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

// ========== 图片操作 ==========

export async function 保存背景图片(base64内容: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }> {
  try {
    const 目录 = 分组目录(分组名, 位置)
    await 确保目录存在(目录)

    const 匹配 = base64内容.match(/^data:image\/([\w.+-]+);base64,(.+)$/)
    if (!匹配) {
      return { 成功: false, 错误信息: '无效的 base64 图片格式' }
    }

    let 扩展名 = 匹配[1]
    if (扩展名 === 'jpeg') 扩展名 = 'jpg'

    const buffer = Buffer.from(匹配[2], 'base64')
    const 文件名 = `bg_${Date.now()}.${扩展名}`
    const 文件路径 = path.join(目录, 文件名)

    await fs.writeFile(文件路径, buffer)
    return { 成功: true, 文件名 }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 读取背景图片(文件名: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; base64?: string; 错误信息?: string }> {
  try {
    const 文件路径 = path.join(分组目录(分组名, 位置), 文件名)
    if (!existsSync(文件路径)) {
      return { 成功: false, 错误信息: '背景图片不存在' }
    }
    const 数据 = await fs.readFile(文件路径)
    const mime = 获取MIME类型(文件名)

    const image = nativeImage.createFromBuffer(数据)
    if (image.isEmpty()) {
      return { 成功: true, base64: `data:${mime};base64,${数据.toString('base64')}` }
    }

    const 尺寸 = image.getSize()
    const 主显示器 = screen.getPrimaryDisplay()
    const 最大宽 = 主显示器.size.width
    const 最大高 = 主显示器.size.height

    if (尺寸.width > 最大宽 || 尺寸.height > 最大高) {
      const 缩放比 = Math.min(最大宽 / 尺寸.width, 最大高 / 尺寸.height)
      const 目标宽 = Math.round(尺寸.width * 缩放比)
      const 目标高 = Math.round(尺寸.height * 缩放比)
      const 缩放后 = image.resize({ width: 目标宽, height: 目标高 })
      const jpegBuffer = 缩放后.toJPEG(90)
      return { 成功: true, base64: `data:image/jpeg;base64,${jpegBuffer.toString('base64')}` }
    }

    return { 成功: true, base64: `data:${mime};base64,${数据.toString('base64')}` }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

/** 读取壁纸缩略图（最大宽 200px，缓存到缩略图/子目录） */
export async function 读取壁纸缩略图(文件名: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; base64?: string; 错误信息?: string }> {
  try {
    const 原图路径 = path.join(分组目录(分组名, 位置), 文件名)
    if (!existsSync(原图路径)) {
      return { 成功: false, 错误信息: '背景图片不存在' }
    }

    const 缓存路径 = 缩略图路径(分组名, 文件名, 位置)
    if (existsSync(缓存路径)) {
      const 缓存数据 = await fs.readFile(缓存路径)
      return { 成功: true, base64: `data:image/jpeg;base64,${缓存数据.toString('base64')}` }
    }

    const 数据 = await fs.readFile(原图路径)
    const image = nativeImage.createFromBuffer(数据)
    if (image.isEmpty()) {
      return { 成功: false, 错误信息: '无法解析图片' }
    }

    const 尺寸 = image.getSize()
    const 缩略图最大宽 = 200
    let 目标宽 = 尺寸.width
    let 目标高 = 尺寸.height
    if (目标宽 > 缩略图最大宽) {
      const 比 = 缩略图最大宽 / 目标宽
      目标宽 = 缩略图最大宽
      目标高 = Math.round(目标高 * 比)
    }

    const 缩放后 = image.resize({ width: 目标宽, height: 目标高 })
    const jpegBuffer = 缩放后.toJPEG(80)

    await 确保目录存在(缩略图目录(分组名, 位置))
    await fs.writeFile(缓存路径, jpegBuffer)

    return { 成功: true, base64: `data:image/jpeg;base64,${jpegBuffer.toString('base64')}` }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 删除背景图片(文件名: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 错误信息?: string }> {
  try {
    const 文件路径 = path.join(分组目录(分组名, 位置), 文件名)
    if (!existsSync(文件路径)) {
      return { 成功: false, 错误信息: '背景图片不存在' }
    }
    await fs.unlink(文件路径)
    const 缩略图 = 缩略图路径(分组名, 文件名, 位置)
    if (existsSync(缩略图)) {
      await fs.unlink(缩略图).catch(() => {})
    }
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 列出背景图片(位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 分组列表?: 壁纸分组结果[]; 错误信息?: string }> {
  try {
    const 根目录 = 背景图片根目录(位置)
    if (!existsSync(根目录)) {
      return { 成功: true, 分组列表: [] }
    }

    // 兼容旧版：如果根目录下直接有图片文件，迁移到「默认」分组
    const 根目录条目 = await fs.readdir(根目录, { withFileTypes: true })
    const 根目录图片 = 根目录条目.filter((e) => e.isFile() && 是图片文件(e.name)).map((e) => e.name)
    if (根目录图片.length > 0) {
      const 默认目录 = 分组目录('默认', 位置)
      await 确保目录存在(默认目录)
      for (const 文件名 of 根目录图片) {
        const 旧路径 = path.join(根目录, 文件名)
        const 新路径 = path.join(默认目录, 文件名)
        if (!existsSync(新路径)) {
          await fs.rename(旧路径, 新路径)
        } else {
          await fs.unlink(旧路径)
        }
      }
    }

    const 子目录条目 = await fs.readdir(根目录, { withFileTypes: true })
    const 分组列表: 壁纸分组结果[] = []

    for (const 条目 of 子目录条目) {
      if (!条目.isDirectory()) continue
      if (条目.name === '缩略图') continue
      const 目录路径 = path.join(根目录, 条目.name)
      const 所有条目 = await fs.readdir(目录路径, { withFileTypes: true })
      const 图片文件 = 所有条目
        .filter((e) => e.isFile() && 是图片文件(e.name) && e.name !== '.icon')
        .map((e) => e.name)
        .sort()
      const 图标代码 = await 读取分组图标(条目.name, 位置)
      分组列表.push({ 名称: 条目.name, 文件列表: 图片文件, 图标代码 })
    }

    // 确保「默认」分组始终存在且排在第一位
    if (!分组列表.some((g) => g.名称 === '默认')) {
      await 确保目录存在(分组目录('默认', 位置))
      const 默认图标 = await 读取分组图标('默认', 位置)
      分组列表.unshift({ 名称: '默认', 文件列表: [], 图标代码: 默认图标 })
    } else {
      const 默认索引 = 分组列表.findIndex((g) => g.名称 === '默认')
      if (默认索引 > 0) {
        const [默认分组] = 分组列表.splice(默认索引, 1)
        分组列表.unshift(默认分组)
      }
    }

    return { 成功: true, 分组列表 }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

// ========== 分组管理 ==========

export async function 新建壁纸分组(分组名: string, 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 错误信息?: string }> {
  try {
    if (分组名 === '默认') {
      return { 成功: false, 错误信息: '不能创建名为「默认」的分组' }
    }
    const 目录 = 分组目录(分组名, 位置)
    if (existsSync(目录)) {
      return { 成功: false, 错误信息: '分组已存在' }
    }
    await 确保目录存在(目录)
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 删除壁纸分组(分组名: string, 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 图片数?: number; 错误信息?: string }> {
  try {
    if (分组名 === '默认') {
      return { 成功: false, 错误信息: '不能删除默认分组' }
    }
    const 目录 = 分组目录(分组名, 位置)
    if (!existsSync(目录)) {
      return { 成功: false, 错误信息: '分组不存在' }
    }
    const 文件列表 = await fs.readdir(目录)
    const 图片数 = 文件列表.filter(是图片文件).length
    await fs.rm(目录, { recursive: true, force: true })
    return { 成功: true, 图片数 }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 重命名壁纸分组(旧名称: string, 新名称: string, 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 错误信息?: string }> {
  try {
    if (旧名称 === '默认') {
      return { 成功: false, 错误信息: '不能重命名默认分组' }
    }
    if (新名称 === '默认') {
      return { 成功: false, 错误信息: '不能使用「默认」作为分组名' }
    }
    const 旧目录 = 分组目录(旧名称, 位置)
    const 新目录 = 分组目录(新名称, 位置)
    if (!existsSync(旧目录)) {
      return { 成功: false, 错误信息: '分组不存在' }
    }
    if (existsSync(新目录)) {
      return { 成功: false, 错误信息: '新名称已被使用' }
    }
    await fs.rename(旧目录, 新目录)
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

// ========== URL 下载 ==========

export async function 裁切壁纸(文件名: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间', 裁切参数: { x: number; y: number; w: number; h: number }, 保留原图?: boolean): Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }> {
  try {
    const 文件路径 = path.join(分组目录(分组名, 位置), 文件名)
    if (!existsSync(文件路径)) {
      return { 成功: false, 错误信息: '背景图片不存在' }
    }

    const 数据 = await fs.readFile(文件路径)
    const image = nativeImage.createFromBuffer(数据)
    if (image.isEmpty()) {
      return { 成功: false, 错误信息: '无法解析图片' }
    }

    const 尺寸 = image.getSize()
    const 裁切区域 = {
      x: Math.round((裁切参数.x / 100) * 尺寸.width),
      y: Math.round((裁切参数.y / 100) * 尺寸.height),
      width: Math.round((裁切参数.w / 100) * 尺寸.width),
      height: Math.round((裁切参数.h / 100) * 尺寸.height),
    }

    const 裁切后 = image.crop(裁切区域)

    const 主显示器 = screen.getPrimaryDisplay()
    const 目标宽 = 主显示器.size.width
    const 目标高 = 主显示器.size.height
    const 缩放后 = 裁切后.resize({ width: 目标宽, height: 目标高 })
    const jpegBuffer = 缩放后.toJPEG(90)

    let 输出文件名: string
    if (保留原图) {
      const ext = path.extname(文件名)
      const 基名 = path.basename(文件名, ext)
      输出文件名 = `${基名}_${Date.now()}_cropped.jpg`
    } else {
      输出文件名 = 文件名
    }

    const 输出路径 = path.join(分组目录(分组名, 位置), 输出文件名)
    await fs.writeFile(输出路径, jpegBuffer)

    const 缩略图 = 缩略图路径(分组名, 输出文件名, 位置)
    if (existsSync(缩略图)) {
      await fs.unlink(缩略图).catch(() => {})
    }
    if (!保留原图) {
      const 旧缩略图 = 缩略图路径(分组名, 文件名, 位置)
      if (existsSync(旧缩略图)) {
        await fs.unlink(旧缩略图).catch(() => {})
      }
    }

    return { 成功: true, 文件名: 输出文件名 }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export async function 下载背景图片(url: string, 分组名: string = '默认', 位置: 存储位置类型 = '工作空间'): Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }> {
  try {
    const 目录 = 分组目录(分组名, 位置)
    await 确保目录存在(目录)

    const 响应 = await fetch(url)
    if (!响应.ok) {
      return { 成功: false, 错误信息: `下载失败：HTTP ${响应.status}` }
    }

    const buffer = Buffer.from(await 响应.arrayBuffer())

    // 从 URL 或 Content-Type 推断扩展名
    let 扩展名 = 'jpg'
    const contentType = 响应.headers.get('content-type') || ''
    if (contentType.includes('png')) 扩展名 = 'png'
    else if (contentType.includes('webp')) 扩展名 = 'webp'
    else if (contentType.includes('gif')) 扩展名 = 'gif'
    else if (contentType.includes('bmp')) 扩展名 = 'bmp'

    const urlExt = path.extname(new URL(url).pathname).toLowerCase().replace('.', '')
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(urlExt)) {
      扩展名 = urlExt === 'jpeg' ? 'jpg' : urlExt
    }

    const 文件名 = `bg_${Date.now()}.${扩展名}`
    const 文件路径 = path.join(目录, 文件名)
    await fs.writeFile(文件路径, buffer)
    return { 成功: true, 文件名 }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}
