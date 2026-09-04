<template>
  <Teleport to="body">
    <div v-if="显示" class="遮罩" @mousedown.self="关闭弹窗">
      <div class="弹窗">
        <!-- 标题栏 -->
        <div class="标题栏">
          <span class="标题">复制工作空间</span>
          <button class="关闭按钮" @click="关闭弹窗">✕</button>
        </div>

        <!-- 内容区 -->
        <div class="内容区">
          <!-- 复制结果（成功/失败后显示） -->
          <div v-if="结果信息" class="结果区域" :class="结果成功 ? '成功' : '失败'">
            <div class="结果文字">{{ 结果信息 }}</div>
            <!-- 跳过的文件列表 -->
            <div v-if="跳过文件列表.length > 0" class="跳过区域">
              <div class="跳过标题">跳过 {{ 跳过文件列表.length }} 个文件（被占用无法读取）：</div>
              <div class="跳过列表">
                <div v-for="(文件, 索引) in 跳过文件列表" :key="索引" class="跳过行">
                  {{ 文件 }}
                </div>
              </div>
              <div class="跳过提示">被跳过的临时文件（如 Cookies、Cache 等）由 Electron 运行时自动生成，在新工作空间中会按需创建，不影响正常使用。</div>
            </div>
          </div>

          <!-- 表单（结果为空时显示） -->
          <template v-if="!结果信息">
            <div class="字段">
              <span class="字段标签">源工作空间：</span>
              <span class="字段值">{{ 源名称 }}</span>
            </div>

            <div class="字段">
              <span class="字段标签">新名称：</span>
              <input v-model="新名称" class="输入框" placeholder="输入新工作空间名称" :disabled="!是否可用" />
            </div>

            <div class="字段">
              <span class="字段标签">新路径：</span>
              <div class="路径输入行">
                <input v-model="新路径" class="输入框 路径输入框" placeholder="输入新路径" :disabled="!是否可用" />
                <button class="操作按钮" :disabled="!是否可用" @click="选择目录">选择目录</button>
              </div>
            </div>
          </template>
        </div>

        <!-- 底部按钮 -->
        <div class="底部按钮区">
          <button v-if="!结果信息" class="操作按钮" @click="关闭弹窗">取消</button>
          <button v-if="!结果信息" class="操作按钮 确认按钮" :disabled="!是否可用 || !新名称 || !新路径" @click="执行复制">确认复制</button>
          <button v-if="结果失败" class="操作按钮 确认按钮" @click="重试">重试</button>
          <button v-if="结果成功" class="操作按钮 确认按钮" @click="完成关闭">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// ==================== Props & Emits ====================

const props = defineProps<{
  显示: boolean
  源名称: string
}>()

const emit = defineEmits<{
  关闭: []
  复制完成: []
}>()

// ==================== 状态 ====================

const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined
const 是否可用 = 是否Electron环境

const 新名称 = ref('')
const 新路径 = ref('')

/** 复制结果信息 */
const 结果信息 = ref('')
const 结果成功 = ref(false)
const 结果失败 = ref(false)
const 跳过文件列表 = ref<string[]>([])

// ==================== 重置 ====================

function 重置() {
  新名称.value = ''
  新路径.value = ''
  结果信息.value = ''
  结果成功.value = false
  结果失败.value = false
  跳过文件列表.value = []
}

// ==================== 事件处理 ====================

async function 选择目录() {
  const r = await window.electronAPI.__invokeIPC('首页-选择目录', { 标题: '选择新工作空间目录' })
  if (r.成功 && r.路径) {
    新路径.value = r.路径
  }
}

async function 执行复制() {
  if (!新名称.value || !新路径.value) return
  const r = await window.electronAPI.__invokeIPC('首页-复制工作空间', {
    源名称: props.源名称,
    新名称: 新名称.value,
    新路径: 新路径.value,
  })
  if (r.成功) {
    结果成功.value = true
    跳过文件列表.value = r.跳过文件列表 || []
    if (跳过文件列表.value.length > 0) {
      结果信息.value = `复制完成，跳过 ${跳过文件列表.value.length} 个被占用的文件。`
    } else {
      结果信息.value = '复制完成。'
    }
    emit('复制完成')
  } else {
    结果失败.value = true
    结果信息.value = r.错误信息 || '复制失败'
  }
}

function 重试() {
  重置()
}

function 完成关闭() {
  重置()
  emit('关闭')
}

function 关闭弹窗() {
  if (结果信息.value) {
    完成关闭()
  } else {
    emit('关闭')
  }
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 关闭弹窗()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))
</script>

<style scoped>
.遮罩 {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
}

.弹窗 {
  background: #1e1e1e;
  border: 1px solid #383838;
  border-radius: 10px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.标题栏 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #333;
}

.标题 {
  font-size: 15px;
  font-weight: 600;
  color: #e0e0e0;
}

.关闭按钮 {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.关闭按钮:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.内容区 {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.字段 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.字段标签 {
  font-size: 13px;
  color: #aaa;
}

.字段值 {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
}

.输入框 {
  padding: 6px 10px;
  border: 1px solid #444;
  border-radius: 5px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.输入框:focus {
  border-color: #0078d4;
}
.输入框:disabled {
  opacity: 0.35;
}

.路径输入行 {
  display: flex;
  gap: 8px;
}

.路径输入框 {
  flex: 1;
}

/* 结果区域 */
.结果区域 {
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.结果区域.成功 {
  background: #142820;
  border: 1px solid #2a4a3a;
}
.结果区域.失败 {
  background: #281414;
  border: 1px solid #4a2a2a;
}

.结果文字 {
  font-size: 13px;
  line-height: 1.5;
}
.成功 .结果文字 {
  color: #80cba0;
}
.失败 .结果文字 {
  color: #e08a8a;
}

/* 跳过文件列表 */
.跳过区域 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.跳过标题 {
  font-size: 12px;
  color: #aaa;
}

.跳过列表 {
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.跳过行 {
  font-size: 11px;
  color: #999;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  word-break: break-all;
}

.跳过提示 {
  font-size: 11px;
  color: #777;
  line-height: 1.5;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

/* 操作按钮 */
.操作按钮 {
  padding: 5px 12px;
  border: 1px solid #444;
  border-radius: 5px;
  background: #2a2a2a;
  color: #ccc;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;
}
.操作按钮:hover:not(:disabled) {
  background: #3a3a3a;
}
.操作按钮:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.确认按钮 {
  background: #0078d4;
  border-color: #0078d4;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #1a8cd8;
}

/* 底部按钮区 */
.底部按钮区 {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid #333;
}
</style>
