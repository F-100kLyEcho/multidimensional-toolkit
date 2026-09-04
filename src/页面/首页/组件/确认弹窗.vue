<template>
  <Teleport to="body">
    <Transition name="遮罩">
      <div v-if="显示" class="确认弹窗遮罩" @click="点击遮罩">
        <Transition name="弹窗">
          <div v-if="显示" class="确认弹窗" :class="{ 浅色模式 }" @click.stop>
            <div class="弹窗内容">{{ 内容 }}</div>
            <div class="弹窗按钮组">
              <button class="按钮 取消" @click="取消">取消</button>
              <button class="按钮 确认" @click="确认">确认</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props 属性在模板中直接使用（显示/内容/浅色模式），ESLint 无法识别模板展开，故豁免
const props = defineProps<{
  显示: boolean
  内容: string
  浅色模式?: boolean
}>()

const emit = defineEmits<{
  确认: []
  取消: []
}>()

function 点击遮罩() {
  取消()
}

function 确认() {
  emit('确认')
}

function 取消() {
  emit('取消')
}
</script>

<style scoped>
.确认弹窗遮罩 {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.确认弹窗 {
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 20px 24px;
  min-width: 280px;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
}

.弹窗内容 {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1.6;
  margin-bottom: 20px;
  white-space: pre-line;
}

.弹窗按钮组 {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.按钮 {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.取消 {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
}
.取消:hover {
  background: rgba(255, 255, 255, 0.18);
}

.确认 {
  background: #0078d4;
  color: #fff;
}
.确认:hover {
  background: #1a86d9;
}

/* 浅色模式 */
.确认弹窗.浅色模式 {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.确认弹窗.浅色模式 .弹窗内容 {
  color: rgba(0, 0, 0, 0.85);
}
.确认弹窗.浅色模式 .取消 {
  background: rgba(0, 0, 0, 0.06);
  color: rgba(0, 0, 0, 0.6);
}
.确认弹窗.浅色模式 .取消:hover {
  background: rgba(0, 0, 0, 0.1);
}
.确认弹窗.浅色模式 .确认 {
  background: #0078d4;
  color: #fff;
}
.确认弹窗.浅色模式 .确认:hover {
  background: #1a86d9;
}

/* 遮罩过渡 */
.遮罩-enter-active,
.遮罩-leave-active {
  transition: opacity 0.2s;
}
.遮罩-enter-from,
.遮罩-leave-to {
  opacity: 0;
}

/* 弹窗过渡 */
.弹窗-enter-active,
.弹窗-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.弹窗-enter-from,
.弹窗-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
