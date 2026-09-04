import { ref, computed, reactive, onMounted, watch } from 'vue'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'
import type { 图标分组, 图标类别数据 } from '@/页面/启动/仓库/图标库仓库'

export type 图标选择回调 = (图标值: string) => void

// ===== 分组折叠状态（模块级单例，树形菜单容器与壁纸库弹窗共用，本地持久化） =====
/** localStorage 键：悬浮图标面板分组折叠状态 */
const 折叠分组存储键 = '悬浮图标面板-分组折叠'

/** true = 折叠，缺省 = 展开。key = `${标签}/${分组名}` */
const 折叠分组 = reactive(new Map<string, boolean>())

/** 从 localStorage 恢复折叠状态 */
function 恢复分组折叠() {
  try {
    const 原始 = localStorage.getItem(折叠分组存储键)
    if (!原始) return
    const 数据 = JSON.parse(原始) as Record<string, boolean>
    for (const [键, 值] of Object.entries(数据)) {
      折叠分组.set(键, 值)
    }
  } catch {
    // 静默
  }
}

/** 将折叠状态保存到 localStorage */
function 保存分组折叠() {
  try {
    const 数据: Record<string, boolean> = {}
    折叠分组.forEach((值, 键) => {
      数据[键] = 值
    })
    localStorage.setItem(折叠分组存储键, JSON.stringify(数据))
  } catch {
    // 静默
  }
}

恢复分组折叠()

// 折叠状态变化时自动持久化（模块级 watcher，随应用常驻）
watch(折叠分组, 保存分组折叠, { deep: true })

/**
 * 图标选择面板组合式函数
 * 提供 FA图标/Emoji/全局图标 悬浮面板选择
 * 调用方通过 打开面板(回调, 元素) 传入选择后的处理逻辑
 */
export function 使用菜单图标面板() {
  const 图标库仓库 = 使用图标库仓库()

  // ===== 面板状态 =====
  const 面板可见 = ref(false)
  const 面板标签 = ref<'fa' | 'emoji' | 'global'>('fa')

  // 面板标签切换时持久化
  watch(面板标签, (值) => {
    使用图标选择历史仓库().保存标签(值)
  })
  const 搜索文本 = ref('')
  const 排序方向 = ref<'升序' | '降序'>('升序')

  // ===== 选择回调 =====
  let 当前回调: 图标选择回调 | null = null

  // ===== 面板定位 =====
  const 面板位置 = ref({ x: 0, y: 0 })

  /** 打开面板 */
  function 打开面板(回调: 图标选择回调, 触发元素: HTMLElement) {
    当前回调 = 回调
    面板标签.value = 使用图标选择历史仓库().上次标签
    搜索文本.value = ''

    // 定位到触发按钮下方，有边界检测防止超出视口
    const rect = 触发元素.getBoundingClientRect()
    const 面板宽 = 400
    const 面板高 = 400
    const 间距 = 4

    // 水平方向：默认左对齐，超出右侧则右对齐
    let x = rect.left
    if (x + 面板宽 > window.innerWidth) {
      x = window.innerWidth - 面板宽 - 间距
    }
    if (x < 0) x = 间距

    // 垂直方向：默认显示在下方，超出底部则显示在上方
    let y = rect.bottom + 间距
    if (y + 面板高 > window.innerHeight) {
      y = rect.top - 面板高 - 间距
    }
    if (y < 0) y = 间距

    面板位置.value = { x, y }

    面板可见.value = true
  }

  /** 关闭面板 */
  function 关闭面板() {
    面板可见.value = false
    当前回调 = null
    搜索文本.value = ''
  }

  /** 执行选择回调 */
  function 执行选择(图标值: string) {
    if (当前回调) {
      当前回调(图标值)
    }
  }

  /** 切换排序方向 */
  function 切换排序() {
    排序方向.value = 排序方向.value === '升序' ? '降序' : '升序'
  }

  /** 应用排序 */
  function 应用排序<T>(列表: T[]): T[] {
    if (排序方向.value === '降序') return [...列表].reverse()
    return 列表
  }

  // ===== 数据获取（从图标库仓库） =====

  /** FA 图标按分组 */
  const FA图标按分组 = computed(() => {
    const 类别 = 图标库仓库.原始数据?.fontawesome
    if (!类别) return []
    return 类别.分组列表
      .map((g: 图标分组) => ({
        分组名: g.名称,
        图标: g.图标.map((i) => i.值).filter((v: string) => v.startsWith('fa-') || v.startsWith('fas ') || v.startsWith('far ') || v.startsWith('fab ')),
      }))
      .filter((g) => g.图标.length > 0)
  })

  /** Emoji 按分组 */
  const Emoji按分组 = computed(() => {
    const 类别 = 图标库仓库.原始数据?.emoji
    if (!类别) return []
    return 类别.分组列表
      .map((g: 图标分组) => ({
        分组名: g.名称,
        图标: g.图标.map((i) => i.值).filter((v: string) => !v.startsWith('fa-') && !v.startsWith('fas ') && !v.startsWith('far ') && !v.startsWith('fab ') && !v.startsWith('icons:')),
      }))
      .filter((g) => g.图标.length > 0)
  })

  /** 全局图标按分组 */
  const 全局图标按分组 = computed(() => {
    const 类别 = 图标库仓库.原始数据?.userUpload
    if (!类别) return []
    return 类别.分组列表
      .map((g: 图标分组) => ({
        分组名: g.名称,
        图标: g.图标.map((i) => i.值).filter((v: string) => v.startsWith('icons:')),
      }))
      .filter((g) => g.图标.length > 0)
  })

  /** 判断图标是否匹配搜索词（同时匹配图标值和显示名） */
  function 匹配图标(类别: 图标类别数据 | undefined, 分组名: string, 图标值: string, 搜索: string): boolean {
    if (图标值.toLowerCase().includes(搜索)) return true
    const 图标项 = 类别?.分组列表.find((p) => p.名称 === 分组名)?.图标.find((i) => i.值 === 图标值)
    return !!图标项 && 图标项.显示名.toLowerCase().includes(搜索)
  }

  /** 过滤后的 FA 图标 */
  const 过滤FA图标 = computed(() => {
    const 搜索 = 搜索文本.value.trim().toLowerCase()
    let 列表 = FA图标按分组.value
    if (搜索) {
      const 类别 = 图标库仓库.原始数据?.fontawesome
      列表 = 列表
        .map((g) => ({
          分组名: g.分组名,
          图标: g.图标.filter((icon) => 匹配图标(类别, g.分组名, icon, 搜索)),
        }))
        .filter((g) => g.图标.length > 0)
    }
    return 应用排序(列表)
  })

  /** 过滤后的 Emoji */
  const 过滤Emoji = computed(() => {
    const 搜索 = 搜索文本.value.trim().toLowerCase()
    let 列表 = Emoji按分组.value
    if (搜索) {
      const 类别 = 图标库仓库.原始数据?.emoji
      列表 = 列表
        .map((g) => ({
          分组名: g.分组名,
          图标: g.图标.filter((e) => 匹配图标(类别, g.分组名, e, 搜索)),
        }))
        .filter((g) => g.图标.length > 0)
    }
    return 应用排序(列表)
  })

  /** 过滤后的全局图标 */
  const 过滤全局图标 = computed(() => {
    const 搜索 = 搜索文本.value.trim().toLowerCase()
    let 列表 = 全局图标按分组.value
    if (搜索) {
      const 类别 = 图标库仓库.原始数据?.userUpload
      列表 = 列表
        .map((g) => ({
          分组名: g.分组名,
          图标: g.图标.filter((图标值) => 匹配图标(类别, g.分组名, 图标值, 搜索)),
        }))
        .filter((g) => g.图标.length > 0)
    }
    return 应用排序(列表)
  })

  // ===== 分组折叠状态（引用模块级单例 折叠分组，已本地持久化，开关面板不重置） =====

  function 分组折叠键(分组名: string): string {
    return `${面板标签.value}/${分组名}`
  }

  /** 判断某分组是否折叠 */
  function 分组是否折叠(分组名: string): boolean {
    return 折叠分组.get(分组折叠键(分组名)) === true
  }

  /** 切换某分组的折叠状态 */
  function 切换分组折叠(分组名: string) {
    const 键 = 分组折叠键(分组名)
    折叠分组.set(键, 折叠分组.get(键) !== true)
  }

  /** 当前标签下的过滤分组列表 */
  function 当前过滤分组列表(): { 分组名: string; 图标: string[] }[] {
    if (面板标签.value === 'fa') return 过滤FA图标.value
    if (面板标签.value === 'emoji') return 过滤Emoji.value
    return 过滤全局图标.value
  }

  /** 折叠当前标签下全部分组 */
  function 折叠全部分组() {
    for (const 分组 of 当前过滤分组列表()) {
      折叠分组.set(分组折叠键(分组.分组名), true)
    }
  }

  /** 展开当前标签下全部分组 */
  function 展开全部分组() {
    for (const 分组 of 当前过滤分组列表()) {
      折叠分组.set(分组折叠键(分组.分组名), false)
    }
  }

  // ===== 全局图标加载状态（图片缓存统一存于图标库仓库） =====
  const 全局图标加载中 = ref(false)

  /** 触发所有全局图标的懒加载（并发由图标库仓库的保证图片加载节流控制） */
  async function 预加载全局图标预览() {
    if (全局图标加载中.value) return
    全局图标加载中.value = true
    try {
      if (!图标库仓库.原始数据?.userUpload) {
        await 图标库仓库.加载数据()
      }
      const 分组列表 = 全局图标按分组.value
      for (const 分组 of 分组列表) {
        for (const 图标值 of 分组.图标) {
          图标库仓库.保证图片加载(图标值)
        }
      }
    } catch {
      // 静默
    } finally {
      全局图标加载中.value = false
    }
  }

  /** 切换到全局图标标签时自动预加载 */
  function 切换到全局图标() {
    面板标签.value = 'global'
    预加载全局图标预览()
  }

  // 初始化时确保图标库数据已加载
  onMounted(() => {
    图标库仓库.加载数据()
  })

  return {
    面板可见,
    面板标签,
    搜索文本,
    排序方向,
    面板位置,
    打开面板,
    关闭面板,
    执行选择,
    切换排序,
    过滤FA图标,
    过滤Emoji,
    过滤全局图标,
    分组是否折叠,
    切换分组折叠,
    折叠全部分组,
    展开全部分组,
    全局图标加载中,
    切换到全局图标,
  }
}
