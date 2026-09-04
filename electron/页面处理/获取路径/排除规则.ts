/**
 * 排除规则持久化模块
 * 负责将排除规则保存到工作空间下的 获取路径/项目规则/{项目标识}/ 中
 * 以及从该位置读取规则
 *
 * 规则文件格式：.mdignore 纯文本（UTF-8 编码），类似 .gitignore 语法
 * 每行一条规则，支持 # 注释
 *
 * 规则类型前缀：
 *   - 以 / 结尾 → 精确文件夹排除（如 node_modules/）
 *   - 以 ! 开头 → 豁免（如 !src/important.ts）
 *   - 以 @ 开头 → 占位文件夹（如 @src/old_components）
 *   - 含 *、? → 通配符排除（如 *.log）
 *   - 其他 → 精确文件排除（如 src/secret.ts）
 *   - 以 # 开头 → 注释
 */
import path from 'node:path'
import fs from 'node:fs'
import { 确保目录存在 } from '../../工具/文件操作'
import { 获取项目规则路径 } from '../../工具/模块路径'
import type { 排除规则数据, 规则文件信息 } from '../../类型/index'

/**
 * 获取规则目录的绝对路径（工作空间下按项目标识分目录）
 */
function 获取规则目录(项目路径: string): string {
  return 获取项目规则路径(项目路径)
}

/**
 * 获取规则文件的绝对路径
 */
function 获取规则文件路径(项目路径: string, 文件名: string): string {
  return path.join(获取规则目录(项目路径), 文件名)
}

// ==================== .mdignore 解析/生成 ====================

/**
 * 将单条规则转换为 .mdignore 格式的文本行
 */
function 规则到文本行(类别: 排除规则数据[keyof 排除规则数据][number], 类别名: keyof 排除规则数据): string {
  switch (类别名) {
    case '精确文件夹排除列表':
      return `${类别}/`
    case '递归文件夹排除列表':
      return `**${类别}/`
    case '精确文件排除列表':
      return 类别
    case '递归文件排除列表':
      return `**${类别}`
    case '豁免列表':
      return `!${类别}`
    case '通配符列表':
      return 类别
    case '占位文件夹列表':
      return `@${类别}`
    default:
      return 类别
  }
}

/**
 * 将排除规则数据序列化为 .mdignore 格式文本
 */
export function 规则数据转Mdignore(规则: 排除规则数据): string {
  const 行列表: string[] = []

  // 按固定顺序输出：精确文件夹 → 精确文件 → 占位文件夹 → 豁免 → 通配符
  const 输出顺序: [keyof 排除规则数据, string][] = [
    ['精确文件夹排除列表', '# ==================== 精确文件夹排除 ===================='],
    ['递归文件夹排除列表', '# ==================== 递归文件夹排除 ===================='],
    ['精确文件排除列表', '# ==================== 精确文件排除 ===================='],
    ['递归文件排除列表', '# ==================== 递归文件排除 ===================='],
    ['占位文件夹列表', '# ==================== 占位文件夹 ===================='],
    ['豁免列表', '# ==================== 豁免 ===================='],
    ['通配符列表', '# ==================== 通配符排除 ===================='],
  ]

  for (const [键, 注释] of 输出顺序) {
    const 列表 = 规则[键]
    if (列表.length > 0) {
      行列表.push('')
      行列表.push(注释)
      for (const 值 of 列表) {
        行列表.push(规则到文本行(值, 键))
      }
    }
  }

  // 去掉开头的空行
  while (行列表.length > 0 && 行列表[0] === '') {
    行列表.shift()
  }

  return 行列表.join('\n') + '\n'
}

/**
 * 解析 .mdignore 格式文本为排除规则数据
 */
export function Mdignore转规则数据(内容: string): 排除规则数据 {
  const 规则: 排除规则数据 = {
    精确文件夹排除列表: [],
    递归文件夹排除列表: [],
    精确文件排除列表: [],
    递归文件排除列表: [],
    豁免列表: [],
    通配符列表: [],
    占位文件夹列表: [],
  }

  const 行列表 = 内容.split('\n')

  for (let 行 of 行列表) {
    行 = 行.trim()

    if (!行 || 行.startsWith('#')) continue

    if (行.startsWith('@')) {
      const 值 = 行.slice(1).trim()
      if (值 && !值.includes('*') && !值.includes('?')) {
        const 标准化 = 值.endsWith('/') ? 值.slice(0, -1) : 值
        if (!规则.占位文件夹列表.includes(标准化)) {
          规则.占位文件夹列表.push(标准化)
        }
      }
    } else if (行.startsWith('!')) {
      const 值 = 行.slice(1).trim()
      if (值 && !规则.豁免列表.includes(值)) {
        规则.豁免列表.push(值)
      }
    } else if (行.startsWith('**') && 行.endsWith('/')) {
      const 去前缀 = 行.slice(2)
      const 值 = 去前缀.endsWith('/') ? 去前缀.slice(0, -1).trim() : 去前缀.trim()
      if (值 && !规则.递归文件夹排除列表.includes(值)) {
        规则.递归文件夹排除列表.push(值)
      }
    } else if (行.startsWith('**') && !行.endsWith('/')) {
      const 值 = 行.slice(2).trim()
      if (值 && !规则.递归文件排除列表.includes(值)) {
        规则.递归文件排除列表.push(值)
      }
    } else if (行.endsWith('/')) {
      const 值 = 行.slice(0, -1).trim()
      if (值 && !规则.精确文件夹排除列表.includes(值)) {
        规则.精确文件夹排除列表.push(值)
      }
    } else if (行.includes('*') || 行.includes('?')) {
      if (!规则.通配符列表.includes(行)) {
        规则.通配符列表.push(行)
      }
    } else {
      if (!规则.精确文件排除列表.includes(行)) {
        规则.精确文件排除列表.push(行)
      }
    }
  }

  return 规则
}

// ==================== 规则文件管理 ====================

/**
 * 列出规则目录下所有 .mdignore 文件
 */
export function 列出规则文件(项目路径: string): 规则文件信息[] {
  const 规则目录 = 获取规则目录(项目路径)
  if (!fs.existsSync(规则目录)) {
    return []
  }

  const 条目列表 = fs.readdirSync(规则目录, { withFileTypes: true })
  const 文件列表: 规则文件信息[] = []

  for (const 条目 of 条目列表) {
    if (条目.isFile() && 条目.name.endsWith('.mdignore')) {
      文件列表.push({
        文件名: 条目.name,
        文件路径: path.join(规则目录, 条目.name),
      })
    }
  }

  // 按文件名排序
  文件列表.sort((a, b) => a.文件名.localeCompare(b.文件名))

  return 文件列表
}

/**
 * 创建新的规则文件（自动处理重名冲突）
 * @param 项目路径 项目根目录
 * @param 基础名称 基础文件名（不含后缀），默认 "排除规则"
 * @returns 创建成功的文件名和路径
 */
export function 创建规则文件(项目路径: string, 基础名称: string = '排除规则'): { 文件名: string; 文件路径: string } {
  const 规则目录 = 获取规则目录(项目路径)
  确保目录存在(规则目录)

  // 生成不重复的文件名
  let 文件名 = `${基础名称}.mdignore`
  let 文件路径 = path.join(规则目录, 文件名)
  let 序号 = 0

  while (fs.existsSync(文件路径)) {
    序号++
    文件名 = `${基础名称}-${序号}.mdignore`
    文件路径 = path.join(规则目录, 文件名)
  }

  // 创建空规则文件（写入空内容）
  fs.writeFileSync(文件路径, '', 'utf-8')

  return { 文件名, 文件路径 }
}

/**
 * 删除规则文件
 */
export function 删除规则文件(项目路径: string, 文件名: string): boolean {
  const 文件路径 = 获取规则文件路径(项目路径, 文件名)
  if (fs.existsSync(文件路径)) {
    fs.unlinkSync(文件路径)
    return true
  }
  return false
}

/**
 * 重命名规则文件
 */
export function 重命名规则文件(项目路径: string, 旧文件名: string, 新文件名: string): boolean {
  const 旧路径 = 获取规则文件路径(项目路径, 旧文件名)
  const 新路径 = 获取规则文件路径(项目路径, 新文件名)

  if (!fs.existsSync(旧路径)) return false
  if (fs.existsSync(新路径)) return false

  fs.renameSync(旧路径, 新路径)
  return true
}

// ==================== 规则读写 ====================

/**
 * 从指定 .mdignore 文件读取并解析规则
 */
export function 读取Mdignore(项目路径: string, 文件名: string): 排除规则数据 | null {
  const 文件路径 = 获取规则文件路径(项目路径, 文件名)

  try {
    if (!fs.existsSync(文件路径)) return null
    const 内容 = fs.readFileSync(文件路径, 'utf-8')
    return Mdignore转规则数据(内容)
  } catch (错误) {
    console.error(`读取 .mdignore 文件失败: ${文件路径}`, 错误)
    return null
  }
}

/**
 * 将规则数据保存到指定 .mdignore 文件
 */
export function 保存Mdignore(项目路径: string, 文件名: string, 规则: 排除规则数据): void {
  const 规则目录 = 获取规则目录(项目路径)
  确保目录存在(规则目录)

  const 文件路径 = path.join(规则目录, 文件名)
  const 内容 = 规则数据转Mdignore(规则)
  fs.writeFileSync(文件路径, 内容, 'utf-8')
}

// ==================== 便捷接口 ====================

/**
 * 从项目规则目录读取排除规则
 * 读取第一个 .mdignore 文件，如果不存在则返回空规则
 */
export function 读取排除规则(项目路径: string): 排除规则数据 {
  const 文件列表 = 列出规则文件(项目路径)
  if (文件列表.length > 0) {
    const 规则 = 读取Mdignore(项目路径, 文件列表[0]!.文件名)
    if (规则) return 规则
  }

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

/**
 * 保存排除规则到项目规则目录
 * 保存到第一个 .mdignore 文件，如果不存在则创建
 */
export function 保存排除规则(项目路径: string, 规则: 排除规则数据): void {
  const 文件列表 = 列出规则文件(项目路径)
  let 文件名: string

  if (文件列表.length > 0) {
    文件名 = 文件列表[0]!.文件名
  } else {
    const 结果 = 创建规则文件(项目路径)
    文件名 = 结果.文件名
  }

  保存Mdignore(项目路径, 文件名, 规则)
}
