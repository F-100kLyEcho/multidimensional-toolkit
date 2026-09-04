import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { 卡片节点, 图标类型枚举 } from '@/页面/启动/类型/菜单类型'

/** 判断是否在 Electron 环境 */
const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动读取卡片

/** 22 色彩盘 */
export const 色盘 = ['#000000', '#353D45', '#5D6770', '#939AA0', '#F0F4F4', '#F0F7DA', '#C9DF8A', '#77AB59', '#36802D', '#234D20', '#1d6b5d', '#2d5a8f', '#5878ca', '#E6D4FF', '#d18fa8', '#b34a4a', '#bb241a', '#E65829', '#C97132', '#E69729', '#F2D863', '#FFFD91']

export const 使用卡片仓库 = defineStore('卡片仓库', () => {
  const 卡片列表 = ref<卡片节点[]>([])
  let 后端配置 = { 下一级菜单ID: 0, 下一级卡片ID: 0 }

  /**
   * 加载所有卡片数据
   * 先读取配置获取最新的 ID 计数器，再读取所有卡片
   */
  async function 加载卡片数据() {
    if (!是Electron) {
      卡片列表.value = []
      return
    }
    try {
      // 读取配置获取 ID 计数器
      const 配置结果 = await window.electronAPI.启动读取配置()
      if (配置结果.成功) {
        后端配置 = { ...配置结果.配置 }
      }

      // 读取所有卡片
      const 结果 = await window.electronAPI.启动列出所有卡片()
      if (结果.成功) {
        卡片列表.value = 结果.卡片列表
      } else {
        卡片列表.value = []
      }
    } catch (e) {
      console.error('读取卡片数据失败', e)
      卡片列表.value = []
    }
  }

  /**
   * 保存卡片到后端（按归属菜单ID分组保存）
   * 由菜单仓库在菜单变更时触发完整保存
   */
  async function 保存所有卡片(): Promise<void> {
    if (!是Electron) return
    try {
      // 保存配置：只传卡片ID字段，避免覆盖菜单仓库的下一级菜单ID
      await window.electronAPI.启动保存配置({ 下一级卡片ID: 后端配置.下一级卡片ID })

      // 按归属菜单ID分组
      const 分组 = new Map<number, 卡片节点[]>()
      for (const 卡片 of 卡片列表.value) {
        const 已有 = 分组.get(卡片.归属菜单ID) || []
        已有.push(卡片)
        分组.set(卡片.归属菜单ID, 已有)
      }

      // 逐个保存每个菜单的卡片文件
      for (const [菜单ID, 卡片s] of 分组) {
        await window.electronAPI.启动保存卡片(菜单ID, JSON.parse(JSON.stringify(卡片s)))
      }
    } catch (e) {
      console.error('保存卡片数据失败', e)
    }
  }

  /** 新增卡片 */
  function 新增卡片(卡片: { 标题: string; 类型: 'url' | 'folder' | 'app'; 值: string; 归属菜单ID: number | null; 背景颜色?: string; 图标类型?: 图标类型枚举; 图标文字?: string | null; 图标代码?: string | null }) {
    const 新ID = 后端配置.下一级卡片ID++
    const 新卡片: 卡片节点 = {
      唯一ID: 新ID,
      标题: 卡片.标题,
      类型: 卡片.类型,
      值: 卡片.值,
      归属菜单ID: 卡片.归属菜单ID ?? 0,
      排序: 卡片列表.value.length + 1,
      背景颜色: 卡片.背景颜色 ?? (色盘[卡片列表.value.length % 色盘.length] as string),
      图标代码: 卡片.图标代码 ?? null,
      图片路径: null,
      图标类型: 卡片.图标类型 ?? 'default',
      图标文字: 卡片.图标文字 ?? null,
    }
    卡片列表.value.push(新卡片)
    保存所有卡片()
    return 新卡片
  }

  /** 更新卡片字段 */
  function 更新卡片(卡片ID: number, 更新: Partial<卡片节点>) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    Object.assign(卡片, 更新)
    保存所有卡片()
  }

  /**
   * 批量更新图标代码：把「旧图标值 → 新图标值」的映射一次性应用到所有卡片。
   * 与逐个调用 `更新卡片` 不同，本方法只写盘一次（避免 N 张卡片触发 N 次保存）。
   * @returns 实际被修改的卡片数量
   */
  function 批量更新图标代码(替换映射: Record<string, string>, 保存 = true): number {
    let 改动数 = 0
    for (const 卡片 of 卡片列表.value) {
      const 新值 = 卡片.图标代码 ? 替换映射[卡片.图标代码] : undefined
      if (新值 !== undefined && 新值 !== 卡片.图标代码) {
        卡片.图标代码 = 新值
        改动数++
      }
    }
    if (改动数 > 0 && 保存) 保存所有卡片()
    return 改动数
  }

  /** 被删图标后的引用迁移：url 卡片用同域名替代图标，无替代或非 url 卡片降级为默认图标（清空图标代码），杜绝断链 */
  function 迁移被删图标引用(被删值: string, 替代值: string | null): number {
    let 改动数 = 0
    for (const 卡片 of 卡片列表.value) {
      if (卡片.图标代码 !== 被删值) continue
      卡片.图标代码 = 卡片.类型 === 'url' && 替代值 ? 替代值 : ''
      改动数++
    }
    if (改动数 > 0) 保存所有卡片()
    return 改动数
  }

  /** 删除卡片 */
  function 删除卡片(卡片ID: number) {
    const 索引 = 卡片列表.value.findIndex((c) => c.唯一ID === 卡片ID)
    if (索引 === -1) return
    const 卡片 = 卡片列表.value[索引]
    if (卡片) {
      // 如果有图片路径，删除图片
      if (卡片.图片路径 && 是Electron) {
        window.electronAPI.启动删除卡片图片(卡片.归属菜单ID, 卡片.图片路径).catch(() => {})
      }
    }
    卡片列表.value.splice(索引, 1)
    保存所有卡片()
  }

  /** 删除归属于指定二级菜单的所有卡片（内存 + 磁盘清除） */
  function 删除归属于菜单的卡片(菜单ID: number) {
    // 立即通知后端删除该菜单的卡片文件夹（空数组触发后端清理）
    if (是Electron) {
      window.electronAPI.启动保存卡片(菜单ID, [])
    }
    // 从内存中清除
    卡片列表.value = 卡片列表.value.filter((c) => c.归属菜单ID !== 菜单ID)
  }

  /** 重命名卡片 */
  function 重命名卡片(卡片ID: number, 新标题: string) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    卡片.标题 = 新标题
    保存所有卡片()
  }

  /** 修改卡片背景颜色 */
  function 修改卡片颜色(卡片ID: number, 新颜色: string) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    卡片.背景颜色 = 新颜色
    保存所有卡片()
  }

  /** 设置卡片图片路径（确认保存图标后调用） */
  function 设置卡片图片(卡片ID: number, 图片路径: string) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    卡片.图片路径 = 图片路径
    卡片.图标类型 = 'image'
    保存所有卡片()
  }

  /** 同菜单内卡片重新排序 */
  function 重新排序(菜单ID: number, 旧索引: number, 新索引: number) {
    const 该菜单卡片 = 卡片列表.value.filter((c) => c.归属菜单ID === 菜单ID)
    if (旧索引 < 0 || 新索引 < 0 || 旧索引 >= 该菜单卡片.length || 新索引 >= 该菜单卡片.length) return
    const [移动项] = 该菜单卡片.splice(旧索引, 1)
    if (!移动项) return
    该菜单卡片.splice(新索引, 0, 移动项)
    该菜单卡片.forEach((卡片, 索引) => {
      卡片.排序 = 索引 + 1
    })
    卡片列表.value.sort((a, b) => a.排序 - b.排序)
    保存所有卡片()
  }

  /** 跨菜单移动卡片（新索引为 -1 时移到末尾） */
  function 移动卡片(卡片ID: number, 目标菜单ID: number, 新索引: number) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    const 源菜单ID = 卡片.归属菜单ID
    卡片.归属菜单ID = 目标菜单ID

    const 源菜单卡片 = 卡片列表.value.filter((c) => c.归属菜单ID === 源菜单ID)
    源菜单卡片.forEach((c, 索引) => {
      c.排序 = 索引 + 1
    })

    const 目标菜单卡片 = 卡片列表.value.filter((c) => c.归属菜单ID === 目标菜单ID)
    const 目标索引 = 新索引 === -1 ? 目标菜单卡片.length : Math.min(新索引, 目标菜单卡片.length - 1)
    目标菜单卡片.splice(目标索引, 0, 卡片)
    目标菜单卡片.forEach((c, 索引) => {
      c.排序 = 索引 + 1
    })

    保存所有卡片()
  }

  /** 剪贴板：存储复制的卡片数据 */
  const 卡片剪贴板 = ref<Omit<卡片节点, '唯一ID' | '归属菜单ID' | '排序' | '图片路径'> | null>(null)

  /** 复制卡片到剪贴板 */
  function 复制卡片(卡片ID: number) {
    const 卡片 = 卡片列表.value.find((c) => c.唯一ID === 卡片ID)
    if (!卡片) return
    卡片剪贴板.value = {
      标题: 卡片.标题,
      类型: 卡片.类型,
      值: 卡片.值,
      背景颜色: 卡片.背景颜色,
      图标代码: 卡片.图标代码,
      图标类型: 卡片.图标类型,
      图标文字: 卡片.图标文字,
    }
  }

  /** 粘贴卡片到指定菜单（粘贴后清空剪贴板） */
  function 粘贴卡片(目标菜单ID: number) {
    if (!卡片剪贴板.value) return
    新增卡片({
      标题: 卡片剪贴板.value.标题,
      类型: 卡片剪贴板.value.类型,
      值: 卡片剪贴板.value.值,
      归属菜单ID: 目标菜单ID,
      背景颜色: 卡片剪贴板.value.背景颜色,
      图标类型: 卡片剪贴板.value.图标类型,
      图标文字: 卡片剪贴板.value.图标文字,
      图标代码: 卡片剪贴板.value.图标代码,
    })
    卡片剪贴板.value = null
  }

  // 初始化加载
  加载卡片数据()

  return {
    卡片列表,
    后端配置,
    加载卡片数据,
    保存所有卡片,
    新增卡片,
    更新卡片,
    批量更新图标代码,
    迁移被删图标引用,
    删除卡片,
    删除归属于菜单的卡片,
    重命名卡片,
    修改卡片颜色,
    设置卡片图片,
    重新排序,
    移动卡片,
    卡片剪贴板,
    复制卡片,
    粘贴卡片,
  }
})
