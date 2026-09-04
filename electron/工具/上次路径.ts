/**
 * 上次路径管理
 * 存储用户上次打开的路径，用于应用启动时自动恢复
 */
import path from 'node:path'
import fs from 'node:fs'
import { 获取路径模块路径 } from './模块路径'
import { 读取JSON文件, 写入JSON文件, 确保目录存在 } from './文件操作'

/** 上次路径文件名 */
const 上次路径文件名 = '上次路径.json'

/** 上次路径文件路径 */
function 获取文件路径(): string {
  return path.join(获取路径模块路径(), 上次路径文件名)
}

/**
 * 读取上次路径
 */
export function 读取上次路径(): string {
  const 文件路径 = 获取文件路径()
  const 数据 = 读取JSON文件<string>(文件路径)
  return 数据 ?? ''
}

/**
 * 保存上次路径
 */
export function 保存上次路径(路径: string): void {
  const 文件路径 = 获取文件路径()
  确保目录存在(path.dirname(文件路径))
  fs.writeFileSync(文件路径, JSON.stringify(路径), 'utf-8')
}
