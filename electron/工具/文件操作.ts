/**
 * 文件操作工具函数
 * 提供文件读写、目录扫描等通用功能
 */
import fs from 'node:fs'
import path from 'node:path'

/**
 * 递归扫描目录，返回所有文件的相对路径列表
 * @param 目录路径 要扫描的绝对路径
 * @param 基础路径 用于计算相对路径的基础路径（默认为目录路径自身）
 * @returns 扁平路径列表（使用正斜杠）
 */
export function 递归扫描目录(目录路径: string, 基础路径?: string): string[] {
  const 结果: string[] = []
  const 基准 = 基础路径 ?? 目录路径

  try {
    const 条目列表 = fs.readdirSync(目录路径, { withFileTypes: true })

    for (const 条目 of 条目列表) {
      const 完整路径 = path.join(目录路径, 条目.name)

      if (条目.isDirectory()) {
        // 递归扫描子目录
        const 子文件列表 = 递归扫描目录(完整路径, 基准)
        结果.push(...子文件列表)
      } else if (条目.isFile()) {
        // 计算相对路径并转换为正斜杠
        const 相对路径 = path.relative(基准, 完整路径).replace(/\\/g, '/')
        结果.push(相对路径)
      }
    }
  } catch (错误) {
    console.error(`扫描目录失败: ${目录路径}`, 错误)
  }

  return 结果
}

/**
 * 读取 JSON 文件
 * @param 文件路径 文件绝对路径
 * @returns 解析后的对象，失败返回 null
 */
export function 读取JSON文件<T>(文件路径: string): T | null {
  try {
    if (!fs.existsSync(文件路径)) return null
    const 内容 = fs.readFileSync(文件路径, 'utf-8')
    return JSON.parse(内容) as T
  } catch (错误) {
    console.error(`读取 JSON 文件失败: ${文件路径}`, 错误)
    return null
  }
}

/**
 * 写入 JSON 文件（自动创建目录）
 * @param 文件路径 文件绝对路径
 * @param 数据 要写入的数据
 */
export function 写入JSON文件(文件路径: string, 数据: unknown): void {
  try {
    const 目录 = path.dirname(文件路径)
    if (!fs.existsSync(目录)) {
      fs.mkdirSync(目录, { recursive: true })
    }
    fs.writeFileSync(文件路径, JSON.stringify(数据, null, 2), 'utf-8')
  } catch (错误) {
    console.error(`写入 JSON 文件失败: ${文件路径}`, 错误)
    throw 错误
  }
}

/**
 * 确保目录存在，不存在则创建
 * @param 目录路径 目录绝对路径
 */
export function 确保目录存在(目录路径: string): void {
  if (!fs.existsSync(目录路径)) {
    fs.mkdirSync(目录路径, { recursive: true })
  }
}
