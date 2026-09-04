/**
 * 文件扫描器
 * 负责扫描单个文件夹（仅一层），返回文件和子文件夹列表
 * 不再提供递归扫描，所有递归逻辑转移到前端控制
 *
 * 扫描时应用全局规则作为第一层过滤：
 * - 精确文件夹排除 → 匹配的文件夹不加入子文件夹列表，匹配的文件不加入文件列表
 * - 精确文件排除 → 匹配的文件不加入文件列表
 * - 通配符排除 → 匹配的文件不加入文件列表
 * - 占位文件夹排除 → 文件夹本身保留（占位），子文件夹不继续扫描，子文件不加入文件列表
 */
import fs from 'node:fs'
import path from 'node:path'
import { 读取全局Mdignore } from '../../工具/全局规则'
import type { 排除规则数据 } from '../../类型/index'

/**
 * 判断路径是否匹配全局规则中的精确文件夹排除
 */
function 匹配精确文件夹(路径: string, 规则值: string): boolean {
  const 文件夹名 = path.basename(路径)
  return 文件夹名 === 规则值
}

/**
 * 判断路径是否匹配全局规则中的精确文件排除
 */
function 匹配精确文件(文件名: string, 规则值: string): boolean {
  return 文件名 === 规则值
}

/**
 * 将 glob 模式转为正则表达式（简化版，仅用于通配符匹配）
 */
function glob模式转正则(模式: string): RegExp {
  let 正则字符串 = ''
  let 待处理 = 模式

  if (待处理.endsWith('/')) {
    待处理 = 待处理.slice(0, -1)
  }

  let i = 0
  while (i < 待处理.length) {
    const c = 待处理[i]!
    if (c === '*' && 待处理[i + 1] === '*') {
      正则字符串 += '.*'
      i += 2
      if (i < 待处理.length && 待处理[i] === '/') i++
    } else if (c === '*') {
      正则字符串 += '[^/]*'
      i++
    } else if (c === '?') {
      正则字符串 += '[^/]'
      i++
    } else if (c === '[') {
      const 闭括号 = 待处理.indexOf(']', i)
      if (闭括号 === -1) {
        正则字符串 += '\\' + c
        i++
      } else {
        const 片段 = 待处理.slice(i + 1, 闭括号)
        const 已转义 = 片段.replace(/[.*+?^${}()|\\]/g, '\\$&')
        正则字符串 += '[' + 已转义 + ']'
        i = 闭括号 + 1
      }
    } else if (/[.+^${}()|\\]/.test(c)) {
      正则字符串 += '\\' + c
      i++
    } else {
      正则字符串 += c
      i++
    }
  }

  let 完整正则: string
  if (模式.startsWith('**')) {
    完整正则 = 正则字符串
  } else if (模式.startsWith('*')) {
    完整正则 = 正则字符串 + '$'
  } else if (模式.includes('**')) {
    完整正则 = 正则字符串
  } else {
    完整正则 = '^' + 正则字符串 + '$'
  }

  return new RegExp(完整正则)
}

/**
 * 判断文件名是否匹配某条通配符规则
 */
function 匹配通配符(文件名: string, 规则: string): boolean {
  const regex = glob模式转正则(规则)
  return regex.test(文件名)
}

/**
 * 判断文件夹是否被全局规则中的占位文件夹匹配
 * 占位文件夹本身保留，仅排除其子内容
 */
function 匹配占位文件夹(文件夹名: string, 占位值: string): boolean {
  return 文件夹名 === 占位值
}

/**
 * 扫描单个文件夹（仅一层），应用全局规则过滤
 * @param 文件夹路径 要扫描的绝对路径
 * @returns 文件列表、子文件夹列表和占位文件夹列表（已过滤）
 */
export function 扫描单个文件夹(文件夹路径: string): {
  文件列表: { 名称: string; 扩展名: string; 完整路径: string }[]
  子文件夹列表: string[]
  占位文件夹列表: string[]
} {
  // 1. 读取全局规则
  const 全局规则 = 读取全局Mdignore()

  const 文件列表: { 名称: string; 扩展名: string; 完整路径: string }[] = []
  const 子文件夹列表: string[] = []
  const 占位文件夹列表: string[] = []

  try {
    const 条目列表 = fs.readdirSync(文件夹路径, { withFileTypes: true })

    for (const 条目 of 条目列表) {
      const 完整路径 = path.join(文件夹路径, 条目.name)
      const 标准化路径 = 完整路径.replace(/\\/g, '/')

      if (条目.isFile()) {
        // 应用全局规则过滤文件
        if (是否被全局排除文件(条目.name, 全局规则)) continue

        const 扩展名 = path.extname(条目.name)
        文件列表.push({
          名称: 条目.name,
          扩展名: 扩展名,
          完整路径: 标准化路径,
        })
      } else if (条目.isDirectory()) {
        // 检查是否为占位文件夹
        if (是否占位文件夹(条目.name, 全局规则)) {
          占位文件夹列表.push(标准化路径)
          continue
        }

        // 应用全局规则过滤文件夹
        if (是否被全局排除文件夹(条目.name, 全局规则)) continue

        子文件夹列表.push(标准化路径)
      }
      // 忽略符号链接，避免循环引用
    }
  } catch (错误) {
    // 无权限或文件夹不存在时，静默返回空列表
    console.error(`扫描文件夹失败: ${文件夹路径}`, 错误)
  }

  return { 文件列表, 子文件夹列表, 占位文件夹列表 }
}

/**
 * 判断文件是否被全局规则排除
 */
function 是否被全局排除文件(文件名: string, 全局规则: 排除规则数据): boolean {
  // 1. 检查精确文件排除
  for (const 文件值 of 全局规则.精确文件排除列表) {
    if (匹配精确文件(文件名, 文件值)) return true
  }

  // 2. 检查通配符排除
  for (const 通配符值 of 全局规则.通配符列表) {
    if (匹配通配符(文件名, 通配符值)) return true
  }

  return false
}

/**
 * 判断文件夹是否为占位文件夹
 * 占位文件夹本身保留（返回给前端显示为红色），但子内容不继续扫描
 */
function 是否占位文件夹(文件夹名: string, 全局规则: 排除规则数据): boolean {
  for (const 占位值 of 全局规则.占位文件夹列表) {
    if (匹配占位文件夹(文件夹名, 占位值)) return true
  }
  return false
}

/**
 * 判断文件夹是否被全局规则排除
 * 返回 true 表示该文件夹不应加入子文件夹列表
 */
function 是否被全局排除文件夹(文件夹名: string, 全局规则: 排除规则数据): boolean {
  // 1. 检查精确文件夹排除
  for (const 文件夹值 of 全局规则.精确文件夹排除列表) {
    if (匹配精确文件夹(文件夹名, 文件夹值)) return true
  }

  return false
}
