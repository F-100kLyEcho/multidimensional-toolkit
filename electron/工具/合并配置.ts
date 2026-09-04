/**
 * 合并配置管理
 * 存储用户自定义的合并文件类型配置，跨项目生效
 * 保存在 Electron 用户数据目录下的 获取路径/合并配置.json
 */
import path from 'node:path'
import { 获取路径模块路径 } from './模块路径'
import { 读取JSON文件, 写入JSON文件, 确保目录存在 } from './文件操作'

/** 合并配置文件名 */
const 合并配置文件名 = '合并配置.json'

/** 默认支持的文件类型（Glob 模式，兼容原扩展名格式） */
const 默认类型 = ['*.ts', '*.vue', '*.js', '*.css', '*.html', '*.json', '*.py', '*.md', '*.jsx', '*.tsx', '*.scss', '*.less', '*.java', '*.go', '*.rs', '*.yaml', '*.yml', '*.xml']

export interface 合并配置 {
  支持的文件类型: string[]
  输出格式: 'md' | 'txt'
  添加路径注释: boolean
  添加分隔: boolean
}

/** 获取合并配置文件路径 */
function 获取配置文件路径(): string {
  return path.join(获取路径模块路径(), 合并配置文件名)
}

/**
 * 读取合并配置
 * 如果文件不存在则返回默认配置
 */
export function 读取合并配置(): 合并配置 {
  const 文件路径 = 获取配置文件路径()
  const 数据 = 读取JSON文件<合并配置>(文件路径)
  return (
    数据 ?? {
      支持的文件类型: [...默认类型],
      输出格式: 'txt',
      添加路径注释: true,
      添加分隔: true,
    }
  )
}

/**
 * 保存合并配置
 */
export function 保存合并配置(配置: 合并配置): void {
  const 文件路径 = 获取配置文件路径()
  确保目录存在(path.dirname(文件路径))
  写入JSON文件(文件路径, 配置)
}
