<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { 使用框选 } from '@/页面/启动/组件/图标库/使用框选'

const props = defineProps<{
  选中数: number
  选中列表: { 图标值: string; 显示名: string; 分组名: string; 类型: 'fa' | '图片' | 'emoji'; 缩略图URL?: string }[]
  可选分组列表: string[]
  操作级别: '图标' | '分组'
  选中分组列表: string[]
  选中分组数: number
}>()
const emit = defineEmits<{ 退出: []; 收纳: []; 清空: []; 全选: []; 切换选中: [分组名: string, 图标值: string]; 批量删除: []; 批量移动: [目标分组名: string]; 开始批量拖拽: [event: MouseEvent]; 切换级别: [级别: '图标' | '分组']; 批量删除分组: []; 全选分组: []; 清空选中分组: [] }>()

/** 移动下拉选中值（选完即重置，由父组件弹确认） */
const 移动目标 = ref('')
function 移动下拉变更(event: Event) {
  const 值 = (event.target as HTMLSelectElement).value
  if (值) {
    emit('批量移动', 值)
    移动目标.value = ''
  }
}

/** 选中列表框选：toggle 框内项，emit 切换选中给父组件 */
const 选中列表容器 = ref<HTMLElement | null>(null)
const { 框选中, 框选矩形, 开始框选 } = 使用框选({
  容器: 选中列表容器,
  项选择器: '.选中项',
  提取key: (项) => {
    const 分组名 = 项.getAttribute('数据-分组名') ?? ''
    const 图标值 = 项.getAttribute('数据-图标值') ?? ''
    return 分组名 && 图标值 ? `${分组名}::${图标值}` : null
  },
  onToggle: (keys) => {
    for (const key of keys) {
      const idx = key.lastIndexOf('::')
      const 分组名 = key.slice(0, idx)
      const 图标值 = key.slice(idx + 2)
      emit('切换选中', 分组名, 图标值)
    }
  },
})

/** 悬浮板位置/尺寸持久化到 localStorage */
const 布局存储键 = '图标库_批量信息板布局'
const 默认位置 = { x: window.innerWidth - 430, y: 80 }
const 默认尺寸 = { 宽: 410, 高: 270 }
try {
  const 保存的 = JSON.parse(localStorage.getItem(布局存储键) || '{}')
  if (typeof 保存的.x === 'number') 默认位置.x = Math.min(Math.max(保存的.x, 0), window.innerWidth - 100)
  if (typeof 保存的.y === 'number') 默认位置.y = Math.min(Math.max(保存的.y, 0), window.innerHeight - 100)
  if (typeof 保存的.宽 === 'number' && 保存的.宽 >= 300) 默认尺寸.宽 = 保存的.宽
  if (typeof 保存的.高 === 'number' && 保存的.高 >= 200) 默认尺寸.高 = 保存的.高
} catch {}

/** 悬浮板位置（标题栏拖拽移动） */
const 位置 = ref(默认位置)
const 尺寸 = ref(默认尺寸)
const 拖拽中 = ref(false)
const 最大化 = ref(false)
let 拖拽起始 = { x: 0, y: 0, 偏移X: 0, 偏移Y: 0 }

let 保存布局定时器: ReturnType<typeof setTimeout> | null = null
watch([位置, 尺寸], () => {
  if (保存布局定时器) clearTimeout(保存布局定时器)
  保存布局定时器 = setTimeout(() => {
    localStorage.setItem(布局存储键, JSON.stringify({ x: 位置.value.x, y: 位置.value.y, 宽: 尺寸.value.宽, 高: 尺寸.value.高 }))
    保存布局定时器 = null
  }, 300)
}, { deep: true })

/** 缩放状态 */
const 缩放中 = ref(false)
let 缩放方向 = ''
let 缩放起始 = { 鼠标x: 0, 鼠标y: 0, 宽: 0, 高: 0, x: 0, y: 0 }

/** 最大化时铺满留边距，否则用拖拽位置 + 尺寸 */
const 位置样式 = computed(() => (最大化.value ? {} : { left: 位置.value.x + 'px', top: 位置.value.y + 'px', width: 尺寸.value.宽 + 'px', height: 尺寸.value.高 + 'px' }))

function 切换最大化() {
  最大化.value = !最大化.value
}

function 开始拖拽(event: MouseEvent) {
  拖拽中.value = true
  拖拽起始 = { x: event.clientX, y: event.clientY, 偏移X: 位置.value.x, 偏移Y: 位置.value.y }
  document.addEventListener('mousemove', 拖拽移动)
  document.addEventListener('mouseup', 结束拖拽)
}

function 拖拽移动(event: MouseEvent) {
  if (!拖拽中.value) return
  位置.value = {
    x: 拖拽起始.偏移X + (event.clientX - 拖拽起始.x),
    y: 拖拽起始.偏移Y + (event.clientY - 拖拽起始.y),
  }
}

function 结束拖拽() {
  拖拽中.value = false
  document.removeEventListener('mousemove', 拖拽移动)
  document.removeEventListener('mouseup', 结束拖拽)
}

/** 四角缩放：右下角只改尺寸，左/上边缩放同时改位置保持对角不动 */
function 开始缩放(方向: string, event: MouseEvent) {
  event.stopPropagation()
  缩放中.value = true
  缩放方向 = 方向
  缩放起始 = {
    鼠标x: event.clientX,
    鼠标y: event.clientY,
    宽: 尺寸.value.宽,
    高: 尺寸.value.高,
    x: 位置.value.x,
    y: 位置.value.y,
  }
  document.addEventListener('mousemove', 缩放移动)
  document.addEventListener('mouseup', 结束缩放)
}

function 缩放移动(event: MouseEvent) {
  if (!缩放中.value) return
  const dx = event.clientX - 缩放起始.鼠标x
  const dy = event.clientY - 缩放起始.鼠标y
  let 新宽 = 缩放方向.includes('右') ? 缩放起始.宽 + dx : 缩放起始.宽 - dx
  let 新高 = 缩放方向.includes('下') ? 缩放起始.高 + dy : 缩放起始.高 - dy
  新宽 = Math.max(410, Math.min(window.innerWidth - 40, 新宽))
  新高 = Math.max(270, Math.min(window.innerHeight - 40, 新高))
  let 新x = 缩放起始.x
  let 新y = 缩放起始.y
  if (缩放方向.includes('左')) 新x = 缩放起始.x + (缩放起始.宽 - 新宽)
  if (缩放方向.includes('上')) 新y = 缩放起始.y + (缩放起始.高 - 新高)
  尺寸.value = { 宽: 新宽, 高: 新高 }
  位置.value = { x: 新x, y: 新y }
}

function 结束缩放() {
  缩放中.value = false
  document.removeEventListener('mousemove', 缩放移动)
  document.removeEventListener('mouseup', 结束缩放)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', 拖拽移动)
  document.removeEventListener('mouseup', 结束拖拽)
  document.removeEventListener('mousemove', 缩放移动)
  document.removeEventListener('mouseup', 结束缩放)
})
</script>

<template>
  <div class="批量信息板" :class="{ 最大化 }" :style="位置样式">
    <div class="批量信息板标题栏" @mousedown="开始拖拽">
      <span class="批量信息板标题"><i class="fas fa-tasks"></i> 批量操作</span>
      <div class="批量信息板标题按钮">
        <button class="批量信息板窗按钮" title="最小化（收纳到底部）" @click="emit('收纳')"><i class="fas fa-window-minimize"></i></button>
        <button class="批量信息板窗按钮" :title="最大化 ? '还原' : '最大化'" @click="切换最大化"><i :class="最大化 ? 'fas fa-window-restore' : 'fas fa-window-maximize'"></i></button>
        <button class="批量信息板窗按钮" title="关闭" @click="emit('退出')"><i class="fas fa-times"></i></button>
      </div>
    </div>
    <div class="批量信息板内容">
      <div class="级别切换">
        <button :class="['级别按钮', { 激活: props.操作级别 === '图标' }]" @click="emit('切换级别', '图标')"><i class="fas fa-th"></i> 图标</button>
        <button :class="['级别按钮', { 激活: props.操作级别 === '分组' }]" @click="emit('切换级别', '分组')"><i class="fas fa-folder"></i> 分组</button>
      </div>
      <template v-if="props.操作级别 === '图标'">
        <div class="已选计数">
          已选 <strong>{{ props.选中数 }}</strong> 个
        </div>
        <div class="选中列表" ref="选中列表容器" @mousedown="开始框选">
          <div v-for="项 in props.选中列表" :key="项.分组名 + '::' + 项.图标值" class="选中项" :数据-分组名="项.分组名" :数据-图标值="项.图标值" @click="emit('切换选中', 项.分组名, 项.图标值)">
            <div class="选中项缩略图">
              <i v-if="项.类型 === 'fa'" :class="项.图标值"></i>
              <img v-else-if="项.类型 === '图片' && 项.缩略图URL" :src="项.缩略图URL" :alt="项.显示名" />
              <span v-else>{{ 项.图标值 }}</span>
            </div>
            <span class="选中项名">{{ 项.显示名 }}</span>
            <span class="选中项分组">{{ 项.分组名 }}</span>
          </div>
          <div v-if="props.选中列表.length === 0" class="选中列表空">未选中任何图标</div>
          <div v-if="框选中" class="框选矩形" :style="{ left: 框选矩形.x + 'px', top: 框选矩形.y + 'px', width: 框选矩形.w + 'px', height: 框选矩形.h + 'px' }"></div>
        </div>
        <div class="批量按钮组">
          <button class="批量按钮 危险" :disabled="选中数 === 0" @click="emit('批量删除')"><i class="fas fa-trash"></i> 删除</button>
          <select class="批量移动下拉" :disabled="选中数 === 0 || 可选分组列表.length === 0" :value="移动目标" @change="移动下拉变更">
            <option value="" disabled hidden>移动到分组…</option>
            <option v-for="分组名 in 可选分组列表" :key="分组名" :value="分组名">{{ 分组名 }}</option>
          </select>
        </div>
        <div class="批量按钮组">
          <button class="批量按钮" :disabled="选中数 === 0" @mousedown.prevent="emit('开始批量拖拽', $event)"><i class="fas fa-hand-rock"></i> 批量拖拽</button>
          <button class="批量按钮" @click="emit('全选')"><i class="fas fa-check-double"></i> 全选当前分组</button>
          <button class="批量按钮" @click="emit('清空')"><i class="fas fa-times-circle"></i> 清空选中</button>
        </div>
      </template>
      <template v-else>
        <div class="已选计数">
          已选 <strong>{{ props.选中分组数 }}</strong> 个分组
        </div>
        <div class="选中分组列表">
          <div v-for="分组名 in props.选中分组列表" :key="分组名" class="选中分组项">
            <i class="fas fa-folder"></i>
            <span>{{ 分组名 }}</span>
          </div>
          <div v-if="props.选中分组数 === 0" class="选中列表空">未选中任何分组</div>
        </div>
        <div class="批量按钮组">
          <button class="批量按钮 危险" :disabled="选中分组数 === 0" @click="emit('批量删除分组')"><i class="fas fa-trash"></i> 删除分组</button>
          <button class="批量按钮" @click="emit('全选分组')"><i class="fas fa-check-double"></i> 全选</button>
          <button class="批量按钮" @click="emit('清空选中分组')"><i class="fas fa-times-circle"></i> 清空</button>
        </div>
      </template>
    </div>
    <!-- 四角缩放手柄（最大化时隐藏；热区在外侧，hover 显示图标） -->
    <template v-if="!最大化">
      <div class="缩放手柄 左上" @mousedown="开始缩放('左上', $event)"><i class="fas fa-up-down-left-right"></i></div>
      <div class="缩放手柄 右上" @mousedown="开始缩放('右上', $event)"><i class="fas fa-up-down-left-right"></i></div>
      <div class="缩放手柄 左下" @mousedown="开始缩放('左下', $event)"><i class="fas fa-up-down-left-right"></i></div>
      <div class="缩放手柄 右下" @mousedown="开始缩放('右下', $event)"><i class="fas fa-up-down-left-right"></i></div>
    </template>
  </div>
</template>

<style scoped>
.批量信息板 {
  position: fixed;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  background: rgb(var(--背景色值), var(--背景色值), var(--背景色值));
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: var(--全站通用文字颜色);
  user-select: none;
}
.批量信息板.最大化 {
  inset: 20px;
}
/* 四角缩放手柄：16×16 热区在外侧紧贴边界，hover 显示图标 */
.缩放手柄 {
  position: absolute;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.缩放手柄 i {
  font-size: 18px;
  color: var(--全站通用文字颜色);
  opacity: 0;
  transition: opacity 0.15s;
}
.缩放手柄:hover i {
  opacity: 1;
}
.缩放手柄.左上 {
  top: -16px;
  left: -16px;
  cursor: nwse-resize;
}
.缩放手柄.右上 {
  top: -16px;
  right: -16px;
  cursor: nesw-resize;
}
.缩放手柄.左下 {
  bottom: -16px;
  left: -16px;
  cursor: nesw-resize;
}
.缩放手柄.右下 {
  bottom: -16px;
  right: -16px;
  cursor: nwse-resize;
}
.批量信息板.最大化 {
  inset: 20px;
  width: auto;
  min-height: auto;
}
.批量信息板标题栏 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  cursor: move;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.批量信息板标题 {
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 6px;
}
.批量信息板窗按钮 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  opacity: 0.7;
}
.批量信息板窗按钮 .fa-window-minimize {
  transform: translateY(-3px);
}
.批量信息板标题按钮 {
  display: flex;
  gap: 2px;
}
.批量信息板窗按钮:hover {
  opacity: 1;
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.批量信息板内容 {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 10px;
}
.级别切换 {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}
.级别按钮 {
  flex: 1;
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.级别按钮.激活 {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.选中分组列表 {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.选中分组项 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 0.85rem;
}
.选中分组项 i {
  color: rgba(255, 255, 255, 0.4);
}
.已选计数 {
  font-size: 13px;
}
.已选计数 strong {
  color: #e67e22;
  font-size: 16px;
}
.选中列表 {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border-radius: 6px;
  padding: 4px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  column-gap: var(--卡片-间距-水平, 20px);
  row-gap: var(--卡片-间距-垂直, 20px);
  align-content: start;
  position: relative;
}
.框选矩形 {
  position: absolute;
  border: 1px dashed var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  pointer-events: none;
  z-index: 10;
}
.选中列表::-webkit-scrollbar {
  width: 6px;
}
.选中列表::-webkit-scrollbar-thumb {
  background: var(--滚动条颜色, rgba(255, 255, 255, 0.3));
  border-radius: 3px;
}
.选中列表::-webkit-scrollbar-thumb:hover {
  background: var(--滚动条悬停颜色, rgba(255, 255, 255, 0.4));
}
.选中项 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  border-radius: 4px;
  text-align: center;
}
.选中项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 8%, transparent);
}
.选中项缩略图 {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 32px;
}
.选中项缩略图 img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 3px;
}
.选中项名 {
  font-size: 11px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.选中项分组 {
  font-size: 10px;
  color: var(--弱化文字颜色);
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.选中列表空 {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--弱化文字颜色);
}
.批量按钮组 {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.批量按钮 {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border-radius: 4px;
  color: var(--全站通用文字颜色);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.批量按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.批量按钮:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.批量按钮.危险 {
  color: #e74c3c;
}
.批量移动下拉 {
  flex: 1;
  min-width: 80px;
  padding: 6px 8px;
  background: rgb(var(--背景色值), var(--背景色值), var(--背景色值));
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border-radius: 4px;
  color: var(--全站通用文字颜色);
  font-size: 12px;
}
.批量移动下拉 option {
  background: rgb(var(--背景色值), var(--背景色值), var(--背景色值));
  color: var(--全站通用文字颜色);
}
</style>
