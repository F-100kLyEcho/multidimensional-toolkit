/**
 * 模块路径工具
 * 提供统一的函数用于生成各模块的用户数据路径
 * 调用 app.getPath('userData') 必须在 app.whenReady() 之后
 */
import { app } from 'electron'
import path from 'node:path'
import crypto from 'node:crypto'

/**
 * 获取指定模块的用户数据绝对路径
 * @param 模块名 - 模块名称，如 '获取路径'
 * @returns 绝对路径，如 "C:\Users\xxx\AppData\Roaming\多维工具\获取路径"
 */
export function 获取模块路径(模块名: string): string {
  return path.join(app.getPath('userData'), 模块名)
}

/** 获取路径模块的快捷函数 */
export const 获取路径模块路径 = () => 获取模块路径('获取路径')

/**
 * 生成项目标识：{项目文件夹名}_{路径hash前4位}
 * 用于在工作空间下按项目分目录存储规则
 */
export function 生成项目标识(项目路径: string): string {
  const 项目名 = path.basename(项目路径)
  const hash = crypto.createHash('sha256').update(项目路径).digest('hex').slice(0, 4)
  return `${项目名}_${hash}`
}

/**
 * 获取项目规则存储路径
 * 工作空间路径/获取路径/项目规则/{项目标识}/
 */
export function 获取项目规则路径(项目路径: string): string {
  return path.join(获取路径模块路径(), '项目规则', 生成项目标识(项目路径))
}

/**
 * 获取扫描输出路径
 * 工作空间路径/获取路径/输出/扫描/
 */
export function 获取扫描输出路径(): string {
  return path.join(获取路径模块路径(), '输出', '扫描')
}

/**
 * 获取合并代码输出路径
 * 工作空间路径/获取路径/输出/合并/
 */
export function 获取合并代码输出路径(): string {
  return path.join(获取路径模块路径(), '输出', '合并')
}

/**
 * 获取合并规则存储路径
 * 工作空间路径/获取路径/合并规则/{项目标识}/
 */
export function 获取合并规则路径(项目路径: string): string {
  return path.join(获取路径模块路径(), '合并规则', 生成项目标识(项目路径))
}
