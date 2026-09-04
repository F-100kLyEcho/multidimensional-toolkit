/**
 * 历史记录管理
 * 存储用户输入的路径历史，保存在 Electron 用户数据目录下
 * 自动保留最近 30 条，超出时移除最旧记录
 */
import path from 'node:path'
import { 获取路径模块路径 } from './模块路径'
import { 读取JSON文件, 写入JSON文件 } from './文件操作'

/** 最大历史记录条数 */
const 最大条数 = 30

/** 历史记录文件名 */
const 历史记录文件名 = '路径历史.json'

/** 历史记录文件路径 */
function 获取历史记录文件路径(): string {
  return path.join(获取路径模块路径(), 历史记录文件名)
}

/**
 * 读取历史记录列表
 * @returns 历史路径数组（从新到旧）
 */
export function 读取历史记录(): string[] {
  const 文件路径 = 获取历史记录文件路径()
  const 数据 = 读取JSON文件<string[]>(文件路径)
  return 数据 ?? []
}

/**
 * 添加一条历史记录
 * 自动去重，保留最近 30 条
 * @param 路径 要添加的路径
 */
export function 添加历史记录(路径: string): void {
  const 记录列表 = 读取历史记录()

  // 去重：移除已存在的相同路径
  const 去重后 = 记录列表.filter((v) => v !== 路径)

  // 在开头插入新记录
  去重后.unshift(路径)

  // 限制条数
  const 截断后 = 去重后.slice(0, 最大条数)

  // 保存
  const 文件路径 = 获取历史记录文件路径()
  写入JSON文件(文件路径, 截断后)
}

/**
 * 删除单条历史记录
 * @param 路径 要删除的路径
 */
export function 删除历史记录(路径: string): void {
  const 记录列表 = 读取历史记录()
  const 过滤后 = 记录列表.filter((v) => v !== 路径)
  const 文件路径 = 获取历史记录文件路径()
  写入JSON文件(文件路径, 过滤后)
}

/**
 * 清空所有历史记录
 */
export function 清空历史记录(): void {
  const 文件路径 = 获取历史记录文件路径()
  写入JSON文件(文件路径, [])
}
