<template>
  <Teleport to="body">
    <div v-if="可见" class="弹窗覆盖层" @mousedown.self="关闭">
      <div class="弹窗">
        <div class="弹窗标题">
          <h3>{{ 弹窗标题文本 }}</h3>
          <i class="fas fa-times 关闭按钮" @click="关闭"></i>
        </div>

        <div class="弹窗主体">
          <!-- ===== 上半：表单字段（全宽） ===== -->
          <div class="表单区">
            <div class="表单行">
              <label>标题</label>
              <input v-model="标题" class="输入框" placeholder="输入卡片标题" />
            </div>

            <div class="表单行">
              <label>{{ 路径标签 }}</label>
              <div class="输入行">
                <input v-model="路径值" class="输入框" :placeholder="路径占位" @paste="处理粘贴" />
                <button v-if="卡片类型 === 'folder' || 卡片类型 === 'app'" class="选择按钮" @click="选择路径">
                  <i class="fas fa-folder-open"></i>
                </button>
              </div>
              <div v-if="路径提示" class="路径提示">{{ 路径提示 }}</div>
            </div>

            <div class="表单行">
              <div class="背景颜色行">
                <div class="颜色分组">
                  <label>背景颜色</label>
                  <label class="颜色选择器容器" title="选择颜色">
                    <input type="color" class="原生颜色选择器" :value="选中颜色" @input="颜色输入处理" @change="颜色完成处理" />
                    <span class="色环装饰"></span>
                  </label>
                  <span class="颜色值显示">{{ 选中颜色 }}</span>
                </div>
                <div class="透明分组">
                  <span class="透明标签文字">透明背景</span>
                  <label class="透明开关标签" title="白色背景">
                    <span class="滑动开关" :class="{ '滑动开关--开': 透明背景开关 }">
                      <input type="checkbox" class="滑动开关输入" v-model="透明背景开关" />
                      <span class="滑动开关滑块"></span>
                    </span>
                  </label>
                </div>
              </div>
              <!-- 历史颜色 -->
              <div v-if="历史颜色.length > 0" class="历史颜色行">
                <button v-for="颜色 in 历史颜色" :key="颜色" class="色块选项 历史色块" :class="{ 选中: 选中颜色 === 颜色 && !透明背景开关 }" :style="{ backgroundColor: 颜色 }" @click="选择历史颜色(颜色)"></button>
              </div>
              <!-- 固定色盘 -->
              <div class="色盘选择">
                <div v-for="(颜色, 索引) in 色盘" :key="索引" class="色块选项" :class="{ 选中: 选中颜色 === 颜色 && !透明背景开关 }" :style="{ backgroundColor: 颜色 }" @click="选择色盘颜色(颜色)"></div>
              </div>
            </div>
          </div>

          <!-- ===== 下半：图标配置（左右分栏） ===== -->
          <div class="图标配置组">
            <!-- 左栏：预览区 -->
            <div class="预览区">
              <div class="卡片预览" :style="{ backgroundColor: 透明背景开关 ? 'transparent' : 选中颜色 || '#4a6fa5' }">
                <template v-if="图标类型 === 'default'">
                  <i v-if="图标代码.startsWith('fa-') || 图标代码.startsWith('fas ') || 图标代码.startsWith('far ') || 图标代码.startsWith('fab ')" class="预览图标" :class="图标代码"></i>
                  <img v-else-if="图标代码.startsWith('icons:') && 图片预览" :src="图片预览" class="预览图片" />
                  <i v-else-if="图标代码.startsWith('icons:')" class="fas fa-image 预览图标 图片占位"></i>
                  <span v-else-if="图标代码" class="预览文字">{{ 图标代码 }}</span>
                  <i v-else class="fas 预览图标" :class="获取类型图标"></i>
                </template>
                <span v-else-if="图标类型 === 'text'" class="预览文字">{{ 图标文字 || '卡' }}</span>
                <img v-else-if="图标类型 === 'image' && 图片预览" :src="图片预览" class="预览图片" />
                <i v-else class="fas fa-image 预览图标 图片占位"></i>
              </div>
              <div class="样式选择 分段控件">
                <button class="分段项" :class="{ 激活: 图标类型 === 'default' }" @click="图标类型 = 'default'">图标</button>
                <button class="分段项" :class="{ 激活: 图标类型 === 'text' }" @click="图标类型 = 'text'">文字</button>
                <button class="分段项" :class="{ 激活: 图标类型 === 'image' }" @click="图标类型 = 'image'">图片</button>
              </div>
            </div>

            <!-- 右栏：图标配置区 -->
            <div class="图标配置列表">
              <!-- 图标选择区（始终显示，非 default 禁用） -->
              <div class="表单行 图标配置区" :class="{ 禁用: 图标类型 !== 'default' }">
                <label>默认图标</label>
                <div class="图标选择行">
                  <button ref="选择图标按钮Ref" class="图标选择按钮" :disabled="图标类型 !== 'default'" @click="打开图标选择面板">
                    <i class="fas fa-link"></i>
                    <span>选择图标</span>
                  </button>
                </div>
              </div>

              <!-- 文字图标区（始终显示，非 text 禁用） -->
              <div class="表单行 图标配置区" :class="{ 禁用: 图标类型 !== 'text' }">
                <label>图标文字</label>
                <input v-model="图标文字" class="输入框 短输入" maxlength="2" placeholder="最多2字" :disabled="图标类型 !== 'text'" />
              </div>

              <!-- 图片图标区（始终显示，非 image 禁用） -->
              <div class="表单行 图标配置区" :class="{ 禁用: 图标类型 !== 'image' }">
                <label>卡片图标</label>
                <div class="图片图标按钮组">
                  <button class="图片图标按钮" :disabled="图标类型 !== 'image'" @click="触发文件选择">
                    <i class="fas fa-image"></i>
                    <span>私有上传</span>
                  </button>
                  <button v-if="卡片类型 === 'url' || 卡片类型 === 'app'" class="图片图标按钮" @click="获取图标" :disabled="图标类型 !== 'image' || !路径值.trim() || 获取中">
                    <i v-if="获取中" class="fas fa-spinner fa-pulse"></i>
                    <i v-else class="fas fa-download"></i>
                    <span>{{ 获取中 ? '获取中...' : '获取图标' }}</span>
                  </button>
                </div>
                <input ref="文件输入框" type="file" accept="image/*" class="隐藏文件输入" @change="处理文件选择" />
              </div>
            </div>
          </div>
        </div>

        <div class="弹窗底部">
          <button class="确认按钮" :disabled="!可确认" @click="确认提交">{{ 确认按钮文本 }}</button>
        </div>
      </div>
    </div>
  </Teleport>

  <IconPickerPanel ref="图标面板Ref" :选中值="图标代码" />

  <SelectIconDialog :可见="选择图标弹窗可见" :程序路径="路径值" @选择="处理图标选择" @取消="处理图标选择取消" />
  <GetWebIconDialog :可见="获取网页图标弹窗可见" :网页URL="路径值" :当前图标代码="图标代码 || ''" @选择="处理获取网页图标选择" @取消="处理获取网页图标取消" />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, toRef } from 'vue'
import { 读取图标样式偏好 } from '@/页面/启动/组合式函数/使用卡片表单'
import { 使用菜单仓库 } from '@/页面/启动/仓库/菜单仓库'
import { 使用卡片仓库, 色盘 } from '@/页面/启动/仓库/卡片仓库'
import { 使用卡片表单, 保存图标样式偏好 } from '@/页面/启动/组合式函数/使用卡片表单'
import IconPickerPanel from '@/页面/启动/组件/图标选择面板.vue'
import SelectIconDialog from './选择图标弹窗.vue'
import GetWebIconDialog from './获取网页图标弹窗.vue'
import type { 卡片节点 } from '@/页面/启动/类型/菜单类型'

/** localStorage key */
const 颜色历史Key = '卡片表单_颜色历史'

/** 读取本地颜色历史 */
function 读取颜色历史(): string[] {
  try {
    const 数据 = localStorage.getItem(颜色历史Key)
    if (数据) {
      const 解析 = JSON.parse(数据)
      if (Array.isArray(解析)) return 解析
    }
  } catch {
    /* 静默 */
  }
  return []
}

/** 保存颜色历史到 localStorage */
function 保存颜色历史(历史: string[]) {
  try {
    localStorage.setItem(颜色历史Key, JSON.stringify(历史))
  } catch {
    /* 静默 */
  }
}

const props = defineProps<{
  可见: boolean
  /** 模式：'add' 添加 / 'edit' 编辑 */
  模式: 'add' | 'edit'
  卡片类型: 'url' | 'folder' | 'app'
  /** 编辑模式下传入卡片数据 */
  编辑卡片?: 卡片节点 | null
}>()

const emit = defineEmits<{
  关闭: []
}>()

const 菜单仓库 = 使用菜单仓库()
const 卡片仓库 = 使用卡片仓库()

/** 类型映射 */
const 类型映射: Record<string, string> = { url: '网页', folder: '文件夹', app: '程序' }

/** 弹窗标题文本 */
const 弹窗标题文本 = computed(() => {
  const 动作 = props.模式 === 'add' ? '添加' : '编辑'
  return `${动作}${类型映射[props.卡片类型] || '卡片'}`
})

/** 确认按钮文本 */
const 确认按钮文本 = computed(() => (props.模式 === 'add' ? '添加' : '保存'))

/** 组合式函数 */
const 卡片类型Ref = toRef(props, '卡片类型')
const 表单 = 使用卡片表单(卡片类型Ref)

const { 标题, 路径值, 选中颜色, 路径提示, 图标类型, 图标文字, 图标代码, 图片预览, 文件输入框, 获取中, 路径标签, 路径占位, 获取类型图标, 可确认, 处理面板图标选择, 处理粘贴, 选择路径, 获取图标, 触发文件选择, 处理文件选择, 确认图片缓存, 取消图片缓存, 确认保留本次图标, 重置表单, 选择图标弹窗可见, 处理图标选择, 处理图标选择取消, 获取网页图标弹窗可见, 处理获取网页图标选择, 处理获取网页图标取消, 标记已自动匹配 } = 表单

/** 图标选择面板组件 ref */
const 图标面板Ref = ref<InstanceType<typeof IconPickerPanel> | null>(null)
/** 选择图标按钮 ref（用于面板定位） */
const 选择图标按钮Ref = ref<HTMLElement | null>(null)

/** 打开图标选择面板 */
function 打开图标选择面板() {
  图标面板Ref.value?.打开面板((图标值: string) => {
    处理面板图标选择(图标值)
  }, 选择图标按钮Ref.value!)
}

// ===== 颜色历史 =====
const 历史颜色 = ref<string[]>(读取颜色历史())
const 透明背景偏好Key = '卡片表单_透明背景'
const 透明背景开关 = ref(localStorage.getItem(透明背景偏好Key) === 'true')
watch(透明背景开关, (新值) => {
  localStorage.setItem(透明背景偏好Key, String(新值))
})

/** 颜色选择器实时预览（不记录历史） */
function 颜色输入处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) {
    选中颜色.value = 值
  }
}

/** 颜色选择器关闭时记录新颜色到历史 */
function 颜色完成处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) {
    选中颜色.value = 值
    // 添加到历史（去重，上限12）
    const 去重后 = 历史颜色.value.filter((c) => c !== 值)
    去重后.unshift(值)
    历史颜色.value = 去重后.slice(0, 22)
    保存颜色历史(历史颜色.value)
  }
}

/** 点击历史色块（仅切换颜色，不记录） */
function 选择历史颜色(颜色: string) {
  选中颜色.value = 颜色
}

/** 点击固定色盘（仅切换颜色，不记录） */
function 选择色盘颜色(颜色: string) {
  选中颜色.value = 颜色
}

/** 确认提交：根据模式调用不同的方法 */
function 确认提交() {
  if (!可确认.value) return

  if (props.模式 === 'add') {
    确认添加()
  } else {
    确认保存()
  }
}

/** 判断是否为全局图标引用（icons:xxx，与图标类型无关） */
function 是全局图标引用(): boolean {
  return 图标代码.value.startsWith('icons:')
}

/** 添加模式 */
function 确认添加() {
  const 当前选中ID = 菜单仓库.当前选中ID
  const 归属菜单ID = 当前选中ID !== null && 菜单仓库.是否是二级菜单ID(当前选中ID) ? 当前选中ID : null

  const 有效背景颜色 = 透明背景开关.value ? 'transparent' : 选中颜色.value || '#4a6fa5'

  const 新卡片 = 卡片仓库.新增卡片({
    标题: 标题.value.trim(),
    类型: props.卡片类型,
    值: 路径值.value.trim(),
    归属菜单ID,
    背景颜色: 有效背景颜色,
    图标类型: 图标类型.value,
    图标文字: 图标类型.value === 'text' ? 图标文字.value || null : null,
    图标代码: 图标类型.value === 'image' && 图标代码.value ? 图标代码.value : 图标类型.value === 'default' && 图标代码.value ? 图标代码.value : null,
  })

  if (归属菜单ID !== null && 图标类型.value === 'image' && !是全局图标引用()) {
    确认图片缓存(归属菜单ID, 新卡片.唯一ID)
  }

  保存图标样式偏好(props.卡片类型, 图标类型.value)
  确认保留本次图标()
  重置表单()
  emit('关闭')
}

/** 编辑模式 */
async function 确认保存() {
  const 卡片 = props.编辑卡片
  if (!卡片) return

  const 有效背景颜色 = 透明背景开关.value ? 'transparent' : 选中颜色.value || '#4a6fa5'

  const 更新: Partial<卡片节点> = {
    标题: 标题.value.trim(),
    值: 路径值.value.trim(),
    背景颜色: 有效背景颜色,
    图标类型: 图标类型.value,
    图标文字: 图标类型.value === 'text' ? 图标文字.value || null : null,
    图标代码: 图标类型.value === 'image' && 图标代码.value ? 图标代码.value : 图标类型.value === 'default' && 图标代码.value ? 图标代码.value : null,
    图片路径: 图标类型.value === 'image' && !是全局图标引用() ? 卡片.图片路径 : null,
  }
  卡片仓库.更新卡片(卡片.唯一ID, 更新)

  const 归属菜单ID = 卡片.归属菜单ID
  if (归属菜单ID !== null && 归属菜单ID !== undefined && 图标类型.value === 'image' && !是全局图标引用()) {
    await 确认图片缓存(归属菜单ID, 卡片.唯一ID)
  }
  保存图标样式偏好(props.卡片类型, 图标类型.value)
  确认保留本次图标()
  重置表单()
  emit('关闭')
}

function 关闭() {
  保存图标样式偏好(props.卡片类型, 图标类型.value)
  取消图片缓存()
  重置表单()
  emit('关闭')
}

/** 弹窗打开时：根据当前卡片类型恢复图标样式偏好 */
watch(
  () => props.可见,
  (新值) => {
    if (新值 && props.模式 === 'add') {
      图标类型.value = 读取图标样式偏好(props.卡片类型)
      透明背景开关.value = localStorage.getItem(透明背景偏好Key) === 'true'
    }
  },
)

// 编辑模式下预填表单
onMounted(() => {
  if (props.模式 === 'edit' && props.编辑卡片) {
    预填表单()
  }
})

function 预填表单() {
  const 卡片 = props.编辑卡片
  if (!卡片) return
  标记已自动匹配()
  标题.value = 卡片.标题 || ''
  路径值.value = 卡片.值 || ''

  // 处理透明背景
  if (卡片.背景颜色 === 'transparent') {
    透明背景开关.value = true
    选中颜色.value = '#4a6fa5'
  } else {
    透明背景开关.value = false
    选中颜色.value = 卡片.背景颜色 || '#4a6fa5'
  }

  图标类型.value = 卡片.图标类型 || 'default'
  图标文字.value = 卡片.图标文字 || ''
  图标代码.value = 卡片.图标代码 || ''

  // 加载图片预览
  if (卡片.图片路径 && 卡片.归属菜单ID !== null && 卡片.归属菜单ID !== undefined) {
    // 私有上传图片
    const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动读取卡片图片
    if (是Electron) {
      window.electronAPI
        .启动读取卡片图片(卡片.归属菜单ID, 卡片.图片路径)
        .then((结果: any) => {
          if (结果.成功 && 结果.base64) {
            图片预览.value = 结果.base64
          }
        })
        .catch(() => {})
    }
  } else if (卡片.图标代码?.startsWith('icons:')) {
    // 全局图标引用（icons:xxx）
    const 是Electron = typeof window !== 'undefined' && window.electronAPI?.图标库读取图片
    if (是Electron) {
      const 相对路径 = 卡片.图标代码.replace('icons:', '')
      window.electronAPI
        .图标库读取图片(相对路径)
        .then((结果: any) => {
          if (结果.成功 && 结果.base64) {
            图片预览.value = 结果.base64
          }
        })
        .catch(() => {})
    }
  }
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 关闭()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))
</script>

<style scoped>
/* ===== 弹窗容器 ===== */
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
  z-index: 10000;
}
.弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 12px;
  width: 700px;
  max-width: 92vw;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}
.弹窗标题 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
}
.弹窗标题 h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--全站通用文字颜色);
}
.关闭按钮 {
  cursor: pointer;
  color: var(--全站通用文字颜色);
  font-size: 1rem;
}
.关闭按钮:hover {
  color: var(--全站通用文字颜色);
}
.弹窗主体 {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
}
.表单区 {
  flex-shrink: 0;
}
.图标配置组 {
  display: flex;
  gap: 26px;
  flex: 1;
  min-height: 0;
}
.图标配置列表 {
  flex: 1;
  min-width: 0;
}
.预览区 {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  flex-shrink: 0;
}
.卡片预览 {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}
.预览图标 {
  font-size: 2.2rem;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  line-height: 1;
}
.预览文字 {
  font-size: 1.8rem;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  user-select: none;
}
.预览图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}
.图片占位 {
  opacity: 0.5;
}
.样式选择.分段控件 {
  display: flex;
  gap: 0;
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  overflow: hidden;
}
.分段项 {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.分段项:hover {
  color: var(--全站透明文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 5%, transparent);
}
.分段项.激活 {
  color: var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 12%, transparent);
}
.图标配置区.禁用 {
  opacity: 0.4;
  pointer-events: none;
}
.图标配置区 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.图标配置区 .输入框 {
  height: 40px;
}
.表单行 {
  margin-bottom: 14px;
}
.表单行 label {
  display: block;
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  margin-bottom: 8px;
}
.图标配置区 label {
  margin-bottom: 0;
  flex-shrink: 0;
  font-size: 1rem;
  display: flex;
  align-items: center;
  height: 40px;
  line-height: 1;
}
.提示文字 {
  font-size: 0.75rem;
  color: var(--弱化文字颜色);
  font-weight: normal;
}
.输入行 {
  display: flex;
  gap: 8px;
}
.输入框 {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}
.输入框::placeholder {
  color: var(--弱化文字颜色);
}
.输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.输入框.短输入 {
  max-width: 120px;
}
.选择按钮 {
  padding: 8px 12px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
}
.选择按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.路径提示 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  margin-top: 4px;
}
.背景颜色行 {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-bottom: 8px;
}
.背景颜色行 label {
  margin-bottom: 0;
}
.颜色分组 {
  display: flex;
  align-items: center;
  gap: 6px;
}
.颜色值显示 {
  font-size: 0.75rem;
  color: var(--弱化文字颜色);
  font-variant-numeric: tabular-nums;
}
.透明分组 {
  display: flex;
  align-items: center;
  gap: 6px;
}
.透明标签文字 {
  color: var(--全站透明文字颜色);
  font-size: 0.85rem;
  white-space: nowrap;
}
.颜色选择器容器 {
  position: relative;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  cursor: pointer;
}
.原生颜色选择器 {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  padding: 0;
  margin: 0;
  border: none;
  width: 100%;
  height: 100%;
}
.色环装饰 {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid #fff;
  background: conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
  pointer-events: none;
}
.色环装饰::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
}
.色盘选择 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.色块选项 {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.15s;
  padding: 0;
}
.色块选项:hover {
  transform: scale(1.15);
}
.色块选项.选中 {
  border-color: #fff;
  transform: scale(1.15);
}
/* ===== 透明背景开关 ===== */
.透明开关标签 {
  display: flex;
  align-items: center;
  cursor: pointer;
  flex-shrink: 0;
}
.滑动开关 {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.4);
  transition: background 0.2s;
  display: inline-block;
}
.滑动开关--开 {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}
.滑动开关输入 {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  margin: 0;
  padding: 0;
}
.滑动开关滑块 {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
  pointer-events: none;
}
.滑动开关--开 .滑动开关滑块 {
  transform: translateX(16px);
}
/* ===== 历史颜色行 ===== */
.历史颜色行 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
  padding-bottom: 8px;
}
.历史色块 {
  width: 24px;
  height: 24px;
}
.图标选择行 {
  display: flex;
  gap: 8px;
  align-items: center;
}
.图标选择按钮 {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s;
  flex-shrink: 0;
  box-sizing: border-box;
}
.图标选择按钮 i {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  line-height: 1;
}
.图标选择按钮 span {
  line-height: 24px;
}
.图标选择按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.图片图标按钮组 {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.图片图标按钮 {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 15px;
  transition: background 0.15s;
  flex-shrink: 0;
  box-sizing: border-box;
}
.图片图标按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.图片图标按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
.图片图标按钮 i {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  line-height: 1;
}
.图片图标按钮 span {
  line-height: 24px;
}
.隐藏文件输入 {
  display: none;
}
.弹窗底部 {
  display: flex;
  justify-content: flex-end;
  padding: 12px 20px;
  flex-shrink: 0;
}
.确认按钮 {
  padding: 8px 28px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
  background: #4a9fa5;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #3b8a8f;
}
.确认按钮:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>

<style>
@media (max-width: 768px) {
  .弹窗 {
    width: 100%;
    max-width: 100vw;
    border-radius: 0;
    margin: 0;
    max-height: 100vh;
  }
  .弹窗主体 {
    height: auto;
    max-height: calc(100vh - 120px);
  }
  .图标配置组 {
    flex-direction: column;
    align-items: center;
  }
  .预览区 {
    width: 100%;
    align-items: center;
  }
  .图标配置列表 {
    width: 100%;
  }
  .色盘选择 {
    justify-content: center;
  }
}
</style>
