<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  发送: [内容: string]
}>()

const 文本 = ref('')

function 提交() {
  if (!文本.value.trim()) return
  emit('发送', 文本.value)
  文本.value = ''
}

/** 回车发送，Shift+回车换行 */
function 处理按键(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    提交()
  }
}
</script>

<template>
  <div class="记忆泡-输入框">
    <textarea
      v-model="文本"
      class="记忆泡-输入文本"
      rows="1"
      placeholder="写点什么…（回车发送 / Shift+回车换行）"
      @keydown="处理按键"
    />
    <button class="记忆泡-发送按钮" @click="提交">发送</button>
  </div>
</template>

<style scoped>
.记忆泡-输入框 {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.记忆泡-输入文本 {
  flex: 1;
  resize: none;
  max-height: 120px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--记忆泡-气泡边框);
  background: var(--记忆泡-输入框背景);
  color: var(--记忆泡-文字);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s;
}

.记忆泡-输入文本:focus {
  border-color: var(--记忆泡-强调色);
}

.记忆泡-发送按钮 {
  padding: 10px 18px;
  border: none;
  border-radius: 10px;
  background: var(--记忆泡-强调色);
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.记忆泡-发送按钮:hover {
  opacity: 0.9;
}
</style>