<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps<{
  可见: boolean
  相对路径: string
}>()

const emit = defineEmits<{
  完成: []
  关闭: []
}>()

const 图片URL = ref('')
const 加载中 = ref(true)
const 保存中 = ref(false)
const 错误信息 = ref('')

const 图片对象 = ref<HTMLImageElement | null>(null)
const 自然宽 = ref(0)
const 自然高 = ref(0)

const 容器ref = ref<HTMLElement | null>(null)
const 容器宽 = ref(0)
const 容器高 = ref(0)
const 显示宽 = ref(0)
const 显示高 = ref(0)

type 选框 = { x: number; y: number; size: number }
const 选框Px = ref<选框>({ x: 0, y: 0, size: 0 })

type 拖拽模式 = 'move' | 'nw' | 'ne' | 'sw' | 'se' | '新建'
const 拖拽状态 = ref<{ 模式: 拖拽模式; 起点X: number; 起点Y: number; 原点: 选框 } | null>(null)

function 图片缩放比(): number {
  if (容器宽.value <= 0 || 容器高.value <= 0 || 自然宽.value <= 0 || 自然高.value <= 0) return 1
  return Math.min(容器宽.value / 自然宽.value, 容器高.value / 自然高.value)
}

function 更新容器尺寸() {
  const el = 容器ref.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  容器宽.value = rect.width
  容器高.value = rect.height
  const s = 图片缩放比()
  显示宽.value = Math.max(1, 自然宽.value * s)
  显示高.value = Math.max(1, 自然高.value * s)
}

async function 加载图片() {
  加载中.value = true
  错误信息.value = ''
  选框Px.value = { x: 0, y: 0, size: 0 }
  try {
    const 结果 = await window.electronAPI.图标库读取图片(props.相对路径)
    if (结果.成功 && 结果.base64) {
      图片URL.value = 结果.base64
    } else {
      错误信息.value = 结果.错误信息 || '读取图片失败'
    }
  } catch (e) {
    错误信息.value = String(e)
  } finally {
    加载中.value = false
  }
}

function 图片已加载() {
  const img = 图片对象.value
  if (!img || !img.naturalWidth) return
  自然宽.value = img.naturalWidth
  自然高.value = img.naturalHeight
  nextTick(() => {
    更新容器尺寸()
    // 初始 1:1 选框：居中最大化
    const w = 自然宽.value
    const h = 自然高.value
    const size = Math.min(w, h)
    选框Px.value = { x: Math.round((w - size) / 2), y: Math.round((h - size) / 2), size }
  })
}

function 鼠标到图片坐标(e: MouseEvent): { px: number; py: number } {
  const rect = 容器ref.value?.getBoundingClientRect()
  if (!rect) return { px: 0, py: 0 }
  const s = 图片缩放比()
  const 偏移X = (rect.width - 显示宽.value) / 2
  const 偏移Y = (rect.height - 显示高.value) / 2
  return {
    px: (e.clientX - rect.left - 偏移X) / s,
    py: (e.clientY - rect.top - 偏移Y) / s,
  }
}

function 判定模式(e: MouseEvent): 拖拽模式 | null {
  const { px, py } = 鼠标到图片坐标(e)
  const { x, y, size } = 选框Px.value
  const 边距 = Math.max(12, size * 0.06)
  const 在框内 = px >= x - 边距 && px <= x + size + 边距 && py >= y - 边距 && py <= y + size + 边距
  if (!在框内) return '新建'
  const 贴左 = Math.abs(px - x) < 边距
  const 贴右 = Math.abs(px - (x + size)) < 边距
  const 贴上 = Math.abs(py - y) < 边距
  const 贴下 = Math.abs(py - (y + size)) < 边距
  if (贴左 && 贴上) return 'nw'
  if (贴右 && 贴上) return 'ne'
  if (贴左 && 贴下) return 'sw'
  if (贴右 && 贴下) return 'se'
  return 'move'
}

function 拖拽开始(e: MouseEvent) {
  if (e.button !== 0 || !图片对象.value) return
  const { px, py } = 鼠标到图片坐标(e)
  const { x, y, size } = 选框Px.value
  const 模式 = 判定模式(e)
  if (模式 === '新建') {
    const 边长 = Math.round(Math.min(自然宽.value, 自然高.value) * 0.6)
    const 半 = Math.round(边长 / 2)
    const nx = Math.max(0, Math.min(自然宽.value - 边长, Math.round(px) - 半))
    const ny = Math.max(0, Math.min(自然高.value - 边长, Math.round(py) - 半))
    选框Px.value = { x: nx, y: ny, size: 边长 }
    拖拽状态.value = { 模式: 'move', 起点X: px, 起点Y: py, 原点: { ...选框Px.value } }
  } else if (模式) {
    拖拽状态.value = { 模式, 起点X: px, 起点Y: py, 原点: { x, y, size } }
  } else {
    return
  }
  window.addEventListener('mousemove', 拖拽移动)
  window.addEventListener('mouseup', 拖拽结束)
}

function 拖拽移动(e: MouseEvent) {
  const t = 拖拽状态.value
  if (!t) return
  const { px, py } = 鼠标到图片坐标(e)
  const w = 自然宽.value
  const h = 自然高.value
  const 最小 = Math.max(8, Math.round(Math.min(w, h) * 0.02))

  if (t.模式 === 'move') {
    const nx = t.原点.x + (px - t.起点X)
    const ny = t.原点.y + (py - t.起点Y)
    选框Px.value = {
      x: Math.max(0, Math.min(w - t.原点.size, nx)),
      y: Math.max(0, Math.min(h - t.原点.size, ny)),
      size: t.原点.size,
    }
    return
  }

  // 缩放（nw/ne/sw/se）：锚点 = 与拖动角相对的对角
  const 锚X = t.模式.includes('w') ? t.原点.x + t.原点.size : t.原点.x
  const 锚Y = t.模式.includes('n') ? t.原点.y + t.原点.size : t.原点.y
  let size = Math.max(Math.abs(px - 锚X), Math.abs(py - 锚Y))
  size = Math.max(最小, Math.min(size, Math.max(w, h)))
  let nx = t.模式.includes('w') ? 锚X - size : 锚X
  let ny = t.模式.includes('n') ? 锚Y - size : 锚Y
  if (nx < 0) {
    nx = 0
    size = Math.min(size, 锚X)
  }
  if (ny < 0) {
    ny = 0
    size = Math.min(size, 锚Y)
  }
  if (nx + size > w) size = Math.min(size, w - nx)
  if (ny + size > h) size = Math.min(size, h - ny)
  size = Math.max(最小, Math.min(size, w, h))
  if (nx + size > w) nx = Math.max(0, w - size)
  if (ny + size > h) ny = Math.max(0, h - size)
  选框Px.value = { x: nx, y: ny, size }
}

function 拖拽结束() {
  拖拽状态.value = null
  window.removeEventListener('mousemove', 拖拽移动)
  window.removeEventListener('mouseup', 拖拽结束)
}

async function 确认裁切() {
  const img = 图片对象.value
  if (!img || 保存中.value) return
  const { x, y, size } = 选框Px.value
  if (size < 1) return
  保存中.value = true
  错误信息.value = ''
  try {
    let out = Math.round(size)
    if (out > 1024) out = 1024
    let 循环 = 0
    // 超限兜底：PNG >2MB 时自动降采样，最多降 3 轮
    for (; 循环 < 3; 循环++) {
      const canvas = document.createElement('canvas')
      canvas.width = out
      canvas.height = out
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('无法创建画布')
      ctx.drawImage(img, x, y, size, size, 0, 0, out, out)
      const dataUrl = canvas.toDataURL('image/png')
      const 估算字节 = Math.round(dataUrl.length * 0.75)
      if (估算字节 <= 2 * 1024 * 1024 || out <= 128) {
        const 结果 = await window.electronAPI.图标库写回图片(props.相对路径, dataUrl)
        if (!结果.成功) throw new Error(结果.错误信息 || '写回图片失败')
        emit('完成')
        return
      }
      out = Math.max(128, Math.round(out / 2))
    }
  } catch (e) {
    错误信息.value = String(e)
  } finally {
    保存中.value = false
  }
}

function 关闭() {
  拖拽结束()
  emit('关闭')
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  关闭()
}

watch(
  () => props.可见,
  (新值) => {
    if (新值) 加载图片()
  },
)

onMounted(() => {
  document.addEventListener('keydown', 处理Esc)
  window.addEventListener('resize', 更新容器尺寸)
})
onUnmounted(() => {
  document.removeEventListener('keydown', 处理Esc)
  window.removeEventListener('resize', 更新容器尺寸)
  window.removeEventListener('mousemove', 拖拽移动)
  window.removeEventListener('mouseup', 拖拽结束)
})
</script>

<template>
  <div v-if="可见" class="裁切覆盖层" @mousedown.self="关闭">
    <div class="裁切弹窗" @click.stop>
      <div class="弹窗标题条">
        <i class="fas fa-crop-alt"></i>
        <span>裁切图标（正方形）</span>
        <button class="关闭按钮" title="关闭" @click="关闭"><i class="fas fa-times"></i></button>
      </div>

      <!-- 画布区 -->
      <div ref="容器ref" class="画布区" @mousedown="拖拽开始">
        <div v-if="加载中" class="加载状态">
          <i class="fas fa-spinner fa-pulse fa-2x"></i>
          <span>加载图片...</span>
        </div>
        <div v-else-if="错误信息" class="错误状态">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ 错误信息 }}</span>
        </div>
        <template v-else-if="图片URL">
          <div class="图片占位" :style="`width:${显示宽}px;height:${显示高}px`">
            <img :src="图片URL" ref="图片对象" alt="" class="裁切图片" @load="图片已加载" draggable="false" />
            <div
              v-if="自然宽 > 0"
              class="裁切选框"
              :style="{
                left: (选框Px.x / 自然宽) * 100 + '%',
                top: (选框Px.y / 自然高) * 100 + '%',
                width: (选框Px.size / 自然宽) * 100 + '%',
                height: (选框Px.size / 自然高) * 100 + '%',
              }"
            >
              <span class="角标 角标--nw"></span>
              <span class="角标 角标--ne"></span>
              <span class="角标 角标--sw"></span>
              <span class="角标 角标--se"></span>
            </div>
          </div>
        </template>
      </div>

      <div class="操作提示">拖拽移动选框，四角缩放；点击图片空白处可新建选区</div>

      <!-- 底部按钮 -->
      <div class="底部按钮行">
        <button class="取消按钮 弹窗按钮" :disabled="保存中" @click="关闭">取消</button>
        <button class="确认按钮 弹窗按钮" :disabled="!图片URL || 保存中 || 选框Px.size < 1" @click="确认裁切">
          <i v-if="保存中" class="fas fa-spinner fa-pulse"></i>
          <i v-else class="fas fa-check"></i>
          <span>{{ 保存中 ? '保存中...' : '确认裁切' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.裁切覆盖层 {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10600;
}
.裁切弹窗 {
  width: 640px;
  max-width: 92vw;
  max-height: 88vh;
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 16px 20px 18px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.弹窗标题条 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  color: var(--全站通用文字颜色);
}
.弹窗标题条 i {
  font-size: 1.1rem;
}
.关闭按钮 {
  margin-left: auto;
  background: none;
  border: none;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.95rem;
  padding: 4px 6px;
  border-radius: 4px;
}
.关闭按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 12%, transparent);
  color: var(--全站通用文字颜色);
}
.画布区 {
  position: relative;
  flex: 1;
  min-height: 360px;
  max-height: 60vh;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 18%, transparent);
  border-radius: 8px;
  background:
    repeating-conic-gradient(rgba(0, 0, 0, 0.12) 0 25%, transparent 0 50%) 0 / 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  user-select: none;
}
.加载状态,
.错误状态 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--弱化文字颜色);
  font-size: 0.9rem;
}
.图片占位 {
  position: relative;
  flex-shrink: 0;
}
.裁切图片 {
  display: block;
  width: 100%;
  height: 100%;
  user-select: none;
  -webkit-user-drag: none;
}
.裁切选框 {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed #4a9fa5;
  background: rgba(74, 159, 165, 0.08);
  cursor: move;
}
.角标 {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #4a9fa5;
  border-radius: 2px;
}
.角标--nw {
  left: -5px;
  top: -5px;
  cursor: nwse-resize;
}
.角标--ne {
  right: -5px;
  top: -5px;
  cursor: nesw-resize;
}
.角标--sw {
  left: -5px;
  bottom: -5px;
  cursor: nesw-resize;
}
.角标--se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}
.操作提示 {
  text-align: center;
  color: var(--弱化文字颜色);
  font-size: 0.75rem;
}
.底部按钮行 {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.弹窗按钮 {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s;
  border: none;
}
.弹窗按钮:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.取消按钮 {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  color: var(--全站透明文字颜色);
}
.取消按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.确认按钮 {
  background: #4a9fa5;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #3b8a8f;
}
</style>