<script setup lang="ts">
import { ref, computed } from 'vue'
import { 拆分场景 } from '../../工具/场景'

const props = defineProps<{
  历史场景: string[]
}>()

const emit = defineEmits<{
  发送: [数据: { 场景: string; 标题?: string; 内容: string }]
}>()

const 场景 = ref('编程')
const 标题 = ref('')
const 文本 = ref('')
const 场景下拉显示 = ref(false)
const 场景分类 = ref<'全部' | '常用' | '热区' | '冷区'>('全部')

/** 场景联想：从历史场景模糊匹配 */
const 联想显示 = ref(false)
const 联想结果 = computed(() => {
  const 输入 = 场景.value.trim()
  if (!输入) return []
  return props.历史场景.filter((s) => s.includes(输入) && s !== 输入).slice(0, 8)
})
function 场景聚焦() {
  联想显示.value = true
}
function 场景失焦() {
  setTimeout(() => {
    联想显示.value = false
  }, 200)
}
function 选联想(s: string) {
  场景.value = s
  联想显示.value = false
}

function 选场景(s: string) {
  场景.value = s
  场景下拉显示.value = false
}

function 提交() {
  if (!文本.value.trim()) return
  emit('发送', {
    场景: 场景.value.trim() || '编程',
    标题: 标题.value.trim() || undefined,
    内容: 文本.value,
  })
  文本.value = ''
  标题.value = ''
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
    <div class="记忆泡-输入头部">
      <div class="记忆泡-场景选择器">
        <div v-if="联想显示 && 联想结果.length" class="记忆泡-场景联想">
          <button
            v-for="s in 联想结果"
            :key="s"
            class="记忆泡-联想项"
            @mousedown.prevent="选联想(s)"
          >{{ s.replace(/，/g, ' ') }}</button>
        </div>
        <input class="记忆泡-场景输入" v-model="场景" placeholder="场景" @focus="场景聚焦" @blur="场景失焦" />
        <i class="fas fa-caret-down 记忆泡-场景下拉触发" @click="场景下拉显示 = !场景下拉显示"></i>
        <div v-if="场景下拉显示" class="记忆泡-场景下拉遮罩" @click="场景下拉显示 = false"></div>
        <div v-if="场景下拉显示" class="记忆泡-场景下拉菜单" @click.stop>
          <div class="记忆泡-场景分类栏">
            <button
              v-for="分类 in ['全部', '热区', '常用', '冷区']"
              :key="分类"
              class="记忆泡-场景分类项"
              :class="{ 选中: 分类 === 场景分类 }"
              @click="场景分类 = 分类 as typeof 场景分类"
            >{{ 分类 }}</button>
          </div>
          <div class="记忆泡-场景列表">
            <button
              v-for="s in 历史场景"
              :key="s"
              class="记忆泡-场景下拉项"
              :class="{ 选中: s === 场景 }"
              @click="选场景(s)"
            >
              <span class="记忆泡-下拉主场景">{{ 拆分场景(s).主 }}</span><span v-for="t in 拆分场景(s).辅" :key="t" class="记忆泡-下拉辅助">{{ t }}</span>
            </button>
          </div>
        </div>
      </div>
      <input class="记忆泡-标题输入" v-model="标题" placeholder="标题（可选）" />
    </div>
    <textarea
      v-model="文本"
      class="记忆泡-输入文本"
      rows="2"
      placeholder="写点什么…（回车发送 / Shift+回车换行）"
      @keydown="处理按键"
    />
    <div class="记忆泡-输入工具栏">
      <i class="fas fa-image 记忆泡-添加图片" title="添加本地图片"></i>
      <button class="记忆泡-发送按钮" @click="提交">发送</button>
    </div>
  </div>
</template>

<style scoped>
.记忆泡-输入框 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--记忆泡-输入框背景);
  border-radius: 10px;
}

.记忆泡-输入头部 {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.记忆泡-场景选择器 {
  position: relative;
  display: flex;
  align-items: center;
}

.记忆泡-场景输入 {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--记忆泡-背景);
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}

.记忆泡-场景输入:hover,
.记忆泡-场景输入:focus {
  background: var(--记忆泡-输入框背景);
  border-color: var(--记忆泡-文字);
}

.记忆泡-场景输入::placeholder {
  color: var(--记忆泡-弱文字);
}

.记忆泡-场景联想 {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  z-index: 21;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  background: var(--记忆泡-输入框背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆泡-联想项 {
  padding: 5px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}

.记忆泡-联想项:hover {
  background: var(--记忆泡-悬浮背景);
  color: var(--记忆泡-强调色);
}

.记忆泡-场景下拉触发 {
  position: absolute;
  right: 8px;
  font-size: 14px;
  color: var(--记忆泡-弱文字);
  cursor: pointer;
  transition: color 0.15s;
}

.记忆泡-场景下拉触发:hover {
  color: var(--记忆泡-强调色);
}

.记忆泡-场景下拉遮罩 {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.记忆泡-场景下拉菜单 {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  z-index: 21;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
  background: var(--记忆泡-输入框背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆泡-场景分类栏 {
  display: flex;
  gap: 2px;
  padding: 2px;
  margin-bottom: 2px;
  border-bottom: 1px solid var(--记忆泡-悬浮背景);
}

.记忆泡-场景分类项 {
  flex: 1;
  padding: 4px 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--记忆泡-弱文字);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.记忆泡-场景分类项:hover {
  background: var(--记忆泡-悬浮背景);
  color: var(--记忆泡-文字);
}

.记忆泡-场景分类项.选中 {
  color: var(--记忆泡-强调色);
}

.记忆泡-场景列表 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 2px;
}

.记忆泡-场景下拉项 {
  padding: 4px 10px;
  border: none;
  border-radius: 6px;
  background: var(--记忆泡-背景);
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
}

.记忆泡-场景下拉项:hover {
  background: var(--记忆泡-悬浮背景);
}

.记忆泡-场景下拉项.选中 {
  color: var(--记忆泡-强调色);
}

.记忆泡-下拉主场景 {
  font-weight: 700;
  color: var(--记忆泡-强调色);
}

.记忆泡-下拉辅助 {
  margin-left: 6px;
  font-weight: 400;
}

.记忆泡-标题输入 {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--记忆泡-背景);
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}

.记忆泡-标题输入:hover,
.记忆泡-标题输入:focus {
  background: var(--记忆泡-输入框背景);
  border-color: var(--记忆泡-文字);
}

.记忆泡-标题输入::placeholder {
  color: var(--记忆泡-弱文字);
}

.记忆泡-输入文本 {
  resize: none;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: var(--记忆泡-背景);
  color: var(--记忆泡-文字);
  font-size: 14px;
  font-family: inherit;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
}

.记忆泡-输入文本:hover,
.记忆泡-输入文本:focus {
  background: var(--记忆泡-输入框背景);
  border-color: var(--记忆泡-文字);
}

.记忆泡-输入文本::placeholder {
  color: var(--记忆泡-弱文字);
}

.记忆泡-输入工具栏 {
  display: flex;
  align-items: center;
  gap: 8px;
}

.记忆泡-添加图片 {
  font-size: 16px;
  color: var(--记忆泡-弱文字);
  cursor: pointer;
  transition: color 0.15s;
}

.记忆泡-添加图片:hover {
  color: var(--记忆泡-强调色);
}

.记忆泡-发送按钮 {
  margin-left: auto;
  padding: 6px 18px;
  border: none;
  border-radius: 8px;
  background: var(--记忆泡-强调色);
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.15s;
}

.记忆泡-发送按钮:hover {
  opacity: 0.85;
}
</style>
