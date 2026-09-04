<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'

const props = defineProps<{
  文件名: string
  分组名: string
}>()

const emit = defineEmits<{
  关闭: []
  裁切完成: []
}>()

const 主题仓库 = 使用主题仓库()
const { 裁切屏幕宽度, 裁切屏幕高度, 裁切保留原图 } = storeToRefs(主题仓库)

const 图片URL = ref('')
const 图片加载中 = ref(true)
const 图片自然宽 = ref(0)
const 图片自然高 = ref(0)
const 裁切中 = ref(false)

type 比例预设类型 = '16:9' | '16:10' | '4:3' | '自由' | '自定义屏幕'
const 当前比例预设 = ref<比例预设类型>('自定义屏幕')

const 自定义屏幕宽 = ref(裁切屏幕宽度.value || 1920)
const 自定义屏幕高 = ref(裁切屏幕高度.value || 1080)
const 自定义屏幕编辑中 = ref(false)

const 比例预设列表: { 标签: 比例预设类型; 宽高比: number | null }[] = [
  { 标签: '16:9', 宽高比: 16 / 9 },
  { 标签: '16:10', 宽高比: 16 / 10 },
  { 标签: '4:3', 宽高比: 4 / 3 },
  { 标签: '自由', 宽高比: null },
  { 标签: '自定义屏幕', 宽高比: null },
]

const 当前宽高比 = computed<number | null>(() => {
  if (当前比例预设.value === '自由') return null
  if (当前比例预设.value === '自定义屏幕') {
    const w = 自定义屏幕宽.value
    const h = 自定义屏幕高.value
    if (w > 0 && h > 0) return w / h
    return null
  }
  const 预设 = 比例预设列表.find((p) => p.标签 === 当前比例预设.value)
  return 预设?.宽高比 ?? null
})

// 选框状态（百分比 0-100）
const 选框 = ref({ x: 10, y: 10, w: 80, h: 80 })

// 容器尺寸
const 容器宽 = ref(0)
const 容器高 = ref(0)
const 容器ref = ref<HTMLElement | null>(null)
const 图片ref = ref<HTMLImageElement | null>(null)

// 拖拽状态
type 拖拽模式类型 = '移动' | '左上' | '右上' | '左下' | '右下' | '上' | '下' | '左' | '右' | '新建'
const 拖拽模式 = ref<拖拽模式类型 | null>(null)
const 拖拽起始 = ref({ 鼠标x: 0, 鼠标y: 0, 选框x: 0, 选框y: 0, 选框w: 0, 选框h: 0 })

function 获取光标模式(e: MouseEvent): 拖拽模式类型 | null {
  const rect = 容器ref.value?.getBoundingClientRect()
  if (!rect) return null
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const px = (mx / rect.width) * 100
  const py = (my / rect.height) * 100
  const 边距 = 2
  const { x, y, w, h } = 选框.value
  const 在选框内 = px >= x - 边距 && px <= x + w + 边距 && py >= y - 边距 && py <= y + h + 边距
  if (!在选框内) return '新建'
  const 靠左 = Math.abs(px - x) < 边距
  const 靠右 = Math.abs(px - (x + w)) < 边距
  const 靠上 = Math.abs(py - y) < 边距
  const 靠下 = Math.abs(py - (y + h)) < 边距
  if (靠左 && 靠上) return '左上'
  if (靠右 && 靠上) return '右上'
  if (靠左 && 靠下) return '左下'
  if (靠右 && 靠下) return '右下'
  if (靠上) return '上'
  if (靠下) return '下'
  if (靠左) return '左'
  if (靠右) return '右'
  return '移动'
}

function 获取光标样式(模式: 拖拽模式类型 | null): string {
  switch (模式) {
    case '左上':
    case '右下':
      return 'nwse-resize'
    case '右上':
    case '左下':
      return 'nesw-resize'
    case '上':
    case '下':
      return 'ns-resize'
    case '左':
    case '右':
      return 'ew-resize'
    case '移动':
      return 'move'
    case '新建':
      return 'crosshair'
    default:
      return 'default'
  }
}

function 限制选框(s: { x: number; y: number; w: number; h: number }) {
  s.w = Math.max(5, s.w)
  s.h = Math.max(5, s.h)
  s.x = Math.max(0, Math.min(100 - s.w, s.x))
  s.y = Math.max(0, Math.min(100 - s.h, s.y))
  return s
}

function 应用宽高比(s: { x: number; y: number; w: number; h: number }, 锚点?: 拖拽模式类型) {
  const 比 = 当前宽高比.value
  if (比 === null) return s
  const 容器比 = 容器宽.value / 容器高.value
  const 图片比 = 比 / 容器比
  const 当前比 = s.w / s.h
  if (图片比 > 当前比) {
    const 新h = s.w / 图片比
    if (锚点?.includes('上')) {
      s.y = s.y + s.h - 新h
    }
    s.h = 新h
  } else {
    const 新w = s.h * 图片比
    if (锚点?.includes('左')) {
      s.x = s.x + s.w - 新w
    }
    s.w = 新w
  }
  return s
}

function 处理鼠标按下(e: MouseEvent) {
  if (e.button !== 0) return
  const 模式 = 获取光标模式(e)
  if (!模式) return
  拖拽模式.value = 模式
  拖拽起始.value = {
    鼠标x: e.clientX,
    鼠标y: e.clientY,
    选框x: 选框.value.x,
    选框y: 选框.value.y,
    选框w: 选框.value.w,
    选框h: 选框.value.h,
  }
  if (模式 === '新建') {
    const rect = 容器ref.value?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    选框.value = { x: px, y: py, w: 5, h: 5 }
  }
  e.preventDefault()
}

function 处理鼠标移动(e: MouseEvent) {
  if (!拖拽模式.value) {
    const 模式 = 获取光标模式(e)
    if (容器ref.value) {
      容器ref.value.style.cursor = 获取光标样式(模式)
    }
    return
  }
  const rect = 容器ref.value?.getBoundingClientRect()
  if (!rect) return
  const dx = ((e.clientX - 拖拽起始.value.鼠标x) / rect.width) * 100
  const dy = ((e.clientY - 拖拽起始.value.鼠标y) / rect.height) * 100
  const 起 = 拖拽起始.value
  const 模式 = 拖拽模式.value

  let 新选框 = { ...选框.value }

  if (模式 === '移动') {
    新选框.x = 起.选框x + dx
    新选框.y = 起.选框y + dy
    新选框.w = 起.选框w
    新选框.h = 起.选框h
  } else if (模式 === '新建') {
    const 当前px = ((e.clientX - rect.left) / rect.width) * 100
    const 当前py = ((e.clientY - rect.top) / rect.height) * 100
    const 起px = 起.选框x
    const 起py = 起.选框y
    新选框.x = Math.min(起px, 当前px)
    新选框.y = Math.min(起py, 当前py)
    新选框.w = Math.abs(当前px - 起px)
    新选框.h = Math.abs(当前py - 起py)
    新选框 = 应用宽高比(新选框, '右下')
  } else {
    let 新w = 起.选框w
    let 新h = 起.选框h
    let 新x = 起.选框x
    let 新y = 起.选框y

    if (模式.includes('右')) {
      新w = 起.选框w + dx
    }
    if (模式.includes('左')) {
      新x = 起.选框x + dx
      新w = 起.选框w - dx
    }
    if (模式.includes('下')) {
      新h = 起.选框h + dy
    }
    if (模式.includes('上')) {
      新y = 起.选框y + dy
      新h = 起.选框h - dy
    }

    新选框 = { x: 新x, y: 新y, w: 新w, h: 新h }
    新选框 = 应用宽高比(新选框, 模式 as 拖拽模式类型)
  }

  选框.value = 限制选框(新选框)
}

function 处理鼠标松开() {
  拖拽模式.value = null
}

function 处理图片加载() {
  图片加载中.value = false
  if (图片ref.value) {
    图片自然宽.value = 图片ref.value.naturalWidth
    图片自然高.value = 图片ref.value.naturalHeight
  }
  nextTick(() => {
    更新容器尺寸()
    初始化选框()
  })
}

function 更新容器尺寸() {
  if (容器ref.value) {
    容器宽.value = 容器ref.value.clientWidth
    容器高.value = 容器ref.value.clientHeight
  }
}

function 初始化选框() {
  if (当前宽高比.value !== null) {
    const 容器比 = 容器宽.value / 容器高.value
    const 图片比 = 当前宽高比.value / 容器比
    let w: number, h: number
    if (图片比 > 1) {
      w = 80
      h = w / 图片比
    } else {
      h = 80
      w = h * 图片比
    }
    选框.value = 限制选框({ x: (100 - w) / 2, y: (100 - h) / 2, w, h })
  } else {
    选框.value = { x: 10, y: 10, w: 80, h: 80 }
  }
}

watch(当前比例预设, () => {
  初始化选框()
})

watch([自定义屏幕宽, 自定义屏幕高], () => {
  if (当前比例预设.value === '自定义屏幕') {
    初始化选框()
  }
})

const 遮罩clipPath = computed(() => {
  const { x, y, w, h } = 选框.value
  const r = x + w
  const b = y + h
  return `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${x}% ${y}%, ${r}% ${y}%, ${r}% ${b}%, ${x}% ${b}%, ${x}% ${y}%)`
})

async function 执行裁切() {
  if (裁切中.value) return
  裁切中.value = true
  try {
    const 结果 = await window.electronAPI.启动裁切壁纸(props.文件名, props.分组名, 主题仓库.壁纸存储位置, { x: 选框.value.x, y: 选框.value.y, w: 选框.value.w, h: 选框.value.h }, 裁切保留原图.value || undefined)
    if (结果.成功) {
      裁切屏幕宽度.value = 自定义屏幕宽.value
      裁切屏幕高度.value = 自定义屏幕高.value
      emit('裁切完成')
    } else {
      console.error('裁切失败:', 结果.错误信息)
    }
  } catch (e) {
    console.error('裁切异常:', e)
  }
  裁切中.value = false
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    emit('关闭')
  }
}

onMounted(async () => {
  document.addEventListener('keydown', 处理Esc)
  document.addEventListener('mousemove', 处理鼠标移动)
  document.addEventListener('mouseup', 处理鼠标松开)
  图片加载中.value = true
  await 主题仓库.加载指定壁纸URL(props.文件名, props.分组名)
  图片URL.value = 主题仓库.背景图片URL缓存
})

onUnmounted(() => {
  document.removeEventListener('keydown', 处理Esc)
  document.removeEventListener('mousemove', 处理鼠标移动)
  document.removeEventListener('mouseup', 处理鼠标松开)
})
</script>

<template>
  <Teleport to="body">
    <div class="裁切弹窗遮罩" @mousedown.self="emit('关闭')">
      <div class="裁切弹窗" @click.stop>
        <div class="裁切弹窗标题">裁切壁纸</div>

        <div class="裁切图片容器" ref="容器ref" @mousedown="处理鼠标按下">
          <img v-if="图片URL" ref="图片ref" :src="图片URL" class="裁切图片" @load="处理图片加载" />
          <div v-if="图片加载中" class="裁切图片加载中">
            <i class="fas fa-spinner fa-pulse"></i>
          </div>

          <div class="裁切遮罩" v-if="!图片加载中" :style="{ clipPath: 遮罩clipPath }"></div>
          <div
            class="裁切选框"
            :style="{
              left: 选框.x + '%',
              top: 选框.y + '%',
              width: 选框.w + '%',
              height: 选框.h + '%',
            }"
          >
            <div class="裁切选框角 裁切选框角-左上"></div>
            <div class="裁切选框角 裁切选框角-右上"></div>
            <div class="裁切选框角 裁切选框角-左下"></div>
            <div class="裁切选框角 裁切选框角-右下"></div>
            <div class="裁切选框边 裁切选框边-上"></div>
            <div class="裁切选框边 裁切选框边-下"></div>
            <div class="裁切选框边 裁切选框边-左"></div>
            <div class="裁切选框边 裁切选框边-右"></div>
          </div>
        </div>

        <div class="裁切控制区">
          <div class="裁切比例栏">
            <span class="裁切控制标签">比例</span>
            <button v-for="预设 in 比例预设列表" :key="预设.标签" class="裁切比例按钮" :class="{ 激活: 当前比例预设 === 预设.标签 }" @click="当前比例预设 = 预设.标签">
              {{ 预设.标签 }}
            </button>
          </div>

          <div v-if="当前比例预设 === '自定义屏幕'" class="裁切屏幕尺寸栏">
            <span class="裁切控制标签">屏幕尺寸</span>
            <input v-model.number="自定义屏幕宽" type="number" class="裁切尺寸输入" min="1" @focus="自定义屏幕编辑中 = true" @blur="自定义屏幕编辑中 = false" />
            <span class="裁切尺寸乘">×</span>
            <input v-model.number="自定义屏幕高" type="number" class="裁切尺寸输入" min="1" @focus="自定义屏幕编辑中 = true" @blur="自定义屏幕编辑中 = false" />
          </div>

          <div class="裁切选项栏">
            <label class="裁切复选框">
              <input type="checkbox" v-model="裁切保留原图" />
              <span>保留原图</span>
            </label>
            <span class="裁切提示文字">{{ 裁切保留原图 ? '裁切结果将另存为新文件' : '裁切结果将覆盖原图' }}</span>
          </div>

          <div class="裁切按钮栏">
            <button class="裁切取消按钮" @click="emit('关闭')">取消</button>
            <button class="裁切确认按钮" :disabled="裁切中" @click="执行裁切">
              <i v-if="裁切中" class="fas fa-spinner fa-pulse"></i>
              <span v-else>确认裁切</span>
            </button>
          </div>
        </div>

        <i class="fas fa-times 裁切关闭按钮" @click="emit('关闭')"></i>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.裁切弹窗遮罩 {
  position: fixed;
  inset: 0;
  z-index: 10008;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}
.裁切弹窗 {
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  border-radius: 12px;
  width: 800px;
  max-width: 92vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  position: relative;
}
.裁切弹窗标题 {
  padding: 14px 18px 10px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  flex-shrink: 0;
}
.裁切关闭按钮 {
  position: absolute;
  top: 12px;
  right: 14px;
  cursor: pointer;
  color: var(--弱化文字颜色);
  font-size: 1rem;
  transition: color 0.15s;
}
.裁切关闭按钮:hover {
  color: var(--全站透明文字颜色);
}

.裁切图片容器 {
  position: relative;
  margin: 0 18px;
  height: 420px;
  max-height: 55vh;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  overflow: hidden;
  user-select: none;
  flex-shrink: 0;
}
.裁切图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
  pointer-events: none;
}
.裁切图片加载中 {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--弱化文字颜色);
  font-size: 24px;
}

.裁切遮罩 {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

.裁切选框 {
  position: absolute;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}
.裁切选框角 {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  background: #4a9fa5;
  z-index: 2;
}
.裁切选框角-左上 {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}
.裁切选框角-右上 {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}
.裁切选框角-左下 {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}
.裁切选框角-右下 {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
}
.裁切选框边 {
  position: absolute;
  z-index: 1;
}
.裁切选框边-上 {
  top: -3px;
  left: 10px;
  right: 10px;
  height: 6px;
  cursor: ns-resize;
}
.裁切选框边-下 {
  bottom: -3px;
  left: 10px;
  right: 10px;
  height: 6px;
  cursor: ns-resize;
}
.裁切选框边-左 {
  left: -3px;
  top: 10px;
  bottom: 10px;
  width: 6px;
  cursor: ew-resize;
}
.裁切选框边-右 {
  right: -3px;
  top: 10px;
  bottom: 10px;
  width: 6px;
  cursor: ew-resize;
}

.裁切控制区 {
  padding: 14px 18px 16px;
  flex-shrink: 0;
}
.裁切控制标签 {
  font-size: 12px;
  color: var(--弱化文字颜色);
  margin-right: 8px;
  flex-shrink: 0;
}
.裁切比例栏 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.裁切比例按钮 {
  padding: 4px 10px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  border-radius: 4px;
  background: transparent;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}
.裁切比例按钮:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.裁切比例按钮.激活 {
  background: rgba(74, 159, 165, 0.2);
  border-color: #4a9fa5;
  color: var(--全站通用文字颜色);
}
.裁切屏幕尺寸栏 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.裁切尺寸输入 {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  font-size: 12px;
  outline: none;
}
.裁切尺寸输入:focus {
  border-color: #4a9fa5;
}
.裁切尺寸乘 {
  color: var(--弱化文字颜色);
  font-size: 12px;
}
.裁切选项栏 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.裁切复选框 {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--全站透明文字颜色);
  font-size: 13px;
}
.裁切复选框 input {
  accent-color: #4a9fa5;
}
.裁切提示文字 {
  font-size: 12px;
  color: var(--弱化文字颜色);
}
.裁切按钮栏 {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.裁切取消按钮 {
  padding: 6px 18px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  border-radius: 6px;
  background: transparent;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
.裁切取消按钮:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.裁切确认按钮 {
  padding: 6px 18px;
  border: none;
  border-radius: 6px;
  background: #4a9fa5;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.裁切确认-button:hover:not(:disabled) {
  background: #3b8a8f;
}
.裁切确认按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
