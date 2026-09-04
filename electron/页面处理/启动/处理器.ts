/**
 * 启动页面 IPC 处理器
 * 注册所有启动页面相关的 IPC handler
 */
import { ipcMain, dialog, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { 读取主题, 保存主题 } from './启动数据'
import { 保存背景图片, 读取背景图片, 删除背景图片, 列出背景图片, 新建壁纸分组, 删除壁纸分组, 重命名壁纸分组, 下载背景图片, 保存分组图标, 读取壁纸缩略图, 保存全局壁纸路径, 获取全局壁纸路径, 裁切壁纸 } from './背景图片存储'
import { 读取配置, 保存配置, 读取菜单结构, 保存菜单结构, 保存卡片文件, 删除卡片文件夹, 列出所有卡片, 读取卡片文件 } from './卡片存储'
import { 提取程序图标单方法, 获取网页图标, 获取网页图标并行, 读取缓存图片, 读取卡片图片, 确认保存图标, 取消图标选择, 保存图片到缓存, 删除卡片图片 } from './图片管理'
import { 扫描程序目录图片 } from './图片扫描'
import { 读取图标库数据, 保存图标库数据, 添加分组, 删除分组, 重命名分组, 添加图标, 删除图标, 移动图标, 移动分组, 编辑图标名, 保存图标库图片, 读取图标库图片, 写回图标库图片, 删除图标库图片, 恢复默认分组, 按分类恢复分组, 获取FA分类摘要, 按Emoji分类恢复分组, 获取Emoji分类摘要, 保存图标库缓存图片, 读取图标库缓存图片, 确认图标库缓存图片, 清理图标库缓存, 读取图标库颜色配置, 保存图标库颜色配置, 扫描大图标, 批量清理图标 } from './图标库存储'

export function 注册启动处理器(): void {
  // ========== 主题 ==========
  ipcMain.handle('启动-读取主题', async () => {
    try {
      const 主题 = await 读取主题()
      return { 成功: true, 主题 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-保存主题', async (_e, p) => {
    try {
      await 保存主题(p.主题)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 背景图片 ==========
  ipcMain.handle('启动-保存背景图片', async (_e, p) => {
    return await 保存背景图片(p.base64内容, p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-读取背景图片', async (_e, p) => {
    return await 读取背景图片(p.文件名, p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-读取壁纸缩略图', async (_e, p) => {
    return await 读取壁纸缩略图(p.文件名, p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-删除背景图片', async (_e, p) => {
    return await 删除背景图片(p.文件名, p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-列出背景图片', async (_e, p) => {
    return await 列出背景图片(p?.存储位置)
  })

  ipcMain.handle('启动-新建壁纸分组', async (_e, p) => {
    return await 新建壁纸分组(p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-删除壁纸分组', async (_e, p) => {
    return await 删除壁纸分组(p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-重命名壁纸分组', async (_e, p) => {
    return await 重命名壁纸分组(p.旧名称, p.新名称, p.存储位置)
  })

  ipcMain.handle('启动-下载背景图片', async (_e, p) => {
    return await 下载背景图片(p.url, p.分组名, p.存储位置)
  })

  ipcMain.handle('启动-保存分组图标', async (_e, p) => {
    return await 保存分组图标(p.分组名, p.图标代码, p.存储位置)
  })

  ipcMain.handle('启动-获取全局壁纸路径', async () => {
    return 获取全局壁纸路径()
  })

  ipcMain.handle('启动-保存全局壁纸路径', async (_e, p) => {
    return 保存全局壁纸路径(p.路径)
  })

  ipcMain.handle('启动-裁切壁纸', async (_e, p) => {
    return await 裁切壁纸(p.文件名, p.分组名, p.存储位置, p.裁切参数, p.保留原图)
  })

  // ========== 配置（ID 计数器）==========
  ipcMain.handle('启动-读取配置', async () => {
    try {
      const 配置 = await 读取配置()
      return { 成功: true, 配置 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-保存配置', async (_e, p) => {
    try {
      await 保存配置(p.配置)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 菜单结构 ==========
  ipcMain.handle('启动-读取菜单结构', async () => {
    try {
      const 菜单结构 = await 读取菜单结构()
      return { 成功: true, 菜单结构 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-保存菜单结构', async (_e, p) => {
    try {
      await 保存菜单结构(p.菜单结构)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 卡片读写 ==========
  ipcMain.handle('启动-读取卡片文件', async (_e, p) => {
    try {
      const { 归属菜单ID } = p
      if (归属菜单ID === undefined) return { 成功: false, 错误信息: '缺少归属菜单ID' }
      const 卡片列表 = await 读取卡片文件(归属菜单ID)
      return { 成功: true, 卡片列表 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-保存卡片文件', async (_e, p) => {
    try {
      const { 归属菜单ID, 卡片列表 } = p
      if (归属菜单ID === undefined) return { 成功: false, 错误信息: '缺少归属菜单ID' }
      await 保存卡片文件(归属菜单ID, 卡片列表)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-删除卡片文件夹', async (_e, p) => {
    try {
      const { 归属菜单ID } = p
      if (归属菜单ID === undefined) return { 成功: false, 错误信息: '缺少归属菜单ID' }
      await 删除卡片文件夹(归属菜单ID)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-列出所有卡片', async () => {
    try {
      const 卡片列表 = await 列出所有卡片()
      return { 成功: true, 卡片列表 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 图标提取与缓存管理 ==========

  /** 提取程序图标（多尺寸 Electron 提取） */
  ipcMain.handle('启动-提取程序图标-单方法', async (_e, p) => {
    try {
      const { 路径: 程序路径 } = p
      if (!程序路径) return { 成功: false, 错误信息: '路径为空' }
      const 结果 = await 提取程序图标单方法(程序路径)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  ipcMain.handle('启动-获取网页图标', async (_e, p) => {
    try {
      const { url } = p
      if (!url) return { 成功: false, 错误信息: 'URL 为空' }
      const 临时文件名 = await 获取网页图标(url)
      return { 成功: true, 临时文件名 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  /** 获取网页图标（并行：favicon + 网页图片扫描） */
  ipcMain.handle('启动-扫描网页图片', async (_e, p) => {
    try {
      const { url } = p
      if (!url) return { 成功: false, 错误信息: 'URL 为空' }
      const 结果 = await 获取网页图标并行(url)
      return { 成功: true, ...结果 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  ipcMain.handle('启动-上传图片到缓存', async (_e, p) => {
    try {
      const { base64内容 } = p
      if (!base64内容) return { 成功: false, 错误信息: '图片内容为空' }
      const 匹配 = base64内容.match(/^data:image\/([\w.+-]+);base64,(.+)$/)
      if (!匹配) return { 成功: false, 错误信息: '图片格式不正确' }
      const mime类型 = 匹配[1]
      const mime到扩展名: Record<string, string> = {
        'png': '.png',
        'jpeg': '.jpg',
        'gif': '.gif',
        'bmp': '.bmp',
        'x-icon': '.ico',
        'svg+xml': '.svg',
      }
      const 扩展名 = mime到扩展名[mime类型] || '.png'
      const buffer = Buffer.from(匹配[2], 'base64')
      const 临时文件名 = await 保存图片到缓存(buffer, 'upload', 扩展名)
      return { 成功: true, 临时文件名 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-确认保存图标', async (_e, p) => {
    try {
      const { 临时文件名, 归属菜单ID, 卡片ID } = p
      if (!临时文件名 || 归属菜单ID === undefined || 卡片ID === undefined) {
        return { 成功: false, 错误信息: '参数不完整' }
      }
      const 图片路径 = await 确认保存图标(临时文件名, 归属菜单ID, 卡片ID)
      return { 成功: true, 图片路径 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  ipcMain.handle('启动-取消图标选择', async () => {
    try {
      await 取消图标选择()
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  ipcMain.handle('启动-读取缓存图片', async (_e, p) => {
    try {
      const { 临时文件名 } = p
      if (!临时文件名) return { 成功: false, 错误信息: '临时文件名为空' }
      const base64 = await 读取缓存图片(临时文件名)
      return { 成功: true, base64 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  /** 读取卡片图片返回 base64 */
  ipcMain.handle('启动-读取卡片图片', async (_e, p) => {
    try {
      const { 归属菜单ID, 图片路径 } = p
      if (归属菜单ID === undefined || !图片路径) {
        return { 成功: false, 错误信息: '参数不完整' }
      }
      const base64 = await 读取卡片图片(归属菜单ID, 图片路径)
      return { 成功: true, base64 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  ipcMain.handle('启动-删除卡片图片', async (_e, p) => {
    try {
      const { 归属菜单ID, 图片路径 } = p
      if (归属菜单ID === undefined || !图片路径) {
        return { 成功: false, 错误信息: '参数不完整' }
      }
      await 删除卡片图片(归属菜单ID, 图片路径)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  // ========== 读取本地图片文件（返回 base64）==========
  ipcMain.handle('启动-读取本地图片', async (_e, p) => {
    try {
      const { 文件路径 } = p
      if (!文件路径) return { 成功: false, 错误信息: '文件路径为空' }
      if (!fs.existsSync(文件路径)) return { 成功: false, 错误信息: '文件不存在' }
      const 数据 = await fs.promises.readFile(文件路径)
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
      const base64 = `data:${mime};base64,${数据.toString('base64')}`
      return { 成功: true, base64 }
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  // ========== 图片扫描（图标选择弹窗）==========
  ipcMain.handle('启动-扫描程序目录图片', async (_e, p) => {
    try {
      const { 程序路径 } = p
      if (!程序路径) return { 成功: false, 错误信息: '程序路径为空' }
      const 结果 = await 扫描程序目录图片(程序路径)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: (e as Error).message }
    }
  })

  // ========== 工具功能 ==========
  ipcMain.handle('启动-检测路径', async (_e, p) => {
    try {
      const 目标路径 = p?.路径
      if (!目标路径) return { 成功: false, 存在: false, 错误信息: '路径为空' }
      const 存在 = fs.existsSync(目标路径)
      if (!存在) return { 成功: true, 存在: false, 类型: null }
      const 统计 = fs.statSync(目标路径)
      return { 成功: true, 存在: true, 类型: 统计.isDirectory() ? 'folder' : 'file' }
    } catch (e) {
      return { 成功: false, 存在: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-打开卡片', async (_e, p) => {
    try {
      const { 类型, 值 } = p
      if (类型 === 'url') {
        await shell.openExternal(值)
        return { 成功: true }
      }
      if (类型 === 'folder') {
        await shell.openPath(值)
        return { 成功: true }
      }
      const 扩展名 = path.extname(值).toLowerCase()
      if (扩展名 === '.exe' || 扩展名 === '.bat' || 扩展名 === '.cmd') {
        const 目录 = path.dirname(值)
        const 子进程 = spawn(值, [], {
          cwd: 目录,
          detached: true,
          stdio: 'ignore',
          env: { PATH: process.env.PATH },
        })
        子进程.unref()
        return { 成功: true }
      }
      await shell.openPath(值)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-选择文件', async (_e, p) => {
    try {
      const r = await dialog.showOpenDialog({
        title: p?.标题,
        filters: p?.过滤器,
        properties: ['openFile'],
      })
      return r.canceled ? { 成功: false, 路径: '' } : { 成功: true, 路径: r.filePaths[0] }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('启动-选择文件夹', async (_e, p) => {
    try {
      const r = await dialog.showOpenDialog({
        title: p?.标题,
        properties: ['openDirectory'],
      })
      return r.canceled ? { 成功: false, 路径: '' } : { 成功: true, 路径: r.filePaths[0] }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 图标库管理 ==========

  /** 读取图标库全部数据 */
  ipcMain.handle('图标库-读取数据', async () => {
    try {
      const 数据 = await 读取图标库数据()
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 保存图标库全部数据 */
  ipcMain.handle('图标库-保存数据', async (_e, p) => {
    try {
      await 保存图标库数据(p.数据)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 添加分组 */
  ipcMain.handle('图标库-添加分组', async (_e, p) => {
    try {
      const { 类别, 分组名称 } = p
      const 数据 = await 添加分组(类别, 分组名称)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 删除分组 */
  ipcMain.handle('图标库-删除分组', async (_e, p) => {
    try {
      const { 类别, 分组名称 } = p
      const 数据 = await 删除分组(类别, 分组名称)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 重命名分组 */
  ipcMain.handle('图标库-重命名分组', async (_e, p) => {
    try {
      const { 类别, 旧名称, 新名称 } = p
      const 数据 = await 重命名分组(类别, 旧名称, 新名称)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 添加图标到分组 */
  ipcMain.handle('图标库-添加图标', async (_e, p) => {
    try {
      const { 类别, 分组名称, 图标 } = p
      const 数据 = await 添加图标(类别, 分组名称, 图标)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 删除图标 */
  ipcMain.handle('图标库-删除图标', async (_e, p) => {
    try {
      const { 类别, 分组名称, 图标值 } = p
      const 数据 = await 删除图标(类别, 分组名称, 图标值)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 移动图标（同分组排序 / 跨分组移动） */
  ipcMain.handle('图标库-移动图标', async (_e, p) => {
    try {
      const { 类别, 源分组名, 图标值, 目标分组名, 目标索引 } = p
      const 数据 = await 移动图标(类别, 源分组名, 图标值, 目标分组名, 目标索引)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 移动分组（调整分组顺序） */
  ipcMain.handle('图标库-移动分组', async (_e, p) => {
    try {
      const { 类别, 分组名, 目标索引 } = p
      const 数据 = await 移动分组(类别, 分组名, 目标索引)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 编辑图标显示名 */
  ipcMain.handle('图标库-编辑图标名', async (_e, p) => {
    try {
      const { 类别, 分组名称, 图标值, 新显示名 } = p
      const 数据 = await 编辑图标名(类别, 分组名称, 图标值, 新显示名)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 上传图片到图标库（用户上传用） */
  ipcMain.handle('图标库-上传图片', async (_e, p) => {
    try {
      const { base64内容 } = p
      if (!base64内容) return { 成功: false, 错误信息: '图片内容为空' }
      const 匹配 = base64内容.match(/^data:image\/[\w.+-]+;base64,(.+)$/)
      if (!匹配) return { 成功: false, 错误信息: '图片格式不正确' }
      const buffer = Buffer.from(匹配[1], 'base64')
      const 相对路径 = await 保存图标库图片(buffer, 'upload')
      return { 成功: true, 相对路径 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 下载 URL 图片到图标库 */
  ipcMain.handle('图标库-下载图片', async (_e, p) => {
    try {
      const { url } = p
      if (!url) return { 成功: false, 错误信息: 'URL 为空' }
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) return { 成功: false, 错误信息: `HTTP ${response.status}` }
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const 相对路径 = await 保存图标库图片(buffer, 'download')
      return { 成功: true, 相对路径 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 读取图标库图片返回 base64 */
  ipcMain.handle('图标库-读取图片', async (_e, p) => {
    try {
      const { 相对路径 } = p
      if (!相对路径) return { 成功: false, 错误信息: '路径为空' }
      const base64 = await 读取图标库图片(相对路径)
      return { 成功: true, base64 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 删除图标库图片 */
  ipcMain.handle('图标库-删除图片', async (_e, p) => {
    try {
      const { 相对路径 } = p
      if (!相对路径) return { 成功: false, 错误信息: '路径为空' }
      await 删除图标库图片(相对路径)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 覆盖写回图标库图片（裁切结果） */
  ipcMain.handle('图标库-写回图片', async (_e, p) => {
    try {
      const { 相对路径, base64内容 } = p
      if (!相对路径 || !base64内容) return { 成功: false, 错误信息: '参数缺失' }
      await 写回图标库图片(相对路径, base64内容)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 恢复默认分组 */
  ipcMain.handle('图标库-恢复默认分组', async (_e, p) => {
    try {
      const { 类别 } = p
      const 数据 = await 恢复默认分组(类别)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 按 FA 分类恢复分组 */
  ipcMain.handle('图标库-按分类恢复分组', async (_e, p) => {
    try {
      const { 分类键列表 } = p
      const 数据 = await 按分类恢复分组(分类键列表)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 获取 FA 分类摘要列表 */
  ipcMain.handle('图标库-获取FA分类摘要', async () => {
    try {
      const 摘要 = 获取FA分类摘要()
      return { 成功: true, 摘要 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 按 Emoji 分类恢复分组 */
  ipcMain.handle('图标库-按Emoji分类恢复分组', async (_e, p) => {
    try {
      const { 分类键列表 } = p
      const 数据 = await 按Emoji分类恢复分组(分类键列表)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 获取 Emoji 分类摘要列表 */
  ipcMain.handle('图标库-获取Emoji分类摘要', async () => {
    try {
      const 摘要 = 获取Emoji分类摘要()
      return { 成功: true, 摘要 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 图标库缓存管理（URL 下载专用） ==========

  /** 下载 URL 图片到图标库缓存 */
  ipcMain.handle('图标库-下载图片到缓存', async (_e, p) => {
    try {
      const { url } = p
      if (!url) return { 成功: false, 错误信息: 'URL 为空' }
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
      if (!response.ok) return { 成功: false, 错误信息: `HTTP ${response.status}` }
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const 缓存文件名 = await 保存图标库缓存图片(buffer)
      return { 成功: true, 缓存文件名 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 读取图标库缓存图片返回 base64 */
  ipcMain.handle('图标库-读取缓存图片', async (_e, p) => {
    try {
      const { 缓存文件名 } = p
      if (!缓存文件名) return { 成功: false, 错误信息: '缓存文件名为空' }
      const base64 = await 读取图标库缓存图片(缓存文件名)
      return { 成功: true, base64 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 确认图标库缓存图片（从缓存移至持久化目录） */
  ipcMain.handle('图标库-确认缓存图片', async (_e, p) => {
    try {
      const { 缓存文件名 } = p
      if (!缓存文件名) return { 成功: false, 错误信息: '缓存文件名为空' }
      const 相对路径 = await 确认图标库缓存图片(缓存文件名)
      return { 成功: true, 相对路径 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 清空图标库缓存 */
  ipcMain.handle('图标库-清理缓存', async () => {
    try {
      await 清理图标库缓存()
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 图标库扫描与批量清理 ==========

  /** 扫描大图标（超过阈值的位图） */
  ipcMain.handle('图标库-扫描大图标', async () => {
    try {
      const 列表 = await 扫描大图标()
      return { 成功: true, 列表 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 批量清理图标（按值列表，含物理文件，一次写盘） */
  ipcMain.handle('图标库-批量清理图标', async (_e, p) => {
    try {
      const 数据 = await 批量清理图标(p.图标值列表)
      return { 成功: true, 数据 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ========== 图标库颜色配置 ==========

  /** 读取图标库颜色配置 */
  ipcMain.handle('图标库-读取颜色配置', async () => {
    try {
      const 配置 = await 读取图标库颜色配置()
      return { 成功: true, 配置 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  /** 保存图标库颜色配置 */
  ipcMain.handle('图标库-保存颜色配置', async (_e, p) => {
    try {
      await 保存图标库颜色配置(p.配置)
      return { 成功: true }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })
}
