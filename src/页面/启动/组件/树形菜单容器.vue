<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import Sortable from 'sortablejs'

/** 接收主布局传递的紧凑模式状态 */
const props = defineProps<{
  紧凑模式?: boolean
}>()

import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用卡片仓库 } from '@/页面/启动/仓库/卡片仓库'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'
import IconPickerPanel from '@/页面/启动/组件/图标选择面板.vue'

const 菜单仓库 = 使用菜单仓库()
const 卡片仓库 = 使用卡片仓库()
const 图标选择历史 = 使用图标选择历史仓库()
const 图标库仓库 = 使用图标库仓库()
const 树形菜单容器 = ref<HTMLElement | null>(null)
const 树形菜单元素 = ref<HTMLElement | null>(null)

// 图标选择面板组件
const 图标面板Ref = ref<{
  打开面板: (回调: (图标值: string) => void, 触发元素: HTMLElement) => void
  关闭面板: () => void
  面板可见: { value: boolean }
} | null>(null)

/** 判断图标值是否为 emoji（不是 fa- 开头也不是 icons: 开头） */
function 是Emoji图标(值: string): boolean {
  return !!值 && !值.startsWith('fa-') && !值.startsWith('icons:')
}

/** 判断图标值是否为全局图片（icons: 开头） */
function 是全局图片图标(值: string): boolean {
  return !!值 && 值.startsWith('icons:')
}

/** 判断图标值是否为 FontAwesome 类名 */
function 是FA图标(值: string): boolean {
  return !!值 && (值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab '))
}

/** 点击菜单图标打开图标面板 */
function 点击菜单图标(event: MouseEvent, 类型: '一级' | '二级', id: number) {
  event.stopPropagation()
  const 元素 = event.currentTarget as HTMLElement
  图标面板Ref.value?.打开面板((图标值) => {
    if (类型 === '一级') {
      菜单仓库.更新一级菜单图标(id, 图标值)
    } else {
      菜单仓库.更新二级菜单图标(id, 图标值)
    }
    if (是全局图片图标(图标值)) {
      图标库仓库.加载数据().then(() => {
        图标库仓库.获取图片Base64(图标值)
      })
    }
    const 类别 = 获取图标类别(图标值)
    图标选择历史.添加(类别, 图标值)
    图标面板Ref.value?.关闭面板()
  }, 元素)
}

/** 判断图标类别 */
function 获取图标类别(图标值: string): 'fa' | 'emoji' | 'global' {
  if (是全局图片图标(图标值)) return 'global'
  if (是FA图标(图标值)) return 'fa'
  return 'emoji'
}

// ===== 右键菜单状态 =====
const 右键菜单 = ref({ 可见: false, x: 0, y: 0, 目标ID: null as number | null, 类型: '' as '一级' | '二级' })
const 重命名输入 = ref({ 可见: false, 值: '' })
const 重命名输入框 = ref<HTMLInputElement | null>(null)
const 输入法刚结束 = ref(false)

function 处理输入法开始() {
  输入法刚结束.value = false
}

function 处理输入法结束() {
  输入法刚结束.value = true
  setTimeout(() => {
    输入法刚结束.value = false
  }, 200)
}

/** 重命名输入框 ESC：中文输入法组合中只关闭候选框，不退出编辑 */
function 重命名ESC(e: KeyboardEvent) {
  if (e.key === 'Escape' && !e.isComposing && !输入法刚结束.value) {
    关闭右键菜单()
  }
}

// ===== 确认弹窗状态 =====
const 确认弹窗 = ref({ 可见: false, 消息: '', 类型: '' as '一级' | '二级', 目标ID: null as number | null, 父级ID: null as number | null })

function 处理二级菜单点击(子菜单id: number) {
  菜单仓库.设置选中(子菜单id)
}

/** 点击一级菜单名称：选中该一级菜单（供 F2 重命名等操作）+ 切换折叠/展开 */
function 处理一级菜单点击(菜单id: number) {
  // 拖拽排序刚结束后浏览器会补发滞后 click，300ms 内忽略，避免拖拽完误折叠
  if (Date.now() - 一级菜单拖拽结束时间 < 300) return
  菜单仓库.设置选中(菜单id)
  const 菜单 = 菜单仓库.菜单列表.find((m) => m.唯一ID === 菜单id)
  if (菜单 && 菜单.子菜单.length > 0) {
    菜单仓库.折叠状态.set(菜单id, !菜单仓库.折叠状态.get(菜单id))
  }
}

function 处理箭头点击(event: MouseEvent, 菜单id: number) {
  event.stopPropagation()
  菜单仓库.折叠状态.set(菜单id, !菜单仓库.折叠状态.get(菜单id))
}

/** 新建二级菜单（自动展开父菜单） */
function 处理新建二级菜单(父级id: number) {
  菜单仓库.新增二级菜单(父级id)
}

/** 定位到当前选中的菜单项 */
function 定位到选中节点() {
  const 选中ID = 菜单仓库.最后选中二级菜单ID
  if (选中ID === null) return

  // 展开其父级一级菜单
  const 父级ID = 菜单仓库.获取父级一级菜单ID(选中ID)
  if (父级ID !== null) {
    菜单仓库.折叠状态.set(父级ID, false)
  }

  nextTick(() => {
    const 目标元素 = document.querySelector(`[data-id="${选中ID}"]`)
    if (目标元素) {
      ;(目标元素 as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

/** 折叠全部菜单 */
function 折叠全部菜单() {
  菜单仓库.折叠全部()
}

/** 新建一级菜单 */
function 新建一级菜单() {
  菜单仓库.新增一级菜单()
}

// ===== 右键菜单处理 =====
function 处理右键(event: MouseEvent, 节点id: number, 类型: '一级' | '二级') {
  event.preventDefault()
  event.stopPropagation()
  右键菜单.value = { 可见: true, x: event.clientX, y: event.clientY, 目标ID: 节点id, 类型 }
  重命名输入.value.可见 = false
}

function 关闭右键菜单() {
  右键菜单.value.可见 = false
  重命名输入.value.可见 = false
}

function 处理删除() {
  if (右键菜单.value.目标ID === null) return
  // 先关闭右键菜单
  关闭右键菜单()

  // 显示自定义确认弹窗
  if (右键菜单.value.类型 === '一级') {
    const 目标ID = 右键菜单.value.目标ID
    const 一级菜单 = 菜单仓库.菜单列表.find((m) => m.唯一ID === 目标ID)
    if (!一级菜单) return
    const 所有二级菜单ID = 一级菜单.子菜单.map((s) => s.唯一ID)
    const 卡片数 = 卡片仓库.卡片列表.filter((c) => 所有二级菜单ID.includes(c.归属菜单ID)).length
    确认弹窗.value = {
      可见: true,
      消息: `确定要删除一级菜单「${一级菜单.菜单名称}」吗？\n其下 ${一级菜单.子菜单.length} 个二级菜单和 ${卡片数} 张卡片也将被删除。`,
      类型: '一级',
      目标ID,
      父级ID: null,
    }
  } else {
    const 目标ID = 右键菜单.value.目标ID
    let 菜单名称 = ''
    let 父级ID: number | null = null
    for (const 一级 of 菜单仓库.菜单列表) {
      const 子 = 一级.子菜单.find((s) => s.唯一ID === 目标ID)
      if (子) {
        菜单名称 = 子.菜单名称
        父级ID = 一级.唯一ID
        break
      }
    }
    if (父级ID === null) return
    const 卡片数 = 卡片仓库.卡片列表.filter((c) => c.归属菜单ID === 目标ID).length
    确认弹窗.value = {
      可见: true,
      消息: `确定要删除菜单「${菜单名称}」吗？其下的所有卡片（共${卡片数}张）也将被删除。`,
      类型: '二级',
      目标ID,
      父级ID,
    }
  }
}

/** 取消删除 */
function 取消删除() {
  确认弹窗.value.可见 = false
}

/** 确认删除：执行实际的级联删除逻辑 */
function 执行确认删除() {
  const { 类型, 目标ID, 父级ID } = 确认弹窗.value
  if (目标ID === null) return
  确认弹窗.value.可见 = false

  if (类型 === '一级') {
    执行删除一级菜单(目标ID)
  } else if (父级ID !== null) {
    执行删除二级菜单(父级ID, 目标ID)
  }
}

/** 执行一级菜单级联删除 */
function 执行删除一级菜单(一级菜单ID: number) {
  const 一级菜单 = 菜单仓库.菜单列表.find((m) => m.唯一ID === 一级菜单ID)
  if (!一级菜单) return
  const 所有二级菜单ID = 一级菜单.子菜单.map((s) => s.唯一ID)

  for (const 二级菜单 of 一级菜单.子菜单) {
    卡片仓库.删除归属于菜单的卡片(二级菜单.唯一ID)
  }

  if (菜单仓库.最后选中二级菜单ID && 所有二级菜单ID.includes(菜单仓库.最后选中二级菜单ID)) {
    菜单仓库.设置选中(null)
  }

  菜单仓库.删除一级菜单(一级菜单ID)
}

/** 执行二级菜单级联删除 */
function 执行删除二级菜单(父级ID: number, 二级菜单ID: number) {
  卡片仓库.删除归属于菜单的卡片(二级菜单ID)
  菜单仓库.删除二级菜单(父级ID, 二级菜单ID)

  if (菜单仓库.最后选中二级菜单ID === 二级菜单ID) {
    const 父级 = 菜单仓库.菜单列表.find((m) => m.唯一ID === 父级ID)
    if (父级 && 父级.子菜单.length > 0 && 父级.子菜单[0]) {
      菜单仓库.设置选中(父级.子菜单[0].唯一ID)
    } else {
      菜单仓库.设置选中(null)
    }
  }
}

function 开始重命名() {
  重命名输入.value.可见 = true
  // 获取当前名称
  if (右键菜单.value.目标ID === null) return
  if (右键菜单.value.类型 === '一级') {
    const 菜单 = 菜单仓库.菜单列表.find((m) => m.唯一ID === 右键菜单.value.目标ID)
    重命名输入.value.值 = 菜单?.菜单名称 || ''
  } else {
    for (const 菜单 of 菜单仓库.菜单列表) {
      const 子菜单 = 菜单.子菜单.find((s) => s.唯一ID === 右键菜单.value.目标ID)
      if (子菜单) {
        重命名输入.value.值 = 子菜单.菜单名称
        break
      }
    }
  }
  nextTick(() => 重命名输入框.value?.focus())
}

function 确认重命名() {
  const 新名称 = 重命名输入.value.值.trim()
  if (!新名称 || 右键菜单.value.目标ID === null) {
    关闭右键菜单()
    return
  }
  if (右键菜单.value.类型 === '一级') {
    菜单仓库.重命名一级菜单(右键菜单.value.目标ID, 新名称)
  } else {
    菜单仓库.重命名二级菜单(右键菜单.value.目标ID, 新名称)
  }
  关闭右键菜单()
}

// 点击其他地方关闭右键菜单
function 全局点击处理() {
  // 重命名模式下不关闭右键菜单（避免滑选文本时意外关闭）
  if (重命名输入.value.可见) return
  关闭右键菜单()
}

/** 从图标库仓库图片缓存获取 base64，缓存未命中时主动触发异步加载 */
function 获取菜单图片Base64(图标值: string): string {
  if (是全局图片图标(图标值) && 图标值 && !图标库仓库.图片缓存.has(图标值)) {
    预加载菜单图片(图标值)
  }
  return 图标库仓库.图片缓存.get(图标值) || ''
}

/** 触发单个菜单图标的懒加载（并发由图标库仓库的保证图片加载节流控制） */
function 预加载菜单图片(图标值: string) {
  图标库仓库.保证图片加载(图标值)
}

/** ESC 按键处理：关闭所有弹窗/面板/菜单 */
function 处理ESC按键(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (图标面板Ref.value?.面板可见.value) {
      图标面板Ref.value.关闭面板()
    }
    if (右键菜单.value.可见) {
      关闭右键菜单()
    }
    if (确认弹窗.value.可见) {
      取消删除()
    }
  }
}

/** F2 快捷键：重命名当前选中的菜单（一级或二级） */
function 快捷键重命名() {
  if (props.紧凑模式) return
  const 选中ID = 菜单仓库.当前选中ID
  if (选中ID === null) return

  // 判断是一级还是二级菜单
  let 类型: '一级' | '二级'
  if (菜单仓库.是否是二级菜单ID(选中ID)) {
    类型 = '二级'
  } else if (菜单仓库.菜单列表.some((m) => m.唯一ID === 选中ID)) {
    类型 = '一级'
  } else {
    return
  }

  const 元素 = document.querySelector(`[data-id="${选中ID}"]`) as HTMLElement | null
  if (!元素) return
  const rect = 元素.getBoundingClientRect()

  右键菜单.value = {
    可见: true,
    x: rect.left,
    y: rect.top,
    目标ID: 选中ID,
    类型,
  }
  开始重命名()
}

function 处理F2按键(e: KeyboardEvent) {
  if (e.key !== 'F2') return
  const target = e.target as HTMLElement
  const 标签 = target?.tagName?.toLowerCase()
  if (标签 === 'input' || 标签 === 'textarea' || 标签 === 'select') return
  e.preventDefault()
  快捷键重命名()
}

let 一级菜单排序实例: Sortable | null = null
const 二级菜单排序实例列表: Sortable[] = []
let 折叠悬停定时器: ReturnType<typeof setTimeout> | null = null
let 上次悬停父级ID: number | null = null
let 正在拖拽二级菜单 = false
/** 一级菜单拖拽排序结束时间戳，用于屏蔽拖拽后浏览器补发的滞后 click（避免误折叠） */
let 一级菜单拖拽结束时间 = 0

function 处理拖拽中鼠标移动(event: MouseEvent) {
  if (!正在拖拽二级菜单) return
  const 目标元素 = document.elementFromPoint(event.clientX, event.clientY)
  if (!目标元素) {
    清除折叠悬停()
    return
  }
  const 一级菜单项 = (目标元素 as HTMLElement).closest('li.一级菜单项') as HTMLElement | null
  if (!一级菜单项) {
    清除折叠悬停()
    return
  }
  const 悬停父级ID = Number(一级菜单项.dataset.id)
  if (悬停父级ID === 上次悬停父级ID) return
  清除折叠悬停()
  上次悬停父级ID = 悬停父级ID
  if (菜单仓库.折叠状态.get(悬停父级ID)) {
    折叠悬停定时器 = setTimeout(() => {
      菜单仓库.折叠状态.set(悬停父级ID, false)
      清除折叠悬停()
    }, 800)
  }
}

function 清除折叠悬停() {
  if (折叠悬停定时器) {
    clearTimeout(折叠悬停定时器)
    折叠悬停定时器 = null
  }
  上次悬停父级ID = null
}

function 初始化拖拽排序() {
  if (树形菜单元素.value) {
    一级菜单排序实例 = new Sortable(树形菜单元素.value, {
      handle: '.拖拽区',
      animation: 150,
      ghostClass: '拖拽占位',
      dragClass: '拖拽跟随',
      forceFallback: true,
      fallbackTolerance: 3,
      scrollSensitivity: 60,
      scrollSpeed: 10,
      onStart() {
        document.body.classList.add('正在拖拽菜单')
      },
      onEnd(evt) {
        document.body.classList.remove('正在拖拽菜单')
        一级菜单拖拽结束时间 = Date.now()
        const 旧索引 = evt.oldIndex
        const 新索引 = evt.newIndex
        if (旧索引 === undefined || 新索引 === undefined || 旧索引 === 新索引) return
        菜单仓库.排序一级菜单(旧索引, 新索引)
      },
    })
  }
  const 子菜单列表 = document.querySelectorAll<HTMLElement>('.子菜单内层[data-父级id]')
  子菜单列表.forEach((容器) => {
    const 实例 = new Sortable(容器, {
      group: '二级菜单',
      animation: 150,
      ghostClass: '拖拽占位',
      dragClass: '拖拽跟随',
      forceFallback: true,
      fallbackTolerance: 3,
      scrollSensitivity: 60,
      scrollSpeed: 10,
      onStart() {
        正在拖拽二级菜单 = true
        document.body.classList.add('正在拖拽菜单')
        document.addEventListener('mousemove', 处理拖拽中鼠标移动)
      },
      onMove(evt) {
        const 目标容器 = evt.to as HTMLElement
        const 目标父级ID = Number(目标容器.dataset.父级id)
        if (菜单仓库.折叠状态.get(目标父级ID)) return false
        return true
      },
      onEnd(evt) {
        正在拖拽二级菜单 = false
        document.body.classList.remove('正在拖拽菜单')
        document.removeEventListener('mousemove', 处理拖拽中鼠标移动)
        清除折叠悬停()
        const 旧索引 = evt.oldIndex
        const 新索引 = evt.newIndex
        if (旧索引 === undefined || 新索引 === undefined) return
        const 来源父级ID = Number((evt.from as HTMLElement).dataset.父级id)
        const 目标父级ID = Number((evt.to as HTMLElement).dataset.父级id)
        if (来源父级ID === 目标父级ID && 旧索引 === 新索引) return
        const 拖拽项ID = Number((evt.item as HTMLElement).dataset.id)
        菜单仓库.跨级排序二级菜单(来源父级ID, 目标父级ID, 旧索引, 新索引, 拖拽项ID)
      },
    })
    二级菜单排序实例列表.push(实例)
  })
}

function 销毁拖拽排序() {
  一级菜单排序实例?.destroy()
  一级菜单排序实例 = null
  二级菜单排序实例列表.forEach((实例) => 实例.destroy())
  二级菜单排序实例列表.length = 0
  清除折叠悬停()
  document.removeEventListener('mousemove', 处理拖拽中鼠标移动)
}

onMounted(() => {
  document.addEventListener('click', 全局点击处理)
  document.addEventListener('keydown', 处理ESC按键)
  document.addEventListener('keydown', 处理F2按键)
  // 预加载所有菜单的全局图片图标到预览缓存
  for (const 菜单 of 菜单仓库.菜单列表) {
    if (是全局图片图标(菜单.图标代码)) {
      预加载菜单图片(菜单.图标代码)
    }
    for (const 子菜单 of 菜单.子菜单) {
      if (是全局图片图标(子菜单.图标代码)) {
        预加载菜单图片(子菜单.图标代码)
      }
    }
  }
  // 初始化拖拽排序
  nextTick(() => {
    初始化拖拽排序()
  })
})

// 菜单数据变化后重新初始化拖拽（新建/删除菜单后需要重新绑定 SortableJS）
watch(
  () => JSON.stringify(菜单仓库.菜单列表.map((m) => m.唯一ID + ':' + m.子菜单.length)),
  () => {
    nextTick(() => {
      setTimeout(() => {
        销毁拖拽排序()
        初始化拖拽排序()
      }, 50)
    })
  },
)
onUnmounted(() => {
  document.removeEventListener('click', 全局点击处理)
  document.removeEventListener('keydown', 处理ESC按键)
  document.removeEventListener('keydown', 处理F2按键)
  销毁拖拽排序()
})
</script>

<template>
  <div ref="树形菜单容器" class="树形菜单容器" :class="{ '树形菜单容器--紧凑': 紧凑模式 }">
    <!-- 紧凑模式：显示二级菜单图标列 -->
    <div v-show="紧凑模式" class="紧凑图标列">
      <div v-for="菜单 in 菜单仓库.菜单列表" :key="菜单.唯一ID" v-show="!菜单仓库.折叠状态.get(菜单.唯一ID)">
        <div v-for="子菜单 in 菜单.子菜单" :key="子菜单.唯一ID" class="紧凑图标项" :class="{ '紧凑图标项--激活': 菜单仓库.当前选中ID === 子菜单.唯一ID }" :title="子菜单.菜单名称" @click="处理二级菜单点击(子菜单.唯一ID)">
          <div class="紧凑图标项__图标">
            <i v-if="是FA图标(子菜单.图标代码)" :class="子菜单.图标代码"></i>
            <span v-else-if="是Emoji图标(子菜单.图标代码)" class="紧凑图标项__Emoji">{{ 子菜单.图标代码 }}</span>
            <img v-else-if="是全局图片图标(子菜单.图标代码) && 获取菜单图片Base64(子菜单.图标代码)" :src="获取菜单图片Base64(子菜单.图标代码)" alt="" class="紧凑图标项__图片" />
            <i v-else class="fas fa-archive"></i>
          </div>
          <span class="紧凑图标项__标题">{{ 子菜单.菜单名称.slice(0, 2) }}</span>
        </div>
      </div>
    </div>

    <!-- 常态模式：显示完整树形菜单 -->
    <div v-show="!紧凑模式" class="常态菜单区域">
      <div class="导航标题">
        <i class="fas fa-sitemap"></i>
        <h2>目录</h2>
        <div class="标题图标容器">
          <i class="fas fa-crosshairs 标题图标" title="定位到打开的菜单" @click="定位到选中节点"></i>
          <i class="fas fa-compress-alt 标题图标" title="全部折叠菜单" @click="折叠全部菜单"></i>
          <i class="fas fa-plus-circle 标题图标" title="新建一级菜单" @click="新建一级菜单"></i>
        </div>
      </div>

      <ul ref="树形菜单元素" class="树形菜单">
        <li v-for="菜单 in 菜单仓库.菜单列表" :key="菜单.唯一ID" class="一级菜单项" :data-id="菜单.唯一ID">
          <!-- 一级菜单：拖拽区不响应点击，仅折叠箭头和新建按钮可点击 -->
          <div class="一级菜单项-容器" :class="{ 激活状态: 菜单仓库.当前选中ID === 菜单.唯一ID }" @click="处理一级菜单点击(菜单.唯一ID)" @contextmenu.prevent="处理右键($event, 菜单.唯一ID, '一级')">
            <div class="拖拽区">
              <!-- FA 图标 -->
              <i v-if="是FA图标(菜单.图标代码)" class="菜单图标 可点击图标" :class="菜单.图标代码" title="点击更换图标" @click="点击菜单图标($event, '一级', 菜单.唯一ID)"></i>
              <!-- Emoji -->
              <span v-else-if="是Emoji图标(菜单.图标代码)" class="菜单图标 可点击图标 菜单Emoji图标" title="点击更换图标" @click="点击菜单图标($event, '一级', 菜单.唯一ID)">{{ 菜单.图标代码 }}</span>
              <!-- 全局图片 -->
              <span v-else class="菜单图标 可点击图标 菜单图片图标" title="点击更换图标" @click="点击菜单图标($event, '一级', 菜单.唯一ID)">
                <img v-if="获取菜单图片Base64(菜单.图标代码)" :src="获取菜单图片Base64(菜单.图标代码)" alt="" class="菜单图片缩略图" />
                <i v-else class="fas fa-image"></i>
              </span>
              <span>{{ 菜单.菜单名称 }}</span>
            </div>
            <div class="非拖拽区" @click.stop>
              <i class="fas fa-plus-circle 新建二级菜单图标" title="新建二级菜单" @click.stop="处理新建二级菜单(菜单.唯一ID)"></i>
              <i
                class="fas fa-chevron-right 箭头"
                :class="{
                  展开: !菜单仓库.折叠状态.get(菜单.唯一ID),
                  禁用: 菜单.子菜单.length === 0,
                }"
                @click="处理箭头点击($event, 菜单.唯一ID)"
              ></i>
            </div>
          </div>

          <ul class="子菜单" :class="{ 展开: !菜单仓库.折叠状态.get(菜单.唯一ID) }" :data-父级id="菜单.唯一ID">
            <div class="子菜单内层" :data-父级id="菜单.唯一ID">
              <li v-for="子菜单 in 菜单.子菜单" :key="子菜单.唯一ID" class="二级菜单项" :class="{ 激活状态: 菜单仓库.当前选中ID === 子菜单.唯一ID }" :data-id="子菜单.唯一ID" @click.stop="处理二级菜单点击(子菜单.唯一ID)" @contextmenu.prevent="处理右键($event, 子菜单.唯一ID, '二级')">
                <span>
                  <!-- FA 图标 -->
                  <i v-if="是FA图标(子菜单.图标代码)" class="二级菜单图标 可点击图标" :class="子菜单.图标代码" title="点击更换图标" @click="点击菜单图标($event, '二级', 子菜单.唯一ID)"></i>
                  <!-- Emoji -->
                  <span v-else-if="是Emoji图标(子菜单.图标代码)" class="二级菜单图标 可点击图标 菜单Emoji图标" title="点击更换图标" @click="点击菜单图标($event, '二级', 子菜单.唯一ID)">{{ 子菜单.图标代码 }}</span>
                  <!-- 全局图片 -->
                  <span v-else class="二级菜单图标 可点击图标 菜单图片图标" title="点击更换图标" @click="点击菜单图标($event, '二级', 子菜单.唯一ID)">
                    <img v-if="获取菜单图片Base64(子菜单.图标代码)" :src="获取菜单图片Base64(子菜单.图标代码)" alt="" class="菜单图片缩略图" />
                    <i v-else class="fas fa-image"></i>
                  </span>
                  {{ 子菜单.菜单名称 }}
                </span>
              </li>
            </div>
          </ul>
        </li>
      </ul>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="右键菜单.可见" class="右键菜单覆盖层" @mousedown.self="关闭右键菜单" @contextmenu.prevent="关闭右键菜单"></div>
      <div v-if="右键菜单.可见" class="右键菜单" :style="{ left: 右键菜单.x + 'px', top: 右键菜单.y + 'px' }" @click.stop>
        <div v-if="重命名输入.可见" class="重命名输入行">
          <input ref="重命名输入框" v-model="重命名输入.值" class="重命名输入框" @keyup.enter="确认重命名" @keydown.escape.prevent="重命名ESC" @compositionstart="处理输入法开始" @compositionend="处理输入法结束" @blur="确认重命名" />
        </div>
        <template v-else>
          <div class="右键菜单项" @click="开始重命名">
            <i class="fas fa-pen"></i>
            <span>重命名</span>
          </div>
          <div class="右键菜单项 危险" @click="处理删除">
            <i class="fas fa-trash"></i>
            <span>删除</span>
          </div>
        </template>
      </div>

      <!-- 确认弹窗 -->
      <div v-if="确认弹窗.可见" class="确认弹窗覆盖层" @mousedown.self="取消删除">
        <div class="确认弹窗" @click.stop>
          <div class="确认弹窗标题">确认删除</div>
          <div class="确认弹窗消息">{{ 确认弹窗.消息 }}</div>
          <div class="确认弹窗按钮区">
            <button class="确认弹窗按钮" @click="取消删除">取消</button>
            <button class="确认弹窗按钮 确认弹窗危险" @click="执行确认删除">确认删除</button>
          </div>
        </div>
      </div>

      <IconPickerPanel ref="图标面板Ref" />
    </Teleport>
  </div>
</template>

<style scoped>
/* 重置 ul 默认缩进 */
.树形菜单,
.子菜单 {
  list-style: none;
  padding: 0;
  margin: 0;
}

.树形菜单容器 {
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  color: var(--全站通用文字颜色);
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 导航标题 */
.常态菜单区域 {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.导航标题 {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 8px 16px 12px;
  flex-shrink: 0;
}

.常态菜单区域 .树形菜单 {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.导航标题 h2 {
  font-size: 1.2rem;
  font-weight: 560;
  margin: 0;
  flex: 1;
  color: var(--全站通用文字颜色);
}

.标题图标容器 {
  display: flex;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-left: auto;
}
.导航标题:hover .标题图标容器 {
  opacity: 1;
}
.标题图标 {
  cursor: pointer;
  color: var(--弱化文字颜色);
  font-size: 0.9rem;
  transition:
    color 0.2s,
    transform 0.2s;
}
.标题图标:hover {
  color: var(--全站透明文字颜色);
  transform: scale(1.1);
}

/* ---------- 一级菜单 ---------- */
.一级菜单项 {
  margin-bottom: 2px;
}
.拖拽占位 {
  opacity: 0;
}
.拖拽跟随 {
  opacity: 1;
}
.一级菜单项-容器 {
  display: flex;
  align-items: center;
  padding: 0;
}
.一级菜单项-容器:hover {
  background-color: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.一级菜单项-容器.激活状态 {
  background-color: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
}

.拖拽区 {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
}
.拖拽区 i {
  color: var(--全站通用文字颜色);
  font-size: 1rem;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.拖拽区 span {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.拖拽区 .菜单Emoji图标,
.拖拽区 .菜单图片图标 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.非拖拽区 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding: 10px 12px 10px 0;
}

.新建二级菜单图标 {
  font-size: 0.8rem;
  color: var(--全站通用文字颜色);
  cursor: pointer;
  transition: all 0.2s ease;
  opacity: 0;
}
.一级菜单项-容器:hover .新建二级菜单图标 {
  opacity: 1;
}
.新建二级菜单图标:hover {
  color: var(--全站通用文字颜色);
  transform: scale(1.1);
}

.箭头 {
  font-size: 0.8rem;
  color: var(--全站透明文字颜色);
  transition: transform 0.3s;
  cursor: pointer;
}
.箭头.展开 {
  transform: rotate(90deg);
  color: var(--全站通用文字颜色);
}
.箭头.禁用 {
  opacity: 0.3;
  cursor: default;
  pointer-events: none;
}

/* ---------- 二级菜单 ---------- */
.子菜单 {
  display: grid;
  grid-template-rows: 0fr;
  overflow: hidden;
  transition: grid-template-rows 0.15s ease;
  padding-left: 0;
  margin: 0;
  list-style: none;
}
.子菜单.展开 {
  grid-template-rows: 1fr;
  min-height: 8px;
}
.子菜单 > .子菜单内层 {
  overflow: hidden;
  min-height: 0;
}
.二级菜单项 {
  padding: 0;
  cursor: pointer;
  position: relative;
}
.二级菜单项:hover {
  background-color: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.二级菜单项.激活状态 {
  background-color: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
}

.二级菜单项 > span {
  display: flex;
  align-items: center;
  padding: 10px 20px 10px 22px;
  text-decoration: none;
  color: inherit;
  position: relative;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  gap: 10px;
}

.二级菜单图标 {
  font-size: 1rem;
  flex-shrink: 0;
  color: inherit;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.二级菜单图标.菜单Emoji图标,
.二级菜单图标.菜单图片图标 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.菜单图片缩略图 {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}

/* ---------- 紧凑模式 ---------- */
.树形菜单容器--紧凑 {
  overflow: hidden;
  width: 100%;
}

.紧凑图标列 {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 12px 0;
  gap: 4px;
}

.紧凑图标列 > div {
  width: 100%;
}

.紧凑图标项 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 46px;
  padding: 4px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--弱化文字颜色);
}

.紧凑图标项:hover {
  color: var(--全站透明文字颜色);
  background-color: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}

.紧凑图标项--激活 {
  color: var(--全站通用文字颜色);
  background-color: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
}

.紧凑图标项__图标 {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-bottom: 4px;
}

.紧凑图标项__图标 i {
  color: inherit;
  font-size: inherit;
}

.紧凑图标项__Emoji {
  font-size: inherit;
  line-height: 1;
}

.紧凑图标项__图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  padding: 5px;
  box-sizing: border-box;
}

.紧凑图标项__标题 {
  font-size: 11px;
  color: var(--弱化文字颜色);
  text-align: center;
  line-height: 1.2;
  max-width: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<!-- 右键菜单样式（非 scoped，因为 Teleport 到 body） -->
<style>
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

/* 确认弹窗 */
.确认弹窗覆盖层 {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.确认弹窗 {
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  min-width: 340px;
  max-width: 420px;
  padding: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.确认弹窗标题 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  margin-bottom: 12px;
}

.确认弹窗消息 {
  font-size: 0.9rem;
  color: var(--全站透明文字颜色);
  line-height: 1.6;
  margin-bottom: 20px;
  white-space: pre-line;
}

.确认弹窗按钮区 {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.确认弹窗按钮 {
  padding: 6px 18px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.15s;
}
.确认弹窗按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}

.确认弹窗按钮.确认弹窗危险 {
  color: #e74c3c;
  border-color: #e74c3c;
}
.确认弹窗按钮.确认弹窗危险:hover {
  background: rgba(231, 76, 60, 0.15);
}

.可点击图标 {
  cursor: pointer;
  transition: opacity 0.15s;
}

.可点击图标:hover {
  opacity: 0.7;
}

body.正在拖拽菜单 * {
  cursor: pointer !important;
}
</style>
