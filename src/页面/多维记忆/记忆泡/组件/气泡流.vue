<script setup lang="ts">
import { computed } from 'vue'
import MemoryBubble from './单个气泡.vue'

interface 气泡数据 {
  id: string
  内容: string
  创建时间: number
}

const props = defineProps<{
  列表: 气泡数据[]
}>()

function 格式化日期(时间: number): string {
  const d = new Date(时间)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function 格式化时间(时间: number): string {
  const d = new Date(时间)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 按日期分组（单列 + 日期分隔） */
const 分组 = computed(() => {
  const 结果: { 日期: string; 气泡: 气泡数据[] }[] = []
  for (const 项 of props.列表) {
    const 日期 = 格式化日期(项.创建时间)
    let 组 = 结果.find((g) => g.日期 === 日期)
    if (!组) {
      组 = { 日期, 气泡: [] }
      结果.push(组)
    }
    组.气泡.push(项)
  }
  return 结果
})
</script>

<template>
  <div class="记忆泡-气泡流">
    <div v-if="列表.length === 0" class="记忆泡-空状态">还没有记录，写下第一条吧</div>
    <template v-for="组 in 分组" :key="组.日期">
      <div class="记忆泡-日期分隔">{{ 组.日期 }}</div>
      <MemoryBubble v-for="项 in 组.气泡" :key="项.id" :内容="项.内容" :时间="格式化时间(项.创建时间)" />
    </template>
  </div>
</template>

<style scoped>
.记忆泡-气泡流 {
  display: flex;
  flex-direction: column;
}

.记忆泡-日期分隔 {
  text-align: center;
  font-size: 11px;
  color: var(--记忆泡-弱文字);
  margin: 8px 0 14px;
}

.记忆泡-空状态 {
  text-align: center;
  color: var(--记忆泡-弱文字);
  font-size: 13px;
  padding: 48px 0;
}
</style>