<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, computed, watch, watchEffect } from 'vue'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'
import { 使用侧边栏菜单仓库 } from '@/页面/启动/仓库/侧边栏菜单仓库'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import MainLayout from '@/页面/启动/组件/布局/主布局.vue'
import IconFormModal from '@/页面/启动/组件/图标库/图标表单弹窗.vue'
import ImageUploadModal from '@/页面/启动/组件/图标库/图片上传弹窗.vue'
import UrlDownloadModal from '@/页面/启动/组件/图标库/URL下载弹窗.vue'
import CropModal from '@/页面/启动/组件/图标库/图标裁切弹窗.vue'
import CompressModal from '@/页面/启动/组件/图标库/图标压缩弹窗.vue'
import Sortable from 'sortablejs'
import BatchPanel from '@/页面/启动/组件/图标库/批量操作信息板.vue'
import { 使用框选 } from '@/页面/启动/组件/图标库/使用框选'

const 仓库 = 使用图标库仓库()
const 侧边栏菜单 = 使用侧边栏菜单仓库()
const 主题仓库 = 使用主题仓库()
const 添加分组输入框 = ref<HTMLInputElement | null>(null)
const 搜索模式 = ref(false)
const 批量模式 = ref(false)
const 批量操作级别 = ref<'图标' | '分组'>('图标')
const 信息板收纳 = ref(false)
const 选中图标集合 = ref(new Set<string>())
const 选中分组集合 = ref(new Set<string>())
/** 选中记录按类别隔离：切类别时存当前选中，进入批量模式时恢复 */
const 选中记录按类别 = new Map<string, Set<string>>()
const 选中分组记录按类别 = new Map<string, Set<string>>()

/** 选中图标详情列表（供信息板显示）：解析 key → 图标值/显示名/类型/缩略图URL */
const 选中图标详情列表 = computed(() => {
  const 索引 = new Map<string, Map<string, { 值: string; 显示名: string }>>()
  for (const g of 仓库.当前分组列表) {
    const m = new Map<string, { 值: string; 显示名: string }>()
    for (const i of g.图标) m.set(i.值, i)
    索引.set(g.名称, m)
  }
  const 列表: { 图标值: string; 显示名: string; 分组名: string; 类型: 'fa' | '图片' | 'emoji'; 缩略图URL?: string }[] = []
  for (const key of 选中图标集合.value) {
    const idx = key.lastIndexOf('::')
    const 分组名 = key.slice(0, idx)
    const 图标值 = key.slice(idx + 2)
    const 图标 = 索引.get(分组名)?.get(图标值)
    if (!图标) continue
    let 类型: 'fa' | '图片' | 'emoji' = 'emoji'
    if (是FA图标(图标值)) 类型 = 'fa'
    else if (是图片图标(图标值)) 类型 = '图片'
    列表.push({
      图标值,
      显示名: 图标.显示名,
      分组名,
      类型,
      缩略图URL: 类型 === '图片' ? (仓库.图片缓存.get(图标值) || '') : undefined,
    })
  }
  return 列表
})

/** 选中图片图标的懒加载副作用（从 computed 中分离） */
watchEffect(() => {
  for (const key of 选中图标集合.value) {
    const idx = key.lastIndexOf('::')
    const 图标值 = key.slice(idx + 2)
    if (是图片图标(图标值)) 仓库.保证图片加载(图标值)
  }
})
const 搜索输入框 = ref<HTMLInputElement | null>(null)
const 本地搜索词 = ref('')
const 输入法刚结束 = ref(false)

function 打开搜索() {
  搜索模式.value = true
  nextTick(() => {
    搜索输入框.value?.focus()
  })
}

function 关闭搜索() {
  搜索模式.value = false
  本地搜索词.value = ''
  仓库.搜索词 = ''
}

function 搜索框ESC(e: KeyboardEvent) {
  if (e.key === 'Escape' && !e.isComposing && !输入法刚结束.value) {
    关闭搜索()
  }
}

function 处理输入法开始() {
  输入法刚结束.value = false
}

function 处理输入法结束() {
  输入法刚结束.value = true
  setTimeout(() => {
    输入法刚结束.value = false
  }, 200)
}

watch(本地搜索词, (词) => {
  仓库.搜索词 = 词
  if (词.trim()) {
    for (const 分组 of 仓库.当前分组列表) {
      仓库.展开分组.set(`${仓库.当前类别}/${分组.名称}`, true)
    }
  }
})

/** 图片图标缩略图：读取缓存，未命中时触发懒加载 */
function 缩略图URL(图标: { 值: string }): string {
  仓库.保证图片加载(图标.值)
  return 仓库.图片缓存.get(图标.值) || ''
}

/** 格式化体积：字节 → 可读文本 */
function 格式化体积(字节: number): string {
  if (字节 < 1024) return `${字节} B`
  if (字节 < 1024 * 1024) return `${(字节 / 1024).toFixed(1)} KB`
  return `${(字节 / 1024 / 1024).toFixed(1)} MB`
}

/** 图标尺寸角标文字：宽×高 */
function 大图标角标(图标值: string): string {
  const 信息 = 仓库.大图标信息.get(图标值)
  if (!信息) return ''
  return `${信息.宽}×${信息.高}`
}

/** 统计全口径引用（卡片 + 菜单 + 壁纸分组）；先为图标库所有 icons: 图标建 0 条目，确保未引用图标也显示徽标 */
async function 统计全部引用(): Promise<Record<string, { 卡片: number; 菜单: number; 壁纸: number }>> {
  const 统计: Record<string, { 卡片: number; 菜单: number; 壁纸: number }> = {}
  const 原始数据 = 仓库.原始数据
  if (原始数据) {
    for (const 类别数据 of Object.values(原始数据)) {
      for (const 分组 of (类别数据 as { 分组列表?: { 图标: { 值: string }[] }[] })?.分组列表 || []) {
        for (const 图标 of 分组.图标) {
          if (图标.值.startsWith('icons:')) 统计[图标.值] ||= { 卡片: 0, 菜单: 0, 壁纸: 0 }
        }
      }
    }
  }
  const 卡片仓库 = 使用卡片仓库()
  if (卡片仓库.卡片列表.length === 0) await 卡片仓库.加载卡片数据()
  for (const 卡片 of 卡片仓库.卡片列表) {
    if (卡片.图标代码?.startsWith('icons:')) {
      const 项 = (统计[卡片.图标代码] ||= { 卡片: 0, 菜单: 0, 壁纸: 0 })
      项.卡片++
    }
  }
  const 菜单仓库 = 使用菜单仓库()
  if (!菜单仓库.数据已加载 && 菜单仓库.菜单列表.length === 0) await 菜单仓库.加载数据()
  for (const 菜单 of 菜单仓库.菜单列表) {
    if (菜单.图标代码?.startsWith('icons:')) {
      const 项 = (统计[菜单.图标代码] ||= { 卡片: 0, 菜单: 0, 壁纸: 0 })
      项.菜单++
    }
    for (const 子菜单 of 菜单.子菜单) {
      if (子菜单.图标代码?.startsWith('icons:')) {
        const 项 = (统计[子菜单.图标代码] ||= { 卡片: 0, 菜单: 0, 壁纸: 0 })
        项.菜单++
      }
    }
  }
  const 主题仓库 = 使用主题仓库()
  if (主题仓库.壁纸分组列表.length === 0) await 主题仓库.加载壁纸分组列表()
  for (const 分组 of 主题仓库.壁纸分组列表) {
    if (分组.图标代码?.startsWith('icons:')) {
      const 项 = (统计[分组.图标代码] ||= { 卡片: 0, 菜单: 0, 壁纸: 0 })
      项.壁纸++
    }
  }
  return 统计
}

/** 触发引用扫描：统计后写入仓库并显示徽标 */
async function 触发扫描引用() {
  仓库.设置引用统计(await 统计全部引用())
  仓库.关闭右键菜单()
}

/** 触发大图标扫描 */
function 触发扫描大图标() {
  仓库.扫描大图标()
  仓库.关闭右键菜单()
}

/** 收集当前类别下所有 0 引用图片图标，打开清理确认弹窗（按类别隔离，不跨类别清理） */
async function 触发清理未引用() {
  const 统计 = await 统计全部引用()
  const 待删: { 图标值: string; 显示名: string; 分组名: string; 类别: string }[] = []
  const 原始数据 = 仓库.原始数据
  if (!原始数据) return
  const 当前类别 = 仓库.当前类别
  const 类别数据 = 原始数据[当前类别] as { 分组列表?: { 名称: string; 图标: { 值: string; 显示名?: string }[] }[] } | undefined
  for (const 分组 of 类别数据?.分组列表 || []) {
    for (const 图标 of 分组.图标) {
      if (!图标.值.startsWith('icons:')) continue
      if ((统计[图标.值]?.卡片 || 0) + (统计[图标.值]?.菜单 || 0) + (统计[图标.值]?.壁纸 || 0) === 0) {
        待删.push({ 图标值: 图标.值, 显示名: 图标.显示名 || 图标.值, 分组名: 分组.名称, 类别: 当前类别 })
      }
    }
  }
  if (待删.length === 0) {
    仓库.打开清理确认([])
  } else {
    仓库.打开清理确认(待删)
  }
  仓库.关闭右键菜单()
}

/** 固定色盘颜色 */
const 固定色盘 = ['#4a9fa5', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#e84393', '#34495e', '#7f8c8d', '#ffffff']

/** 预览色 ref：颜色选择器滑动时只更新此 ref，不经过仓库，避免卡顿 */
const 预览色 = ref('')

/** 设置 CSS 变量预览色，直接操作 DOM 跳过响应式 */
function 更新预览色(颜色: string) {
  预览色.value = 颜色
  // 更新图标网格背景色 CSS 变量（直接操作根元素 style，无重渲染）
  document.documentElement.style.setProperty('--调色板-预览色', 颜色)
}

/** 弹窗样式：居中 + 拖拽偏移（transform GPU加速） */
const 弹窗样式 = computed(() => ({
  transform: `translate(${弹窗偏移.value.x}px, ${弹窗偏移.value.y}px)`,
}))

/** ===== 调色板弹窗 ===== */
const 调色板弹窗可见 = ref(false)
const 弹窗偏移 = ref({ x: 0, y: 0 })
const 拖拽中 = ref(false)
let 拖拽起始 = { x: 0, y: 0, 偏移X: 0, 偏移Y: 0 }

function 关闭调色板弹窗() {
  调色板弹窗可见.value = false
  弹窗偏移.value = { x: 0, y: 0 }
}

function 打开调色板弹窗() {
  调色板弹窗可见.value = true
  弹窗偏移.value = { x: 0, y: 0 }
}

function 拖拽开始(event: MouseEvent) {
  拖拽中.value = true
  拖拽起始 = {
    x: event.clientX,
    y: event.clientY,
    偏移X: 弹窗偏移.value.x,
    偏移Y: 弹窗偏移.value.y,
  }
  document.addEventListener('mousemove', 拖拽移动)
  document.addEventListener('mouseup', 拖拽结束)
}

function 拖拽移动(event: MouseEvent) {
  if (!拖拽中.value) return
  弹窗偏移.value = {
    x: 拖拽起始.偏移X + (event.clientX - 拖拽起始.x),
    y: 拖拽起始.偏移Y + (event.clientY - 拖拽起始.y),
  }
}

function 拖拽结束() {
  拖拽中.value = false
  document.removeEventListener('mousemove', 拖拽移动)
  document.removeEventListener('mouseup', 拖拽结束)
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape' && !e.isComposing && !输入法刚结束.value) {
    if (仓库.分类选择弹窗可见) {
      仓库.关闭分类选择弹窗()
    } else if (调色板弹窗可见.value) {
      关闭调色板弹窗()
    } else if (搜索模式.value) {
      关闭搜索()
    } else if (批量模式.value) {
      退出批量模式()
    }
  }
}

function 处理CtrlF(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
    e.preventDefault()
    打开搜索()
  }
}

/** F2 快捷键：重命名当前激活的分组 */
function 处理F2按键(e: KeyboardEvent) {
  if (e.key !== 'F2') return
  const target = e.target as HTMLElement
  const 标签 = target?.tagName?.toLowerCase()
  if (标签 === 'input' || 标签 === 'textarea' || 标签 === 'select') return
  if (搜索模式.value) return
  if (!激活分组名.value) return
  e.preventDefault()
  仓库.开始重命名(激活分组名.value)
  聚焦重命名()
}

onMounted(async () => {
  侧边栏菜单.清除菜单()
  document.addEventListener('keydown', 处理Esc)
  document.addEventListener('keydown', 处理T键按下)
  document.addEventListener('keydown', 处理B键按下)
  document.addEventListener('keydown', 处理CtrlF)
  document.addEventListener('keydown', 处理F2按键)
  // 等数据加载完 + DOM 渲染出 .图标网格 再初始化拖拽，避免首次进入绑空
  await 仓库.加载数据()
  await nextTick()
  初始化图标拖拽()
  初始化分组拖拽()
})

onUnmounted(() => {
  document.removeEventListener('keydown', 处理Esc)
  document.removeEventListener('keydown', 处理T键按下)
  document.removeEventListener('keydown', 处理B键按下)
  document.removeEventListener('keydown', 处理CtrlF)
  document.removeEventListener('keydown', 处理F2按键)
  document.removeEventListener('mousemove', 拖拽移动)
  document.removeEventListener('mouseup', 拖拽结束)
  销毁图标拖拽()
  销毁分组拖拽()
  关闭搜索()
  批量模式.value = false
  document.body.classList.remove('批量模式')
  document.removeEventListener('mousemove', 批量拖拽移动)
  document.removeEventListener('mouseup', 批量拖拽释放)
  if (批量拖拽RAF !== null) cancelAnimationFrame(批量拖拽RAF)
  document.removeEventListener('mousemove', 滑动选择移动)
  document.removeEventListener('mouseup', 滑动选择结束)
  document.removeEventListener('mousemove', 分组滑动选择移动)
  document.removeEventListener('mouseup', 分组滑动选择结束)
  if (批量拖拽跟随.value) {
    批量拖拽跟随.value.remove()
    批量拖拽跟随.value = null
  }
  选中记录按类别.clear()
  选中分组记录按类别.clear()
  仓库.清理引用显示()
  if (复制提示定时器) clearTimeout(复制提示定时器)
  if (图标提示定时器) clearTimeout(图标提示定时器)
  if (导航提示定时器) clearTimeout(导航提示定时器)
  if (重建拖拽定时器) clearTimeout(重建拖拽定时器)
})

/** 分组/图标/展开状态变化后重建 SortableJS（新增/删除/折叠后需重新绑定） */
let 重建拖拽定时器: ReturnType<typeof setTimeout> | null = null
watch(
  () => JSON.stringify(仓库.当前分组列表.map((g) => g.名称 + ':' + g.图标.length)) + JSON.stringify([...仓库.展开分组]),
  () => {
    if (正在拖拽图标 || 正在拖拽分组) return
    nextTick(() => {
      if (重建拖拽定时器) clearTimeout(重建拖拽定时器)
      重建拖拽定时器 = setTimeout(() => {
        销毁图标拖拽()
        初始化图标拖拽()
        重建拖拽定时器 = null
      }, 50)
    })
  },
)

/** 切换类别时清理引用徽标，保持全局图标/网页图标功能隔离干净 */
watch(() => 仓库.当前类别, (_, 旧类别) => {
  退出批量模式(旧类别 ?? 仓库.当前类别)
  仓库.清理引用显示()
})


/** 监听颜色输入变化（滑条拖动时只更新预览色，不经过仓库） */
function 颜色输入处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) {
    更新预览色(值)
  }
}

/** 颜色选择器关闭时触发：提交最终颜色到仓库并持久化 */
function 颜色完成处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) {
    // 清除预览色，还原到仓库值
    document.documentElement.style.removeProperty('--调色板-预览色')
    预览色.value = ''
    仓库.设置当前类别背景颜色并记录(值)
  }
}

function 开始添加分组() {
  仓库.开始添加分组()
  nextTick(() => {
    添加分组输入框.value?.focus()
  })
}

function 是图片图标(值: string): boolean {
  return 值.startsWith('icons:')
}

function 是FA图标(值: string): boolean {
  return 值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')
}

const 复制提示可见 = ref(false)
let 复制提示定时器: ReturnType<typeof setTimeout> | null = null

const 图标提示 = ref({ 可见: false, x: 0, y: 0, 文字: '' })
let 图标提示定时器: ReturnType<typeof setTimeout> | null = null

function 显示图标提示(event: MouseEvent, 显示名: string) {
  if (图标提示定时器) clearTimeout(图标提示定时器)
  图标提示定时器 = setTimeout(() => {
    const 目标 = (event.target as HTMLElement).closest('.图标项') as HTMLElement | null
    if (!目标) return
    const rect = 目标.getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.top
    const 提示宽 = 显示名.length * 16 + 24
    const 提示高 = 44
    if (x - 提示宽 / 2 < 4) x = 提示宽 / 2 + 4
    if (x + 提示宽 / 2 > window.innerWidth - 4) x = window.innerWidth - 提示宽 / 2 - 4
    if (y - 提示高 < 4) y = rect.bottom + 8
    else y = y - 提示高 - 4
    图标提示.value = { 可见: true, x, y, 文字: 显示名 }
  }, 400)
}

function 隐藏图标提示() {
  if (图标提示定时器) {
    clearTimeout(图标提示定时器)
    图标提示定时器 = null
  }
  图标提示.value.可见 = false
}

function 复制图标代码(值: string) {
  if (是图片图标(值)) return
  navigator.clipboard
    .writeText(值)
    .then(() => {
      复制提示可见.value = true
      if (复制提示定时器) clearTimeout(复制提示定时器)
      复制提示定时器 = setTimeout(() => {
        复制提示可见.value = false
      }, 1500)
    })
    .catch(() => {})
}

/** 是否为 userUpload 类别 */
function 是用户上传(): boolean {
  return 仓库.当前类别 === 'userUpload'
}

/** 是否为 urlDownload 类别 */
function 是URL下载(): boolean {
  return 仓库.当前类别 === 'urlDownload'
}

/** 是否为图片类别（userUpload 或 urlDownload），FA/Emoji 返回 false */
function 是图片类别(): boolean {
  return 是用户上传() || 是URL下载()
}

/** 空白处右键：所有类别都弹菜单（图片类别有扫描项，FA/Emoji 仅批量管理） */
function 空白处右键(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  仓库.打开右键菜单(event, '空白')
}

/** 进入批量模式：禁用拖拽，body 加标记，恢复当前类别选中记录 */
function 进入批量模式(初始级别: '图标' | '分组' = '图标') {
  批量模式.value = true
  批量操作级别.value = 初始级别
  document.body.classList.add('批量模式')
  销毁图标拖拽()
  销毁分组拖拽()
  仓库.关闭右键菜单()
  const 记录 = 选中记录按类别.get(仓库.当前类别)
  if (记录) 选中图标集合.value = new Set(记录)
  const 分组记录 = 选中分组记录按类别.get(仓库.当前类别)
  if (分组记录) 选中分组集合.value = new Set(分组记录)
}

/** 退出批量模式：存选中到 Map，恢复拖拽，清标记和选中 */
function 退出批量模式(保存类别 = 仓库.当前类别) {
  if (批量模式.value) {
    选中记录按类别.set(保存类别, new Set(选中图标集合.value))
    选中分组记录按类别.set(保存类别, new Set(选中分组集合.value))
  }
  批量模式.value = false
  批量操作级别.value = '图标'
  信息板收纳.value = false
  选中图标集合.value = new Set()
  选中分组集合.value = new Set()
  document.body.classList.remove('批量模式')
  仓库.关闭右键菜单()
  nextTick(() => {
    初始化图标拖拽()
    初始化分组拖拽()
  })
}

/** 切换信息板收纳/展开 */
function 切换信息板收纳() {
  信息板收纳.value = !信息板收纳.value
}

/** 切换图标选中态（单击 toggle） */
function 切换选中(分组名: string, 图标值: string) {
  const key = `${分组名}::${图标值}`
  const 新集合 = new Set(选中图标集合.value)
  if (新集合.has(key)) 新集合.delete(key)
  else 新集合.add(key)
  选中图标集合.value = 新集合
}

/** 清空选中 */
function 清空选中() {
  选中图标集合.value = new Set()
}

/** 全选激活分组 */
function 全选激活分组() {
  if (!激活分组名.value) return
  const 分组 = 仓库.当前分组列表.find(g => g.名称 === 激活分组名.value)
  if (!分组) return
  选中图标集合.value = new Set(分组.图标.map(图标 => `${分组.名称}::${图标.值}`))
}

// ===== 框选（使用组合式函数，定义见分组列表容器之后） =====

/** 分组标题上的 + 按钮：根据类别打开不同弹窗 */
function 点击添加图标(分组名: string) {
  if (是用户上传()) {
    仓库.打开图片添加弹窗(分组名)
  } else if (是URL下载()) {
    仓库.打开URL添加弹窗(分组名)
  } else {
    仓库.打开添加弹窗(分组名)
  }
  仓库.展开分组.set(`${仓库.当前类别}/${分组名}`, true)
}

/** 聚焦重命名输入框 */
function 聚焦重命名() {
  nextTick(() => {
    const 输入框 = document.querySelector('.重命名输入框') as HTMLInputElement | null
    输入框?.focus()
    输入框?.select()
  })
}

/** 右键菜单：编辑图标 */
function 右键编辑图标() {
  const 分组名 = 仓库.右键菜单.分组名
  const 图标值 = 仓库.右键菜单.图标值
  const 分组 = 仓库.当前分组列表.find((g) => g.名称 === 分组名)
  if (!分组) return
  const 图标 = 分组.图标.find((i) => i.值 === 图标值)
  if (!图标) return

  if (是URL下载()) {
    仓库.打开URL编辑弹窗(分组名, 图标值, 图标.显示名, 图标.绑定域名)
  } else if (是用户上传() || 图标值.startsWith('icons:')) {
    仓库.打开图片编辑弹窗(分组名, 图标值, 图标.显示名)
  } else {
    仓库.打开编辑弹窗(分组名, 图标值, 图标.显示名)
  }
  仓库.关闭右键菜单()
}

/** 右键菜单：查看图标引用 */
function 查看引用() {
  仓库.打开引用弹窗(仓库.右键菜单.分组名, 仓库.右键菜单.图标值)
}

/** 删除确认状态 */
const 删除确认 = ref<{ 可见: boolean; 分组名: string; 图标值: string; 显示名: string; 引用数: number; 替代图标: { 值: string; 显示名: string } | null }>({
  可见: false,
  分组名: '',
  图标值: '',
  显示名: '',
  引用数: 0,
  替代图标: null,
})

/** 请求删除图标：总是弹确认，显示图标预览 + 引用数 */
async function 请求删除图标(分组名: string, 图标值: string) {
  仓库.关闭右键菜单()
  const 图标项 = 仓库.当前分组列表.find((g) => g.名称 === 分组名)?.图标.find((i) => i.值 === 图标值)
  const 显示名 = 图标项?.显示名 ?? 图标值
  const 引用数 = await 仓库.查询引用数(图标值)
  const 替代图标 = 引用数 > 0 ? await 仓库.查找同域名替代图标(图标值) : null
  删除确认.value = { 可见: true, 分组名, 图标值, 显示名, 引用数, 替代图标 }
}

function 执行确认删除() {
  const { 分组名, 图标值, 替代图标 } = 删除确认.value
  删除确认.value = { 可见: false, 分组名: '', 图标值: '', 显示名: '', 引用数: 0, 替代图标: null }
  仓库.删除图标(分组名, 图标值, 替代图标?.值 ?? null)
}

/** 批量删除总确认弹窗 */
const 批量删除确认 = ref<{ 可见: boolean; 数量: number }>({ 可见: false, 数量: 0 })

/** 批量删除逐个引用确认：有引用的图片图标逐个弹窗确认 */
const 批量逐个确认 = ref<{
  可见: boolean
  当前: { 分组名: string; 图标值: string; 显示名: string; 引用数: number; 替代图标: { 值: string; 显示名: string } | null } | null
  队列: { 分组名: string; 图标值: string; 显示名: string; 引用数: number; 替代图标: { 值: string; 显示名: string } | null }[]
  当前进度: number
  总数: number
}>({ 可见: false, 当前: null, 队列: [], 当前进度: 0, 总数: 0 })

/** 请求批量删除：弹总确认 */
function 请求批量删除() {
  if (选中图标集合.value.size === 0) return
  批量删除确认.value = { 可见: true, 数量: 选中图标集合.value.size }
}

/** 执行批量删除：总确认后分类处理，有引用的图片图标入队逐个确认 */
async function 执行批量删除() {
  批量删除确认.value = { 可见: false, 数量: 0 }
  const 选中快照 = [...选中图标集合.value]
  const 待确认队列: { 分组名: string; 图标值: string; 显示名: string; 引用数: number; 替代图标: { 值: string; 显示名: string } | null }[] = []
  for (const key of 选中快照) {
    const idx = key.lastIndexOf('::')
    const 分组名 = key.slice(0, idx)
    const 图标值 = key.slice(idx + 2)
    const 分组 = 仓库.当前分组列表.find(g => g.名称 === 分组名)
    const 图标 = 分组?.图标.find(i => i.值 === 图标值)
    const 显示名 = 图标?.显示名 ?? 图标值
    if (是图片图标(图标值)) {
      const 引用数 = await 仓库.查询引用数(图标值)
      if (引用数 > 0) {
        const 替代图标 = 仓库.查找同域名替代图标(图标值)
        待确认队列.push({ 分组名, 图标值, 显示名, 引用数, 替代图标 })
        continue
      }
    }
    await 仓库.删除图标(分组名, 图标值)
  }
  if (待确认队列.length > 0) {
    批量逐个确认.value = { 可见: true, 当前: 待确认队列[0]!, 队列: 待确认队列.slice(1), 当前进度: 1, 总数: 待确认队列.length }
  } else {
    选中图标集合.value = new Set()
  }
}

/** 批量逐个确认：仍要删除当前 */
const 批量逐个执行中 = ref(false)
async function 执行批量逐个删除() {
  if (批量逐个执行中.value) return
  批量逐个执行中.value = true
  try {
    const 当前 = 批量逐个确认.value.当前
    if (当前) {
      await 仓库.删除图标(当前.分组名, 当前.图标值, 当前.替代图标?.值 ?? null)
    }
    推进批量逐个确认()
  } finally {
    批量逐个执行中.value = false
  }
}

/** 批量逐个确认：跳过当前 */
function 跳过批量逐个删除() {
  推进批量逐个确认()
}

/** 推进到下一个逐个确认，队列空则结束并清空选中 */
function 推进批量逐个确认() {
  const { 队列, 当前进度, 总数 } = 批量逐个确认.value
  if (队列.length > 0) {
    批量逐个确认.value = { 可见: true, 当前: 队列[0]!, 队列: 队列.slice(1), 当前进度: 当前进度 + 1, 总数 }
  } else {
    批量逐个确认.value = { 可见: false, 当前: null, 队列: [], 当前进度: 0, 总数: 0 }
    选中图标集合.value = new Set()
  }
}

/** 批量移动确认弹窗 */
const 批量移动确认 = ref<{ 可见: boolean; 数量: number; 目标分组名: string }>({ 可见: false, 数量: 0, 目标分组名: '' })

/** 请求批量移动：弹二次确认 */
function 请求批量移动(目标分组名: string) {
  if (选中图标集合.value.size === 0) return
  批量移动确认.value = { 可见: true, 数量: 选中图标集合.value.size, 目标分组名 }
}

/** 批量移动选中图标到目标分组末尾 */
async function 批量移动到分组(目标分组名: string) {
  const 选中快照 = [...选中图标集合.value]
  for (const key of 选中快照) {
    const idx = key.lastIndexOf('::')
    const 源分组名 = key.slice(0, idx)
    const 图标值 = key.slice(idx + 2)
    await 仓库.移动图标(源分组名, 图标值, 目标分组名, Number.MAX_SAFE_INTEGER)
  }
  选中图标集合.value = new Set()
}

/** 执行批量移动：循环调移动图标，追加到目标分组末尾 */
async function 执行批量移动() {
  const { 目标分组名 } = 批量移动确认.value
  批量移动确认.value = { 可见: false, 数量: 0, 目标分组名: '' }
  await 批量移动到分组(目标分组名)
}

/** 删除分组确认弹窗 */
const 删除分组确认 = ref<{ 可见: boolean; 分组名: string; 图标数: number }>({ 可见: false, 分组名: '', 图标数: 0 })

/** 请求删除分组：关闭右键菜单，弹二次确认 */
function 请求删除分组(分组名: string) {
  仓库.关闭右键菜单()
  const 分组 = 仓库.当前分组列表.find(g => g.名称 === 分组名)
  删除分组确认.value = { 可见: true, 分组名, 图标数: 分组?.图标.length ?? 0 }
}

/** 执行删除分组：确认后调仓库删除 */
async function 执行删除分组() {
  const { 分组名 } = 删除分组确认.value
  删除分组确认.value = { 可见: false, 分组名: '', 图标数: 0 }
  await 仓库.删除分组(分组名)
}

/** 批量删除分组确认弹窗 */
const 批量删除分组确认 = ref<{ 可见: boolean; 分组数: number; 图标数: number }>({ 可见: false, 分组数: 0, 图标数: 0 })

/** 请求批量删除分组：弹确认 */
function 请求批量删除分组() {
  if (选中分组集合.value.size === 0) return
  let 总图标数 = 0
  for (const 分组名 of 选中分组集合.value) {
    const 分组 = 仓库.当前分组列表.find(g => g.名称 === 分组名)
    总图标数 += 分组?.图标.length ?? 0
  }
  批量删除分组确认.value = { 可见: true, 分组数: 选中分组集合.value.size, 图标数: 总图标数 }
}

/** 执行批量删除分组 */
async function 执行批量删除分组() {
  const 选中快照 = [...选中分组集合.value]
  批量删除分组确认.value = { 可见: false, 分组数: 0, 图标数: 0 }
  for (const 分组名 of 选中快照) {
    await 仓库.删除分组(分组名)
  }
  选中分组集合.value = new Set()
}

/** 切换批量操作级别：各自选中独立保留，不清空 */
function 切换批量操作级别(级别: '图标' | '分组') {
  if (批量操作级别.value === 级别) return
  批量操作级别.value = 级别
}

/** 全选分组 */
function 全选分组() {
  选中分组集合.value = new Set(仓库.当前分组列表.map(g => g.名称))
}

/** 清空选中分组 */
function 清空选中分组() {
  选中分组集合.value = new Set()
}

/** 批量拖拽：按住信息板按钮拖到目标分组释放，执行批量移动 */
const 批量拖拽跟随 = ref<HTMLElement | null>(null)
let 批量拖拽目标分组 = ''

function 开始批量拖拽(event: MouseEvent) {
  if (选中图标集合.value.size === 0) return
  const 跟随 = document.createElement('div')
  跟随.className = '批量拖拽跟随'
  跟随.innerHTML = `<i class="fas fa-layer-group"></i><span>${选中图标集合.value.size}</span>`
  跟随.style.left = (event.clientX + 12) + 'px'
  跟随.style.top = (event.clientY + 12) + 'px'
  document.body.appendChild(跟随)
  批量拖拽跟随.value = 跟随
  document.addEventListener('mousemove', 批量拖拽移动)
  document.addEventListener('mouseup', 批量拖拽释放)
}

let 批量拖拽RAF: number | null = null
let 批量拖拽最新事件: MouseEvent | null = null

function 批量拖拽移动(event: MouseEvent) {
  批量拖拽最新事件 = event
  if (批量拖拽RAF !== null) return
  批量拖拽RAF = requestAnimationFrame(() => {
    批量拖拽RAF = null
    const event = 批量拖拽最新事件
    if (!event) return
    const 跟随 = 批量拖拽跟随.value
    if (!跟随) return
    跟随.style.left = (event.clientX + 12) + 'px'
    跟随.style.top = (event.clientY + 12) + 'px'
    const 目标 = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.分组区块') as HTMLElement | null
    const 目标分组名 = 目标?.getAttribute('数据-分组名') ?? ''
    document.querySelectorAll('.分组区块.批量拖拽目标').forEach(el => el.classList.remove('批量拖拽目标'))
    if (目标 && 目标分组名) {
      目标.classList.add('批量拖拽目标')
      批量拖拽目标分组 = 目标分组名
    } else {
      批量拖拽目标分组 = ''
    }
  })
}

async function 批量拖拽释放() {
  document.removeEventListener('mousemove', 批量拖拽移动)
  document.removeEventListener('mouseup', 批量拖拽释放)
  if (批量拖拽RAF !== null) {
    cancelAnimationFrame(批量拖拽RAF)
    批量拖拽RAF = null
  }
  if (批量拖拽跟随.value) {
    批量拖拽跟随.value.remove()
    批量拖拽跟随.value = null
  }
  document.querySelectorAll('.分组区块.批量拖拽目标').forEach(el => el.classList.remove('批量拖拽目标'))
  const 目标分组名 = 批量拖拽目标分组
  批量拖拽目标分组 = ''
  if (目标分组名 && 选中图标集合.value.size > 0) {
    await 批量移动到分组(目标分组名)
  }
}

/** 文本表单弹窗确认回调 */
function 表单确认(图标值: string, 显示名: string) {
  仓库.确认弹窗(图标值, 显示名)
}

/** 文本表单弹窗关闭回调 */
function 表单关闭() {
  仓库.关闭弹窗()
}

/** ===== 导航条 ===== */
const 分组列表容器 = ref<HTMLElement | null>(null)
const 导航条容器 = ref<HTMLElement | null>(null)

/** 框选：主视图分组列表区域，toggle 框内图标选中态 */
const { 框选中, 框选矩形, 开始框选 } = 使用框选({
  容器: 分组列表容器,
  项选择器: '.图标项',
  提取key: (项) => {
    const 分组区块 = 项.closest('.分组区块') as HTMLElement | null
    const 分组名 = 分组区块?.getAttribute('数据-分组名') ?? ''
    const 图标值 = 项.getAttribute('数据-图标值') ?? ''
    return 分组名 && 图标值 ? `${分组名}::${图标值}` : null
  },
  onToggle: (keys) => {
    if (keys.length > 0) {
      const 首个分组名 = keys[0]?.split('::')[0]
      if (首个分组名) 激活分组名.value = 首个分组名
    }
    const 新选中 = new Set(选中图标集合.value)
    for (const key of keys) {
      if (新选中.has(key)) 新选中.delete(key)
      else 新选中.add(key)
    }
    选中图标集合.value = 新选中
  },
  启用条件: () => 批量模式.value && 批量操作级别.value === '图标',
  排除选择器: ['.分组标题'],
})

const 激活分组名 = ref('')
const 显示分组名称 = ref(false)

function 全部折叠() {
  for (const 分组 of 仓库.当前分组列表) {
    仓库.展开分组.set(`${仓库.当前类别}/${分组.名称}`, false)
  }
}

function 全部展开() {
  for (const 分组 of 仓库.当前分组列表) {
    仓库.展开分组.set(`${仓库.当前类别}/${分组.名称}`, true)
  }
}

const 导航提示 = ref({ 可见: false, x: 0, y: 0, 文字: '' })
let 导航提示定时器: ReturnType<typeof setTimeout> | null = null

function 显示导航提示(event: MouseEvent, 名称: string) {
  if (导航提示定时器) clearTimeout(导航提示定时器)
  导航提示定时器 = setTimeout(() => {
    const 目标 = (event.target as HTMLElement).closest('.导航条项') as HTMLElement | null
    if (!目标) return
    const rect = 目标.getBoundingClientRect()
    const 提示宽 = 名称.length * 16 + 24
    let x = rect.left + rect.width / 2
    if (x + 提示宽 / 2 > window.innerWidth - 4) x = window.innerWidth - 提示宽 / 2 - 4
    const y = rect.top - 8
    导航提示.value = { 可见: true, x, y, 文字: 名称 }
  }, 400)
}

function 隐藏导航提示() {
  if (导航提示定时器) {
    clearTimeout(导航提示定时器)
    导航提示定时器 = null
  }
  导航提示.value.可见 = false
}

/** 点击导航条项，滚动到对应分组区块 */
function 点击分组标题(分组名: string) {
  if (Date.now() - 分组拖拽结束时间 < 300) return
  if (批量模式.value && 批量操作级别.value === '分组') {
    if (分组滑动刚结束) {
      分组滑动刚结束 = false
      return
    }
    const 新集合 = new Set(选中分组集合.value)
    if (新集合.has(分组名)) 新集合.delete(分组名)
    else 新集合.add(分组名)
    选中分组集合.value = 新集合
    激活分组名.value = 分组名
    return
  }
  激活分组名.value = 分组名
  仓库.切换展开(分组名)
}

function 点击展开图标(分组名: string) {
  if (Date.now() - 分组拖拽结束时间 < 300) return
  if (批量模式.value && 批量操作级别.value === '分组') {
    仓库.切换展开(分组名)
    return
  }
  激活分组名.value = 分组名
  仓库.切换展开(分组名)
}

function 点击图标项(分组名: string, 图标值: string) {
  // 拖拽刚结束浏览器会补发滞后 click，300ms 内忽略，避免拖拽完误激活
  if (Date.now() - 图标拖拽结束时间 < 300) return
  // 滑动选择刚结束，阻止 click 双重 toggle
  if (滑动刚结束) {
    滑动刚结束 = false
    return
  }
  if (批量模式.value && 批量操作级别.value === '图标') {
    激活分组名.value = 分组名
    切换选中(分组名, 图标值)
    return
  }
  激活分组名.value = 分组名
}

/** 滑动选择：在图标项上按住滑动，统一方向选中/取消经过的项 */
let 滑动选择中 = false
let 滑动方向 = false
let 滑动已处理项 = new Set<string>()
let 滑动起始位置 = { x: 0, y: 0 }
let 滑动起始项 = { 分组名: '', 图标值: '' }
let 滑动刚结束 = false

/** 分组列表 mousedown：图标项→图标滑动选择，分组标题→分组滑动选择，空白→框选 */
function 分组列表mousedown(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.图标项')) {
    开始滑动选择(event)
  } else if (target.closest('.分组标题') && 批量模式.value && 批量操作级别.value === '分组') {
    开始分组滑动选择(event)
  } else {
    开始框选(event)
  }
}

function 开始滑动选择(event: MouseEvent) {
  if (!批量模式.value || 批量操作级别.value !== '图标') return
  const target = event.target as HTMLElement
  const 项 = target.closest('.图标项') as HTMLElement | null
  if (!项) return
  const 分组区块 = 项.closest('.分组区块')
  const 分组名 = 分组区块?.getAttribute('数据-分组名') ?? ''
  const 图标值 = 项.getAttribute('数据-图标值') ?? ''
  if (!分组名 || !图标值) return
  滑动起始位置 = { x: event.clientX, y: event.clientY }
  滑动已处理项 = new Set()
  滑动起始项 = { 分组名, 图标值 }
  滑动方向 = !选中图标集合.value.has(`${分组名}::${图标值}`)
  滑动选择中 = false
  document.addEventListener('mousemove', 滑动选择移动)
  document.addEventListener('mouseup', 滑动选择结束)
}

function 滑动选择移动(event: MouseEvent) {
  if (!滑动选择中) {
    const 距离 = Math.hypot(event.clientX - 滑动起始位置.x, event.clientY - 滑动起始位置.y)
    if (距离 < 5) return
    滑动选择中 = true
    设置滑动项(滑动起始项.分组名, 滑动起始项.图标值)
  }
  const 目标 = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.图标项') as HTMLElement | null
  if (!目标) return
  const 分组区块 = 目标.closest('.分组区块')
  const 分组名 = 分组区块?.getAttribute('数据-分组名') ?? ''
  const 图标值 = 目标.getAttribute('数据-图标值') ?? ''
  if (!分组名 || !图标值) return
  设置滑动项(分组名, 图标值)
}

function 设置滑动项(分组名: string, 图标值: string) {
  const key = `${分组名}::${图标值}`
  if (滑动已处理项.has(key)) return
  滑动已处理项.add(key)
  激活分组名.value = 分组名
  const 当前已选 = 选中图标集合.value.has(key)
  if (滑动方向 && !当前已选) {
    切换选中(分组名, 图标值)
  } else if (!滑动方向 && 当前已选) {
    切换选中(分组名, 图标值)
  }
}

function 滑动选择结束() {
  document.removeEventListener('mousemove', 滑动选择移动)
  document.removeEventListener('mouseup', 滑动选择结束)
  if (滑动选择中) {
    滑动刚结束 = true
  }
  滑动选择中 = false
  滑动已处理项.clear()
}

/** 分组滑动选择：在分组标题上按住滑动，统一方向选中/取消经过的分组 */
let 分组滑动选择中 = false
let 分组滑动方向 = false
let 分组滑动已处理项 = new Set<string>()
let 分组滑动起始位置 = { x: 0, y: 0 }
let 分组滑动起始分组名 = ''
let 分组滑动刚结束 = false

function 开始分组滑动选择(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (target.closest('.展开图标') || target.closest('.添加图标按钮')) return
  const 分组区块 = (target.closest('.分组标题') as HTMLElement | null)?.closest('.分组区块')
  const 分组名 = 分组区块?.getAttribute('数据-分组名') ?? ''
  if (!分组名) return
  分组滑动起始位置 = { x: event.clientX, y: event.clientY }
  分组滑动已处理项 = new Set()
  分组滑动起始分组名 = 分组名
  分组滑动方向 = !选中分组集合.value.has(分组名)
  分组滑动选择中 = false
  document.addEventListener('mousemove', 分组滑动选择移动)
  document.addEventListener('mouseup', 分组滑动选择结束)
}

function 分组滑动选择移动(event: MouseEvent) {
  if (!分组滑动选择中) {
    const 距离 = Math.hypot(event.clientX - 分组滑动起始位置.x, event.clientY - 分组滑动起始位置.y)
    if (距离 < 5) return
    分组滑动选择中 = true
    设置分组滑动项(分组滑动起始分组名)
  }
  const 目标 = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest('.分组标题') as HTMLElement | null
  if (!目标) return
  const 分组区块 = 目标.closest('.分组区块')
  const 分组名 = 分组区块?.getAttribute('数据-分组名') ?? ''
  if (!分组名) return
  设置分组滑动项(分组名)
}

function 设置分组滑动项(分组名: string) {
  if (分组滑动已处理项.has(分组名)) return
  分组滑动已处理项.add(分组名)
  激活分组名.value = 分组名
  const 当前已选 = 选中分组集合.value.has(分组名)
  if ((分组滑动方向 && !当前已选) || (!分组滑动方向 && 当前已选)) {
    const 新集合 = new Set(选中分组集合.value)
    if (新集合.has(分组名)) 新集合.delete(分组名)
    else 新集合.add(分组名)
    选中分组集合.value = 新集合
  }
}

function 分组滑动选择结束() {
  document.removeEventListener('mousemove', 分组滑动选择移动)
  document.removeEventListener('mouseup', 分组滑动选择结束)
  if (分组滑动选择中) {
    分组滑动刚结束 = true
  }
  分组滑动选择中 = false
  分组滑动已处理项.clear()
}

// ===== 图标拖拽排序 / 跨分组移动 =====
const 图标拖拽实例列表: Sortable[] = []
let 图标拖拽结束时间 = 0
let 正在拖拽图标 = false
let 折叠悬停定时器: ReturnType<typeof setTimeout> | null = null
let 上次悬停分组名: string | null = null

/** 拖拽中悬停折叠分组 800ms 自动展开 */
function 处理图标拖拽中鼠标移动(event: MouseEvent) {
  if (!正在拖拽图标) return
  const 目标元素 = document.elementFromPoint(event.clientX, event.clientY)
  if (!目标元素) {
    清除折叠悬停()
    清除悬停高亮()
    return
  }
  const 分组区块 = (目标元素 as HTMLElement).closest('.分组区块') as HTMLElement | null
  if (!分组区块) {
    清除折叠悬停()
    清除悬停高亮()
    return
  }
  const 悬停分组名 = 分组区块.getAttribute('数据-分组名')
  if (!悬停分组名) {
    清除折叠悬停()
    清除悬停高亮()
    return
  }
  设置悬停高亮(分组区块.querySelector('.图标网格') as HTMLElement | null)
  if (悬停分组名 === 上次悬停分组名) return
  清除折叠悬停()
  上次悬停分组名 = 悬停分组名
  const 展开键 = `${仓库.当前类别}/${悬停分组名}`
  if (仓库.展开分组.get(展开键) === false) {
    折叠悬停定时器 = setTimeout(() => {
      仓库.展开分组.set(展开键, true)
      折叠悬停定时器 = null
      nextTick(() => {
        setTimeout(() => {
          const 新网格 = document.querySelector(`.分组区块[数据-分组名="${悬停分组名}"] .图标网格`) as HTMLElement | null
          if (新网格) 绑定单个网格拖拽(新网格)
        }, 50)
      })
    }, 800)
  }
}

function 清除折叠悬停() {
  if (折叠悬停定时器) {
    clearTimeout(折叠悬停定时器)
    折叠悬停定时器 = null
  }
  上次悬停分组名 = null
}

/** 拖拽悬停目标分组高亮（含空分组），给用户拖入视觉反馈 */
let 当前悬停网格: HTMLElement | null = null

function 设置悬停高亮(网格: HTMLElement | null) {
  if (当前悬停网格 === 网格) return
  当前悬停网格?.classList.remove('拖拽悬停目标')
  网格?.classList.add('拖拽悬停目标')
  当前悬停网格 = 网格
}

function 清除悬停高亮() {
  当前悬停网格?.classList.remove('拖拽悬停目标')
  当前悬停网格 = null
}

/** forceFallback 跟随项 append 到 body，v-bind/动态变量丢失，手动从原项复制子元素计算样式 */
function 同步跟随项样式(原项: HTMLElement) {
  const 跟随项 = document.querySelector('.拖拽跟随') as HTMLElement | null
  if (!跟随项) return
  const 原缩略图 = 原项.querySelector('.图标缩略图') as HTMLElement | null
  const 跟随缩略图 = 跟随项.querySelector('.图标缩略图') as HTMLElement | null
  if (原缩略图 && 跟随缩略图) {
    const cs = getComputedStyle(原缩略图)
    跟随缩略图.style.background = cs.background
    跟随缩略图.style.width = cs.width
    跟随缩略图.style.height = cs.height
  }
  const 原fa = 原项.querySelector('.fa缩略图') as HTMLElement | null
  const 跟随fa = 跟随项.querySelector('.fa缩略图') as HTMLElement | null
  if (原fa && 跟随fa) {
    const cs = getComputedStyle(原fa)
    跟随fa.style.fontSize = cs.fontSize
    跟随fa.style.color = cs.color
  }
  const 原emoji = 原项.querySelector('.emoji缩略图') as HTMLElement | null
  const 跟随emoji = 跟随项.querySelector('.emoji缩略图') as HTMLElement | null
  if (原emoji && 跟随emoji) {
    跟随emoji.style.fontSize = getComputedStyle(原emoji).fontSize
  }
}

/** 初始化所有可见分组网格的拖拽 */
/** 给单个网格绑定 SortableJS 实例（已绑定则跳过，避免重复） */
function 绑定单个网格拖拽(网格: HTMLElement) {
  if (图标拖拽实例列表.some((实例) => (实例 as unknown as { el: HTMLElement }).el === 网格)) return
  const 实例 = new Sortable(网格, {
    group: '图标',
    animation: 150,
    ghostClass: '拖拽占位',
    forceFallback: true,
    fallbackTolerance: 3,
    fallbackOnBody: true,
    fallbackClass: '拖拽跟随',
    scrollSensitivity: 60,
    scrollSpeed: 10,
    onStart(evt) {
      正在拖拽图标 = true
      document.body.classList.add('正在拖拽图标')
      document.addEventListener('mousemove', 处理图标拖拽中鼠标移动)
      同步跟随项样式(evt.item as HTMLElement)
    },
    onEnd(evt) {
      try {
        const 旧索引 = evt.oldIndex
        const 新索引 = evt.newIndex
        if (旧索引 === undefined || 新索引 === undefined) return
        const 源分组名 = (evt.from as HTMLElement).closest('.分组区块')?.getAttribute('数据-分组名')
        const 目标分组名 = (evt.to as HTMLElement).closest('.分组区块')?.getAttribute('数据-分组名')
        const 图标值 = (evt.item as HTMLElement).getAttribute('数据-图标值')
        if (!源分组名 || !目标分组名 || !图标值) return
        if (源分组名 === 目标分组名 && 旧索引 === 新索引) return
        仓库.移动图标(源分组名, 图标值, 目标分组名, 新索引)
      } finally {
        正在拖拽图标 = false
        document.body.classList.remove('正在拖拽图标')
        document.removeEventListener('mousemove', 处理图标拖拽中鼠标移动)
        清除折叠悬停()
        清除悬停高亮()
        图标拖拽结束时间 = Date.now()
        拖拽后重建()
      }
    },
  })
  图标拖拽实例列表.push(实例)
}

function 初始化图标拖拽() {
  if (批量模式.value) return
  const 网格列表 = document.querySelectorAll<HTMLElement>('.图标网格')
  网格列表.forEach(绑定单个网格拖拽)
}

function 销毁图标拖拽() {
  图标拖拽实例列表.forEach((实例) => 实例.destroy())
  图标拖拽实例列表.length = 0
  document.querySelectorAll<HTMLElement>('.图标项').forEach((el) => el.removeAttribute('draggable'))
  清除折叠悬停()
  清除悬停高亮()
  document.removeEventListener('mousemove', 处理图标拖拽中鼠标移动)
}

/** 拖拽结束后重建 SortableJS（拖拽中可能展开了折叠分组，需绑定新网格） */
function 拖拽后重建() {
  nextTick(() => {
    setTimeout(() => {
      销毁图标拖拽()
      初始化图标拖拽()
    }, 50)
  })
}

// ===== 分组拖拽排序 =====
let 分组拖拽实例: Sortable | null = null
let 正在拖拽分组 = false
let 分组拖拽结束时间 = 0
let 拖拽前展开状态 = new Map<string, boolean>()

function 初始化分组拖拽() {
  if (批量模式.value) return
  const 容器 = 分组列表容器.value
  if (!容器 || 分组拖拽实例) return
  分组拖拽实例 = new Sortable(容器, {
    handle: '.分组标题',
    animation: 150,
    ghostClass: '分组拖拽占位',
    forceFallback: true,
    fallbackTolerance: 3,
    fallbackOnBody: true,
    fallbackClass: '分组拖拽跟随',
    onStart(evt) {
      正在拖拽分组 = true
      const 拖拽元素 = evt.item as HTMLElement
      const 旧rect = 拖拽元素.getBoundingClientRect()
      拖拽前展开状态 = new Map(仓库.展开分组)
      document.querySelectorAll<HTMLElement>('.图标网格').forEach((el) => (el.style.display = 'none'))
      仓库.当前分组列表.forEach((g) => {
        仓库.展开分组.set(`${仓库.当前类别}/${g.名称}`, false)
      })
      const 新rect = 拖拽元素.getBoundingClientRect()
      if (分组列表容器.value) {
        分组列表容器.value.scrollTop += 新rect.top - 旧rect.top
      }
    },
    onEnd(evt) {
      正在拖拽分组 = false
      分组拖拽结束时间 = Date.now()
      拖拽前展开状态.forEach((v, k) => {
        仓库.展开分组.set(k, v)
      })
      const 分组名 = (evt.item as HTMLElement).getAttribute('数据-分组名')
      if (分组名 && evt.newIndex !== undefined && evt.oldIndex !== undefined && evt.newIndex !== evt.oldIndex) {
        仓库.移动分组(分组名, evt.newIndex)
      }
    },
  })
}

function 销毁分组拖拽() {
  if (分组拖拽实例) {
    分组拖拽实例.destroy()
    分组拖拽实例 = null
  }
}

function 滚动到分组(分组名: string) {
  激活分组名.value = 分组名
  const 容器 = 分组列表容器.value
  if (!容器) return
  const 区块 = 容器.querySelector(`[数据-分组名="${分组名}"]`) as HTMLElement | null
  if (区块) {
    区块.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function 处理T键按下(e: KeyboardEvent) {
  if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const 目标 = e.target as HTMLElement
    if (目标.tagName === 'INPUT' || 目标.tagName === 'TEXTAREA') return
    显示分组名称.value = !显示分组名称.value
  }
}

/** B 快捷键：切换批量模式 */
function 处理B键按下(e: KeyboardEvent) {
  if ((e.key === 'b' || e.key === 'B') && !e.ctrlKey && !e.altKey && !e.metaKey) {
    const 目标 = e.target as HTMLElement
    if (目标.tagName === 'INPUT' || 目标.tagName === 'TEXTAREA' || 目标.tagName === 'SELECT') return
    if (搜索模式.value) return
    e.preventDefault()
    if (批量模式.value) 退出批量模式()
    else 进入批量模式()
  }
}
</script>

<template>
  <MainLayout>
    <div class="图标库管理视图">
      <!-- 加载状态 -->
      <div v-if="仓库.加载中" class="加载状态">
        <i class="fas fa-spinner fa-pulse fa-2x"></i>
        <span>加载中...</span>
      </div>

      <!-- 错误提示 -->
      <div v-else-if="仓库.错误信息" class="错误提示">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ 仓库.错误信息 }}</span>
      </div>

      <!-- 主内容区 -->
      <div v-else class="内容区">
        <!-- 上区：分组列表 + 导航条 -->
        <section class="上区">
          <!-- 导航条 -->
          <div v-if="仓库.当前分组列表.length > 1" ref="导航条容器" class="导航条" :class="{ '导航条--显示名称': 显示分组名称 }">
            <button v-for="分组 in 仓库.当前分组列表" :key="分组.名称" class="导航条项" :class="{ '导航条项--激活': 激活分组名 === 分组.名称, '导航条项--显示名称': 显示分组名称 }" @mouseenter="显示导航提示($event, 分组.名称)" @mouseleave="隐藏导航提示" @click="滚动到分组(分组.名称)">
              <span class="导航条项圆点"></span><span class="导航条项名称">{{ 分组.名称 }}</span>
            </button>
          </div>

          <div ref="分组列表容器" class="分组列表" :class="{ '分组列表--窄导航': !显示分组名称 }" @contextmenu="空白处右键" @mousedown="分组列表mousedown">
            <div v-for="(分组, 序号) in 仓库.当前分组列表" :key="分组.名称" class="分组区块" :数据-分组名="分组.名称">
              <!-- 分组标题 -->
              <div class="分组标题" :class="{ '分组标题--激活': 激活分组名 === 分组.名称, '分组标题--选中': 批量模式 && 批量操作级别 === '分组' && 选中分组集合.has(分组.名称) }" @click="点击分组标题(分组.名称)" @contextmenu.prevent.stop="仓库.打开右键菜单($event, '分组', 分组.名称)">
                <button class="添加图标按钮" :title="'添加图标到 ' + 分组.名称" @click.stop="点击添加图标(分组.名称)">
                  <i class="fas fa-plus"></i>
                </button>
                <i class="fas 展开图标" :class="仓库.展开分组.get(`${仓库.当前类别}/${分组.名称}`) !== false ? 'fa-chevron-down' : 'fa-chevron-right'" @click.stop="点击展开图标(分组.名称)"></i>

                <template v-if="仓库.重命名中 === 分组.名称">
                  <input v-model="仓库.重命名值" class="重命名输入框" @keyup.enter="仓库.确认重命名()" @keyup.escape="仓库.取消重命名()" @click.stop @blur="仓库.确认重命名()" autofocus />
                </template>
                <template v-else>
                  <span class="分组序号">{{ 序号 + 1 }}</span>
                  <span class="分组名称">{{ 分组.名称 }}</span>
                  <span class="分组计数">({{ 分组.图标.length }})</span>
                </template>
              </div>

              <!-- 图标网格 -->
              <div v-if="仓库.展开分组.get(`${仓库.当前类别}/${分组.名称}`) !== false" class="图标网格" :class="{ '空网格': 分组.图标.length === 0 }">
                <div v-for="图标 in 分组.图标" :key="`${分组.名称}-${图标.值}`" class="图标项" :class="{ 选中: 选中图标集合.has(`${分组.名称}::${图标.值}`) }" :数据-图标值="图标.值" @click="点击图标项(分组.名称, 图标.值)" @mouseenter="显示图标提示($event, 图标.显示名)" @mouseleave="隐藏图标提示" @contextmenu.prevent.stop="仓库.打开右键菜单($event, '图标', 分组.名称, 图标.值)" @dblclick="复制图标代码(图标.值)" @dragstart.prevent>
                  <div v-if="是FA图标(图标.值)" class="图标缩略图">
                    <i :class="图标.值" class="fa缩略图"></i>
                  </div>
                  <div v-else-if="是图片图标(图标.值)" class="图标缩略图 图片缩略图">
                    <img v-if="缩略图URL(图标)" :src="缩略图URL(图标)" :alt="图标.显示名" class="缩略图图片" draggable="false" />
                    <div v-else class="图片加载中">
                      <i class="fas fa-spinner fa-pulse"></i>
                    </div>
                  </div>
                  <div v-else class="图标缩略图 emoji缩略图">
                    <span>{{ 图标.值 }}</span>
                  </div>

                  <div v-if="仓库.大图标信息.has(图标.值)" class="大图标角标" :class="{ '大图标角标--小图': !仓库.大图标信息.get(图标.值)!.是否大图 }" :title="仓库.大图标信息.get(图标.值)!.是否大图 ? `图片过大：${格式化体积(仓库.大图标信息.get(图标.值)!.体积)}，${仓库.大图标信息.get(图标.值)!.宽}×${仓库.大图标信息.get(图标.值)!.高}px，建议右键「裁切图标」或「压缩图标」处理` : `${仓库.大图标信息.get(图标.值)!.宽}×${仓库.大图标信息.get(图标.值)!.高}px，${格式化体积(仓库.大图标信息.get(图标.值)!.体积)}`">
                    {{ 大图标角标(图标.值) }}
                  </div>
                  <div v-if="仓库.引用显示中 && 图标.值.startsWith('icons:') && 仓库.引用统计.get(图标.值)" class="引用徽标" :class="{ '引用徽标--零': 仓库.引用统计.get(图标.值)!.总数 === 0 }" :title="仓库.引用统计.get(图标.值)!.总数 === 0 ? '无任何引用，可清理' : `引用 ${仓库.引用统计.get(图标.值)!.总数} 次`">
                    {{ 仓库.引用统计.get(图标.值)!.总数 }}
                  </div>

                  <span class="图标名称">{{ 图标.显示名 }}</span>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="仓库.当前分组列表.length === 0" class="空状态">
              <i class="fas fa-inbox 空图标"></i>
              <span>暂无分组，点击下方「添加分组」创建</span>
            </div>
            <!-- 框选矩形 -->
            <div v-if="框选中" class="框选矩形" :style="{ left: 框选矩形.x + 'px', top: 框选矩形.y + 'px', width: 框选矩形.w + 'px', height: 框选矩形.h + 'px' }"></div>
          </div>
        </section>

        <!-- 下区：类别标签 + 操作按钮 -->
        <section class="下区">
          <div class="底部操作栏">
            <template v-if="搜索模式">
              <div class="搜索栏">
                <input ref="搜索输入框" v-model="本地搜索词" class="搜索输入框" placeholder="搜索图标或分组名称…" @keydown.escape.prevent="搜索框ESC" @compositionstart="处理输入法开始" @compositionend="处理输入法结束" />
                <i class="fas fa-search 搜索输入图标"></i>
                <button class="搜索关闭按钮" @click="关闭搜索()"><i class="fas fa-times"></i></button>
              </div>
            </template>
            <template v-else>
            <div class="第一组">
              <button class="切换方向按钮" title="搜索" @click="打开搜索()">
                <i class="fas fa-search"></i>
              </button>
              <button class="切换方向按钮" title="全部折叠" @click="全部折叠()">
                <i class="fas fa-compress-alt"></i>
              </button>
              <button class="切换方向按钮" title="全部展开" @click="全部展开()">
                <i class="fas fa-expand-alt"></i>
              </button>
              <button class="切换方向按钮" title="切换排序" @click="仓库.切换排序方向()">
                <i class="fas fa-exchange-alt fa-rotate-90"></i>
              </button>
            </div>
            <!-- 第二组：类别标签 -->
            <div class="第二组">
              <button v-for="标签 in 仓库.类别标签列表" :key="标签.键" class="类别标签" :class="{ '类别标签--激活': 仓库.当前类别 === 标签.键 }" :title="标签.显示名 + ' (' + 标签.图标计数 + '个)'" @click="仓库.切换类别(标签.键)">
                <i :class="标签.fa类名"></i>
                <span>{{ 标签.显示名 }}</span>
              </button>
            </div>
            <!-- 第三组：操作按钮 -->
            <div class="第三组">
              <template v-if="仓库.添加分组输入中">
                <input ref="添加分组输入框" v-model="仓库.添加分组输入值" class="输入框" placeholder="分组名称" @keyup.enter="仓库.确认添加分组()" @keyup.escape="仓库.取消添加分组()" @blur="仓库.取消添加分组()" autofocus />
              </template>
              <button v-else class="操作按钮" @click="开始添加分组()">
                <i class="fas fa-plus"></i>
                <span>添加分组</span>
              </button>
              <button v-if="仓库.当前类别 === 'fontawesome' || 仓库.当前类别 === 'emoji'" class="操作按钮 分类恢复按钮" title="加载分组" @click="仓库.打开分类选择弹窗()">
                <i class="fas fa-layer-group"></i>
              </button>
              <button class="操作按钮 调色板按钮" title="背景颜色" @click="打开调色板弹窗()">
                <i class="fas fa-palette"></i>
              </button>
            </div>
            </template>
            <button v-if="批量模式" class="批量模式按钮" :class="{ '批量模式按钮--收纳': 信息板收纳 }" @click="切换信息板收纳">
              <i class="fas fa-tasks"></i>
              <span>批量模式</span>
            </button>
          </div>
          <div v-if="复制提示可见" class="复制提示">复制成功</div>
        </section>
      </div>

      <!-- 图标表单弹窗（fontawesome / emoji 共用） -->
      <IconFormModal v-if="仓库.表单弹窗可见" :可见="仓库.表单弹窗可见" :模式="仓库.表单弹窗模式" :分组名="仓库.表单弹窗分组名" :图标值="仓库.表单弹窗图标值" :显示名="仓库.表单弹窗显示名" :类别="仓库.当前类别" @确认="表单确认" @关闭="表单关闭" />

      <!-- 图片上传弹窗（userUpload 专用） -->
      <ImageUploadModal v-if="仓库.图片弹窗可见" />

      <!-- 网页图标弹窗（urlDownload 专用） -->
      <UrlDownloadModal v-if="仓库.URL弹窗可见" />

      <!-- 引用详情弹窗 -->
      <div v-if="仓库.引用弹窗可见" class="引用弹窗覆盖层" @mousedown.self="仓库.关闭引用弹窗()">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-sitemap"></i>
            <span>图标引用（{{ 仓库.引用卡片列表.length }} 张卡片）</span>
          </div>
          <div v-if="仓库.引用卡片列表.length === 0" class="引用空状态">
            <i class="fas fa-check-circle"></i>
            <span>暂无卡片引用此图标</span>
          </div>
          <div v-else class="引用列表">
            <div v-for="(卡片, idx) in 仓库.引用卡片列表" :key="idx" class="引用项">
              <span class="引用项标题">{{ 卡片.标题 }}</span>
              <span class="引用项菜单">{{ 卡片.菜单名 }}</span>
            </div>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="仓库.关闭引用弹窗()">关闭</button>
          </div>
        </div>
      </div>

      <!-- 删除图标确认 -->
      <div v-if="删除确认.可见" class="引用弹窗覆盖层" @mousedown.self="删除确认.可见 = false">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-exclamation-triangle"></i>
            <span>确认删除</span>
          </div>
          <div class="删除确认内容">
            <div class="删除确认预览">
              <div v-if="是FA图标(删除确认.图标值)" class="图标缩略图">
                <i :class="删除确认.图标值" class="fa缩略图"></i>
              </div>
              <div v-else-if="是图片图标(删除确认.图标值)" class="图标缩略图 图片缩略图">
                <img v-if="缩略图URL({ 值: 删除确认.图标值 })" :src="缩略图URL({ 值: 删除确认.图标值 })" :alt="删除确认.显示名" class="缩略图图片" draggable="false" />
                <div v-else class="图片加载中">
                  <i class="fas fa-spinner fa-pulse"></i>
                </div>
              </div>
              <div v-else class="图标缩略图 emoji缩略图">
                <span>{{ 删除确认.图标值 }}</span>
              </div>
            </div>
            <div class="删除确认消息">
              <template v-if="删除确认.引用数 > 0 && 删除确认.替代图标">
                有 <strong>{{ 删除确认.引用数 }}</strong> 张卡片正在引用此图标，删除后将自动替换为「{{ 删除确认.替代图标.显示名 }}」。
              </template>
              <template v-else-if="删除确认.引用数 > 0">
                有 <strong>{{ 删除确认.引用数 }}</strong> 张卡片正在引用此图标，删除后这些卡片将显示为默认图标。
              </template>
              <template v-else>
                确认删除「{{ 删除确认.显示名 }}」？<span v-if="是图片图标(删除确认.图标值)"><br />0 引用可放心删除。</span>
              </template>
            </div>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="删除确认.可见 = false">取消</button>
            <button class="确认添加按钮 弹窗按钮 危险按钮" @click="执行确认删除">仍要删除</button>
          </div>
        </div>
      </div>

      <!-- 批量删除总确认 -->
      <div v-if="批量删除确认.可见" class="引用弹窗覆盖层" @mousedown.self="批量删除确认.可见 = false">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-exclamation-triangle"></i>
            <span>批量删除</span>
          </div>
          <div class="删除确认消息">
            确认删除选中的 <strong>{{ 批量删除确认.数量 }}</strong> 个图标？<br />
            <span class="批量删除提示">其中有引用的图片图标将逐个确认。</span>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="批量删除确认.可见 = false">取消</button>
            <button class="确认添加按钮 弹窗按钮 危险按钮" @click="执行批量删除">仍要删除</button>
          </div>
        </div>
      </div>

      <!-- 批量删除逐个引用确认 -->
      <div v-if="批量逐个确认.可见 && 批量逐个确认.当前" class="引用弹窗覆盖层">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-exclamation-triangle"></i>
            <span>引用确认（{{ 批量逐个确认.当前进度 }}/{{ 批量逐个确认.总数 }}）</span>
          </div>
          <div class="删除确认消息">
            <div class="批量逐个图标名">{{ 批量逐个确认.当前.显示名 }}</div>
            <template v-if="批量逐个确认.当前.替代图标">
              有 <strong>{{ 批量逐个确认.当前.引用数 }}</strong> 张卡片正在使用此图标，删除后将自动替换为「{{ 批量逐个确认.当前.替代图标.显示名 }}」。
            </template>
            <template v-else>
              有 <strong>{{ 批量逐个确认.当前.引用数 }}</strong> 张卡片正在使用此图标，该网站下没有其它同域名图标，删除后这些卡片将显示为默认图标。
            </template>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="跳过批量逐个删除">跳过</button>
            <button class="确认添加按钮 弹窗按钮 危险按钮" :disabled="批量逐个执行中" @click="执行批量逐个删除">仍要删除</button>
          </div>
        </div>
      </div>

      <!-- 批量移动确认 -->
      <div v-if="批量移动确认.可见" class="引用弹窗覆盖层" @mousedown.self="批量移动确认.可见 = false">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-arrows-alt"></i>
            <span>批量移动</span>
          </div>
          <div class="删除确认消息">
            确认将选中的 <strong>{{ 批量移动确认.数量 }}</strong> 个图标移动到分组「{{ 批量移动确认.目标分组名 }}」？
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="批量移动确认.可见 = false">取消</button>
            <button class="确认添加按钮 弹窗按钮" @click="执行批量移动">确认移动</button>
          </div>
        </div>
      </div>

      <!-- 删除分组确认 -->
      <div v-if="删除分组确认.可见" class="引用弹窗覆盖层" @mousedown.self="删除分组确认.可见 = false">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-exclamation-triangle"></i>
            <span>删除分组</span>
          </div>
          <div class="删除确认消息">
            确认删除分组「{{ 删除分组确认.分组名 }}」及其 <strong>{{ 删除分组确认.图标数 }}</strong> 个图标？<br />
            <span class="批量删除提示">组内被引用的图标将自动迁移到替代图标。</span>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="删除分组确认.可见 = false">取消</button>
            <button class="确认添加按钮 弹窗按钮 危险按钮" @click="执行删除分组">仍要删除</button>
          </div>
        </div>
      </div>

      <!-- 批量删除分组确认 -->
      <div v-if="批量删除分组确认.可见" class="引用弹窗覆盖层" @mousedown.self="批量删除分组确认.可见 = false">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-exclamation-triangle"></i>
            <span>批量删除分组</span>
          </div>
          <div class="删除确认消息">
            确认删除 <strong>{{ 批量删除分组确认.分组数 }}</strong> 个分组及其 <strong>{{ 批量删除分组确认.图标数 }}</strong> 个图标？<br />
            <span class="批量删除提示">组内被引用的图标将自动迁移到替代图标。</span>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="批量删除分组确认.可见 = false">取消</button>
            <button class="确认添加按钮 弹窗按钮 危险按钮" @click="执行批量删除分组">仍要删除</button>
          </div>
        </div>
      </div>

      <!-- 清理未引用确认 -->
      <div v-if="仓库.清理确认弹窗可见" class="引用弹窗覆盖层" @mousedown.self="仓库.关闭清理确认()">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-eraser"></i>
            <span>清理未引用图标</span>
          </div>
          <div v-if="仓库.清理待删列表.length === 0" class="引用空状态">
            <i class="fas fa-check-circle"></i>
            <span>没有未引用的图片图标</span>
          </div>
          <template v-else>
            <div class="统一消息">
              以下 <strong>{{ 仓库.清理待删列表.length }}</strong> 个图片图标无任何引用（卡片/菜单/壁纸），删除后不可恢复：
            </div>
            <div class="引用列表 清理列表">
              <div v-for="(项, idx) in 仓库.清理待删列表" :key="idx" class="引用项">
                <span class="引用项标题">{{ 项.显示名 }}</span>
                <span class="引用项菜单">{{ 项.分组名 }}</span>
              </div>
            </div>
          </template>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="仓库.关闭清理确认()">取消</button>
            <button v-if="仓库.清理待删列表.length > 0" class="确认添加按钮 弹窗按钮 危险按钮" @click="仓库.执行清理未引用()">
              <i class="fas fa-trash"></i>
              <span>删除 {{ 仓库.清理待删列表.length }} 个</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 统一为此图标（第 7 项：引用迁移） -->
      <div v-if="仓库.统一图标弹窗可见" class="引用弹窗覆盖层" @mousedown.self="仓库.关闭统一图标弹窗()">
        <div class="引用弹窗" @click.stop>
          <div class="引用弹窗标题">
            <i class="fas fa-object-group"></i>
            <span>统一为此图标</span>
          </div>
          <div class="统一说明">
            目标：<strong>{{ 仓库.统一图标目标?.显示名 }}</strong>
            <span class="统一域名">{{ 仓库.统一图标目标?.绑定域名 }}</span>
          </div>
          <div v-if="仓库.统一图标卡片列表.length === 0" class="引用空状态">
            <i class="fas fa-info-circle"></i>
            <span>没有需要统一的卡片</span>
          </div>
          <template v-else>
            <div class="统一消息">
              以下 <strong>{{ 仓库.统一图标卡片列表.length }}</strong> 张卡片的图标将切换到它：
            </div>
            <div class="引用列表">
              <div v-for="(卡片, idx) in 仓库.统一图标卡片列表" :key="idx" class="引用项">
                <span class="引用项标题">{{ 卡片.标题 }}</span>
                <span class="引用项菜单">{{ 卡片.菜单名 }}</span>
              </div>
            </div>
            <div v-if="仓库.统一图标无引用数 > 0" class="统一提示">
              另有 {{ 仓库.统一图标无引用数 }} 个同域名图标没有卡片引用，可手动删除腾空
            </div>
          </template>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="仓库.关闭统一图标弹窗()">取消</button>
            <button
              v-if="仓库.统一图标卡片列表.length > 0"
              class="确认添加按钮 弹窗按钮"
              @click="仓库.执行统一图标()"
            >
              <i class="fas fa-check"></i>
              <span>确认统一</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 图标裁切弹窗 -->
      <CropModal :可见="仓库.裁切弹窗可见" :相对路径="仓库.裁切弹窗相对路径" @完成="仓库.裁切完成" @关闭="仓库.关闭裁切弹窗" />
      <!-- 图标压缩弹窗 -->
      <CompressModal :可见="仓库.压缩弹窗可见" :相对路径="仓库.压缩弹窗相对路径" @完成="仓库.压缩完成" @关闭="仓库.关闭压缩弹窗" />

      <!-- 分类选择恢复弹窗（FA / Emoji 共用） -->
      <div v-if="仓库.分类选择弹窗可见" class="遮罩层" @mousedown.self="仓库.关闭分类选择弹窗()">
        <div class="分类选择弹窗">
          <div class="确认弹窗标题">
            <i class="fas fa-layer-group"></i>
            <span>加载分组</span>
            <span class="分类选择计数">已选 {{ 仓库.已勾选数 }} / {{ 仓库.当前分类摘要.length + 1 }}</span>
          </div>
          <div class="分类选择操作行">
            <button class="全选按钮" @click="仓库.切换全选(true)">全选</button>
            <button class="全选按钮" @click="仓库.切换全选(false)">取消全选</button>
          </div>
          <div class="分类选择列表">
            <label class="分类选择项 分类选择项--默认">
              <input type="checkbox" :checked="仓库.分类勾选.get('__default__')" @change="仓库.分类勾选.set('__default__', ($event.target as HTMLInputElement).checked)" />
              <span class="分类选择名">默认分组</span>
              <span class="分类选择数">{{ 仓库.当前类别 === 'emoji' ? '51个' : '70个' }}</span>
            </label>
            <label v-for="分类 in 仓库.当前分类摘要" :key="分类.分类键" class="分类选择项">
              <input type="checkbox" :checked="仓库.分类勾选.get(分类.分类键)" @change="仓库.分类勾选.set(分类.分类键, ($event.target as HTMLInputElement).checked)" />
              <span class="分类选择名">{{ 分类.分类名 }}</span>
              <span class="分类选择数">{{ 分类.图标数 }}个</span>
            </label>
          </div>
          <div class="确认弹窗按钮行">
            <button class="取消按钮 弹窗按钮" @click="仓库.关闭分类选择弹窗()">取消</button>
            <button class="确认添加按钮 弹窗按钮" :disabled="仓库.已勾选数 === 0" @click="仓库.确认分类恢复()">
              <i class="fas fa-check"></i>
              <span>添加 {{ 仓库.已勾选数 }} 项</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 调色板弹窗（背景颜色设置） ===== -->
      <div v-if="调色板弹窗可见" class="遮罩层 调色板遮罩" @mousedown.self="关闭调色板弹窗()">
        <div class="弹窗 调色板弹窗" :style="弹窗样式" @mousedown.stop>
          <!-- 标题区（可拖拽） -->
          <div class="弹窗标题 调色板标题" @mousedown="拖拽开始">
            <h3>背景颜色</h3>
            <i class="fas fa-times 关闭按钮" @click="关闭调色板弹窗()"></i>
          </div>

          <!-- 内容区 -->
          <div class="调色板内容">
            <!-- 颜色选择器 + 透明背景 -->
            <div class="调色板第一行">
              <div class="颜色选择器分组">
                <span class="分组标签">选择颜色</span>
                <label class="颜色选择器容器" title="选择颜色">
                  <input type="color" class="颜色选择器" :value="预览色 || 仓库.类别背景颜色[仓库.当前类别]" @input="颜色输入处理" @change="颜色完成处理" />
                  <span class="色环装饰"></span>
                </label>
              </div>

              <div class="透明背景分组">
                <span>透明背景</span>
                <label class="透明开关标签" title="透明背景（仅当前类别）">
                  <span class="滑动开关" :class="{ '滑动开关--开': 仓库.类别透明背景[仓库.当前类别] }">
                    <input type="checkbox" class="滑动开关输入" :checked="仓库.类别透明背景[仓库.当前类别]" @change="仓库.设置当前类别透明背景(($event.target as HTMLInputElement).checked)" />
                    <span class="滑动开关滑块"></span>
                  </span>
                </label>
              </div>
            </div>

            <!-- 历史颜色 -->
            <div v-if="仓库.颜色历史.length > 0" class="历史颜色行">
              <span class="颜色行标签">历史</span>
              <div class="色块行">
                <button v-for="颜色 in 仓库.颜色历史.slice(0, 12)" :key="颜色" class="色块 历史色块" :class="{ '色块--激活': 仓库.类别背景颜色[仓库.当前类别] === 颜色 && !仓库.类别透明背景[仓库.当前类别] }" :style="{ background: 颜色 }" @click="仓库.设置当前类别背景颜色并持久化(颜色)" :title="颜色"></button>
              </div>
            </div>

            <!-- 固定色盘 -->
            <div class="固定色盘">
              <span class="颜色行标签">色盘</span>
              <div class="色块行">
                <button v-for="颜色 in 固定色盘" :key="颜色" class="色块" :class="{ '色块--激活': 仓库.类别背景颜色[仓库.当前类别] === 颜色 && !仓库.类别透明背景[仓库.当前类别] }" :style="{ background: 颜色 }" @click="仓库.设置当前类别背景颜色并持久化(颜色)" :title="颜色"></button>
              </div>
            </div>
          </div>

          <!-- 按钮区 -->
          <div class="按钮行">
            <button class="确认按钮" @click="关闭调色板弹窗()">
              <i class="fas fa-check"></i>
              <span>完成</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右键菜单 -->
      <div class="右键菜单根">
        <div v-show="仓库.右键菜单.可见" class="右键菜单覆盖层" @click="仓库.关闭右键菜单" @contextmenu.prevent="仓库.关闭右键菜单"></div>
        <div v-show="仓库.右键菜单.可见" class="右键菜单" :style="{ left: 仓库.右键菜单.x + 'px', top: 仓库.右键菜单.y + 'px' }" @click.stop>
          <template v-if="仓库.右键菜单.类型 === '分组'">
            <div v-if="!批量模式" class="右键菜单项" @click="进入批量模式('分组')">
              <i class="fas fa-tasks"></i>
              <span>批量管理</span>
            </div>
            <div v-else class="右键菜单项" @click="退出批量模式()">
              <i class="fas fa-sign-out-alt"></i>
              <span>退出批量模式</span>
            </div>
            <div class="右键菜单项" @click="仓库.移动分组(仓库.右键菜单.分组名, 0); 仓库.关闭右键菜单()">
              <i class="fas fa-angle-double-up"></i>
              <span>移到最前</span>
            </div>
            <div
              class="右键菜单项"
              @click="
                (() => {
                  仓库.开始重命名(仓库.右键菜单.分组名)
                  聚焦重命名()
                })()
              "
            >
              <i class="fas fa-pen"></i>
              <span>重命名分组</span>
            </div>
            <div class="右键菜单项 危险" @click="请求删除分组(仓库.右键菜单.分组名)">
              <i class="fas fa-trash"></i>
              <span>删除分组</span>
            </div>
          </template>
          <template v-else-if="仓库.右键菜单.类型 === '图标'">
            <div v-if="是图片类别()" class="右键菜单项" @click="查看引用()">
              <i class="fas fa-eye"></i>
              <span>查看引用</span>
            </div>
            <div
              v-if="是URL下载()"
              class="右键菜单项"
              :class="{ '右键菜单项--禁用': !仓库.当前图标可统一 }"
              :title="仓库.当前图标可统一 ? '' : '该图标未绑定域名，无法判断统一范围'"
              @click="仓库.当前图标可统一 && 仓库.打开统一图标弹窗(仓库.右键菜单.分组名, 仓库.右键菜单.图标值)"
            >
              <i class="fas fa-object-group"></i>
              <span>统一为此图标</span>
            </div>
            <div v-if="仓库.右键菜单.图标值.startsWith('icons:')" class="右键菜单项" @click="仓库.打开裁切弹窗(仓库.右键菜单.图标值)">
              <i class="fas fa-crop-alt"></i>
              <span>裁切图标</span>
            </div>
            <div
              v-if="仓库.右键菜单.图标值.startsWith('icons:')"
              class="右键菜单项"
              :class="{ '右键菜单项--禁用': !仓库.图标可压缩(仓库.右键菜单.图标值) }"
              :title="仓库.图标可压缩(仓库.右键菜单.图标值) ? '' : '矢量图(SVG)/动图(GIF)/ICO 不支持压缩'"
              @click="仓库.图标可压缩(仓库.右键菜单.图标值) && 仓库.打开压缩弹窗(仓库.右键菜单.图标值)"
            >
              <i class="fas fa-compress-alt"></i>
              <span>压缩图标</span>
            </div>
            <div class="右键菜单项" @click="右键编辑图标()">
              <i class="fas fa-pen"></i>
              <span>编辑图标</span>
            </div>
            <div class="右键菜单项 危险" @click="请求删除图标(仓库.右键菜单.分组名, 仓库.右键菜单.图标值)">
              <i class="fas fa-trash"></i>
              <span>删除</span>
            </div>
          </template>
          <template v-else-if="仓库.右键菜单.类型 === '空白'">
            <div v-if="!批量模式" class="右键菜单项" @click="进入批量模式()">
              <i class="fas fa-tasks"></i>
              <span>批量管理</span>
            </div>
            <div v-else class="右键菜单项" @click="退出批量模式()">
              <i class="fas fa-sign-out-alt"></i>
              <span>退出批量模式</span>
            </div>
            <div v-if="是图片类别()" class="右键菜单项" @click="触发扫描大图标()">
              <i class="fas fa-search-plus"></i>
              <span>扫描尺寸</span>
            </div>
            <div v-if="是图片类别()" class="右键菜单项" @click="触发扫描引用()">
              <i class="fas fa-link"></i>
              <span>扫描引用</span>
            </div>
            <div v-if="是图片类别()" class="右键菜单项 危险" @click="触发清理未引用()">
              <i class="fas fa-eraser"></i>
              <span>清理未引用图标</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 图标悬停提示 -->
    <Teleport to="body">
      <div v-if="图标提示.可见" class="图标悬停提示" :style="{ left: 图标提示.x + 'px', top: 图标提示.y + 'px' }">{{ 图标提示.文字 }}</div>
    </Teleport>

    <!-- 导航条悬停提示 -->
    <Teleport to="body">
      <div v-if="导航提示.可见" class="导航悬停提示" :style="{ left: 导航提示.x + 'px', top: 导航提示.y + 'px' }">{{ 导航提示.文字 }}</div>
    </Teleport>

    <!-- 批量操作悬浮信息板 -->
    <BatchPanel v-if="批量模式 && !信息板收纳" :选中数="选中图标集合.size" :选中列表="选中图标详情列表" :可选分组列表="仓库.当前分组列表.map(g => g.名称)" :操作级别="批量操作级别" :选中分组列表="[...选中分组集合]" :选中分组数="选中分组集合.size" @退出="退出批量模式" @收纳="信息板收纳 = true" @清空="清空选中" @全选="全选激活分组" @切换选中="切换选中" @批量删除="请求批量删除" @批量移动="请求批量移动" @开始批量拖拽="开始批量拖拽" @切换级别="切换批量操作级别" @批量删除分组="请求批量删除分组" @全选分组="全选分组" @清空选中分组="清空选中分组" />
  </MainLayout>
</template>

<style scoped>
/* ===== 整体容器 ===== */
.图标库管理视图 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  color: #fff;
}

/* ===== 加载/错误状态 ===== */
.加载状态 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: #fff;
}
.错误提示 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #e74c3c;
  flex: 1;
}

/* ===== 内容区 ===== */
.内容区 {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* ===== 上区 ===== */
.上区 {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* ===== 下区 ===== */
.下区 {
  flex: 0 0 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  position: relative;
}

/* ===== 底部操作栏 ===== */
.底部操作栏 {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 24px;
  flex-shrink: 0;
  gap: 40px;
}
.第一组 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.搜索栏 {
  display: flex;
  align-items: center;
  width: 400px;
  position: relative;
}
.搜索输入框 {
  width: 100%;
  padding: 8px 64px 8px 36px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}
.搜索输入图标 {
  position: absolute;
  left: 12px;
  color: var(--弱化文字颜色);
  font-size: 13px;
  pointer-events: none;
}
.搜索输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.搜索输入框::placeholder {
  color: var(--弱化文字颜色);
}
.搜索关闭按钮 {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  transition: all 0.15s;
}
.搜索关闭按钮:hover {
  color: var(--全站通用文字颜色);
  background: rgba(255, 255, 255, 0.1);
}
.第二组 {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  overflow-x: auto;
  align-items: center;
}
.类别标签 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 120px;
  height: 48px;
  padding: 10px 24px;
  border: none;
  border-radius: 999px;
  background: #3eb489;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
  white-space: nowrap;
}
.类别标签:hover {
  background: #ff8c00;
}
.类别标签--激活 {
  background: #ff8c00;
}
.切换方向按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: none;
  border-radius: 50%;
  background: #3eb489;
  color: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 1rem;
}
.切换方向按钮:hover {
  background: #ff8c00;
}

/* ===== 第三组：操作按钮 ===== */
.第三组 {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  align-items: center;
}
.操作按钮 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 999px;
  background: #3eb489;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  white-space: nowrap;
  line-height: 1;
}
.操作按钮 i,
.操作按钮 span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.操作按钮:hover {
  background: #ff8c00;
  color: #fff;
}
.添加分组输入行 {
  display: flex;
  gap: 6px;
  align-items: center;
}

/* ===== 分组列表 ===== */
.分组列表 {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 12px 24px;
  padding-right: 100px;
  transition: padding-right 0.2s;
  user-select: none;
}
.分组列表--窄导航 {
  padding-right: 40px;
}
.分组列表::-webkit-scrollbar {
  width: 6px;
}
.分组列表::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* ===== 分组区块 ===== */
.分组区块 {
  margin-bottom: 12px;
}
.分组区块.分组拖拽占位 {
  opacity: 0.3;
  transition: none;
}
.分组拖拽跟随 {
  opacity: 1 !important;
  z-index: 9999;
  transition: none !important;
  pointer-events: none;
}
.分组拖拽跟随 .图标网格 {
  display: none;
}
.分组标题 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.分组标题:hover {
  background: rgba(255, 255, 255, 0.05);
}
.分组标题--激活 .分组名称 {
  color: #ff8c00;
}
.分组标题--选中 {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--全站通用文字颜色) 80%, transparent);
  background: color-mix(in srgb, var(--全站通用文字颜色) 12%, transparent);
}
.展开图标 {
  font-size: 0.7rem;
  width: 12px;
  color: #fff;
  flex-shrink: 0;
}
.分组序号 {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.35);
  flex-shrink: 0;
  min-width: 1.2em;
  text-align: right;
}
.分组名称 {
  font-size: 0.95rem;
  font-weight: 500;
}
.分组计数 {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.添加图标按钮 {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
}
.添加图标按钮:hover {
  background: rgba(74, 159, 165, 0.3);
  color: #4a9fa5;
}

/* ===== 重命名输入框 ===== */
.重命名输入框 {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid #4a9fa5;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.9rem;
  outline: none;
}

/* ===== 图标网格 ===== */
.图标网格 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--图标库-网格最小宽度, 72px), 1fr));
  gap: var(--卡片-间距-水平, 20px);
  row-gap: var(--卡片-间距-垂直, 20px);
  padding: 4px 12px 12px 24px;
}
/* 空分组网格保留最小高度使可放入（用 .空网格 class 而非 :empty，Vue v-for 空时留注释节点 :empty 不匹配） */
.图标网格.空网格 {
  min-height: 48px;
}
/* 拖拽时悬停目标分组高亮（含空分组），outline 不占布局空间避免撑大 */
.图标网格.拖拽悬停目标 {
  outline: 2px dashed #4a9fa5;
  outline-offset: 2px;
  background: rgba(74, 159, 165, 0.08);
  border-radius: 6px;
}
/* 拖拽占位（原位置立即透明，transition:none 避免过渡留残影） */
.图标项.拖拽占位 {
  opacity: 0;
  transition: none;
}
/* 拖拽跟随项（fallbackOnBody=true append 到 body，套卡片容器模式：!important 确保样式生效） */
.拖拽跟随 {
  opacity: 1 !important;
  z-index: 9999;
  transition: none !important;
  pointer-events: none;
}
/* 拖拽进行中禁用图标项 hover 闪烁 */
:global(body.正在拖拽图标) .图标项:hover {
  background: transparent;
}
:global(body.批量模式) .图标项,
:global(body.批量模式) .图标项 * {
  -webkit-user-drag: none;
}
.图标项 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  position: relative;
  width: var(--卡片-当前尺寸, 80px);
}
.图标项:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: #4a9fa5;
}
/* 批量选中态：主题色边框 + 背景 + 右上角勾选标记 */
.图标项.选中 {
  border-color: color-mix(in srgb, var(--全站通用文字颜色) 80%, transparent);
  background: color-mix(in srgb, var(--全站通用文字颜色) 12%, transparent);
}
.图标项.选中::after {
  content: '\f00c';
  font-family: 'Font Awesome 5 Free';
  font-weight: 900;
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #3eb489;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
/* 框选矩形 */
.框选矩形 {
  position: absolute;
  border: 1px dashed var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  pointer-events: none;
  z-index: 10;
}
.图标缩略图 {
  width: var(--卡片-当前尺寸, 80px);
  height: var(--卡片-当前尺寸, 80px);
  border-radius: var(--卡片-圆角, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--调色板-预览色, v-bind("仓库.类别透明背景[仓库.当前类别] ? 'transparent' : 仓库.类别背景颜色[仓库.当前类别]"));
}
.fa缩略图 {
  font-size: v-bind('主题仓库.卡片图标尺寸 + "px"');
  color: #fff;
}
.emoji缩略图 {
  font-size: v-bind('主题仓库.Emoji图标尺寸 + "px"');
}
.emoji缩略图 span {
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-0.1em);
}
.图片缩略图 {
  overflow: hidden;
}
.缩略图图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.图标名称 {
  font-size: calc(var(--卡片-当前尺寸, 80px) * 0.18);
  color: #fff;
  text-align: center;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  line-height: 1.4;
}

/* ===== 大图标预警角标 / 引用徽标 ===== */
.大图标角标 {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 1px 5px;
  border-radius: 6px;
  background: #e74c3c;
  color: #fff;
  font-size: 0.62rem;
  font-weight: bold;
  line-height: 1.4;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 2;
}
.大图标角标--小图 {
  background: #2ecc71;
}
.引用徽标 {
  position: absolute;
  bottom: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: #2ecc71;
  color: #fff;
  font-size: 0.6rem;
  font-weight: bold;
  line-height: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 2;
}
.引用徽标--零 {
  background: #e74c3c;
}

/* ===== 输入框 ===== */
.输入框 {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.85rem;
  outline: none;
}
.输入框:focus {
  border-color: #4a9fa5;
}
.确认按钮,
.取消按钮 {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.确认按钮 {
  background: #4a9fa5;
  color: #fff;
}
.确认按钮:hover {
  background: #3b8a8f;
}
.取消按钮 {
  background: #555;
  color: #fff;
}
.取消按钮:hover {
  background: #666;
}

/* ===== 空状态 ===== */
.空状态 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
  color: #fff;
}
.空图标 {
  font-size: 2rem;
  opacity: 0.5;
}

/* ===== 恢复按钮 ===== */
.分类恢复按钮 {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  justify-content: center;
  border: none;
  color: var(--全站通用文字颜色);
}
.分类恢复按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.调色板按钮 {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 50%;
  justify-content: center;
  border: none;
}

/* ===== 复制提示 ===== */
.复制提示 {
  position: absolute;
  right: 44px;
  top: 50%;
  transform: translateY(-50%);
  background: #3eb489;
  color: #fff;
  padding: 10px 24px;
  border-radius: 999px;
  font-size: 0.95rem;
  pointer-events: none;
  white-space: nowrap;
  height: 48px;
  display: flex;
  align-items: center;
}
.复制提示-enter-active {
  transition: opacity 0.2s;
}
.复制提示-leave-active {
  transition: opacity 0.3s;
}
.复制提示-enter-from,
.复制提示-leave-to {
  opacity: 0;
}

/* ===== 遮罩层 ===== */
.遮罩层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}
/* 调色板弹窗的遮罩用透明，符合全局规则 */
.调色板遮罩 {
  background: transparent;
}

/* ===== 确认弹窗 ===== */
.确认弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 24px;
  min-width: 360px;
  max-width: 440px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.确认弹窗标题 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--全站通用文字颜色);
}
.确认弹窗标题 i {
  font-size: 1.2rem;
}
.确认弹窗内容 {
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 20px;
  color: var(--全站透明文字颜色);
}
.确认弹窗内容 strong {
  color: var(--全站通用文字颜色);
}
.确认弹窗标题 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 16px;
  color: #4a9fa5;
}
.确认弹窗标题 i {
  font-size: 1.2rem;
}
.确认弹窗内容 {
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 20px;
  color: #ccc;
}
.确认弹窗内容 strong {
  color: #4a9fa5;
}
.确认弹窗按钮行 {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.弹窗按钮 {
  width: auto;
  height: auto;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
}
.弹窗按钮.取消按钮 {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  color: var(--全站透明文字颜色);
}
.弹窗按钮.取消按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.确认添加按钮 {
  border: none;
  width: auto;
  height: auto;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #4a9fa5;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s;
}
.确认添加按钮:hover {
  background: #3b8a8f;
}

/* ===== 导航条 ===== */
.导航条 {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 70%;
  overflow-y: scroll;
  z-index: 10;
  padding: 2px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  border-radius: 8px;
  transition: all 0.2s;
}
.导航条::-webkit-scrollbar {
  display: none;
}
.导航条--显示名称 {
  padding: 4px;
  gap: 4px;
  width: 90px;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
}
.导航条项 {
  display: flex;
  align-items: center;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.15s;
  padding: 2px 4px;
  flex-shrink: 0;
  outline: none;
  border-radius: 6px;
  overflow: hidden;
}
.导航条项圆点 {
  width: 8px;
  height: 8px;
  min-width: 8px;
  min-height: 8px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--全站通用文字颜色) 40%, transparent);
  flex-shrink: 0;
}
.导航条项名称 {
  display: none;
  white-space: nowrap;
  font-size: 12px;
  margin-left: 6px;
  color: var(--全站透明文字颜色);
  overflow: hidden;
  text-overflow: ellipsis;
}
.导航条项--显示名称 .导航条项名称 {
  display: inline;
}
.导航条项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.导航条项:hover .导航条项圆点 {
  background: color-mix(in srgb, var(--全站通用文字颜色) 70%, transparent);
}
.导航条项--激活 .导航条项圆点 {
  background: #ff8c00 !important;
}
.导航条项--激活 .导航条项名称 {
  color: #ff8c00 !important;
}
.导航条项--激活:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.导航条项--激活:hover .导航条项圆点 {
  background: #ff8c00 !important;
}

/* ===== 分类选择弹窗 ===== */
.分类选择弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 24px;
  min-width: 400px;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.分类选择计数 {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  font-weight: 400;
}
.分类选择操作行 {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.全选按钮 {
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: transparent;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
}
.全选按钮:hover {
  border-color: var(--全站通用文字颜色);
  color: var(--全站通用文字颜色);
}
.分类选择列表 {
  flex: 1;
  overflow-y: auto;
  max-height: 50vh;
  margin-bottom: 16px;
}
.分类选择列表::-webkit-scrollbar {
  width: 6px;
}
.分类选择列表::-webkit-scrollbar-thumb {
  background: var(--滚动条颜色);
  border-radius: 3px;
}
.分类选择项 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.分类选择项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.分类选择项 input[type='checkbox'] {
  accent-color: #4a9fa5;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.分类选择名 {
  flex: 1;
  font-size: 0.9rem;
  color: var(--全站透明文字颜色);
}
.分类选择数 {
  font-size: 0.75rem;
  color: var(--弱化文字颜色);
  flex-shrink: 0;
}
.分类选择项--默认 {
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  padding-bottom: 10px;
  margin-bottom: 4px;
}

/* ===== 调色板弹窗 ===== */

/* 弹窗主体——符合全局弹窗样式 */
.调色板弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  width: 390px;
  overflow: hidden;
  cursor: default;
  position: relative;
}

/* 标题 */
.调色板标题 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  cursor: grab;
  user-select: none;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.调色板标题 h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: var(--全站通用文字颜色);
}
.关闭按钮 {
  cursor: pointer;
  color: var(--弱化文字颜色);
  font-size: 0.95rem;
  transition: color 0.15s;
}
.关闭按钮:hover {
  color: #e74c3c;
}

/* 内容 */
.调色板内容 {
  padding: 16px 20px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.调色板第一行 {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 40px;
}

/* 颜色选择器 + 透明背景 */
.颜色选择器分组 {
  display: flex;
  align-items: center;
  gap: 6px;
}
.分组标签 {
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  user-select: none;
  white-space: nowrap;
}
.透明背景分组 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  user-select: none;
}

.颜色选择器容器 {
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  cursor: pointer;
}

/* 内层 input 透明 */
.颜色选择器 {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  padding: 0;
  margin: 0;
  border: none;
  width: 100%;
  height: 100%;
}

/* 色环装饰 */
.色环装饰 {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #fff;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  pointer-events: none;
}
.色环装饰::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
}

/* 历史颜色行 / 固定色盘 */
.历史颜色行,
.固定色盘 {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.颜色行标签 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  width: 32px;
  flex-shrink: 0;
  line-height: 22px;
}

.色块行 {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.色块 {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.色块:hover {
  transform: scale(1.2);
  border-color: #fff;
}
.色块--激活 {
  border-color: #fff;
  box-shadow: 0 0 0 1px #fff;
}

/* 透明开关 */
.透明开关标签 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  flex-shrink: 0;
  user-select: none;
}

/* 滑动开关 */
.滑动开关 {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}
.滑动开关输入 {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.滑动开关滑块 {
  position: absolute;
  cursor: pointer;
  inset: 0;
  border-radius: 10px;
  background: v-bind('仓库.类别背景颜色[仓库.当前类别]');
  transition: background 0.2s;
}
.滑动开关滑块::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  bottom: 2px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.滑动开关--开 .滑动开关滑块::before {
  transform: translateX(16px);
}

/* 按钮行 */
.按钮行 {
  display: flex;
  justify-content: flex-end;
  padding: 0 20px 16px;
}
.调色板弹窗 .确认按钮 {
  width: auto;
  height: auto;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #4a9fa5;
  color: #fff;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
}
.调色板弹窗 .确认按钮:hover {
  background: #3b8a8f;
}
/* 批量模式底部按钮（胶囊形同类别标签；显示信息板=绿色，收纳=橙色激活色强调） */
.批量模式按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 48px;
  padding: 10px 20px;
  border: none;
  border-radius: 999px;
  background: #3eb489;
  color: #fff;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.15s;
  margin-left: auto;
  white-space: nowrap;
}
.批量模式按钮:hover {
  background: #ff8c00;
}
.批量模式按钮--收纳 {
  background: #ff8c00;
}
</style>

<!-- 右键菜单全局样式 -->
<style>
.图标悬停提示 {
  position: fixed;
  z-index: 9997;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  padding: 6px 12px;
  color: var(--全站通用文字颜色);
  font-size: 14px;
  pointer-events: none;
  transform: translateX(-50%);
  margin-top: 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.导航悬停提示 {
  position: fixed;
  z-index: 9997;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  padding: 6px 12px;
  color: var(--全站通用文字颜色);
  font-size: 14px;
  pointer-events: none;
  transform: translate(-50%, -100%);
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.右键菜单覆盖层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9998;
}
.右键菜单 {
  position: fixed;
  z-index: 9999;
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 140px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.右键菜单项 {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  color: var(--全站透明文字颜色);
  font-size: 0.9rem;
  transition: background 0.15s;
}
.右键菜单项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.右键菜单项 i {
  width: 16px;
  text-align: center;
  font-size: 0.85rem;
}
.右键菜单项.危险 {
  color: #e74c3c;
}
.右键菜单项.危险:hover {
  background: rgba(231, 76, 60, 0.15);
}

/* ===== 引用详情 / 删除确认弹窗 ===== */
.引用弹窗覆盖层 {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10500;
}
.引用弹窗 {
  width: 420px;
  max-width: 90vw;
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.引用弹窗标题 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  font-weight: 500;
  color: var(--全站通用文字颜色);
  margin-bottom: 14px;
}
.引用弹窗标题 i {
  font-size: 1.1rem;
}
.引用空状态 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--弱化文字颜色);
  font-size: 0.9rem;
  padding: 12px 0;
}
/* 统一为此图标：禁用态与弹窗内排版 */
.右键菜单项--禁用 {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}
.统一说明 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: var(--全站通用文字颜色);
}
.统一域名 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
}
.统一消息 {
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: var(--全站通用文字颜色);
}
.统一提示 {
  margin-top: 8px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--弱化文字颜色);
}
.引用列表 {
  max-height: 260px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.引用项 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  font-size: 0.85rem;
}
.引用项标题 {
  color: var(--全站通用文字颜色);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.引用项菜单 {
  color: var(--弱化文字颜色);
  font-size: 0.75rem;
  flex-shrink: 0;
}
.删除确认内容 {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.删除确认预览 {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.删除确认预览 .图标缩略图 {
  width: 60px;
  height: 60px;
}
.删除确认预览 .fa缩略图 {
  font-size: 48px;
}
.删除确认预览 .缩略图图片 {
  width: 60px;
  height: 60px;
  object-fit: contain;
}
.删除确认预览 .emoji缩略图 span {
  font-size: 48px;
}
.删除确认消息 {
  color: var(--全站透明文字颜色);
  font-size: 0.9rem;
  line-height: 1.6;
}
.删除确认消息 strong {
  color: #e74c3c;
  font-size: 1rem;
}
.批量删除提示 {
  color: var(--弱化文字颜色);
  font-size: 0.8rem;
}
.批量逐个图标名 {
  font-weight: bold;
  margin-bottom: 6px;
}
.危险按钮 {
  background: #e74c3c !important;
  color: #fff !important;
}
.批量拖拽跟随 {
  position: fixed;
  z-index: 100000;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--全站通用文字颜色);
  color: rgb(var(--背景色值), var(--背景色值), var(--背景色值));
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
.批量拖拽跟随 i {
  font-size: 16px;
}
.分组区块.批量拖拽目标 {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  outline: 2px dashed var(--全站通用文字颜色);
  outline-offset: -2px;
}
</style>
