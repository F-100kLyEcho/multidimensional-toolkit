/**
 * PE 图标提取
 * 纯 JS 解析 Windows PE 资源表，从 EXE/DLL 内嵌资源中提取多尺寸图标
 * 用于绕过 Electron getFileIcon 在 Windows 上的 48×48 上限（测试功能）
 */
import fs from 'node:fs/promises'
import zlib from 'node:zlib'
import { 保存图片到缓存, type 图标尺寸项, type 提取结果 } from './图片管理'

// ===== 常量 =====
const 资源类型图标 = 3 // RT_ICON：图标帧数据
const 资源类型图标组 = 14 // RT_GROUP_ICON：图标组清单
const 最大返回数量 = 16

// ===== 内部类型 =====

interface 节信息 {
  虚拟地址: number
  虚拟大小: number
  原始大小: number
  原始偏移: number
}

interface 资源数据 {
  RVA: number
  大小: number
}

interface 图标组条目 {
  宽: number
  高: number
  位深: number
  数据大小: number
  ID: number
}

// ===== PNG 编码（Node 内置 zlib，无第三方依赖）=====

const CRC表 = (() => {
  const 表 = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    表[n] = c >>> 0
  }
  return 表
})()

function crc32(数据: Buffer): number {
  let c = 0xffffffff
  for (let i = 0; i < 数据.length; i++) c = CRC表[(c ^ 数据[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function PNG块(类型: string, 数据: Buffer): Buffer {
  const 长度 = Buffer.alloc(4)
  长度.writeUInt32BE(数据.length, 0)
  const 类型缓冲区 = Buffer.from(类型, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([类型缓冲区, 数据])), 0)
  return Buffer.concat([长度, 类型缓冲区, 数据, crc])
}

/**
 * 将未压缩的 RGBA 像素编码为 PNG（8bit RGBA）
 */
function 像素编码为PNG(宽: number, 高: number, 像素: Buffer): Buffer {
  const 签名 = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const 头 = Buffer.alloc(13)
  头.writeUInt32BE(宽, 0)
  头.writeUInt32BE(高, 4)
  头[8] = 8 // 位深
  头[9] = 6 // 色彩类型 RGBA
  头[10] = 0
  头[11] = 0
  头[12] = 0
  const 行宽 = 1 + 宽 * 4
  const 行数据 = Buffer.alloc(行宽 * 高)
  for (let y = 0; y < 高; y++) {
    行数据[y * 行宽] = 0 // 无滤波
    像素.copy(行数据, y * 行宽 + 1, y * 宽 * 4, (y + 1) * 宽 * 4)
  }
  const idat = zlib.deflateSync(行数据)
  return Buffer.concat([签名, PNG块('IHDR', 头), PNG块('IDAT', idat), PNG块('IEND', Buffer.alloc(0))])
}

/**
 * 将 ICO 内的 DIB(BMP) 帧解码为 RGBA 像素，再编码为 PNG
 * 支持 32/24/8/4/1 bpp，行自底向上，含 AND 掩码
 * @returns PNG 数据与实际宽高
 */
function DIB转换为PNG(帧数据: Buffer, 期望宽: number, 期望高: number): { png: Buffer; 宽: number; 高: number } {
  const 头大小 = 帧数据.readUInt32LE(0)
  if (头大小 < 40) throw new Error('DIB 头过小')
  const 宽 = 帧数据.readInt32LE(4)
  const bi高 = 帧数据.readInt32LE(8)
  const 位深 = 帧数据.readUInt16LE(14)
  if (宽 <= 0 || bi高 === 0) throw new Error('DIB 尺寸无效')

  // ICO 惯例：biHeight 通常为实际高度的 2 倍（下半部分是 AND 掩码）
  let 高: number
  let 带掩码 = false
  if (期望高 > 0 && bi高 === 2 * 期望高) {
    高 = 期望高
    带掩码 = true
  } else if (期望高 > 0 && bi高 === 期望高) {
    高 = 期望高
  } else {
    高 = Math.floor(Math.abs(bi高) / 2)
    带掩码 = true
  }

  const 行字节 = Math.ceil((宽 * 位深) / 8)
  const 行对齐 = (行字节 + 3) & ~3
  let 像素区偏移 = 头大小
  if (位深 <= 8) {
    const 调色板数 = 1 << 位深
    像素区偏移 = 头大小 + 调色板数 * 4
  }
  if (像素区偏移 + (带掩码 ? 2 : 1) * 行对齐 * 高 > 帧数据.length) {
    // 帧数据不足（可能只是简单 DIB），按实际大小容错
  }

  const 像素 = Buffer.alloc(宽 * 高 * 4)
  const 掩码区偏移 = 像素区偏移 + 行对齐 * 高

  for (let y = 0; y < 高; y++) {
    const 源行 = 高 - 1 - y // DIB 自底向上
    const 源基 = 像素区偏移 + 源行 * 行对齐
    const 目标基 = y * 宽 * 4
    for (let x = 0; x < 宽; x++) {
      let 红: number
      let 绿: number
      let 蓝: number
      let 阿尔法: number
      if (位深 === 32) {
        蓝 = 帧数据[源基 + x * 4]
        绿 = 帧数据[源基 + x * 4 + 1]
        红 = 帧数据[源基 + x * 4 + 2]
        阿尔法 = 帧数据[源基 + x * 4 + 3]
      } else if (位深 === 24) {
        蓝 = 帧数据[源基 + x * 3]
        绿 = 帧数据[源基 + x * 3 + 1]
        红 = 帧数据[源基 + x * 3 + 2]
        阿尔法 = 255
      } else {
        const 字节 = 帧数据[源基 + Math.floor((x * 位深) / 8)]
        let 索引: number
        if (位深 === 8) 索引 = 字节
        else if (位深 === 4) 索引 = x % 2 === 0 ? 字节 >>> 4 : 字节 & 0x0f
        else 索引 = (字节 >> (7 - (x % 8))) & 1
        const 调色板基 = 头大小 + 索引 * 4
        蓝 = 帧数据[调色板基]
        绿 = 帧数据[调色板基 + 1]
        红 = 帧数据[调色板基 + 2]
        阿尔法 = 帧数据[调色板基 + 3]
      }
      // AND 掩码强制透明
      if (带掩码 && 掩码区偏移 + 行对齐 * 高 <= 帧数据.length) {
        const 掩码行 = 掩码区偏移 + (高 - 1 - y) * ((Math.ceil(宽 / 8) + 3) & ~3)
        if (帧数据[掩码行 + Math.floor(x / 8)] & (1 << (7 - (x % 8)))) 阿尔法 = 0
      }
      像素[目标基 + x * 4] = 红
      像素[目标基 + x * 4 + 1] = 绿
      像素[目标基 + x * 4 + 2] = 蓝
      像素[目标基 + x * 4 + 3] = 阿尔法
    }
  }

  return { png: 像素编码为PNG(宽, 高, 像素), 宽, 高 }
}

/**
 * RVA（相对虚拟地址）转换为文件偏移
 * @param rva 要转换的 RVA
 * @param 节表 PE 节表
 * @param 数据 文件缓冲
 * @returns 文件偏移，超出文件范围返回 -1
 */
function RVA转文件偏移(rva: number, 节表: 节信息[], 数据: Buffer): number {
  for (const 节 of 节表) {
    const 虚拟结束 = 节.虚拟地址 + Math.max(节.虚拟大小, 节.原始大小)
    if (rva >= 节.虚拟地址 && rva < 虚拟结束) {
      const 偏移 = rva - 节.虚拟地址 + 节.原始偏移
      if (偏移 >= 0 && 偏移 + 4 <= 数据.length) return 偏移
      return -1
    }
  }
  return -1
}

/**
 * 读取帧数据的 PNG 宽高（直接从 IHDR 解析）
 */
function 读取PNG宽高(帧数据: Buffer): { 宽: number; 高: number } {
  return { 宽: 帧数据.readUInt32BE(16), 高: 帧数据.readUInt32BE(20) }
}

/**
 * 解析 PNG 魔数判断帧是否为 PNG 压缩格式
 */
function 是PNG(buffer: Buffer): boolean {
  return buffer.length > 16 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
}

/**
 * 纯 JS 解析 PE 资源表，提取程序内嵌的多尺寸图标
 * @param 程序路径 可执行文件或 DLL 路径
 * @returns 与 Electron 提取一致的提取结果
 */
export async function 提取PE程序图标(程序路径: string): Promise<提取结果> {
  const 数据 = await fs.readFile(程序路径)

  // ---- 1. DOS 头与 PE 头 ----
  if (数据.length < 0x40 || 数据.readUInt16LE(0) !== 0x5a4d) {
    return { 成功: false, 错误信息: '不是有效的 PE 文件（缺少 MZ 头）' }
  }
  const pe偏移 = 数据.readUInt32LE(0x3c)
  if (pe偏移 + 24 > 数据.length || 数据.readUInt32LE(pe偏移) !== 0x00004550) {
    return { 成功: false, 错误信息: '不是有效的 PE 文件（缺少 PE 签名）' }
  }

  const 节数 = 数据.readUInt16LE(pe偏移 + 6)
  const 可选头大小 = 数据.readUInt16LE(pe偏移 + 20)
  const 可选头偏移 = pe偏移 + 24
  const 是PE32Plus = 数据.readUInt16LE(可选头偏移) === 0x20b

  // ---- 2. 数据目录定位资源表（DataDirectory[2] = RT_RESOURCE）----
  const 数据目录偏移 = 可选头偏移 + (是PE32Plus ? 112 : 96)
  const 资源RVA = 数据.readUInt32LE(数据目录偏移 + 16) // index 2 * 8
  const 资源大小 = 数据.readUInt32LE(数据目录偏移 + 20)
  if (!资源RVA || !资源大小) {
    return { 成功: false, 错误信息: 'PE 文件中未找到资源段' }
  }

  // ---- 3. 构建节表，用于 RVA 转换 ----
  const 节表: 节信息[] = []
  const 节表偏移 = 可选头偏移 + 可选头大小
  for (let i = 0; i < 节数; i++) {
    const 基址 = 节表偏移 + i * 40
    if (基址 + 40 > 数据.length) break
    节表.push({
      虚拟大小: 数据.readUInt32LE(基址 + 8),
      虚拟地址: 数据.readUInt32LE(基址 + 12),
      原始大小: 数据.readUInt32LE(基址 + 16),
      原始偏移: 数据.readUInt32LE(基址 + 20),
    })
  }

  const 资源偏移 = RVA转文件偏移(资源RVA, 节表, 数据)
  if (资源偏移 === -1) {
    return { 成功: false, 错误信息: '无法定位资源段在文件中的偏移' }
  }
  const 资源区终点 = Math.min(数据.length, 资源偏移 + 资源大小)

  // ---- 4. 遍历资源目录，收集 RT_ICON 与 RT_GROUP_ICON ----
  const 图标帧表 = new Map<number, 资源数据>()
  const 图标组表 = new Map<number, 资源数据>()

  function 遍历资源目录(相对目录偏移: number, 类型ID?: number, 资源ID?: number) {
    const 基址 = 资源偏移 + 相对目录偏移
    if (基址 + 16 > 资源区终点) return
    const 命名条目数 = 数据.readUInt16LE(基址 + 12)
    const 编号条目数 = 数据.readUInt16LE(基址 + 14)
    for (let i = 0; i < 命名条目数 + 编号条目数; i++) {
      const 条目偏移 = 基址 + 16 + i * 8
      if (条目偏移 + 8 > 资源区终点) break
      const 名称字段 = 数据.readUInt32LE(条目偏移)
      const 数据字段 = 数据.readUInt32LE(条目偏移 + 4)
      if (名称字段 & 0x80000000) continue // 字符串命名资源，跳过
      const 当前ID = 名称字段 & 0x7fffffff
      if (数据字段 & 0x80000000) {
        const 子目录相对 = 数据字段 & 0x7fffffff
        if (类型ID === undefined) 遍历资源目录(子目录相对, 当前ID, undefined)
        else if (资源ID === undefined) 遍历资源目录(子目录相对, 类型ID, 当前ID)
        else 遍历资源目录(子目录相对, 类型ID, 资源ID)
      } else {
        const 数据条目偏移值 = 资源偏移 + (数据字段 & 0x7fffffff)
        if (数据条目偏移值 + 8 > 资源区终点) continue
        const 帧RVA = 数据.readUInt32LE(数据条目偏移值)
        const 帧大小 = 数据.readUInt32LE(数据条目偏移值 + 4)
        if (类型ID === 资源类型图标) {
          if (!图标帧表.has(资源ID!)) 图标帧表.set(资源ID!, { RVA: 帧RVA, 大小: 帧大小 })
        } else if (类型ID === 资源类型图标组) {
          if (!图标组表.has(资源ID!)) 图标组表.set(资源ID!, { RVA: 帧RVA, 大小: 帧大小 })
        }
      }
    }
  }
  遍历资源目录(0)

  if (图标帧表.size === 0 || 图标组表.size === 0) {
    return { 成功: false, 错误信息: '程序未包含内嵌图标资源' }
  }

  // ---- 5. 收集所有图标组中的帧清单 ----
  const 收集的帧: 图标组条目[] = []

  function 读取图标组(组数据: 资源数据): 图标组条目[] {
    const 组偏移 = RVA转文件偏移(组数据.RVA, 节表, 数据)
    if (组偏移 === -1 || 组偏移 + 6 > 数据.length) return []
    const 数量 = 数据.readUInt16LE(组偏移 + 4)
    if (数量 === 0 || 数量 > 64) return []
    const 条目数组: 图标组条目[] = []
    for (let i = 0; i < 数量; i++) {
      const 基址 = 组偏移 + 6 + i * 14
      if (基址 + 14 > 数据.length) break
      let 宽 = 数据.readUInt8(基址)
      let 高 = 数据.readUInt8(基址 + 1)
      if (宽 === 0) 宽 = 256
      if (高 === 0) 高 = 256
      条目数组.push({
        宽,
        高,
        位深: 数据.readUInt16LE(基址 + 6),
        数据大小: 数据.readUInt32LE(基址 + 8),
        ID: 数据.readUInt16LE(基址 + 12),
      })
    }
    return 条目数组
  }

  const 组键数组 = [...图标组表.keys()].sort((a, b) => a - b)
  for (const 组键 of 组键数组) {
    收集的帧.push(...读取图标组(图标组表.get(组键)!))
  }

  // 按面积从大到小去重排序
  const 已见 = new Set<string>()
  const 唯一帧 = 收集的帧
    .sort((a, b) => b.宽 * b.高 - a.宽 * a.高)
    .filter((帧) => {
      const 键 = `${帧.宽}x${帧.高}`
      if (已见.has(键)) return false
      已见.add(键)
      return true
    })
    .slice(0, 最大返回数量)

  if (唯一帧.length === 0) {
    return { 成功: false, 错误信息: '图标组清单为空' }
  }

  // ---- 6. 逐帧提取并保存到缓存 ----
  const 结果列表: 图标尺寸项[] = []
  for (const 帧 of 唯一帧) {
    const 帧资源 = 图标帧表.get(帧.ID)
    if (!帧资源 || !帧资源.RVA || !帧资源.大小) continue
    const 帧偏移 = RVA转文件偏移(帧资源.RVA, 节表, 数据)
    if (帧偏移 === -1 || 帧偏移 + Math.min(帧资源.大小, 4) > 数据.length) continue

    try {
      const 帧数据 = 数据.subarray(帧偏移, 帧偏移 + 帧资源.大小)
      let pngBuffer: Buffer | null = null
      let 实际宽 = 帧.宽
      let 实际高 = 帧.高

      if (是PNG(帧数据)) {
        // 大尺寸帧（如 256×256）通常直接是 PNG 压缩数据
        pngBuffer = Buffer.from(帧数据)
        const 尺寸 = 读取PNG宽高(帧数据)
        实际宽 = 尺寸.宽
        实际高 = 尺寸.高
      } else {
        // 小尺寸帧是 DIB 格式，手工解码为 PNG
        const 结果 = DIB转换为PNG(帧数据, 帧.宽, 帧.高)
        pngBuffer = 结果.png
        实际宽 = 结果.宽
        实际高 = 结果.高
      }

      if (!pngBuffer || pngBuffer.length === 0) continue
      const 临时文件名 = await 保存图片到缓存(pngBuffer, 'appicon')
      结果列表.push({
        尺寸: `${实际宽}x${实际高}`,
        临时文件名,
        像素尺寸: { 宽: 实际宽, 高: 实际高 },
      })
    } catch {
      // 单帧失败不影响其他帧
    }
  }

  if (结果列表.length === 0) {
    return { 成功: false, 错误信息: '图标帧解码全部失败' }
  }
  return { 成功: true, 图标列表: 结果列表 }
}