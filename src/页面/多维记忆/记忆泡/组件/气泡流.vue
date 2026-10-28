<script setup lang="ts">
import { computed } from 'vue'
import MemoryBubble from './单个气泡.vue'

interface 气泡数据 {
  id: string
  场景: string
  标题?: string
  内容: string
  创建时间: number
}

const props = defineProps<{
  列表: 气泡数据[]
}>()

/** 新在上旧在下：按创建时间倒序 */
const 倒序列表 = computed(() => [...props.列表].sort((a, b) => b.创建时间 - a.创建时间))
</script>

<template>
  <div class="记忆泡-气泡流">
    <div v-if="列表.length === 0" class="记忆泡-空状态">还没有记录，写下第一条吧</div>
    <MemoryBubble
      v-for="项 in 倒序列表"
      :key="项.id"
      :场景="项.场景"
      :标题="项.标题"
      :内容="项.内容"
      :创建时间="项.创建时间"
    />
  </div>
</template>

<style scoped>
.记忆泡-气泡流 {
  display: flex;
  flex-direction: column;
}

.记忆泡-空状态 {
  text-align: center;
  color: var(--记忆泡-弱文字);
  font-size: 13px;
  padding: 48px 0;
}
</style>
