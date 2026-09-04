<script setup lang="ts">
import { 使用菜单图标面板 } from '@/页面/启动/组合式函数/使用菜单图标面板'
import { 使用图标选择历史仓库 } from '@/页面/启动/仓库/图标选择历史仓库'
import { 使用图标库仓库 } from '@/页面/启动/仓库/图标库仓库'

const 图标库仓库 = 使用图标库仓库()
const 图标选择历史 = 使用图标选择历史仓库()
const 面板 = 使用菜单图标面板()

/** 判断图标值是否为 emoji（不是 fa- 开头也不是 icons: 开头） */
function 是Emoji图标(值: string): boolean {
  return !!值 && !值.startsWith('fa-') && !值.startsWith('icons:')
}

/** 判断图标值是否为全局图片（icons: 开头） */
function 是全局图片图标(值: string): boolean {
  return !!值 && 值.startsWith('icons:')
}

/** 判断图标值是否为 FontAwesome 类名 */
function 是FA图标(值: string): boolean {
  return !!值 && (值.startsWith('fa-') || 值.startsWith('fas ') || 值.startsWith('far ') || 值.startsWith('fab '))
}

/** 全局图片图标预览：读取缓存，未命中时触发懒加载 */
function 全局图标URL(图标值: string): string {
  图标库仓库.保证图片加载(图标值)
  return 图标库仓库.图片缓存.get(图标值) || ''
}

const props = defineProps<{
  /** 当前选中图标值，用于高亮匹配的图标网格项 */
  选中值?: string
}>()

defineExpose({
  打开面板: 面板.打开面板,
  关闭面板: 面板.关闭面板,
  面板可见: 面板.面板可见,
})
</script>

<template>
  <Teleport to="body">
    <div v-if="面板.面板可见.value" class="悬浮面板遮罩" @click="面板.关闭面板">
      <div class="悬浮图标面板" :style="{ top: 面板.面板位置.value.y + 'px', left: 面板.面板位置.value.x + 'px' }" @click.stop>
        <div class="面板搜索栏">
          <input v-model="面板.搜索文本.value" class="面板搜索输入" placeholder="搜索图标..." @click.stop />
          <button class="面板排序按钮" :class="{ 降序: 面板.排序方向.value === '降序' }" @click="面板.切换排序" :title="面板.排序方向.value === '升序' ? '切换为升序' : '切换为降序'">
            <i class="fas fa-exchange-alt fa-rotate-90"></i>
          </button>
          <button class="面板排序按钮" title="全部折叠" @click="面板.折叠全部分组">
            <i class="fas fa-compress-alt"></i>
          </button>
          <button class="面板排序按钮" title="全部展开" @click="面板.展开全部分组">
            <i class="fas fa-expand-alt"></i>
          </button>
        </div>
        <!-- 面板顶部标签栏 -->
        <div class="面板标签栏">
          <button class="面板标签项" :class="{ 激活: 面板.面板标签.value === 'fa' }" @click="面板.面板标签.value = 'fa'">FA</button>
          <button class="面板标签项" :class="{ 激活: 面板.面板标签.value === 'emoji' }" @click="面板.面板标签.value = 'emoji'">Emoji</button>
          <button class="面板标签项" :class="{ 激活: 面板.面板标签.value === 'global' }" @click="面板.切换到全局图标">全局</button>
        </div>
        <div class="面板图标分组列表">
          <!-- 历史记录（始终显示在第一行，按当前标签分类，不受排序影响） -->
          <div v-if="图标选择历史.获取历史(面板.面板标签.value).length > 0" class="图标分组 面板历史记录">
            <div class="面板图标网格">
              <button v-for="图标值 in 图标选择历史.获取历史(面板.面板标签.value)" :key="'历史_' + 图标值" class="图标网格项" :class="{ 选中: props.选中值 === 图标值 }" @click="面板.执行选择(图标值)">
                <i v-if="是FA图标(图标值)" :class="图标值"></i>
                <span v-else-if="是Emoji图标(图标值)" class="emoji显示">{{ 图标值 }}</span>
                <img v-else-if="是全局图片图标(图标值) && 全局图标URL(图标值)" :src="全局图标URL(图标值)" alt="" class="全局图标缩略图" />
                <i v-else class="fas fa-image"></i>
              </button>
            </div>
          </div>
          <!-- FA 图标 -->
          <template v-if="面板.面板标签.value === 'fa'">
            <div v-for="分组 in 面板.过滤FA图标.value" :key="分组.分组名" class="图标分组">
              <div class="图标分组标题 可折叠" @click="面板.切换分组折叠(分组.分组名)">
                <i class="fas 展开图标" :class="面板.分组是否折叠(分组.分组名) ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                <span>{{ 分组.分组名 }}</span>
              </div>
              <div v-if="!面板.分组是否折叠(分组.分组名)" class="面板图标网格">
                <button v-for="图标项 in 分组.图标" :key="图标项" class="图标网格项" :class="{ 选中: props.选中值 === 图标项 }" @click="面板.执行选择(图标项)">
                  <i :class="图标项"></i>
                </button>
              </div>
            </div>
          </template>
          <!-- Emoji -->
          <template v-if="面板.面板标签.value === 'emoji'">
            <div v-for="分组 in 面板.过滤Emoji.value" :key="分组.分组名" class="图标分组">
              <div class="图标分组标题 可折叠" @click="面板.切换分组折叠(分组.分组名)">
                <i class="fas 展开图标" :class="面板.分组是否折叠(分组.分组名) ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                <span>{{ 分组.分组名 }}</span>
              </div>
              <div v-if="!面板.分组是否折叠(分组.分组名)" class="面板图标网格">
                <button v-for="图标项 in 分组.图标" :key="图标项" class="图标网格项" :class="{ 选中: props.选中值 === 图标项 }" @click="面板.执行选择(图标项)">
                  <span class="emoji显示">{{ 图标项 }}</span>
                </button>
              </div>
            </div>
          </template>
          <!-- 全局图标 -->
          <template v-if="面板.面板标签.value === 'global'">
            <div v-if="面板.全局图标加载中.value" class="面板加载中">
              <i class="fas fa-spinner fa-pulse"></i>
              <span>加载中...</span>
            </div>
            <template v-else>
              <div v-for="分组 in 面板.过滤全局图标.value" :key="分组.分组名" class="图标分组">
                <div class="图标分组标题 可折叠" @click="面板.切换分组折叠(分组.分组名)">
                  <i class="fas 展开图标" :class="面板.分组是否折叠(分组.分组名) ? 'fa-chevron-right' : 'fa-chevron-down'"></i>
                  <span>{{ 分组.分组名 }}</span>
                </div>
                <div v-if="!面板.分组是否折叠(分组.分组名)" class="面板图标网格">
                  <button v-for="图标值 in 分组.图标" :key="图标值" class="图标网格项 全局图标网格项" :class="{ 选中: props.选中值 === 图标值 }" @click="面板.执行选择(图标值)">
                    <img v-if="全局图标URL(图标值)" :src="全局图标URL(图标值)" alt="" class="全局图标缩略图" />
                    <span v-else class="全局图标占位"><i class="fas fa-spinner fa-pulse"></i></span>
                  </button>
                </div>
              </div>
              <div v-if="面板.过滤全局图标.value.length === 0" class="面板空状态">暂无全局图标</div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 图标选择悬浮面板（Teleport 到 body） */
.悬浮面板遮罩 {
  position: fixed;
  inset: 0;
  z-index: 10004;
  background: transparent;
}

.悬浮图标面板 {
  position: fixed;
  z-index: 10005;
  width: 400px;
  height: 400px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 8px;
  background-color: var(--毛玻璃背景色);
  backdrop-filter: var(--背景模糊);
  -webkit-backdrop-filter: var(--safari背景模糊);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.悬浮图标面板 .面板搜索栏 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}

.悬浮图标面板 .面板搜索输入 {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  font-size: 0.8rem;
  outline: none;
}

.悬浮图标面板 .面板搜索输入:focus {
  border-color: rgba(255, 255, 255, 0.4);
}

.悬浮图标面板 .面板搜索输入::placeholder {
  color: var(--弱化文字颜色);
}

.悬浮图标面板 .面板排序按钮 {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--全站透明文字颜色);
  cursor: pointer;
  transition: background 0.15s;
  font-size: 0.75rem;
}

.悬浮图标面板 .面板排序按钮:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}

.悬浮图标面板 .面板排序按钮.降序 {
  background: rgba(255, 255, 255, 0.15);
}

.悬浮图标面板 .面板图标分组列表 {
  flex: 1;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding: 6px 8px;
}

.悬浮图标面板 .面板图标分组列表::-webkit-scrollbar {
  width: 6px;
}

.悬浮图标面板 .面板图标分组列表::-webkit-scrollbar-track {
  background: transparent;
}

.悬浮图标面板 .面板图标分组列表::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--全站通用文字颜色) 30%, transparent);
  border-radius: 3px;
}

.悬浮图标面板 .图标分组 {
  margin-bottom: 4px;
}

.悬浮图标面板 .图标分组:last-child {
  margin-bottom: 0;
}

.悬浮图标面板 .图标分组标题 {
  font-size: 0.75rem;
  color: var(--弱化文字颜色);
  margin-bottom: 4px;
  padding: 0 2px;
}
.悬浮图标面板 .图标分组标题.可折叠 {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  user-select: none;
}
.悬浮图标面板 .图标分组标题.可折叠:hover {
  color: var(--全站透明文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 8%, transparent);
  border-radius: 4px;
}
.悬浮图标面板 .展开图标 {
  font-size: 12px;
  flex-shrink: 0;
}

.悬浮图标面板 .面板历史记录 {
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
  padding-bottom: 4px;
  margin-bottom: 4px;
}

.悬浮图标面板 .面板图标网格 {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 2px 0px 6px;
}

.悬浮图标面板 .图标网格项 {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 25%, transparent);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--全站通用文字颜色);
  font-size: 1rem;
  transition: all 0.15s;
  padding: 0;
}

.悬浮图标面板 .图标网格项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}

.悬浮图标面板 .图标网格项.选中 {
  background: color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}

.悬浮图标面板 .emoji显示 {
  font-size: 1.1rem;
  line-height: 1;
}

.悬浮图标面板 .全局图标网格项 {
  overflow: hidden;
}

.悬浮图标面板 .全局图标占位 {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--弱化文字颜色);
}

.悬浮图标面板 .全局图标占位 i {
  font-size: 16px;
}

.悬浮图标面板 .面板加载中 {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--弱化文字颜色);
  font-size: 0.85rem;
}

.悬浮图标面板 .面板加载中 i {
  font-size: 16px;
}

.悬浮图标面板 .面板空状态 {
  text-align: center;
  color: var(--弱化文字颜色);
  padding: 20px 0;
  font-size: 0.85rem;
}

.悬浮图标面板 .全局图标缩略图 {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.悬浮图标面板 .面板标签栏 {
  display: flex;
  border-bottom: 1px solid color-mix(in srgb, var(--全站通用文字颜色) 15%, transparent);
}

.悬浮图标面板 .面板标签项 {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: var(--弱化文字颜色);
  cursor: pointer;
  font-size: 0.8rem;
  transition:
    background 0.15s,
    color 0.15s;
}

.悬浮图标面板 .面板标签项:hover {
  background: color-mix(in srgb, var(--全站通用文字颜色) 5%, transparent);
  color: var(--全站透明文字颜色);
}

.悬浮图标面板 .面板标签项.激活 {
  color: var(--全站通用文字颜色);
  background: color-mix(in srgb, var(--全站通用文字颜色) 10%, transparent);
}
</style>