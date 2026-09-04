/**
 * 启动页面 - 主题管理
 * 主题数据独立存储，不与菜单/卡片混写
 */
import path from 'node:path'
import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { 获取模块路径 } from '../../工具/模块路径'
import { 确保目录存在 } from '../../工具/文件操作'

// ----- 常量 -----
const 启动路径 = () => 获取模块路径('启动')
const 主题文件名 = '主题.json'

// ----- 类型定义 -----
export interface 主题数据 {
  版本: string
  最后更新: number
  背景色值: number
  不透明度: number
  磨砂强度: number
  背景模式?: '图片' | '纯色'
  背景纯色?: string
}

function 默认主题数据(): 主题数据 {
  return {
    版本: '1.0',
    最后更新: Date.now(),
    背景色值: 0,
    不透明度: 0.25,
    磨砂强度: 12,
  }
}

// ----- 串行写入锁 -----
let 写锁: Promise<void> = Promise.resolve()

// ---------- 主题 ----------
export async function 读取主题(): Promise<主题数据> {
  const 文件路径 = path.join(启动路径(), 主题文件名)
  try {
    if (!existsSync(文件路径)) return 默认主题数据()
    const 内容 = await fs.readFile(文件路径, 'utf-8')
    return JSON.parse(内容)
  } catch {
    return 默认主题数据()
  }
}

export async function 保存主题(数据: 主题数据): Promise<void> {
  数据.最后更新 = Date.now()
  const 文件路径 = path.join(启动路径(), 主题文件名)
  await 确保目录存在(path.dirname(文件路径))
  const 内容 = JSON.stringify(数据, null, 2)
  写锁 = 写锁.then(() => fs.writeFile(文件路径, 内容, 'utf-8'))
  return 写锁
}
