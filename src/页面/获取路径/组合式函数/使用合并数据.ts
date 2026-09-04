/**
 * 使用合并数据 —— 管理合并数据功能的配置和操作
 *
 * 功能：
 * - 合并规则文件管理（.mergelist 文件的创建、切换、删除、重命名）
 * - 文件路径列表管理（添加、删除、一键获取、清空）
 * - 合并配置管理（文件类型、输出格式、存储位置、选项开关）
 * - 合并执行（调用后端 IPC 合并文件）
 * - 持久化（全局配置、当前规则文件）
 */
import { ref, computed, watch, onMounted } from 'vue'
import type { 树形节点 } from '../类型/index'

/** 默认支持的文件类型（Glob 模式） */
const 默认文件类型 = ['*.ts', '*.vue', '*.js', '*.css', '*.html', '*.json', '*.py', '*.md', '*.jsx', '*.tsx', '*.scss', '*.less', '*.java', '*.go', '*.rs', '*.yaml', '*.yml', '*.xml']

/** localStorage 键名 */
const 存储键_当前规则文件 = 'merge-rule-current'

/**
 * @param 获取未排除节点列表 - 返回未排除节点列表的 getter（用于一键获取）
 * @param 当前项目路径 - 返回当前项目路径的 getter
 * @param 扫描完成标志 - 返回扫描是否完成的 getter（用于控制一键获取按钮）
 */
export function 使用合并数据(获取未排除节点列表: () => 树形节点[], 当前项目路径: () => string, 扫描完成标志?: () => boolean) {
  // ==================== 判断 Electron 环境 ====================

  const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

  // ==================== 弹窗显示状态 ====================

  const 显示弹窗 = ref(false)

  function 打开弹窗() {
    显示弹窗.value = true
  }

  function 关闭弹窗() {
    显示弹窗.value = false
  }

  // ==================== 合并规则文件管理 ====================

  /** 当前规则文件名（含后缀 .mergelist） */
  const 当前文件名 = ref('')
  /** 栏标题（不含后缀） */
  const 栏标题 = ref('未创建规则')
  /** 是否有规则文件存在 */
  const 有规则文件 = ref(false)
  /** 规则文件列表（仅文件名） */
  const 规则文件列表 = ref<string[]>([])

  /**
   * 保存当前规则文件名到 localStorage
   */
  function 保存当前文件名到存储() {
    if (当前文件名.value && 当前项目路径()) {
      try {
        localStorage.setItem(
          存储键_当前规则文件,
          JSON.stringify({
            项目路径: 当前项目路径(),
            文件名: 当前文件名.value,
          }),
        )
      } catch {
        // 忽略存储错误
      }
    }
  }

  /**
   * 从 localStorage 恢复上次打开的规则文件名
   */
  function 从存储恢复文件名(): string | null {
    try {
      const 数据 = localStorage.getItem(存储键_当前规则文件)
      if (数据) {
        const { 项目路径, 文件名 } = JSON.parse(数据)
        if (项目路径 === 当前项目路径() && 文件名) {
          return 文件名
        }
      }
    } catch {
      // 忽略读取错误
    }
    return null
  }

  /**
   * 加载合并规则文件列表
   */
  async function 加载规则文件列表() {
    if (!是否Electron环境 || !当前项目路径()) return

    const 响应 = await window.electronAPI.列出合并规则文件(当前项目路径())
    if (响应.成功 && 响应.文件列表) {
      规则文件列表.value = 响应.文件列表.map((f) => f.文件名)

      if (响应.文件列表.length > 0) {
        // 优先恢复上次打开的规则文件
        const 上次文件名 = 从存储恢复文件名()
        if (上次文件名 && 规则文件列表.value.includes(上次文件名)) {
          await 切换规则文件(上次文件名)
        } else if (当前文件名.value && 规则文件列表.value.includes(当前文件名.value)) {
          await 切换规则文件(当前文件名.value)
        } else {
          await 切换规则文件(响应.文件列表[0]!.文件名)
        }
      } else {
        // 没有规则文件，回到初始态
        当前文件名.value = ''
        栏标题.value = '未创建规则'
        有规则文件.value = false
        文件路径列表.value = []
      }
    }
  }

  /**
   * 切换规则文件
   */
  async function 切换规则文件(文件名: string) {
    if (!是否Electron环境 || !当前项目路径()) return

    当前文件名.value = 文件名
    栏标题.value = 文件名.replace('.mergelist', '')
    有规则文件.value = true
    保存当前文件名到存储()

    const 响应 = await window.electronAPI.读取合并规则文件(当前项目路径(), 文件名)
    if (响应.成功 && 响应.路径列表) {
      文件路径列表.value = [...响应.路径列表]
    } else {
      文件路径列表.value = []
    }
  }

  /**
   * 保存当前规则文件
   */
  async function 保存当前规则文件() {
    if (!是否Electron环境 || !当前项目路径() || !当前文件名.value) return

    await window.electronAPI.保存合并规则文件(当前项目路径(), 当前文件名.value, [...文件路径列表.value])
  }

  /**
   * 新建规则文件
   * @param 基础名称 可选，用于指定规则文件的基础名称；未传则使用后端的默认值"合并规则"
   */
  async function 处理新建规则(基础名称?: string) {
    if (!是否Electron环境 || !当前项目路径()) return

    const 响应 = await window.electronAPI.创建合并规则文件(当前项目路径(), 基础名称)
    if (响应.成功 && 响应.文件名) {
      规则文件列表.value.push(响应.文件名)
      await 切换规则文件(响应.文件名)
    }
  }

  /**
   * 切换规则文件（来自下拉菜单）
   */
  async function 处理切换规则文件(文件名: string) {
    await 保存当前规则文件()
    await 切换规则文件(文件名)
  }

  /**
   * 删除规则文件
   */
  async function 处理删除规则文件(文件名: string) {
    if (!是否Electron环境 || !当前项目路径()) return

    await window.electronAPI.删除合并规则文件(当前项目路径(), 文件名)
    规则文件列表.value = 规则文件列表.value.filter((f) => f !== 文件名)

    if (规则文件列表.value.length === 0) {
      当前文件名.value = ''
      栏标题.value = '未创建规则'
      有规则文件.value = false
      文件路径列表.value = []
    } else {
      const 下一个 = 规则文件列表.value[0]!
      await 切换规则文件(下一个)
    }
  }

  /**
   * 清空所有规则文件
   */
  async function 处理清空所有规则文件() {
    if (!是否Electron环境 || !当前项目路径()) return

    for (const 文件名 of [...规则文件列表.value]) {
      await window.electronAPI.删除合并规则文件(当前项目路径(), 文件名)
    }

    规则文件列表.value = []
    当前文件名.value = ''
    栏标题.value = '未创建规则'
    有规则文件.value = false
    文件路径列表.value = []
  }

  /**
   * 标题提交（重命名规则文件）
   */
  async function 处理标题提交(新标题: string) {
    if (!是否Electron环境 || !当前项目路径() || !当前文件名.value) return

    const 新文件名 = `${新标题}.mergelist`
    // 检查重名冲突
    if (规则文件列表.value.includes(新文件名) && 新文件名 !== 当前文件名.value) return false

    const 响应 = await window.electronAPI.重命名合并规则文件(当前项目路径(), 当前文件名.value, 新文件名)
    if (响应.成功) {
      const 索引 = 规则文件列表.value.indexOf(当前文件名.value)
      if (索引 !== -1) {
        规则文件列表.value[索引] = 新文件名
      }
      当前文件名.value = 新文件名
      栏标题.value = 新标题
      return true
    }
    return false
  }

  // ==================== 文件路径列表管理 ====================

  /** 文件路径列表 */
  const 文件路径列表 = ref<string[]>([])

  /** 统计信息 */
  const 文件数 = computed(() => 文件路径列表.value.length)

  /** 预计合并大小（估算） */
  const 预计合并大小 = computed(() => {
    const 大小KB = 文件数.value * 2
    if (大小KB < 1024) {
      return `${大小KB} KB`
    }
    return `${(大小KB / 1024).toFixed(1)} MB`
  })

  /**
   * 手动添加路径
   */
  function 添加路径(路径: string) {
    const 清理后 = 路径.trim()
    if (!清理后) return false

    // 路径不能以 . 开头
    if (清理后.startsWith('.')) return false
    // 不接受绝对路径
    if (清理后.startsWith('/') || 清理后.match(/^[a-zA-Z]:\\/)) return false

    // 统一使用正斜杠
    const 标准化路径 = 清理后.replace(/\\/g, '/')

    // 检查重复
    if (文件路径列表.value.includes(标准化路径)) return false

    文件路径列表.value.push(标准化路径)
    return true
  }

  /**
   * 删除路径
   */
  function 删除路径(路径: string) {
    const 索引 = 文件路径列表.value.indexOf(路径)
    if (索引 !== -1) {
      文件路径列表.value.splice(索引, 1)
    }
  }

  /**
   * 一键获取：从预览模式获取所有未排除文件的相对路径
   */
  function 一键获取() {
    const 节点列表 = 获取未排除节点列表()
    const 路径列表: string[] = []

    function 遍历(节点: 树形节点) {
      if (!节点.isFolder) {
        路径列表.push(节点.path)
      }
      if (节点.children) {
        节点.children.forEach(遍历)
      }
    }
    节点列表.forEach(遍历)

    文件路径列表.value = 路径列表
  }

  /**
   * 清空列表
   */
  function 清空列表() {
    文件路径列表.value = []
    跳过文件列表.value = []
    合并结果.value = null
  }

  /**
   * 保存路径列表（从 textarea 文本解析后整体替换）
   */
  function 保存路径列表(路径列表: string[]) {
    文件路径列表.value = 路径列表
  }

  /** 一键获取是否可用（扫描完成才可用） */
  const 一键获取可用 = computed(() => {
    if (扫描完成标志) {
      return 扫描完成标志()
    }
    return true
  })

  // ==================== 合并配置管理 ====================

  const 支持的文件类型 = ref<string[]>([])
  const 输出格式 = ref<'md' | 'txt'>('txt')
  const 添加路径注释 = ref(true)
  const 添加分隔 = ref(true)
  const 合并规则路径 = ref('')
  const 输出保存路径 = ref('')
  const 加载配置中 = ref(true)

  /** 输出文件名（由栏标题 + 格式决定默认值） */
  const 输出文件名 = computed(() => {
    const 基础名 = 栏标题.value === '未创建规则' ? '排除规则-合并输出' : 栏标题.value
    return `${基础名}-合并输出`
  })

  /** 最终输出文件名（含扩展名） */
  const 最终输出文件名 = computed(() => {
    return `${输出文件名.value}.${输出格式.value}`
  })

  /**
   * 加载全局合并配置
   */
  async function 加载配置() {
    if (是否Electron环境) {
      try {
        const 项目路径值 = 当前项目路径()
        const [配置, 路径响应] = await Promise.all([window.electronAPI.读取合并配置(), 项目路径值 ? window.electronAPI.获取规则存储路径(项目路径值) : null])
        支持的文件类型.value = 配置.支持的文件类型 ?? [...默认文件类型]
        输出格式.value = 配置.输出格式 ?? 'txt'
        添加路径注释.value = 配置.添加路径注释 ?? true
        添加分隔.value = 配置.添加分隔 ?? true
        if (路径响应?.成功) {
          合并规则路径.value = 路径响应.合并规则路径 ?? ''
          输出保存路径.value = 路径响应.合并代码输出路径 ?? ''
        }
      } catch {
        支持的文件类型.value = [...默认文件类型]
      }
    } else {
      支持的文件类型.value = [...默认文件类型]
    }
    加载配置中.value = false
  }

  /**
   * 保存全局合并配置
   */
  async function 保存配置() {
    if (!是否Electron环境) return

    const 配置数据 = JSON.parse(
      JSON.stringify({
        支持的文件类型: 支持的文件类型.value,
        输出格式: 输出格式.value,
        添加路径注释: 添加路径注释.value,
        添加分隔: 添加分隔.value,
      }),
    )
    await window.electronAPI.保存合并配置(配置数据)
  }

  /**
   * 暴露给父组件：保存当前配置（供防抖自动保存调用）
   */
  async function 保存当前配置() {
    await 保存配置()
  }

  // ==================== 合并执行 ====================

  const 合并中 = ref(false)
  const 合并结果 = ref<{ 成功: boolean; 信息: string; 文件路径?: string; 已合并数?: number; 跳过数?: number } | null>(null)
  const 跳过文件列表 = ref<string[]>([])

  /**
   * 开始合并
   */
  async function 开始合并() {
    const 路径 = 当前项目路径()
    if (!路径) {
      合并结果.value = { 成功: false, 信息: '请先获取项目' }
      return
    }

    if (文件路径列表.value.length === 0) {
      合并结果.value = { 成功: false, 信息: '文件列表为空，无法合并' }
      return
    }

    合并中.value = true
    合并结果.value = null

    // 先保存当前规则文件和全局配置
    await 保存当前规则文件()
    await 保存配置()

    // 转换为绝对路径
    const 项目路径标准化 = 路径.replace(/\\/g, '/')
    const 绝对路径列表 = 文件路径列表.value.map((p) => `${项目路径标准化}/${p}`)

    try {
      const 请求数据 = JSON.parse(
        JSON.stringify({
          项目路径: 路径,
          输出文件名: 最终输出文件名.value,
          文件路径列表: 绝对路径列表,
          配置: {
            支持的文件类型: 支持的文件类型.value,
            添加路径注释: 添加路径注释.value,
            添加分隔: 添加分隔.value,
          },
        }),
      )
      const 响应 = await window.electronAPI.合并文件(请求数据)
      if (响应.成功) {
        跳过文件列表.value = 响应.跳过文件列表 ?? []
        合并结果.value = {
          成功: true,
          信息: `合并完成，共 ${响应.已合并文件数} 个文件`,
          文件路径: 响应.输出文件路径,
          已合并数: 响应.已合并文件数,
          跳过数: 响应.跳过文件数,
        }
      } else {
        合并结果.value = { 成功: false, 信息: 响应.错误信息 ?? '合并失败' }
      }
    } catch (错误) {
      合并结果.value = { 成功: false, 信息: String(错误) }
    } finally {
      合并中.value = false
    }
  }

  // ==================== 自动合并代码（"合并代码"按钮） ====================

  /**
   * 自动合并代码：打开弹窗 → 收集未排除节点 → 写入规则文件 → 直接更新前端状态 → 触发合并
   * @param 获取未排除节点列表 - 获取当前未排除节点列表的函数
   * @param 传入栏标题 - 当前规则栏标题（用于生成规则文件名）
   */
  async function 自动合并代码(获取未排除节点列表: () => 树形节点[], 传入栏标题: string) {
    // 1. 打开合并弹窗
    显示弹窗.value = true

    // 2. 收集未排除节点中的非文件夹路径
    const 路径列表: string[] = []
    function 遍历节点(节点列表: 树形节点[]) {
      for (const 节点 of 节点列表) {
        if (!节点.isFolder) {
          路径列表.push(节点.path)
        }
        if (节点.children && 节点.children.length > 0) {
          遍历节点(节点.children)
        }
      }
    }
    遍历节点(获取未排除节点列表())

    // 3. 直接更新内存中的文件路径列表（覆盖旧数据）
    文件路径列表.value = [...路径列表]

    // 4. 确定规则文件名
    const 基础名称 = 传入栏标题
    const 文件名 = `${基础名称}.mergelist`

    // 5. 写入规则文件（覆盖已有文件或创建新文件）
    if (是否Electron环境 && 当前项目路径()) {
      const 写入响应 = await window.electronAPI.保存合并规则文件(当前项目路径(), 文件名, 路径列表)
      if (!写入响应.成功) {
        console.error('合并代码：写入规则文件失败', 写入响应.错误信息)
        return
      }
    }

    // 6. 更新前端状态，让用户看到切换到了新文件（跳过 处理切换规则文件，避免其从后端读取旧数据覆盖最新路径列表）
    当前文件名.value = 文件名
    栏标题.value = 基础名称
    有规则文件.value = true
    if (!规则文件列表.value.includes(文件名)) {
      规则文件列表.value.push(文件名)
    }
    保存当前文件名到存储()

    // 7. 自动触发合并
    await 开始合并()
  }

  // ==================== 初始化 ====================

  onMounted(async () => {
    await 加载配置()
    if (当前项目路径()) {
      await 加载规则文件列表()
    }
  })

  // 当项目路径变化时重新加载规则文件
  watch(
    () => 当前项目路径(),
    async (新路径) => {
      if (新路径) {
        await 加载规则文件列表()
        const 路径响应 = await window.electronAPI.获取规则存储路径(新路径)
        if (路径响应.成功) {
          合并规则路径.value = 路径响应.合并规则路径 ?? ''
          输出保存路径.value = 路径响应.合并代码输出路径 ?? ''
        }
      }
    },
  )

  return {
    // 弹窗状态
    显示弹窗,
    打开弹窗,
    关闭弹窗,

    // 规则文件管理
    当前文件名,
    栏标题,
    有规则文件,
    规则文件列表,
    处理新建规则,
    处理切换规则文件,
    处理删除规则文件,
    处理清空所有规则文件,
    处理标题提交,

    // 文件路径列表
    文件路径列表,
    文件数,
    预计合并大小,
    添加路径,
    保存路径列表,
    一键获取,
    清空列表,
    一键获取可用,

    // 合并配置
    支持的文件类型,
    输出格式,
    添加路径注释,
    添加分隔,
    合并规则路径,
    输出保存路径,
    输出文件名,
    最终输出文件名,
    加载配置中,

    // 合并执行
    合并中,
    合并结果,
    跳过文件列表,
    开始合并,

    // 自动合并
    自动合并代码,

    // 公开方法
    保存当前配置,
  }
}
