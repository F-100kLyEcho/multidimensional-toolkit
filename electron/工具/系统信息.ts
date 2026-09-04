/**
 * 系统信息工具函数
 * 提供获取系统相关信息的功能
 */
import os from 'node:os'

/** 系统信息接口 */
export interface 系统信息 {
  平台: string
  主机名: string
  总内存: string
  空闲内存: string
  CPU架构: string
  CPU核心数: number
}

/**
 * 获取当前系统信息
 */
export function 获取系统信息(): 系统信息 {
  return {
    平台: os.platform(),
    主机名: os.hostname(),
    总内存: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    空闲内存: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    CPU架构: os.arch(),
    CPU核心数: os.cpus().length,
  }
}
