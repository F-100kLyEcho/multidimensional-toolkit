<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'

/** 弹窗模式 */
type 表单模式 = '添加' | '编辑'

/** 图标类别 */
type 图标类别 = 'fontawesome' | 'emoji' | 'userUpload' | 'urlDownload'

const props = defineProps<{
  可见: boolean
  模式: 表单模式
  分组名: string
  图标值?: string
  显示名?: string
  类别: 图标类别
}>()

const emit = defineEmits<{
  关闭: []
  确认: [图标值: string, 显示名: string]
}>()

// ===== 本地输入状态 =====
const 图标代码 = ref('')
const 名称 = ref('')

// 打开弹窗时初始化
watch(
  () => props.可见,
  (新值) => {
    if (新值) {
      图标代码.value = props.图标值 || ''
      名称.value = props.显示名 || ''
    }
  },
  { immediate: true },
)

// ===== 根据类别区分 =====

/** 是否为 FA 类别 */
const 是FA类别 = computed(() => props.类别 === 'fontawesome')
/** 是否为 Emoji 类别 */
const 是Emoji类别 = computed(() => props.类别 === 'emoji')

const FA前缀选项 = [
  { 前缀: 'fas', 提示: 'Solid 实心' },
  { 前缀: 'far', 提示: 'Regular 常规' },
  { 前缀: 'fab', 提示: 'Brands 品牌' },
] as const

const 当前前缀 = computed(() => {
  const 值 = 图标代码.value.trim()
  const 匹配 = 值.match(/^(fas|far|fab)\s+/)
  return 匹配 ? 匹配[1] : ''
})

function 点击前缀标签(前缀: string) {
  const 值 = 图标代码.value.trim()
  if (!值) {
    图标代码.value = 前缀 + ' '
    return
  }
  const 已有前缀匹配 = 值.match(/^(fas|far|fab)\s+/)
  if (已有前缀匹配) {
    图标代码.value = 前缀 + ' ' + 值.slice(已有前缀匹配[0].length)
  } else if (值.startsWith('fa-')) {
    图标代码.value = 前缀 + ' ' + 值
  } else {
    图标代码.value = 前缀 + ' '
  }
}

/** 输入框 placeholder */
const 输入提示 = computed(() => {
  if (是FA类别.value) return 'fa-star / fas fa-star / far fa-folder…'
  if (是Emoji类别.value) return '😀  😊  🎉  🚀…'
  return 'fa-star / 😀'
})

/** 输入框下方校验提示 */
const 校验提示 = computed(() => {
  const 值 = 图标代码.value.trim()
  if (!值) return ''
  if (是FA类别.value) {
    if (!值.startsWith('fa-') && !值.startsWith('fas ') && !值.startsWith('far ') && !值.startsWith('fab ')) return '须以 fa- 或 fas /far /fab 开头'
    return ''
  }
  if (是Emoji类别.value) {
    if (值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')) return 'Emoji 输入不支持 Font Awesome 代码'
    return ''
  }
  return ''
})

const 输入有效 = computed(() => {
  const 值 = 图标代码.value.trim()
  if (!值 && !名称.value.trim()) return false
  if (是FA类别.value && 值 && !值.startsWith('fa-') && !值.startsWith('fas ') && !值.startsWith('far ') && !值.startsWith('fab ')) return false
  if (是Emoji类别.value && (值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab '))) return false
  return true
})

/** 预览区类别标签 */
const 预览标签 = computed(() => {
  if (是FA类别.value) return 'FA'
  if (是Emoji类别.value) return 'Emoji'
  return ''
})

// ===== 预览逻辑 =====

/** 是否为 FA 图标 */
function 是FA图标(值: string): boolean {
  return 值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')
}

function 预览类名(值: string): string {
  if (值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')) return 值
  if (值.startsWith('fa-')) return 'fas ' + 值
  return 值
}

/** 是否为图片图标 */
function 是图片图标(值: string): boolean {
  return 值.startsWith('icons:')
}

/** 图标值是否有效（预览用） */
function 预览有效(): boolean {
  const 值 = 图标代码.value
  if (!值) return false
  if (是FA类别.value) return 值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab ')
  return 值.length > 0
}

// ===== 操作 =====
function 标准化FA值(值: string): string {
  const 去空 = 值.trim()
  if (去空.startsWith('fas ') || 去空.startsWith('far ') || 去空.startsWith('fab ')) return 去空
  if (去空.startsWith('fa-')) return 'fas ' + 去空
  return 去空
}

function 处理确认() {
  if (!输入有效.value) return
  let 值 = 图标代码.value.trim()
  if (是FA类别.value) 值 = 标准化FA值(值)
  const 名 = 名称.value.trim()
  if (!值 && !名) return
  emit('确认', 值, 名 || 值)
}

function 处理关闭() {
  emit('关闭')
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 处理关闭()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))
</script>

<template>
  <div v-if="可见" class="遮罩层" @mousedown.self="处理关闭">
    <div class="表单弹窗">
      <div class="弹窗标题">
        <i class="fas" :class="模式 === '编辑' ? 'fa-pen' : 'fa-plus'"></i>
        <span>{{ 模式 === '编辑' ? '编辑' : '添加' }}{{ 是FA类别 ? '图标' : 是Emoji类别 ? 'Emoji' : '' }}</span>
        <span class="类别标签">{{ 预览标签 }}</span>
      </div>

      <!-- 预览区域 -->
      <div class="预览区">
        <div class="预览框">
          <!-- FA 图标 -->
          <div v-if="是FA图标(图标代码) && 预览有效()" class="预览图标 fa预览">
            <i :class="预览类名(图标代码)"></i>
          </div>
          <!-- Emoji -->
          <div v-else-if="!是FA图标(图标代码) && !是图片图标(图标代码) && 预览有效()" class="预览图标 emoji预览">
            <span>{{ 图标代码 }}</span>
          </div>
          <!-- 图片图标 -->
          <div v-else-if="是图片图标(图标代码)" class="预览图标 图片预览">
            <span>🖼️</span>
          </div>
          <!-- 无效/空白 -->
          <div v-else class="预览图标 空白预览"></div>
        </div>
        <span class="预览名">{{ 名称 || '（无名称）' }}</span>
      </div>

      <!-- 输入区 -->
      <div class="输入区">
        <div class="输入行">
          <div class="标签行">
            <label class="标签">{{ 是FA类别 ? 'Font Awesome 代码' : 是Emoji类别 ? 'Emoji 字符' : '图标代码' }}</label>
            <span v-if="是FA类别" class="前缀标签组">
              <button
                v-for="项 in FA前缀选项" :key="项.前缀"
                class="前缀标签"
                :class="{ 激活: 当前前缀 === 项.前缀 }"
                :title="项.提示"
                @click="点击前缀标签(项.前缀)"
              >{{ 项.前缀 }}</button>
            </span>
          </div>
          <input v-model="图标代码" class="输入框" :placeholder="输入提示" @keyup.enter="处理确认" />
          <span v-if="校验提示" class="校验提示">{{ 校验提示 }}</span>
        </div>
        <div class="输入行">
          <label class="标签">显示名称</label>
          <input v-model="名称" class="输入框" placeholder="显示名称" @keyup.enter="处理确认" />
        </div>
      </div>

      <div class="按钮行">
        <button class="取消按钮 弹窗按钮" @click="处理关闭">取消</button>
        <button class="确认按钮 弹窗按钮" :disabled="!输入有效" @click="处理确认">
          <i class="fas fa-check"></i>
          <span>{{ 模式 === '编辑' ? '确认保存' : '确认添加' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 遮罩层 ===== */
.遮罩层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

/* ===== 弹窗主体 ===== */
.表单弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 24px;
  min-width: 380px;
  max-width: 460px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.弹窗标题 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--全站通用文字颜色);
}
.弹窗标题 i {
  font-size: 1.2rem;
}
.类别标签 {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  color: var(--弱化文字颜色);
  margin-left: auto;
}

/* ===== 预览区 ===== */
.预览区 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}
.预览框 {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  background: #4a9fa5;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.预览图标 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.预览图标.fa预览 {
  font-size: 28px;
  color: #fff;
}
.预览图标.fa预览 i {
  font-size: 28px;
}
.预览图标.emoji预览 {
  font-size: 28px;
}
.预览图标.图片预览 {
  font-size: 24px;
}
.预览图标.空白预览 {
  display: none;
}
.预览名 {
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 输入区 ===== */
.输入区 {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}
.输入行 {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.标签 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
}
.标签行 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.前缀标签组 {
  display: flex;
  gap: 4px;
}
.前缀标签 {
  font-size: 0.7rem;
  padding: 1px 8px;
  border-radius: 3px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  transition: all 0.15s;
  font-family: monospace;
}
.前缀标签:hover {
  border-color: var(--全站通用文字颜色);
  color: var(--全站通用文字颜色);
}
.前缀标签.激活 {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  border-color: var(--全站通用文字颜色);
  color: var(--全站通用文字颜色);
}
.输入框 {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}
.输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.输入框::placeholder {
  color: var(--弱化文字颜色);
}
.校验提示 {
  font-size: 0.75rem;
  color: #e74c3c;
  margin-top: 2px;
}

/* ===== 按钮行 ===== */
.按钮行 {
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
.取消按钮:hover {
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
