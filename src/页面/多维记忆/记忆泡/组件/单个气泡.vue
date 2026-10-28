<script setup lang="ts">
import { computed, ref } from 'vue'
import { 拆分场景 } from '../../工具/场景'

const props = defineProps<{
  场景: string
  标题?: string
  内容: string
  创建时间: number
}>()

/** 场景拆分：主场景 + 辅助标签 */
const 场景部分 = computed(() => 拆分场景(props.场景))

/** 头像按内容类型：图片 → fa-image，其余 → fa-language */
const 内容图标 = computed(() => {
  if (/^(data:image|https?:\/\/.+\.(png|jpg|jpeg|gif|webp|svg))/i.test(props.内容)) {
    return 'fas fa-image'
  }
  return 'fas fa-language'
})

/** 格式化：10月28号 上午 11:00 */
const 日期时间 = computed(() => {
  const d = new Date(props.创建时间)
  const 月 = d.getMonth() + 1
  const 日 = d.getDate()
  const 时 = d.getHours()
  const 分 = String(d.getMinutes()).padStart(2, '0')
  const 段 = 时 < 12 ? '上午' : '下午'
  const 时12 = 时 % 12 === 0 ? 12 : 时 % 12
  return `${月}月${日}号 ${段} ${时12}:${分}`
})

/** 省略号菜单（编辑/删除，暂仅 UI）：定位到鼠标点击处 */
const 菜单显示 = ref(false)
const 菜单x = ref(0)
const 菜单y = ref(0)
function 切换菜单(e: MouseEvent) {
  菜单显示.value = !菜单显示.value
  if (菜单显示.value) {
    const 菜单宽 = 104
    const 菜单高 = 70
    菜单x.value = e.clientX + 菜单宽 > window.innerWidth ? e.clientX - 菜单宽 : e.clientX
    菜单y.value = e.clientY + 菜单高 > window.innerHeight ? e.clientY - 菜单高 : e.clientY
  }
}
</script>

<template>
  <div class="记忆泡-气泡卡">
    <div class="记忆泡-头像区">
      <i class="记忆泡-头像" :class="内容图标"></i>
    </div>
    <div class="记忆泡-内容区">
      <div class="记忆泡-信息层">
        <div class="记忆泡-场景行">
          <span class="记忆泡-场景">
            场景：<span v-if="场景部分.主" class="记忆泡-主场景">{{ 场景部分.主 }}</span><span v-else class="记忆泡-空场景">空</span><span v-for="t in 场景部分.辅" :key="t" class="记忆泡-辅助标签">{{ t }}</span>
          </span>
          <div class="记忆泡-气泡操作">
            <i class="fas fa-copy 记忆泡-复制" title="复制"></i>
            <i class="fas fa-ellipsis-vertical 记忆泡-更多" title="更多" @click="切换菜单($event)"></i>
          </div>
        </div>
        <span class="记忆泡-气泡时间">{{ 日期时间 }}</span>
      </div>
      <div class="记忆泡-内容层">
        <div v-if="标题" class="记忆泡-标题">{{ 标题 }}</div>
        <div class="记忆泡-气泡内容">{{ 内容 }}</div>
      </div>
    </div>

    <div v-if="菜单显示" class="记忆泡-菜单遮罩" @click="菜单显示 = false">
      <div class="记忆泡-操作菜单" :style="{ left: 菜单x + 'px', top: 菜单y + 'px' }" @click.stop>
        <button class="记忆泡-菜单项" @click="菜单显示 = false">编辑</button>
        <button class="记忆泡-菜单项" @click="菜单显示 = false">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.记忆泡-气泡卡 {
  position: relative;
  background: var(--记忆泡-气泡背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 12px;
  display: flex;
  gap: 12px;
}

.记忆泡-头像区 {
  flex-shrink: 0;
  width: 48px;
  display: flex;
  flex-direction: column;
}

.记忆泡-头像 {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--记忆泡-强调色);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.记忆泡-内容区 {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.记忆泡-信息层 {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆泡-场景 {
  font-size: 13px;
  color: var(--记忆泡-文字);
}

.记忆泡-主场景 {
  font-size: 15px;
  font-weight: 700;
  color: var(--记忆泡-强调色);
}

.记忆泡-辅助标签 {
  margin-left: 6px;
  font-weight: 400;
}

.记忆泡-空场景 {
  color: var(--记忆泡-弱文字);
}

.记忆泡-场景行 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.记忆泡-气泡时间 {
  font-size: 12px;
  color: var(--记忆泡-弱文字);
}

.记忆泡-气泡操作 {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--记忆泡-弱文字);
}

.记忆泡-复制,
.记忆泡-更多 {
  font-size: 13px;
  cursor: pointer;
  opacity: 0;
  padding: 4px;
  border-radius: 4px;
  transition: opacity 0.15s, background 0.15s;
}

.记忆泡-气泡卡:hover .记忆泡-复制,
.记忆泡-气泡卡:hover .记忆泡-更多 {
  opacity: 1;
}

.记忆泡-复制:hover,
.记忆泡-更多:hover {
  background: var(--记忆泡-悬浮背景);
}

.记忆泡-更多 {
  width: 21px;
  height: 21px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.记忆泡-内容层 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.记忆泡-标题 {
  font-size: 15px;
  font-weight: 600;
  color: var(--记忆泡-文字);
}

.记忆泡-气泡内容 {
  font-size: 14px;
  line-height: 1.6;
  color: var(--记忆泡-文字);
  white-space: pre-wrap;
  word-break: break-word;
}

.记忆泡-菜单遮罩 {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.记忆泡-操作菜单 {
  position: fixed;
  z-index: 21;
  min-width: 96px;
  padding: 4px;
  background: var(--记忆泡-输入框背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆泡-菜单项 {
  padding: 7px 12px;
  border: none;
  background: transparent;
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;
}

.记忆泡-菜单项:hover {
  background: var(--记忆泡-悬浮背景);
}
</style>
