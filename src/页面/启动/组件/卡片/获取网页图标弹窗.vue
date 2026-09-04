<template>
  <Teleport to="body">
    <div v-if="可见" class="弹窗覆盖层" @mousedown.self="取消">
      <div class="弹窗">
        <!-- 标题栏 -->
        <div class="弹窗标题">
          <h3>获取网页图标</h3>
          <i class="fas fa-times 关闭按钮" @click="取消"></i>
        </div>

        <!-- 标签栏 -->
        <div class="标签栏">
          <button v-for="标签 in 标签列表" :key="标签.键" class="标签项" :class="{ 激活: 当前标签 === 标签.键 }" @click="切换标签(标签.键)">
            <i :class="标签.图标"></i>
            <span>{{ 标签.名称 }}</span>
          </button>
        </div>

        <!-- ===== 自动抓取标签 ===== -->
        <template v-if="当前标签 === 'auto'">
          <!-- 提示区 -->
          <div v-if="错误信息" class="提示区 提示区--错误">
            <i class="fas fa-exclamation-circle"></i>
            <span>{{ 错误信息 }}</span>
          </div>
          <div v-else-if="提取完成" class="提示区 提示区--成功">
            <i class="fas fa-check-circle"></i>
            <span>{{ 自动提取提示 }}</span>
          </div>

          <!-- 诊断信息 -->
          <div v-if="提取完成" class="诊断区">
            <div class="诊断标题" @click="诊断展开 = !诊断展开">
              <i :class="诊断展开 ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
              <span>诊断信息</span>
            </div>
            <div v-if="诊断展开" class="诊断详情">
              <div v-if="诊断?.扫描网址" class="诊断行">
                <span class="诊断键">扫描网址:</span><span class="诊断值 诊断网址">{{ 诊断.扫描网址 }}</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">HTTP 状态:</span><span class="诊断值">{{ 诊断?.HTML获取状态 || '-' }}</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">HTML 长度:</span><span class="诊断值">{{ 诊断?.HTML长度 ? 诊断.HTML长度.toLocaleString() : '-' }} 字符</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">来源命中:</span>
                <span class="诊断值" v-if="诊断?.各来源命中 && Object.keys(诊断.各来源命中).length">
                  <span v-for="(v, k) in 诊断.各来源命中" :key="k" class="来源标签">{{ k }}: {{ v }}</span>
                </span>
                <span class="诊断值" v-else>-</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">候选 URL:</span><span class="诊断值">{{ 诊断?.候选URL数 ?? '-' }}</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">下载 成功/失败:</span><span class="诊断值">{{ 诊断?.下载成功数 ?? '-' }} / {{ 诊断?.下载失败数 ?? '-' }}</span>
              </div>
              <div class="诊断行">
                <span class="诊断键">最终返回:</span><span class="诊断值">{{ 诊断?.最终图标数 ?? '-' }} 个</span>
              </div>
              <div v-if="诊断?.失败原因 && Object.keys(诊断.失败原因).length" class="诊断行">
                <span class="诊断键">失败原因:</span>
                <span class="诊断值">
                  <span v-for="(v, k) in 诊断.失败原因" :key="k" class="来源标签">{{ k }}: {{ v }}</span>
                </span>
              </div>
              <div v-if="诊断?.错误" class="诊断行 诊断错误">                <span class="诊断键">错误:</span><span class="诊断值 诊断错值">{{ 诊断.错误 }}</span>
              </div>
            </div>
          </div>

          <!-- 扩大扫描到原网址（仅深路径 URL 显示） -->
          <div v-if="提取完成 && !提取中 && 用户URL非根网址" class="扩大扫描行">
            <button v-if="!已扩大" class="扩大扫描按钮" :disabled="扩大扫描中" @click="扩大扫描">
              <i :class="扩大扫描中 ? 'fas fa-spinner fa-pulse' : 'fas fa-expand-arrows-alt'"></i>
              <span>{{ 扩大扫描中 ? '扫描中...' : '扩大扫描到原网址' }}</span>
            </button>
            <span v-if="已扩大" class="扩大扫描状态">已扩大扫描</span>
            <span v-if="扩大扫描提示" class="扩大扫描提示">{{ 扩大扫描提示 }}</span>
          </div>

          <!-- 加载状态 -->
          <div v-if="提取中" class="加载状态">
            <i class="fas fa-spinner fa-pulse fa-2x"></i>
            <span>正在获取网页图标...</span>
          </div>

          <!-- 空状态 -->
          <div v-else-if="提取完成 && 已绑定列表.length === 0 && 自动列表.length === 0" class="空状态">
            <i class="fas fa-image 空图标"></i>
            <span>未找到合适的图标，可切换至 URL 下载标签手动输入</span>
          </div>

          <!-- 图标列表 -->
          <div v-else-if="已绑定列表.length > 0 || 自动列表.length > 0" class="图标列表">
            <!-- 已绑定分组 -->
            <template v-if="已绑定列表.length > 0">
              <div class="分组标题">已绑定 {{ 已绑定列表.length }} 个</div>
              <div v-for="图标 in 已绑定列表" :key="`已绑定_${图标.值}`" class="图标项" :class="{ '图标项--选中': 选中项?.类型 === '已绑定' && 选中项.值 === 图标.值, '图标项--使用中': 是否使用中高亮(图标.值), '图标项--使用中淡化': 图标.值 === props.当前图标代码 && !是否使用中高亮(图标.值) }" @click="选中项 = { 类型: '已绑定', 值: 图标.值 }">
                <div class="图标缩略图">
                  <img v-if="已绑定预览缓存[图标.值]" :src="已绑定预览缓存[图标.值]" :alt="图标.显示名" class="缩略图图片" />
                  <i v-else class="fas fa-spinner fa-pulse 缩略图占位"></i>
                </div>
                <span class="图标文件名">{{ 图标.显示名 }}</span>
                <span class="来源标注 来源标注--已绑定 已绑定分组名" :title="`绑定在：${图标.分组名}`">已绑定 · {{ 图标.分组名 }}</span>
                <i v-if="图标.值 === props.当前图标代码" class="fas fa-check-circle 使用中标记" :class="{ '使用中标记--淡化': !是否使用中高亮(图标.值) }" title="当前正在使用"></i>
              </div>
            </template>
            <!-- 新扫描分组 -->
            <template v-if="自动列表.length > 0">
              <div class="分组标题">新扫描 {{ 自动列表.length }} 个</div>
              <div v-for="图标 in 自动列表" :key="图标.唯一键" class="图标项" :class="{ '图标项--选中': 选中项?.类型 === '扫描' && 选中项.唯一键 === 图标.唯一键 }" @click="选中项 = { 类型: '扫描', 唯一键: 图标.唯一键 }">
                <div class="图标缩略图">
                  <img v-if="自动预览缓存[图标.唯一键]" :src="自动预览缓存[图标.唯一键]" :alt="图标.文件名" class="缩略图图片" />
                  <i v-else class="fas fa-image 缩略图占位"></i>
                </div>
                <span class="图标文件名" :title="图标.文件名">{{ 图标.文件名 }}</span>
                <span class="来源标注">{{ 图标.来源标签 }}</span>
                <span class="标注行">
                  <span v-if="图标.尺寸标注" class="尺寸标注">{{ 图标.尺寸标注 }}</span>
                  <span class="扩展名标注">{{ 图标.扩展名.toUpperCase() }}</span>
                </span>
              </div>
            </template>
          </div>
        </template>

        <!-- ===== 网页图标标签 ===== -->
        <template v-if="当前标签 === 'url'">
          <div class="URL下载区">
            <div class="URL输入行">
              <input v-model="URL输入" class="URL输入框" placeholder="输入图片下载地址..." @keyup.enter="执行URL下载" />
              <button class="URL下载按钮" @click="执行URL下载" :disabled="!URL输入.trim() || URL下载中">
                <i v-if="URL下载中" class="fas fa-spinner fa-pulse"></i>
                <i v-else class="fas fa-download"></i>
                <span>{{ URL下载中 ? '下载中...' : '下载' }}</span>
              </button>
            </div>
            <div v-if="URL下载预览" class="URL预览区">
              <div class="URL预览标题">下载预览</div>
              <div class="URL预览图">
                <img :src="URL下载预览" alt="预览" class="URL预览图片" />
                <i class="fas fa-check-circle URL选中标记"></i>
              </div>
              <div class="URL预览提示">点击底部"新增并使用"确认</div>
            </div>
            <div v-else class="URL空状态">
              <i class="fas fa-link 空图标"></i>
              <span>输入图片网址下载图标</span>
            </div>
          </div>
        </template>

        <!-- 底部按钮 -->
        <div class="弹窗底部">
          <div class="分组选择行">
            <span class="分组选择标签">添加到分组</span>
            <select v-model="目标分组" class="分组选择框" title="新图标将添加到所选分组">
              <option v-for="分组名 in 分组选项" :key="分组名" :value="分组名">{{ 分组名 }}</option>
            </select>
            <button class="新建分组按钮" title="新建分组" @click="打开新建分组弹窗">
              <i class="fas fa-plus"></i>
            </button>
          </div>
          <button class="取消按钮" @click="取消">取消</button>
          <button class="确认按钮" :disabled="!可确认" @click="确认选择">
            <i v-if="确认中" class="fas fa-spinner fa-pulse"></i>
            <span>{{ 确认中 ? '处理中...' : 确认按钮文案 }}</span>
          </button>
        </div>

        <!-- 新增二次确认 -->
        <div v-if="新增确认可见" class="新增确认覆盖层" @mousedown.self="新增确认可见 = false">
          <div class="新增确认弹窗" @click.stop>
            <div class="新增确认标题">确认新增图标</div>
            <div class="新增确认消息">此网站已绑定 {{ 已绑定列表.length }} 个图标，确定要再新增 1 个到「{{ 目标分组 }}」？</div>
            <div class="新增确认按钮区">
              <button class="新增确认取消按钮" @click="新增确认可见 = false">取消</button>
              <button class="新增确认确定按钮" @click="执行确认新增">确认新增</button>
            </div>
          </div>
        </div>

        <!-- 新建分组弹窗 -->
        <div v-if="新建分组可见" class="新增确认覆盖层" @mousedown.self="关闭新建分组弹窗">
          <div class="新增确认弹窗" @click.stop>
            <div class="新增确认标题">新建分组</div>
            <input v-model="新建分组名称" class="新建分组输入框" placeholder="分组名称" @keyup.enter="执行新建分组" @keyup.escape="关闭新建分组弹窗" autofocus />
            <div v-if="新建分组错误" class="新建分组错误">{{ 新建分组错误 }}</div>
            <div class="新增确认按钮区">
              <button class="新增确认取消按钮" @click="关闭新建分组弹窗">取消</button>
              <button class="新增确认确定按钮" @click="执行新建分组">创建</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { 使用图标库仓库, 规范化域名 } from '@/页面/启动/仓库/图标库仓库'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'

/** 后端扫描返回的原始图标项 */
interface 扫描图标原始项 {
  临时文件名: string
  来源: 'favicon' | 'webpage'
  原始URL: string
  像素尺寸: { 宽: number; 高: number }
  尺寸标注: string
}

/** 自动抓取显示图标项 */
interface 自动图标项 {
  唯一键: string
  文件名: string
  来源: 'favicon' | 'webpage'
  来源标签: string
  /** 临时文件名（如 webimg_xxx.png / favicon_xxx.svg） */
  临时文件名: string
  /** 原始 URL（favicon 为空串），用于扩大扫描去重 */
  原始URL: string
  尺寸标注: string
  /** 图片扩展名（小写、不含点），用于在名称过长被截断时仍能看到格式 */
  扩展名: string
}

const props = defineProps<{
  可见: boolean
  网页URL: string
  /** 当前卡片正在使用的图标值（icons:xxx），用于标记"使用中" */
  当前图标代码?: string
}>()

const emit = defineEmits<{
  选择: [图标值: string, 是否新增?: boolean]
  取消: []
}>()

const 图标库 = 使用图标库仓库()
const 历史仓库 = 使用图标选择历史仓库()

const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动扫描网页图片

// ===== 标签 =====
type 标签键 = 'auto' | 'url'
const 当前标签 = ref<标签键>('auto')
const 标签列表 = [
  { 键: 'auto' as 标签键, 名称: '自动抓取', 图标: 'fas fa-magnifying-glass' },
  { 键: 'url' as 标签键, 名称: 'URL 下载', 图标: 'fas fa-link' },
]

function 切换标签(键: 标签键) {
  当前标签.value = 键
}

// ===== 域名提取 =====
function 提取域名(): string {
  try {
    return new URL(props.网页URL).hostname
  } catch {
    return ''
  }
}

/** 提取根网址（origin，如 https://example.com），用于首次扫描以保证扫到根目录资源 */
function 提取根网址(): string {
  try {
    return new URL(props.网页URL).origin
  } catch {
    return ''
  }
}

/** 用户输入的 URL 是否为深路径（与根网址不同），不同时才提供"扩大扫描"入口 */
const 用户URL非根网址 = computed(() => {
  const 根 = 提取根网址()
  if (!根 || !props.网页URL) return false
  try {
    const u = new URL(props.网页URL)
    // 有 pathname（非 "/"）或 search 或 hash 即视为深路径
    return u.pathname !== '/' || !!u.search || !!u.hash
  } catch {
    return false
  }
})

// ===== 自动抓取 =====
const 提取中 = ref(false)
const 提取完成 = ref(false)
const 自动列表 = ref<自动图标项[]>([])
const 错误信息 = ref('')
const 诊断 = ref<Record<string, number | string | Record<string, number> | undefined> | null>(null)
const 诊断展开 = ref(false)
const 自动预览缓存 = reactive<Record<string, string>>({})

// ===== 已绑定图标（当前域名在图标库中已有的网页图标）=====
const 已绑定列表 = ref<{ 值: string; 显示名?: string; 分组名: string }[]>([])
const 已绑定预览缓存 = reactive<Record<string, string>>({})

/** 当前选中的条目（已绑定复用 / 新扫描新增） */
const 选中项 = ref<{ 类型: '已绑定'; 值: string } | { 类型: '扫描'; 唯一键: string } | null>(null)

// ===== 目标分组（新增图标时写入的 urlDownload 分组） =====
const 目标分组 = ref('默认分组')
const 分组选项 = computed(() => {
  const 类别 = 图标库.原始数据?.urlDownload
  if (!类别) return []
  return 类别.分组列表.map((g) => g.名称)
})

/** 重置目标分组：优先"默认分组"，其次第一个分组 */
function 重置目标分组() {
  const 名称s = 分组选项.value
  if (名称s.includes('默认分组')) {
    目标分组.value = '默认分组'
  } else if (名称s.length > 0) {
    const 首个 = 名称s[0]
    if (首个) 目标分组.value = 首个
  } else {
    目标分组.value = '默认分组'
  }
}

// ===== 新建分组 =====
const 新建分组可见 = ref(false)
const 新建分组名称 = ref('')
const 新建分组错误 = ref('')

/** 生成默认分组名：统计现有"默认分组"前缀分组数 n，n=0 用"默认分组"，否则"默认分组{n}" */
function 生成默认分组名(): string {
  const 数量 = 分组选项.value.filter((g) => g.startsWith('默认分组')).length
  return 数量 === 0 ? '默认分组' : `默认分组${数量}`
}

function 打开新建分组弹窗() {
  新建分组错误.value = ''
  新建分组名称.value = 生成默认分组名()
  新建分组可见.value = true
}

function 关闭新建分组弹窗() {
  新建分组可见.value = false
  新建分组错误.value = ''
}

async function 执行新建分组() {
  const 名称 = 新建分组名称.value.trim()
  if (!名称) {
    新建分组错误.value = '请输入分组名称'
    return
  }
  if (分组选项.value.includes(名称)) {
    新建分组错误.value = '分组已存在'
    return
  }
  try {
    const 结果 = await window.electronAPI.图标库添加分组('urlDownload', 名称)
    if (结果.成功) {
      图标库.原始数据 = 结果.数据
    } else {
      const 读取 = await window.electronAPI.图标库读取数据()
      if (读取.成功) 图标库.原始数据 = 读取.数据
    }
    目标分组.value = 名称
    关闭新建分组弹窗()
  } catch {
    新建分组错误.value = '创建失败'
  }
}

// ===== 新增二次确认 =====
const 新增确认可见 = ref(false)
let 新增已确认 = false

const 自动提取提示 = computed(() => {
  const 绑定数 = 已绑定列表.value.length
  const 扫描数 = 自动列表.value.length
  if (绑定数 > 0 && 扫描数 > 0) return `已绑定 ${绑定数} 个 · 新扫描 ${扫描数} 个`
  if (绑定数 > 0) return `已绑定 ${绑定数} 个图标`
  if (扫描数 > 0) return `找到 ${扫描数} 个图标（favicon + 网页图片）`
  return ''
})

function 清空自动状态() {
  自动列表.value = []
  错误信息.value = ''
  提取完成.value = false
  诊断.value = null
  诊断展开.value = false
  Object.keys(自动预览缓存).forEach((key) => delete 自动预览缓存[key])
}

/** 收集图标库中绑定当前域名的全部网页图标并预加载预览 */
async function 加载已绑定列表() {
  const 域名 = 提取域名()
  if (!域名) return
  try {
    if (!图标库.原始数据?.urlDownload) {
      await 图标库.加载数据()
    }
    const 类别 = 图标库.原始数据?.urlDownload
    const 列表: { 值: string; 显示名?: string; 分组名: string }[] = []
    if (类别) {
      for (const 分组 of 类别.分组列表) {
        for (const i of 分组.图标) {
          if (i.值.startsWith('icons:') && i.绑定域名 && 规范化域名(i.绑定域名) === 规范化域名(域名)) {
            列表.push({ 值: i.值, 显示名: i.显示名, 分组名: 分组.名称 })
          }
        }
      }
    }
    已绑定列表.value = 列表
    Object.keys(已绑定预览缓存).forEach((key) => delete 已绑定预览缓存[key])
    for (const 图标 of 列表) {
      读取图标库图片Base64(图标.值).then((base64) => {
        if (base64) 已绑定预览缓存[图标.值] = base64
      })
    }
    重置目标分组()
    设置默认选中()
  } catch {
    // 静默
  }
}

/** 设置默认选中：优先当前正在使用的图标，其次已绑定首个，最后新扫描首个 */
function 设置默认选中() {
  if (选中项.value) return
  const 当前使用 = 已绑定列表.value.find((i) => i.值 === props.当前图标代码)
  if (当前使用) {
    选中项.value = { 类型: '已绑定', 值: 当前使用.值 }
    return
  }
  if (已绑定列表.value.length > 0) {
    const 首个 = 已绑定列表.value[0]
    if (首个) {
      选中项.value = { 类型: '已绑定', 值: 首个.值 }
    }
    return
  }
  if (自动列表.value.length > 0) {
    const 首个 = 自动列表.value[0]
    if (首个) {
      选中项.value = { 类型: '扫描', 唯一键: 首个.唯一键 }
    }
  }
}

/** 使用中标记是否保持绿色：未选中其他项，或正选中它自己时保持绿色 */
function 是否使用中高亮(值: string): boolean {
  if (值 !== props.当前图标代码) return false
  if (!选中项.value) return true
  return 选中项.value.类型 === '已绑定' && 选中项.value.值 === 值
}

async function 加载自动预览(图标: 自动图标项) {
  if (自动预览缓存[图标.唯一键]) return
  try {
    const 结果 = await window.electronAPI.启动读取缓存图片(图标.临时文件名)
    if (结果.成功 && 结果.base64) {
      自动预览缓存[图标.唯一键] = 结果.base64
    }
  } catch {
    // 静默
  }
}

/** 来源标签映射 */
const 来源标签映射: Record<string, string> = { favicon: 'Favicon', webpage: '网页图片' }

/** 把后端扫描项映射为前端展示项；起始索引用于避免唯一键冲突 */
function 映射扫描项(列表: 扫描图标原始项[], 起始索引 = 0): 自动图标项[] {
  return 列表.map((item, i) => {
    const idx = 起始索引 + i
    const 短名 = item.原始URL.split('/').pop()?.split('?')[0] || ''
    const 来源文件名 = item.来源 === 'favicon' ? '网站 Favicon' : 短名 || '网页图片'
    const 扩展名 = /\.([a-z0-9]+)$/i.exec(短名)?.[1] || /\.([a-z0-9]+)$/i.exec(item.临时文件名)?.[1] || 'png'
    return {
      唯一键: `${item.来源}_${idx}_${item.临时文件名}`,
      文件名: 来源文件名,
      来源: item.来源,
      来源标签: 来源标签映射[item.来源] || item.来源,
      临时文件名: item.临时文件名,
      原始URL: item.原始URL,
      尺寸标注: item.尺寸标注,
      扩展名: 扩展名.toLowerCase(),
    }
  })
}

/** 去重键：favicon 统一归为 'favicon'，网页图片按原始 URL 去重 */
function 去重键(项: { 来源: string; 原始URL: string }): string {
  return 项.来源 === 'favicon' ? 'favicon' : `webpage:${项.原始URL}`
}

async function 执行自动提取() {
  if (!props.网页URL || 提取中.value) return
  提取中.value = true
  清空自动状态()
  try {
    // 首次扫描根网址（origin），以保证扫到根目录的 favicon / logo
    const 根网址 = 提取根网址() || props.网页URL
    const 结果 = await window.electronAPI.启动扫描网页图片(根网址)
    诊断.value = 结果.诊断信息 || null
    if (结果.成功 && 结果.图标列表?.length) {
      自动列表.value = 映射扫描项(结果.图标列表)
      自动列表.value.forEach((item) => 加载自动预览(item))
      设置默认选中()
    } else {
      错误信息.value = 结果.错误信息 || '未获取到任何图标'
    }
  } catch (e) {
    错误信息.value = String(e)
  }
  提取完成.value = true
  提取中.value = false
}

// ===== 扩大扫描到原网址（深路径） =====
const 已扩大 = ref(false)
const 扩大扫描中 = ref(false)
const 扩大扫描提示 = ref('')

/** 对用户输入的原始 URL 再扫一次，把新图标追加到列表（按来源+原始URL去重） */
async function 扩大扫描() {
  if (!props.网页URL || 扩大扫描中.value || 已扩大.value) return
  扩大扫描中.value = true
  扩大扫描提示.value = ''
  try {
    const 结果 = await window.electronAPI.启动扫描网页图片(props.网页URL)
    if (结果.成功 && 结果.图标列表?.length) {
      const 已有键集 = new Set(自动列表.value.map((i) => 去重键(i)))
      const 新增原始 = 结果.图标列表.filter((item) => !已有键集.has(去重键(item)))
      if (新增原始.length > 0) {
        const 起始索引 = 自动列表.value.length
        const 新增项 = 映射扫描项(新增原始, 起始索引)
        自动列表.value = [...自动列表.value, ...新增项]
        新增项.forEach((item) => 加载自动预览(item))
        扩大扫描提示.value = `新增 ${新增项.length} 个图标`
      } else {
        扩大扫描提示.value = '原网址未发现新图标'
      }
    } else {
      扩大扫描提示.value = 结果.错误信息 || '原网址未获取到图标'
    }
  } catch (e) {
    扩大扫描提示.value = String(e)
  } finally {
    已扩大.value = true
    扩大扫描中.value = false
  }
}

// ===== 网页图标标签页状态 =====
const URL输入 = ref('')
const URL下载中 = ref(false)
const URL下载预览 = ref<string | null>(null)
let URL下载缓存文件名 = ''

async function 执行URL下载() {
  const url = URL输入.value.trim()
  if (!url || URL下载中.value || !是Electron) return
  URL下载中.value = true
  URL下载预览.value = null
  try {
    const 下载结果 = await window.electronAPI.图标库下载图片到缓存(url)
    if (!下载结果.成功 || !下载结果.缓存文件名) {
      错误信息.value = 下载结果.错误信息 || '下载失败'
      return
    }
    URL下载缓存文件名 = 下载结果.缓存文件名
    const 预览结果 = await window.electronAPI.图标库读取缓存图片(URL下载缓存文件名)
    if (预览结果.成功 && 预览结果.base64) {
      URL下载预览.value = 预览结果.base64
    }
  } catch (e) {
    错误信息.value = String(e)
  } finally {
    URL下载中.value = false
  }
}

// ===== 读取图标库图片 base64（已绑定预览用） =====
async function 读取图标库图片Base64(图标值: string): Promise<string> {
  if (!图标值.startsWith('icons:')) return ''
  const 相对路径 = 图标值.replace('icons:', '')
  try {
    const 结果 = await window.electronAPI.图标库读取图片(相对路径)
    if (结果.成功 && 结果.base64) return 结果.base64
  } catch {
    // 静默
  }
  return ''
}

// ===== 确认选择 =====
const 确认中 = ref(false)

/** 底部确认按钮文案：复用已绑定图标 vs 新增图标 */
const 确认按钮文案 = computed(() => {
  if (当前标签.value === 'auto' && 选中项.value?.类型 === '已绑定') return '复用此图标'
  return '新增并使用'
})

const 可确认 = computed(() => {
  if (确认中.value) return false
  if (当前标签.value === 'auto') return !!选中项.value
  if (当前标签.value === 'url') return !!URL下载预览.value
  return false
})

/** 把 base64 上传到图标库并添加到 urlDownload 类别，返回图标值 */
async function 上传Base64到图标库(base64: string): Promise<string> {
  const 上传结果 = await window.electronAPI.图标库上传图片(base64)
  if (!上传结果.成功 || !上传结果.相对路径) throw new Error('上传图标库失败')
  const 图标值 = `icons:${上传结果.相对路径}`
  await 添加到图标库(图标值)
  return 图标值
}

/** 把缓存文件确认持久化并添加到 urlDownload 类别，返回图标值 */
async function 确认缓存到图标库(缓存文件名: string): Promise<string> {
  const 确认结果 = await window.electronAPI.图标库确认缓存图片(缓存文件名)
  if (!确认结果.成功 || !确认结果.相对路径) throw new Error('确认缓存失败')
  const 图标值 = `icons:${确认结果.相对路径}`
  await 添加到图标库(图标值)
  return 图标值
}

/** 添加到图标库 urlDownload 类别 + 刷新仓库 */
async function 添加到图标库(图标值: string) {
  const 域名 = 提取域名()
  let 显示名 = 域名 || props.网页URL
  if (显示名.startsWith('www.')) 显示名 = 显示名.replace('www.', '')
  await window.electronAPI.图标库添加图标('urlDownload', 目标分组.value, {
    值: 图标值,
    显示名,
    绑定域名: 规范化域名(域名),
  })
  const 读取数据结果 = await window.electronAPI.图标库读取数据()
  if (读取数据结果.成功) {
    图标库.原始数据 = 读取数据结果.数据
  }
}

async function 确认选择() {
  if (!可确认.value || 确认中.value) return
  const 选中 = 选中项.value
  // 已绑定图标：直接复用，不新增记录；同时清理启动扫描缓存（防止临时文件残留）
  if (当前标签.value === 'auto' && 选中?.类型 === '已绑定') {
    const 已绑定项 = 已绑定列表.value.find((i) => i.值 === 选中.值)
    if (!已绑定项) return
    选中项.value = null
    try {
      await window.electronAPI.启动取消图标选择()
    } catch {
      // 静默
    }
    emit('选择', 已绑定项.值)
    return
  }
  // auto 扫描项 / url 下载均属新增；已有绑定时二次确认
  if (已绑定列表.value.length >= 1 && !新增已确认) {
    新增确认可见.value = true
    return
  }
  确认中.value = true
  try {
    let 图标值 = ''
    if (当前标签.value === 'auto') {
      const 图标 = 自动列表.value.find((i) => 选中?.类型 === '扫描' && i.唯一键 === 选中.唯一键)
      if (!图标) return
      // base64 中转：启动缓存 → 图标库持久化
      const 缓存结果 = await window.electronAPI.启动读取缓存图片(图标.临时文件名)
      if (!缓存结果.成功 || !缓存结果.base64) throw new Error('读取缓存失败')
      图标值 = await 上传Base64到图标库(缓存结果.base64)
    } else if (当前标签.value === 'url') {
      if (!URL下载缓存文件名) return
      图标值 = await 确认缓存到图标库(URL下载缓存文件名)
    }
    if (!图标值) return
    历史仓库.添加('global', 图标值)
    // 清理启动图标缓存（启动扫描网页图片写入的临时文件，确认后不再需要）
    try {
      await window.electronAPI.启动取消图标选择()
    } catch {
      // 静默
    }
    选中项.value = null
    emit('选择', 图标值, true)
  } catch (e) {
    错误信息.value = String(e)
  } finally {
    确认中.value = false
  }
}

/** 二次确认后继续执行新增 */
async function 执行确认新增() {
  新增已确认 = true
  新增确认可见.value = false
  await 确认选择()
  新增已确认 = false
}

function 取消() {
  // 清理启动图标缓存（扫描产生的临时文件）
  try {
    window.electronAPI?.启动取消图标选择()
  } catch {
    // 静默
  }
  emit('取消')
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (新增确认可见.value) {
    新增确认可见.value = false
    return
  }
  if (新建分组可见.value) {
    关闭新建分组弹窗()
    return
  }
  取消()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))

// ===== 监听可见性 =====
watch(
  () => props.可见,
  (新值) => {
    if (新值) {
      当前标签.value = 'auto'
      清空自动状态()
      URL输入.value = ''
      URL下载预览.value = null
      URL下载缓存文件名 = ''
      错误信息.value = ''
      选中项.value = null
      已绑定列表.value = []
      Object.keys(已绑定预览缓存).forEach((key) => delete 已绑定预览缓存[key])
      新增已确认 = false
      新增确认可见.value = false
      新建分组可见.value = false
      新建分组错误.value = ''
      已扩大.value = false
      扩大扫描中.value = false
      扩大扫描提示.value = ''
      重置目标分组()
      加载已绑定列表()
      if (props.网页URL) {
        执行自动提取()
      }
    }
  },
)
</script>

<style scoped>
.弹窗覆盖层 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11000;
}
.弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 12px;
  width: 80vw;
  max-width: 80vw;
  height: 80vh;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.弹窗标题 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  flex-shrink: 0;
}
.弹窗标题 h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--全站通用文字颜色);
}
.关闭按钮 {
  cursor: pointer;
  color: var(--弱化文字颜色);
  font-size: 1rem;
}
.关闭按钮:hover {
  color: var(--全站通用文字颜色);
}

/* ===== 标签栏 ===== */
.标签栏 {
  display: flex;
  gap: 4px;
  padding: 0 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
}
.标签项 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  font-size: 0.9rem;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}
.标签项:hover {
  color: var(--全站透明文字颜色);
}
.标签项.激活 {
  color: var(--全站通用文字颜色);
  border-bottom-color: var(--全站通用文字颜色);
}
.标签项 i {
  font-size: 0.85rem;
}

/* ===== 提示区 ===== */
.提示区 {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px;
  font-size: 0.85rem;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
}
.提示区--错误 {
  color: #e74c3c;
  background: rgba(231, 76, 60, 0.08);
}
.提示区--成功 {
  color: #2ecc71;
  background: rgba(46, 204, 113, 0.08);
}

/* ===== 扩大扫描到原网址 ===== */
.扩大扫描行 {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px;
  flex-shrink: 0;
}
.扩大扫描按钮 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 30%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.扩大扫描按钮:hover:not(:disabled) {
  border-color: var(--全站通用文字颜色);
  color: var(--全站通用文字颜色);
}
.扩大扫描按钮:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.扩大扫描状态 {
  font-size: 0.85rem;
  color: var(--弱化文字颜色);
}
.扩大扫描提示 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
}

/* ===== 加载/空状态 ===== */
.加载状态,
.空状态,
.URL空状态 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: var(--弱化文字颜色);
  flex: 1;
}
.空图标 {
  font-size: 3rem;
  opacity: 0.5;
}

/* ===== 自动抓取图标列表 ===== */
.图标列表 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}
.分组标题 {
  grid-column: 1 / -1;
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  user-select: none;
  padding: 6px 0 2px;
}
.分组标题:not(:first-child) {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.图标列表::-webkit-scrollbar {
  width: 8px;
}
.图标列表::-webkit-scrollbar-thumb {
  background: var(--滚动条颜色);
  border-radius: 4px;
}
.图标项 {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 6px;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  box-sizing: border-box;
  position: relative;
}
.图标项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.图标项--选中 {
  outline: 2px solid var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.图标项--使用中 {
  outline: 2px solid #2ecc71;
}
.图标项--使用中淡化 {
  outline: 2px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  opacity: 0.45;
}
.使用中标记 {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #2ecc71;
  font-size: 1.1rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.使用中标记--淡化 {
  color: var(--弱化文字颜色);
}
.来源标注--已绑定 {
  color: #2ecc71;
}
.已绑定分组名 {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  line-height: 1.2;
}
.图标缩略图 {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.缩略图图片 {
  width: 48px;
  height: 48px;
  object-fit: contain;
}
.缩略图占位 {
  font-size: 1.2rem;
  color: var(--弱化文字颜色);
}
.图标文件名 {
  font-size: 0.7rem;
  color: var(--弱化文字颜色);
  text-align: center;
  word-break: break-all;
  line-height: 1.2;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  line-clamp: 1;
}
.来源标注,
.尺寸标注 {
  font-size: 0.65rem;
  color: var(--弱化文字颜色);
  line-height: 1;
}
/* 尺寸 + 扩展名同一行 */
.标注行 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  line-height: 1;
}
/* 扩展名单独标注：名称过长被截断时仍能看到格式 */
.扩展名标注 {
  display: inline-block;
  padding: 0 3px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 12%, transparent);
  font-size: 0.6rem;
  color: var(--全站通用文字颜色);
  line-height: 1.4;
}

/* ===== 诊断区 ===== */
.诊断区 {
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
}
.诊断标题 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 24px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  user-select: none;
  transition: color 0.15s;
}
.诊断标题:hover {
  color: var(--全站透明文字颜色);
}
.诊断标题 i {
  font-size: 0.65rem;
  width: 12px;
}
.诊断详情 {
  padding: 4px 24px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.诊断行 {
  display: flex;
  gap: 10px;
  font-size: 0.75rem;
  line-height: 1.5;
}
.诊断行.诊断错误 {
  color: #e74c3c;
}
.诊断键 {
  color: var(--弱化文字颜色);
  min-width: 80px;
  flex-shrink: 0;
}
.诊断值 {
  color: var(--弱化文字颜色);
  word-break: break-all;
}
.诊断错值 {
  color: #e74c3c;
}
.诊断网址 {
  color: var(--全站通用文字颜色);
  font-size: 0.75rem;
}
.来源标签 {
  display: inline-block;
  margin-right: 8px;
  padding: 1px 5px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  border-radius: 3px;
  color: var(--弱化文字颜色);
  font-size: 0.7rem;
}

/* ===== 网页图标标签区 ===== */
.URL下载区 {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
  overflow-y: auto;
}
.URL输入行 {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}
.URL输入框 {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}
.URL输入框::placeholder {
  color: var(--弱化文字颜色);
}
.URL输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.URL下载按钮 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 18px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.URL下载按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.URL下载按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
.URL预览区 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}
.URL预览标题 {
  font-size: 0.9rem;
  color: var(--全站透明文字颜色);
}
.URL预览图 {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  outline: 2px solid var(--全站通用文字颜色);
}
.URL预览图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.URL选中标记 {
  position: absolute;
  top: 2px;
  right: 2px;
  color: var(--全站通用文字颜色);
  font-size: 1rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}
.URL预览提示 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
}

/* ===== 底部 ===== */
.弹窗底部 {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
}
.分组选择行 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: auto;
  color: var(--弱化文字颜色);
  font-size: 0.85rem;
}
.分组选择框 {
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.85rem;
  outline: none;
  max-width: 180px;
}
.分组选择框:focus {
  border-color: var(--全站通用文字颜色);
}
.分组选择框 option {
  background: #1e2128;
  color: #ddd;
}
.新建分组按钮 {
  width: 26px;
  height: 26px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  flex-shrink: 0;
}
.新建分组按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.取消按钮 {
  padding: 10px 24px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.95rem;
  transition: background 0.15s;
}
.取消按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.确认按钮 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  background: #4a9fa5;
  color: #fff;
  transition: background 0.15s;
}
.确认按钮:hover:not(:disabled) {
  background: #3b8a8f;
}
.确认按钮:disabled {
  opacity: 0.5;
  cursor: default;
}

/* ===== 新增二次确认 ===== */
.新增确认覆盖层 {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 12000;
}
.新增确认弹窗 {
  width: 380px;
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 20px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.新增确认标题 {
  font-size: 1rem;
  color: var(--全站通用文字颜色);
  margin-bottom: 12px;
}
.新增确认消息 {
  font-size: 0.9rem;
  color: var(--全站透明文字颜色);
  line-height: 1.5;
  margin-bottom: 18px;
}
.新增确认按钮区 {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.新增确认取消按钮 {
  padding: 8px 20px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.新增确认取消按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.新增确认确定按钮 {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background: #4a9fa5;
  color: #fff;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.15s;
}
.新增确认确定按钮:hover {
  background: #3b8a8f;
}
.新建分组输入框 {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色);
  font-size: 0.9rem;
  outline: none;
  margin-bottom: 10px;
}
.新建分组输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.新建分组错误 {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-bottom: 10px;
}
</style>
