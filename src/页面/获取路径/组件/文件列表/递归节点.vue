<script setup lang="ts">
import type { 树形节点, 排除来源类别, 节点状态 } from '../../类型/index'
import { 切换折叠, 是否折叠 } from '../../组合式函数/使用折叠'

defineOptions({
  name: 'RecursiveNode',
})

const props = defineProps<{
  节点列表: 树形节点[]
  层级: number
  是否被排除?: (路径: string) => boolean
  /** 获取排除来源类别：精确文件夹 | 精确文件 | 通配符 | null */
  获取排除来源?: (路径: string) => 排除来源类别
  /** 获取节点最终显示状态（三态） */
  获取节点状态?: (路径: string) => 节点状态
  /** 判断路径是否被直接豁免（不含传递性） */
  是否直接豁免?: (路径: string) => boolean
  禁用右键菜单?: boolean
  /** 是否隐藏已排除的节点（灰色项） */
  隐藏排除项?: boolean
  /** 判断路径是否被选中 */
  是否选中?: (路径: string) => boolean
}>()

const emit = defineEmits<{
  排除节点: [节点: 树形节点]
  恢复节点: [节点: 树形节点]
  恢复豁免: [节点: 树形节点]
  豁免节点: [节点: 树形节点]
  通配节点: [节点: 树形节点]
  取消通配: [节点: 树形节点]
  右键菜单: [event: MouseEvent, 节点: 树形节点]
  点击节点: [event: MouseEvent, 节点: 树形节点]
}>()

/**
 * 获取指定路径的节点状态（用于模板中直接计算）
 */
function 获取路径节点状态(路径: string): 节点状态 {
  if (!props.获取节点状态) return 'normal'
  return props.获取节点状态(路径)
}
</script>

<template>
  <template v-for="节点 in 节点列表" :key="节点.path">
    <li
      class="树形项"
      :class="{
        '树形项-已排除': 获取路径节点状态(节点.path) === 'excluded',
        '树形项-已豁免': 获取路径节点状态(节点.path) === 'exempted',
        '树形项-占位': 获取路径节点状态(节点.path) === 'placeholder',
        '树形项-隐藏': 隐藏排除项 && 获取路径节点状态(节点.path) === 'excluded',
        '树形项-已选中': 是否选中?.(节点.path) ?? false,
      }"
      :style="{ paddingLeft: 层级 * 20 + 'px' }"
      @click="emit('点击节点', $event, 节点)"
      @contextmenu.prevent="禁用右键菜单 ? undefined : emit('右键菜单', $event, 节点)"
    >
      <!-- 文件夹：折叠按钮 + 图标; 文件：仅图标 -->
      <button v-if="节点.isFolder" class="折叠按钮" @click.stop="切换折叠(节点.path)">
        <i :class="是否折叠(节点.path) ? 'fas fa-chevron-right' : 'fas fa-chevron-down'"></i>
      </button>
      <span class="图标">{{ 节点.isFolder ? '📁' : '📄' }}</span>
      <span class="名称">{{ 节点.name }}</span>
    </li>
    <RecursiveNode
      v-if="节点.children && 节点.children.length > 0 && !是否折叠(节点.path)"
      :节点列表="节点.children"
      :层级="层级 + 1"
      :是否被排除="是否被排除"
      :获取排除来源="获取排除来源"
      :获取节点状态="获取节点状态"
      :是否直接豁免="是否直接豁免"
      :禁用右键菜单="禁用右键菜单"
      :隐藏排除项="隐藏排除项"
      :是否选中="是否选中"
      @排除节点="emit('排除节点', $event)"
      @恢复节点="emit('恢复节点', $event)"
      @恢复豁免="emit('恢复豁免', $event)"
      @豁免节点="emit('豁免节点', $event)"
      @通配节点="emit('通配节点', $event)"
      @取消通配="emit('取消通配', $event)"
      @右键菜单="(e: MouseEvent, n: 树形节点) => emit('右键菜单', e, n)"
      @点击节点="(e: MouseEvent, n: 树形节点) => emit('点击节点', e, n)"
    />
  </template>
</template>

<style scoped>
.树形项 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  transition: opacity 0.15s;
  cursor: default;
}
.树形项:hover {
  background: #f0f0f0;
}
.图标 {
  font-size: 14px;
  line-height: 1;
}
.名称 {
  color: #333;
}

/* 选中样式：仅改背景，不覆盖图标和文字颜色 */
.树形项-已选中 {
  background: #e8f4f8; /* 浅薄荷蓝 */
}
.树形项-已选中:hover {
  background: #e8f4f8; /* 选中项 hover 保持选中背景 */
}
/* 不修改 .名称 和 .图标 的颜色，继承各自状态的默认颜色 */

/* 折叠按钮 */
.折叠按钮 {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  background: transparent;
  color: #999;
  cursor: pointer;
  padding: 0;
  font-size: 11px;
  transition: all 0.1s;
}
.折叠按钮:hover {
  background: #e0e0e0;
  color: #555;
}

/* 已排除样式：灰色，无背景 */
.树形项-已排除 .名称 {
  color: #999;
}

/* 选中 + 已排除：与普通选中背景一致 */
.树形项-已排除.树形项-已选中 {
  background: #e8f4f8;
}

/* 隐藏已排除节点 */
.树形项-隐藏 {
  display: none;
}

/* 已豁免样式：浅橙色背景 + 灰色文字 */
.树形项-已豁免 {
  background: #fff3cd;
}
.树形项-已豁免 .名称 {
  color: #999;
}

/* 选中 + 已豁免：更浅的橙色，区别于普通选中的薄荷蓝 */
.树形项-已豁免.树形项-已选中 {
  background: #ffeab3;
}

/* 占位文件夹样式：红色字体 */
.树形项-占位 .名称 {
  color: #d32f2f;
}

/* 选中 + 占位：与普通选中背景一致 */
.树形项-占位.树形项-已选中 {
  background: #e8f4f8;
}
</style>
