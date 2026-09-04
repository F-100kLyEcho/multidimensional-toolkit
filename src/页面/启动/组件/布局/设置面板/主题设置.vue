<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import { 色盘 } from '@/页面/启动/仓库/卡片仓库'
import BiZhiKuChuangChuang from './壁纸库弹窗.vue'

const 主题仓库 = 使用主题仓库()
const { 背景色值, 不透明度, 磨砂强度, 背景模式, 背景纯色, 背景纯色历史, 当前壁纸文件名, 壁纸分组列表, 当前壁纸分组索引, 背景图片缩略图缓存, 壁纸存储位置, 全局壁纸路径已设置 } = storeToRefs(主题仓库)

const 壁纸库可见 = ref(false)

const 当前缩略图 = computed(() => {
  const 分组 = 壁纸分组列表.value[当前壁纸分组索引.value]
  if (!分组) return ''
  const 文件名 = 当前壁纸文件名.value
  if (!文件名) return ''
  return 背景图片缩略图缓存.value.get(`${壁纸存储位置.value}/${分组.名称}/${文件名}`) || ''
})

function 颜色输入处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) 背景纯色.value = 值
}

function 颜色完成处理(event: Event) {
  const 值 = (event.target as HTMLInputElement).value
  if (值) {
    背景纯色.value = 值
    const 去重后 = 背景纯色历史.value.filter((c) => c !== 值)
    去重后.unshift(值)
    背景纯色历史.value = 去重后.slice(0, 9)
  }
}

function 选择历史颜色(颜色: string) {
  背景纯色.value = 颜色
}

function 选择色盘颜色(颜色: string) {
  背景纯色.value = 颜色
}

function 打开壁纸库() {
  壁纸库可见.value = true
}

function 关闭壁纸库() {
  壁纸库可见.value = false
}

function 切换存储位置() {
  壁纸存储位置.value = 壁纸存储位置.value === '工作空间' ? '全局空间' : '工作空间'
}

async function 选择全局路径() {
  try {
    const 结果 = await window.electronAPI.启动选择文件夹({ 标题: '选择全局壁纸存储文件夹' })
    if (结果.成功 && 结果.路径) {
      await 主题仓库.设置全局壁纸路径(结果.路径)
      if (壁纸存储位置.value === '全局空间') {
        主题仓库.加载壁纸分组列表()
      }
    }
  } catch {
    // 静默
  }
}
</script>

<template>
  <!-- 背景模式 -->
  <div class="设置分组">
    <div class="分组标题">背景模式</div>
    <div class="控制行">
      <span class="控制行标签">{{ 背景模式 === '图片' ? '图片' : '纯色' }}</span>
      <button class="切换滑块" :class="{ 激活: 背景模式 === '纯色' }" @click="背景模式 = 背景模式 === '图片' ? '纯色' : '图片'" :title="背景模式 === '图片' ? '切换到纯色' : '切换到图片'">
        <span class="滑块圆点"></span>
      </button>
      <template v-if="背景模式 === '图片'">
        <span class="控制行标签" style="margin-left: 12px">{{ 壁纸存储位置 === '工作空间' ? '工作空间' : '全局空间' }}</span>
        <button class="切换滑块" :class="{ 激活: 壁纸存储位置 === '全局空间' }" @click="切换存储位置" :title="壁纸存储位置 === '工作空间' ? '切换到全局空间' : '切换到工作空间'">
          <span class="滑块圆点"></span>
        </button>
        <button class="更换路径按钮" :class="{ 隐藏: 壁纸存储位置 !== '全局空间' }" @click="选择全局路径" title="更换存储路径">
          <i class="fas fa-folder-open"></i>
        </button>
      </template>
    </div>

    <!-- 纯色模式控件 -->
    <template v-if="背景模式 === '纯色'">
      <div class="颜色行">
        <div class="颜色分组">
          <span class="颜色标签">背景颜色</span>
          <label class="颜色选择器容器" title="选择颜色">
            <input type="color" class="原生颜色选择器" :value="背景纯色" @input="颜色输入处理" @change="颜色完成处理" />
            <span class="色环装饰"></span>
          </label>
          <span class="颜色值显示">{{ 背景纯色 }}</span>
        </div>
      </div>
      <div v-if="背景纯色历史.length > 0" class="历史颜色行">
        <button v-for="颜色 in 背景纯色历史" :key="颜色" class="色块选项 历史色块" :class="{ 选中: 背景纯色 === 颜色 }" :style="{ backgroundColor: 颜色 }" @click="选择历史颜色(颜色)"></button>
      </div>
      <div class="色盘选择">
        <div v-for="(颜色, 索引) in 色盘" :key="索引" class="色块选项" :class="{ 选中: 背景纯色 === 颜色 }" :style="{ backgroundColor: 颜色 }" @click="选择色盘颜色(颜色)"></div>
      </div>
    </template>

    <!-- 图片模式控件 -->
    <template v-if="背景模式 === '图片'">
      <div class="壁纸预览区">
        <template v-if="壁纸存储位置 === '全局空间' && !全局壁纸路径已设置">
          <div class="壁纸缩略图 壁纸缩略图--空 壁纸缩略图--设置路径" @click="选择全局路径">
            <i class="fas fa-folder-open"></i>
            <span class="全局路径提示">请先设置全局壁纸存储路径</span>
          </div>
        </template>
        <template v-else>
          <div v-if="当前缩略图" class="壁纸缩略图" :style="{ backgroundImage: `url(${当前缩略图})` }"></div>
          <div v-else class="壁纸缩略图 壁纸缩略图--空">
            <i class="fas fa-image"></i>
          </div>
        </template>
        <button class="更换壁纸按钮" :disabled="壁纸存储位置 === '全局空间' && !全局壁纸路径已设置" @click="打开壁纸库">
          <i class="fas fa-th"></i>
          <span>更换壁纸</span>
        </button>
      </div>
    </template>
  </div>

  <BiZhiKuChuangChuang v-if="壁纸库可见" @确认="关闭壁纸库" @关闭="关闭壁纸库" />

  <!-- 毛玻璃设置 -->
  <div class="设置分组">
    <div class="分组标题">毛玻璃</div>
    <div class="滑块项">
      <div class="滑块标签">不透明度</div>
      <input type="range" class="滑块控件" min="0" max="1" step="0.01" v-model.number="不透明度" />
      <div class="滑块值">{{ (不透明度 * 100).toFixed(0) }}%</div>
    </div>
    <div class="滑块项">
      <div class="滑块标签">磨砂强度</div>
      <input type="range" class="滑块控件" min="0" max="20" step="1" v-model.number="磨砂强度" />
      <div class="滑块值">{{ 磨砂强度 }}px</div>
    </div>
    <div class="滑块项">
      <div class="滑块标签">背景深浅</div>
      <input type="range" class="滑块控件" min="0" max="255" step="1" v-model.number="背景色值" />
      <div class="滑块值">{{ 背景色值 }}</div>
    </div>
  </div>
</template>

<style scoped>
.设置分组 {
  margin-bottom: 24px;
}
.分组标题 {
  font-size: 14px;
  font-weight: 600;
  color: var(--全站通用文字颜色);
  margin-bottom: 12px;
}
.控制行 {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.控制行标签 {
  font-size: 13px;
  color: var(--全站透明文字颜色);
}
.切换滑块 {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.4);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
  padding: 0;
  flex-shrink: 0;
  box-sizing: border-box;
}
.切换滑块.激活 {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
}
.滑块圆点 {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  box-sizing: border-box;
}
.切换滑块.激活 .滑块圆点 {
  transform: translateX(18px);
  background: #fff;
  border-color: rgba(0, 0, 0, 0.4);
}
.颜色行 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.颜色分组 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.颜色标签 {
  font-size: 13px;
  color: var(--全站透明文字颜色);
  flex-shrink: 0;
}
.颜色选择器容器 {
  position: relative;
  width: 28px;
  height: 28px;
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
  width: 6px;
  height: 6px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #fff;
}
.颜色值显示 {
  font-size: 12px;
  color: var(--弱化文字颜色);
  font-variant-numeric: tabular-nums;
}
.历史颜色行 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.色盘选择 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.色块选项 {
  width: 22px;
  height: 22px;
  border-radius: 4px;
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
.历史色块 {
  width: 22px;
  height: 22px;
}
.更换路径按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--全站透明文字颜色);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;
  padding: 0;
  flex-shrink: 0;
}
.更换路径按钮:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  color: var(--全站通用文字颜色);
}
.更换路径按钮.隐藏 {
  visibility: hidden;
  pointer-events: none;
}
.壁纸预览区 {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.壁纸缩略图 {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
}
.壁纸缩略图--空 {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.1);
  color: var(--弱化文字颜色);
  font-size: 18px;
}
.壁纸缩略图--设置路径 {
  cursor: pointer;
}
.全局路径提示 {
  font-size: 13px;
  color: var(--弱化文字颜色);
}
.更换壁纸按钮 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.3);
  border-radius: 6px;
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
  color: var(--全站通用文字颜色);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
  width: 100%;
}
.更换壁纸按钮:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.3);
}
.更换壁纸按钮:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.更换壁纸按钮:disabled:hover {
  background: rgba(var(--背景色值), var(--背景色值), var(--背景色值), 0.15);
}

/* ===== 滑块 ===== */
.滑块项 {
  display: flex;
  align-items: center;
  margin: 12px 0;
  width: 100%;
}
.滑块标签 {
  width: 60px;
  font-size: 14px;
  margin-right: 15px;
  color: var(--全站透明文字颜色);
  flex-shrink: 0;
}
.滑块控件 {
  flex: 1;
  min-width: 120px;
  max-width: 200px;
  height: 6px;
  border-radius: 3px;
  background: var(--滑块轨道颜色);
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}
.滑块控件::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--滑块圆圈颜色);
  cursor: pointer;
  border: none;
}
.滑块控件::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--滑块圆圈颜色);
  cursor: pointer;
  border: none;
}
.滑块值 {
  width: 60px;
  text-align: right;
  font-size: 13px;
  color: var(--全站透明文字颜色);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
</style>
