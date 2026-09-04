<template>
  <Teleport to="body">
    <div v-if="可见" class="弹窗覆盖层" @mousedown.self="取消">
      <div class="弹窗">
        <!-- 标题栏 -->
        <div class="弹窗标题">
          <h3>选择程序图标</h3>
          <i class="fas fa-times 关闭按钮" @click="取消"></i>
        </div>

        <!-- 状态区域 -->
        <div class="状态区域">
          <div class="路径显示">
            <span class="路径标签">程序路径：</span>
            <span class="路径文本">{{ 程序路径 }}</span>
          </div>
          <div class="操作行">
            <select v-model="当前模式" class="模式选择下拉框" :disabled="提取中" @change="切换模式">
              <option value="electron">Electron 提取</option>
              <option value="scan">扫描模式</option>
            </select>
            <button class="重新提取按钮" @click="执行提取" :disabled="提取中">
              <i :class="['fas', 提取中 ? 'fa-spinner fa-pulse' : 'fa-sync']"></i>
              <span>{{ 提取中 ? '提取中...' : '重新提取' }}</span>
            </button>
          </div>
        </div>

        <!-- 提示区 -->
        <div v-if="错误信息" class="提示区 提示区--错误">
          <i class="fas fa-exclamation-circle"></i>
          <span>{{ 错误信息 }}</span>
          <span v-if="当前模式 === 'electron'" class="切换提示">可切换至扫描模式尝试</span>
        </div>
        <div v-else-if="提取完成 && 显示列表.length > 0 && 当前模式 === 'electron'" class="提示区 提示区--成功">
          <i class="fas fa-check-circle"></i>
          <span>Electron 提取到 {{ 显示列表.length }} 个尺寸图标</span>
        </div>
        <div v-else-if="提取完成 && 显示列表.length > 0 && 当前模式 === 'scan'" class="提示区 提示区--成功">
          <i class="fas fa-check-circle"></i>
          <span>扫描到 {{ 显示列表.length }} 个图片文件</span>
        </div>

        <!-- 加载状态 -->
        <div v-if="提取中" class="加载状态">
          <i class="fas fa-spinner fa-pulse fa-2x"></i>
          <span>正在提取图标...</span>
        </div>

        <!-- 空状态 -->
        <div v-else-if="提取完成 && 显示列表.length === 0" class="空状态">
          <i class="fas fa-image 空图标"></i>
          <span v-if="当前模式 === 'electron'">Electron 提取失败，请切换至扫描模式</span>
          <span v-else>未找到图片文件，可关闭弹窗后使用上传功能</span>
        </div>

        <!-- 图标列表 -->
        <div v-else-if="显示列表.length > 0" class="图标列表">
          <div v-for="(图标, 索引) in 显示列表" :key="图标.唯一键" class="图标项" :class="{ '图标项--选中': 选中索引 === 索引 }" @click="选中图标(索引)">
            <div class="图标缩略图">
              <img v-if="图片预览缓存[图标.唯一键]" :src="图片预览缓存[图标.唯一键]" :alt="图标.文件名" class="缩略图图片" />
              <i v-else class="fas fa-image 缩略图占位"></i>
            </div>
            <span class="图标文件名">{{ 图标.文件名 }}</span>
            <span v-if="图标.尺寸标注" class="尺寸标注">{{ 图标.尺寸标注 }}</span>
            <i v-if="选中索引 === 索引" class="fas fa-check-circle 选中标记"></i>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="弹窗底部">
          <button class="取消按钮" @click="取消">取消</button>
          <button class="确认按钮" :disabled="选中索引 === -1" @click="确认选择">使用此图标</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, reactive, onMounted, onUnmounted } from 'vue'

/** 显示图标项 */
interface 显示图标 {
  唯一键: string
  文件名: string
  完整路径: string
  是官方图标: boolean
  尺寸标注?: string
}

const props = defineProps<{
  可见: boolean
  程序路径: string
}>()

const emit = defineEmits<{
  选择: [完整路径: string, 是官方图标: boolean]
  取消: []
}>()

// ===== 状态 =====
const 当前模式 = ref<'electron' | 'scan'>('electron')
const 提取中 = ref(false)
const 提取完成 = ref(false)
const 显示列表 = ref<显示图标[]>([])
const 选中索引 = ref(-1)
const 错误信息 = ref('')
const 图片预览缓存 = reactive<Record<string, string>>({})

// ===== 方法 =====
async function 切换模式() {
  清空状态()
  await 执行提取()
}

function 清空状态() {
  显示列表.value = []
  选中索引.value = -1
  错误信息.value = ''
  提取完成.value = false
  Object.keys(图片预览缓存).forEach((key) => delete 图片预览缓存[key])
}

async function 加载图片预览(图标: 显示图标) {
  if (图片预览缓存[图标.唯一键]) return
  try {
    if (图标.是官方图标) {
      const 结果 = await window.electronAPI.启动读取缓存图片(图标.完整路径)
      if (结果.成功 && 结果.base64) {
        图片预览缓存[图标.唯一键] = 结果.base64
      }
    } else {
      const 结果 = await window.electronAPI.启动读取本地图片(图标.完整路径)
      if (结果.成功 && 结果.base64) {
        图片预览缓存[图标.唯一键] = 结果.base64
      }
    }
  } catch {
    // 加载失败，忽略
  }
}

async function 执行提取() {
  if (!props.程序路径 || 提取中.value) return

  提取中.value = true
  清空状态()

  if (当前模式.value === 'electron') {
    try {
      const 结果 = await window.electronAPI.启动提取程序图标单方法(props.程序路径)
      if (结果.成功 && 结果.图标列表?.length) {
        显示列表.value = 结果.图标列表.map((item: any) => {
          const 来源名 = item.来源 === 'system' ? '系统' : '内嵌'
          const 宽 = item.像素尺寸.宽
          const 高 = item.像素尺寸.高
          return {
            唯一键: `${item.来源 || 'pe'}_${item.尺寸}`,
            文件名: `${来源名}图标 (${宽}×${高})`,
            完整路径: item.临时文件名,
            是官方图标: true,
            尺寸标注: `${来源名} ${宽}×${高}`,
          }
        })
        选中索引.value = 0
        显示列表.value.forEach((item) => 加载图片预览(item))
      } else {
        错误信息.value = 结果.错误信息 || 'Electron 提取失败'
      }
    } catch (e) {
      错误信息.value = String(e)
    }
  } else {
    try {
      const 结果 = await window.electronAPI.启动扫描程序目录图片(props.程序路径)
      if (结果.成功) {
        const 图片列表 = (结果.图标列表 || []).filter((i: any) => !i.是官方图标)
        显示列表.value = 图片列表.map((img: any, idx: number) => ({
          唯一键: `scan_${idx}`,
          文件名: img.文件名,
          完整路径: img.完整路径,
          是官方图标: false,
        }))
        显示列表.value.forEach((item) => 加载图片预览(item))
        if (显示列表.value.length === 0) {
          错误信息.value = '未找到图片文件'
        } else {
          选中索引.value = 0
        }
      } else {
        错误信息.value = 结果.错误信息 || '扫描失败'
      }
    } catch (e) {
      错误信息.value = String(e)
    }
  }

  提取完成.value = true
  提取中.value = false
}

function 选中图标(索引: number) {
  选中索引.value = 索引
}

function 确认选择() {
  if (选中索引.value === -1) return
  const 选中项 = 显示列表.value[选中索引.value]
  if (!选中项) return
  emit('选择', 选中项.完整路径, 选中项.是官方图标)
}

function 取消() {
  emit('取消')
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 取消()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))

// ===== 监听可见性变化 =====
watch(
  () => props.可见,
  (新值) => {
    if (新值 && props.程序路径) {
      当前模式.value = 'electron'
      执行提取()
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
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
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

.状态区域 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
  gap: 12px;
}

.路径显示 {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.路径标签 {
  font-size: 0.85rem;
  color: var(--弱化文字颜色);
  flex-shrink: 0;
}
.路径文本 {
  font-size: 0.85rem;
  color: var(--全站透明文字颜色);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.操作行 {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.模式选择下拉框 {
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  font-size: 0.85rem;
  cursor: pointer;
  outline: none;
  transition: border-color 0.15s;
}
.模式选择下拉框:hover {
  border-color: var(--全站通用文字颜色);
}
.模式选择下拉框:disabled {
  opacity: 0.5;
  cursor: default;
}
.模式选择下拉框 option {
  background: rgba(0, 0, 0, 0.3);
  color: var(--全站透明文字颜色);
}

.重新提取按钮 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.15s;
  flex-shrink: 0;
}
.重新提取按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.重新提取按钮:disabled {
  opacity: 0.5;
  cursor: default;
}

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
.切换提示 {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
  cursor: pointer;
}
.切换提示:hover {
  color: var(--全站通用文字颜色);
}

.加载状态 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 16px;
  color: var(--弱化文字颜色);
  flex: 1;
}

.空状态 {
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

.图标列表 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
  max-height: calc(80vh - 200px);
}

.图标列表::-webkit-scrollbar {
  width: 8px;
}
.图标列表::-webkit-scrollbar-thumb {
  background: var(--滚动条颜色);
  border-radius: 4px;
}

.图标项 {
  height: 110px;
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

.尺寸标注 {
  font-size: 0.65rem;
  color: var(--弱化文字颜色);
  line-height: 1;
}

.选中标记 {
  position: absolute;
  top: 2px;
  right: 2px;
  color: var(--全站通用文字颜色);
  font-size: 0.9rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.弹窗底部 {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 24px;
  border-top: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  flex-shrink: 0;
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
</style>
