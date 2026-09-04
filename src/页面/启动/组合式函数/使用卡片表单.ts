import { ref, computed, watch, onBeforeUnmount, onMounted } from 'vue'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用图标库仓库, 规范化域名 } from '@/页面/启动/仓库/图标库仓库'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'
import type { 图标类型枚举 } from '@/页面/启动/类型/菜单类型'

/** localStorage key 前缀：图标样式偏好 */
const 偏好KEY前缀 = '启动页_图标样式偏好_'

/** 读取某卡片类型上次保存的图标样式偏好 */
export function 读取图标样式偏好(卡片类型: string): 图标类型枚举 {
  const 值 = localStorage.getItem(偏好KEY前缀 + 卡片类型)
  if (值 === 'default' || 值 === 'text' || 值 === 'image') return 值
  return 'default'
}

/** 保存某卡片类型的图标样式偏好 */
export function 保存图标样式偏好(卡片类型: string, 样式: 图标类型枚举): void {
  localStorage.setItem(偏好KEY前缀 + 卡片类型, 样式)
}

/**
 * 卡片表单组合式函数
 * 封装添加弹窗和编辑弹窗共用的表单逻辑
 */
export function 使用卡片表单(模式Ref: import('vue').Ref<'url' | 'folder' | 'app'>) {
  const 卡片仓库 = 使用卡片仓库()

  // ===== 表单字段 =====
  const 标题 = ref('')
  const 路径值 = ref('')
  const 选中颜色 = ref('#4a6fa5')
  const 路径提示 = ref('')
  const 图标类型 = ref<图标类型枚举>('default')
  const 图标文字 = ref('')
  const 图片预览 = ref<string | null>(null)
  const 文件输入框 = ref<HTMLInputElement | null>(null)
  const 获取中 = ref(false)

  /** 默认样式的图标代码（fa-xxx 或 Emoji），为空时使用类型默认图标 */
  const 图标代码 = ref('')

  /** 缓存中的临时文件名（提取/获取图标后保存） */
  let 缓存临时文件名 = ''

  // ===== 环境检测 =====
  const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动选择文件夹
  const 是Electron图片 = typeof window !== 'undefined' && window.electronAPI?.启动提取程序图标单方法
  const 是Electron检测 = typeof window !== 'undefined' && window.electronAPI?.启动检测路径

  // ===== 计算属性 =====
  const 路径标签 = computed(() => {
    const 映射: Record<string, string> = { url: '网址', folder: '文件夹路径', app: '文件路径' }
    return 映射[模式Ref.value] || '路径'
  })

  const 路径占位 = computed(() => {
    const 映射: Record<string, string> = {
      url: 'https://example.com',
      folder: 'C:\\Users\\...',
      app: 'C:\\Program Files\\...',
    }
    return 映射[模式Ref.value] || ''
  })

  /** 根据卡片类型获取 FontAwesome 图标 */
  const 获取类型图标 = computed(() => {
    const 映射: Record<string, string> = {
      url: 'fas fa-link',
      folder: 'fas fa-folder',
      app: 'fas fa-file',
    }
    return 映射[模式Ref.value] || 'fas fa-file'
  })

  const 可确认 = computed(() => {
    if (!标题.value.trim()) return false
    if (模式Ref.value === 'url' && !路径值.value.trim()) return false
    if ((模式Ref.value === 'folder' || 模式Ref.value === 'app') && !路径值.value.trim()) return false
    return true
  })

  /** 从卡片路径值中提取域名 */
  function 提取域名(): string {
    try {
      return new URL(路径值.value).hostname
    } catch {
      return ''
    }
  }

  // ===== 图标选择（公共组件回调用） =====
  const 图标库仓库 = 使用图标库仓库()

  /** 判断图标类别 */
  function 获取图标类别(图标值: string): 'fa' | 'emoji' | 'global' {
    if (图标值.startsWith('icons:')) return 'global'
    if (图标值.startsWith('fa-') || 图标值.startsWith('fas ') || 图标值.startsWith('far ') || 图标值.startsWith('fab ')) return 'fa'
    return 'emoji'
  }

  /**
   * 从图标选择面板选中图标后的处理（FA/Emoji/全局统一）
   * 全局图标归 default 态，只存 图标代码 = 'icons:xxx'，预览时按前缀渲染 base64
   */
  async function 处理面板图标选择(图标值: string) {
    图标代码.value = 图标值
    图标类型.value = 'default'
    if (图标值.startsWith('icons:')) {
      const base64 = await 图标库仓库.获取图片Base64(图标值)
      if (base64) {
        图片预览.value = base64
      }
    }
    使用图标选择历史仓库().添加(获取图标类别(图标值), 图标值)
  }


  // ===== 方法 =====

  /** 粘贴时自动填入标题 */
  function 处理粘贴(event: ClipboardEvent) {
    if (标题.value.trim()) return
    const 粘贴文本 = event.clipboardData?.getData('text') || ''
    if (!粘贴文本.trim()) return

    if (模式Ref.value === 'url') {
      try {
        const url = new URL(粘贴文本)
        标题.value = url.hostname.replace('www.', '')
      } catch {
        标题.value = 粘贴文本
      }
    } else {
      const 路径 = 粘贴文本.replace(/\\/g, '/')
      const 最后部分 = 路径.split('/').filter(Boolean).pop() || ''
      标题.value = 最后部分.replace(/\.[^.]+$/, '')
    }
  }

  /** 选择文件夹/文件路径 */
  async function 选择路径() {
    if (!是Electron) return
    try {
      if (模式Ref.value === 'folder') {
        const 结果 = await window.electronAPI.启动选择文件夹({ 标题: '选择文件夹' })
        if (结果.成功 && 结果.路径) {
          路径值.value = 结果.路径
          if (!标题.value.trim()) {
            标题.value = 结果.路径.split(/[/\\]/).filter(Boolean).pop() || ''
          }
          路径提示.value = ''
        }
      } else {
        const 结果 = await window.electronAPI.启动选择文件({ 标题: '选择文件' })
        if (结果.成功 && 结果.路径) {
          路径值.value = 结果.路径
          if (!标题.value.trim()) {
            const 文件名 = 结果.路径.split(/[/\\]/).filter(Boolean).pop() || ''
            标题.value = 文件名.replace(/\.[^.]+$/, '')
          }
          路径提示.value = ''
        }
      }
    } catch (e) {
      console.error('选择路径失败', e)
    }
  }

  /** 检测路径是否存在（watch 回调） */
  watch(路径值, async (新值) => {
    if ((模式Ref.value !== 'folder' && 模式Ref.value !== 'app') || !新值.trim()) {
      路径提示.value = ''
      return
    }
    if (是Electron检测) {
      try {
        const 结果 = await window.electronAPI.启动检测路径(新值)
        if (结果.成功) {
          if (结果.存在) {
            if (模式Ref.value === 'folder' && 结果.类型 === 'folder') {
              路径提示.value = '✅ 有效文件夹路径'
            } else if (模式Ref.value === 'app' && 结果.类型 === 'file') {
              路径提示.value = '✅ 有效文件路径'
            } else {
              路径提示.value = `❌ 路径类型不匹配，期望${模式Ref.value === 'folder' ? '文件夹' : '文件'}`
            }
          } else {
            路径提示.value = '❌ 路径不存在'
          }
        }
      } catch {
        路径提示.value = ''
      }
    } else {
      if (新值.includes(':\\') || 新值.startsWith('/')) {
        路径提示.value = '路径格式正确'
      } else {
        路径提示.value = ''
      }
    }
  })

  // ===== 自动匹配域名图标（url 类型，节省步骤） =====
  /** 是否已自动匹配过图标（防止重复填充，用户手动清除后不再自动） */
  let 已自动匹配 = false
  /** 预填表单时跳过图标类型切换触发的检测 */
  let 跳过下次图标类型检测 = false

  /** 查找图标库中绑定当前域名的图标，命中则自动设置
   * 优先级：当前卡片正用 → 最近新增（数组尾部，push 追加）→ 首个 */
  async function 检测域名图标(): Promise<void> {
    if (模式Ref.value !== 'url') return
    if (!路径值.value.trim()) return
    const 域名 = 提取域名()
    if (!域名) return
    try {
      const 仓库 = 使用图标库仓库()
      if (!仓库.原始数据?.urlDownload) {
        await 仓库.加载数据()
      }
      const 类别 = 仓库.原始数据?.urlDownload
      if (!类别) return
      // 收集全部同域名匹配项，消除"只取首个"的歧义
      const 匹配项: { 值: string }[] = []
      for (const 分组 of 类别.分组列表) {
        for (const i of 分组.图标) {
          if (i.值.startsWith('icons:') && i.绑定域名 && 规范化域名(i.绑定域名) === 规范化域名(域名)) {
            匹配项.push({ 值: i.值 })
          }
        }
      }
      if (!匹配项.length) return
      // 候选优先级：当前卡片正用 → 最近新增 → 首个
      const 候选值列表: string[] = []
      if (图标代码.value) {
        const 正用 = 匹配项.find((x) => x.值 === 图标代码.value)
        if (正用) 候选值列表.push(正用.值)
      }
      const 最近新增 = 匹配项[匹配项.length - 1]?.值
      if (最近新增 && !候选值列表.includes(最近新增)) 候选值列表.push(最近新增)
      const 首个 = 匹配项[0]?.值
      if (首个 && !候选值列表.includes(首个)) 候选值列表.push(首个)
      // 按优先级依次尝试，base64 可用才采用
      for (const 候选值 of 候选值列表) {
        const base64 = await 图标库仓库.获取图片Base64(候选值)
        if (!base64) continue
        图片预览.value = base64
        图标代码.value = 候选值
        图标类型.value = 'image'
        缓存临时文件名 = ''
        已自动匹配 = true
        return
      }
    } catch {
      // 静默
    }
  }

  /** 路径变化时自动匹配域名图标 */
  watch(路径值, async (新值) => {
    if (模式Ref.value !== 'url') return
    if (!新值.trim()) {
      已自动匹配 = false
      return
    }
    if (已自动匹配) return
    if (图标代码.value && 图标代码.value.startsWith('icons:')) return
    if (图标类型.value === 'text') return
    await 检测域名图标()
  })

  /** 切换到图片态时检测域名图标；切离时清除私有上传 */
  watch(图标类型, async (新值) => {
    if (跳过下次图标类型检测) {
      跳过下次图标类型检测 = false
      return
    }
    // 切到非图片态时清除私有上传状态
    if (新值 !== 'image' && 缓存临时文件名) {
      await 取消图片缓存()
      缓存临时文件名 = ''
      图片预览.value = null
      return
    }
    if (新值 !== 'image') return
    if (模式Ref.value !== 'url') return
    if (缓存临时文件名) return
    if (图标代码.value && 图标代码.value.startsWith('icons:')) return
    await 检测域名图标()
  })

  /** 选择图标弹窗可见性（程序图标用） */
  const 选择图标弹窗可见 = ref(false)

  /** 获取网页图标弹窗可见性（url 类型用，整合自动抓取 + 网页图标 + 已下载图标） */
  const 获取网页图标弹窗可见 = ref(false)

  /** 获取图标（程序图标或网页图标） */
  async function 获取图标() {
    if (!路径值.value.trim() || !是Electron图片) return
    if (模式Ref.value === 'url') {
      获取网页图标弹窗可见.value = true
    } else if (模式Ref.value === 'app') {
      选择图标弹窗可见.value = true
    }
  }

  /** 处理选择图标弹窗的确认事件 */
  async function 处理图标选择(完整路径: string, 是官方图标: boolean) {
    选择图标弹窗可见.value = false

    if (是官方图标) {
      获取中.value = true
      try {
        const 临时文件名 = 完整路径
        if (临时文件名) {
          缓存临时文件名 = 临时文件名
          const 预览结果 = await window.electronAPI.启动读取缓存图片(临时文件名)
          if (预览结果.成功 && 预览结果.base64) {
            图片预览.value = 预览结果.base64
            图标代码.value = ''
            图标类型.value = 'image'
          }
        }
      } catch (e) {
        console.error('读取官方图标失败', e)
      } finally {
        获取中.value = false
      }
    } else {
      获取中.value = true
      try {
        const 读取结果 = await window.electronAPI.启动读取本地图片(完整路径)
        if (读取结果.成功 && 读取结果.base64) {
          图片预览.value = 读取结果.base64
          const 上传结果 = await window.electronAPI.启动上传图片到缓存(读取结果.base64)
          if (上传结果.成功 && 上传结果.临时文件名) {
            缓存临时文件名 = 上传结果.临时文件名
            图标代码.value = ''
            图标类型.value = 'image'
          }
        } else {
          console.error('读取本地图片失败', 读取结果.错误信息)
        }
      } catch (e) {
        console.error('读取本地图片失败', e)
      } finally {
        获取中.value = false
      }
    }
  }

  /** 处理选择图标弹窗的取消事件 */
  function 处理图标选择取消() {
    选择图标弹窗可见.value = false
  }

  // ===== 本次新增网页图标的跟踪与回滚 =====
  /** 本次会话"新增"到图标库的网页图标值（保存成功前跟踪，取消/未保存自动回滚） */
  let 本次新增网页图标值 = ''

  /** 卡片保存成功后调用：确认保留本次新增图标 */
  function 确认保留本次图标() {
    本次新增网页图标值 = ''
  }

  /** 取消/未保存时回滚本次新增图标：从图标库删除记录、物理图片并刷新数据 */
  async function 回滚本次新增图标() {
    const 值 = 本次新增网页图标值
    if (!值) return
    本次新增网页图标值 = ''
    try {
      const 仓库 = 使用图标库仓库()
      let 分组名 = ''
      const 类别 = 仓库.原始数据?.urlDownload
      if (类别) {
        for (const 分组 of 类别.分组列表) {
          if (分组.图标.some((i) => i.值 === 值)) {
            分组名 = 分组.名称
            break
          }
        }
      }
      if (分组名) await window.electronAPI.图标库删除图标('urlDownload', 分组名, 值)
      if (值.startsWith('icons:')) {
        await window.electronAPI.图标库删除图片(值.replace('icons:', ''))
      }
      await 仓库.加载数据()
    } catch {
      // 静默
    }
  }

  /** 处理获取网页图标弹窗的确认事件（图标值统一为 icons:xxx，存入图标库 urlDownload 类别） */
  async function 处理获取网页图标选择(图标值: string, 是否新增 = false) {
    获取网页图标弹窗可见.value = false
    if (!图标值.startsWith('icons:')) return
    // 仅本次会话"新增"的图标需要跟踪，取消卡片保存时自动回滚；复用已绑定图标不跟踪
    // （若复用的恰是本次新增的图标，则延续跟踪，取消时一并回滚）
    本次新增网页图标值 = 是否新增 ? 图标值 : (本次新增网页图标值 === 图标值 ? 本次新增网页图标值 : '')
    获取中.value = true
    try {
      const base64 = await 图标库仓库.获取图片Base64(图标值)
      if (base64) {
        图片预览.value = base64
        图标代码.value = 图标值
        // 标记为全局图标引用（跳过私有图片缓存流程）
        缓存临时文件名 = ''
      }
    } catch (e) {
      console.error('读取网页图标失败', e)
    } finally {
      获取中.value = false
    }
  }

  /** 处理获取网页图标弹窗的取消事件 */
  function 处理获取网页图标取消() {
    获取网页图标弹窗可见.value = false
  }

  /** 触发隐藏的文件选择器 */
  function 触发文件选择() {
    文件输入框.value?.click()
  }

  /** 处理用户选择的图片文件 */
  async function 处理文件选择(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      图片预览.value = base64
      图标代码.value = ''
      图标类型.value = 'image'

      if (是Electron图片) {
        try {
          const 结果 = await window.electronAPI.启动上传图片到缓存(base64)
          if (结果.成功 && 结果.临时文件名) {
            缓存临时文件名 = 结果.临时文件名
          }
        } catch (err) {
          console.error('上传图片到缓存失败', err)
        }
      }
    }
    reader.readAsDataURL(file)
  }

  /**
   * 确认保存图片到卡片目录（添加模式用）
   */
  async function 确认图片缓存(归属菜单ID: number, 卡片ID: number): Promise<string | null> {
    if (!缓存临时文件名 || !是Electron图片) return null
    try {
      const 结果 = await window.electronAPI.启动确认保存图标(缓存临时文件名, 归属菜单ID, 卡片ID)
      if (结果.成功 && 结果.图片路径) {
        卡片仓库.设置卡片图片(卡片ID, 结果.图片路径)
        return 结果.图片路径
      }
    } catch (err) {
      console.error('确认保存图标失败', err)
    }
    return null
  }

  /** 取消图片缓存选择：缓存目录是纯临时区，无条件清空（防 icons 引用等路径残留扫描文件） */
  async function 取消图片缓存() {
    if (!是Electron图片) return
    try {
      await window.electronAPI.启动取消图标选择()
    } catch {
      // 忽略取消失败
    }
  }

  /** 重置表单所有字段 */
  function 重置表单() {
    标题.value = ''
    路径值.value = ''
    选中颜色.value = '#4a6fa5'
    路径提示.value = ''
    图标类型.value = 读取图标样式偏好(模式Ref.value)
    图标文字.value = ''
    图标代码.value = ''
    图片预览.value = null
    缓存临时文件名 = ''
    获取中.value = false
    已自动匹配 = false
    获取网页图标弹窗可见.value = false

    if (文件输入框.value) {
      文件输入框.value.value = ''
    }

    // 未保存时回滚本次新增的网页图标（保存成功路径会先调用 确认保留本次图标 清空跟踪）
    回滚本次新增图标()
  }

  // 挂载时：加载图标库数据（确保悬浮面板图标可用）
  onMounted(() => {
    使用图标库仓库().加载数据()
  })

  // 组件销毁时自动清理
  onBeforeUnmount(() => {
    取消图片缓存()
    重置表单()
  })

  return {
    // 状态
    标题,
    路径值,
    选中颜色,
    路径提示,
    图标类型,
    图标文字,
    图标代码,
    图片预览,
    文件输入框,
    获取中,

    // 计算属性
    路径标签,
    路径占位,
    获取类型图标,
    可确认,

    // 图标选择（公共组件回调用）
    处理面板图标选择,

    // 选择图标弹窗
    选择图标弹窗可见,
    处理图标选择,
    处理图标选择取消,

    // 获取网页图标弹窗（url 类型，整合自动抓取 + 网页图标 + 已下载图标）
    获取网页图标弹窗可见,
    处理获取网页图标选择,
    处理获取网页图标取消,

    // 方法
    处理粘贴,
    选择路径,
    获取图标,
    触发文件选择,
    处理文件选择,
    标记已自动匹配: () => { 已自动匹配 = true; 跳过下次图标类型检测 = true },
    确认图片缓存,
    取消图片缓存,
    确认保留本次图标,
    重置表单,
  }
}
