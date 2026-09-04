import { ref, computed } from 'vue'
import type { 排除规则条目 } from '../类型/index'

export const 规则类别标签: Record<排除规则条目['类别'], string> = {
  精确文件夹: '📁 文件夹',
  递归文件夹: '📂 递归文件夹',
  精确文件: '📄 文件',
  递归文件: '📝 递归文件',
  豁免: '⭐ 豁免',
  通配符: '* 通配符',
  占位文件夹: '🔴 占位',
}

export function 使用全局规则() {
  const 精确文件夹排除列表 = ref<string[]>([])
  const 递归文件夹排除列表 = ref<string[]>([])
  const 精确文件排除列表 = ref<string[]>([])
  const 递归文件排除列表 = ref<string[]>([])
  const 豁免列表 = ref<string[]>([])
  const 通配符列表 = ref<string[]>([])
  const 占位文件夹列表 = ref<string[]>([])

  const 全部规则顺序列表 = ref<string[]>([])

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

  function 添加文件夹排除(路径: string) {
    if (!精确文件夹排除列表.value.includes(路径)) {
      精确文件夹排除列表.value.push(路径)
      追加规则键('精确文件夹', 路径)
    }
  }

  function 添加递归文件夹排除(路径: string) {
    const v = 路径.trim().replace(/\\/g, '/')
    if (!v) return
    const 标准化 = v.endsWith('/') ? v.slice(0, -1) : v
    if (!递归文件夹排除列表.value.includes(标准化)) {
      递归文件夹排除列表.value.push(标准化)
      追加规则键('递归文件夹', 标准化)
    }
  }

  function 添加文件排除(路径: string) {
    if (!精确文件排除列表.value.includes(路径)) {
      精确文件排除列表.value.push(路径)
      追加规则键('精确文件', 路径)
    }
  }

  function 添加递归文件排除(路径: string) {
    const v = 路径.trim().replace(/\\/g, '/')
    if (!v) return
    if (!递归文件排除列表.value.includes(v)) {
      递归文件排除列表.value.push(v)
      追加规则键('递归文件', v)
    }
  }

  function 添加豁免(路径: string) {
    if (!豁免列表.value.includes(路径)) {
      豁免列表.value.push(路径)
      追加规则键('豁免', 路径)
    }
  }

  function 添加通配符(模式: string) {
    if (!通配符列表.value.includes(模式)) {
      通配符列表.value.push(模式)
      追加规则键('通配符', 模式)
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

  return {
    精确文件夹排除列表,
    递归文件夹排除列表,
    精确文件排除列表,
    递归文件排除列表,
    豁免列表,
    通配符列表,
    占位文件夹列表,
    有序规则列表,
    添加文件夹排除,
    添加递归文件夹排除,
    添加文件排除,
    添加递归文件排除,
    添加豁免,
    添加通配符,
    添加占位文件夹,
    恢复规则,
    清除所有排除,
    重建统一顺序列表,
  }
}
