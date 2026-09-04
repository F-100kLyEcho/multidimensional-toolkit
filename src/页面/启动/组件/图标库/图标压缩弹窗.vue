<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

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
const 是动图 = ref(false)

const 图片对象 = ref<HTMLImageElement | null>(null)
const 预览canvas = ref<HTMLCanvasElement | null>(null)
const 自然宽 = ref(0)
const 自然高 = ref(0)

/** 默认最短边 = 200 × devicePixelRatio，适配当前屏 DPR */
const 默认最短边 = Math.round(200 * (window.devicePixelRatio || 1))
const 目标最短边 = ref(默认最短边)

/** 原图最短边 */
const 原图最短边 = computed(() => Math.min(自然宽.value, 自然高.value))

/** 缩放比 = 目标最短边 / 原图最短边 */
const 缩放比 = computed(() => {
  if (原图最短边.value <= 0) return 1
  return 目标最短边.value / 原图最短边.value
})

/** 压缩后新尺寸 */
const 新宽 = computed(() => Math.max(1, Math.round(自然宽.value * 缩放比.value)))
const 新高 = computed(() => Math.max(1, Math.round(自然高.value * 缩放比.value)))

/** 原图已小于目标，无需压缩 */
const 无需压缩 = computed(() => 原图最短边.value > 0 && 目标最短边.value >= 原图最短边.value)

/** 输入校验：最短边必须为正整数 */
const 输入有效 = computed(() => Number.isFinite(目标最短边.value) && 目标最短边.value > 0)

/**
 * 检测 base64 图片是否为动图（APNG 或动态 WebP；GIF 已在入口按扩展名置灰）
 * - APNG：PNG 签名后扫描 chunk，找 acTL（animation control）→ 动图
 * - 动态 WebP：VP8X chunk 的 flags 第 1 位（0x02）= 动画位
 */
function 检测动图(base64: string): boolean {
  const 数据 = base64.includes(',') ? base64.slice(base64.indexOf(',') + 1) : base64
  let binary: string
  try {
    binary = atob(数据)
  } catch {
    return false
  }
  if (binary.length < 12) return false
  // APNG 检测：PNG 签名 89 50 4E 47 0D 0A 1A 0A
  const png签名 = [137, 80, 78, 71, 13, 10, 26, 10]
  let 是PNG = true
  for (let i = 0; i < 8; i++) {
    if (binary.charCodeAt(i) !== png签名[i]) { 是PNG = false; break }
  }
  if (是PNG) {
    let offset = 8
    while (offset + 8 <= binary.length) {
      const 长度 = (binary.charCodeAt(offset) << 24) | (binary.charCodeAt(offset + 1) << 16) | (binary.charCodeAt(offset + 2) << 8) | binary.charCodeAt(offset + 3)
      const 类型 = binary.slice(offset + 4, offset + 8)
      if (类型 === 'acTL') return true
      if (类型 === 'IDAT') return false
      offset += 12 + 长度
      if (offset < 0 || offset > binary.length) return false
    }
    return false
  }
  // 动态 WebP 检测：RIFF + WEBP + VP8X flags
  if (binary.slice(0, 4) === 'RIFF' && binary.slice(8, 12) === 'WEBP') {
    if (binary.slice(12, 16) === 'VP8X' && binary.length >= 21) {
      return (binary.charCodeAt(20) & 0x02) !== 0
    }
    return false
  }
  return false
}

async function 加载图片() {
  加载中.value = true
  错误信息.value = ''
  是动图.value = false
  try {
    const 结果 = await window.electronAPI.图标库读取图片(props.相对路径)
    if (结果.成功 && 结果.base64) {
      图片URL.value = 结果.base64
      是动图.value = 检测动图(图片URL.value)
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
  nextTick(渲染预览)
}

/** Canvas 实时绘制压缩后效果，所见即所得 */
function 渲染预览() {
  const canvas = 预览canvas.value
  const img = 图片对象.value
  if (!canvas || !img || 自然宽.value === 0 || !输入有效.value) return
  const w = 新宽.value
  const h = 新高.value
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, 自然宽.value, 自然高.value, 0, 0, w, h)
}

/** 根据原扩展名决定输出 mime：JPEG 保留 JPEG、WebP 保留 WebP，其余转 PNG */
function 输出mime(): string {
  const ext = props.相对路径.toLowerCase().match(/\.(\w+)$/)?.[1]
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'image/png'
}

async function 确认压缩() {
  const img = 图片对象.value
  if (!img || 保存中.value || 无需压缩.value || !输入有效.value) return
  保存中.value = true
  错误信息.value = ''
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 新宽.value
    canvas.height = 新高.value
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建画布')
    ctx.drawImage(img, 0, 0, 自然宽.value, 自然高.value, 0, 0, 新宽.value, 新高.value)
    const mime = 输出mime()
    const dataUrl = canvas.toDataURL(mime, 0.85)
    const 结果 = await window.electronAPI.图标库写回图片(props.相对路径, dataUrl)
    if (!结果.成功) throw new Error(结果.错误信息 || '写回图片失败')
    emit('完成')
  } catch (e) {
    错误信息.value = String(e)
  } finally {
    保存中.value = false
  }
}

function 关闭() {
  emit('关闭')
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  关闭()
}

watch(() => props.可见, (新值) => {
  if (新值) {
    目标最短边.value = 默认最短边
    加载图片()
  }
})

watch([新宽, 新高, 输入有效], () => {
  nextTick(渲染预览)
})

onMounted(() => {
  document.addEventListener('keydown', 处理Esc)
})
onUnmounted(() => {
  document.removeEventListener('keydown', 处理Esc)
})
</script>

<template>
  <div v-if="可见" class="压缩覆盖层" @mousedown.self="关闭">
    <div class="压缩弹窗" @click.stop>
      <div class="弹窗标题条">
        <i class="fas fa-compress-alt"></i>
        <span>压缩图标（保持比例）</span>
        <button class="关闭按钮" title="关闭" @click="关闭"><i class="fas fa-times"></i></button>
      </div>

      <!-- 预览区 -->
      <div class="预览区">
        <div v-if="加载中" class="加载状态">
          <i class="fas fa-spinner fa-pulse fa-2x"></i>
          <span>加载图片...</span>
        </div>
        <div v-else-if="错误信息" class="错误状态">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ 错误信息 }}</span>
        </div>
        <canvas v-else ref="预览canvas" class="预览画布"></canvas>
        <img v-if="图片URL && !加载中 && !错误信息" :src="图片URL" ref="图片对象" alt="" class="原图隐藏" @load="图片已加载" />
      </div>

      <!-- 控件区 -->
      <div class="控件区">
        <div v-if="是动图" class="动图警告">
          <i class="fas fa-exclamation-triangle"></i>
          <span>检测到动图（APNG / 动态 WebP），压缩会丢失动画仅取第一帧。动图体积大通常无需压缩，已拦截。</span>
        </div>
        <div class="输入行">
          <label>最短边：</label>
          <input type="number" v-model.number="目标最短边" min="1" step="1" class="最短边输入" :disabled="是动图" />
          <span>px</span>
          <span class="默认提示">（默认 {{ 默认最短边 }} = 200 × 当前屏 DPR）</span>
        </div>
        <div class="信息行">
          <template v-if="自然宽 > 0">
            <span class="原尺寸">原图：{{ 自然宽 }}×{{ 自然高 }}</span>
            <span v-if="无需压缩" class="无需压缩提示">原图已小于目标，无需压缩</span>
            <span v-else class="新尺寸">将压缩到 {{ 新宽 }}×{{ 新高 }}</span>
          </template>
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="底部按钮行">
        <button class="取消按钮 弹窗按钮" :disabled="保存中" @click="关闭">取消</button>
        <button class="确认按钮 弹窗按钮" :disabled="!图片URL || 保存中 || 无需压缩 || !输入有效 || 是动图" @click="确认压缩">
          <i v-if="保存中" class="fas fa-spinner fa-pulse"></i>
          <i v-else class="fas fa-check"></i>
          <span>{{ 保存中 ? '保存中...' : '确认压缩' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.压缩覆盖层 {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10600;
}
.压缩弹窗 {
  width: 520px;
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
.预览区 {
  position: relative;
  flex: 1;
  min-height: 280px;
  max-height: 55vh;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 18%, transparent);
  border-radius: 8px;
  background:
    repeating-conic-gradient(rgba(0, 0, 0, 0.12) 0 25%, transparent 0 50%) 0 / 20px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
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
.预览画布 {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
.原图隐藏 {
  display: none;
}
.控件区 {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.动图警告 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: rgba(231, 126, 34, 0.15);
  border: 1px solid #e67e22;
  color: #e67e22;
  font-size: 0.82rem;
  line-height: 1.4;
}
.动图警告 i {
  font-size: 0.95rem;
  flex-shrink: 0;
}
.输入行 {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--全站通用文字颜色);
  font-size: 0.9rem;
}
.最短边输入 {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 30%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色);
  font-size: 0.9rem;
}
.最短边输入:focus {
  outline: none;
  border-color: #4a9fa5;
}
.默认提示 {
  color: var(--弱化文字颜色);
  font-size: 0.78rem;
}
.信息行 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--弱化文字颜色);
}
.原尺寸 {
  color: var(--弱化文字颜色);
}
.新尺寸 {
  color: #4a9fa5;
}
.无需压缩提示 {
  color: #e67e22;
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
