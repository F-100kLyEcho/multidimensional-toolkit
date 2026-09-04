<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'

const 主题仓库 = 使用主题仓库()
const { 卡片尺寸, 卡片圆角, 卡片间距水平, 卡片间距垂直, 卡片圆角最大值, FA图标比例, Emoji图标比例, 文字图标比例, 标题比例 } = storeToRefs(主题仓库)
</script>

<template>
  <div class="滑块项">
    <div class="滑块标签">卡片大小</div>
    <input type="range" class="滑块控件" min="50" max="200" step="2" v-model.number="卡片尺寸" />
    <div class="滑块值">{{ 卡片尺寸 }}px</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">标题大小</div>
    <input type="range" class="滑块控件" min="8" max="40" step="1" v-model.number="标题比例" />
    <div class="滑块值">{{ 标题比例 }}%</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">卡片圆角</div>
    <input type="range" class="滑块控件" :min="0" :max="卡片圆角最大值" step="1" v-model.number="卡片圆角" />
    <div class="滑块值">{{ 卡片圆角 }}px</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">水平间距</div>
    <input type="range" class="滑块控件" min="0" max="60" step="1" v-model.number="卡片间距水平" />
    <div class="滑块值">{{ 卡片间距水平 }}px</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">垂直间距</div>
    <input type="range" class="滑块控件" min="0" max="60" step="1" v-model.number="卡片间距垂直" />
    <div class="滑块值">{{ 卡片间距垂直 }}px</div>
  </div>
  <div class="副标题">图标大小</div>
  <div class="滑块项">
    <div class="滑块标签">FA 图标</div>
    <input type="range" class="滑块控件" min="10" max="80" step="2" v-model.number="FA图标比例" />
    <div class="滑块值">{{ FA图标比例 }}%</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">😀 图标</div>
    <input type="range" class="滑块控件" min="10" max="80" step="2" v-model.number="Emoji图标比例" />
    <div class="滑块值">{{ Emoji图标比例 }}%</div>
  </div>
  <div class="滑块项">
    <div class="滑块标签">文字图标</div>
    <input type="range" class="滑块控件" min="10" max="80" step="2" v-model.number="文字图标比例" />
    <div class="滑块值">{{ 文字图标比例 }}%</div>
  </div>
</template>

<style scoped>
.副标题 {
  font-size: 14px;
  color: var(--全站透明文字颜色);
  margin-top: 28px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.滑块项 {
  display: flex;
  align-items: center;
  margin: 20px 0;
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
