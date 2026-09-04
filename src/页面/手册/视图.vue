<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { 首页手册, type 模块手册 } from '@/手册数据/首页'
import { 启动页手册 } from '@/手册数据/启动页'
import { 图标库手册 } from '@/手册数据/图标库'
import { 获取路径页手册 } from '@/手册数据/获取路径页'

const 路由 = useRoute()
const 路由器 = useRouter()

interface 导航项 {
  id: string
  模块名: string
  图标: string
  手册: 模块手册 | null
}

const 模块列表: 导航项[] = [
  { id: 'home', 模块名: '首页', 图标: 'fas fa-home', 手册: 首页手册 },
  { id: 'launch', 模块名: '启动页', 图标: 'fas fa-rocket', 手册: 启动页手册 },
  { id: 'icons', 模块名: '图标库', 图标: 'fas fa-icons', 手册: 图标库手册 },
  { id: 'getpath', 模块名: '获取路径页', 图标: 'fas fa-folder-tree', 手册: 获取路径页手册 },
]

const 底部列表: 导航项[] = [
  { id: 'donate', 模块名: '打赏', 图标: 'fas fa-heart', 手册: null },
  { id: 'about', 模块名: '关于', 图标: 'fas fa-info-circle', 手册: null },
]

const 当前id = computed(() => 路由.params.id as string)

const 当前手册 = computed(() => {
  const 项 = 模块列表.find((m) => m.id === 当前id.value)
  return 项?.手册 ?? null
})

const 是关于页 = computed(() => 当前id.value === 'about')
const 是打赏页 = computed(() => 当前id.value === 'donate')

const 可切换列表 = computed(() => [...模块列表, ...底部列表])

function 处理滚轮(e: WheelEvent) {
  const 列表 = 可切换列表.value
  const 当前索引 = 列表.findIndex((项) => 项.id === 当前id.value)
  if (当前索引 === -1) return
  const 方向 = e.deltaY > 0 ? 1 : -1
  const 下一个索引 = (当前索引 + 方向 + 列表.length) % 列表.length
  const 下一项 = 列表[下一个索引]
  if (下一项) 切换模块(下一项.id)
}

function 切换模块(id: string) {
  路由器.push(`/manual/${id}`)
}

function 切换调试工具() {
  window.electronAPI?.toggleDevtools()
}

const 内容区元素 = ref<HTMLElement | null>(null)
const 缩放比例 = ref(读取缩放比例())

function 读取缩放比例(): number {
  const 存 = localStorage.getItem('手册缩放比例')
  if (!存) return 1
  const 值 = Number(存)
  if (Number.isNaN(值) || 值 < 0.8 || 值 > 2.5) return 1
  return 值
}

function 处理滚轮缩放(e: WheelEvent) {
  if (!e.ctrlKey) return
  e.preventDefault()
  const 步进 = e.deltaY < 0 ? 0.1 : -0.1
  const 新值 = Math.min(2.5, Math.max(0.8, 缩放比例.value + 步进))
  缩放比例.value = Math.round(新值 * 10) / 10
  localStorage.setItem('手册缩放比例', String(缩放比例.value))
}

onMounted(() => {
  内容区元素.value?.addEventListener('wheel', 处理滚轮缩放, { passive: false })
})

onUnmounted(() => {
  内容区元素.value?.removeEventListener('wheel', 处理滚轮缩放)
})
</script>

<template>
  <div class="手册页面">
    <!-- 左侧导航 -->
    <nav class="侧边导航" @wheel.prevent="处理滚轮">
      <div class="导航标题">使用手册</div>
      <div class="导航列表">
        <button v-for="项 in 模块列表" :key="项.id" class="导航项" :class="{ 激活: 当前id === 项.id, 禁用: !项.手册 }" @click="项.手册 && 切换模块(项.id)">
          <i :class="项.图标" class="导航图标"></i>
          <span class="导航文字">{{ 项.模块名 }}</span>
          <span v-if="!项.手册" class="暂无标记">暂无</span>
        </button>
      </div>
      <div class="导航底部">
        <button v-for="项 in 底部列表" :key="项.id" class="导航项" :class="{ 激活: 当前id === 项.id }" @click="切换模块(项.id)">
          <i :class="项.图标" class="导航图标"></i>
          <span class="导航文字">{{ 项.模块名 }}</span>
        </button>
        <button class="导航项" @click="切换调试工具">
          <i class="fas fa-bug 导航图标"></i>
          <span class="导航文字">开发者工具</span>
        </button>
      </div>
    </nav>

    <!-- 右侧内容 -->
    <div ref="内容区元素" class="内容区" :style="{ '--手册缩放': 缩放比例 }">
      <template v-if="是打赏页">
        <div class="打赏页">
          <h1 class="打赏标题">感谢您的支持</h1>
          <p class="打赏引导">如果多维工具箱对您有帮助，欢迎支持一下，您的鼓励是我持续打磨的动力</p>
          <img src="/多维工具箱-微信打赏码.png" alt="微信打赏码" class="打赏图片" />
          <p class="打赏说明">微信扫码打赏</p>
        </div>
      </template>

      <template v-else-if="是关于页">
        <header class="手册头部">
          <i class="fas fa-info-circle 手册图标"></i>
          <h1 class="手册标题">关于</h1>
        </header>
        <div class="手册内容">
          <section class="手册章节">
            <h2 class="章节标题">关于本应用</h2>
            <p class="章节段落">作者：五禽戏画</p>
            <p class="章节段落">软件版本：0.3</p>
            <p class="章节段落">技术栈：Vue 3 + TypeScript + Pinia</p>
          </section>
        </div>
      </template>

      <template v-else-if="当前手册">
        <header class="手册头部">
          <i :class="当前手册.图标" class="手册图标"></i>
          <h1 class="手册标题">{{ 当前手册.模块名 }}</h1>
        </header>

        <div class="手册内容">
          <section v-for="(章节, 索引) in 当前手册.章节" :key="索引" class="手册章节">
            <h2 class="章节标题">{{ 章节.标题 }}</h2>
            <template v-for="(段落, 段落索引) in 章节.内容" :key="段落索引">
              <p v-if="typeof 段落 === 'string'" class="章节段落">{{ 段落 }}</p>
              <table v-else class="快捷键表格">
                <thead>
                  <tr>
                    <th>按键</th>
                    <th>功能</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(行, 行索引) in 段落.行" :key="行索引">
                    <td class="按键列">
                      <kbd>{{ 行.按键 }}</kbd>
                    </td>
                    <td>{{ 行.功能 }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </section>
        </div>
      </template>

      <div v-else class="手册未找到">
        <i class="fas fa-book-open 空图标"></i>
        <p>该模块的手册尚未编写</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.手册页面 {
  display: flex;
  height: 100vh;
  background: #1a1a2e;
  color: rgba(255, 255, 255, 0.9);
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
}

/* 左侧导航 */
.侧边导航 {
  width: 200px;
  flex-shrink: 0;
  padding: 24px 0;
  background: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.导航列表 {
  flex: 1;
  overflow-y: auto;
}

.导航标题 {
  padding: 0 20px 16px;
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}

.导航项 {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
  text-align: left;
}

.导航项:hover:not(.禁用) {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}

.导航项.激活 {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.95);
  border-right: 2px solid rgba(255, 255, 255, 0.5);
}

.导航项.禁用 {
  opacity: 0.35;
  cursor: not-allowed;
}

.导航图标 {
  width: 18px;
  text-align: center;
  font-size: 14px;
}

.导航文字 {
  flex: 1;
}

.暂无标记 {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.06);
  padding: 1px 6px;
  border-radius: 3px;
}

.导航底部 {
  flex-shrink: 0;
  padding-top: 8px;
}

/* 右侧内容 */
.内容区 {
  flex: 1;
  padding: 32px 40px;
  overflow-y: auto;
}

.手册头部 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.手册图标 {
  font-size: calc(24px * var(--手册缩放, 1));
  color: rgba(255, 255, 255, 0.8);
}

.手册标题 {
  font-size: calc(24px * var(--手册缩放, 1));
  font-weight: 600;
  margin: 0;
  color: rgba(255, 255, 255, 0.95);
}

.手册章节 {
  margin-bottom: 28px;
}

.章节标题 {
  font-size: calc(18px * var(--手册缩放, 1));
  font-weight: 600;
  margin: 0 0 12px 0;
  color: rgba(255, 255, 255, 0.9);
  padding-left: 10px;
  border-left: 3px solid rgba(255, 255, 255, 0.4);
}

.章节段落 {
  font-size: calc(14px * var(--手册缩放, 1));
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.75);
  margin: 0 0 8px 0;
}

.快捷键表格 {
  width: 100%;
  max-width: 500px;
  border-collapse: collapse;
  margin: 8px 0;
}

.快捷键表格 th {
  text-align: left;
  font-size: calc(13px * var(--手册缩放, 1));
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.快捷键表格 td {
  padding: 8px 12px;
  font-size: calc(14px * var(--手册缩放, 1));
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.按键列 kbd {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: calc(13px * var(--手册缩放, 1));
  color: rgba(255, 255, 255, 0.9);
  min-width: 28px;
  text-align: center;
}

.手册未找到 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  gap: 12px;
}

.空图标 {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.15);
}

.手册未找到 p {
  font-size: calc(15px * var(--手册缩放, 1));
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.打赏页 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 24px;
}

.打赏标题 {
  font-size: calc(28px * var(--手册缩放, 1));
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.打赏图片 {
  width: 320px;
  height: 320px;
  object-fit: contain;
  border-radius: 8px;
}

.打赏说明 {
  font-size: calc(18px * var(--手册缩放, 1));
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.打赏引导 {
  font-size: calc(16px * var(--手册缩放, 1));
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
  text-align: center;
  max-width: 400px;
}
</style>
