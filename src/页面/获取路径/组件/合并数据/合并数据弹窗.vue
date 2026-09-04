<script setup lang="ts">
/**
 * 合并数据弹窗
 *
 * 功能：
 * - 左右两栏布局，与全局规则弹窗保持一致
 * - 左栏：控制参数区（标题行、输出文件设置、存储位置、文件类型、选项开关、预计信息）
 * - 右栏：textarea 编辑器（每行一个相对路径）+ 底部操作栏
 * - Esc 关闭、点击遮罩关闭
 * - 遮罩完全透明
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'

defineOptions({ name: 'MergeDialog' })

/** 合并配置对象类型 */
export interface 合并配置 {
  支持的文件类型: string[]
  输出格式: 'md' | 'txt'
  添加路径注释: boolean
  添加分隔: boolean
  合并规则路径: string
  输出保存路径: string
}

const props = defineProps<{
  显示: boolean
  栏标题: string
  有规则文件: boolean
  规则文件列表: string[]
  文件路径列表: string[]
  文件数: number
  预计合并大小: string
  配置: 合并配置
  合并中: boolean
  合并结果: { 成功: boolean; 信息: string; 文件路径?: string; 已合并数?: number; 跳过数?: number } | null
  跳过文件列表: string[]
  一键获取可用: boolean
  项目路径?: string
}>()

const emit = defineEmits<{
  关闭: []
  新建规则: []
  切换规则文件: [文件名: string]
  删除规则文件: [文件名: string]
  清空所有规则文件: []
  标题提交: [新标题: string]
  保存路径列表: [路径列表: string[]]
  一键获取: []
  清空列表: []
  更新配置: [配置: 合并配置]
  开始合并: []
  保存配置: []
}>()

// ==================== 本地状态 ====================

/** 文件类型输入 */
const 类型输入 = ref('')

/** 下拉菜单是否展开 */
const 下拉展开 = ref(false)

/** 标题是否在编辑中 */
const 标题编辑中 = ref(false)
const 标题编辑值 = ref('')

/** 输出文件名编辑 */
const 输出文件名编辑中 = ref(false)
const 输出文件名编辑值 = ref('')

/** textarea 编辑文本 */
const 编辑文本 = ref('')

/** 判断是否在 Electron 环境中 */
const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

/** 打开文件夹 */
async function 打开文件夹(路径: string) {
  if (!是否Electron环境) return
  await window.electronAPI.打开文件夹(路径, props.项目路径)
}

/** 更新配置的辅助函数 */
function 更新配置(部分配置: Partial<合并配置>) {
  emit('更新配置', { ...props.配置, ...部分配置 })
}

// ==================== 同步外部数据 ====================

watch(
  () => props.显示,
  (val) => {
    if (val) {
      类型输入.value = props.配置.支持的文件类型.join(', ')
      输出文件名编辑值.value = props.栏标题 === '未创建规则' ? '排除规则-合并输出' : `${props.栏标题}-合并输出`
      编辑文本.value = props.文件路径列表.join('\n')
    } else {
      下拉展开.value = false
      标题编辑中.value = false
      输出文件名编辑中.value = false
    }
  },
)

watch(
  () => props.文件路径列表,
  (列表) => {
    if (!props.显示) return
    编辑文本.value = 列表.join('\n')
  },
)

watch(
  () => props.栏标题,
  (val) => {
    if (val && !标题编辑中.value) {
      输出文件名编辑值.value = val === '未创建规则' ? '排除规则-合并输出' : `${val}-合并输出`
    }
  },
)

// ==================== 事件处理 ====================

/** 保存路径列表（从 textarea 文本解析） */
function 处理保存路径列表() {
  const 路径列表 = 编辑文本.value
    .split('\n')
    .map((行) => 行.trim())
    .filter((行) => 行 && !行.startsWith('#'))
  emit('保存路径列表', 路径列表)
}

/** textarea 键盘事件 */
function 处理编辑器键盘(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    处理保存路径列表()
  }
}

/** 标题点击编辑 */
function 开始编辑标题() {
  if (!props.有规则文件) return
  标题编辑中.value = true
  标题编辑值.value = props.栏标题
  nextTick(() => {
    const input = document.querySelector('.合并-标题输入') as HTMLInputElement
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

/** 标题提交 */
function 提交标题() {
  if (!标题编辑中.value) return
  标题编辑中.value = false
  const 新值 = 标题编辑值.value.trim()
  if (新值 && 新值 !== props.栏标题) {
    emit('标题提交', 新值)
  }
}

/** 输出文件名编辑 */
function 开始编辑输出文件名() {
  输出文件名编辑中.value = true
  nextTick(() => {
    const input = document.querySelector('.合并-输出文件名输入') as HTMLInputElement
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

function 提交输出文件名() {
  输出文件名编辑中.value = false
}

/** 切换下拉菜单 */
function 切换下拉() {
  下拉展开.value = !下拉展开.value
}

/** 选择规则文件并关闭下拉 */
function 选择规则文件(文件名: string) {
  emit('切换规则文件', 文件名)
  下拉展开.value = false
}

/** 清空所有规则文件并关闭下拉 */
function 清空全部规则() {
  emit('清空所有规则文件')
  下拉展开.value = false
}

/** 点击外部关闭下拉菜单 */
function 点击外部关闭下拉(e: MouseEvent) {
  if (下拉展开.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.合并-栏标题行')) {
      下拉展开.value = false
    }
  }
}

/** 显示 glob 语法提示 */
const 显示Glob提示 = ref(false)

/** 气泡定位样式 */
const 气泡样式 = ref<Record<string, string>>({})

/** glob 提示按钮 ref */
const glob提示按钮Ref = ref<HTMLElement | null>(null)

/** 将用户输入解析为 Glob 模式列表，自动补星 */
function 解析为模式列表(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      // 如果输入以点开头且不含通配符，自动添加 *（.ts → *.ts）
      if (item.startsWith('.') && !item.includes('*') && !item.includes('?')) {
        return `*${item}`
      }
      return item
    })
}

/** 处理文件类型输入变化（含自动保存防抖） */
function 处理文件类型输入(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  // 【修复】同步更新本地 ref，让输入框显示用户输入
  类型输入.value = value

  const 模式列表 = 解析为模式列表(value)
  更新配置({ 支持的文件类型: 模式列表 })

  // 防抖自动保存（300ms）
  if ((window as any).自动保存合并配置定时器) clearTimeout((window as any).自动保存合并配置定时器)
  ;(window as any).自动保存合并配置定时器 = setTimeout(() => {
    emit('保存配置')
  }, 300)
}

/** 切换 glob 提示，同时计算气泡位置 */
function 切换Glob提示() {
  显示Glob提示.value = !显示Glob提示.value
  if (显示Glob提示.value) {
    // 下一帧等 DOM 更新后计算位置
    nextTick(() => {
      const 按钮 = glob提示按钮Ref.value
      if (!按钮) return
      const 按钮rect = 按钮.getBoundingClientRect()
      气泡样式.value = {
        top: `${按钮rect.bottom + 4}px`,
        left: `${Math.max(按钮rect.right - 270, 8)}px`,
      }
    })
  }
}

/** 点击外部关闭 glob 提示 */
function 点击外部关闭Glob提示(e: MouseEvent) {
  if (显示Glob提示.value) {
    const target = e.target as HTMLElement
    if (!target.closest('.合并-glob提示区域')) {
      显示Glob提示.value = false
    }
  }
}

// ==================== 快捷键 ====================

function 处理键盘(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (下拉展开.value) {
      下拉展开.value = false
      return
    }
    if (props.显示) {
      emit('关闭')
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', 处理键盘)
  document.addEventListener('click', 点击外部关闭下拉)
  document.addEventListener('click', 点击外部关闭Glob提示)
})

onUnmounted(() => {
  window.removeEventListener('keydown', 处理键盘)
  document.removeEventListener('click', 点击外部关闭下拉)
  document.removeEventListener('click', 点击外部关闭Glob提示)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="显示" class="合并-遮罩" @mousedown.self="emit('关闭')">
      <div class="合并-弹窗">
        <!-- ======== 标题栏 ======== -->
        <div class="合并-标题栏">
          <span class="合并-标题">合并数据配置</span>
          <button class="合并-关闭按钮" title="关闭" @click="emit('关闭')">✕</button>
        </div>

        <!-- ======== 主体：左右两栏 ======== -->
        <div class="合并-主体">
          <!-- ===== 左侧：控制参数区 ===== -->
          <div class="合并-左侧">
            <!-- 栏标题行 -->
            <div class="合并-栏标题行">
              <div v-if="!标题编辑中" class="合并-标题显示" :class="{ '合并-标题可编辑': 有规则文件 }" @click="开始编辑标题">
                {{ 栏标题 }}
              </div>
              <input v-else v-model="标题编辑值" class="合并-标题输入" @blur="提交标题" @keyup.enter="提交标题" @keyup.escape="标题编辑中 = false" />
              <div class="合并-标题操作">
                <button class="合并-下拉按钮" :class="{ '合并-按钮置灰': !有规则文件 }" title="切换规则文件" @click="切换下拉">
                  <i class="fas fa-sort-down"></i>
                </button>
                <button class="合并-新建按钮" title="新建规则" @click="emit('新建规则')">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
              <!-- 下拉菜单 -->
              <div v-if="下拉展开" class="合并-下拉菜单">
                <div v-for="文件名 in 规则文件列表" :key="文件名" class="合并-下拉项" :class="{ '合并-下拉项-激活': 文件名 === 栏标题 + '.mergelist' }" @click="选择规则文件(文件名)">
                  <span class="合并-下拉项名">{{ 文件名.replace('.mergelist', '') }}</span>
                  <button class="合并-下拉删除" @click.stop="emit('删除规则文件', 文件名)">✕</button>
                </div>
                <div v-if="规则文件列表.length > 0" class="合并-下拉清空" @click="清空全部规则">清空全部</div>
              </div>
            </div>

            <!-- 输出文件设置 -->
            <div class="合并-配置区块">
              <div class="合并-配置标题">输出文件设置</div>
              <div class="合并-配置行">
                <span class="合并-配置标签">文件名：</span>
                <div v-if="!输出文件名编辑中" class="合并-文件名显示" @click="开始编辑输出文件名">
                  {{ 输出文件名编辑值 }}
                </div>
                <input v-else v-model="输出文件名编辑值" class="合并-输出文件名输入" @blur="提交输出文件名" @keyup.enter="提交输出文件名" />
              </div>
              <div class="合并-格式行">
                <label class="合并-格式选项" :class="{ '合并-格式选中': 配置.输出格式 === 'md' }">
                  <input type="radio" :checked="配置.输出格式 === 'md'" @change="更新配置({ 输出格式: 'md' })" />
                  .md
                </label>
                <label class="合并-格式选项" :class="{ '合并-格式选中': 配置.输出格式 === 'txt' }">
                  <input type="radio" :checked="配置.输出格式 === 'txt'" @change="更新配置({ 输出格式: 'txt' })" />
                  .txt
                </label>
              </div>
            </div>

            <!-- 合并规则存储位置 -->
            <div class="合并-配置区块">
              <div class="合并-配置标题行">
                <span class="合并-配置标题">合并规则</span>
                <button class="合并-打开按钮" title="打开合并规则文件夹" @click="打开文件夹(配置.合并规则路径)">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="合并-路径显示">{{ 配置.合并规则路径 || '加载中…' }}</div>
            </div>

            <!-- 保存路径 -->
            <div class="合并-配置区块">
              <div class="合并-配置标题行">
                <span class="合并-配置标题">合并代码</span>
                <button class="合并-打开按钮" title="打开输出文件夹" @click="打开文件夹(配置.输出保存路径)">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="合并-路径显示">{{ 配置.输出保存路径 || '加载中…' }}</div>
            </div>

            <!-- 支持的文件类型 -->
            <div class="合并-配置区块 合并-glob提示区域">
              <div class="合并-配置标题行">
                <span class="合并-配置标题">支持的文件类型（逗号分隔）</span>
                <button ref="glob提示按钮Ref" class="合并-glob提示按钮" title="Glob 语法说明" @click="切换Glob提示">
                  <i class="fas fa-question-circle"></i>
                </button>
              </div>
              <textarea :value="类型输入" class="合并-输入框 合并-文件类型输入" placeholder="输入文件匹配模式（支持通配符 * ? ，逗号分隔）" spellcheck="false" @input="处理文件类型输入"></textarea>
              <!-- Glob 语法提示气泡 -->
              <div v-if="显示Glob提示" class="合并-glob气泡" :style="气泡样式">
                <div class="合并-glob气泡标题">Glob 模式语法</div>
                <table class="合并-glob表格">
                  <tbody>
                    <tr>
                      <td><code>*.ts</code></td>
                      <td>匹配根目录 .ts 文件</td>
                    </tr>
                    <tr>
                      <td><code>**/*.ts</code></td>
                      <td>匹配任意层级 .ts 文件</td>
                    </tr>
                    <tr>
                      <td><code>.*</code></td>
                      <td>匹配根目录隐藏文件</td>
                    </tr>
                    <tr>
                      <td><code>.clineignore</code></td>
                      <td>匹配任意层级该文件</td>
                    </tr>
                    <tr>
                      <td><code>src/**</code></td>
                      <td>匹配 src/ 下所有文件</td>
                    </tr>
                    <tr>
                      <td><code>/*.json</code></td>
                      <td>仅根目录 .json 文件</td>
                    </tr>
                    <tr>
                      <td><code>.ts</code></td>
                      <td>自动转为 *.ts</td>
                    </tr>
                  </tbody>
                </table>
                <div class="合并-glob提示分隔"></div>
                <div class="合并-glob提示脚注">请使用英文逗号 <code>,</code> 分隔多个规则</div>
              </div>
            </div>

            <!-- 选项开关 -->
            <div class="合并-配置区块">
              <label class="合并-开关行">
                <input type="checkbox" :checked="配置.添加路径注释" @change="更新配置({ 添加路径注释: ($event.target as HTMLInputElement).checked })" />
                添加路径注释
              </label>
              <label class="合并-开关行">
                <input type="checkbox" :checked="配置.添加分隔" @change="更新配置({ 添加分隔: ($event.target as HTMLInputElement).checked })" />
                文件间添加 "---" 分隔
              </label>
            </div>
          </div>

          <!-- ===== 右侧：textarea 编辑器 ===== -->
          <div class="合并-右侧">
            <div class="合并-路径编辑器-容器">
              <textarea v-model="编辑文本" class="合并-路径编辑器" placeholder="# 输入文件路径（每行一条）&#10;src/main.ts&#10;src/App.vue" spellcheck="false" @keydown="处理编辑器键盘"></textarea>
            </div>

            <!-- 跳过文件摘要 -->
            <div v-if="跳过文件列表.length > 0" class="合并-跳过摘要">
              <div class="合并-跳过摘要-滚动区">
                <div class="合并-跳过摘要-标题">⚠️ {{ 跳过文件列表.length }} 个文件被跳过：</div>
                <div v-for="路径 in 跳过文件列表" :key="路径" class="合并-跳过摘要-项">{{ 路径 }}</div>
              </div>
            </div>

            <!-- 底部操作栏 -->
            <div class="合并-底部栏">
              <button class="合并-一键获取按钮" :disabled="!一键获取可用" :title="!一键获取可用 ? '等待扫描完成' : '从预览获取文件列表'" @click="emit('一键获取')">一键获取</button>
              <button class="合并-清空按钮" @click="emit('清空列表')">清空列表</button>
              <span class="合并-预计合并">预计合并：{{ 文件数 }} 个文件，总大小 {{ 预计合并大小 }}</span>
            </div>
          </div>
        </div>

        <!-- ======== 合并结果反馈 ======== -->
        <div v-if="合并结果" class="合并-结果行">
          <span :class="合并结果.成功 ? '合并-成功' : '合并-失败'">
            {{ 合并结果.成功 ? '✅' : '❌' }} 合并完成：共 {{ 合并结果.已合并数 ?? 0 }} 个文件
            <span v-if="合并结果.跳过数 && 合并结果.跳过数 > 0" class="合并-跳过数"> 跳过 {{ 合并结果.跳过数 }} 个</span>
          </span>
        </div>

        <!-- ======== 底部按钮 ======== -->
        <div class="合并-底部">
          <button class="合并-取消按钮" @click="emit('关闭')"><i class="fas fa-times"></i> 取消合并</button>
          <button class="合并-开始按钮" :disabled="合并中" @click="emit('开始合并')"><i class="fas fa-code-branch"></i> {{ 合并中 ? '合并中…' : '开始合并' }}</button>
          <button class="合并-打开输出按钮" @click="打开文件夹(配置.输出保存路径)"><i class="fas fa-folder-open"></i> 打开输出</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ======== 遮罩层 ======== */
.合并-遮罩 {
  position: fixed;
  inset: 0;
  z-index: 8000;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ======== 弹窗容器 ======== */
.合并-弹窗 {
  width: 80vw;
  height: 90vh;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ======== 标题栏 ======== */
.合并-标题栏 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.合并-标题 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.合并-关闭按钮 {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.合并-关闭按钮:hover {
  background: #f0f0f0;
  color: #333;
}

/* ======== 主体：左右两栏 ======== */
.合并-主体 {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ======== 左侧：控制参数区 ======== */
.合并-左侧 {
  width: 280px;
  flex-shrink: 0;
  padding: 16px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 栏标题行 */
.合并-栏标题行 {
  display: flex;
  align-items: center;
  gap: 6px;
  position: relative;
}

.合并-标题显示 {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: #555;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: default;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.合并-标题可编辑 {
  color: #333;
  cursor: pointer;
}
.合并-标题可编辑:hover {
  background: #f0f0f0;
}

.合并-标题输入 {
  flex: 1;
  padding: 4px 6px;
  border: 1px solid #0078d4;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  background: #fff;
}

.合并-标题操作 {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.合并-下拉按钮,
.合并-新建按钮 {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #666;
  font-size: 12px;
  cursor: pointer;
}
.合并-下拉按钮:hover,
.合并-新建按钮:hover {
  background: #f0f0f0;
  color: #333;
}
.合并-按钮置灰 {
  opacity: 0.4;
  cursor: not-allowed;
}
.合并-按钮置灰:hover {
  background: transparent;
  color: #666;
}

/* 下拉菜单 */
.合并-下拉菜单 {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 200px;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
}

.合并-下拉项 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  transition: background 0.1s;
}
.合并-下拉项:hover {
  background: #f0f7ff;
}
.合并-下拉项-激活 {
  background: #e3f2fd;
  font-weight: 600;
}

.合并-下拉项名 {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.合并-下拉删除 {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #ccc;
  font-size: 11px;
  cursor: pointer;
  margin-left: 6px;
}
.合并-下拉删除:hover {
  background: #ffebee;
  color: #d32f2f;
}

.合并-下拉清空 {
  padding: 6px 12px;
  text-align: center;
  color: #d32f2f;
  font-size: 12px;
  cursor: pointer;
  border-top: 1px solid #eee;
}
.合并-下拉清空:hover {
  background: #fff5f5;
}

/* 配置区块 */
.合并-配置区块 {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.合并-配置标题行 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.合并-配置标题 {
  font-size: 12px;
  font-weight: 600;
  color: #555;
}

.合并-打开按钮 {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #999;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}
.合并-打开按钮:hover {
  background: #e8f0fe;
  color: #0078d4;
}

.合并-配置行 {
  display: flex;
  align-items: center;
  gap: 4px;
}

.合并-配置标签 {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.合并-文件名显示 {
  flex: 1;
  font-size: 12px;
  color: #333;
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.合并-文件名显示:hover {
  background: #f0f0f0;
}

.合并-输出文件名输入 {
  flex: 1;
  padding: 3px 6px;
  border: 1px solid #0078d4;
  border-radius: 4px;
  font-size: 12px;
  outline: none;
}

.合并-格式行 {
  display: flex;
  gap: 12px;
}

.合并-格式选项 {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}
.合并-格式选项 input {
  margin: 0;
}
.合并-格式选中 {
  color: #0078d4;
  font-weight: 600;
}

.合并-路径显示 {
  font-size: 10px;
  color: #999;
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.3;
  padding: 4px 6px;
  background: #f5f5f5;
  border-radius: 3px;
  word-break: break-all;
}

.合并-输入框 {
  width: 100%;
  padding: 5px 8px;
  border: none;
  outline: none;
  font-family: inherit;
  font-size: 12px;
  background: transparent;
  box-sizing: border-box;
}

.合并-文件类型输入 {
  height: 100px;
  resize: vertical;
  border: 1px solid #ccc;
  border-radius: 6px;
  padding: 6px 8px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}
.合并-文件类型输入:focus {
  border-color: #0078d4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}

.合并-开关行 {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
}
.合并-开关行 input {
  margin: 0;
}

.合并-预计信息 {
  padding: 6px 10px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 12px;
  color: #666;
}

/* ======== 右侧：textarea 编辑器 ======== */
.合并-右侧 {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 10px;
}

.合并-路径编辑器-容器 {
  flex: 1;
  min-height: 0;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  /* padding-right: 2px; */
  padding: 2px 2px 2px 0px;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s;
  overflow: hidden;
  display: flex;
}
.合并-路径编辑器-容器:focus-within {
  border-color: #0078d4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}
.合并-路径编辑器 {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #333;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
}
.合并-路径编辑器::placeholder {
  color: #bbb;
}

.合并-跳过摘要 {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 8px 4px 8px 12px;
  background: #fff8e1;
  border: 1px solid #ffe082;
  border-radius: 6px;
  font-size: 12px;
  color: #e65100;
  line-height: 1.5;
  max-height: 120px;
  overflow: hidden;
}
.合并-跳过摘要-滚动区 {
  overflow-y: auto;
}
.合并-路径编辑器::-webkit-scrollbar,
.合并-跳过摘要-滚动区::-webkit-scrollbar {
  background: transparent;
  width: 6px;
}
.合并-路径编辑器::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}
.合并-路径编辑器::-webkit-scrollbar-thumb:hover {
  background: #999;
}
.合并-跳过摘要-滚动区::-webkit-scrollbar-thumb {
  background: #e0c97a;
  border-radius: 3px;
}
.合并-跳过摘要-滚动区::-webkit-scrollbar-thumb:hover {
  background: #c9a830;
}
.合并-跳过摘要-标题 {
  font-weight: 600;
}
.合并-跳过摘要-项 {
  padding-left: 16px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

/* 底部操作栏 */
.合并-底部栏 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.合并-一键获取按钮,
.合并-清空按钮 {
  padding: 5px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.合并-一键获取按钮:hover:not(:disabled),
.合并-清空按钮:hover {
  background: #f0f0f0;
  border-color: #aaa;
}
.合并-一键获取按钮:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.合并-预计合并 {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

/* ======== 合并结果行 ======== */
.合并-结果行 {
  padding: 8px 20px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.合并-成功 {
  color: #2e7d32;
  font-size: 13px;
}

.合并-失败 {
  color: #d32f2f;
  font-size: 13px;
}

.合并-跳过数 {
  color: #d32f2f;
}

/* ======== 底部按钮 ======== */
.合并-底部 {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.合并-打开输出按钮 {
  padding: 7px 16px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.合并-打开输出按钮:hover {
  background: #f5f5f5;
  border-color: #aaa;
}

.合并-取消按钮 {
  padding: 7px 20px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.合并-取消按钮:hover {
  background: #f5f5f5;
  border-color: #aaa;
}

.合并-开始按钮 {
  padding: 7px 20px;
  border: none;
  border-radius: 6px;
  background: #0078d4;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.合并-开始按钮:hover:not(:disabled) {
  background: #106ebe;
}
.合并-开始按钮:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ======== Glob 语法提示按钮与气泡 ======== */
.合并-glob提示区域 {
  position: relative;
}

.合并-glob提示按钮 {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #999;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.合并-glob提示按钮:hover {
  background: #e8f0fe;
  color: #0078d4;
}

.合并-glob气泡 {
  position: fixed;
  z-index: 8200;
  min-width: 270px;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.2);
  padding: 12px 14px;
}

.合并-glob气泡标题 {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.合并-glob表格 {
  width: 100%;
  border-collapse: collapse;
}
.合并-glob表格 td {
  padding: 4px 6px;
  font-size: 12px;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
}
.合并-glob表格 td:first-child {
  font-family: 'Consolas', 'Courier New', monospace;
  color: #333;
  white-space: nowrap;
  font-size: 12px;
}
.合并-glob表格 td code {
  font-size: 12px;
}
.合并-glob表格 tr:last-child td {
  border-bottom: none;
}

.合并-glob提示分隔 {
  height: 1px;
  background: #eee;
  margin: 8px 0;
}

.合并-glob提示脚注 {
  font-size: 12px;
  color: #999;
  text-align: center;
}
.合并-glob提示脚注 code {
  font-family: 'Consolas', 'Courier New', monospace;
  background: #f5f5f5;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 12px;
  color: #666;
}
</style>
