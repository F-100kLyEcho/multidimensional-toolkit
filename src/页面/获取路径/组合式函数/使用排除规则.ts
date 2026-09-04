import { ref, computed } from 'vue'
import type { 树形节点, 排除规则条目, 排除来源类别, 节点状态 } from '../类型/index'

// 重新导出类型，保持向后兼容
export type { 排除规则条目, 排除来源类别, 节点状态 }

/** 排除规则数据结构（匹配配置文件格式） */
export type 排除规则数据 = {
  版本: number
  精确排除: {
    文件夹: string[]
    文件: string[]
  }
  豁免: string[]
  通配符: string[]
}

// ==================== .mdignore 文本工具 ====================

/** 将有序规则条目列表转为 .mdignore 格式文本 */
export function 规则转文本(条目列表: 排除规则条目[]): string {
  const 行: string[] = []
  for (const 条目 of 条目列表) {
    switch (条目.类别) {
      case '精确文件夹':
        行.push(`${条目.值}/`)
        break
      case '递归文件夹':
        行.push(`**${条目.值}/`)
        break
      case '精确文件':
        行.push(条目.值)
        break
      case '递归文件':
        行.push(`**${条目.值}`)
        break
      case '占位文件夹':
        行.push(`@${条目.值}`)
        break
      case '豁免':
        行.push(`!${条目.值}`)
        break
      case '通配符':
        行.push(条目.值)
        break
    }
  }
  return 行.join('\n') + (行.length > 0 ? '\n' : '')
}

/** 将 .mdignore 格式文本解析为五类规则列表 */
export function 文本转规则(文本: string): { 精确文件夹: string[]; 递归文件夹: string[]; 精确文件: string[]; 递归文件: string[]; 占位文件夹: string[]; 豁免: string[]; 通配符: string[] } {
  const 精确文件夹: string[] = []
  const 递归文件夹: string[] = []
  const 精确文件: string[] = []
  const 递归文件: string[] = []
  const 占位文件夹: string[] = []
  const 豁免: string[] = []
  const 通配符: string[] = []

  for (let 行 of 文本.split('\n')) {
    行 = 行.trim()
    if (!行 || 行.startsWith('#')) continue

    if (行.startsWith('@')) {
      const 值 = 行.slice(1).trim()
      if (值 && !值.includes('*') && !值.includes('?')) {
        const 标准化 = 值.endsWith('/') ? 值.slice(0, -1) : 值
        if (!占位文件夹.includes(标准化)) 占位文件夹.push(标准化)
      }
    } else if (行.startsWith('!')) {
      const 值 = 行.slice(1).trim()
      if (值 && !豁免.includes(值)) 豁免.push(值)
    } else if (行.startsWith('**') && 行.endsWith('/')) {
      const 去前缀 = 行.slice(2)
      const 值 = 去前缀.endsWith('/') ? 去前缀.slice(0, -1).trim() : 去前缀.trim()
      if (值 && !递归文件夹.includes(值)) 递归文件夹.push(值)
    } else if (行.startsWith('**') && !行.endsWith('/')) {
      const 值 = 行.slice(2).trim()
      if (值 && !递归文件.includes(值)) 递归文件.push(值)
    } else if (行.endsWith('/')) {
      const 值 = 行.slice(0, -1).trim()
      if (值 && !精确文件夹.includes(值)) 精确文件夹.push(值)
    } else if (行.includes('*') || 行.includes('?')) {
      if (!通配符.includes(行)) 通配符.push(行)
    } else {
      if (!精确文件.includes(行)) 精确文件.push(行)
    }
  }

  return { 精确文件夹, 递归文件夹, 精确文件, 递归文件, 占位文件夹, 豁免, 通配符 }
}

/** 规则类别枚举 */
export const 规则类别标签: Record<排除规则条目['类别'], string> = {
  精确文件夹: '📁 文件夹',
  递归文件夹: '📂 递归文件夹',
  精确文件: '📄 文件',
  递归文件: '📝 递归文件',
  豁免: '⭐ 豁免',
  通配符: '* 通配符',
  占位文件夹: '🔴 占位',
}

// ==================== 匹配工具函数 ====================

/**
 * 将 glob 模式转为正则表达式
 */
function glob模式转正则(模式: string): RegExp {
  let 正则字符串 = ''
  let 待处理 = 模式

  if (待处理.endsWith('/')) {
    待处理 = 待处理.slice(0, -1)
  }

  let i = 0
  while (i < 待处理.length) {
    const c = 待处理[i]!
    if (c === '*' && 待处理[i + 1] === '*') {
      正则字符串 += '.*'
      i += 2
      if (i < 待处理.length && 待处理[i] === '/') i++
    } else if (c === '*') {
      正则字符串 += '[^/]*'
      i++
    } else if (c === '?') {
      正则字符串 += '[^/]'
      i++
    } else if (c === '[') {
      const 闭括号 = 待处理.indexOf(']', i)
      if (闭括号 === -1) {
        正则字符串 += '\\' + c
        i++
      } else {
        const 片段 = 待处理.slice(i + 1, 闭括号)
        const 已转义 = 片段.replace(/[.*+?^${}()|\\]/g, '\\$&')
        正则字符串 += '[' + 已转义 + ']'
        i = 闭括号 + 1
      }
    } else if (/[.+^${}()|\\]/.test(c)) {
      正则字符串 += '\\' + c
      i++
    } else {
      正则字符串 += c
      i++
    }
  }

  let 完整正则: string
  if (模式.startsWith('**')) {
    完整正则 = 正则字符串
  } else if (模式.startsWith('*')) {
    完整正则 = 正则字符串 + '$'
  } else if (模式.includes('**')) {
    完整正则 = 正则字符串
  } else {
    完整正则 = '^' + 正则字符串 + '$'
  }

  return new RegExp(完整正则)
}

/**
 * 判断路径是否匹配某条通配符规则
 */
export function 匹配通配符(路径: string, 规则: string): boolean {
  const regex = glob模式转正则(规则)
  return regex.test(路径)
}

/**
 * 判断一个路径是否匹配精确文件夹排除
 */
function 匹配精确文件夹(路径: string, 规则值: string): boolean {
  return 路径 === 规则值 || 路径.startsWith(规则值 + '/')
}

/**
 * 判断一个路径是否匹配精确文件排除
 */
function 匹配精确文件(路径: string, 规则值: string): boolean {
  return 路径 === 规则值
}

function 匹配递归文件夹(路径: string, 规则值: string): boolean {
  if (路径 === 规则值) return true
  if (路径.startsWith(规则值 + '/')) return true
  if (路径.includes('/' + 规则值 + '/')) return true
  if (路径.endsWith('/' + 规则值)) return true
  return false
}

function 匹配递归文件(路径: string, 规则值: string): boolean {
  if (路径 === 规则值) return true
  if (路径.endsWith('/' + 规则值)) return true
  return false
}

// ==================== 组合式函数 ====================

/**
 * 排除规则组合式函数
 *
 * @param 获取根节点列表 - 返回最新树形节点列表的 getter 函数
 */
export function 使用排除规则(获取根节点列表: () => 树形节点[]) {
  // ------- 响应式状态 -------
  const 精确文件夹排除列表 = ref<string[]>([])
  const 递归文件夹排除列表 = ref<string[]>([])
  const 精确文件排除列表 = ref<string[]>([])
  const 递归文件排除列表 = ref<string[]>([])
  const 豁免列表 = ref<string[]>([])
  const 通配符列表 = ref<string[]>([])
  const 占位文件夹列表 = ref<string[]>([])

  /**
   * 统一规则添加顺序列表
   * 按添加顺序记录所有「可比较」的规则（排除+豁免，不含占位文件夹）。
   * 每条记录格式："排除:值" 或 "豁免:值"
   * 获取节点状态时，在这个列表中查找匹配项，取最后匹配的索引作为后写优先依据。
   * 索引越大表示越晚添加，优先级越高。
   */
  const 全部规则顺序列表 = ref<string[]>([])

  const 排除类别集合 = new Set(['精确文件夹', '递归文件夹', '精确文件', '递归文件', '通配符'])

  const 规则键 = (类别: string, 值: string) => `${类别}:${值}`
  const 键的类别 = (键: string) => 键.split(':')[0]!
  const 键的值 = (键: string) => 键.slice(键.indexOf(':') + 1)

  function 追加规则键(类别: string, 值: string) {
    全部规则顺序列表.value.push(规则键(类别, 值))
  }

  function 移除规则键(类别: string, 值: string) {
    const 键 = 规则键(类别, 值)
    全部规则顺序列表.value = 全部规则顺序列表.value.filter((k) => k !== 键)
  }

  function 重建统一顺序列表() {
    全部规则顺序列表.value = []
    精确文件夹排除列表.value.forEach((v) => 追加规则键('精确文件夹', v))
    递归文件夹排除列表.value.forEach((v) => 追加规则键('递归文件夹', v))
    精确文件排除列表.value.forEach((v) => 追加规则键('精确文件', v))
    递归文件排除列表.value.forEach((v) => 追加规则键('递归文件', v))
    通配符列表.value.forEach((v) => 追加规则键('通配符', v))
    占位文件夹列表.value.forEach((v) => 追加规则键('占位文件夹', v))
    豁免列表.value.forEach((v) => 追加规则键('豁免', v))
  }

  const 有序规则列表 = computed<排除规则条目[]>(() => {
    return 全部规则顺序列表.value.map((键) => {
      const 类别 = 键的类别(键) as 排除规则条目['类别']
      const 值 = 键的值(键)
      return { 类别, 值 }
    })
  })

  // ------- 添加规则（自动去重 + 记录统一顺序） -------
  function 添加文件夹排除(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    const 标准化 = v.endsWith('/') ? v.slice(0, -1) : v
    if (!精确文件夹排除列表.value.includes(标准化)) {
      精确文件夹排除列表.value.push(标准化)
      追加规则键('精确文件夹', 标准化)
    }
  }

  function 添加递归文件夹排除(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    const 标准化 = v.endsWith('/') ? v.slice(0, -1) : v
    if (!递归文件夹排除列表.value.includes(标准化)) {
      递归文件夹排除列表.value.push(标准化)
      追加规则键('递归文件夹', 标准化)
    }
  }

  function 添加文件排除(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    if (!精确文件排除列表.value.includes(v)) {
      精确文件排除列表.value.push(v)
      追加规则键('精确文件', v)
    }
  }

  function 添加递归文件排除(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    if (!递归文件排除列表.value.includes(v)) {
      递归文件排除列表.value.push(v)
      追加规则键('递归文件', v)
    }
  }

  function 添加豁免(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    if (!豁免列表.value.includes(v)) {
      豁免列表.value.push(v)
      追加规则键('豁免', v)
    }
  }

  function 添加通配符(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    if (!通配符列表.value.includes(v)) {
      通配符列表.value.push(v)
      追加规则键('通配符', v)
    }
  }

  function 添加占位文件夹(值: string) {
    const v = 值.trim().replace(/\\/g, '/')
    if (!v) return
    const 标准化 = v.endsWith('/') ? v.slice(0, -1) : v
    if (标准化.includes('*') || 标准化.includes('?')) return
    if (!占位文件夹列表.value.includes(标准化)) {
      占位文件夹列表.value.push(标准化)
      追加规则键('占位文件夹', 标准化)
    }
  }

  /**
   * 自动识别：根据输入值自动调用对应的添加函数
   */
  function 添加规则(值: string) {
    const v = 值.trim()
    if (!v) return

    if (v.startsWith('@')) {
      const 占位值 = v.slice(1)
      if (!占位值.includes('*') && !占位值.includes('?')) {
        添加占位文件夹(占位值)
      }
    } else if (v.startsWith('**') && v.endsWith('/')) {
      const 去前缀 = v.slice(2)
      添加递归文件夹排除(去前缀)
    } else if (v.startsWith('**') && !v.endsWith('/')) {
      const 去前缀 = v.slice(2)
      添加递归文件排除(去前缀)
    } else if (v.endsWith('/')) {
      添加文件夹排除(v)
    } else if (v.includes('*') || v.includes('?')) {
      添加通配符(v)
    } else {
      添加文件排除(v)
    }
  }

  // ------- 恢复（删除）规则 -------
  function 恢复规则(条目: 排除规则条目) {
    switch (条目.类别) {
      case '精确文件夹':
        移除规则键('精确文件夹', 条目.值)
        精确文件夹排除列表.value = 精确文件夹排除列表.value.filter((v) => v !== 条目.值)
        break
      case '递归文件夹':
        移除规则键('递归文件夹', 条目.值)
        递归文件夹排除列表.value = 递归文件夹排除列表.value.filter((v) => v !== 条目.值)
        break
      case '精确文件':
        移除规则键('精确文件', 条目.值)
        精确文件排除列表.value = 精确文件排除列表.value.filter((v) => v !== 条目.值)
        break
      case '递归文件':
        移除规则键('递归文件', 条目.值)
        递归文件排除列表.value = 递归文件排除列表.value.filter((v) => v !== 条目.值)
        break
      case '豁免':
        移除规则键('豁免', 条目.值)
        豁免列表.value = 豁免列表.value.filter((v) => v !== 条目.值)
        break
      case '通配符':
        移除规则键('通配符', 条目.值)
        通配符列表.value = 通配符列表.value.filter((v) => v !== 条目.值)
        break
      case '占位文件夹':
        移除规则键('占位文件夹', 条目.值)
        占位文件夹列表.value = 占位文件夹列表.value.filter((v) => v !== 条目.值)
        break
    }
  }

  // ------- 清除所有 -------
  function 清除所有排除() {
    精确文件夹排除列表.value = []
    递归文件夹排除列表.value = []
    精确文件排除列表.value = []
    递归文件排除列表.value = []
    豁免列表.value = []
    通配符列表.value = []
    占位文件夹列表.value = []
    全部规则顺序列表.value = []
  }

  /**
   * 在统一顺序列表中查找路径最后一次匹配的索引（-1 表示未匹配）
   * 只查找「排除」类别的规则
   */
  function 查找排除最后索引(路径: string): number {
    let 最后索引 = -1
    for (let i = 全部规则顺序列表.value.length - 1; i >= 0; i--) {
      const 键 = 全部规则顺序列表.value[i]!
      const 类别 = 键的类别(键)
      if (!排除类别集合.has(类别 as any)) continue
      const 值 = 键的值(键)
      if (类别 === '精确文件夹' && 匹配精确文件夹(路径, 值)) {
        最后索引 = i
        break
      }
      if (类别 === '递归文件夹' && 匹配递归文件夹(路径, 值)) {
        最后索引 = i
        break
      }
      if (类别 === '精确文件' && 匹配精确文件(路径, 值)) {
        最后索引 = i
        break
      }
      if (类别 === '递归文件' && 匹配递归文件(路径, 值)) {
        最后索引 = i
        break
      }
      if (类别 === '通配符' && 匹配通配符(路径, 值)) {
        最后索引 = i
        break
      }
    }
    return 最后索引
  }

  /**
   * 在统一顺序列表中查找路径最后一次匹配的索引（-1 表示未匹配）
   * 只查找「豁免」类别的规则，含向下传递和向上传递
   */
  function 查找豁免最后索引(路径: string): number {
    // 占位文件夹的子文件不可豁免
    if (是否被占位排除(路径) === true) return -1

    for (let i = 全部规则顺序列表.value.length - 1; i >= 0; i--) {
      const 键 = 全部规则顺序列表.value[i]!
      if (键的类别(键) !== '豁免') continue
      const 豁免值 = 键的值(键)
      // 完全匹配
      if (路径 === 豁免值) return i
      // 向下传递：路径是豁免值的子路径
      if (路径.startsWith(豁免值 + '/')) return i
      // 向上传递：豁免值是路径的子路径
      if (豁免值.startsWith(路径 + '/')) return i
    }
    return -1
  }

  // ------- 旧接口保持兼容 -------

  function 匹配精确文件夹排除列表(路径: string): boolean {
    for (const 文件夹值 of 精确文件夹排除列表.value) {
      if (匹配精确文件夹(路径, 文件夹值)) return true
    }
    return false
  }

  function 匹配精确文件排除列表(路径: string): boolean {
    for (const 文件值 of 精确文件排除列表.value) {
      if (匹配精确文件(路径, 文件值)) return true
    }
    return false
  }

  function 匹配递归文件夹排除列表(路径: string): boolean {
    for (const 递归值 of 递归文件夹排除列表.value) {
      if (匹配递归文件夹(路径, 递归值)) return true
    }
    return false
  }

  function 匹配递归文件排除列表(路径: string): boolean {
    for (const 递归文件值 of 递归文件排除列表.value) {
      if (匹配递归文件(路径, 递归文件值)) return true
    }
    return false
  }

  function 匹配通配符排除列表(路径: string): boolean {
    for (const 通配符值 of 通配符列表.value) {
      if (匹配通配符(路径, 通配符值)) return true
    }
    return false
  }

  // ==================== 占位文件夹判断 ====================

  function 是否被占位排除(路径: string): boolean | 'placeholder' {
    for (const 占位值 of 占位文件夹列表.value) {
      if (路径 === 占位值) return 'placeholder'
      if (路径.startsWith(占位值 + '/')) return true
    }
    return false
  }

  // ==================== 核心判断函数 ====================

  function 是否被排除(路径: string): boolean {
    const 占位结果 = 是否被占位排除(路径)
    if (占位结果 === true) return true

    for (const 文件夹值 of 精确文件夹排除列表.value) {
      if (匹配精确文件夹(路径, 文件夹值)) return true
    }
    for (const 递归值 of 递归文件夹排除列表.value) {
      if (匹配递归文件夹(路径, 递归值)) return true
    }
    for (const 文件值 of 精确文件排除列表.value) {
      if (匹配精确文件(路径, 文件值)) return true
    }
    for (const 递归文件值 of 递归文件排除列表.value) {
      if (匹配递归文件(路径, 递归文件值)) return true
    }
    for (const 通配符值 of 通配符列表.value) {
      if (匹配通配符(路径, 通配符值)) return true
    }
    return false
  }

  function 是否被豁免(路径: string): boolean {
    return 查找豁免最后索引(路径) !== -1
  }

  function 是否直接豁免(路径: string): boolean {
    if (是否被占位排除(路径) === true) return false
    const normalizedPath = 路径.replace(/\/$/, '')
    return 豁免列表.value.some((豁免值) => {
      const normalizedExempt = 豁免值.replace(/\/$/, '')
      return normalizedPath === normalizedExempt
    })
  }

  /**
   * 获取节点最终显示状态
   *
   * 优先级：
   * 1. 占位文件夹 → placeholder（最高优先级，不可被任何规则覆盖）
   * 2. 占位文件夹的子文件 → excluded（不可豁免）
   * 3. 在统一顺序列表中查找排除和豁免的最后匹配位置
   *    后添加的规则（索引更大）胜出
   */
  function 获取节点状态(路径: string): 节点状态 {
    const 占位结果 = 是否被占位排除(路径)
    if (占位结果 === 'placeholder') return 'placeholder'
    if (占位结果 === true) return 'excluded'

    const 排除索引 = 查找排除最后索引(路径)
    const 豁免索引 = 查找豁免最后索引(路径)

    if (排除索引 === -1 && 豁免索引 === -1) return 'normal'
    if (豁免索引 === -1) return 'excluded'
    if (排除索引 === -1) return 'exempted'
    // 两者都有，在统一顺序列表中谁更靠后谁胜出
    return 豁免索引 > 排除索引 ? 'exempted' : 'excluded'
  }

  // ------- 获取排除来源类别 -------

  function 获取排除规则类别(路径: string): 排除来源类别 {
    const 占位结果 = 是否被占位排除(路径)
    if (占位结果 === 'placeholder') return '占位文件夹'
    if (占位结果 === true) return '占位文件夹'
    if (匹配精确文件夹排除列表(路径)) return '精确文件夹'
    if (匹配递归文件夹排除列表(路径)) return '递归文件夹'
    if (匹配精确文件排除列表(路径)) return '精确文件'
    if (匹配递归文件排除列表(路径)) return '递归文件'
    if (匹配通配符排除列表(路径)) return '通配符'
    return null
  }

  function 获取排除规则类别列表(路径: string): 排除来源类别[] {
    const 结果: 排除来源类别[] = []
    const 占位结果 = 是否被占位排除(路径)
    if (占位结果 === 'placeholder' || 占位结果 === true) 结果.push('占位文件夹')
    if (匹配精确文件夹排除列表(路径)) 结果.push('精确文件夹')
    if (匹配递归文件夹排除列表(路径)) 结果.push('递归文件夹')
    if (匹配精确文件排除列表(路径)) 结果.push('精确文件')
    if (匹配递归文件排除列表(路径)) 结果.push('递归文件')
    if (匹配通配符排除列表(路径)) 结果.push('通配符')
    return 结果
  }

  // ------- 获取所有被排除（且未豁免）的扁平路径列表 -------
  const 排除路径列表 = computed(() => {
    const 结果: string[] = []
    const 当前节点列表 = 获取根节点列表()
    function 遍历(节点列表: 树形节点[]) {
      for (const 节点 of 节点列表) {
        if (是否被占位排除(节点.path) === 'placeholder') {
          if (节点.children) 遍历(节点.children)
          continue
        }
        if (是否被排除(节点.path) && !是否被豁免(节点.path)) {
          结果.push(节点.path)
        }
        if (节点.children) 遍历(节点.children)
      }
    }
    遍历(当前节点列表)
    return 结果
  })

  // ==================== 公开接口 ====================

  return {
    // 状态
    精确文件夹排除列表,
    递归文件夹排除列表,
    精确文件排除列表,
    递归文件排除列表,
    豁免列表,
    通配符列表,
    占位文件夹列表,
    有序规则列表,
    排除路径列表,

    // 添加
    添加文件夹排除,
    添加递归文件夹排除,
    添加文件排除,
    添加递归文件排除,
    添加豁免,
    添加通配符,
    添加占位文件夹,
    添加规则,

    // 删除/清除
    恢复规则,
    清除所有排除,

    // 判断
    是否被排除,
    是否被豁免,
    是否直接豁免,
    是否被占位排除,
    获取节点状态,
    获取排除规则类别,
    获取排除规则类别列表,

    // 加载重建（供外部调用）
    重建统一顺序列表,
  }
}
