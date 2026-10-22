<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { 使用设置面板仓库 } from '@/页面/启动/仓库/设置面板仓库'
import { 使用快捷键仓库, 格式化快捷键 } from '@/页面/启动/仓库/快捷键仓库'
import { computed } from 'vue'

const 路由 = useRouter()
const 当前路由 = useRoute()
const 设置面板仓库 = 使用设置面板仓库()
const 快捷键仓库 = 使用快捷键仓库()

const 启动快捷键文本 = computed(() => 格式化快捷键(快捷键仓库.启动快捷键))

const 显示快捷键提示 = ref(false)

interface 图标项 {
  id: string
  标题: string
  图标: string
  路径: string | null
}

const 所有图标: 图标项[] = [
  { id: '首页图标', 标题: '首页', 图标: 'fa-home', 路径: null },
  { id: '启动图标', 标题: '启动', 图标: 'fa-rocket', 路径: '/Q1' },
  { id: '图标库图标', 标题: '图标', 图标: 'fa-images', 路径: '/图标库管理' },
  { id: '手册图标', 标题: '手册', 图标: 'fa-book', 路径: null },
  { id: '快捷键图标', 标题: '快捷键', 图标: 'fa-keyboard', 路径: null },
  { id: '设置图标', 标题: '设置', 图标: 'fa-gear', 路径: null },
]

const 顶部图标 = computed(() => 所有图标.filter((i) => i.id !== '设置图标' && i.id !== '手册图标' && i.id !== '快捷键图标'))
const 底部图标 = computed(() => {
  const 底部 = 所有图标.filter((i) => i.id === '快捷键图标' || i.id === '手册图标' || i.id === '设置图标')
  return 底部.sort((a, b) => {
    const 顺序: Record<string, number> = { '快捷键图标': 0, '手册图标': 1, '设置图标': 2 }
    return (顺序[a.id] ?? 0) - (顺序[b.id] ?? 0)
  })
})

function 点击图标(项: 图标项) {
  if (项.id === '首页图标') {
    路由.push('/')
    return
  }
  if (项.id === '设置图标') {
    设置面板仓库.切换面板()
    return
  }
  if (项.id === '手册图标') {
    const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined
    if (是否Electron环境) {
      const 模块id = 当前路由.path === '/图标库管理' ? 'icons' : 'launch'
      window.electronAPI.创建独立窗口(`/manual/${模块id}`)
    }
    return
  }
  if (项.id === '快捷键图标') {
    显示快捷键提示.value = !显示快捷键提示.value
    return
  }
  if (项.路径) {
    路由.push(项.路径)
  }
}

function 是否激活(项: 图标项): boolean {
  if (项.id === '首页图标') {
    return 当前路由.path === '/'
  }
  if (项.id === '设置图标') {
    return 设置面板仓库.面板可见
  }
  if (项.id === '手册图标' || 项.id === '快捷键图标') {
    return false
  }
  return 当前路由.path === 项.路径
}

function 关闭快捷键提示() {
  显示快捷键提示.value = false
}
</script>

<template>
  <div class="导航图标容器">
    <div class="顶部图标组">
      <div v-for="项 in 顶部图标" :key="项.id" class="图标项" :class="{ '图标项--激活': 是否激活(项) }" :title="项.标题" @click="点击图标(项)">
        <div class="图标项__图标">
          <i :class="['fas', 项.图标]"></i>
        </div>
        <span class="图标项__标题">{{ 项.标题 }}</span>
      </div>
    </div>

    <div class="底部图标组" id="设置图标">
      <div v-for="项 in 底部图标" :key="项.id" class="图标项" :class="{ '图标项--激活': 是否激活(项) }" :title="项.标题" @click="点击图标(项)">
        <div class="图标项__图标">
          <i :class="['fas', 项.图标]"></i>
        </div>
        <span class="图标项__标题" :class="{ '图标项__标题--小': 项.id === '快捷键图标' }">{{ 项.标题 }}</span>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="显示快捷键提示" class="快捷键提示遮罩" @click="关闭快捷键提示">
      <div class="快捷键提示弹窗" @click.stop>
        <div class="快捷键提示标题">快捷键</div>
        <div class="提示行"><kbd>Tab</kbd><span>切换紧凑模式</span></div>
        <div class="提示行"><kbd>ESC</kbd><span>退出紧凑模式</span></div>
        <div v-if="当前路由.path === '/Q1'" class="提示行"><kbd>{{ 启动快捷键文本 }}</kbd><span>启动全部卡片</span></div>
        <div v-if="当前路由.path === '/Q1'" class="提示行"><kbd>F2</kbd><span>重命名选中菜单</span></div>
        <div v-if="当前路由.path === '/图标库管理'" class="提示行"><kbd>F2</kbd><span>重命名激活分组</span></div>
        <div v-if="当前路由.path === '/图标库管理'" class="提示行"><kbd>T</kbd><span>展开/折叠导航条</span></div>
        <div v-if="当前路由.path === '/图标库管理'" class="提示行"><kbd>B</kbd><span>进入/退出批量模式</span></div>
        <div class="提示行"><kbd>F1</kbd><span>使用手册</span></div>
        <div class="提示行"><kbd>Home</kbd><span>返回首页</span></div>
        <div class="提示行"><kbd>1/2/3</kbd><span>页面导航</span></div>
        <div class="提示行"><kbd>Ctrl+1/2/3</kbd><span>新窗口打开</span></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.导航图标容器 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  align-items: center;
  justify-content: space-between;
}

.顶部图标组 {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-top: 52px;
}

.底部图标组 {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 20px;
}

.图标项 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 0;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--弱化文字颜色);
  position: relative;
}

.图标项:hover {
  color: var(--全站通用文字颜色);
  background-color: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}

.图标项--激活 {
  color: var(--全站通用文字颜色);
}

.图标项__图标 {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.图标项__标题 {
  font-size: 11px;
  color: var(--弱化文字颜色);
  text-align: center;
  line-height: 1.2;
}

.图标项__标题--小 {
  font-size: 9px;
  letter-spacing: -0.5px;
}

.快捷键提示遮罩 {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.快捷键提示弹窗 {
  background: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: 20px 24px;
  min-width: 240px;
}

.快捷键提示标题 {
  font-size: 15px;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  margin-bottom: 14px;
}

.提示行 {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  color: var(--全站透明文字颜色);
}

.提示行 kbd {
  display: inline-block;
  min-width: 60px;
  text-align: center;
  padding: 2px 8px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 20%, transparent);
  border-radius: 4px;
  font-size: 12px;
  font-family: 'Consolas', 'Microsoft YaHei', monospace;
  color: var(--全站通用文字颜色);
}

.提示行 span {
  font-size: 13px;
  color: var(--全站透明文字颜色);
}
</style>
