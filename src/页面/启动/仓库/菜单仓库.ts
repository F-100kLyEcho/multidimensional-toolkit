import { defineStore } from 'pinia'
import { reactive, ref, watch } from 'vue'
import type { 一级菜单节点, 二级菜单节点 } from '@/页面/启动/类型/菜单类型'

/** 判断是否在 Electron 环境 */
const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动读取菜单结构

/** 防抖工具 */
function 防抖<T extends (...args: any[]) => any>(fn: T, 延迟: number) {
  let 定时器: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (定时器) clearTimeout(定时器)
    定时器 = setTimeout(() => fn(...args), 延迟)
  }
}

export const 使用菜单仓库 = defineStore('启动菜单仓库', () => {
  const 菜单列表 = ref<一级菜单节点[]>([])
  const 当前选中ID = ref<number | null>(null)
  const 最后选中二级菜单ID = ref<number | null>(null)
  const 折叠状态 = reactive(new Map<number, boolean>())
  const 是否紧凑 = ref(false)
  const 数据已加载 = ref(false)
  const 搜索词 = ref('')

  /** 后端配置缓存（用于 ID 分配和保存） */
  let 后端配置 = { 下一级菜单ID: 0, 下一级卡片ID: 0, 折叠状态: {} as Record<number, boolean>, 是否紧凑: false }
  let 加载中 = false

  /** 从后端加载数据 */
  async function 加载数据() {
    加载中 = true
    if (!是Electron) {
      菜单列表.value = []
      初始化折叠状态({})
      加载中 = false
      数据已加载.value = true
      return
    }
    try {
      // 读取配置
      const 配置结果 = await window.electronAPI.启动读取配置()
      if (配置结果.成功) {
        后端配置 = { ...配置结果.配置 }
      }

      // 读取菜单结构
      const 菜单结果 = await window.electronAPI.启动读取菜单结构()
      if (菜单结果.成功) {
        菜单列表.value = 菜单结果.菜单结构.一级菜单列表
      } else {
        菜单列表.value = []
      }

      // 从配置中恢复折叠状态
      const 已保存折叠状态 = 配置结果.成功 ? 配置结果.配置.折叠状态 || {} : {}
      初始化折叠状态(已保存折叠状态)

      // 从配置中恢复紧凑模式状态
      是否紧凑.value = 配置结果.成功 ? (配置结果.配置.是否紧凑 ?? false) : false
    } catch (e) {
      console.error('读取启动数据失败', e)
      菜单列表.value = []
      初始化折叠状态({})
    } finally {
      加载中 = false
      数据已加载.value = true
    }
  }

  /** 保存数据到后端（防抖 500ms，保存菜单结构、配置和折叠状态） */
  const 保存数据 = 防抖(async () => {
    if (!是Electron || 加载中) return
    try {
      // 保存配置：菜单ID字段 + 折叠状态
      const 折叠状态记录: Record<number, boolean> = {}
      折叠状态.forEach((值, 键) => {
        折叠状态记录[键] = 值
      })
      await window.electronAPI.启动保存配置({ 下一级菜单ID: 后端配置.下一级菜单ID, 折叠状态: 折叠状态记录, 是否紧凑: 是否紧凑.value })

      // 保存菜单结构
      await window.electronAPI.启动保存菜单结构({
        一级菜单列表: JSON.parse(JSON.stringify(菜单列表.value)),
      })
    } catch (e) {
      console.error('保存菜单数据失败', e)
    }
  }, 500)

  function 初始化折叠状态(已保存状态: Record<number, boolean> = {}) {
    折叠状态.clear()
    菜单列表.value.forEach((菜单) => {
      折叠状态.set(菜单.唯一ID, 已保存状态[菜单.唯一ID] ?? false)
    })
  }

  function 切换折叠(节点id: number) {
    const 当前 = 折叠状态.get(节点id)
    if (当前 !== undefined) {
      折叠状态.set(节点id, !当前)
    }
  }

  /**
   * 设置选中节点
   */
  function 设置选中(节点id: number | null) {
    当前选中ID.value = 节点id
    if (节点id === null) return

    // 判断是否为二级菜单
    for (const 一级 of 菜单列表.value) {
      const 找到 = 一级.子菜单.find((s) => s.唯一ID === 节点id)
      if (找到) {
        最后选中二级菜单ID.value = 节点id
        localStorage.setItem('最后选中二级菜单ID', JSON.stringify(节点id))
        return
      }
    }
  }

  /** 判断指定 ID 是否为二级菜单节点 */
  function 是否是二级菜单ID(节点id: number): boolean {
    for (const 一级 of 菜单列表.value) {
      if (一级.子菜单.some((s) => s.唯一ID === 节点id)) return true
    }
    return false
  }

  /** 获取指定二级菜单所属的一级菜单 ID */
  function 获取父级一级菜单ID(二级菜单ID: number): number | null {
    for (const 一级 of 菜单列表.value) {
      if (一级.子菜单.some((s) => s.唯一ID === 二级菜单ID)) return 一级.唯一ID
    }
    return null
  }

  function 是否折叠(节点id: number): boolean {
    return 折叠状态.get(节点id) ?? false
  }

  /** 折叠所有一级菜单 */
  function 折叠全部() {
    菜单列表.value.forEach((菜单) => {
      折叠状态.set(菜单.唯一ID, true)
    })
  }

  /** 一级菜单拖拽排序：将旧索引的菜单移动到新索引位置 */
  function 排序一级菜单(旧索引: number, 新索引: number) {
    const 列表 = 菜单列表.value
    if (旧索引 < 0 || 新索引 < 0 || 旧索引 >= 列表.length || 新索引 >= 列表.length) return
    const [移动项] = 列表.splice(旧索引, 1)
    if (!移动项) return
    列表.splice(新索引, 0, 移动项)
    列表.forEach((菜单, 索引) => {
      菜单.排序 = 索引 + 1
    })
    保存数据()
  }

  /** 二级菜单拖拽排序：在同一父级内将旧索引的子菜单移动到新索引位置 */
  function 排序二级菜单(父级ID: number, 旧索引: number, 新索引: number) {
    const 父菜单 = 菜单列表.value.find((m) => m.唯一ID === 父级ID)
    if (!父菜单) return
    const 子列表 = 父菜单.子菜单
    if (旧索引 < 0 || 新索引 < 0 || 旧索引 >= 子列表.length || 新索引 >= 子列表.length) return
    const [移动项] = 子列表.splice(旧索引, 1)
    if (!移动项) return
    子列表.splice(新索引, 0, 移动项)
    子列表.forEach((子菜单, 索引) => {
      子菜单.排序 = 索引 + 1
    })
    保存数据()
  }

  /** 二级菜单跨级排序：将二级菜单从来源父级移动到目标父级 */
  function 跨级排序二级菜单(来源父级ID: number, 目标父级ID: number, 旧索引: number, 新索引: number, 拖拽项ID: number) {
    const 来源父菜单 = 菜单列表.value.find((m) => m.唯一ID === 来源父级ID)
    const 目标父菜单 = 菜单列表.value.find((m) => m.唯一ID === 目标父级ID)
    if (!来源父菜单 || !目标父菜单) return

    if (来源父级ID === 目标父级ID) {
      // 同父级内排序
      排序二级菜单(来源父级ID, 旧索引, 新索引)
      return
    }

    // 跨父级移动
    const 移动索引 = 来源父菜单.子菜单.findIndex((s) => s.唯一ID === 拖拽项ID)
    if (移动索引 === -1) return
    const [移动项] = 来源父菜单.子菜单.splice(移动索引, 1)
    if (!移动项) return
    目标父菜单.子菜单.splice(新索引, 0, 移动项)

    // 更新排序字段
    来源父菜单.子菜单.forEach((子菜单, 索引) => {
      子菜单.排序 = 索引 + 1
    })
    目标父菜单.子菜单.forEach((子菜单, 索引) => {
      子菜单.排序 = 索引 + 1
    })
    保存数据()
  }

  /** 新增一级菜单 */
  function 新增一级菜单(名称?: string) {
    const 新名称 = 名称?.trim() || '新建菜单'
    const 新ID = 后端配置.下一级菜单ID++
    const 新菜单: 一级菜单节点 = {
      唯一ID: 新ID,
      菜单名称: 新名称,
      图标代码: 'fas fa-folder',
      排序: 菜单列表.value.length + 1,
      子菜单: [],
    }
    菜单列表.value.push(新菜单)
    折叠状态.set(新ID, false)
    保存数据()
  }

  /** 新增二级菜单 */
  function 新增二级菜单(父级id: number, 名称?: string) {
    const 父菜单 = 菜单列表.value.find((m) => m.唯一ID === 父级id)
    if (!父菜单) return

    const 新名称 = 名称?.trim() || '新建菜单'
    const 新ID = 后端配置.下一级菜单ID++
    const 新子菜单: 二级菜单节点 = {
      唯一ID: 新ID,
      菜单名称: 新名称,
      图标代码: 'fas fa-archive',
      排序: 父菜单.子菜单.length + 1,
      关联卡片ID: null,
    }
    父菜单.子菜单.push(新子菜单)
    折叠状态.set(父级id, false)
    保存数据()
  }

  /** 删除一级菜单 */
  function 删除一级菜单(菜单id: number) {
    const 索引 = 菜单列表.value.findIndex((m) => m.唯一ID === 菜单id)
    if (索引 === -1) return
    菜单列表.value.splice(索引, 1)
    折叠状态.delete(菜单id)
    if (当前选中ID.value === 菜单id) 当前选中ID.value = null
    保存数据()
  }

  /** 删除二级菜单 */
  function 删除二级菜单(父级id: number, 子菜单id: number) {
    const 父菜单 = 菜单列表.value.find((m) => m.唯一ID === 父级id)
    if (!父菜单) return
    const 索引 = 父菜单.子菜单.findIndex((s) => s.唯一ID === 子菜单id)
    if (索引 === -1) return
    父菜单.子菜单.splice(索引, 1)
    if (当前选中ID.value === 子菜单id) 当前选中ID.value = null
    if (最后选中二级菜单ID.value === 子菜单id) 最后选中二级菜单ID.value = null
    保存数据()
  }

  /** 重命名一级菜单 */
  function 重命名一级菜单(菜单id: number, 新名称: string) {
    const 菜单 = 菜单列表.value.find((m) => m.唯一ID === 菜单id)
    if (!菜单) return
    菜单.菜单名称 = 新名称
    保存数据()
  }

  /** 重命名二级菜单 */
  function 重命名二级菜单(子菜单id: number, 新名称: string) {
    for (const 菜单 of 菜单列表.value) {
      const 子菜单 = 菜单.子菜单.find((s) => s.唯一ID === 子菜单id)
      if (子菜单) {
        子菜单.菜单名称 = 新名称
        保存数据()
        return
      }
    }
  }

  /** 更新一级菜单图标代码 */
  function 更新一级菜单图标(菜单id: number, 图标代码: string) {
    const 菜单 = 菜单列表.value.find((m) => m.唯一ID === 菜单id)
    if (!菜单) return
    菜单.图标代码 = 图标代码
    保存数据()
  }

  /** 更新二级菜单图标代码 */
  function 更新二级菜单图标(子菜单id: number, 图标代码: string) {
    for (const 菜单 of 菜单列表.value) {
      const 子菜单 = 菜单.子菜单.find((s) => s.唯一ID === 子菜单id)
      if (子菜单) {
        子菜单.图标代码 = 图标代码
        保存数据()
        return
      }
    }
  }

  /** 获取所有二级菜单的扁平列表（按一级→二级排序） */
  function 获取所有二级菜单列表(): { 唯一ID: number; 父级ID: number }[] {
    const 结果: { 唯一ID: number; 父级ID: number }[] = []
    for (const 一级 of 菜单列表.value) {
      for (const 二级 of 一级.子菜单) {
        结果.push({ 唯一ID: 二级.唯一ID, 父级ID: 一级.唯一ID })
      }
    }
    return 结果
  }

  /** 获取当前展开的一级菜单下的二级菜单列表（折叠状态过滤版） */
  function 获取展开的二级菜单列表(): { 唯一ID: number; 父级ID: number }[] {
    const 结果: { 唯一ID: number; 父级ID: number }[] = []
    for (const 一级 of 菜单列表.value) {
      // 跳过折叠的一级菜单
      if (折叠状态.get(一级.唯一ID) !== false) continue
      for (const 二级 of 一级.子菜单) {
        结果.push({ 唯一ID: 二级.唯一ID, 父级ID: 一级.唯一ID })
      }
    }
    return 结果
  }

  /** 根据当前选中的二级菜单，获取上一个/下一个二级菜单的ID（循环，仅在展开的菜单中切换） */
  function 获取相邻二级菜单(当前ID: number | null, 方向: 'prev' | 'next'): number | null {
    if (当前ID === null) return null
    const 全部 = 获取展开的二级菜单列表()
    if (全部.length === 0) return null
    const 当前索引 = 全部.findIndex((m) => m.唯一ID === 当前ID)
    if (当前索引 === -1) return null
    const 总个数 = 全部.length
    const 目标索引 = 方向 === 'next' ? (当前索引 + 1) % 总个数 : (当前索引 - 1 + 总个数) % 总个数
    const 目标 = 全部[目标索引]
    return 目标 ? 目标.唯一ID : null
  }

  // 初始化时加载数据
  加载数据()

  // 状态变更时自动保存
  watch(
    折叠状态,
    () => {
      保存数据()
    },
    { deep: true },
  )

  watch(是否紧凑, () => {
    保存数据()
  })

  return {
    菜单列表,
    当前选中ID,
    最后选中二级菜单ID,
    折叠状态,
    是否紧凑,
    数据已加载,
    搜索词,
    加载数据,
    切换折叠,
    设置选中,
    是否是二级菜单ID,
    获取父级一级菜单ID,
    是否折叠,
    折叠全部,
    排序一级菜单,
    排序二级菜单,
    跨级排序二级菜单,
    新增一级菜单,
    新增二级菜单,
    删除一级菜单,
    删除二级菜单,
    重命名一级菜单,
    重命名二级菜单,
    更新一级菜单图标,
    更新二级菜单图标,
    获取所有二级菜单列表,
    获取相邻二级菜单,
  }
})
