<template>
  <div class="卡片容器" @mousedown="处理卡片按下">
    <div v-for="二级菜单 in 菜单仓库.获取所有二级菜单列表()" :key="二级菜单.唯一ID" v-show="可见菜单ID集合.has(二级菜单.唯一ID)" class="卡片网格" :data-menu-id="二级菜单.唯一ID">
      <div v-for="卡片 in 获取菜单卡片(二级菜单.唯一ID)" :key="卡片.唯一ID" class="卡片" :data-id="卡片.唯一ID" @contextmenu.prevent.stop="打开右键菜单($event, 卡片)" @dblclick="处理双击(卡片)" @mouseenter="显示提示($event, 卡片.标题)" @mouseleave="隐藏提示">
        <div class="色块" :style="{ backgroundColor: 卡片.背景颜色 && 卡片.背景颜色 !== 'transparent' ? 卡片.背景颜色 : 'transparent' }">
          <template v-if="卡片.图标类型 === 'default' || !卡片.图标类型">
            <i v-if="卡片.图标代码 && (卡片.图标代码.startsWith('fa-') || 卡片.图标代码.startsWith('fas ') || 卡片.图标代码.startsWith('far ') || 卡片.图标代码.startsWith('fab '))" :class="卡片.图标代码" class="卡片图标"></i>
            <img v-else-if="卡片.图标代码?.startsWith('icons:')" :src="获取全局图标URL(卡片)" class="卡片图片" :data-card-id="卡片.唯一ID" @error="卡片加载失败($event, 卡片)" />
            <span v-else-if="卡片.图标代码" class="卡片文字">{{ 卡片.图标代码 }}</span>
            <i v-else :class="获取图标(卡片.类型)" class="卡片图标"></i>
          </template>
          <span v-else-if="卡片.图标类型 === 'text'" class="卡片文字内容">{{ 卡片.图标文字 || '卡' }}</span>
          <img v-else-if="卡片.图标类型 === 'image' && 卡片.图片路径" :src="获取卡片图片URL(卡片)" class="卡片图片" :data-card-id="卡片.唯一ID" @error="卡片加载失败($event, 卡片)" />
          <img v-else-if="卡片.图标类型 === 'image' && 卡片.图标代码?.startsWith('icons:')" :src="获取全局图标URL(卡片)" class="卡片图片" :data-card-id="卡片.唯一ID" @error="卡片加载失败($event, 卡片)" />
          <i v-else :class="获取图标(卡片.类型)" class="卡片图标"></i>
        </div>
        <div class="标题">{{ 卡片.标题 }}</div>
      </div>
    </div>

    <!-- 卡片提示 -->
    <Teleport to="body">
      <div v-if="卡片提示.可见" class="卡片提示" :style="{ left: 卡片提示.x + 'px', top: 卡片提示.y + 'px' }">{{ 卡片提示.文字 }}</div>
    </Teleport>

    <!-- 紧凑模式拖拽提醒 -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="拖拽提醒可见" class="拖拽提醒">紧凑模式下已禁止拖拽，按 Tab / ESC 返回编辑模式</div>
      </Transition>
    </Teleport>

    <!-- 卡片右键菜单 -->
    <Teleport to="body">
      <div v-if="右键菜单.可见" class="右键菜单覆盖层" @click="关闭右键菜单" @contextmenu.prevent="关闭右键菜单"></div>
      <div v-if="右键菜单.可见" class="右键菜单" :style="{ left: 右键菜单.x + 'px', top: 右键菜单.y + 'px' }" @click.stop>
        <div class="右键菜单项" @click="打开编辑弹窗">
          <i class="fas fa-pen"></i>
          <span>编辑</span>
        </div>
        <div class="右键菜单项" @click="处理复制">
          <i class="fas fa-copy"></i>
          <span>复制</span>
        </div>
        <div class="右键菜单项 危险" @click="处理删除">
          <i class="fas fa-trash"></i>
          <span>删除</span>
        </div>
      </div>
    </Teleport>

    <!-- 编辑卡片弹窗 -->
    <CardFormDialog v-if="编辑弹窗可见 && 当前编辑卡片" :可见="编辑弹窗可见" 模式="edit" :卡片类型="当前编辑卡片.类型" :编辑卡片="当前编辑卡片" @关闭="关闭编辑弹窗" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watchEffect, onMounted, onUnmounted, nextTick, watch } from 'vue'
import Sortable from 'sortablejs'
import CardFormDialog from '@/页面/启动/组件/卡片/卡片表单弹窗.vue'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import type { 卡片节点 } from '@/页面/启动/类型/菜单类型'

const 菜单仓库 = 使用菜单仓库()
const 卡片仓库 = 使用卡片仓库()
const 主题仓库 = 使用主题仓库()

const 卡片提示 = ref({ 可见: false, x: 0, y: 0, 文字: '' })
let 提示定时器: ReturnType<typeof setTimeout> | null = null

function 显示提示(event: MouseEvent, 标题: string) {
  if (提示定时器) clearTimeout(提示定时器)
  提示定时器 = setTimeout(() => {
    const 目标 = (event.target as HTMLElement).closest('.卡片') as HTMLElement | null
    if (!目标) return
    const rect = 目标.getBoundingClientRect()
    let x = rect.left + rect.width / 2
    let y = rect.top
    const 提示宽 = 标题.length * 16 + 24
    const 提示高 = 44
    if (x - 提示宽 / 2 < 4) x = 提示宽 / 2 + 4
    if (x + 提示宽 / 2 > window.innerWidth - 4) x = window.innerWidth - 提示宽 / 2 - 4
    if (y - 提示高 < 4) y = rect.bottom + 8
    else y = y - 提示高 - 4
    卡片提示.value = { 可见: true, x, y, 文字: 标题 }
  }, 400)
}

function 隐藏提示() {
  if (提示定时器) {
    clearTimeout(提示定时器)
    提示定时器 = null
  }
  卡片提示.value.可见 = false
}

// ===== 紧凑模式拖拽意图提醒 =====
const 拖拽提醒可见 = ref(false)
let 拖拽提醒定时器: ReturnType<typeof setTimeout> | null = null
let 按下起点: { x: number; y: number } | null = null
let 拖拽提醒已显示 = false

function 处理卡片按下(event: MouseEvent) {
  if (!菜单仓库.是否紧凑) return
  if (event.button !== 0) return
  if (!(event.target as HTMLElement).closest('.卡片')) return
  按下起点 = { x: event.clientX, y: event.clientY }
  拖拽提醒已显示 = false
}

function 处理文档移动(event: MouseEvent) {
  if (!按下起点 || 拖拽提醒已显示) return
  const 位移 = Math.hypot(event.clientX - 按下起点.x, event.clientY - 按下起点.y)
  if (位移 > 6) {
    拖拽提醒已显示 = true
    显示拖拽提醒()
  }
}

function 处理文档松开() {
  按下起点 = null
  拖拽提醒已显示 = false
}

function 显示拖拽提醒() {
  if (拖拽提醒定时器) clearTimeout(拖拽提醒定时器)
  拖拽提醒可见.value = true
  拖拽提醒定时器 = setTimeout(() => {
    拖拽提醒可见.value = false
    拖拽提醒定时器 = null
  }, 5000)
}

/** 已加载的卡片图片 dataURL（key 为卡片唯一ID） */
const 已加载图片 = reactive<Record<number, string>>({})

/** 已加载图片对应的路径，用于检测路径变化后失效缓存 */
const 已加载图片路径 = reactive<Record<number, string>>({})

/** 记录已尝试加载的卡片ID，避免重复请求 */
const 已尝试加载 = ref<Set<number>>(new Set())

/** 已加载的全局图标引用图片 dataURL（key 为卡片唯一ID） */
const 已加载全局图标 = reactive<Record<number, string>>({})

/** 已加载全局图标对应的图标代码，用于检测变化后失效缓存 */
const 已加载全局图标路径 = reactive<Record<number, string>>({})

/**
 * 异步加载单张卡片的图片
 * 加载成功后直接通过 DOM 操作设置 img 的 src，确保图片立即显示
 * 重试机制覆盖添加卡片时确认图片缓存的异步延迟
 */
async function 加载图片带重试(卡片: 卡片节点, 重试次数 = 0) {
  if (!window.electronAPI) return

  // 图片路径变化时失效旧缓存，强制重新加载（覆盖编辑重选图标场景）
  if (已加载图片路径[卡片.唯一ID] !== 卡片.图片路径) {
    delete 已加载图片[卡片.唯一ID]
    if (已尝试加载.value.has(卡片.唯一ID)) {
      已尝试加载.value = new Set([...已尝试加载.value].filter((id) => id !== 卡片.唯一ID))
    }
  }
  if (已加载图片[卡片.唯一ID]) return

  // 字段未就绪时延迟重试（最多10次，间隔逐次增加）
  if (!卡片.图片路径 || 卡片.归属菜单ID === undefined || 卡片.归属菜单ID === null) {
    if (重试次数 < 10) {
      setTimeout(() => 加载图片带重试(卡片, 重试次数 + 1), 300 * (重试次数 + 1))
    }
    return
  }

  // 避免重复请求同一张图片
  if (已尝试加载.value.has(卡片.唯一ID)) return
  已尝试加载.value = new Set([...已尝试加载.value, 卡片.唯一ID])

  try {
    const 结果 = await window.electronAPI.启动读取卡片图片(卡片.归属菜单ID, 卡片.图片路径)
    if (结果.成功 && 结果.base64) {
      // 设置 reactive 对象（供后续渲染使用）
      已加载图片[卡片.唯一ID] = 结果.base64
      已加载图片路径[卡片.唯一ID] = 卡片.图片路径
      // 直接通过 DOM 操作设置 img 的 src，确保图片立即显示
      const img = document.querySelector(`img[data-card-id="${卡片.唯一ID}"]`) as HTMLImageElement | null
      if (img) {
        // 恢复 img 显示（可能被 @error 降级逻辑隐藏了）
        img.style.display = ''
        // 移除之前 @error 添加的降级图标
        const parent = img.parentElement
        if (parent) {
          const fallback = parent.querySelector('.卡片图标')
          if (fallback) fallback.remove()
        }
        img.src = 结果.base64
      }
    }
  } catch {
    // 加载失败保持降级逻辑
  }
}

/**
 * 获取卡片图片的 dataURL（同步，从已加载缓存中直接返回）
 */
function 获取卡片图片URL(卡片: 卡片节点): string {
  return 已加载图片[卡片.唯一ID] || ''
}

/**
 * 异步加载全局图标引用图片
 */
async function 加载全局图标图片(卡片: 卡片节点) {
  if (!卡片.图标代码?.startsWith('icons:')) return

  // 图标代码变化时失效旧缓存，强制重新加载
  if (已加载全局图标路径[卡片.唯一ID] !== 卡片.图标代码) {
    delete 已加载全局图标[卡片.唯一ID]
  }
  if (已加载全局图标[卡片.唯一ID]) return

  const 相对路径 = 卡片.图标代码.replace('icons:', '')
  try {
    const 结果 = await window.electronAPI?.图标库读取图片(相对路径)
    if (结果?.成功 && 结果.base64) {
      已加载全局图标[卡片.唯一ID] = 结果.base64
      已加载全局图标路径[卡片.唯一ID] = 卡片.图标代码
      // 通过 DOM 操作设置 img 的 src
      const img = document.querySelector(`img[data-card-id="${卡片.唯一ID}"]`) as HTMLImageElement | null
      if (img) {
        img.style.display = ''
        const parent = img.parentElement
        if (parent) {
          const fallback = parent.querySelector('.卡片图标')
          if (fallback) fallback.remove()
        }
        img.src = 结果.base64
      }
    }
  } catch {
    // 加载失败保持降级
  }
}

/**
 * 获取全局图标图片的 dataURL（同步，从已加载缓存中直接返回）
 */
function 获取全局图标URL(卡片: 卡片节点): string {
  return 已加载全局图标[卡片.唯一ID] || ''
}

/**
 * 图片加载失败时的降级处理
 */
function 卡片加载失败(event: Event, 卡片: 卡片节点) {
  const el = event.target as HTMLImageElement
  el.style.display = 'none'
  // 显示降级图标
  const parent = el.parentElement
  if (parent) {
    const fallbackIcon = document.createElement('i')
    fallbackIcon.className = `${获取图标(卡片.类型)} 卡片图标`
    parent.appendChild(fallbackIcon)
  }
}

// ===== 右键菜单状态 =====
const 右键菜单 = ref({
  可见: false,
  x: 0,
  y: 0,
  卡片: null as 卡片节点 | null,
})

// ===== 编辑弹窗状态 =====
const 编辑弹窗可见 = ref(false)
const 当前编辑卡片 = ref<卡片节点 | null>(null)

function 打开编辑弹窗() {
  当前编辑卡片.value = 右键菜单.value.卡片
  编辑弹窗可见.value = true
  关闭右键菜单()
}

function 关闭编辑弹窗() {
  编辑弹窗可见.value = false
  当前编辑卡片.value = null
}

// 根据二级菜单ID获取该菜单的卡片列表
function 获取菜单卡片(菜单ID: number) {
  const 列表 = 卡片仓库.卡片列表.filter((c) => c.归属菜单ID === 菜单ID)
  if (!菜单仓库.搜索词.trim()) return 列表
  const 词 = 菜单仓库.搜索词.trim().toLowerCase()
  return 列表.filter((c) => c.标题.toLowerCase().includes(词))
}

/**
 * 修正卡片图标类型：如果卡片有图片路径但图标类型不是 image，自动修正
 * 解决后端存储数据中图标类型字段错误导致图片不显示的问题
 */
function 修正卡片图标类型(卡片: 卡片节点) {
  if (卡片.图片路径 && 卡片.图标类型 !== 'image') {
    卡片.图标类型 = 'image'
  }
}

/**
 * 使用 watchEffect 自动追踪当前卡片列表的响应式依赖
 * 每次依赖变化都会重新执行，配合延迟重试机制加载图片
 */
watchEffect(() => {
  卡片仓库.卡片列表.forEach((卡片) => {
    修正卡片图标类型(卡片)
    加载图片带重试(卡片)
    加载全局图标图片(卡片)
  })
})

// ===== 右键菜单处理 =====
function 打开右键菜单(event: MouseEvent, 卡片: 卡片节点) {
  右键菜单.value = { 可见: true, x: event.clientX, y: event.clientY, 卡片 }
}

function 关闭右键菜单() {
  右键菜单.value.可见 = false
}

function 处理删除() {
  if (右键菜单.value.卡片) {
    卡片仓库.删除卡片(右键菜单.value.卡片.唯一ID)
  }
  关闭右键菜单()
}

function 处理复制() {
  if (右键菜单.value.卡片) {
    卡片仓库.复制卡片(右键菜单.value.卡片.唯一ID)
  }
  关闭右键菜单()
}

/** 根据类型获取 Font Awesome 图标 */
function 获取图标(类型: string): string {
  const 图标映射: Record<string, string> = {
    url: 'fas fa-link',
    folder: 'fas fa-folder',
    app: 'fas fa-file',
  }
  return 图标映射[类型] || 'fas fa-file'
}

/** 双击卡片打开 */
const 是Electron打开 = typeof window !== 'undefined' && window.electronAPI?.启动打开卡片

async function 处理双击(卡片: 卡片节点) {
  if (!是Electron打开) return
  try {
    await window.electronAPI.启动打开卡片(卡片.类型, 卡片.值)
  } catch (e) {
    console.error('打开卡片失败', e)
  }
}

// 点击其他地方关闭右键菜单
function 全局点击处理() {
  关闭右键菜单()
}

// ===== SortableJS 拖拽 =====
const 排序实例列表: Sortable[] = []
const _正在拖拽卡片原始 = ref(false)
const 正在拖拽卡片 = computed({
  get: () => _正在拖拽卡片原始.value,
  set: (v: boolean) => {
    _正在拖拽卡片原始.value = v
  },
})
const _拖拽源菜单ID原始 = ref<number | null>(null)
const 拖拽源菜单ID = computed({
  get: () => _拖拽源菜单ID原始.value,
  set: (v: number | null) => {
    _拖拽源菜单ID原始.value = v
  },
})

const 可见菜单ID集合 = computed(() => {
  const 选中ID = 菜单仓库.最后选中二级菜单ID
  const 拖拽中 = 正在拖拽卡片.value
  const 源菜单 = 拖拽源菜单ID.value
  if (拖拽中 && 源菜单 !== null) {
    return new Set(选中ID === null ? [] : [选中ID])
  }
  if (菜单仓库.搜索词.trim()) {
    const 词 = 菜单仓库.搜索词.trim().toLowerCase()
    const 匹配集合 = new Set<number>()
    for (const 卡片 of 卡片仓库.卡片列表) {
      if (卡片.标题.toLowerCase().includes(词)) {
        匹配集合.add(卡片.归属菜单ID)
      }
    }
    for (const 一级 of 菜单仓库.菜单列表) {
      for (const 二级 of 一级.子菜单) {
        if (二级.菜单名称.toLowerCase().includes(词)) {
          匹配集合.add(二级.唯一ID)
        }
      }
    }
    return 匹配集合
  }
  return new Set([选中ID])
})

let 菜单切换定时器: ReturnType<typeof setTimeout> | null = null
let 折叠悬停定时器: ReturnType<typeof setTimeout> | null = null
let 上次悬停一级菜单ID: number | null = null
let 拖拽原始父元素: HTMLElement | null = null
let 拖拽原始下一个兄弟: HTMLElement | null = null

function 恢复DOM位置(evt: Sortable.SortableEvent) {
  if (拖拽原始父元素 && evt.item.parentNode !== 拖拽原始父元素) {
    拖拽原始父元素.insertBefore(evt.item, 拖拽原始下一个兄弟)
  } else if (拖拽原始父元素 && evt.newIndex !== evt.oldIndex) {
    const 子元素 = Array.from(拖拽原始父元素.children)
    const 当前位置 = 子元素.indexOf(evt.item)
    if (当前位置 !== evt.oldIndex) {
      拖拽原始父元素.removeChild(evt.item)
      const 插入参考 = 子元素[evt.oldIndex!] || null
      拖拽原始父元素.insertBefore(evt.item, 插入参考)
    }
  }
  拖拽原始父元素 = null
  拖拽原始下一个兄弟 = null
}

function 检测松手目标菜单(evt: Sortable.SortableEvent): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const 鼠标事件 = (evt as any).originalEvent as MouseEvent | undefined
  if (!鼠标事件) return null

  const 下方元素 = document.elementsFromPoint(鼠标事件.clientX, 鼠标事件.clientY)

  // 检测二级菜单项 → 移入该菜单末尾
  const 二级菜单项 = 下方元素.find((el) => (el as HTMLElement).classList?.contains('二级菜单项') || (el as HTMLElement).closest?.('.二级菜单项'))
  if (二级菜单项) {
    const 目标元素 = ((二级菜单项 as HTMLElement).closest('.二级菜单项') || 二级菜单项) as HTMLElement
    const 目标ID = Number(目标元素.dataset.id)
    if (目标ID) return 目标ID
  }

  // 命中可见卡片网格：SortableJS 已处理放置，无需额外干预
  const 在卡片网格上 = 下方元素.some((el) => (el as HTMLElement).closest?.('.卡片网格'))
  if (在卡片网格上) return null

  // 其他位置（含内容区空白）：拖拽中源网格可能已隐藏，一律视为取消拖拽回原位（数据不动）。
  // 不能沿用「空白处移入当前选中菜单末尾」，否则在源网格隐藏时松手会被误移入目标菜单。
  return null
}

function 处理拖拽中鼠标移动(event: MouseEvent) {
  if (!正在拖拽卡片.value) return
  const 下方元素 = document.elementsFromPoint(event.clientX, event.clientY)

  // 检测二级菜单项 → 300ms 防抖切换
  const 二级菜单项 = 下方元素.find((el) => (el as HTMLElement).classList?.contains('二级菜单项') || (el as HTMLElement).closest?.('.二级菜单项'))
  if (二级菜单项) {
    const 目标元素 = ((二级菜单项 as HTMLElement).closest('.二级菜单项') || 二级菜单项) as HTMLElement
    const 目标ID = Number(目标元素.dataset.id)
    if (菜单切换定时器) clearTimeout(菜单切换定时器)
    菜单切换定时器 = setTimeout(() => {
      if (目标ID !== 菜单仓库.最后选中二级菜单ID) {
        菜单仓库.设置选中(目标ID)
      }
      菜单切换定时器 = null
    }, 300)
  } else {
    if (菜单切换定时器) clearTimeout(菜单切换定时器)
    // 注意：不在此处切回源菜单。鼠标离开菜单项后就切回源会导致目标切换刚生效即被撤销，且经网格路径时反复切换响应变慢。
    // 拖回原位由 onEnd 的松手兜底处理（空白处松手 = 取消，数据不动）。
  }

  // 检测折叠一级菜单 → 800ms 后展开
  const 一级菜单项 = 下方元素.find((el) => (el as HTMLElement).closest?.('li.一级菜单项')) as HTMLElement | null
  const 一级元素 = 一级菜单项 ? (一级菜单项.closest('li.一级菜单项') as HTMLElement) : null
  if (一级元素) {
    const 悬停父级ID = Number(一级元素.dataset.id)
    if (悬停父级ID !== 上次悬停一级菜单ID) {
      if (折叠悬停定时器) clearTimeout(折叠悬停定时器)
      上次悬停一级菜单ID = 悬停父级ID
      if (菜单仓库.折叠状态.get(悬停父级ID)) {
        折叠悬停定时器 = setTimeout(() => {
          菜单仓库.折叠状态.set(悬停父级ID, false)
          折叠悬停定时器 = null
        }, 800)
      }
    }
  } else {
    if (折叠悬停定时器) clearTimeout(折叠悬停定时器)
    上次悬停一级菜单ID = null
  }
}

function 清除拖拽监听() {
  document.removeEventListener('mousemove', 处理拖拽中鼠标移动)
  if (菜单切换定时器) clearTimeout(菜单切换定时器)
  if (折叠悬停定时器) clearTimeout(折叠悬停定时器)
  菜单切换定时器 = null
  折叠悬停定时器 = null
  上次悬停一级菜单ID = null
}

/** forceFallback 跟随副本 append 到 body，v-bind 的 Emoji/文字图标尺寸变量无法继承，手动从原项复制 fontSize */
function 同步卡片跟随项样式(原项: HTMLElement) {
  const 跟随项 = document.querySelector('.卡片拖拽跟随') as HTMLElement | null
  if (!跟随项) return
  const 原emoji = 原项.querySelector('.卡片文字') as HTMLElement | null
  const 跟随emoji = 跟随项.querySelector('.卡片文字') as HTMLElement | null
  if (原emoji && 跟随emoji) {
    跟随emoji.style.fontSize = getComputedStyle(原emoji).fontSize
  }
  const 原文字 = 原项.querySelector('.卡片文字内容') as HTMLElement | null
  const 跟随文字 = 跟随项.querySelector('.卡片文字内容') as HTMLElement | null
  if (原文字 && 跟随文字) {
    跟随文字.style.fontSize = getComputedStyle(原文字).fontSize
  }
}

function 初始化拖拽() {
  if (正在拖拽卡片.value) return
  const 所有网格 = document.querySelectorAll<HTMLElement>('.卡片网格')
  所有网格.forEach((网格元素) => {
    const 实例 = new Sortable(网格元素, {
      group: { name: 'cards', pull: true },
      animation: 150,
      sort: true,
      draggable: '.卡片',
      ghostClass: '拖拽占位',
      forceFallback: true,
      fallbackOnBody: true,
      fallbackClass: '卡片拖拽跟随',
      fallbackTolerance: 3,
      scroll: true,
      scrollSensitivity: 60,
      scrollSpeed: 10,
      disabled: 菜单仓库.是否紧凑,
      onStart(evt) {
        正在拖拽卡片.value = true
        拖拽源菜单ID.value = Number((网格元素 as HTMLElement).dataset.menuId)
        拖拽原始父元素 = evt.from as HTMLElement
        拖拽原始下一个兄弟 = evt.item.nextElementSibling as HTMLElement | null
        同步卡片跟随项样式(evt.item as HTMLElement)
        document.addEventListener('mousemove', 处理拖拽中鼠标移动)
      },
      onEnd(evt) {
        清除拖拽监听()

        const 旧索引 = evt.oldIndex
        const 新索引 = evt.newIndex
        if (旧索引 === undefined || 新索引 === undefined) {
          恢复DOM位置(evt)
          正在拖拽卡片.value = false
          拖拽源菜单ID.value = null
          return
        }

        const 卡片ID = Number((evt.item as HTMLElement).dataset.id)
        const 源菜单ID = Number((evt.from as HTMLElement).dataset.menuId)

        // SortableJS 正常放置（同容器排序或跨容器移动）
        if (旧索引 !== 新索引 || evt.from !== evt.to) {
          const 目标菜单ID = Number((evt.to as HTMLElement).dataset.menuId)
          恢复DOM位置(evt)

          if (源菜单ID === 目标菜单ID) {
            卡片仓库.重新排序(源菜单ID, 旧索引, 新索引)
          } else {
            卡片仓库.移动卡片(卡片ID, 目标菜单ID, 新索引)
          }

          正在拖拽卡片.value = false
          拖拽源菜单ID.value = null
          return
        }

        // SortableJS 未检测到有效放置，根据鼠标位置手动判断
        恢复DOM位置(evt)

        const 目标菜单ID = 检测松手目标菜单(evt)
        if (目标菜单ID !== null && 目标菜单ID !== 源菜单ID) {
          卡片仓库.移动卡片(卡片ID, 目标菜单ID, -1)
        }

        正在拖拽卡片.value = false
        拖拽源菜单ID.value = null
      },
    })
    排序实例列表.push(实例)
  })
}

function 销毁拖拽(强制 = false) {
  if (!强制 && 正在拖拽卡片.value) return false
  排序实例列表.forEach((实例) => 实例.destroy())
  排序实例列表.length = 0
  清除拖拽监听()
  return true
}

watch(
  () => 菜单仓库.是否紧凑,
  (紧凑) => {
    排序实例列表.forEach((实例) => 实例.option('disabled', 紧凑))
  },
)

watch(
  () => 菜单仓库.获取所有二级菜单列表(),
  () => {
    if (正在拖拽卡片.value) return
    nextTick(() => {
      if (正在拖拽卡片.value) return
      const 已销毁 = 销毁拖拽()
      if (已销毁) {
        初始化拖拽()
      }
    })
  },
  { deep: true },
)

onMounted(() => {
  document.addEventListener('click', 全局点击处理)
  document.addEventListener('mousemove', 处理文档移动)
  document.addEventListener('mouseup', 处理文档松开)
  nextTick(() => {
    初始化拖拽()
  })
})
onUnmounted(() => {
  document.removeEventListener('click', 全局点击处理)
  document.removeEventListener('mousemove', 处理文档移动)
  document.removeEventListener('mouseup', 处理文档松开)
  销毁拖拽()
})
</script>

<style scoped>
.卡片容器 {
  width: 100%;
  margin: 0 auto;
  padding: var(--间距-小, 16px);
  margin-top: auto;
}

.卡片网格 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--卡片-当前尺寸, 80px), 1fr));
  gap: var(--卡片-间距-水平, 20px);
  row-gap: var(--卡片-间距-垂直, 20px);
  justify-items: center;
  justify-content: center;
  min-height: 100px;
  /* 每次 v-show 显示时播放淡入+上移动画，保留切换菜单观感而不重建 DOM */
  animation: 卡片网格显示 0.25s ease;
}

@keyframes 卡片网格显示 {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.卡片 {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: var(--卡片-当前尺寸, 80px);
  transition: all 0.3s ease;
  cursor: context-menu;
}

.色块 {
  width: 100%;
  height: var(--卡片-当前尺寸, 80px);
  border-radius: var(--卡片-圆角, 4px);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.卡片图标 {
  font-size: v-bind('主题仓库.卡片图标尺寸 + "px"');
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  line-height: 1;
}

.卡片文字 {
  font-size: v-bind('主题仓库.Emoji图标尺寸 + "px"');
  line-height: 1;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  /* Emoji 图标 上下居中微调 */
  transform: translateY(-0.05em);
}
.卡片文字内容 {
  font-size: v-bind('主题仓库.文字图标尺寸 + "px"');
  line-height: 1;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 1em;
}

.卡片图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: inherit;
}

.标题 {
  width: 100%;
  text-align: center;
  font-size: v-bind('主题仓库.标题尺寸 + "px"');
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  line-height: 1.4;
  padding: 0 2px;
  transition: font-size 0.3s ease;
}
</style>

<!-- 右键菜单样式（非 scoped） -->
<style>
.卡片提示 {
  position: fixed;
  z-index: 9997;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  padding: 6px 12px;
  color: var(--全站通用文字颜色);
  font-size: 26px;
  pointer-events: none;
  transform: translateX(-50%);
  margin-top: 8px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.拖拽提醒 {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 8px;
  padding: 10px 18px;
  color: var(--全站通用文字颜色);
  font-size: 18px;
  white-space: nowrap;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  pointer-events: none;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
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

.重命名输入行 {
  padding: 6px 12px;
}
.重命名输入框 {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色);
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}
.重命名输入框:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.颜色选择行 {
  padding: 8px 12px;
}
.颜色网格 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 160px;
}
.色块选项 {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
}
.色块选项:hover {
  transform: scale(1.2);
}
.色块选项.选中 {
  border-color: #fff;
}

.卡片.拖拽占位 {
  opacity: 0;
  transition: none;
}

.卡片拖拽跟随 {
  opacity: 1 !important;
  z-index: 9999;
  transition: none !important;
}

.卡片拖拽跟随 .标题 {
  display: none;
}

.卡片拖拽跟随 .卡片图标 {
  font-size: var(--卡片-图标尺寸, 30px) !important;
}
</style>
