/**
 * 全局规则管理
 *
 * 全局规则作用于后端扫描阶段，作为所有项目的初次筛查过滤器。
 * 存储在 Electron 用户数据目录下的 全局规则.mdignore 文件中。
 *
 * 格式：纯文本 UTF-8 编码，每行一条规则，支持注释 #。
 * 语法与项目规则完全一致（参考 排除规则.ts 中的解析逻辑）。
 */
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { 获取路径模块路径 } from './模块路径'
import { 确保目录存在 } from './文件操作'
import type { 排除规则数据 } from '../类型/index'
import { Mdignore转规则数据, 规则数据转Mdignore } from '../页面处理/获取路径/排除规则'

/** 全局规则文件名 */
const 全局规则文件名 = '全局规则.mdignore'

/** 全局规则配置文件名 */
const 全局规则配置文件名 = '全局规则-配置.json'

/**
 * 获取全局规则文件的绝对路径
 */
function 获取全局规则文件路径(): string {
  return path.join(获取路径模块路径(), 全局规则文件名)
}

/**
 * 初始化全局规则文件
 * 如果 userData/多维工具/获取路径/全局规则.mdignore 不存在，则自动创建空文件
 * 在应用启动时调用
 */
export function 初始化全局规则文件(): void {
  const 文件路径 = 获取全局规则文件路径()
  if (!fs.existsSync(文件路径)) {
    确保目录存在(path.dirname(文件路径))
    fs.writeFileSync(文件路径, '', 'utf-8')
  }
}

/**
 * 读取全局规则（.mdignore 文件）
 * 如果文件不存在则返回空规则
 */
export function 读取全局Mdignore(): 排除规则数据 {
  const 文件路径 = 获取全局规则文件路径()
  try {
    if (!fs.existsSync(文件路径)) {
      return {
        精确文件夹排除列表: [],
        递归文件夹排除列表: [],
        精确文件排除列表: [],
        递归文件排除列表: [],
        豁免列表: [],
        通配符列表: [],
        占位文件夹列表: [],
      }
    }
    const 内容 = fs.readFileSync(文件路径, 'utf-8')
    return Mdignore转规则数据(内容)
  } catch (错误) {
    console.error(`读取全局 .mdignore 失败: ${文件路径}`, 错误)
    return {
      精确文件夹排除列表: [],
      递归文件夹排除列表: [],
      精确文件排除列表: [],
      递归文件排除列表: [],
      豁免列表: [],
      通配符列表: [],
      占位文件夹列表: [],
    }
  }
}

/**
 * 保存全局规则（.mdignore 文件）
 */
export function 保存全局Mdignore(规则: 排除规则数据): void {
  const 文件路径 = 获取全局规则文件路径()
  确保目录存在(path.dirname(文件路径))
  const 内容 = 规则数据转Mdignore(规则)
  fs.writeFileSync(文件路径, 内容, 'utf-8')
}

/**
 * 向全局 .mdignore 追加一条规则
 * @param 规则行 要追加的规则文本（如 ".git/"、"*.log"）
 */
export function 追加全局Mdignore(规则行: string): void {
  const 文件路径 = 获取全局规则文件路径()
  确保目录存在(path.dirname(文件路径))

  // 读取现有内容，追加新行
  let 内容 = ''
  if (fs.existsSync(文件路径)) {
    内容 = fs.readFileSync(文件路径, 'utf-8')
  }

  // 确保末尾有换行
  if (内容.length > 0 && !内容.endsWith('\n')) {
    内容 += '\n'
  }

  内容 += 规则行 + '\n'
  fs.writeFileSync(文件路径, 内容, 'utf-8')
}

/**
 * 从全局 .mdignore 中删除一条规则
 * @param 规则行 要删除的规则文本（精确匹配行内容）
 */
export function 删除全局Mdignore(规则行: string): void {
  const 文件路径 = 获取全局规则文件路径()
  if (!fs.existsSync(文件路径)) return

  const 内容 = fs.readFileSync(文件路径, 'utf-8')
  const 行列表 = 内容.split('\n')

  // 过滤掉匹配的行（精确匹配，去除首尾空白后比较）
  const 新行列表 = 行列表.filter((行) => {
    return 行.trim() !== 规则行.trim()
  })

  const 新内容 = 新行列表.join('\n')
  fs.writeFileSync(文件路径, 新内容, 'utf-8')
}

// ==================== 全局规则配置 ====================

/** 全局规则配置 */
export interface 全局规则配置 {
  默认排除模式: 'none' | 'node_modules' | 'git' | 'custom'
  最大扫描深度: number
  扫描忽略列表: string[]
  /** 扫描输出文件格式，默认 txt */
  扫描输出格式: 'txt' | 'md'
}

/** 默认全局规则 */
const 默认规则: 全局规则配置 = {
  默认排除模式: 'none',
  最大扫描深度: 0,
  扫描忽略列表: [],
  扫描输出格式: 'txt',
}

/** 获取全局规则配置文件路径 */
function 获取规则配置文件路径(): string {
  return path.join(获取路径模块路径(), 全局规则配置文件名)
}

/**
 * 读取全局规则配置
 * 如果文件不存在则返回默认规则
 */
export function 读取全局规则配置(): 全局规则配置 {
  const 文件路径 = 获取规则配置文件路径()
  try {
    if (!fs.existsSync(文件路径)) return { ...默认规则 }
    const 内容 = fs.readFileSync(文件路径, 'utf-8')
    return JSON.parse(内容) as 全局规则配置
  } catch (错误) {
    console.error(`读取全局规则配置失败: ${文件路径}`, 错误)
    return { ...默认规则 }
  }
}

/**
 * 保存全局规则配置
 */
export function 保存全局规则配置(规则: 全局规则配置): void {
  const 文件路径 = 获取规则配置文件路径()
  确保目录存在(path.dirname(文件路径))
  fs.writeFileSync(文件路径, JSON.stringify(规则, null, 2), 'utf-8')
}

/**
 * 恢复全局规则为默认值
 */
export function 恢复默认全局规则(): 全局规则配置 {
  保存全局规则配置(默认规则)
  return { ...默认规则 }
}
