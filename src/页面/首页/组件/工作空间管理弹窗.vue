<template>
  <Teleport to="body">
    <div v-if="显示" class="遮罩" @mousedown.self="关闭弹窗">
      <div class="弹窗">
        <!-- 标题栏 -->
        <div class="标题栏">
          <span class="标题">工作空间管理</span>
          <button class="关闭按钮" @click="关闭弹窗">✕</button>
        </div>

        <!-- 内容区 -->
        <div class="内容区">
          <!-- 当前工作空间 -->
          <div class="当前工作空间">
            当前工作空间：<span class="高亮">{{ 当前工作空间名称 }}</span>
          </div>

          <!-- 非 Electron 提示 -->
          <div v-if="!是否可用" class="非Electron提示">此功能仅在桌面版可用，以下为静态示例。</div>

          <!-- 工作空间列表 -->
          <div class="列表区域">
            <div class="列表标题">工作空间列表：<span class="列表提示">双击名称可重命名</span></div>
            <div class="列表">
              <div v-for="w in 工作空间列表" :key="w.名称" class="列表行" :class="{ 当前行: w.名称 === 当前工作空间名称 }">
                <div class="列表行信息">
                  <span v-if="编辑名称 !== w.名称" class="名称" @dblclick="开始编辑名称(w.名称)">{{ w.名称 }}</span>
                  <input v-else v-model="编辑值" class="名称输入框" data-重命名输入框 @blur="提交重命名" @keydown.enter="提交重命名" @keydown.escape="取消编辑" @click.stop />
                  <span class="路径">{{ w.路径 }}</span>
                </div>
                <div class="列表行操作">
                  <button class="操作按钮" title="打开文件夹" :disabled="!是否可用" @click="打开文件夹(w.路径)"><i class="fas fa-folder-open"></i> 打开</button>
                  <button class="操作按钮" title="复制工作空间" :disabled="!是否可用" @click="$emit('打开复制', w.名称)"><span class="fas">📋</span> 复制</button>
                  <button class="操作按钮 删除按钮" title="删除工作空间" :disabled="!是否可用 || 工作空间列表.length <= 1" @click="确认删除(w.名称)">✕</button>
                </div>
              </div>
            </div>
          </div>

          <!-- 新建工作空间 -->
          <div class="新建区域">
            <div class="新建标题">新建工作空间</div>
            <div class="新建表单">
              <input v-model="新名称" class="输入框" placeholder="名称" :disabled="!是否可用" />
              <input v-model="新路径" class="输入框 路径输入框" placeholder="路径" :disabled="!是否可用" />
              <button class="操作按钮" :disabled="!是否可用" @click="选择目录">选择目录</button>
              <button class="操作按钮 确认按钮" :disabled="!是否可用 || !新名称 || !新路径" @click="新建工作空间">创建</button>
            </div>
          </div>

          <!-- 路径配置 -->
          <div class="路径配置区域" v-if="是否可用">
            <div class="路径配置信息">
              路径配置：<span class="配置路径">{{ 配置文件路径 || '加载中...' }}</span>
              <button v-if="配置文件路径" class="打开路径按钮" title="打开文件所在目录" @click="打开配置文件目录"><i class="fas fa-folder-open"></i></button>
            </div>
            <div class="提示">提示：卸载后不会自动删除此文件，请手动清理。</div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="底部按钮区">
          <button class="操作按钮" @click="关闭弹窗">关闭</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

// ==================== Props & Emits ====================

defineProps<{
  显示: boolean
  工作空间列表: { 名称: string; 路径: string }[]
  当前工作空间名称: string
}>()

const emit = defineEmits<{
  关闭: []
  刷新列表: []
  打开复制: [源名称: string]
}>()

// ==================== 状态 ====================

const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined
const 是否可用 = 是否Electron环境

const 新名称 = ref('')
const 新路径 = ref('')
const 配置文件路径 = ref('')

// ==================== 重命名状态 ====================

const 编辑名称 = ref('')
const 编辑值 = ref('')

// ==================== 重命名方法 ====================

function 开始编辑名称(名称: string) {
  编辑名称.value = 名称
  编辑值.value = 名称
  nextTick(() => {
    const input = document.querySelector<HTMLInputElement>('[data-重命名输入框]')
    if (input) {
      input.focus()
      input.select()
    }
  })
}

async function 提交重命名() {
  if (!编辑名称.value || !编辑值.value || 编辑名称.value === 编辑值.value) {
    取消编辑()
    return
  }
  const r = await window.electronAPI.__invokeIPC('首页-重命名工作空间', {
    旧名称: 编辑名称.value,
    新名称: 编辑值.value,
  })
  if (r.成功) {
    emit('刷新列表')
  } else {
    alert(r.错误信息 || '重命名失败')
  }
  取消编辑()
}

function 取消编辑() {
  编辑名称.value = ''
  编辑值.value = ''
}

// ==================== 生命周期 ====================

onMounted(async () => {
  if (!是否Electron环境) return

  try {
    const r = await window.electronAPI.__invokeIPC('首页-获取配置文件路径')
    if (r.成功) {
      配置文件路径.value = r.路径
    }
  } catch {
    // 忽略
  }
})

// ==================== 事件处理 ====================

async function 新建工作空间() {
  if (!新名称.value || !新路径.value) return
  const r = await window.electronAPI.__invokeIPC('首页-新建工作空间', { 名称: 新名称.value, 路径: 新路径.value })
  if (r.成功) {
    新名称.value = ''
    新路径.value = ''
    emit('刷新列表')
  } else {
    alert(r.错误信息 || '新建失败')
  }
}

async function 确认删除(名称: string) {
  if (!confirm(`确定要删除工作空间「${名称}」吗？\n这将物理删除该目录下的所有文件。`)) return
  const r = await window.electronAPI.__invokeIPC('首页-删除工作空间', { 名称 })
  if (r.成功) {
    emit('刷新列表')
  } else {
    alert(r.错误信息 || '删除失败')
  }
}

async function 打开文件夹(路径: string) {
  await window.electronAPI.__invokeIPC('首页-打开文件夹', { 路径 })
}

async function 打开配置文件目录() {
  await window.electronAPI.__invokeIPC('首页-打开文件所在目录', { 文件路径: 配置文件路径.value })
}

async function 选择目录() {
  const r = await window.electronAPI.__invokeIPC('首页-选择目录', { 标题: '选择工作空间目录' })
  if (r.成功 && r.路径) {
    新路径.value = r.路径
  }
}

/** 关闭弹窗 */
function 关闭弹窗() {
  emit('关闭')
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
  z-index: 9999;
  background: transparent;
  display: flex;
  justify-content: center;
  align-items: center;
}

.弹窗 {
  background: #1e1e1e;
  border: 1px solid #383838;
  border-radius: 10px;
  width: 640px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.当前工作空间 {
  font-size: 13px;
  color: #aaa;
}

.高亮 {
  color: #4fc3f7;
  font-weight: 500;
}

.非Electron提示 {
  background: #332b00;
  color: #ffd54f;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}

.列表区域 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.列表标题 {
  font-size: 13px;
  color: #aaa;
}

.列表 {
  border: 1px solid #383838;
  border-radius: 6px;
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

.列表行 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid #2a2a2a;
  transition: background 0.15s;
}
.列表行:last-child {
  border-bottom: none;
}
.列表行:hover {
  background: rgba(255, 255, 255, 0.03);
}
.列表行.当前行 {
  background: rgba(0, 120, 212, 0.12);
}

.列表行信息 {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.列表提示 {
  font-size: 11px;
  color: #666;
  margin-left: 4px;
}

.名称 {
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 500;
  cursor: default;
}

.名称输入框 {
  padding: 2px 6px;
  border: 1px solid #0078d4;
  border-radius: 4px;
  background: #1a1a1a;
  color: #e0e0e0;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  width: 150px;
}

.路径 {
  font-size: 11px;
  color: #777;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.列表行操作 {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
}

.操作按钮 {
  padding: 4px 10px;
  border: 1px solid #444;
  border-radius: 5px;
  background: #2a2a2a;
  color: #ccc;
  font-size: 12px;
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

.删除按钮 {
  color: #e06c6c;
  border-color: #553333;
}
.删除按钮:hover:not(:disabled) {
  background: #4a2a2a;
  color: #ff8080;
}

.确认按钮 {
  background: #0078d4;
  border-color: #0078d4;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #1a8cd8;
}

.fas {
  font-size: 12px;
}

.新建区域 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: #222;
  border-radius: 6px;
}

.新建标题 {
  font-size: 13px;
  color: #aaa;
}

.新建表单 {
  display: flex;
  gap: 8px;
  align-items: center;
}

.输入框 {
  padding: 5px 8px;
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

.路径输入框 {
  flex: 1;
}

.路径配置区域 {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid #333;
}

.路径配置信息 {
  font-size: 12px;
  color: #888;
  display: flex;
  align-items: center;
  gap: 6px;
}

.配置路径 {
  color: #999;
  word-break: break-all;
}

.打开路径按钮 {
  background: none;
  border: 1px solid #444;
  border-radius: 4px;
  color: #aaa;
  font-size: 12px;
  cursor: pointer;
  padding: 1px 5px;
  flex-shrink: 0;
  line-height: 1;
}
.打开路径按钮:hover {
  background: #333;
  color: #e0e0e0;
}

.提示 {
  font-size: 11px;
  color: #666;
}

.底部按钮区 {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
  border-top: 1px solid #333;
}
</style>
