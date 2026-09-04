<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'

const 仓库 = 使用图标库仓库()

/** 是否已选择图片 */
const 已选择图片 = computed(() => !!仓库.图片弹窗图片Base64)

// 裁切完成时刷新编辑弹窗预览
watch(
  () => 仓库.裁切弹窗可见,
  (新值) => {
    if (!新值 && 仓库.裁切弹窗图标值 && 仓库.裁切弹窗图标值 === 仓库.图片弹窗原图标值) {
      仓库.获取图片Base64(仓库.裁切弹窗图标值).then((新Base64) => {
        if (新Base64) {
          仓库.图片弹窗图片Base64 = 新Base64
          仓库.图片弹窗文件大小 = Math.round(新Base64.length * 0.75)
        }
      })
    }
  },
)

/** 格式化文件大小 */
function 格式化大小(字节: number): string {
  if (字节 === 0) return '—'
  if (字节 < 1024) return `${字节} B`
  if (字节 < 1024 * 1024) return `${(字节 / 1024).toFixed(1)} KB`
  return `${(字节 / 1024 / 1024).toFixed(1)} MB`
}

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 仓库.关闭图片弹窗()
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))
</script>

<template>
  <div v-if="仓库.图片弹窗可见" class="遮罩层" @mousedown.self="仓库.关闭图片弹窗()">
    <div class="表单弹窗">
      <div class="弹窗标题">
        <i class="fas" :class="仓库.图片弹窗模式 === '编辑' ? 'fa-pen' : 'fa-plus'"></i>
        <span>{{ 仓库.图片弹窗模式 === '编辑' ? '编辑图片' : '添加图片' }}</span>
        <span class="类别标签">用户上传</span>
      </div>

      <!-- 预览区（点击或拖拽上传） -->
      <div class="预览区">
        <div v-if="!已选择图片" class="预览框 空预览" @click="仓库.图片弹窗选择文件()">
          <div class="上传占位">
            <i class="fas fa-cloud-upload-alt 上传图标"></i>
            <span class="上传文字">点击选择图片</span>
          </div>
        </div>
        <div v-else class="预览框 已选预览" @click="仓库.图片弹窗选择文件()">
          <img :src="仓库.图片弹窗图片Base64" :alt="仓库.图片弹窗显示名" class="预览图片" />
          <div class="更换覆盖层">
            <i class="fas fa-sync-alt"></i>
            <span>更换</span>
          </div>
        </div>
      </div>

      <!-- 选择图片按钮 -->
      <div class="选择按钮行">
        <button class="选择文件按钮" @click="仓库.图片弹窗选择文件()">
          <i class="fas fa-folder-open"></i>
          <span>{{ 已选择图片 ? '更换图片...' : '选择图片文件...' }}</span>
        </button>
        <span class="文件格式提示">支持: jpg, png, svg, gif, webp, bmp, ico</span>
      </div>

      <!-- 文件信息 -->
      <div v-if="已选择图片" class="文件信息">
        <span class="信息项">
          <i class="fas fa-file-image"></i>
          类型: {{ 仓库.图片弹窗文件类型 }}
        </span>
        <span class="信息项">
          <i class="fas fa-file"></i>
          大小: {{ 格式化大小(仓库.图片弹窗文件大小) }}
        </span>
      </div>

      <!-- 显示名称输入 -->
      <div class="输入区">
        <div class="输入行">
          <label class="标签">显示名称</label>
          <input v-model="仓库.图片弹窗显示名" class="输入框" placeholder="为图片输入一个名称" @keyup.enter="仓库.确认图片弹窗()" />
        </div>
      </div>

      <!-- 按钮行 -->
      <div class="按钮行">
        <button v-if="仓库.图片弹窗模式 === '编辑' && 仓库.图片弹窗原图标值.startsWith('icons:')" class="裁切按钮 弹窗按钮" title="裁切为正方形" @click="仓库.打开裁切弹窗(仓库.图片弹窗原图标值)">
          <i class="fas fa-crop-alt"></i>
          <span>裁切</span>
        </button>
        <button class="取消按钮 弹窗按钮" @click="仓库.关闭图片弹窗()">取消</button>
        <button class="确认按钮 弹窗按钮" :disabled="!已选择图片" @click="仓库.确认图片弹窗()">
          <i class="fas fa-check"></i>
          <span>{{ 仓库.图片弹窗模式 === '编辑' ? '确认保存' : '确认添加' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 遮罩层 ===== */
.遮罩层 {
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

/* ===== 弹窗主体 ===== */
.表单弹窗 {
  background-color: var(--毛玻璃背景色);
  background-image: linear-gradient(rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.25));
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 10px;
  padding: 24px;
  min-width: 400px;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.弹窗标题 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 16px;
  color: var(--全站通用文字颜色);
}
.弹窗标题 i {
  font-size: 1.2rem;
}
.类别标签 {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  color: var(--弱化文字颜色);
  margin-left: auto;
}

/* ===== 预览区 ===== */
.预览区 {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 16px;
}

.预览框 {
  width: 160px;
  height: 160px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.空预览 {
  border: 2px dashed color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  background: rgba(0, 0, 0, 0.15);
}
.空预览:hover {
  border-color: var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 8%, transparent);
}

.已选预览 {
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
}
.已选预览:hover .更换覆盖层 {
  opacity: 1;
}

.上传占位 {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--弱化文字颜色);
}
.上传图标 {
  font-size: 2rem;
  color: var(--全站透明文字颜色);
}
.上传文字 {
  font-size: 0.85rem;
}

.预览图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.更换覆盖层 {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #fff;
  opacity: 0;
  transition: opacity 0.15s;
  font-size: 0.85rem;
}
.更换覆盖层 i {
  font-size: 1.2rem;
}

/* ===== 选择按钮行 ===== */
.选择按钮行 {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}
.选择文件按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 6px;
  background: transparent;
  color: var(--全站通用文字颜色);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}
.选择文件按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 8%, transparent);
  border-color: var(--全站通用文字颜色);
}
.文件格式提示 {
  font-size: 0.75rem;
  color: var(--弱化文字颜色);
  text-align: center;
}

/* ===== 文件信息 ===== */
.文件信息 {
  display: flex;
  gap: 16px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  margin-bottom: 16px;
}
.信息项 {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: var(--全站透明文字颜色);
}
.信息项 i {
  color: var(--弱化文字颜色);
  font-size: 0.85rem;
}

/* ===== 输入区 ===== */
.输入区 {
  margin-bottom: 20px;
}
.输入行 {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.标签 {
  font-size: 0.8rem;
  color: var(--弱化文字颜色);
}
.输入框 {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站通用文字颜色) !important;
  font-size: 0.85rem;
  outline: none;
  box-sizing: border-box;
}
.输入框:focus {
  border-color: var(--全站通用文字颜色);
}
.输入框::placeholder {
  color: var(--弱化文字颜色);
}

/* ===== 按钮行 ===== */
.按钮行 {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.弹窗按钮 {
  width: auto;
  height: auto;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s;
  border: none;
}
.弹窗按钮:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.取消按钮 {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  color: var(--全站透明文字颜色);
}
.取消按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
.裁切按钮 {
  margin-right: auto;
  background: color-mix(in srgb, #4a9fa5 22%, transparent);
  border: 1px solid rgba(74, 159, 165, 0.4);
  color: #4a9fa5;
}
.裁切按钮:hover:not(:disabled) {
  background: color-mix(in srgb, #4a9fa5 34%, transparent);
}
.确认按钮 {
  background: #4a9fa5;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #3b8a8f;
}
</style>
