/**
 * 获取路径页面 IPC 处理器
 * 注册所有与获取路径页面相关的 IPC 通道处理函数
 */
import { ipcMain, shell, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { IPC通道 } from '../../类型/index'
import type { 扫描单个文件夹请求, 扫描单个文件夹响应, 读取排除规则响应, 保存排除规则请求, 保存排除规则响应, 规则存储路径响应 } from '../../类型/index'
import { 获取项目规则路径, 获取扫描输出路径, 获取路径模块路径, 获取合并规则路径, 获取合并代码输出路径 } from '../../工具/模块路径'

// ESM 中替代 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

import { 扫描单个文件夹 } from './文件扫描器'
import { 读取排除规则, 保存排除规则, 列出规则文件, 创建规则文件, 删除规则文件, 重命名规则文件, 读取Mdignore, 保存Mdignore } from './排除规则'
import type { 排除规则数据 } from '../../类型/index'
import type { 创建规则文件请求, 删除规则文件请求, 重命名规则文件请求, 保存Mdignore请求 } from '../../类型/index'
import { 读取全局Mdignore, 保存全局Mdignore, 追加全局Mdignore, 删除全局Mdignore, 读取全局规则配置, 保存全局规则配置, 恢复默认全局规则 } from '../../工具/全局规则'
import type { 全局规则配置 } from '../../工具/全局规则'
import { 合并文件列表 } from './文件合并器'
import type { 合并文件请求, 合并文件响应, 合并配置 } from '../../类型/index'
import { 读取合并配置, 保存合并配置 } from '../../工具/合并配置'
import { 列出合并规则文件, 创建合并规则文件, 读取合并规则文件, 保存合并规则文件, 删除合并规则文件, 重命名合并规则文件 } from '../../工具/合并规则文件'
import { 读取历史记录, 添加历史记录, 删除历史记录, 清空历史记录 } from '../../工具/历史记录'
import { 确保目录存在 } from '../../工具/文件操作'
import { 读取上次路径, 保存上次路径 } from '../../工具/上次路径'

/**
 * 注册获取路径页面的所有 IPC 处理器
 * 在应用启动时由 IPC注册器 调用
 */
export function 注册获取路径处理器(): void {
  // ==================== 文件扫描 ====================

  // 扫描单个文件夹（仅一层）
  ipcMain.handle(IPC通道.扫描单个文件夹, async (_事件, 请求: 扫描单个文件夹请求): Promise<扫描单个文件夹响应> => {
    try {
      const { 文件列表, 子文件夹列表, 占位文件夹列表 } = 扫描单个文件夹(请求.路径)
      return {
        成功: true,
        当前文件夹路径: 请求.路径,
        文件列表,
        子文件夹列表,
        占位文件夹列表,
      }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 排除规则 ====================

  // 读取排除规则
  ipcMain.handle(IPC通道.读取排除规则, async (_事件, 项目路径: string): Promise<读取排除规则响应> => {
    try {
      const 规则 = 读取排除规则(项目路径)
      return { 成功: true, 规则 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存排除规则
  ipcMain.handle(IPC通道.保存排除规则, async (_事件, 请求: 保存排除规则请求): Promise<保存排除规则响应> => {
    try {
      保存排除规则(请求.项目路径, 请求.规则)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 删除排除规则
  ipcMain.handle(IPC通道.删除排除规则, async (_事件, 项目路径: string): Promise<保存排除规则响应> => {
    try {
      const { 列出规则文件, 删除规则文件: 删除单个规则文件 } = await import('./排除规则')
      const 文件列表 = 列出规则文件(项目路径)
      for (const 文件 of 文件列表) {
        删除单个规则文件(项目路径, 文件.文件名)
      }
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 输出文件 ====================

  // 保存输出文件（从全局规则配置读取格式，输出到工作空间）
  ipcMain.handle(IPC通道.保存输出文件, async (_事件, 请求: { 项目路径: string; 内容: string }): Promise<保存排除规则响应 & { 文件路径?: string }> => {
    try {
      const 全局配置 = 读取全局规则配置()
      const 格式 = 全局配置.扫描输出格式 || 'txt'
      const 输出目录 = 获取扫描输出路径()
      确保目录存在(输出目录)
      const 文件路径 = path.join(输出目录, `获取路径.${格式}`)
      fs.writeFileSync(文件路径, 请求.内容, 'utf-8')
      return { 成功: true, 文件路径 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 全局规则（配置） ====================

  // 读取全局规则配置
  ipcMain.handle(IPC通道.读取全局规则, async (): Promise<{ 成功: boolean; 规则?: 全局规则配置; 错误信息?: string }> => {
    try {
      const 规则 = 读取全局规则配置()
      return { 成功: true, 规则 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存全局规则配置
  ipcMain.handle(IPC通道.保存全局规则, async (_事件, 规则: 全局规则配置): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      保存全局规则配置(规则)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 全局规则 .mdignore ====================

  // 读取全局 .mdignore
  ipcMain.handle(IPC通道.读取全局Mdignore, async (): Promise<{ 成功: boolean; 规则?: 排除规则数据; 错误信息?: string }> => {
    try {
      const 规则 = 读取全局Mdignore()
      return { 成功: true, 规则 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存全局 .mdignore
  ipcMain.handle(IPC通道.保存全局Mdignore, async (_事件, 规则: 排除规则数据): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      保存全局Mdignore(规则)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 追加全局 .mdignore 一行规则
  ipcMain.handle(IPC通道.追加全局Mdignore, async (_事件, 规则行: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      追加全局Mdignore(规则行)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 删除全局 .mdignore 一行规则
  ipcMain.handle(IPC通道.删除全局Mdignore行, async (_事件, 规则行: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      删除全局Mdignore(规则行)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 历史记录 ====================

  // 读取历史记录
  ipcMain.handle(IPC通道.读取历史记录, async (): Promise<{ 成功: boolean; 记录列表?: string[]; 错误信息?: string }> => {
    try {
      const 记录列表 = 读取历史记录()
      return { 成功: true, 记录列表 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 添加历史记录
  ipcMain.handle(IPC通道.添加历史记录, async (_事件, 路径: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      添加历史记录(路径)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 删除单条历史记录
  ipcMain.handle(IPC通道.删除历史记录, async (_事件, 路径: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      删除历史记录(路径)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 清空历史记录
  ipcMain.handle(IPC通道.清空历史记录, async (): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      清空历史记录()
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 上次路径 ====================

  // 读取上次路径
  ipcMain.handle(IPC通道.读取上次路径, async (): Promise<{ 成功: boolean; 路径?: string; 错误信息?: string }> => {
    try {
      const 路径 = 读取上次路径()
      return { 成功: true, 路径 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存上次路径
  ipcMain.handle(IPC通道.保存上次路径, async (_事件, 路径: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      保存上次路径(路径)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 规则文件管理 ====================

  // 列出规则文件
  ipcMain.handle(IPC通道.列出规则文件, async (_事件, 项目路径: string): Promise<{ 成功: boolean; 文件列表?: { 文件名: string; 文件路径: string }[]; 错误信息?: string }> => {
    try {
      const 文件列表 = 列出规则文件(项目路径)
      return { 成功: true, 文件列表 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 创建规则文件
  ipcMain.handle(IPC通道.创建规则文件, async (_事件, 请求: 创建规则文件请求): Promise<{ 成功: boolean; 文件名?: string; 文件路径?: string; 错误信息?: string }> => {
    try {
      const 结果 = 创建规则文件(请求.项目路径, 请求.基础名称)
      return { 成功: true, 文件名: 结果.文件名, 文件路径: 结果.文件路径 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 删除规则文件
  ipcMain.handle(IPC通道.删除规则文件, async (_事件, 请求: 删除规则文件请求): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      const 结果 = 删除规则文件(请求.项目路径, 请求.文件名)
      return { 成功: 结果 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 重命名规则文件
  ipcMain.handle(IPC通道.重命名规则文件, async (_事件, 请求: 重命名规则文件请求): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      const 结果 = 重命名规则文件(请求.项目路径, 请求.旧文件名, 请求.新文件名)
      return { 成功: 结果 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 读取 .mdignore 文件
  ipcMain.handle(IPC通道.读取Mdignore, async (_事件, 请求: { 项目路径: string; 文件名: string }): Promise<{ 成功: boolean; 规则?: 排除规则数据; 错误信息?: string }> => {
    try {
      const 规则 = 读取Mdignore(请求.项目路径, 请求.文件名)
      if (规则) {
        return { 成功: true, 规则 }
      }
      return { 成功: true, 规则: { 精确文件夹排除列表: [], 递归文件夹排除列表: [], 精确文件排除列表: [], 递归文件排除列表: [], 豁免列表: [], 通配符列表: [], 占位文件夹列表: [] } }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存 .mdignore 文件
  ipcMain.handle(IPC通道.保存Mdignore, async (_事件, 请求: 保存Mdignore请求): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      保存Mdignore(请求.项目路径, 请求.文件名, 请求.规则)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 合并数据 ====================

  // 合并文件
  ipcMain.handle(IPC通道.合并文件, async (_事件, 请求: 合并文件请求): Promise<合并文件响应> => {
    try {
      return 合并文件列表(请求, 获取合并代码输出路径())
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 读取合并配置
  ipcMain.handle(IPC通道.读取合并配置, async (): Promise<合并配置> => {
    return 读取合并配置()
  })

  // 保存合并配置
  ipcMain.handle(IPC通道.保存合并配置, async (_事件, 配置: 合并配置): Promise<void> => {
    保存合并配置(配置)
  })

  // ==================== 合并规则文件管理 ====================

  // 列出合并规则文件
  ipcMain.handle(IPC通道.列出合并规则文件, async (_事件, 项目路径: string): Promise<{ 成功: boolean; 文件列表?: { 文件名: string; 文件路径: string }[]; 错误信息?: string }> => {
    try {
      const 文件列表 = 列出合并规则文件(项目路径)
      return { 成功: true, 文件列表 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 创建合并规则文件
  ipcMain.handle(IPC通道.创建合并规则文件, async (_事件, 请求: { 项目路径: string; 基础名称?: string }): Promise<{ 成功: boolean; 文件名?: string; 文件路径?: string; 错误信息?: string }> => {
    try {
      const 结果 = 创建合并规则文件(请求.项目路径, 请求.基础名称)
      return { 成功: true, 文件名: 结果.文件名, 文件路径: 结果.文件路径 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 读取合并规则文件
  ipcMain.handle(IPC通道.读取合并规则文件, async (_事件, 请求: { 项目路径: string; 文件名: string }): Promise<{ 成功: boolean; 路径列表?: string[]; 错误信息?: string }> => {
    try {
      const 路径列表 = 读取合并规则文件(请求.项目路径, 请求.文件名)
      return { 成功: true, 路径列表 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 保存合并规则文件
  ipcMain.handle(IPC通道.保存合并规则文件, async (_事件, 请求: { 项目路径: string; 文件名: string; 路径列表: string[] }): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      保存合并规则文件(请求.项目路径, 请求.文件名, 请求.路径列表)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 删除合并规则文件
  ipcMain.handle(IPC通道.删除合并规则文件, async (_事件, 请求: { 项目路径: string; 文件名: string }): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      const 结果 = 删除合并规则文件(请求.项目路径, 请求.文件名)
      return { 成功: 结果 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // 重命名合并规则文件
  ipcMain.handle(IPC通道.重命名合并规则文件, async (_事件, 请求: { 项目路径: string; 旧文件名: string; 新文件名: string }): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      const 结果 = 重命名合并规则文件(请求.项目路径, 请求.旧文件名, 请求.新文件名)
      return { 成功: 结果 }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 窗口管理 ====================

  // 创建独立窗口
  ipcMain.handle(IPC通道.创建独立窗口, async (_事件, 路由路径: string): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      console.log('[调试-后端] 创建独立窗口 收到路由路径:', JSON.stringify(路由路径), '类型:', typeof 路由路径)
      const isDev = process.env.VITE_DEV_SERVER_URL
      const 子窗口 = new BrowserWindow({
        width: 1000,
        height: 700,
        maximizable: true,
        resizable: true,
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      })

      子窗口.maximize()

      if (isDev) {
        子窗口.loadURL(process.env.VITE_DEV_SERVER_URL!)
      } else {
        子窗口.loadFile(path.join(__dirname, '../dist/index.html'))
      }

      子窗口.webContents.on('did-finish-load', () => {
        子窗口.webContents.executeJavaScript(`window.__router__?.push('${路由路径}')`)
      })

      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 规则存储路径 ====================

  // 获取规则存储路径（项目规则、全局规则、扫描输出）
  ipcMain.handle(IPC通道.获取规则存储路径, async (_事件, 项目路径?: string): Promise<规则存储路径响应> => {
    try {
      return {
        成功: true,
        项目规则路径: 项目路径 ? 获取项目规则路径(项目路径) : undefined,
        全局规则路径: 获取路径模块路径(),
        扫描输出路径: 获取扫描输出路径(),
        合并规则路径: 项目路径 ? 获取合并规则路径(项目路径) : undefined,
        合并代码输出路径: 获取合并代码输出路径(),
      }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })

  // ==================== 系统操作 ====================

  // 在资源管理器中打开文件夹
  ipcMain.handle(IPC通道.打开文件夹, async (_事件, 请求: { 路径: string; 项目路径?: string }): Promise<{ 成功: boolean; 错误信息?: string }> => {
    try {
      let 实际路径 = 请求.路径

      // 解析 {项目路径} 模板 → 用前端传入的项目路径替换
      if (实际路径.includes('{项目路径}') && 请求.项目路径) {
        实际路径 = 实际路径.replace('{项目路径}', 请求.项目路径)
      }

      await shell.openPath(实际路径)
      return { 成功: true }
    } catch (错误) {
      const 错误信息 = 错误 instanceof Error ? 错误.message : String(错误)
      return { 成功: false, 错误信息 }
    }
  })
}
