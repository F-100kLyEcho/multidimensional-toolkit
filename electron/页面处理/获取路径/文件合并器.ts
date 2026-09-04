/**
 * 文件合并器
 * 将保留的文件列表按顺序合并为一个文本文件
 * 支持文件类型过滤、路径注释、分隔行
 * node:fs  node:path这些错误是 IDE 的 tsconfig 问题，不是代码问题。
 */
import fs from 'node:fs'
import path from 'node:path'
import { 确保目录存在 } from '../../工具/文件操作'
import { 是否匹配任意模式 } from '../../工具/glob工具'
import type { 合并文件请求, 合并文件响应 } from '../../类型/index'

/**
 * 判断文件是否匹配任一 Glob 模式
 * 使用相对路径（相对于项目根目录）进行匹配
 */
function 是否支持类型(文件路径: string, 项目路径: string, 模式列表: string[]): boolean {
  const 相对路径 = path.relative(项目路径, 文件路径)
  return 是否匹配任意模式(相对路径, 模式列表)
}

/**
 * 生成路径注释
 */
function 生成路径注释(文件路径: string, 项目路径: string, 添加注释: boolean): string {
  if (!添加注释) return ''
  const 相对路径 = path.relative(项目路径, 文件路径).replace(/\\/g, '/')
  return `// 文件路径:${相对路径}\n`
}

/**
 * 合并文件列表
 */
export function 合并文件列表(请求: 合并文件请求, 输出目录: string): 合并文件响应 {
  try {
    确保目录存在(输出目录)
    const 输出文件路径 = path.join(输出目录, 请求.输出文件名)

    let 已合并数 = 0
    let 跳过数 = 0
    const 输出行: string[] = []
    const 跳过文件列表: string[] = []

    for (const 文件路径 of 请求.文件路径列表) {
      // 检查文件类型（使用 Glob 模式匹配）
      if (!是否支持类型(文件路径, 请求.项目路径, 请求.配置.支持的文件类型)) {
        跳过数++
        // 记录跳过的相对路径
        const 相对路径 = path.relative(请求.项目路径, 文件路径).replace(/\\/g, '/')
        跳过文件列表.push(相对路径)
        continue
      }

      try {
        // 读取文件内容
        const 内容 = fs.readFileSync(文件路径, 'utf-8')

        // 添加路径注释
        const 注释 = 生成路径注释(文件路径, 请求.项目路径, 请求.配置.添加路径注释)
        if (注释) 输出行.push(注释)

        // 添加文件内容
        输出行.push(内容)

        // 添加分隔
        if (请求.配置.添加分隔) {
          输出行.push('---')
        }

        已合并数++
      } catch (错误) {
        console.error(`读取文件失败: ${文件路径}`, 错误)
        跳过数++
        // 记录读取失败的相对路径
        const 相对路径 = path.relative(请求.项目路径, 文件路径).replace(/\\/g, '/')
        跳过文件列表.push(相对路径)
      }
    }

    // 写入输出文件
    const 最终内容 = 输出行.join('\n')
    fs.writeFileSync(输出文件路径, 最终内容, 'utf-8')

    return {
      成功: true,
      输出文件路径,
      已合并文件数: 已合并数,
      跳过文件数: 跳过数,
      跳过文件列表,
    }
  } catch (错误) {
    return {
      成功: false,
      错误信息: 错误 instanceof Error ? 错误.message : String(错误),
    }
  }
}
