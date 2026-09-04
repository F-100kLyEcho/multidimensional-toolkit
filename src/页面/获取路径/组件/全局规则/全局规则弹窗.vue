<script setup lang="ts">
/**
 * 规则配置弹窗
 *
 * 功能：
 * - Esc 关闭、点击遮罩关闭、右上角关闭按钮
 * - 遮罩完全透明，无存在感
 * - 左侧：存储路径展示（项目规则/全局规则/扫描输出）+ 扫描输出格式
 * - 右侧复用 ExcludePanel 管理全局规则
 * - 保存配置时持久化到工作空间
 * - 打开弹窗时自动加载已有全局规则和路径信息
 */
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import ExcludePanel from '../排除项/排除项面板.vue'
import { 使用全局规则 } from '../../组合式函数/使用全局规则'
import { 规则转文本, 文本转规则 } from '../../组合式函数/使用排除规则'

defineOptions({
  name: 'GlobalRuleDialog',
})

const props = defineProps<{
  /** 是否显示弹窗 */
  显示: boolean
  /** 当前项目路径（用于获取项目规则路径和打开文件夹） */
  项目路径?: string
}>()

const emit = defineEmits<{
  /** 关闭弹窗 */
  关闭: []
}>()

/** 判断是否在 Electron 环境中 */
const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

// ==================== 全局规则数据 ====================

const { 精确文件夹排除列表, 递归文件夹排除列表, 精确文件排除列表, 递归文件排除列表, 豁免列表, 通配符列表, 占位文件夹列表, 有序规则列表, 清除所有排除, 重建统一顺序列表 } = 使用全局规则()

const 全局规则文本 = computed(() => 规则转文本(有序规则列表.value))

// ==================== 存储路径 ====================

const 项目规则路径 = ref('')
const 全局规则路径 = ref('')
const 扫描输出路径 = ref('')

// ==================== 扫描输出配置 ====================

const 扫描输出格式 = ref<'txt' | 'md'>('txt')

/** 打开文件夹 */
async function 打开文件夹(路径: string) {
  if (!是否Electron环境 || !路径) return
  await window.electronAPI.打开文件夹(路径)
}

// ==================== 加载/保存 ====================

/** 加载全局规则 */
async function 加载全局规则() {
  if (!是否Electron环境) return
  const 响应 = await window.electronAPI.读取全局Mdignore()
  if (响应.成功 && 响应.规则) {
    精确文件夹排除列表.value = 响应.规则.精确文件夹排除列表 ?? []
    递归文件夹排除列表.value = 响应.规则.递归文件夹排除列表 ?? []
    精确文件排除列表.value = 响应.规则.精确文件排除列表 ?? []
    递归文件排除列表.value = 响应.规则.递归文件排除列表 ?? []
    豁免列表.value = 响应.规则.豁免列表 ?? []
    通配符列表.value = 响应.规则.通配符列表 ?? []
    占位文件夹列表.value = 响应.规则.占位文件夹列表 ?? []
    重建统一顺序列表()
  }
}

/** 加载全局规则配置和存储路径 */
async function 加载配置() {
  if (!是否Electron环境) return
  const [配置响应, 路径响应] = await Promise.all([window.electronAPI.读取全局规则(), window.electronAPI.获取规则存储路径(props.项目路径)])
  if (配置响应.成功 && 配置响应.规则) {
    扫描输出格式.value = 配置响应.规则.扫描输出格式 || 'txt'
  }
  if (路径响应.成功) {
    项目规则路径.value = 路径响应.项目规则路径 ?? ''
    全局规则路径.value = 路径响应.全局规则路径 ?? ''
    扫描输出路径.value = 路径响应.扫描输出路径 ?? ''
  }
}

/** 保存全局规则 */
async function 保存全局规则到后端() {
  if (!是否Electron环境) return
  const 规则数据 = JSON.parse(
    JSON.stringify({
      精确文件夹排除列表: 精确文件夹排除列表.value,
      递归文件夹排除列表: 递归文件夹排除列表.value,
      精确文件排除列表: 精确文件排除列表.value,
      递归文件排除列表: 递归文件排除列表.value,
      豁免列表: 豁免列表.value,
      通配符列表: 通配符列表.value,
      占位文件夹列表: 占位文件夹列表.value,
    }),
  )
  await window.electronAPI.保存全局Mdignore(规则数据)
}

/** 保存全局规则配置 */
async function 保存全局规则配置() {
  if (!是否Electron环境) return
  const 配置数据 = JSON.parse(
    JSON.stringify({
      默认排除模式: 'none',
      最大扫描深度: 0,
      扫描忽略列表: [],
      扫描输出格式: 扫描输出格式.value,
    }),
  )
  await window.electronAPI.保存全局规则(配置数据)
}

// ==================== 事件处理 ====================

async function 处理保存全局规则文本(文本: string) {
  const { 精确文件夹, 递归文件夹, 精确文件, 递归文件, 占位文件夹, 豁免, 通配符 } = 文本转规则(文本)
  精确文件夹排除列表.value = 精确文件夹
  递归文件夹排除列表.value = 递归文件夹
  精确文件排除列表.value = 精确文件
  递归文件排除列表.value = 递归文件
  占位文件夹列表.value = 占位文件夹
  豁免列表.value = 豁免
  通配符列表.value = 通配符
  重建统一顺序列表()
  await 保存全局规则到后端()
}

// ==================== 快捷键 ====================

function 处理键盘(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.显示) {
    emit('关闭')
  }
}

watch(
  () => props.显示,
  async (新值) => {
    if (新值) {
      await Promise.all([加载全局规则(), 加载配置()])
    }
  },
)

watch(扫描输出格式, async () => {
  if (props.显示) {
    await 保存全局规则配置()
  }
})

onMounted(() => {
  window.addEventListener('keydown', 处理键盘)
})

onUnmounted(() => {
  window.removeEventListener('keydown', 处理键盘)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="显示" class="规则配置-遮罩" @mousedown.self="emit('关闭')">
      <div class="规则配置-弹窗">
        <div class="规则配置-标题栏">
          <span class="规则配置-标题">规则配置</span>
          <button class="规则配置-关闭按钮" title="关闭" @click="emit('关闭')">✕</button>
        </div>

        <div class="规则配置-主体">
          <div class="规则配置-左侧">
            <!-- 项目规则存储位置 -->
            <div class="存储位置区块">
              <div class="存储位置-标题行">
                <span class="存储位置-标题">项目规则</span>
                <button class="存储位置-打开按钮" title="打开项目规则文件夹" @click="打开文件夹(项目规则路径)">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="存储位置-路径">{{ 项目规则路径 || '加载中…' }}</div>
            </div>

            <!-- 全局规则存储位置 -->
            <div class="存储位置区块">
              <div class="存储位置-标题行">
                <span class="存储位置-标题">全局规则</span>
                <button class="存储位置-打开按钮" title="打开全局规则文件夹" @click="打开文件夹(全局规则路径)">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="存储位置-路径">{{ 全局规则路径 || '加载中…' }}</div>
            </div>

            <!-- 扫描输出 -->
            <div class="存储位置区块">
              <div class="存储位置-标题行">
                <span class="存储位置-标题">保存路径</span>
                <button class="存储位置-打开按钮" title="打开输出文件夹" @click="打开文件夹(扫描输出路径)">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div class="存储位置-路径">{{ 扫描输出路径 || '加载中…' }}</div>
              <div class="扫描输出-格式行">
                <span class="扫描输出-格式标签">输出格式：</span>
                <label class="扫描输出-格式选项" :class="{ '扫描输出-格式选中': 扫描输出格式 === 'txt' }">
                  <input type="radio" v-model="扫描输出格式" value="txt" />
                  .txt
                </label>
                <label class="扫描输出-格式选项" :class="{ '扫描输出-格式选中': 扫描输出格式 === 'md' }">
                  <input type="radio" v-model="扫描输出格式" value="md" />
                  .md
                </label>
              </div>
            </div>
          </div>

          <div class="规则配置-右侧">
            <ExcludePanel :规则文本="全局规则文本" :显示升维="false" @保存规则="处理保存全局规则文本" @清除所有排除="清除所有排除" />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.规则配置-遮罩 {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.规则配置-弹窗 {
  width: 820px;
  max-width: 90vw;
  height: 90vh;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.规则配置-标题栏 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.规则配置-标题 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.规则配置-关闭按钮 {
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
.规则配置-关闭按钮:hover {
  background: #f0f0f0;
  color: #333;
}

.规则配置-主体 {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.规则配置-左侧 {
  width: 280px;
  flex-shrink: 0;
  padding: 16px;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.存储位置区块 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.存储位置-标题行 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.存储位置-标题 {
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.存储位置-打开按钮 {
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
.存储位置-打开按钮:hover {
  background: #e8f0fe;
  color: #0078d4;
}

.存储位置-路径 {
  font-size: 11px;
  color: #999;
  font-family: 'Consolas', 'Courier New', monospace;
  line-height: 1.4;
  padding: 6px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  word-break: break-all;
}

.扫描输出-格式行 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.扫描输出-格式标签 {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
}

.扫描输出-格式选项 {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}
.扫描输出-格式选项 input {
  margin: 0;
}
.扫描输出-格式选中 {
  color: #0078d4;
  font-weight: 600;
}

.规则配置-右侧 {
  flex: 1;
  padding: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

</style>
