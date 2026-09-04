<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'

const 仓库 = 使用图标库仓库()

/** 是否已下载图片 */
const 已下载 = computed(() => !!仓库.URL弹窗图片Base64)

/** 是否可确认（添加模式必须有图片，编辑模式可选） */
const 可确认 = computed(() => {
  if (仓库.URL弹窗模式 === '添加') return 已下载.value
  return true
})

// ===== Esc 关闭 =====
function 处理Esc(e: KeyboardEvent) {
  if (e.key === 'Escape') 仓库.关闭URL弹窗()
}

/** 已绑定缩略图：读取缓存，未命中时触发懒加载 */
function 已绑定缩略图URL(图标值: string): string {
  仓库.保证图片加载(图标值)
  return 仓库.图片缓存.get(图标值) || ''
}

onMounted(() => document.addEventListener('keydown', 处理Esc))
onUnmounted(() => document.removeEventListener('keydown', 处理Esc))
</script>

<template>
  <div v-if="仓库.URL弹窗可见" class="遮罩层" @mousedown.self="仓库.关闭URL弹窗()">
    <div class="表单弹窗">
      <div class="弹窗标题">
        <i class="fas" :class="仓库.URL弹窗模式 === '编辑' ? 'fa-pen' : 'fa-download'"></i>
        <span>{{ 仓库.URL弹窗模式 === '编辑' ? '编辑网页图标' : '添加网页图标' }}</span>
        <span class="类别标签">网页图标</span>
      </div>

      <!-- 预览区 -->
      <div class="预览区">
        <div v-if="!已下载" class="预览框 空预览 可点击" @click="仓库.URL弹窗选择本地文件()">
          <div class="上传占位">
            <i class="fas fa-cloud-upload-alt 上传图标"></i>
            <span class="上传文字">点击上传</span>
            <span class="上传文字">或下方链接下载</span>
          </div>
        </div>
        <div v-else class="预览框 已选预览 可点击" @click="仓库.URL弹窗选择本地文件()">
          <img :src="仓库.URL弹窗图片Base64" :alt="仓库.URL弹窗显示名" class="预览图片" />
          <div class="更换覆盖层">
            <i class="fas fa-sync-alt"></i>
            <span>更换</span>
          </div>
        </div>
      </div>

      <!-- 绑定域名输入 -->
      <div class="输入区">
        <div class="输入行">
          <label class="标签">绑定域名（根网址）</label>
          <input v-model="仓库.URL弹窗绑定域名" class="输入框" placeholder="例如: https://example.com" />
        </div>
      </div>

      <!-- 已绑定提示（防重复添加） -->
      <div v-if="仓库.URL弹窗已绑定列表.length > 0" class="已绑定提示">
        <div class="已绑定提示标题">
          <i class="fas fa-exclamation-triangle"></i>
          <span>该域名已绑定 {{ 仓库.URL弹窗已绑定列表.length }} 个网页图标</span>
        </div>
        <div class="已绑定缩略图行">
          <div v-for="图标 in 仓库.URL弹窗已绑定列表" :key="图标.值" class="已绑定缩略图项" :title="`${图标.显示名 || '未命名'}（${图标.分组名}）`">
            <img v-if="已绑定缩略图URL(图标.值)" :src="已绑定缩略图URL(图标.值)" class="已绑定缩略图图片" alt="" />
            <i v-else class="fas fa-image 已绑定占位"></i>
          </div>
        </div>
      </div>

      <!-- 下载地址输入 -->
      <div class="输入区">
        <div class="输入行">
          <label class="标签">图片下载地址</label>
          <div class="下载输入行">
            <input v-model="仓库.URL弹窗下载地址" class="输入框 下载输入框" placeholder="例如: https://example.com/icon.png" @keyup.enter="仓库.URL弹窗下载图片()" />
            <button class="下载按钮" :disabled="!仓库.URL弹窗下载地址.trim() || 仓库.URL弹窗下载中" @click="仓库.URL弹窗下载图片()">
              <i v-if="仓库.URL弹窗下载中" class="fas fa-spinner fa-pulse"></i>
              <i v-else class="fas fa-cloud-download-alt"></i>
              <span>{{ 仓库.URL弹窗下载中 ? '下载中...' : '下载图片' }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="仓库.URL弹窗错误信息" class="错误提示">
        <i class="fas fa-exclamation-circle"></i>
        <span>{{ 仓库.URL弹窗错误信息 }}</span>
      </div>

      <!-- 显示名称输入 -->
      <div class="输入区">
        <div class="输入行">
          <label class="标签">显示名称</label>
          <input v-model="仓库.URL弹窗显示名" class="输入框" placeholder="图标显示名称" @keyup.enter="仓库.确认URL弹窗()" />
        </div>
      </div>

      <!-- 按钮行 -->
      <div class="按钮行">
        <button class="取消按钮 弹窗按钮" @click="仓库.关闭URL弹窗()">取消</button>
        <button class="确认按钮 弹窗按钮" :disabled="!可确认" @click="仓库.确认URL弹窗()">
          <i class="fas fa-check"></i>
          <span>{{ 仓库.URL弹窗模式 === '编辑' ? '确认保存' : '确认添加' }}</span>
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
  min-width: 440px;
  max-width: 520px;
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
  transition: all 0.15s;
  position: relative;
}

.空预览 {
  border: 2px dashed color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  background: rgba(0, 0, 0, 0.15);
}

.可点击 {
  cursor: pointer;
}
.空预览.可点击:hover {
  border-color: #4a9fa5;
  background: rgba(74, 159, 165, 0.08);
}

.已选预览 {
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
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

/* ===== 更换覆盖层（编辑模式点击替换） ===== */
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
  border-radius: 8px;
}
.已选预览:hover .更换覆盖层 {
  opacity: 1;
  cursor: pointer;
}
.更换覆盖层 i {
  font-size: 1.2rem;
}

/* ===== 输入区 ===== */
.输入区 {
  margin-bottom: 12px;
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

/* ===== 下载输入行 ===== */
.下载输入行 {
  display: flex;
  gap: 8px;
}
.下载输入框 {
  flex: 1;
}
.下载按钮 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 0.15s;
}
.下载按钮:hover:not(:disabled) {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}
.下载按钮:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ===== 已绑定提示 ===== */
.已绑定提示 {
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(231, 76, 60, 0.3);
  background: rgba(231, 76, 60, 0.1);
  border-radius: 6px;
}
.已绑定提示标题 {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #e67e22;
  font-size: 0.85rem;
  margin-bottom: 8px;
}
.已绑定缩略图行 {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.已绑定缩略图项 {
  width: 36px;
  height: 36px;
  border-radius: 5px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.已绑定缩略图图片 {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.已绑定占位 {
  font-size: 0.9rem;
  color: var(--弱化文字颜色);
}

/* ===== 错误提示 ===== */
.错误提示 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 6px;
  margin-bottom: 12px;
  color: #e74c3c;
  font-size: 0.85rem;
}
.错误提示 i {
  font-size: 0.9rem;
  flex-shrink: 0;
}

/* ===== 按钮行 ===== */
.按钮行 {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
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
.确认按钮 {
  background: #4a9fa5;
  color: #fff;
}
.确认按钮:hover:not(:disabled) {
  background: #3b8a8f;
}
</style>
