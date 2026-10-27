<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import '../记忆泡/样式/main.css'
import { 使用全局快捷键 } from '@/组合式函数/使用全局快捷键'

const router = useRouter()

/** 皮肤：与记忆泡共用同一个键，保持两页皮肤一致 */
const 深色 = ref(localStorage.getItem('多维记忆_深色') !== 'false')

function 切换皮肤() {
  深色.value = !深色.value
  localStorage.setItem('多维记忆_深色', String(深色.value))
}

/** 悬浮加号 / 开始记录 共用菜单：选择记录类型 */
const 菜单显示 = ref(false)
const 菜单位置 = ref<Record<string, string>>({})

function 打开菜单(触发: '悬浮' | '开始', 事件?: MouseEvent) {
  if (菜单显示.value) {
    菜单显示.value = false
    return
  }
  if (触发 === '悬浮') {
    菜单位置.value = { right: '24px', bottom: '80px', left: 'auto', transform: 'none' }
  } else if (触发 === '开始' && 事件) {
    const rect = (事件.currentTarget as HTMLElement).getBoundingClientRect()
    菜单位置.value = {
      left: `${rect.left + rect.width / 2}px`,
      bottom: `${window.innerHeight - rect.top + 8}px`,
      right: 'auto',
      transform: 'translateX(-50%)',
    }
  }
  菜单显示.value = true
}

function 选择记录类型(类型: '记忆泡' | '富文本') {
  菜单显示.value = false
  if (类型 === '记忆泡') {
    router.push('/多维记忆/泡')
  }
}

使用全局快捷键()

const 概念 = [
  {
    名称: '对象',
    说明: '记忆的基本单位。一个对象可以有多个名称（如猕猴桃／奇异果），有唯一 ID，记录创建时间与修改时间。',
  },
  {
    名称: '连接',
    说明: '对象之间互相连接。孤立的对象会被清理，留下的是彼此关联的记忆网络。',
  },
  {
    名称: '热区／冷区',
    说明: '热区对象优先加载显示，冷区延后加载。编辑一次加热，长期不用转冷。',
  },
]
</script>

<template>
  <div class="多维记忆 记忆首页" :class="{ 浅色: !深色 }">
    <header class="记忆泡-顶栏">
      <span class="记忆泡-标题">多维记忆</span>
      <button class="记忆泡-皮肤切换" @click="切换皮肤">{{ 深色 ? '浅色' : '深色' }}</button>
    </header>

    <main class="记忆首页-主体">
      <section class="记忆首页-引导">
        <h1 class="记忆首页-大标题">多维记忆</h1>
        <p class="记忆首页-副标题">对象 · 连接 · 热冷区 —— 给自己看的记忆网络</p>
      </section>

      <section class="记忆首页-概念列表">
        <article v-for="项 in 概念" :key="项.名称" class="记忆首页-概念卡">
          <h2 class="记忆首页-概念名">{{ 项.名称 }}</h2>
          <p class="记忆首页-概念说明">{{ 项.说明 }}</p>
        </article>
      </section>

      <section class="记忆首页-操作">
        <button class="记忆首页-开始按钮" @click="打开菜单('开始', $event)">开始记录</button>
      </section>
    </main>

    <button class="记忆首页-悬浮加" @click="打开菜单('悬浮')">
      <i class="fas fa-plus"></i>
    </button>

    <div v-if="菜单显示" class="记忆首页-菜单遮罩" @click="菜单显示 = false">
      <div class="记忆首页-菜单" :style="菜单位置" @click.stop>
        <button class="记忆首页-菜单项" @click="选择记录类型('记忆泡')">记忆泡</button>
        <button class="记忆首页-菜单项 禁用" disabled>富文本</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.记忆首页 {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--记忆泡-背景);
  color: var(--记忆泡-文字);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

.记忆泡-顶栏 {
  flex-shrink: 0;
  height: 32px;
  display: flex;
  align-items: center;
  padding: 0 154px 0 16px;
  -webkit-app-region: drag;
  border-bottom: 1px solid var(--记忆泡-气泡边框);
}

.记忆泡-顶栏 button {
  -webkit-app-region: no-drag;
}

.记忆泡-标题 {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.记忆泡-皮肤切换 {
  margin-left: auto;
  padding: 5px 12px;
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 6px;
  background: transparent;
  color: var(--记忆泡-弱文字);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s;
}

.记忆泡-皮肤切换:hover {
  color: var(--记忆泡-文字);
}

.记忆首页-主体 {
  flex: 1;
  overflow-y: auto;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
}

.记忆首页-引导 {
  text-align: center;
}

.记忆首页-大标题 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 1px;
}

.记忆首页-副标题 {
  margin: 0;
  font-size: 13px;
  color: var(--记忆泡-弱文字);
  letter-spacing: 0.5px;
}

.记忆首页-概念列表 {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.记忆首页-概念卡 {
  padding: 18px 20px;
  background: var(--记忆泡-气泡背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 10px;
}

.记忆首页-概念名 {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--记忆泡-强调色);
}

.记忆首页-概念说明 {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--记忆泡-弱文字);
}

.记忆首页-操作 {
  margin-top: 8px;
}

.记忆首页-开始按钮 {
  padding: 10px 28px;
  border: 1px solid var(--记忆泡-强调色);
  border-radius: 8px;
  background: var(--记忆泡-强调色);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  transition: opacity 0.15s;
}

.记忆首页-开始按钮:hover {
  opacity: 0.85;
}

.记忆首页-悬浮加 {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid var(--记忆泡-强调色);
  background: var(--记忆泡-强调色);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  z-index: 10;
}

.记忆首页-悬浮加:hover {
  opacity: 0.85;
}

.记忆首页-菜单遮罩 {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.记忆首页-菜单 {
  position: fixed;
  z-index: 21;
  min-width: 120px;
  padding: 4px;
  background: var(--记忆泡-背景);
  border: 1px solid var(--记忆泡-气泡边框);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.记忆首页-菜单项 {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--记忆泡-文字);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}

.记忆首页-菜单项:hover:not(.禁用) {
  background: var(--记忆泡-强调色);
  color: #fff;
}

.记忆首页-菜单项.禁用 {
  color: var(--记忆泡-弱文字);
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
