import { defineStore } from 'pinia'
import { ref, reactive, computed, watch } from 'vue'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import type { 一级菜单节点 } from '@/页面/启动/类型/菜单类型'

/** 图标项 */
export interface 图标项 {
  值: string
  显示名: string
  绑定域名?: string
}

/** 分组 */
export interface 图标分组 {
  名称: string
  图标: 图标项[]
  是否内置: boolean
}

/** 类别数据 */
export interface 图标类别数据 {
  分组列表: 图标分组[]
}

/** 完整图标库数据 */
export interface 图标库数据 {
  版本: string
  最后更新: number
  fontawesome: 图标类别数据
  emoji: 图标类别数据
  userUpload: 图标类别数据
  urlDownload: 图标类别数据
}

/** 类别键 */
export type 图标类别键 = 'fontawesome' | 'emoji' | 'urlDownload' | 'userUpload'

/** 类别显示名映射 */
export const 类别显示名: Record<图标类别键, string> = {
  fontawesome: 'FA 图标',
  emoji: 'Emoji',
  userUpload: '全局图标',
  urlDownload: '网页图标',
}

/** 域名规范化：任意形式 URL/hostname → hostname（去 www.、小写），无法解析返回 '' */
export function 规范化域名(输入: string): string {
  if (!输入) return ''
  let 源 = 输入.trim()
  if (!/^https?:/i.test(源)) 源 = `https://${源}`
  try {
    return new URL(源).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

/** 类别标签页配置 */
export interface 类别标签 {
  键: 图标类别键
  显示名: string
  fa类名: string
  图标计数: number
}

/** 颜色配置结构 */
export interface 图标库颜色配置 {
  类别背景颜色: Record<图标类别键, string>
  类别透明背景: Record<图标类别键, boolean>
  颜色历史: string[]
}

const 是Electron = typeof window !== 'undefined' && window.electronAPI?.图标库读取数据

/** 图片缓存最大条数（LRU 超出时淘汰最久未访问条目） */
const 图片缓存上限 = 200
/** 图片懒加载并发读取上限，避免渲染整屏时一次性发起过多 IPC */
const 图片并发上限 = 12

export const 使用图标库仓库 = defineStore('图标库仓库', () => {
  // ===== 状态 =====
  const 原始数据 = ref<图标库数据 | null>(null)
  const 加载中 = ref(false)
  const 错误信息 = ref('')
  const 图片缓存 = reactive(new Map<string, string>()) // 图标值 -> base64（LRU，上限见 图片缓存上限）
  let 缓存访问序号 = 0
  const 缓存访问序 = new Map<string, number>() // 图标值 -> 最后访问序号（LRU 判定用）
  const 图片加载任务 = new Map<string, Promise<string>>() // 加载中（含排队）的 promise，防并发重复
  const 图片等待队列: string[] = [] // 懒加载排队列表
  const 图片排队中 = new Set<string>() // 已入队的图标值，防重复入队
  let 活跃图片读取 = 0

  // ===== 排序状态 =====
  const 排序方向 = ref<'升序' | '降序'>('升序')
  const 搜索词 = ref('')

  // ===== 当前选中状态 =====
  const 当前类别 = ref<图标类别键>('fontawesome')
  const 展开分组 = reactive(new Map<string, boolean>())

  function 分组key(类别: 图标类别键, 分组名: string): string {
    return `${类别}/${分组名}`
  }

  const 展开分组存储键 = '图标库-展开分组'

  function 保存展开状态() {
    try {
      const 数据: Record<string, boolean> = {}
      展开分组.forEach((v, k) => {
        数据[k] = v
      })
      localStorage.setItem(展开分组存储键, JSON.stringify(数据))
    } catch {
      /* 静默 */
    }
  }

  function 恢复展开状态() {
    try {
      const 原始 = localStorage.getItem(展开分组存储键)
      if (!原始) return
      const 数据 = JSON.parse(原始) as Record<string, boolean>
      for (const [k, v] of Object.entries(数据)) {
        展开分组.set(k, v)
      }
    } catch {
      /* 静默 */
    }
  }

  恢复展开状态()

  watch(
    展开分组,
    () => {
      保存展开状态()
    },
    { deep: true },
  )

  // ===== 分组输入状态 =====
  const 添加分组输入中 = ref(false)
  const 添加分组输入值 = ref('')

  // ===== 文本弹窗状态（fontawesome / emoji 共用） =====
  const 表单弹窗可见 = ref(false)
  const 表单弹窗模式 = ref<'添加' | '编辑'>('添加')
  const 表单弹窗分组名 = ref('')
  const 表单弹窗图标值 = ref('')
  const 表单弹窗显示名 = ref('')

  // ===== 图片上传弹窗状态（userUpload 专用） =====
  const 图片弹窗可见 = ref(false)
  const 图片弹窗模式 = ref<'添加' | '编辑'>('添加')
  const 图片弹窗分组名 = ref<string>('')
  const 图片弹窗原图标值 = ref<string>('') // 编辑时：旧 icons:xxx 值
  const 图片弹窗图片路径 = ref<string>('') // 本地文件路径（未上传前）
  const 图片弹窗图片Base64 = ref<string>('') // 预览用 base64
  const 图片弹窗显示名 = ref<string>('')
  const 图片弹窗文件大小 = ref<number>(0) // 字节
  const 图片弹窗文件类型 = ref<string>('') // 如 "PNG 图片"

  // ===== 网页图标弹窗状态（urlDownload 专用） =====
  const URL弹窗可见 = ref(false)
  const URL弹窗模式 = ref<'添加' | '编辑'>('添加')
  const URL弹窗分组名 = ref<string>('')
  const URL弹窗原图标值 = ref<string>('') // 编辑时：旧 icons:xxx 值
  const URL弹窗绑定域名 = ref<string>('')
  const URL弹窗下载地址 = ref<string>('')
  const URL弹窗图片Base64 = ref<string>('') // 下载后预览
  const URL弹窗缓存文件名 = ref<string>('') // 缓存文件名（下载到缓存后）
  const URL弹窗显示名 = ref<string>('')
  const URL弹窗下载中 = ref(false)
  const URL弹窗错误信息 = ref<string>('')
  const URL弹窗本地替换Base64 = ref<string>('') // 编辑模式从本地选图替换（非空表示要替换）

  /** URL下载弹窗：当前输入域名已绑定的网页图标（防重复提示） */
  const URL弹窗已绑定列表 = computed(() => {
    const 域名 = 规范化域名(URL弹窗绑定域名.value)
    if (!域名) return []
    const 类别 = 原始数据.value?.urlDownload
    if (!类别) return []
    const 列表: { 值: string; 显示名?: string; 分组名: string }[] = []
    for (const 分组 of 类别.分组列表) {
      for (const i of 分组.图标) {
        if (i.值.startsWith('icons:') && i.绑定域名 && 规范化域名(i.绑定域名) === 域名) {
          列表.push({ 值: i.值, 显示名: i.显示名, 分组名: 分组.名称 })
        }
      }
    }
    return 列表
  })

  // ===== 右键菜单状态 =====
  const 右键菜单 = ref({
    可见: false,
    x: 0,
    y: 0,
    类型: '' as '分组' | '图标' | '空白' | '',
    分组名: '',
    图标值: '',
  })

  // ===== 图标引用查询状态 =====
  const 引用弹窗可见 = ref(false)
  const 引用图标值 = ref('')
  const 引用图标分组 = ref('')
  const 引用卡片列表 = ref<{ 标题: string; 菜单名: string }[]>([])

  // ===== 统一为此图标（第 7 项：引用迁移） =====
  const 统一图标弹窗可见 = ref(false)
  const 统一图标目标 = ref<{ 分组名: string; 图标值: string; 显示名: string; 绑定域名: string } | null>(null)
  const 统一图标卡片列表 = ref<{ 标题: string; 菜单名: string }[]>([])
  const 统一图标待改映射 = ref<Record<string, string>>({})
  const 统一图标无引用数 = ref(0)

  /** 当前右键的图标是否可统一：需为网页图标（urlDownload）且绑定域名经规范化后非空 */
  const 当前图标可统一 = computed(() => {
    const 值 = 右键菜单.value.图标值
    const 分组名 = 右键菜单.value.分组名
    if (!值 || !分组名) return false
    const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
    const 图标 = 分组?.图标.find((i) => i.值 === 值)
    if (!图标) return false
    return 规范化域名(图标.绑定域名 || '') !== ''
  })

  /**
   * 打开「统一为此图标」弹窗：找出同域名的其它图标，并列出将要被改写的卡片。
   * 只预览、不改动任何数据；真正的改写由 `执行统一图标()` 完成。
   */
  async function 打开统一图标弹窗(分组名: string, 图标值: string) {
    统一图标卡片列表.value = []
    统一图标待改映射.value = {}
    统一图标无引用数.value = 0
    关闭右键菜单()
    try {
      const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
      const 图标 = 分组?.图标.find((i) => i.值 === 图标值)
      if (!图标) return
      const 目标域名 = 规范化域名(图标.绑定域名 || '')
      if (!目标域名 || !原始数据.value) return

      统一图标目标.value = {
        分组名,
        图标值,
        显示名: 图标.显示名 || 图标值,
        绑定域名: 目标域名,
      }

      // 1) 同域名的其它图标值（不含自身）
      const 待替换值 = new Set<string>()
      for (const 类别 of Object.values(原始数据.value)) {
        const 类别数据 = 类别 as { 分组列表?: { 图标: { 值: string; 绑定域名?: string }[] }[] }
        for (const 分组项 of 类别数据?.分组列表 || []) {
          for (const 项 of 分组项.图标 || []) {
            if (项.值 === 图标值) continue
            if (规范化域名(项.绑定域名 || '') === 目标域名) 待替换值.add(项.值)
          }
        }
      }

      // 2) 找出引用了这些图标值的卡片（复用引用查询的同一套做法）
      const 卡片仓库 = 使用卡片仓库()
      if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
      const 菜单仓库 = 使用菜单仓库()
      if (!菜单仓库.数据已加载 && 菜单仓库.菜单列表.length === 0) await 菜单仓库.加载数据()

      const 映射: Record<string, string> = {}
      const 列表: { 标题: string; 菜单名: string }[] = []
      for (const 卡片 of 卡片仓库.卡片列表) {
        const 旧值 = 卡片.图标代码
        if (旧值 && 待替换值.has(旧值)) {
          映射[旧值] = 图标值
          列表.push({
            标题: 卡片.标题 || 卡片.值 || '(未命名)',
            菜单名: 查找菜单名(卡片.归属菜单ID, 菜单仓库.菜单列表),
          })
        }
      }
      统一图标待改映射.value = 映射
      统一图标卡片列表.value = 列表
      统一图标无引用数.value = 待替换值.size - Object.keys(映射).length
    } catch {
      // 静默：与现有引用查询保持一致
    }
    统一图标弹窗可见.value = true
  }

  function 关闭统一图标弹窗() {
    统一图标弹窗可见.value = false
    统一图标目标.value = null
    统一图标卡片列表.value = []
    统一图标待改映射.value = {}
    统一图标无引用数.value = 0
  }

  /**
   * 执行统一：把同域名其它图标的卡片引用批量改到目标图标值。
   * 只迁移引用，**不删除任何图标**（腾空后是否删除由用户手动决定）。
   */
  function 执行统一图标(): { 改动数: number } {
    if (!统一图标目标.value) return { 改动数: 0 }
    const 卡片仓库 = 使用卡片仓库()
    const 改动数 = 卡片仓库.批量更新图标代码(统一图标待改映射.value, true)
    关闭统一图标弹窗()
    return { 改动数 }
  }

  /** 查找菜单名称（支持一级/二级菜单 ID） */
  function 查找菜单名(菜单ID: number | null | undefined, 菜单列表: 一级菜单节点[]): string {
    if (菜单ID === undefined || 菜单ID === null) return '未分菜单'
    for (const 一级 of 菜单列表) {
      if (一级.唯一ID === 菜单ID) return 一级.菜单名称 || '未命名'
      const 子 = 一级.子菜单?.find((s) => s.唯一ID === 菜单ID)
      if (子) return ((一级.菜单名称 && 子.菜单名称 ? `${一级.菜单名称} / ${子.菜单名称}` : 一级.菜单名称 || 子.菜单名称) || '未命名')
    }
    return '未知菜单'
  }

  /** 打开引用详情弹窗：列出引用该图标的所有卡片 */
  async function 打开引用弹窗(分组名: string, 图标值: string) {
    引用图标分组.value = 分组名
    引用图标值.value = 图标值
    引用卡片列表.value = []
    关闭右键菜单()
    try {
      const 卡片仓库 = 使用卡片仓库()
      if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
      const 菜单仓库 = 使用菜单仓库()
      if (!菜单仓库.数据已加载 && 菜单仓库.菜单列表.length === 0) await 菜单仓库.加载数据()
      const 列表: { 标题: string; 菜单名: string }[] = []
      for (const 卡片 of 卡片仓库.卡片列表) {
        if (卡片.图标代码 === 图标值) {
          列表.push({ 标题: 卡片.标题 || 卡片.值 || '(未命名)', 菜单名: 查找菜单名(卡片.归属菜单ID, 菜单仓库.菜单列表) })
        }
      }
      引用卡片列表.value = 列表
    } catch {
      // 静默
    }
    引用弹窗可见.value = true
  }

  function 关闭引用弹窗() {
    引用弹窗可见.value = false
    引用图标值.value = ''
    引用图标分组.value = ''
    引用卡片列表.value = []
  }

  /** 查询引用该图标的卡片数量 */
  async function 查询引用数(图标值: string): Promise<number> {
    try {
      const 卡片仓库 = 使用卡片仓库()
      if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
      return 卡片仓库.卡片列表.filter((c) => c.图标代码 === 图标值).length
    } catch {
      return 0
    }
  }

  // ===== 图标裁切状态 =====
  const 裁切弹窗可见 = ref(false)
  const 裁切弹窗图标值 = ref('')
  const 裁切弹窗相对路径 = ref('')

  /** 打开裁切弹窗（仅图片图标 icons:） */
  function 打开裁切弹窗(图标值: string) {
    if (!图标值.startsWith('icons:')) return
    关闭右键菜单()
    裁切弹窗图标值.value = 图标值
    裁切弹窗相对路径.value = 图标值.replace('icons:', '')
    裁切弹窗可见.value = true
  }

  function 关闭裁切弹窗() {
    裁切弹窗可见.value = false
  }

  /** 裁切完成：清缓存重载，供网格/卡片刷新 */
  async function 裁切完成() {
    const 图标值 = 裁切弹窗图标值.value
    裁切弹窗可见.value = false
    if (图标值) {
      清除图片缓存(图标值)
      获取图片Base64(图标值).catch(() => {})
    }
  }

  // ===== 图标压缩状态 =====
  const 压缩弹窗可见 = ref(false)
  const 压缩弹窗图标值 = ref('')
  const 压缩弹窗相对路径 = ref('')

  /** 可压缩的图片扩展名（SVG 矢量、GIF 动图、ICO 不支持） */
  const 可压缩扩展名 = ['.png', '.jpg', '.jpeg', '.webp']

  /** 判断图标值是否可压缩：必须是 icons: 图片且扩展名支持 */
  function 图标可压缩(图标值: string): boolean {
    if (!图标值.startsWith('icons:')) return false
    const 点位置 = 图标值.lastIndexOf('.')
    if (点位置 < 0) return false
    const ext = 图标值.slice(点位置).toLowerCase()
    return 可压缩扩展名.includes(ext)
  }

  /** 打开压缩弹窗（仅可压缩的图片图标） */
  function 打开压缩弹窗(图标值: string) {
    if (!图标可压缩(图标值)) return
    关闭右键菜单()
    压缩弹窗图标值.value = 图标值
    压缩弹窗相对路径.value = 图标值.replace('icons:', '')
    压缩弹窗可见.value = true
  }

  function 关闭压缩弹窗() {
    压缩弹窗可见.value = false
  }

  /** 压缩完成：清缓存重载，供网格/卡片刷新 */
  async function 压缩完成() {
    const 图标值 = 压缩弹窗图标值.value
    压缩弹窗可见.value = false
    if (图标值) {
      清除图片缓存(图标值)
      获取图片Base64(图标值).catch(() => {})
    }
  }

  // ===== 重命名状态 =====
  const 重命名中 = ref<string | null>(null)
  const 重命名值 = ref('')

  // ===== 颜色配置状态 =====
  const 类别背景颜色 = reactive<Record<图标类别键, string>>({
    fontawesome: '#4a9fa5',
    emoji: '#4a9fa5',
    userUpload: '#4a9fa5',
    urlDownload: '#4a9fa5',
  })
  const 类别透明背景 = reactive<Record<图标类别键, boolean>>({
    fontawesome: false,
    emoji: false,
    userUpload: false,
    urlDownload: false,
  })
  const 颜色历史 = ref<string[]>([])
  const 颜色配置已加载 = ref(false)

  // ===== 计算属性 =====
  const 当前类别数据 = computed(() => {
    if (!原始数据.value) return null
    return 原始数据.value[当前类别.value] as 图标类别数据
  })

  const 当前分组列表 = computed(() => {
    const 列表 = 当前类别数据.value?.分组列表 || []
    const 排序后 = 排序方向.value === '降序' ? [...列表].reverse() : 列表
    if (!搜索词.value.trim()) return 排序后
    const 词 = 搜索词.value.trim().toLowerCase()
    return 排序后
      .map((分组) => {
        if (分组.名称.toLowerCase().includes(词)) return 分组
        const 匹配图标 = 分组.图标.filter(
          (图标) => 图标.显示名.toLowerCase().includes(词) || 图标.值.toLowerCase().includes(词),
        )
        if (匹配图标.length === 0) return null
        return { ...分组, 图标: 匹配图标 }
      })
      .filter(Boolean) as 图标分组[]
  })

  const 可见分组列表 = computed(() => {
    return 当前分组列表.value.filter((g) => 展开分组.get(分组key(当前类别.value, g.名称)) !== false)
  })

  const 类别标签列表 = computed<类别标签[]>(() => {
    if (!原始数据.value) return []
    return (['fontawesome', 'emoji', 'userUpload', 'urlDownload'] as 图标类别键[]).map((键) => {
      const 数据 = 原始数据.value![键]
      const 总数 = 数据?.分组列表.reduce((sum, g) => sum + g.图标.length, 0) || 0
      const fa映射: Record<图标类别键, string> = {
        fontawesome: 'fas fa-font',
        emoji: 'fas fa-face-smile',
        userUpload: 'fas fa-upload',
        urlDownload: 'fas fa-link',
      }
      return {
        键,
        显示名: 类别显示名[键],
        fa类名: fa映射[键],
        图标计数: 总数,
      }
    })
  })

  // ===== 颜色配置持久化 =====

  /** 加载图标库颜色配置 */
  async function 加载颜色配置() {
    if (颜色配置已加载.value) return
    try {
      if (是Electron) {
        const 结果 = await window.electronAPI.图标库读取颜色配置()
        if (结果.成功 && 结果.配置) {
          const 配置 = 结果.配置
          Object.assign(类别背景颜色, 配置.类别背景颜色)
          Object.assign(类别透明背景, 配置.类别透明背景)
          颜色历史.value = 配置.颜色历史 || []
        }
      }
    } catch {
      // 使用默认值
    }
    颜色配置已加载.value = true
  }

  /** 保存图标库颜色配置 */
  async function 保存颜色配置() {
    if (!是Electron) return
    try {
      const 配置: 图标库颜色配置 = {
        类别背景颜色: { ...类别背景颜色 },
        类别透明背景: { ...类别透明背景 },
        颜色历史: [...颜色历史.value],
      }
      await window.electronAPI.图标库保存颜色配置(配置)
    } catch {
      // 静默失败
    }
  }

  /** 设置当前类别的背景颜色（仅预览，不记录历史、不持久化） */
  function 设置当前类别背景颜色仅预览(颜色: string) {
    类别背景颜色[当前类别.value] = 颜色
  }

  /** 设置当前类别的背景颜色（不记录历史、不持久化） */
  function 设置当前类别背景颜色(颜色: string) {
    类别背景颜色[当前类别.value] = 颜色
  }

  /** 设置当前类别的背景颜色并持久化（不记录历史） */
  async function 设置当前类别背景颜色并持久化(颜色: string) {
    类别背景颜色[当前类别.value] = 颜色
    await 保存颜色配置()
  }

  /** 设置当前类别的背景颜色并记录到历史（持久化） */
  async function 设置当前类别背景颜色并记录(颜色: string) {
    类别背景颜色[当前类别.value] = 颜色
    // 添加到历史（去重，上限12）
    const 去重后 = 颜色历史.value.filter((c) => c !== 颜色)
    去重后.unshift(颜色)
    颜色历史.value = 去重后.slice(0, 12)
    await 保存颜色配置()
  }

  /** 设置当前类别的透明背景开关 */
  async function 设置当前类别透明背景(透明: boolean) {
    类别透明背景[当前类别.value] = 透明
    await 保存颜色配置()
  }

  // ===== 图片缓存（懒加载 + LRU + 并发节流） =====

  /** 触摸命中缓存（刷新 LRU 访问序） */
  function 触摸图片缓存(图标值: string) {
    缓存访问序.set(图标值, ++缓存访问序号)
  }

  /** 写入缓存并执行 LRU 淘汰 */
  function 写入图片缓存(图标值: string, base64: string) {
    图片缓存.set(图标值, base64)
    缓存访问序.set(图标值, ++缓存访问序号)
    while (图片缓存.size > 图片缓存上限) {
      let 最久值: string | null = null
      let 最久序 = Infinity
      for (const [值, 序] of 缓存访问序) {
        if (序 < 最久序) {
          最久序 = 序
          最久值 = 值
        }
      }
      if (最久值 === null) break
      图片缓存.delete(最久值)
      缓存访问序.delete(最久值)
    }
  }

  /** 清除单个图标的缓存（同时清理访问序，LRU 淘汰不会误删） */
  function 清除图片缓存(图标值: string) {
    图片缓存.delete(图标值)
    缓存访问序.delete(图标值)
  }

  /** 从磁盘读取图标文件为 base64，成功时写入缓存 */
  async function 读取图标文件(图标值: string): Promise<string> {
    const 相对路径 = 图标值.replace('icons:', '')
    try {
      const 结果 = await window.electronAPI.图标库读取图片(相对路径)
      if (结果.成功 && 结果.base64) {
        写入图片缓存(图标值, 结果.base64)
        return 结果.base64
      }
    } catch {
      // 静默
    }
    return ''
  }

  /** 获取图片 base64（优先从缓存读取，命中刷新 LRU 访问序） */
  async function 获取图片Base64(图标值: string): Promise<string> {
    if (!图标值.startsWith('icons:')) return ''
    if (图片缓存.has(图标值)) {
      触摸图片缓存(图标值)
      return 图片缓存.get(图标值)!
    }
    const 进行中 = 图片加载任务.get(图标值)
    if (进行中) return 进行中
    const 任务 = 读取图标文件(图标值)
    图片加载任务.set(图标值, 任务)
    try {
      return await 任务
    } finally {
      图片加载任务.delete(图标值)
    }
  }

  /** 懒加载入口：渲染时触发；已缓存/加载中/排队中即跳过，受并发上限节流 */
  function 保证图片加载(图标值: string): void {
    if (!是Electron || !图标值.startsWith('icons:')) return
    if (图片缓存.has(图标值) || 图片加载任务.has(图标值) || 图片排队中.has(图标值)) return
    图片排队中.add(图标值)
    图片等待队列.push(图标值)
    调度图片队列()
  }

  /** 按并发上限调度等待队列 */
  function 调度图片队列() {
    while (活跃图片读取 < 图片并发上限 && 图片等待队列.length > 0) {
      const 图标值 = 图片等待队列.shift()!
      图片排队中.delete(图标值)
      if (图片缓存.has(图标值) || 图片加载任务.has(图标值)) continue
      活跃图片读取++
      const 任务 = 读取图标文件(图标值)
      图片加载任务.set(图标值, 任务)
      任务.finally(() => {
        活跃图片读取--
        图片加载任务.delete(图标值)
        调度图片队列()
      })
    }
  }

  // ===== 初始化 =====
  async function 加载数据() {
    if (!是Electron) {
      创建默认数据()
      return
    }
    加载中.value = true
    错误信息.value = ''
    try {
      const 结果 = await window.electronAPI.图标库读取数据()
      if (结果.成功) {
        原始数据.value = 结果.数据
        const 所有分组: { 类别: 图标类别键; 分组: 图标分组 }[] = [
          ...(结果.数据.fontawesome?.分组列表?.map((g: 图标分组) => ({ 类别: 'fontawesome' as 图标类别键, 分组: g })) || []),
          ...(结果.数据.emoji?.分组列表?.map((g: 图标分组) => ({ 类别: 'emoji' as 图标类别键, 分组: g })) || []),
          ...(结果.数据.userUpload?.分组列表?.map((g: 图标分组) => ({ 类别: 'userUpload' as 图标类别键, 分组: g })) || []),
          ...(结果.数据.urlDownload?.分组列表?.map((g: 图标分组) => ({ 类别: 'urlDownload' as 图标类别键, 分组: g })) || []),
        ]
        for (const { 类别, 分组 } of 所有分组) {
          if (!展开分组.has(分组key(类别, 分组.名称))) {
            展开分组.set(分组key(类别, 分组.名称), true)
          }
        }
      } else {
        错误信息.value = 结果.错误信息 || '加载失败'
        创建默认数据()
      }
    } catch (e) {
      错误信息.value = String(e)
      创建默认数据()
    } finally {
      加载中.value = false
    }
    // 加载颜色配置
    await 加载颜色配置()
  }

  function 创建默认数据() {
    原始数据.value = {
      版本: '1.0',
      最后更新: Date.now(),
      fontawesome: { 分组列表: [] },
      emoji: { 分组列表: [] },
      userUpload: { 分组列表: [] },
      urlDownload: { 分组列表: [] },
    }
  }

  // ===== 类别切换 =====
  function 切换排序方向() {
    排序方向.value = 排序方向.value === '升序' ? '降序' : '升序'
  }

  function 切换类别(键: 图标类别键) {
    当前类别.value = 键
    添加分组输入中.value = false
    关闭右键菜单()
  }

  // ===== 分组操作 =====
  function 切换展开(分组名: string) {
    const key = 分组key(当前类别.value, 分组名)
    const 当前 = 展开分组.get(key)
    展开分组.set(key, 当前 === undefined ? false : !当前)
  }

  function 开始添加分组() {
    添加分组输入中.value = true
    添加分组输入值.value = ''
  }

  function 取消添加分组() {
    添加分组输入中.value = false
    添加分组输入值.value = ''
  }

  async function 确认添加分组() {
    const 名称 = 添加分组输入值.value.trim()
    if (!名称) {
      取消添加分组()
      return
    }

    const 已存在 = 当前分组列表.value.some((g) => g.名称 === 名称)
    if (已存在) {
      取消添加分组()
      return
    }

    if (是Electron) {
      const 结果 = await window.electronAPI.图标库添加分组(当前类别.value, 名称)
      if (结果.成功) {
        原始数据.value = 结果.数据
        展开分组.set(分组key(当前类别.value, 名称), true)
      }
    } else {
      当前类别数据.value?.分组列表.push({ 名称, 图标: [], 是否内置: false })
      展开分组.set(分组key(当前类别.value, 名称), true)
    }
    取消添加分组()
  }

  async function 删除分组(分组名: string) {
    // 组内被引用的图标先静默迁移引用（同域名替代或降级默认），与删除图标兜底一致
    const 组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
    if (组) {
      const 卡片仓库 = 使用卡片仓库()
      if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
      for (const 图标 of 组.图标) {
        if (!图标.值.startsWith('icons:')) continue
        if (卡片仓库.卡片列表.some((c) => c.图标代码 === 图标.值)) {
          const 替代 = 查找同域名替代图标(图标.值)
          卡片仓库.迁移被删图标引用(图标.值, 替代?.值 ?? null)
        }
      }
    }
    if (是Electron) {
      const 结果 = await window.electronAPI.图标库删除分组(当前类别.value, 分组名)
      if (结果.成功) {
        原始数据.value = 结果.数据
      }
    } else {
      const idx = 当前分组列表.value.findIndex((g) => g.名称 === 分组名)
      if (idx >= 0) 当前类别数据.value?.分组列表.splice(idx, 1)
    }
    展开分组.delete(分组key(当前类别.value, 分组名))
    关闭右键菜单()
  }

  async function 开始重命名(分组名: string) {
    重命名中.value = 分组名
    重命名值.value = 分组名
    关闭右键菜单()
  }

  async function 确认重命名() {
    const 旧名 = 重命名中.value
    const 新名 = 重命名值.value.trim()
    if (!旧名 || !新名) {
      取消重命名()
      return
    }
    if (旧名 === 新名) {
      取消重命名()
      return
    }

    const 已存在 = 当前分组列表.value.some((g) => g.名称 === 新名)
    if (已存在) {
      取消重命名()
      return
    }

    if (是Electron) {
      const 结果 = await window.electronAPI.图标库重命名分组(当前类别.value, 旧名, 新名)
      if (结果.成功) {
        原始数据.value = 结果.数据
      }
    } else {
      const 分组 = 当前分组列表.value.find((g) => g.名称 === 旧名)
      if (分组) 分组.名称 = 新名
    }
    展开分组.delete(分组key(当前类别.value, 旧名))
    展开分组.set(分组key(当前类别.value, 新名), true)
    取消重命名()
  }

  function 取消重命名() {
    重命名中.value = null
    重命名值.value = ''
  }

  // ===== 图标操作 =====
  async function 添加图标到分组(分组名: string, 值: string, 显示名: string) {
    if (!值.trim()) return
    const 新图标: 图标项 = { 值: 值.trim(), 显示名: 显示名.trim() || 值.trim() }

    if (是Electron) {
      const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
      if (结果.成功) {
        原始数据.value = 结果.数据
      }
    } else {
      let 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
      // 分组不存在时自动创建，避免图标静默丢失（与后端逻辑一致）
      if (!分组) {
        分组 = { 名称: 分组名, 图标: [], 是否内置: false }
        if (当前分组列表.value) 当前分组列表.value.push(分组)
      }
      分组.图标.push(新图标)
    }

    // 预加载新增的图片图标到缓存
    if (新图标.值.startsWith('icons:')) {
      获取图片Base64(新图标.值)
    }
  }

  /** 查找同域名（与图标值绑定域名规范化后相同）的其它图标，按"最近新增"（遍历顺序最后）返回；无则 null */
  function 查找同域名替代图标(被删值: string): { 值: string; 显示名: string } | null {
    if (!原始数据.value) return null
    const 数据 = 原始数据.value
    // 1) 找被删图标的绑定域名
    let 域名 = ''
    for (const 类别数据 of Object.values(数据)) {
      const 类别 = 类别数据 as { 分组列表?: { 图标: { 值: string; 绑定域名?: string }[] }[] }
      for (const 分组 of 类别?.分组列表 || []) {
        for (const 项 of 分组.图标 || []) {
          if (项.值 === 被删值) 域名 = 规范化域名(项.绑定域名 || '')
        }
      }
      if (域名) break
    }
    if (!域名) return null
    // 2) 收集同域名的其它图标，取遍历顺序最后（最近新增）
    let 替代: { 值: string; 显示名: string } | null = null
    for (const 类别数据 of Object.values(数据)) {
      const 类别 = 类别数据 as { 分组列表?: { 图标: { 值: string; 绑定域名?: string; 显示名?: string }[] }[] }
      for (const 分组 of 类别?.分组列表 || []) {
        for (const 项 of 分组.图标 || []) {
          if (项.值 === 被删值) continue
          if (规范化域名(项.绑定域名 || '') === 域名) {
            替代 = { 值: 项.值, 显示名: 项.显示名 || 项.值 }
          }
        }
      }
    }
    return 替代
  }

  async function 删除图标(分组名: string, 图标值: string, 替代值: string | null = null) {
    // 先迁移引用卡片的图标（url 卡片换替代 / 其余与无替代降级默认），杜绝断链
    const 卡片仓库 = 使用卡片仓库()
    if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
    卡片仓库.迁移被删图标引用(图标值, 替代值)
    if (是Electron) {
      if (图标值.startsWith('icons:')) {
        const 相对路径 = 图标值.replace('icons:', '')
        await window.electronAPI.图标库删除图片(相对路径)
      }
      const 结果 = await window.electronAPI.图标库删除图标(当前类别.value, 分组名, 图标值)
      if (结果.成功) {
        原始数据.value = 结果.数据
      }
    } else {
      const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
      if (分组) {
        分组.图标 = 分组.图标.filter((i) => i.值 !== 图标值)
      }
    }
    关闭右键菜单()
  }

  /** 移动图标：同分组排序（源=目标）或跨分组移动，持久化 + 刷新数据 */
  async function 移动图标(源分组名: string, 图标值: string, 目标分组名: string, 目标索引: number) {
    if (!是Electron) return
    const 结果 = await window.electronAPI.图标库移动图标(当前类别.value, 源分组名, 图标值, 目标分组名, 目标索引)
    if (结果.成功) {
      原始数据.value = 结果.数据
    }
  }

  /** 移动分组：调整分组顺序，持久化 + 刷新数据 */
  async function 移动分组(分组名: string, 目标索引: number) {
    if (!是Electron) return
    const 结果 = await window.electronAPI.图标库移动分组(当前类别.value, 分组名, 目标索引)
    if (结果.成功) {
      原始数据.value = 结果.数据
    }
  }

  // ===== 表单弹窗控制 =====

  /** 打开添加图标弹窗 */
  function 打开添加弹窗(分组名: string) {
    表单弹窗可见.value = true
    表单弹窗模式.value = '添加'
    表单弹窗分组名.value = 分组名
    表单弹窗图标值.value = ''
    表单弹窗显示名.value = ''
  }

  /** 打开编辑图标弹窗 */
  function 打开编辑弹窗(分组名: string, 图标值: string, 显示名: string) {
    表单弹窗可见.value = true
    表单弹窗模式.value = '编辑'
    表单弹窗分组名.value = 分组名
    表单弹窗图标值.value = 图标值
    表单弹窗显示名.value = 显示名
  }

  /** 关闭弹窗 */
  function 关闭弹窗() {
    表单弹窗可见.value = false
    表单弹窗分组名.value = ''
    表单弹窗图标值.value = ''
    表单弹窗显示名.value = ''
  }

  /** 确认弹窗（添加或编辑） */
  async function 确认弹窗(图标值: string, 显示名: string) {
    const 分组名 = 表单弹窗分组名.value
    if (!分组名) {
      关闭弹窗()
      return
    }

    if (表单弹窗模式.value === '添加') {
      await 添加图标到分组(分组名, 图标值, 显示名)
    } else {
      // 编辑模式
      const 原值 = 表单弹窗图标值.value
      if (原值 === 图标值) {
        // 只改了显示名
        if (是Electron) {
          const 结果 = await window.electronAPI.图标库编辑图标名(当前类别.value, 分组名, 原值, 显示名)
          if (结果.成功) {
            原始数据.value = 结果.数据
          }
        } else {
          const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
          if (分组) {
            const 图标 = 分组.图标.find((i) => i.值 === 原值)
            if (图标) 图标.显示名 = 显示名
          }
        }
      } else {
        // 图标值也变了：先删旧图标，再添加新图标
        await 删除图标(分组名, 原值)
        await 添加图标到分组(分组名, 图标值, 显示名)
      }
    }

    关闭弹窗()
  }

  // ===== 图片上传弹窗控制 =====

  /** 打开添加图片弹窗 */
  function 打开图片添加弹窗(分组名: string) {
    图片弹窗可见.value = true
    图片弹窗模式.value = '添加'
    图片弹窗分组名.value = 分组名
    图片弹窗原图标值.value = ''
    图片弹窗图片路径.value = ''
    图片弹窗图片Base64.value = ''
    图片弹窗显示名.value = ''
    图片弹窗文件大小.value = 0
    图片弹窗文件类型.value = ''
  }

  /** 打开编辑图片弹窗 */
  function 打开图片编辑弹窗(分组名: string, 原图标值: string, 显示名: string) {
    图片弹窗可见.value = true
    图片弹窗模式.value = '编辑'
    图片弹窗分组名.value = 分组名
    图片弹窗原图标值.value = 原图标值
    图片弹窗图片路径.value = ''
    图片弹窗图片Base64.value = '' // 需要在外部加载
    图片弹窗显示名.value = 显示名
    图片弹窗文件大小.value = 0
    图片弹窗文件类型.value = ''
    // 加载现有图片预览
    加载现有图片预览(原图标值)
  }

  /** 编辑时加载现有图片预览（含文件大小估算与类型推断） */
  async function 加载现有图片预览(图标值: string) {
    if (!是Electron || !图标值.startsWith('icons:')) return
    const 相对路径 = 图标值.replace('icons:', '')
    try {
      const 结果 = await window.electronAPI.图标库读取图片(相对路径)
      if (结果.成功) {
        图片弹窗图片Base64.value = 结果.base64 ?? ''
        填充文件信息(图片弹窗图片Base64.value, 相对路径)
      }
    } catch {
      // 静默
    }
  }

  /** 从 base64 估算文件大小 + 从路径扩展名推断类型，填充到弹窗状态 */
  function 填充文件信息(base64: string, 路径或图标值: string) {
    const base64数据 = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
    图片弹窗文件大小.value = Math.round(base64数据.length * 0.75)
    const 扩展名 = (路径或图标值.split('.').pop() || '').toLowerCase()
    const 类型映射: Record<string, string> = {
      png: 'PNG 图片', jpg: 'JPEG 图片', jpeg: 'JPEG 图片', gif: 'GIF 图片',
      svg: 'SVG 图片', bmp: 'BMP 图片', ico: 'ICO 图标', webp: 'WebP 图片',
    }
    图片弹窗文件类型.value = 类型映射[扩展名] || `${扩展名.toUpperCase()} 文件`
  }

  /** 用户选择本地图片文件 */
  async function 图片弹窗选择文件() {
    if (!是Electron) return
    const 结果 = await window.electronAPI.启动选择文件({
      标题: '选择图片',
      过滤器: [{ 名称: '图片文件', 扩展名: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'ico', 'webp'] }],
    })
    if (!结果.成功 || !结果.路径) return

    const 文件路径 = 结果.路径
    图片弹窗图片路径.value = 文件路径

    // 读取本地图片预览
    try {
      const 读取结果 = await window.electronAPI.启动读取本地图片(文件路径)
      if (读取结果.成功) {
        图片弹窗图片Base64.value = 读取结果.base64 ?? ''
      } else {
        图片弹窗图片Base64.value = ''
      }
    } catch {
      图片弹窗图片Base64.value = ''
    }

    // 提取文件名作为默认显示名
    const 文件名 = 文件路径.split(/[/\\]/).pop() || ''
    const 无扩展名 = 文件名.replace(/\.[^.]+$/, '')
    图片弹窗显示名.value = 无扩展名

    // 估算文件大小 + 推断类型
    填充文件信息(图片弹窗图片Base64.value, 文件路径)
  }

  /** 关闭图片弹窗 */
  function 关闭图片弹窗() {
    图片弹窗可见.value = false
    图片弹窗分组名.value = ''
    图片弹窗原图标值.value = ''
    图片弹窗图片路径.value = ''
    图片弹窗图片Base64.value = ''
    图片弹窗显示名.value = ''
    图片弹窗文件大小.value = 0
    图片弹窗文件类型.value = ''
  }

  /** 确认图片弹窗（上传图片 + 添加/编辑图标记录） */
  async function 确认图片弹窗() {
    const 分组名 = 图片弹窗分组名.value
    if (!分组名) return

    const 显示名 = 图片弹窗显示名.value.trim() || '未命名'
    const 是编辑 = 图片弹窗模式.value === '编辑'
    const 换了图片 = 是编辑 && 图片弹窗图片路径.value

    if (换了图片) {
      // 编辑模式下换了图片：先删旧图片，再上传新图片
      const 旧相对路径 = 图片弹窗原图标值.value.replace('icons:', '')
      if (是Electron) {
        await window.electronAPI.图标库删除图片(旧相对路径)
      }
      // 上传新图片
      let 新相对路径 = ''
      if (是Electron && 图片弹窗图片Base64.value) {
        const 上传结果 = await window.electronAPI.图标库上传图片(图片弹窗图片Base64.value)
        if (上传结果.成功) {
          新相对路径 = 上传结果.相对路径 ?? ''
        }
      }
      if (!新相对路径) return // 上传失败

      // 更新：删除旧图标记录，添加新图标记录
      await 删除图标(分组名, 图片弹窗原图标值.value)
      await 添加图标到分组(分组名, `icons:${新相对路径}`, 显示名)
      关闭图片弹窗()
      return
    }

    if (是编辑 && !换了图片) {
      // 只改了显示名
      const 原值 = 图片弹窗原图标值.value
      if (是Electron) {
        const 结果 = await window.electronAPI.图标库编辑图标名(当前类别.value, 分组名, 原值, 显示名)
        if (结果.成功) 原始数据.value = 结果.数据
      } else {
        const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
        if (分组) {
          const 图标 = 分组.图标.find((i) => i.值 === 原值)
          if (图标) 图标.显示名 = 显示名
        }
      }
      关闭图片弹窗()
      return
    }

    // 添加模式：上传图片
    let 相对路径 = ''
    if (是Electron && 图片弹窗图片Base64.value) {
      const 上传结果 = await window.electronAPI.图标库上传图片(图片弹窗图片Base64.value)
      if (上传结果.成功) {
        相对路径 = 上传结果.相对路径 ?? ''
      }
    }
    if (!相对路径) return // 没选图片 或 上传失败

    await 添加图标到分组(分组名, `icons:${相对路径}`, 显示名)
    关闭图片弹窗()
  }

  // ===== 网页图标弹窗控制（缓存模式） =====

  /** 打开添加网页图标弹窗 */
  function 打开URL添加弹窗(分组名: string) {
    // 打开弹窗前先清理旧缓存
    if (是Electron) {
      window.electronAPI.图标库清理缓存().catch(() => {})
    }
    URL弹窗可见.value = true
    URL弹窗模式.value = '添加'
    URL弹窗分组名.value = 分组名
    URL弹窗原图标值.value = ''
    URL弹窗绑定域名.value = ''
    URL弹窗下载地址.value = ''
    URL弹窗图片Base64.value = ''
    URL弹窗缓存文件名.value = ''
    URL弹窗显示名.value = ''
    URL弹窗下载中.value = false
    URL弹窗错误信息.value = ''
    URL弹窗本地替换Base64.value = ''
  }

  /** 打开编辑网页图标弹窗 */
  function 打开URL编辑弹窗(分组名: string, 原图标值: string, 显示名: string, 绑定域名?: string) {
    // 打开编辑弹窗前先清理旧缓存
    if (是Electron) {
      window.electronAPI.图标库清理缓存().catch(() => {})
    }
    URL弹窗可见.value = true
    URL弹窗模式.value = '编辑'
    URL弹窗分组名.value = 分组名
    URL弹窗原图标值.value = 原图标值
    URL弹窗绑定域名.value = 绑定域名 || ''
    URL弹窗下载地址.value = ''
    URL弹窗图片Base64.value = ''
    URL弹窗缓存文件名.value = ''
    URL弹窗显示名.value = 显示名
    URL弹窗下载中.value = false
    URL弹窗错误信息.value = ''
    URL弹窗本地替换Base64.value = ''
    // 编辑时：从持久化目录读取现有图片预览
    加载URL现有图片预览(原图标值)
  }

  /** 编辑模式：从本地选图替换（点击预览图触发） */
  async function URL弹窗选择本地文件() {
    if (!是Electron) return
    const 结果 = await window.electronAPI.启动选择文件({
      标题: '选择图片',
      过滤器: [{ 名称: '图片文件', 扩展名: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'ico', 'webp'] }],
    })
    if (!结果.成功 || !结果.路径) return
    try {
      const 读取结果 = await window.electronAPI.启动读取本地图片(结果.路径)
      if (读取结果.成功 && 读取结果.base64) {
        URL弹窗图片Base64.value = 读取结果.base64
        URL弹窗本地替换Base64.value = 读取结果.base64
        URL弹窗缓存文件名.value = '' // 清缓存文件名，走本地替换分支而非下载分支
      }
    } catch {
      // 静默
    }
  }

  /** 编辑时加载现有图片预览（从持久化目录读） */
  async function 加载URL现有图片预览(图标值: string) {
    if (!是Electron || !图标值.startsWith('icons:')) return
    const 相对路径 = 图标值.replace('icons:', '')
    try {
      const 结果 = await window.electronAPI.图标库读取图片(相对路径)
      if (结果.成功) {
        URL弹窗图片Base64.value = 结果.base64 ?? ''
      }
    } catch {
      // 静默
    }
  }

  /** 下载图片到缓存 */
  async function URL弹窗下载图片() {
    const url = URL弹窗下载地址.value.trim()
    if (!url) {
      URL弹窗错误信息.value = '请输入图片下载地址'
      return
    }

    URL弹窗下载中.value = true
    URL弹窗错误信息.value = ''

    try {
      // 1. 下载到缓存
      const 结果 = await window.electronAPI.图标库下载图片到缓存(url)
      if (结果.成功) {
        URL弹窗缓存文件名.value = 结果.缓存文件名 ?? ''
        URL弹窗本地替换Base64.value = '' // 互斥：下载清本地替换标记
        // 2. 从缓存读取预览
        const 读取结果 = await window.electronAPI.图标库读取缓存图片(结果.缓存文件名 ?? '')
        if (读取结果.成功) {
          URL弹窗图片Base64.value = 读取结果.base64 ?? ''
        }
        // 3. 自动提取显示名
        if (!URL弹窗显示名.value) {
          const url文件名 = url.split('/').pop() || ''
          const 无扩展名 = url文件名.replace(/\.[^.]+$/, '')
          URL弹窗显示名.value = 无扩展名
        }
      } else {
        URL弹窗错误信息.value = 结果.错误信息 || '下载失败'
      }
    } catch (e) {
      URL弹窗错误信息.value = String(e)
    } finally {
      URL弹窗下载中.value = false
    }
  }

  /** 关闭网页图标弹窗（清理缓存） */
  function 关闭URL弹窗() {
    // 如果有缓存，清理掉
    if (是Electron && URL弹窗缓存文件名.value) {
      window.electronAPI.图标库清理缓存().catch(() => {})
    }
    URL弹窗可见.value = false
    URL弹窗分组名.value = ''
    URL弹窗原图标值.value = ''
    URL弹窗绑定域名.value = ''
    URL弹窗下载地址.value = ''
    URL弹窗图片Base64.value = ''
    URL弹窗缓存文件名.value = ''
    URL弹窗显示名.value = ''
    URL弹窗下载中.value = false
    URL弹窗错误信息.value = ''
    URL弹窗本地替换Base64.value = ''
  }

  async function 确认URL弹窗() {
    const 分组名 = URL弹窗分组名.value
    if (!分组名) return

    const 显示名 = URL弹窗显示名.value.trim() || '未命名'
    const 绑定域名 = URL弹窗绑定域名.value.trim()
    const 是编辑 = URL弹窗模式.value === '编辑'

    // 添加模式：必须有缓存图片或本地选图
    if (!是编辑 && !URL弹窗缓存文件名.value && !URL弹窗本地替换Base64.value) {
      URL弹窗错误信息.value = '请先上传图片或下载图片'
      return
    }

    if (是编辑 && URL弹窗本地替换Base64.value) {
      // 编辑模式 + 本地选图替换：上传新图到持久化 → 删旧物理文件 → 删旧记录 → 加新记录（保留绑定域名）
      const 旧相对路径 = URL弹窗原图标值.value.replace('icons:', '')
      const 上传结果 = await window.electronAPI.图标库上传图片(URL弹窗本地替换Base64.value)
      if (!上传结果.成功) {
        URL弹窗错误信息.value = 上传结果.错误信息 || '上传图片失败'
        return
      }
      await window.electronAPI.图标库删除图片(旧相对路径)
      const 新图标: 图标项 = {
        值: `icons:${上传结果.相对路径}`,
        显示名,
      }
      if (绑定域名) 新图标.绑定域名 = 规范化域名(绑定域名)
      const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
      if (结果.成功) 原始数据.value = 结果.数据
      await 删除图标(分组名, URL弹窗原图标值.value)
      关闭URL弹窗()
      return
    }

    if (是编辑 && URL弹窗缓存文件名.value) {
      // 编辑模式 + 重新下载了新图片：先删旧图片记录，确认缓存，再添加新图标
      const 旧相对路径 = URL弹窗原图标值.value.replace('icons:', '')
      if (是Electron) {
        // 1. 确认缓存（移动到持久化目录）
        const 确认结果 = await window.electronAPI.图标库确认缓存图片(URL弹窗缓存文件名.value)
        if (!确认结果.成功) {
          URL弹窗错误信息.value = 确认结果.错误信息 || '保存图片失败'
          return
        }
        // 2. 删除旧图片
        await window.electronAPI.图标库删除图片(旧相对路径)
        // 3. 添加新图标记录
        const 新图标: 图标项 = {
          值: `icons:${确认结果.相对路径}`,
          显示名: 显示名,
        }
        if (绑定域名) 新图标.绑定域名 = 规范化域名(绑定域名)
        const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
        if (结果.成功) 原始数据.value = 结果.数据
        // 4. 删除旧图标记录
        await 删除图标(分组名, URL弹窗原图标值.value)
      }
      关闭URL弹窗()
      return
    }

    if (是编辑 && !URL弹窗缓存文件名.value) {
      // 编辑模式 + 没换图片：只改了显示名或绑定域名
      const 原值 = URL弹窗原图标值.value
      if (是Electron) {
        await window.electronAPI.图标库编辑图标名(当前类别.value, 分组名, 原值, 显示名)
        // 如果绑定域名变了，需要更新
        const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
        if (分组) {
          const 旧图标 = 分组.图标.find((i) => i.值 === 原值)
          if (旧图标 && 旧图标.绑定域名 !== 绑定域名) {
            await 删除图标(分组名, 原值)
            const 新图标: 图标项 = { 值: 原值, 显示名, 绑定域名: 规范化域名(绑定域名) || undefined }
            const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
            if (结果.成功) 原始数据.value = 结果.数据
          } else {
            const 结果 = await window.electronAPI.图标库读取数据()
            if (结果.成功) 原始数据.value = 结果.数据
          }
        }
      } else {
        const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
        if (分组) {
          const 图标 = 分组.图标.find((i) => i.值 === 原值)
          if (图标) {
            图标.显示名 = 显示名
            if (绑定域名) 图标.绑定域名 = 绑定域名
            else delete 图标.绑定域名
          }
        }
      }
      关闭URL弹窗()
      return
    }

    // 添加模式 + 本地选图：直接上传持久化 + 添加图标记录（带绑定域名）
    if (!是编辑 && URL弹窗本地替换Base64.value) {
      const 上传结果 = await window.electronAPI.图标库上传图片(URL弹窗本地替换Base64.value)
      if (!上传结果.成功) {
        URL弹窗错误信息.value = 上传结果.错误信息 || '上传图片失败'
        return
      }
      const 新图标: 图标项 = {
        值: `icons:${上传结果.相对路径}`,
        显示名,
      }
      if (绑定域名) 新图标.绑定域名 = 规范化域名(绑定域名)
      const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
      if (结果.成功) 原始数据.value = 结果.数据
      关闭URL弹窗()
      return
    }

    // 添加模式：确认缓存 + 添加图标记录
    if (是Electron) {
      const 确认结果 = await window.electronAPI.图标库确认缓存图片(URL弹窗缓存文件名.value)
      if (!确认结果.成功) {
        URL弹窗错误信息.value = 确认结果.错误信息 || '保存图片失败'
        return
      }
      const 新图标: 图标项 = {
        值: `icons:${确认结果.相对路径}`,
        显示名: 显示名,
      }
      if (绑定域名) 新图标.绑定域名 = 规范化域名(绑定域名)
      const 结果 = await window.electronAPI.图标库添加图标(当前类别.value, 分组名, 新图标)
      if (结果.成功) 原始数据.value = 结果.数据
    } else {
      // 非 Electron 环境（走旧逻辑）
      if (!URL弹窗缓存文件名.value) {
        URL弹窗错误信息.value = '请先下载图片'
        return
      }
      const 新图标: 图标项 = {
        值: `icons:${URL弹窗缓存文件名.value}`,
        显示名: 显示名,
      }
      if (绑定域名) 新图标.绑定域名 = 规范化域名(绑定域名)
      const 分组 = 当前分组列表.value.find((g) => g.名称 === 分组名)
      if (分组) 分组.图标.push(新图标)
    }
    关闭URL弹窗()
  }

  // ===== 尺寸扫描与引用统计（空白区右键菜单） =====
  const 大图标信息 = reactive(new Map<string, { 宽: number; 高: number; 体积: number; 是否大图: boolean }>())
  const 引用统计 = reactive(new Map<string, { 卡片: number; 菜单: number; 壁纸: number; 总数: number }>())
  const 引用显示中 = ref(false)
  const 扫描大图标中 = ref(false)
  const 清理确认弹窗可见 = ref(false)
  const 清理待删列表 = ref<{ 图标值: string; 显示名: string; 分组名: string; 类别: string }[]>([])
  let 大图标清除定时器: ReturnType<typeof setTimeout> | null = null
  let 引用显示定时器: ReturnType<typeof setTimeout> | null = null

  /** 扫描尺寸：后端遍历全部位图，所有图标尺寸写入大图标信息（大图红色/小图绿色），1 分钟后自动清除 */
  async function 扫描大图标() {
    if (!是Electron || 扫描大图标中.value) return
    扫描大图标中.value = true
    try {
      const 结果 = await window.electronAPI.图标库扫描大图标()
      if (结果.成功 && 结果.列表) {
        大图标信息.clear()
        for (const 项 of 结果.列表) {
          大图标信息.set(项.图标值, { 宽: 项.宽, 高: 项.高, 体积: 项.体积, 是否大图: 项.是否大图 })
        }
      }
    } catch {
      // 静默
    } finally {
      扫描大图标中.value = false
    }
    if (大图标清除定时器) clearTimeout(大图标清除定时器)
    大图标清除定时器 = setTimeout(() => {
      大图标信息.clear()
    }, 1 * 60 * 1000)
  }

  /** 设置引用统计结果（由管理视图统计卡片/菜单/壁纸后传入），显示 1 分钟后自动退出 */
  function 设置引用统计(统计: Record<string, { 卡片: number; 菜单: number; 壁纸: number }>) {
    引用统计.clear()
    for (const [值, 详情] of Object.entries(统计)) {
      引用统计.set(值, { ...详情, 总数: 详情.卡片 + 详情.菜单 + 详情.壁纸 })
    }
    引用显示中.value = Object.keys(统计).length > 0
    if (引用显示定时器) clearTimeout(引用显示定时器)
    引用显示定时器 = setTimeout(() => {
      引用显示中.value = false
      引用统计.clear()
    }, 1 * 60 * 1000)
  }

  /** 立即清理引用徽标与尺寸角标的显示状态及定时器（切页/切类别时调用，避免跨页残留） */
  function 清理引用显示() {
    if (引用显示定时器) {
      clearTimeout(引用显示定时器)
      引用显示定时器 = null
    }
    引用显示中.value = false
    引用统计.clear()
    if (大图标清除定时器) {
      clearTimeout(大图标清除定时器)
      大图标清除定时器 = null
    }
    大图标信息.clear()
  }

  /** 打开清理未引用确认弹窗 */
  function 打开清理确认(待删列表: { 图标值: string; 显示名: string; 分组名: string; 类别: string }[]) {
    清理待删列表.value = 待删列表
    清理确认弹窗可见.value = true
  }

  function 关闭清理确认() {
    清理确认弹窗可见.value = false
    清理待删列表.value = []
  }

  /** 执行清理：批量删除记录 + 物理文件，并同步清理前端缓存状态 */
  async function 执行清理未引用() {
    if (!是Electron || 清理待删列表.value.length === 0) return
    const 值列表 = 清理待删列表.value.map((i) => i.图标值)
    try {
      const 结果 = await window.electronAPI.图标库批量清理图标(值列表)
      if (结果.成功 && 结果.数据) {
        原始数据.value = 结果.数据 as 图标库数据
        for (const 值 of 值列表) {
          大图标信息.delete(值)
          引用统计.delete(值)
          清除图片缓存(值)
        }
      }
    } catch {
      // 静默
    }
    关闭清理确认()
  }

  // ===== 分类选择恢复（含默认分组，FA 和 Emoji 分开） =====
  const 分类选择弹窗可见 = ref(false)
  const 分类勾选 = reactive(new Map<string, boolean>())
  const FA分类摘要 = ref<{ 分类键: string; 分类名: string; 图标数: number }[]>([])
  const Emoji分类摘要 = ref<{ 分类键: string; 分类名: string; 图标数: number }[]>([])

  async function 加载FA分类摘要() {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.图标库获取FA分类摘要()
      if (结果.成功 && 结果.摘要) {
        FA分类摘要.value = 结果.摘要
      }
    } catch {
      // 静默
    }
  }

  async function 加载Emoji分类摘要() {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.图标库获取Emoji分类摘要()
      if (结果.成功 && 结果.摘要) {
        Emoji分类摘要.value = 结果.摘要
      }
    } catch {
      // 静默
    }
  }

  const 当前分类摘要 = computed(() => {
    return 当前类别.value === 'emoji' ? Emoji分类摘要.value : FA分类摘要.value
  })

  async function 打开分类选择弹窗() {
    分类勾选.clear()
    分类勾选.set('__default__', false)
    if (当前类别.value === 'fontawesome') {
      await 加载FA分类摘要()
      for (const 分类 of FA分类摘要.value) {
        分类勾选.set(分类.分类键, false)
      }
    } else if (当前类别.value === 'emoji') {
      await 加载Emoji分类摘要()
      for (const 分类 of Emoji分类摘要.value) {
        分类勾选.set(分类.分类键, false)
      }
    }
    分类选择弹窗可见.value = true
  }

  function 关闭分类选择弹窗() {
    分类选择弹窗可见.value = false
    分类勾选.clear()
  }

  function 切换全选(选中: boolean) {
    分类勾选.set('__default__', 选中)
    for (const 分类 of 当前分类摘要.value) {
      分类勾选.set(分类.分类键, 选中)
    }
  }

  const 已勾选数 = computed(() => {
    let 数 = 0
    for (const [键, 值] of 分类勾选) {
      if (键 !== '__default__' && 值) 数++
    }
    if (分类勾选.get('__default__')) 数++
    return 数
  })

  async function 确认分类恢复() {
    if (!是Electron) return

    const 选中默认分组 = 分类勾选.get('__default__')
    const 选中键列表 = 当前分类摘要.value.filter((分类) => 分类勾选.get(分类.分类键)).map((分类) => 分类.分类键)

    if (!选中默认分组 && 选中键列表.length === 0) {
      关闭分类选择弹窗()
      return
    }

    try {
      if (选中默认分组) {
        const 类别 = 当前类别.value
        if (类别 === 'fontawesome' || 类别 === 'emoji') {
          const 结果 = await window.electronAPI.图标库恢复默认分组(类别)
          if (结果.成功) {
            原始数据.value = 结果.数据
            const 默认分组 = 结果.数据[类别]?.分组列表?.find((g: 图标分组) => g.名称 === '默认分组')
            if (默认分组) {
              展开分组.set(分组key(类别, 默认分组.名称), true)
            }
          }
        }
      }
      if (选中键列表.length > 0) {
        if (当前类别.value === 'fontawesome') {
          const 结果 = await window.electronAPI.图标库按分类恢复分组(选中键列表)
          if (结果.成功) {
            原始数据.value = 结果.数据
            for (const 分组 of 结果.数据.fontawesome?.分组列表 || []) {
              展开分组.set(分组key('fontawesome', 分组.名称), true)
            }
          }
        } else if (当前类别.value === 'emoji') {
          const 结果 = await window.electronAPI.图标库按Emoji分类恢复分组(选中键列表)
          if (结果.成功) {
            原始数据.value = 结果.数据
            for (const 分组 of 结果.数据.emoji?.分组列表 || []) {
              展开分组.set(分组key('emoji', 分组.名称), true)
            }
          }
        }
      }
    } catch {
      // 静默失败
    }
    关闭分类选择弹窗()
  }

  // ===== 右键菜单 =====
  function 打开右键菜单(event: MouseEvent, 类型: '分组' | '图标' | '空白', 分组名 = '', 图标值?: string) {
    const 菜单宽度 = 160
    let x = event.clientX
    let y = event.clientY

    if (x + 菜单宽度 > window.innerWidth) {
      x = window.innerWidth - 菜单宽度 - 8
    }
    if (y + 120 > window.innerHeight) {
      y = window.innerHeight - 120 - 8
    }

    右键菜单.value = {
      可见: true,
      x,
      y,
      类型,
      分组名,
      图标值: 图标值 || '',
    }
  }

  function 关闭右键菜单() {
    右键菜单.value.可见 = false
  }

  return {
    // 状态
    原始数据,
    加载中,
    错误信息,
    图片缓存,
    当前类别,
    排序方向,
    搜索词,
    展开分组,
    添加分组输入中,
    添加分组输入值,
    表单弹窗可见,
    表单弹窗模式,
    表单弹窗分组名,
    表单弹窗图标值,
    表单弹窗显示名,
    右键菜单,
    重命名中,
    重命名值,

    // 颜色配置
    类别背景颜色,
    类别透明背景,
    颜色历史,

    // 计算属性
    当前类别数据,
    当前分组列表,
    可见分组列表,
    类别标签列表,

    // 分类选择恢复（含默认分组，FA 和 Emoji 分开）
    分类选择弹窗可见,
    FA分类摘要,
    Emoji分类摘要,
    当前分类摘要,
    分类勾选,
    已勾选数,

    // 图片弹窗状态
    图片弹窗可见,
    图片弹窗模式,
    图片弹窗分组名,
    图片弹窗原图标值,
    图片弹窗图片路径,
    图片弹窗图片Base64,
    图片弹窗显示名,
    图片弹窗文件大小,
    图片弹窗文件类型,

    // 网页图标弹窗状态
    URL弹窗可见,
    URL弹窗模式,
    URL弹窗分组名,
    URL弹窗原图标值,
    URL弹窗绑定域名,
    URL弹窗下载地址,
    URL弹窗图片Base64,
    URL弹窗缓存文件名,
    URL弹窗显示名,
    URL弹窗下载中,
    URL弹窗错误信息,
    URL弹窗本地替换Base64,
    URL弹窗已绑定列表,

    // 引用查询
    引用弹窗可见,
    引用图标值,
    引用图标分组,
    引用卡片列表,
    查询引用数,
    打开引用弹窗,
    关闭引用弹窗,
    查找同域名替代图标,
    // 统一为此图标（第 7 项：引用迁移）
    统一图标弹窗可见,
    统一图标目标,
    统一图标卡片列表,
    统一图标无引用数,
    当前图标可统一,
    打开统一图标弹窗,
    关闭统一图标弹窗,
    执行统一图标,

    // 图标裁切
    裁切弹窗可见,
    裁切弹窗图标值,
    裁切弹窗相对路径,
    打开裁切弹窗,
    关闭裁切弹窗,
    裁切完成,

    // 图标压缩状态
    压缩弹窗可见,
    压缩弹窗图标值,
    压缩弹窗相对路径,
    图标可压缩,
    打开压缩弹窗,
    关闭压缩弹窗,
    压缩完成,

    // 大图标扫描与引用统计（空白区右键菜单）
    大图标信息,
    引用统计,
    引用显示中,
    扫描大图标中,
    清理确认弹窗可见,
    清理待删列表,
    扫描大图标,
    设置引用统计,
    清理引用显示,
    打开清理确认,
    关闭清理确认,
    执行清理未引用,

    // 方法
    加载数据,
    获取图片Base64,
    保证图片加载,
    切换类别,
    切换排序方向,
    切换展开,
    开始添加分组,
    取消添加分组,
    确认添加分组,
    删除分组,
    开始重命名,
    确认重命名,
    取消重命名,
    添加图标到分组,
    删除图标,
    移动图标,
    移动分组,
    打开添加弹窗,
    打开编辑弹窗,
    关闭弹窗,
    确认弹窗,
    打开右键菜单,
    关闭右键菜单,
    打开分类选择弹窗,
    关闭分类选择弹窗,
    切换全选,
    确认分类恢复,
    打开图片添加弹窗,
    打开图片编辑弹窗,
    图片弹窗选择文件,
    关闭图片弹窗,
    确认图片弹窗,
    打开URL添加弹窗,
    打开URL编辑弹窗,
    URL弹窗下载图片,
    URL弹窗选择本地文件,
    关闭URL弹窗,
    确认URL弹窗,

    // 颜色配置方法
    加载颜色配置,
    保存颜色配置,
    设置当前类别背景颜色,
    设置当前类别背景颜色仅预览,
    设置当前类别背景颜色并持久化,
    设置当前类别背景颜色并记录,
    设置当前类别透明背景,
  }
})
