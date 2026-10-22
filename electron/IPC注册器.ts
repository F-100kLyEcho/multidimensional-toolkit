/**
 * IPC 注册器
 * 统一注册所有页面的 IPC 处理器
 * 在 main.ts 中调用一次即可注册所有处理器
 */
import { ipcMain, BrowserWindow } from 'electron'
import { 注册获取路径处理器 } from './页面处理/获取路径/处理器'
import { 注册启动处理器 } from './页面处理/启动/处理器'
import { 注册首页处理器 } from './页面处理/首页/处理器'

/**
 * 注册所有 IPC 处理器
 * 在应用 ready 后调用
 */
export function 注册所有IPC处理器(): void {
  注册获取路径处理器()
  注册启动处理器()
  注册首页处理器()

  注册窗口处理器()
}

/**
 * 窗口管理相关处理器
 * 运行时更新无边框窗口标题栏叠层（系统按钮符号色/背景色），
 * 供各页面根据自身主题动态调整右上角系统按钮颜色。
 */
function 注册窗口处理器(): void {
  ipcMain.handle('窗口-设置标题栏叠层', (event, 参数: { symbolColor?: string; color?: string } | undefined) => {
    const 目标窗口 = BrowserWindow.fromWebContents(event.sender)
    if (目标窗口) {
      目标窗口.setTitleBarOverlay({
        color: 参数?.color ?? '#00000000',
        symbolColor: 参数?.symbolColor ?? '#e0e0e0',
        height: 32,
      })
    }
    return { 成功: true }
  })
}
