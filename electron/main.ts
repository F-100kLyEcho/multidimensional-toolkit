import { app, BrowserWindow, Menu, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { 注册所有IPC处理器 } from './IPC注册器'
import { 初始化全局规则文件 } from './工具/全局规则'
import { 启动自动清理缓存 } from './页面处理/启动/图片管理'
import { 初始化默认工作空间, 获取当前工作空间路径, 恢复开机自启 } from './工具/路径配置'

// ESM 中替代 __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 环境变量：dev 模式使用 Vite 开发服务器，production 模式加载打包文件
const isDev = process.env.VITE_DEV_SERVER_URL

/** 存储所有已打开的独立窗口，防止被 GC 回收 */
const 独立窗口列表: BrowserWindow[] = []

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    maximizable: true,
    resizable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 启动时默认最大化
  mainWindow.maximize()
  mainWindow.show()

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL!)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // F12 快捷键切换 DevTools
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
}

ipcMain.on('toggle-devtools', (_event) => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) win.webContents.toggleDevTools()
})

/**
 * 创建独立窗口（首页右键菜单调用）
 * @param 路由路径 如 '/H1'（获取路径）、'/Q1'（启动）
 */
function 创建独立窗口(路由路径: string) {
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
    子窗口.webContents.openDevTools()
  } else {
    子窗口.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  子窗口.webContents.on('did-finish-load', () => {
    子窗口.webContents.executeJavaScript(`window.__router__?.push('${路由路径}')`)
  })

  子窗口.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F12') {
      子窗口.webContents.toggleDevTools()
    }
  })

  // 关闭时从列表中移除
  子窗口.on('closed', () => {
    const 索引 = 独立窗口列表.indexOf(子窗口)
    if (索引 !== -1) 独立窗口列表.splice(索引, 1)
  })

  独立窗口列表.push(子窗口)
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)

  // 初始化工作空间配置，设置 userData 为当前工作空间路径
  初始化默认工作空间()
  const 工作空间路径 = 获取当前工作空间路径()
  app.setPath('userData', 工作空间路径)

  注册所有IPC处理器()
  初始化全局规则文件()
  启动自动清理缓存() // 启动时清空图标缓存
  恢复开机自启() // 启动时恢复开机自启注册
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  启动自动清理缓存() // 退出时清空图标缓存，与启动清理对称（防 Alt+F4 等残留）
})
