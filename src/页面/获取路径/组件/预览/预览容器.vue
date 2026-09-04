<script setup lang="ts">
import type { 树形节点, 预览模式, 节点状态 } from '../../类型/index'
import RecursiveNode from '../文件列表/递归节点.vue'
/* 未来新增功能时，遵循以下原则：
- __新业务逻辑__ → 新建组合式函数（如 `使用xxx.ts`）
- __新 UI 片段__ → 新建子组件（如 `组件/xxx/xxx.vue`）
- __视图.vue 只做"组装"__：调用组合式函数 + 在模板中摆放组件
 */
defineOptions({
  name: 'PreviewContainer',
})

defineProps<{
  当前模式: 预览模式
  模式列表: { key: 预览模式; label: string }[]
  复制提示: string
  保存提示: string
  复制成功标志: boolean
  保存成功标志: boolean
  当前预览文本: string
  未排除节点列表: 树形节点[]
  是否为空: boolean
  文件数: number
  文件夹数: number
  获取节点状态?: (路径: string) => 节点状态
}>()

const emit = defineEmits<{
  切换模式: [模式: 预览模式]
  复制内容: []
  保存文件: []
}>()
</script>

<template>
  <div class="预览区" style="display: flex; flex-direction: column; height: 100%">
    <!-- 模式切换行 -->
    <div class="预览区-模式行" role="tablist">
      <button v-for="模式 in 模式列表" :key="模式.key" class="模式标签" :class="{ '模式标签-激活': 当前模式 === 模式.key }" role="tab" :aria-selected="当前模式 === 模式.key" @click="emit('切换模式', 模式.key)">
        {{ 模式.label }}
      </button>
    </div>

    <!-- 文件计数（实时） -->
    <div class="文件计数">文件: {{ 文件数 }} | 文件夹: {{ 文件夹数 }}</div>

    <!-- 预览主体 -->
    <div class="预览区-主体">
      <template v-if="是否为空">
        <div class="预览区-空状态">无保留项</div>
      </template>
      <template v-else>
        <!-- 树形模式：展示未排除节点（含豁免节点以浅橙色显示） -->
        <ul v-if="当前模式 === 'tree'" class="树形列表">
          <RecursiveNode :节点列表="未排除节点列表" :层级="0" :禁用右键菜单="true" :获取节点状态="获取节点状态" />
        </ul>
        <!-- 纯文本/扁平模式：纯文字展示 -->
        <pre v-else class="预览区-文本" :class="{ '预览区-扁平': 当前模式 === 'flat' }">{{ 当前预览文本 }}</pre>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 标题行：flex 布局，标题左对齐、按钮右对齐 */
.预览区-标题行 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.预览区-标题 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}
.预览区-操作栏 {
  display: flex;
  gap: 8px;
}
.操作按钮 {
  padding: 4px 14px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.操作按钮:hover:not(:disabled) {
  background: #0078d4;
  color: #fff;
  border-color: #0078d4;
}
.操作按钮:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.操作按钮-成功 {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}
.操作按钮-成功:hover:not(:disabled) {
  background: #15803d;
  color: #fff;
  border-color: #15803d;
}

/* 模式切换行 */
.预览区-模式行 {
  display: flex;
  gap: 0;
  margin-bottom: 8px;
  border-bottom: 1px solid #e0e0e0;
}
.模式标签 {
  padding: 6px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.模式标签:hover {
  color: #555;
}
.模式标签-激活 {
  color: #0078d4;
  border-bottom-color: #0078d4;
  font-weight: 500;
}

/* 文件计数 */
.文件计数 {
  font-size: 13px;
  color: #888;
  margin-bottom: 8px;
}

/* 预览主体 */
.预览区-主体 {
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  color: #333;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 10px 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 树形模式下覆盖 ul 外边距 */
.预览区-主体 .树形列表 {
  margin: 0;
  list-style: none;
  padding: 0;
}

/* 纯文本/扁平预览 */
.预览区-文本 {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.预览区-扁平 {
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 空状态 */
.预览区-空状态 {
  color: #aaa;
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
}
</style>
