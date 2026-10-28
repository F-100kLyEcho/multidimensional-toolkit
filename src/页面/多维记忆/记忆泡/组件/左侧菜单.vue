<script setup lang="ts">
import { computed, ref } from 'vue'

interface 气泡数据 {
  id: string
  内容: string
  创建时间: number
}

const props = defineProps<{
  列表: 气泡数据[]
}>()

const emit = defineEmits<{
  选中: [年: number | null, 月: number | null]
}>()

/** 年/月归档树：年倒序、月倒序 */
const 归档 = computed(() => {
  const map = new Map<number, Map<number, number>>()
  for (const 项 of props.列表) {
    const d = new Date(项.创建时间)
    const 年 = d.getFullYear()
    const 月 = d.getMonth() + 1
    if (!map.has(年)) map.set(年, new Map())
    const 月map = map.get(年)!
    月map.set(月, (月map.get(月) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([年, 月map]) => ({
      年,
      月们: [...月map.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([月, 数]) => ({ 月, 数 })),
    }))
})

/** 展开的年集合，默认展开最新一年 */
const 初始年 = 归档.value[0]?.年
const 展开集 = ref<Set<number>>(new Set(初始年 !== undefined ? [初始年] : []))
function 已展开(年: number) {
  return 展开集.value.has(年)
}
function 切换展开(年: number) {
  if (展开集.value.has(年)) 展开集.value.delete(年)
  else 展开集.value.add(年)
  展开集.value = new Set(展开集.value)
}

/** 选中年/月：再次点击同一月取消 */
const 选中年 = ref<number | null>(null)
const 选中月 = ref<number | null>(null)

function 选月(年: number, 月: number) {
  if (选中年.value === 年 && 选中月.value === 月) {
    选中年.value = null
    选中月.value = null
    emit('选中', null, null)
  } else {
    选中年.value = 年
    选中月.value = 月
    emit('选中', 年, 月)
  }
}
</script>

<template>
  <div class="记忆泡-归档菜单">
    <div v-for="组 in 归档" :key="组.年" class="记忆泡-归档年">
      <button class="记忆泡-归档年头" @click="切换展开(组.年)">
        <i class="fas fa-chevron-right 记忆泡-归档箭头" :class="{ 展开: 已展开(组.年) }"></i>
        <span>{{ 组.年 }}年</span>
      </button>
      <div v-if="已展开(组.年)" class="记忆泡-归档月们">
        <button
          v-for="m in 组.月们"
          :key="m.月"
          class="记忆泡-归档月"
          :class="{ 选中: 选中年 === 组.年 && 选中月 === m.月 }"
          @click="选月(组.年, m.月)"
        >
          <span>{{ m.月 }}月</span>
          <span class="记忆泡-归档数">{{ m.数 }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.记忆泡-归档菜单 {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
}

.记忆泡-归档年头 {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
}

.记忆泡-归档年头:hover {
  background: var(--记忆泡-输入框背景);
}

.记忆泡-归档箭头 {
  font-size: 10px;
  transition: transform 0.15s;
}

.记忆泡-归档箭头.展开 {
  transform: rotate(90deg);
}

.记忆泡-归档月们 {
  display: flex;
  flex-direction: column;
  padding-left: 20px;
}

.记忆泡-归档月 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 8px;
  border: none;
  background: transparent;
  color: var(--记忆泡-弱文字);
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.记忆泡-归档月:hover {
  background: var(--记忆泡-输入框背景);
  color: var(--记忆泡-文字);
}

.记忆泡-归档月.选中 {
  background: var(--记忆泡-强调色);
  color: #fff;
}

.记忆泡-归档数 {
  opacity: 0.7;
  font-size: 11px;
}
</style>
