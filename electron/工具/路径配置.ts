/**
 * 工作空间路径配置管理
 *
 * 配置文件 "多维工具箱路径配置.json" 存放在 appData 目录中，
 * 独立于任何工作空间，确保切换工作空间不会丢失配置。
 *
 * 数据结构：
 * {
 *   "版本": "1.0",
 *   "当前工作空间名称": "我的工作空间",
 *   "工作空间列表": [
 *     { "名称": "我的工作空间", "路径": "C:\\Users\\...\\AppData\\Roaming\\多维工具箱" }
 *   ],
 *   "开机自启": false,
 *   "默认启动页": "/"
 * }
 */
import { app, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

// ==================== 类型定义 ====================

/** 单个工作空间条目 */
export interface 工作空间条目 {
  名称: string
  路径: string
}

/** 路径配置文件整体结构 */
export interface 路径配置数据 {
  版本: string
  当前工作空间名称: string
  工作空间列表: 工作空间条目[]
  开机自启: boolean
  默认启动页: string
  全局壁纸路径: string
}

/** 操作响应 */
export interface 操作响应 {
  成功: boolean
  错误信息?: string
  /** 复制工作空间时被跳过的文件列表 */
  跳过文件列表?: string[]
}

/** 工作空间列表响应 */
export interface 工作空间列表响应 extends 操作响应 {
  工作空间列表?: 工作空间条目[]
  当前工作空间名称?: string
}

// ==================== 常量 ====================

/** 配置文件名 */
const 配置文件名 = '多维工具箱路径配置.json'

/** 默认工作空间名称 */
const 默认工作空间名称 = '我的工作空间'

/** 默认配置数据 */
const 默认配置: 路径配置数据 = {
  版本: '1.0',
  当前工作空间名称: 默认工作空间名称,
  工作空间列表: [],
  开机自启: false,
  默认启动页: '/',
  全局壁纸路径: '',
}

// ==================== 内部工具函数 ====================

/** 获取配置文件完整路径 */
function 获取配置文件路径(): string {
  return path.join(app.getPath('appData'), 配置文件名)
}

/** 获取默认工作空间目录路径 */
function 获取默认工作空间路径(): string {
  return path.join(app.getPath('appData'), '多维工具箱')
}

// ==================== 核心读写 ====================

/**
 * 读取完整配置对象
 * 若文件不存在则返回默认配置
 */
export function 读取配置(): 路径配置数据 {
  const 配置路径 = 获取配置文件路径()
  try {
    if (!fs.existsSync(配置路径)) {
      return { ...默认配置 }
    }
    const 原始数据 = fs.readFileSync(配置路径, 'utf-8')
    const 解析结果 = JSON.parse(原始数据) as 路径配置数据
    return {
      版本: 解析结果.版本 || '1.0',
      当前工作空间名称: 解析结果.当前工作空间名称 || '',
      工作空间列表: Array.isArray(解析结果.工作空间列表) ? 解析结果.工作空间列表 : [],
      开机自启: typeof 解析结果.开机自启 === 'boolean' ? 解析结果.开机自启 : false,
      默认启动页: 解析结果.默认启动页 || '/',
      全局壁纸路径: 解析结果.全局壁纸路径 || '',
    }
  } catch {
    return { ...默认配置 }
  }
}

/**
 * 保存配置对象到文件
 * 自动创建父目录（如不存在）
 */
export function 保存配置(配置: 路径配置数据): void {
  const 配置路径 = 获取配置文件路径()
  const 目录 = path.dirname(配置路径)
  if (!fs.existsSync(目录)) {
    fs.mkdirSync(目录, { recursive: true })
  }
  fs.writeFileSync(配置路径, JSON.stringify(配置, null, 2), 'utf-8')
}

// ==================== 工作空间操作 ====================

/**
 * 初始化默认工作空间
 * 仅在工作空间列表为空时创建
 */
export function 初始化默认工作空间(): 工作空间条目 {
  const 配置 = 读取配置()
  if (配置.工作空间列表.length > 0) {
    // 已有工作空间，返回当前激活的
    const 当前 = 配置.工作空间列表.find((w) => w.名称 === 配置.当前工作空间名称)
    if (当前) return 当前
    // 当前激活的不存在，切换到第一个
    配置.当前工作空间名称 = 配置.工作空间列表[0].名称
    保存配置(配置)
    return 配置.工作空间列表[0]
  }

  const 默认路径 = 获取默认工作空间路径()
  // 创建默认工作空间目录
  if (!fs.existsSync(默认路径)) {
    fs.mkdirSync(默认路径, { recursive: true })
  }

  const 新工作空间: 工作空间条目 = {
    名称: 默认工作空间名称,
    路径: 默认路径,
  }

  配置.工作空间列表 = [新工作空间]
  配置.当前工作空间名称 = 默认工作空间名称
  保存配置(配置)

  return 新工作空间
}

/**
 * 新建工作空间
 * @returns 操作响应（含新工作空间条目）
 */
export function 新建工作空间(名称: string, 路径: string): 操作响应 & { 工作空间?: 工作空间条目 } {
  const 配置 = 读取配置()

  // 校验名称唯一性
  if (配置.工作空间列表.some((w) => w.名称 === 名称)) {
    return { 成功: false, 错误信息: '工作空间名称已存在' }
  }

  // 校验路径唯一性
  if (配置.工作空间列表.some((w) => w.路径 === 路径)) {
    return { 成功: false, 错误信息: '该路径已被其他工作空间使用' }
  }

  // 创建目录（如不存在）
  try {
    if (!fs.existsSync(路径)) {
      fs.mkdirSync(路径, { recursive: true })
    }
  } catch (e) {
    return { 成功: false, 错误信息: `创建目录失败：${String(e)}` }
  }

  const 新工作空间: 工作空间条目 = { 名称, 路径 }
  配置.工作空间列表.push(新工作空间)
  保存配置(配置)

  return { 成功: true, 工作空间: 新工作空间 }
}

/**
 * 递归复制目录，跳过无法读取的文件（如被 Electron 占用的运行时文件）
 */
function 递归复制目录(源: string, 目标: string, 跳过列表: string[]): void {
  // 确保目标目录存在
  if (!fs.existsSync(目标)) {
    fs.mkdirSync(目标, { recursive: true })
  }

  const 条目列表 = fs.readdirSync(源, { withFileTypes: true })
  for (const 条目 of 条目列表) {
    const 源路径 = path.join(源, 条目.name)
    const 目标路径 = path.join(目标, 条目.name)

    try {
      if (条目.isDirectory()) {
        递归复制目录(源路径, 目标路径, 跳过列表)
      } else if (条目.isSymbolicLink()) {
        // 跳过符号链接
        跳过列表.push(源路径)
      } else {
        fs.copyFileSync(源路径, 目标路径)
      }
    } catch {
      // 文件被占用或无法读取，跳过继续
      跳过列表.push(源路径)
    }
  }
}

/**
 * 复制工作空间（物理递归复制目录）
 * @returns 操作响应（含新工作空间条目）
 */
export function 复制工作空间(源名称: string, 新名称: string, 新路径: string): 操作响应 & { 工作空间?: 工作空间条目 } {
  const 配置 = 读取配置()

  // 校验源工作空间存在
  const 源工作空间 = 配置.工作空间列表.find((w) => w.名称 === 源名称)
  if (!源工作空间) {
    return { 成功: false, 错误信息: '源工作空间不存在' }
  }

  // 校验源路径存在
  if (!fs.existsSync(源工作空间.路径)) {
    return { 成功: false, 错误信息: '源工作空间目录不存在，无法复制' }
  }

  // 校验新名称唯一性
  if (配置.工作空间列表.some((w) => w.名称 === 新名称)) {
    return { 成功: false, 错误信息: '新工作空间名称已存在' }
  }

  // 校验新路径唯一性
  if (配置.工作空间列表.some((w) => w.路径 === 新路径)) {
    return { 成功: false, 错误信息: '新路径已被其他工作空间使用' }
  }

  // 校验新路径：若目录已存在且非空，拒绝覆盖
  if (fs.existsSync(新路径)) {
    const 条目 = fs.readdirSync(新路径)
    if (条目.length > 0) {
      return { 成功: false, 错误信息: '目标路径已存在且非空，请选择空目录或不存在的路径' }
    }
  }

  // 递归复制（跳过被占用的文件，继续复制其余内容）
  const 跳过列表: string[] = []
  try {
    递归复制目录(源工作空间.路径, 新路径, 跳过列表)
  } catch (e) {
    return { 成功: false, 错误信息: `复制目录失败：${String(e)}` }
  }

  const 新工作空间: 工作空间条目 = { 名称: 新名称, 路径: 新路径 }
  配置.工作空间列表.push(新工作空间)
  保存配置(配置)

  return { 成功: true, 工作空间: 新工作空间, 跳过文件列表: 跳过列表 }
}

/**
 * 重命名工作空间
 * @returns 操作响应
 */
export function 重命名工作空间(旧名称: string, 新名称: string): 操作响应 {
  const 配置 = 读取配置()

  // 校验源工作空间存在
  const 目标 = 配置.工作空间列表.find((w) => w.名称 === 旧名称)
  if (!目标) {
    return { 成功: false, 错误信息: '工作空间不存在' }
  }

  // 校验新名称唯一性（不能和其他工作空间重名）
  if (配置.工作空间列表.some((w) => w.名称 === 新名称 && w.名称 !== 旧名称)) {
    return { 成功: false, 错误信息: '新名称已被其他工作空间使用' }
  }

  // 更新名称
  目标.名称 = 新名称

  // 如果重命名的是当前激活的工作空间，同步更新
  if (配置.当前工作空间名称 === 旧名称) {
    配置.当前工作空间名称 = 新名称
  }

  保存配置(配置)
  return { 成功: true }
}

/**
 * 删除工作空间
 * 至少保留一个工作空间
 * 同时物理删除整个目录
 */
export function 删除工作空间(名称: string): 操作响应 {
  const 配置 = 读取配置()

  // 至少保留一个
  if (配置.工作空间列表.length <= 1) {
    return { 成功: false, 错误信息: '至少保留一个工作空间' }
  }

  const 索引 = 配置.工作空间列表.findIndex((w) => w.名称 === 名称)
  if (索引 === -1) {
    return { 成功: false, 错误信息: '工作空间不存在' }
  }

  const 目标 = 配置.工作空间列表[索引]

  // 物理删除目录
  try {
    if (fs.existsSync(目标.路径)) {
      fs.rmSync(目标.路径, { recursive: true, force: true })
    }
  } catch (e) {
    return { 成功: false, 错误信息: `删除目录失败：${String(e)}` }
  }

  // 从列表中移除
  配置.工作空间列表.splice(索引, 1)

  // 如果删除的是当前激活的工作空间，切换到第一个
  if (配置.当前工作空间名称 === 名称) {
    配置.当前工作空间名称 = 配置.工作空间列表[0].名称
  }

  保存配置(配置)
  return { 成功: true }
}

/**
 * 切换工作空间
 * 保存配置后调用 app.relaunch() 重启
 */
export function 切换工作空间(名称: string): 操作响应 {
  const 配置 = 读取配置()

  const 目标 = 配置.工作空间列表.find((w) => w.名称 === 名称)
  if (!目标) {
    return { 成功: false, 错误信息: '工作空间不存在' }
  }

  配置.当前工作空间名称 = 名称
  保存配置(配置)

  // 重启应用
  app.relaunch()
  app.exit(0)

  // 这行代码实际上不会执行到，但为了类型完整性保留
  return { 成功: true }
}

/**
 * 使用系统文件管理器打开文件夹
 */
export function 打开文件夹(路径: string): 操作响应 {
  try {
    shell.openPath(路径)
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

export function 打开文件所在目录(文件路径: string): 操作响应 {
  try {
    shell.showItemInFolder(文件路径)
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

/**
 * 获取当前有效的工作空间路径
 * 校验路径是否存在，不存在则自动降级到第一个可用工作空间
 */
export function 获取当前工作空间路径(): string {
  const 配置 = 读取配置()
  const 当前 = 配置.工作空间列表.find((w) => w.名称 === 配置.当前工作空间名称)

  if (当前 && fs.existsSync(当前.路径)) {
    return 当前.路径
  }

  // 当前路径不可用，找第一个可用的
  for (const w of 配置.工作空间列表) {
    if (fs.existsSync(w.路径)) {
      配置.当前工作空间名称 = w.名称
      保存配置(配置)
      return w.路径
    }
  }

  // 全部不可用，重新初始化
  const 默认 = 初始化默认工作空间()
  return 默认.路径
}

/**
 * 获取工作空间配置文件的完整路径（用于"打开"按钮跳转）
 */
export function 获取配置文件完整路径(): string {
  return 获取配置文件路径()
}

/**
 * 获取工作空间列表
 */
export function 获取工作空间列表(): 工作空间列表响应 {
  const 配置 = 读取配置()
  return {
    成功: true,
    工作空间列表: 配置.工作空间列表,
    当前工作空间名称: 配置.当前工作空间名称,
  }
}

/**
 * 设置开机自启
 */
export function 设置开机自启(开启: boolean): 操作响应 {
  const 配置 = 读取配置()
  配置.开机自启 = 开启
  保存配置(配置)

  if (process.env.VITE_DEV_SERVER_URL) {
    return { 成功: false, 错误信息: '开发模式下不支持设置开机自启' }
  }

  try {
    app.setLoginItemSettings({
      openAtLogin: 开启,
    })
    return { 成功: true }
  } catch (e) {
    return { 成功: false, 错误信息: String(e) }
  }
}

/**
 * 读取开机自启状态
 * 同时读取配置文件和系统实际状态，以系统实际状态为准
 */
export function 读取开机自启状态(): boolean {
  try {
    const 系统状态 = app.getLoginItemSettings()
    return 系统状态.openAtLogin
  } catch {
    const 配置 = 读取配置()
    return 配置.开机自启
  }
}

/**
 * 应用启动时恢复开机自启注册
 * 当配置文件中开机自启为 true 但系统注册丢失时，重新注册
 */
export function 恢复开机自启(): void {
  if (process.env.VITE_DEV_SERVER_URL) return
  const 配置 = 读取配置()
  if (配置.开机自启) {
    try {
      app.setLoginItemSettings({ openAtLogin: true })
    } catch {
      // 静默失败，不影响应用启动
    }
  }
}

/**
 * 设置默认启动页
 */
export function 设置默认启动页(路由: string): 操作响应 {
  const 配置 = 读取配置()
  配置.默认启动页 = 路由
  保存配置(配置)
  return { 成功: true }
}

/**
 * 读取默认启动页
 */
export function 读取默认启动页(): string {
  const 配置 = 读取配置()
  return 配置.默认启动页
}
