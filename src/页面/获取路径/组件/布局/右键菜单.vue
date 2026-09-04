<script setup lang="ts">
/**
 * 右键菜单组件
 *
 * 根据节点状态动态显示不同的菜单项
 */
import type { 树形节点, 排除来源类别, 节点状态 } from '../../类型/index'

defineOptions({ name: 'ContextMenu' })

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- props 属性在模板中直接使用，ESLint 无法识别模板展开，故豁免
const props = defineProps<{
  显示: boolean
  菜单X: number
  菜单Y: number
  节点: 树形节点 | null
  获取节点状态: (路径: string) => 节点状态
  获取排除规则类别: (路径: string) => 排除来源类别
  是否直接豁免: (路径: string) => boolean
  判断显示排除选中: () => boolean
}>()

const emit = defineEmits<{
  关闭: []
  排除: []
  排除选中: []
  取消排除选中: []
  排除占位: []
  取消占位: []
  通配: []
  恢复: []
  恢复豁免: []
  豁免: []
  取消通配: []
  递归排除: []
  取消递归排除: []
}>()
</script>

<template>
  <Teleport to="body">
    <div v-if="显示 && 节点" class="右键菜单" :style="{ left: 菜单X + 'px', top: 菜单Y + 'px' }">
      <!-- 多选模式（≥2个节点）：优先拦截，忽略当前节点的单个状态 -->
      <template v-if="判断显示排除选中()">
        <div class="右键菜单-项" @click="emit('排除选中')">排除</div>
        <div class="右键菜单-项 右键菜单-批量取消" @click="emit('取消排除选中')">取消排除</div>
        <div class="右键菜单-分隔线"></div>
        <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
      </template>

      <!-- 单选模式 -->
      <template v-else-if="获取节点状态(节点.path) === 'normal'">
        <div class="右键菜单-项" @click="emit('排除')">排除</div>
        <div class="右键菜单-项 右键菜单-递归排除" @click="emit('递归排除')">递归排除</div>
        <div v-if="节点.isFolder" class="右键菜单-项 右键菜单-占位" @click="emit('排除占位')">排除占位</div>
        <div v-if="!节点.isFolder" class="右键菜单-项 右键菜单-通配" @click="emit('通配')">通配（*{{ 节点.name.includes('.') ? 节点.name.slice(节点.name.lastIndexOf('.')) : '' }}）</div>
        <div class="右键菜单-分隔线"></div>
        <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
      </template>

      <template v-else-if="获取节点状态(节点.path) === 'exempted'">
        <div class="右键菜单-项" @click="emit('排除')">排除</div>
        <template v-if="是否直接豁免(节点.path)">
          <div class="右键菜单-项 右键菜单-恢复" @click="emit('恢复豁免')">取消豁免</div>
        </template>
        <div class="右键菜单-分隔线"></div>
        <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
      </template>

      <template v-else-if="获取节点状态(节点.path) === 'excluded'">
        <template v-if="获取排除规则类别(节点.path) === '精确文件夹' && 节点.isFolder">
          <div class="右键菜单-项 右键菜单-恢复" @click="emit('恢复')">取消排除</div>
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else-if="获取排除规则类别(节点.path) === '精确文件夹' && !节点.isFolder">
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else-if="获取排除规则类别(节点.path) === '精确文件'">
          <div class="右键菜单-项 右键菜单-恢复" @click="emit('恢复')">取消排除</div>
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else-if="获取排除规则类别(节点.path) === '通配符'">
          <div class="右键菜单-项 右键菜单-取消通配" @click="emit('取消通配')">取消通配符</div>
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else-if="获取排除规则类别(节点.path) === '递归文件夹'">
          <div class="右键菜单-项 右键菜单-取消递归排除" @click="emit('取消递归排除')">取消递归排除</div>
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else-if="获取排除规则类别(节点.path) === '递归文件'">
          <div class="右键菜单-项 右键菜单-取消递归排除" @click="emit('取消递归排除')">取消递归排除</div>
          <div class="右键菜单-项 右键菜单-豁免" @click="emit('豁免')">豁免此路径</div>
          <div class="右键菜单-分隔线"></div>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>

        <template v-else>
          <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
        </template>
      </template>

      <template v-else-if="获取节点状态(节点.path) === 'placeholder'">
        <div class="右键菜单-项 右键菜单-取消占位" @click="emit('取消占位')">取消占位</div>
        <div class="右键菜单-分隔线"></div>
        <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
      </template>

      <template v-else>
        <div class="右键菜单-项 右键菜单-取消" @click="emit('关闭')">取消</div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.右键菜单 {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
  min-width: 140px;
}
.右键菜单-项 {
  padding: 6px 16px;
  font-size: 13px;
  color: #333;
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}
.右键菜单-项:hover {
  background: #e8f5e9;
  color: #2e7d32;
}
.右键菜单-取消 {
  color: #999;
}
.右键菜单-取消:hover {
  background: #f5f5f5;
  color: #666;
}
.右键菜单-恢复 {
  color: #2e7d32;
}
.右键菜单-恢复:hover {
  background: #e8f5e9;
}
.右键菜单-豁免 {
  color: #f9a825;
}
.右键菜单-豁免:hover {
  background: #fff8e1;
  color: #f57f17;
}
.右键菜单-通配 {
  color: #1565c0;
}
.右键菜单-通配:hover {
  background: #e3f2fd;
  color: #0d47a1;
}
.右键菜单-取消通配 {
  color: #d32f2f;
}
.右键菜单-取消通配:hover {
  background: #ffebee;
  color: #b71c1c;
}
.右键菜单-占位 {
  color: #d32f2f;
}
.右键菜单-占位:hover {
  background: #fff5f5;
  color: #b71c1c;
}
.右键菜单-递归排除 {
  color: #7b1fa2;
}
.右键菜单-递归排除:hover {
  background: #f3e5f5;
  color: #4a148c;
}
.右键菜单-取消递归排除 {
  color: #7b1fa2;
}
.右键菜单-取消递归排除:hover {
  background: #f3e5f5;
  color: #4a148c;
}
.右键菜单-取消占位 {
  color: #d32f2f;
}
.右键菜单-取消占位:hover {
  background: #fff5f5;
  color: #b71c1c;
}
.右键菜单-分隔线 {
  height: 1px;
  background: #e0e0e0;
  margin: 4px 0;
}
</style>
