/**
 * 合并规则文件管理
 * 管理 .mergelist 文件的 CRUD 操作
 * 存储位置：工作空间/获取路径/合并规则/{项目标识}/*.mergelist
 */
import path from 'node:path'
import fs from 'node:fs'
import { 确保目录存在 } from './文件操作'
import { 获取合并规则路径 } from './模块路径'

/** 合并规则文件后缀 */
const 规则文件后缀 = '.mergelist'

/** 默认基础名称 */
const 默认基础名称 = '合并规则'

/** 获取合并规则目录 */
function 获取规则目录(项目路径: string): string {
  return 获取合并规则路径(项目路径)
}

/** 规则文件信息 */
export interface 规则文件信息 {
  文件名: string
  文件路径: string
}

/**
 * 列出所有合并规则文件
 */
export function 列出合并规则文件(项目路径: string): 规则文件信息[] {
  const 目录 = 获取规则目录(项目路径)
  if (!fs.existsSync(目录)) return []

  const 文件列表: 规则文件信息[] = []
  try {
    const 条目列表 = fs.readdirSync(目录, { withFileTypes: true })
    for (const 条目 of 条目列表) {
      if (条目.isFile() && 条目.name.endsWith(规则文件后缀)) {
        文件列表.push({
          文件名: 条目.name,
          文件路径: path.join(目录, 条目.name),
        })
      }
    }
  } catch {
    // 忽略读取错误
  }

  // 按文件名排序
  文件列表.sort((a, b) => a.文件名.localeCompare(b.文件名))
  return 文件列表
}

/**
 * 创建新的合并规则文件
 * 自动处理重名：如果基础名称已存在，附加递增数字
 * @param 项目路径 项目根目录
 * @param 基础名称 可选，默认为"合并规则"
 * @returns 创建的文件信息
 */
export function 创建合并规则文件(项目路径: string, 基础名称?: string): 规则文件信息 {
  const 目录 = 获取规则目录(项目路径)
  确保目录存在(目录)

  const 名称 = 基础名称?.trim() || 默认基础名称

  // 查找可用的文件名
  let 文件名 = `${名称}${规则文件后缀}`
  let 序号 = 1
  while (fs.existsSync(path.join(目录, 文件名))) {
    文件名 = `${名称}-${序号}${规则文件后缀}`
    序号++
  }

  const 文件路径 = path.join(目录, 文件名)
  // 创建空文件
  fs.writeFileSync(文件路径, '', 'utf-8')

  return { 文件名, 文件路径 }
}

/**
 * 读取合并规则文件内容
 * 返回路径列表（忽略空行和注释行）
 */
export function 读取合并规则文件(项目路径: string, 文件名: string): string[] {
  const 文件路径 = path.join(获取规则目录(项目路径), 文件名)

  if (!fs.existsSync(文件路径)) return []

  const 内容 = fs.readFileSync(文件路径, 'utf-8')
  return 内容
    .split('\n')
    .map((行) => 行.trim())
    .filter((行) => 行.length > 0 && !行.startsWith('#'))
}

/**
 * 保存合并规则文件
 * 将路径列表写入文件
 */
export function 保存合并规则文件(项目路径: string, 文件名: string, 路径列表: string[]): void {
  const 目录 = 获取规则目录(项目路径)
  确保目录存在(目录)

  const 文件路径 = path.join(目录, 文件名)
  const 内容 = 路径列表.join('\n')
  fs.writeFileSync(文件路径, 内容, 'utf-8')
}

/**
 * 删除合并规则文件
 */
export function 删除合并规则文件(项目路径: string, 文件名: string): boolean {
  const 文件路径 = path.join(获取规则目录(项目路径), 文件名)

  if (!fs.existsSync(文件路径)) return false

  fs.unlinkSync(文件路径)
  return true
}

/**
 * 重命名合并规则文件
 */
export function 重命名合并规则文件(项目路径: string, 旧文件名: string, 新文件名: string): boolean {
  const 目录 = 获取规则目录(项目路径)
  const 旧路径 = path.join(目录, 旧文件名)
  const 新路径 = path.join(目录, 新文件名)

  if (!fs.existsSync(旧路径)) return false
  if (fs.existsSync(新路径)) return false

  fs.renameSync(旧路径, 新路径)
  return true
}
