<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'
import CropDialog from '@/页面/启动/组件/布局/设置面板/裁切弹窗.vue'
import IconPickerPanel from '@/页面/启动/组件/图标选择面板.vue'

const 主题仓库 = 使用主题仓库()
const { 壁纸分组列表, 当前壁纸分组索引, 当前壁纸分组内索引, 背景图片缩略图缓存, 背景图片URL缓存 } = storeToRefs(主题仓库)
const 图标选择历史 = 使用图标选择历史仓库()
const 图标库仓库 = 使用图标库仓库()

// 图标选择面板组件
const 图标面板Ref = ref<{
  打开面板: (回调: (图标值: string) => void, 触发元素: HTMLElement) => void
  关闭面板: () => void
  面板可见: { value: boolean }
} | null>(null)

function 是Emoji图标(值: string): boolean {
  return !!值 && !值.startsWith('fa-') && !值.startsWith('icons:')
}

function 是全局图片图标(值: string): boolean {
  return !!值 && 值.startsWith('icons:')
}

function 是FA图标(值: string): boolean {
  return !!值 && (值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab '))
}

function 获取图标类别(图标值: string): 'fa' | 'emoji' | 'global' {
  if (是全局图片图标(图标值)) return 'global'
  if (是FA图标(图标值)) return 'fa'
  return 'emoji'
}

/** 分组图片图标预览：读取缓存，未命中时触发懒加载 */
function 分组图片URL(图标代码: string): string {
  图标库仓库.保证图片加载(图标代码)
  return 图标库仓库.图片缓存.get(图标代码) || ''
}

function 点击分组图标(event: MouseEvent, 分组名: string) {
  event.stopPropagation()
  const 元素 = event.currentTarget as HTMLElement
  图标面板Ref.value?.打开面板((图标值) => {
    主题仓库.保存分组图标(分组名, 图标值)
    if (是全局图片图标(图标值)) {
      图标库仓库.加载数据().then(() => {
        图标库仓库.获取图片Base64(图标值)
      })
    }
    const 类别 = 获取图标类别(图标值)
    图标选择历史.添加(类别, 图标值)
    图标面板Ref.value?.关闭面板()
  }, 元素)
}

const 编辑模式 = ref(false)
const 选中删除列表 = ref<Set<string>>(new Set())
const 文件输入框 = ref<HTMLInputElement | null>(null)
const URL输入可见 = ref(false)
const URL输入值 = ref('')
const URL下载中 = ref(false)

// 分组重命名
const 重命名分组索引 = ref(-1)
const 重命名输入值 = ref('')
let 重命名输入框已聚焦 = false

// 右键菜单（分组级）
const 右键菜单 = ref({ 可见: false, x: 0, y: 0, 目标分组索引: -1 })

// 右键菜单（图片级）
const 图片右键菜单 = ref({ 可见: false, x: 0, y: 0, 目标文件名: '', 目标分组名: '', 目标组内索引: -1 })

// 裁切弹窗
const 裁切弹窗可见 = ref(false)
const 裁切目标 = ref({ 文件名: '', 分组名: '' })

// 确认弹窗
const 确认弹窗 = ref({ 可见: false, 消息: '', 目标分组名: '' })
const 确认弹窗删除类型 = ref<'分组' | '单张图片'>('分组')
const 确认弹窗删除目标 = ref<{ 文件名: string; 分组名: string }>({ 文件名: '', 分组名: '' })

// 新建分组
const 新建分组可见 = ref(false)
const 新建分组名称 = ref('')

// 弹窗内选中的壁纸（确认后才生效）
const 临时分组索引 = ref(当前壁纸分组索引.value)
const 临时组内索引 = ref(当前壁纸分组内索引.value)
const 进入时壁纸URL = ref(背景图片URL缓存.value)

const 当前分组索引本地 = ref(当前壁纸分组索引.value)

const 当前分组 = computed(() => 壁纸分组列表.value[当前分组索引本地.value])

function 切换分组(索引: number) {
  当前分组索引本地.value = 索引
  退出编辑模式()
}

function 获取缩略图(分组名: string, 文件名: string): string {
  return 背景图片缩略图缓存.value.get(`${主题仓库.壁纸存储位置}/${分组名}/${文件名}`) || ''
}

function 是否当前壁纸(分组索引: number, 组内索引: number): boolean {
  return 临时分组索引.value === 分组索引 && 临时组内索引.value === 组内索引
}

function 点击图片(分组索引: number, 组内索引: number) {
  if (编辑模式.value) {
    const 文件名 = 壁纸分组列表.value[分组索引]?.图片列表[组内索引]
    if (!文件名) return
    const key = `${分组索引}/${组内索引}`
    if (选中删除列表.value.has(key)) {
      选中删除列表.value.delete(key)
    } else {
      选中删除列表.value.add(key)
    }
    return
  }
  临时分组索引.value = 分组索引
  临时组内索引.value = 组内索引
  预览壁纸(分组索引, 组内索引)
}

function 预览壁纸(分组索引: number, 组内索引: number) {
  const 分组 = 壁纸分组列表.value[分组索引]
  const 文件名 = 分组?.图片列表[组内索引]
  if (!分组 || !文件名) {
    背景图片URL缓存.value = ''
    return
  }
  主题仓库.加载指定壁纸URL(文件名, 分组.名称)
}

function 进入编辑模式() {
  编辑模式.value = true
  选中删除列表.value.clear()
}

function 退出编辑模式() {
  编辑模式.value = false
  选中删除列表.value.clear()
}

function 全选当前分组() {
  if (!当前分组.value) return
  const 分组索引 = 当前分组索引本地.value
  当前分组.value.图片列表.forEach((_, i) => {
    选中删除列表.value.add(`${分组索引}/${i}`)
  })
}

async function 删除选中图片() {
  if (!当前分组.value || 选中删除列表.value.size === 0) return
  const 分组名 = 当前分组.value.名称
  const 文件名列表: string[] = []
  for (const key of 选中删除列表.value) {
    const parts = key.split('/').map(Number)
    const 分组索引 = parts[0]!
    const 组内索引 = parts[1]!
    const 文件名 = 壁纸分组列表.value[分组索引]?.图片列表[组内索引]
    if (文件名 && 壁纸分组列表.value[分组索引]?.名称 === 分组名) {
      文件名列表.push(文件名)
    }
  }
  if (文件名列表.length > 0) {
    await 主题仓库.批量删除背景图片(文件名列表, 分组名)
  }
  退出编辑模式()
}

function 触发文件选择() {
  文件输入框.value?.click()
}

async function 处理文件选择(event: Event) {
  const 输入 = event.target as HTMLInputElement
  const 文件列表 = 输入.files
  if (!文件列表 || 文件列表.length === 0) return
  const 文件数组 = Array.from(文件列表)
  输入.value = ''

  const 分组名 = 当前分组.value?.名称 || '默认'
  for (const 文件 of 文件数组) {
    try {
      const base64 = await 读取文件为Base64(文件)
      if (base64) {
        await 主题仓库.上传背景图片(base64, 分组名)
      }
    } catch (e) {
      console.error('上传壁纸失败:', e)
    }
  }
}

function 读取文件为Base64(文件: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve((e.target?.result as string) || '')
    reader.readAsDataURL(文件)
  })
}

function 切换URL输入() {
  URL输入可见.value = !URL输入可见.value
  if (URL输入可见.value) {
    nextTick(() => {
      const input = document.querySelector<HTMLInputElement>('.弹出输入框')
      input?.focus()
    })
  }
}

async function 执行URL下载() {
  if (!URL输入值.value.trim() || URL下载中.value) return
  URL下载中.value = true
  const 分组名 = 当前分组.value?.名称 || '默认'
  await 主题仓库.下载背景图片(URL输入值.value.trim(), 分组名)
  URL下载中.value = false
  URL输入值.value = ''
  URL输入可见.value = false
}

function 处理URL输入失焦() {
  setTimeout(() => {
    const 面板 = document.querySelector('.url弹出面板')
    if (!面板?.contains(document.activeElement) && !URL下载中.value) {
      URL输入可见.value = false
    }
  }, 150)
}

// 分组管理
function 切换新建分组() {
  新建分组可见.value = !新建分组可见.value
  if (新建分组可见.value) {
    新建分组名称.value = ''
    nextTick(() => {
      const input = document.querySelector<HTMLInputElement>('.新建分组弹出面板 .弹出输入框')
      input?.focus()
    })
  }
}

async function 确认新建分组() {
  const 名称 = 新建分组名称.value.trim()
  if (!名称) {
    新建分组可见.value = false
    return
  }
  await 主题仓库.新建壁纸分组(名称)
  新建分组可见.value = false
}

function 处理新建分组失焦() {
  setTimeout(() => {
    const 面板 = document.querySelector('.新建分组弹出面板')
    if (!面板?.contains(document.activeElement)) {
      新建分组可见.value = false
    }
  }, 150)
}

function 开始重命名(索引: number) {
  重命名分组索引.value = 索引
  重命名输入值.value = 壁纸分组列表.value[索引]?.名称 || ''
  重命名输入框已聚焦 = false
  nextTick(() => {
    const 输入框 = document.querySelector<HTMLInputElement>('.重命名输入框')
    if (输入框 && !重命名输入框已聚焦) {
      重命名输入框已聚焦 = true
      输入框.focus()
      输入框.select()
    }
  })
}

async function 确认重命名() {
  if (重命名分组索引.value < 0) return
  const 旧名称 = 壁纸分组列表.value[重命名分组索引.value]?.名称
  const 新名称 = 重命名输入值.value.trim()
  if (!旧名称 || !新名称 || 旧名称 === 新名称) {
    重命名分组索引.value = -1
    return
  }
  await 主题仓库.重命名壁纸分组(旧名称, 新名称)
  重命名分组索引.value = -1
}

function 处理右键(event: MouseEvent, 索引: number) {
  event.preventDefault()
  右键菜单.value = { 可见: true, x: event.clientX, y: event.clientY, 目标分组索引: 索引 }
}

function 处理图片右键(event: MouseEvent, 文件名: string, 分组名: string, 组内索引: number) {
  event.preventDefault()
  event.stopPropagation()
  图片右键菜单.value = { 可见: true, x: event.clientX, y: event.clientY, 目标文件名: 文件名, 目标分组名: 分组名, 目标组内索引: 组内索引 }
}

function 关闭右键菜单() {
  右键菜单.value.可见 = false
}

function 关闭图片右键菜单() {
  图片右键菜单.value.可见 = false
}

function 图片右键裁切() {
  裁切目标.value = { 文件名: 图片右键菜单.value.目标文件名, 分组名: 图片右键菜单.value.目标分组名 }
  关闭图片右键菜单()
  裁切弹窗可见.value = true
}

function 图片右键删除() {
  const 文件名 = 图片右键菜单.value.目标文件名
  const 分组名 = 图片右键菜单.value.目标分组名
  关闭图片右键菜单()
  确认弹窗删除类型.value = '单张图片'
  确认弹窗删除目标.value = { 文件名, 分组名 }
  确认弹窗.value = {
    可见: true,
    消息: `确定要删除壁纸「${文件名}」吗？`,
    目标分组名: '',
  }
}

function 右键重命名() {
  const 索引 = 右键菜单.value.目标分组索引
  关闭右键菜单()
  if (索引 >= 0) 开始重命名(索引)
}

function 右键删除分组() {
  const 索引 = 右键菜单.value.目标分组索引
  关闭右键菜单()
  if (索引 < 0) return
  const 分组 = 壁纸分组列表.value[索引]
  if (!分组) return
  if (分组.名称 === '默认') return
  确认弹窗删除类型.value = '分组'
  确认弹窗.value = {
    可见: true,
    消息: 分组.图片列表.length > 0 ? `确定要删除分组「${分组.名称}」吗？\n该分组下有 ${分组.图片列表.length} 张图片，将一并删除。` : `确定要删除分组「${分组.名称}」吗？`,
    目标分组名: 分组.名称,
  }
}

async function 确认删除分组() {
  if (确认弹窗删除类型.value === '单张图片') {
    const { 文件名, 分组名 } = 确认弹窗删除目标.value
    if (文件名 && 分组名) {
      await 主题仓库.删除背景图片(文件名, 分组名)
    }
  } else {
    await 主题仓库.删除壁纸分组(确认弹窗.value.目标分组名)
    if (当前分组索引本地.value >= 壁纸分组列表.value.length) {
      当前分组索引本地.value = 0
    }
  }
  确认弹窗.value.可见 = false
}

function 处理裁切完成() {
  裁切弹窗可见.value = false
  主题仓库.加载壁纸分组列表()
  主题仓库.加载所有缩略图()
  主题仓库.加载当前背景图片URL()
}

function 确认() {
  主题仓库.选中壁纸(临时分组索引.value, 临时组内索引.value)
  emit('确认')
}

function 关闭() {
  临时分组索引.value = 当前壁纸分组索引.value
  临时组内索引.value = 当前壁纸分组内索引.value
  背景图片URL缓存.value = 进入时壁纸URL.value
  退出编辑模式()
  emit('关闭')
}

function 处理遮罩点击() {
  if (图标面板Ref.value?.面板可见.value) {
    图标面板Ref.value.关闭面板()
    return
  }
  if (URL输入可见.value) {
    URL输入可见.value = false
    return
  }
  if (重命名分组索引.value >= 0 || 新建分组可见.value) return
  关闭()
}

function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (图标面板Ref.value?.面板可见.value) {
      图标面板Ref.value.关闭面板()
      return
    }
    if (裁切弹窗可见.value) {
      裁切弹窗可见.value = false
      return
    }
    if (确认弹窗.value.可见) {
      确认弹窗.value.可见 = false
      return
    }
    if (图片右键菜单.value.可见) {
      关闭图片右键菜单()
      return
    }
    if (右键菜单.value.可见) {
      关闭右键菜单()
      return
    }
    if (URL输入可见.value) {
      URL输入可见.value = false
      return
    }
    if (编辑模式.value) {
      退出编辑模式()
      return
    }
    关闭()
  }
}

onMounted(() => {
  document.addEventListener('keydown', 处理Esc)
  主题仓库.加载壁纸分组列表()
  主题仓库.加载所有缩略图()
})

onUnmounted(() => {
  document.removeEventListener('keydown', 处理Esc)
})

const emit = defineEmits<{
  确认: []
  关闭: []
}>()
</script>

<template>
  <Teleport to="body">
    <div class="壁纸库遮罩" @mousedown.self="处理遮罩点击" @contextmenu.self.prevent>
      <div class="壁纸库弹窗">
        <!-- 左侧：分组栏 -->
        <div class="分组栏">
          <div class="分组标题">壁纸库</div>
          <div class="分组列表">
            <div v-for="(分组, 索引) in 壁纸分组列表" :key="分组.名称" class="分组项" :class="{ 选中: 当前分组索引本地 === 索引 }" @click="切换分组(索引)" @contextmenu="处理右键($event, 索引)" @dblclick="分组.名称 !== '默认' && 开始重命名(索引)">
              <span class="分组图标 可点击分组图标" title="点击更换图标" @click="点击分组图标($event, 分组.名称)">
                <i v-if="是FA图标(分组.图标代码)" :class="分组.图标代码"></i>
                <span v-else-if="是Emoji图标(分组.图标代码)" class="分组Emoji图标">{{ 分组.图标代码 }}</span>
                <img v-else-if="是全局图片图标(分组.图标代码) && 分组图片URL(分组.图标代码)" :src="分组图片URL(分组.图标代码)" alt="" class="分组图片图标" />
                <i v-else class="fas fa-folder"></i>
              </span>
              <template v-if="重命名分组索引 === 索引">
                <input ref="重命名输入框" v-model="重命名输入值" class="重命名输入框" @keyup.enter="确认重命名" @keyup.escape="重命名分组索引 = -1" @blur="确认重命名" @click.stop />
              </template>
              <template v-else>
                <span class="分组名称">{{ 分组.名称 }}</span>
                <span class="分组计数">{{ 分组.图片列表.length }}</span>
              </template>
            </div>
          </div>

          <div class="分组底部">
            <!-- 新建分组 -->
            <div class="弹出按钮行">
              <button class="分组操作按钮" @click="切换新建分组">
                <i class="fas fa-plus"></i>
                <span>新建分组</span>
              </button>
              <Transition name="弹出">
                <div v-if="新建分组可见" class="弹出面板 新建分组弹出面板">
                  <input v-model="新建分组名称" class="弹出输入框" placeholder="分组名称" @keyup.enter="确认新建分组" @keyup.escape="新建分组可见 = false" @blur="处理新建分组失焦" />
                  <i class="fas fa-times 弹出关闭" @mousedown.prevent="新建分组可见 = false"></i>
                </div>
              </Transition>
            </div>

            <!-- URL 下载按钮 -->
            <div class="弹出按钮行">
              <button class="分组操作按钮" @click="切换URL输入">
                <i class="fas fa-link"></i>
                <span>URL 下载</span>
              </button>
              <Transition name="弹出">
                <div v-if="URL输入可见" class="弹出面板 url弹出面板">
                  <input v-model="URL输入值" class="弹出输入框" placeholder="粘贴图片地址" @keyup.enter="执行URL下载" @keyup.escape="URL输入可见 = false" @blur="处理URL输入失焦" />
                  <button class="弹出确认按钮" :disabled="!URL输入值.trim() || URL下载中" @mousedown.prevent="执行URL下载">
                    <i v-if="URL下载中" class="fas fa-spinner fa-pulse"></i>
                    <i v-else class="fas fa-download"></i>
                  </button>
                  <i class="fas fa-times 弹出关闭" @mousedown.prevent="URL输入可见 = false"></i>
                </div>
              </Transition>
            </div>

            <!-- 编辑图片按钮 -->
            <div class="弹出按钮行">
              <template v-if="编辑模式">
                <button class="分组操作按钮 分组操作按钮--激活" @click="退出编辑模式">
                  <i class="fas fa-times"></i>
                  <span>取消编辑</span>
                </button>
              </template>
              <template v-else>
                <button class="分组操作按钮" :disabled="(当前分组?.图片列表.length || 0) === 0" @click="进入编辑模式">
                  <i class="fas fa-edit"></i>
                  <span>编辑图片</span>
                </button>
              </template>
              <Transition name="弹出">
                <div v-if="编辑模式" class="弹出面板 编辑弹出面板">
                  <button class="弹出操作按钮" @click="全选当前分组">全选</button>
                  <button class="弹出操作按钮 弹出操作按钮--危险" :disabled="选中删除列表.size === 0" @click="删除选中图片">删除({{ 选中删除列表.size }})</button>
                  <i class="fas fa-times 弹出关闭" @mousedown.prevent="退出编辑模式"></i>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- 右侧：图片区 -->
        <div class="图片区">
          <div class="图片网格">
            <div
              v-for="(文件名, 组内索引) in 当前分组?.图片列表 || []"
              :key="文件名"
              class="图片网格项"
              :class="{
                选中: 是否当前壁纸(当前分组索引本地, 组内索引),
                编辑选中: 编辑模式 && 选中删除列表.has(`${当前分组索引本地}/${组内索引}`),
              }"
              @click="点击图片(当前分组索引本地, 组内索引)"
              @contextmenu="处理图片右键($event, 文件名, 当前分组?.名称 || '', 组内索引)"
            >
              <div v-if="获取缩略图(当前分组?.名称 || '', 文件名)" class="图片网格缩略图" :style="{ backgroundImage: `url(${获取缩略图(当前分组?.名称 || '', 文件名)})` }"></div>
              <div v-else class="图片网格缩略图 图片网格缩略图--加载中">
                <i class="fas fa-spinner fa-pulse"></i>
              </div>
              <div v-if="编辑模式" class="勾选框" :class="{ 勾选: 选中删除列表.has(`${当前分组索引本地}/${组内索引}`) }">
                <i class="fas fa-check"></i>
              </div>
            </div>
            <div class="图片网格项 图片网格项--添加" @click="触发文件选择">
              <i class="fas fa-plus"></i>
            </div>
          </div>

          <div class="图片底部">
            <button class="确认按钮" @click="确认">确认</button>
          </div>

          <input ref="文件输入框" type="file" accept="image/*" multiple class="隐藏文件输入" @change="处理文件选择" />
        </div>

        <i class="fas fa-times 关闭按钮" @click="关闭"></i>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div v-if="右键菜单.可见" class="右键菜单覆盖层" @mousedown="关闭右键菜单" @contextmenu.prevent="关闭右键菜单"></div>
    <div v-if="右键菜单.可见" class="右键菜单" :style="{ left: 右键菜单.x + 'px', top: 右键菜单.y + 'px' }">
      <div class="右键菜单项" @click="右键重命名">
        <i class="fas fa-pen"></i>
        <span>重命名</span>
      </div>
      <div v-if="壁纸分组列表[右键菜单.目标分组索引]?.名称 !== '默认'" class="右键菜单项 危险" @click="右键删除分组">
        <i class="fas fa-trash"></i>
        <span>删除分组</span>
      </div>
    </div>

    <!-- 确认弹窗 -->
    <div v-if="确认弹窗.可见" class="确认弹窗覆盖层" @mousedown.self="确认弹窗.可见 = false">
      <div class="确认弹窗" @click.stop>
        <div class="确认弹窗标题">确认删除</div>
        <div class="确认弹窗消息">{{ 确认弹窗.消息 }}</div>
        <div class="确认弹窗按钮区">
          <button class="确认弹窗按钮" @click="确认弹窗.可见 = false">取消</button>
          <button class="确认弹窗按钮 确认弹窗危险" @click="确认删除分组">确认删除</button>
        </div>
      </div>
    </div>

    <!-- 图片右键菜单 -->
    <div v-if="图片右键菜单.可见" class="图片右键菜单覆盖层" @mousedown="关闭图片右键菜单" @contextmenu.prevent="关闭图片右键菜单"></div>
    <div v-if="图片右键菜单.可见" class="图片右键菜单" :style="{ left: 图片右键菜单.x + 'px', top: 图片右键菜单.y + 'px' }">
      <div class="图片右键菜单项" @click="图片右键裁切">
        <i class="fas fa-crop-alt"></i>
        <span>裁切壁纸</span>
      </div>
      <div class="图片右键菜单项 危险" @click="图片右键删除">
        <i class="fas fa-trash"></i>
        <span>删除壁纸</span>
      </div>
    </div>

    <!-- 裁切弹窗 -->
    <CropDialog v-if="裁切弹窗可见" :文件名="裁切目标.文件名" :分组名="裁切目标.分组名" @关闭="裁切弹窗可见 = false" @裁切完成="处理裁切完成" />

    <IconPickerPanel ref="图标面板Ref" />
  </Teleport>
</template>

<style scoped>
.壁纸库遮罩 {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.壁纸库弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border-radius: 12px;
  width: 760px;
  max-width: 90vw;
  height: 520px;
  max-height: 85vh;
  display: flex;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  position: relative;
  padding: 30px 0 8px 0;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
}
.关闭按钮 {
  position: absolute;
  top: 10px;
  right: 14px;
  cursor: pointer;
  color: var(--弱化文字颜色);
  font-size: 1rem;
  transition: color 0.15s;
  z-index: 1;
}
.关闭按钮:hover {
  color: var(--全站透明文字颜色);
}

/* 左侧分组栏 */
.分组栏 {
  width: 180px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.分组标题 {
  padding: 0 14px 10px 0;
  margin-left: 20px;
  margin-top: 4px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--全站通用文字颜色);
}
.分组列表 {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0 4px 8px;
}
.分组项 {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 14px;
  color: var(--弱化文字颜色);
  border-radius: 6px;
  margin-bottom: 2px;
}
.分组项:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.分组项.选中 {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  color: var(--全站通用文字颜色);
}
.分组项.选中 .分组图标 {
  opacity: 1;
}
.分组图标 {
  font-size: 16px;
  flex-shrink: 0;
  opacity: 0.7;
}
.可点击分组图标 {
  cursor: pointer;
  transition: opacity 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}
.可点击分组图标:hover {
  opacity: 1;
}
.分组Emoji图标 {
  font-size: 16px;
  line-height: 1;
}
.分组图片图标 {
  width: 20px;
  height: 20px;
  object-fit: contain;
  display: block;
}
.分组名称 {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.分组计数 {
  font-size: 11px;
  color: var(--弱化文字颜色);
  opacity: 0.6;
  flex-shrink: 0;
}
.重命名输入框 {
  flex: 1;
  padding: 2px 6px;
  border: 1px solid #4a9fa5;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--全站透明文字颜色);
  font-size: 13px;
  outline: none;
  min-width: 0;
}
.分组底部 {
  padding: 8px 8px 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.分组操作按钮 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  width: 100%;
}
.分组操作按钮:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--全站通用文字颜色);
}
.分组操作按钮--激活 {
  background: rgba(255, 255, 255, 0.15);
  color: var(--全站通用文字颜色);
}
.分组操作按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
.分组操作按钮:disabled:hover {
  background: transparent;
  color: var(--弱化文字颜色);
}
.操作按钮--危险 {
  color: #e74c3c;
}
.操作按钮--危险:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}
.弹出按钮行 {
  position: relative;
}
.弹出面板 {
  position: absolute;
  left: calc(100% + 4px);
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  z-index: 10;
  white-space: nowrap;
}
.弹出关闭 {
  position: absolute;
  top: 50%;
  right: -30px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.3);
  color: var(--全站透明文字颜色);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}
.弹出关闭:hover {
  background: #e74c3c;
  color: #fff;
}
.弹出输入框 {
  padding: 5px 10px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--全站透明文字颜色);
  font-size: 13px;
  outline: none;
  width: 220px;
}
.弹出输入框:focus {
  border-color: #4a9fa5;
}
.弹出确认按钮 {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  background: #4a9fa5;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
  transition: background 0.15s;
}
.弹出确认-button:hover:not(:disabled) {
  background: #3b8a8f;
}
.弹出确认按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
.弹出操作按钮 {
  padding: 5px 12px;
  border: none;
  border-radius: 4px;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}
.弹出操作-button:hover:not(:disabled) {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.25);
}
.弹出操作按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
.弹出操作按钮--危险 {
  background: rgba(231, 76, 60, 0.2);
  color: #e74c3c;
}
.弹出操作按钮--危险:hover:not(:disabled) {
  background: rgba(231, 76, 60, 0.35);
}
.弹出-enter-active {
  transition: all 0.2s ease-out;
}
.弹出-leave-active {
  transition: all 0.15s ease-in;
}
.弹出-enter-from {
  opacity: 0;
  transform: translateY(-50%) translateX(-8px);
}
.弹出-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(-8px);
}

/* 右侧图片区 */
.图片区 {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px;
  overflow: hidden;
}
.图片网格 {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  overflow-y: auto;
  align-content: flex-start;
}
.图片网格项 {
  width: 100px;
  height: 70px;
  border-radius: 6px;
  border: 2px solid transparent;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.15s;
  flex-shrink: 0;
  position: relative;
}
.图片网格项:hover {
  border-color: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.3);
}
.图片网格项.选中 {
  border-color: #4a9fa5;
}
.图片网格缩略图 {
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
}
.图片网格缩略图--加载中 {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.05);
  color: var(--弱化文字颜色);
  font-size: 14px;
}
.图片网格项--添加 {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.03);
  color: var(--弱化文字颜色);
  font-size: 20px;
  border-style: dashed;
  border-color: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
}
.图片网格项--添加:hover {
  color: var(--全站通用文字颜色);
  border-color: rgba(255, 255, 255, 0.5);
  background: rgba(255, 255, 255, 0.08);
}
.勾选框 {
  position: absolute;
  top: 4px;
  left: 4px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  line-height: 1;
  color: transparent;
  background: rgba(0, 0, 0, 0.4);
  transition: all 0.15s;
}
.勾选框.勾选 {
  background: #4a9fa5;
  border-color: #4a9fa5;
  color: #fff;
}
.图片网格项.编辑选中 {
  border-color: #e74c3c;
}
.图片底部 {
  display: flex;
  justify-content: flex-end;
  padding-top: 10px;
  flex-shrink: 0;
}
.确认按钮 {
  padding: 7px 24px;
  border: none;
  border-radius: 6px;
  background: #4a9fa5;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.确认按钮:hover {
  background: #3b8a8f;
}
.隐藏文件输入 {
  display: none;
}
</style>

<!-- 右键菜单和确认弹窗样式（非 scoped，Teleport 到 body） -->
<style>
.右键菜单覆盖层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001 !important;
}
.右键菜单 {
  position: fixed;
  z-index: 10002 !important;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 130px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.右键菜单项 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  cursor: pointer;
  color: var(--全站透明文字颜色);
  font-size: 13px;
  transition: background 0.15s;
}
.右键菜单项:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.右键菜单项 i {
  width: 14px;
  text-align: center;
  font-size: 12px;
}
.右键菜单项.危险 {
  color: #e74c3c;
}
.右键菜单项.危险:hover {
  background: rgba(231, 76, 60, 0.15);
}
.图片右键菜单覆盖层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10006 !important;
}
.图片右键菜单 {
  position: fixed;
  z-index: 10007 !important;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  border-radius: 6px;
  padding: 4px 0;
  min-width: 130px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.图片右键菜单项 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  cursor: pointer;
  color: var(--全站透明文字颜色);
  font-size: 13px;
  transition: background 0.15s;
}
.图片右键菜单项:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}
.图片右键菜单项 i {
  width: 14px;
  text-align: center;
  font-size: 12px;
}
.图片右键菜单项.危险 {
  color: #e74c3c;
}
.图片右键菜单项.危险:hover {
  background: rgba(231, 76, 60, 0.15);
}
.确认弹窗覆盖层 {
  position: fixed;
  inset: 0;
  z-index: 10003 !important;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}
.确认弹窗 {
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  border-radius: 6px;
  min-width: 300px;
  max-width: 380px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.确认弹窗标题 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  margin-bottom: 10px;
}
.确认弹窗消息 {
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-line;
}
.确认弹窗按钮区 {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.确认弹窗按钮 {
  padding: 5px 16px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
  border-radius: 4px;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.1);
  color: var(--全站透明文字颜色);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.确认弹窗按钮:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.2);
}
.确认弹窗按钮.确认弹窗危险 {
  color: #e74c3c;
  border-color: #e74c3c;
}
.确认弹窗按钮.确认弹窗危险:hover {
  background: rgba(231, 76, 60, 0.15);
}

/* 壁纸库图标选择面板样式已抽离到 图标选择面板.vue */
</style>
