<script setup lang="ts">
import { ref, watch } from 'vue'

defineOptions({
  name: 'ExcludePanel',
})

const props = defineProps<{
  规则文本: string
  显示升维?: boolean
}>()

const emit = defineEmits<{
  保存规则: [文本: string]
  清除所有排除: []
}>()

const 编辑文本 = ref(props.规则文本)
const 显示语法弹窗 = ref(false)

watch(
  () => props.规则文本,
  (新值) => {
    编辑文本.value = 新值
  },
)

function 处理保存() {
  emit('保存规则', 编辑文本.value)
}

function 处理清除() {
  编辑文本.value = ''
  emit('清除所有排除')
}

function 处理键盘(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    处理保存()
  }
}
</script>

<template>
  <div class="排除项面板">
    <textarea v-model="编辑文本" class="规则编辑器" placeholder="# 输入排除规则（每行一条）&#10;# 也可右键文件/文件夹快速添加规则&#10;&#10;名称/        精确文件夹排除（仅当前层级）&#10;**名称/      递归文件夹排除（所有层级）&#10;**名称        递归文件排除（所有层级）&#10;名称.扩展    精确文件排除&#10;*.扩展       通配符排除&#10;!名称         豁免（强制保留）&#10;@名称         占位文件夹（保留目录，排除内容）&#10;#             注释&#10;&#10;示例：&#10;node_modules/&#10;*.log&#10;!src/重要.ts&#10;@src/old" spellcheck="false" @keydown="处理键盘"></textarea>

    <div class="编辑器-底部">
      <div class="底部-按钮组">
        <button class="清除全部按钮" :disabled="!编辑文本.trim()" @click="处理清除">清除所有排除</button>
        <button class="保存按钮" @click="处理保存">保存</button>
      </div>
      <button class="语法提示按钮" :class="{ '语法提示按钮-激活': 显示语法弹窗 }" title="语法帮助" @click="显示语法弹窗 = !显示语法弹窗">
        <i class="fas fa-question-circle"></i>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="显示语法弹窗" class="语法弹窗-遮罩" @mousedown.self="显示语法弹窗 = false">
        <div class="语法弹窗">
          <div class="语法弹窗-标题栏">
            <span class="语法弹窗-标题">排除规则语法</span>
            <button class="语法弹窗-关闭" @click="显示语法弹窗 = false">✕</button>
          </div>
          <div class="语法弹窗-内容">
            <div class="语法弹窗-行"><code>名称/</code> 精确文件夹排除（仅当前层级）</div>
            <div class="语法弹窗-行"><code>**名称/</code> 递归文件夹排除（所有层级）</div>
            <div class="语法弹窗-行"><code>**名称</code> 递归文件排除（所有层级）</div>
            <div class="语法弹窗-行"><code>名称.扩展</code> 精确文件排除</div>
            <div class="语法弹窗-行"><code>*.扩展</code> 通配符排除</div>
            <div class="语法弹窗-行"><code>!名称</code> 豁免（强制保留）</div>
            <div class="语法弹窗-行"><code>@名称</code> 占位文件夹（保留目录，排除内容）</div>
            <div class="语法弹窗-行"><code>#</code> 注释</div>
            <div class="语法弹窗-行">规则按行顺序执行，后写优先</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.排除项面板 {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-size: 13px;
  gap: 8px;
}

.规则编辑器 {
  flex: 1;
  min-height: 0;
  padding: 10px 12px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  resize: none;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.规则编辑器:focus {
  border-color: #0078d4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.15);
}
.规则编辑器::placeholder {
  color: #bbb;
}

.编辑器-底部 {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
}

.底部-按钮组 {
  display: flex;
  gap: 6px;
}

.语法提示按钮 {
  position: absolute;
  right: 0;
  width: 24px;
  height: 24px;
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
.语法提示按钮:hover {
  color: #0078d4;
  background: #e8f0fe;
}
.语法提示按钮-激活 {
  color: #0078d4;
  background: #e8f0fe;
}

.清除全部按钮 {
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  color: #d32f2f;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}
.清除全部按钮:hover:not(:disabled) {
  background: #ffebee;
  border-color: #ef5350;
}
.清除全部按钮:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.保存按钮 {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #0078d4;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.保存按钮:hover {
  background: #106ebe;
}

.语法弹窗-遮罩 {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.语法弹窗 {
  width: 380px;
  max-width: 90vw;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.语法弹窗-标题栏 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e0e0e0;
}

.语法弹窗-标题 {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.语法弹窗-关闭 {
  width: 26px;
  height: 26px;
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
.语法弹窗-关闭:hover {
  background: #f0f0f0;
  color: #333;
}

.语法弹窗-内容 {
  padding: 16px;
  font-size: 16px;
  line-height: 2;
  color: #444;
}

.语法弹窗-行 code {
  background: #e8eaed;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 16px;
  color: #333;
}
</style>
