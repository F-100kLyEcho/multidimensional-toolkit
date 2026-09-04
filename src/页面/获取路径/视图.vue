<script setup lang="ts">
import '@fortawesome/fontawesome-free/css/all.min.css'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import GetPathLayout from './组件/布局/获取路径布局.vue'
import { 使用分栏布局 } from './组合式函数/使用分栏布局'
import { 模拟文件列表 } from './工具/测试数据'
import { 转换为树形 } from './工具/转换树形'
import { 使用预览模式 } from './组合式函数/使用预览模式'
import { 使用排除规则, 匹配通配符 } from './组合式函数/使用排除规则'
import RecursiveNode from './组件/文件列表/递归节点.vue'
import { 展开所有, 是否折叠 } from './组合式函数/使用折叠'
import PreviewContainer from './组件/预览/预览容器.vue'
import ExcludePanel from './组件/排除项/排除项面板.vue'
import { 规则转文本, 文本转规则 } from './组合式函数/使用排除规则'
import BarTitleLine from './组件/排除项/栏标题行.vue'
import GlobalRuleDialog from './组件/全局规则/全局规则弹窗.vue'
import MergeDialog from './组件/合并数据/合并数据弹窗.vue'
import { 使用合并数据 } from './组合式函数/使用合并数据'
import { 使用渐进式扫描 } from './组合式函数/使用渐进式扫描'
import { 使用选择 } from './组合式函数/使用选择'
import { 使用规则文件 } from './组合式函数/使用规则文件'
import { 使用右键菜单 } from './组合式函数/使用右键菜单'
import { 使用历史记录 } from './组合式函数/使用历史记录'
import { 使用全局快捷键 } from '@/组合式函数/使用全局快捷键'
import ContextMenu from './组件/布局/右键菜单.vue'

// ==================== 数据源管理 ====================

/** 当前输入的路径 */
const 当前路径 = ref('')

/** 是否正在加载 */
const 加载中 = ref(false)

/** 错误信息 */
const 错误信息 = ref('')

/** 判断是否在 Electron 环境中 */
const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

/** 扫描输出路径 */
const 扫描输出路径 = ref('')

/** 打开输出文件夹 */
async function 打开输出文件夹() {
  if (!是否Electron环境 || !扫描输出路径.value) return
  await window.electronAPI.打开文件夹(扫描输出路径.value)
}

// ==================== 渐进式扫描 ====================

const { 所有文件: 渐进式文件列表, 当前扫描文件夹, 扫描中, 扫描完成, 已扫描队列, 占位文件夹路径集合, 开始扫描, 暂停扫描, 继续扫描 } = 使用渐进式扫描()

// ==================== 历史记录 ====================

const {
  历史记录列表,
  显示历史记录,
  选择历史路径: 历史选择路径,
  删除单条历史记录,
  清空所有历史记录,
  刷新历史记录: 历史记录刷新,
} = 使用历史记录(是否Electron环境, async (路径) => {
  当前路径.value = 路径
  await 获取项目()
})

/**
 * 从渐进式扫描结果中提取扁平路径列表
 */
const 文件列表 = computed<string[]>(() => {
  return 渐进式文件列表.value.map((f) => {
    // 从完整路径中提取相对路径（相对于项目路径）
    const 项目路径标准化 = 当前路径.value.replace(/\\/g, '/')
    if (f.完整路径.startsWith(项目路径标准化 + '/')) {
      return f.完整路径.slice(项目路径标准化.length + 1)
    }
    return f.完整路径
  })
})

/**
 * 获取项目文件列表（渐进式扫描）
 */
async function 获取项目() {
  const 路径 = 当前路径.value.trim()
  if (!路径) return

  错误信息.value = ''

  try {
    if (是否Electron环境) {
      // 启动渐进式扫描
      await 开始扫描(路径)
      // 扫描成功后添加历史记录
      await window.electronAPI.添加历史记录(路径)
      await 历史记录刷新()
      // 保存上次路径
      await window.electronAPI.保存上次路径(路径)
      // 扫描成功后加载规则文件
      await 加载规则文件列表()
      // 加载扫描输出路径
      const 路径响应 = await window.electronAPI.获取规则存储路径(路径)
      if (路径响应.成功) {
        扫描输出路径.value = 路径响应.扫描输出路径 ?? ''
      }
    } else {
      // 非 Electron 环境使用模拟数据（直接修改渐进式文件列表）
      ;(渐进式文件列表 as any).value = 模拟文件列表.map((p) => ({
        名称: p.split('/').pop() ?? p,
        扩展名: p.includes('.') ? '.' + p.split('.').pop() : '',
        完整路径: p,
      }))
    }
  } catch (错误) {
    错误信息.value = `扫描出错: ${错误 instanceof Error ? 错误.message : String(错误)}`
  }
}

/** 树形节点列表（由文件列表转换而来） */
const 根节点列表 = computed(() => 转换为树形(文件列表.value, 占位文件夹路径集合))

const { 精确文件夹排除列表, 递归文件夹排除列表, 精确文件排除列表, 递归文件排除列表, 豁免列表, 通配符列表, 占位文件夹列表, 有序规则列表, 添加文件夹排除, 添加递归文件夹排除, 添加文件排除, 添加递归文件排除, 添加通配符, 添加豁免, 添加占位文件夹, 恢复规则, 清除所有排除, 是否被排除, 是否被豁免, 是否直接豁免, 获取节点状态, 获取排除规则类别, 重建统一顺序列表 } = 使用排除规则(() => 根节点列表.value)

// ==================== 规则文件管理 ====================

const { 栏标题, 有规则文件, 规则文件列表, 标题待命名, 加载规则文件列表, 保存当前规则, 处理复制规则, 处理新建规则, 处理切换规则文件, 处理删除规则文件, 处理清空所有规则文件, 处理标题提交, 确保有规则文件 } = 使用规则文件(
  () => 当前路径.value,
  () => 清除所有排除(),
  () => 重建统一顺序列表(),
  精确文件夹排除列表,
  递归文件夹排除列表,
  精确文件排除列表,
  递归文件排除列表,
  豁免列表,
  通配符列表,
  占位文件夹列表,
)

// ==================== 规则操作辅助函数 ====================

/**
 * 执行规则操作并自动保存
 * 自动处理 确保有规则文件 + 执行操作 + 保存当前规则 的重复模式
 */
async function 执行规则操作(操作: () => void | Promise<void>) {
  await 确保有规则文件()
  await 操作()
  await 保存当前规则()
}

// ==================== 右键菜单事件处理（自动保存） ====================

const 处理右键排除 = (节点: { path: string; isFolder: boolean }) =>
  执行规则操作(() => {
    if (节点.isFolder) {
      添加文件夹排除(节点.path)
    } else {
      添加文件排除(节点.path)
    }
  })

const 处理右键恢复 = (节点: { path: string; isFolder: boolean }) =>
  执行规则操作(() => {
    恢复规则({ 类别: 节点.isFolder ? '精确文件夹' : '精确文件', 值: 节点.path })
  })

/** 处理豁免节点点击"取消豁免"：从豁免列表中移除 */
const 处理右键恢复豁免 = (节点: { path: string }) =>
  执行规则操作(() => {
    恢复规则({ 类别: '豁免', 值: 节点.path })
  })

const 处理右键豁免 = (节点: { path: string }) =>
  执行规则操作(() => {
    添加豁免(节点.path)
  })

const 处理右键通配 = (节点: { name: string }) =>
  执行规则操作(() => {
    // 解析扩展名，生成 *.扩展名 通配规则
    const 文件名 = 节点.name
    const 点索引 = 文件名.lastIndexOf('.')
    if (点索引 === -1) return
    const 扩展名 = 文件名.slice(点索引)
    添加通配符(`*${扩展名}`)
  })

/** 处理取消通配符 */
const 处理取消通配 = (节点: { path: string }) =>
  执行规则操作(() => {
    const 匹配规则 = 通配符列表.value.filter((规则) => 匹配通配符(节点.path, 规则))
    匹配规则.forEach((规则) => 恢复规则({ 类别: '通配符', 值: 规则 }))
  })

/** 处理右键排除占位 */
const 处理右键排除占位 = (节点: { path: string }) =>
  执行规则操作(() => {
    添加占位文件夹(节点.path)
  })

/** 处理右键取消占位 */
const 处理右键取消占位 = (节点: { path: string }) =>
  执行规则操作(() => {
    恢复规则({ 类别: '占位文件夹', 值: 节点.path })
  })

/** 处理右键递归排除文件夹 */
const 处理右键递归排除文件夹 = (节点: { path: string; name: string }) =>
  执行规则操作(() => {
    添加递归文件夹排除(节点.name)
  })

/** 处理右键递归排除文件 */
const 处理右键递归排除文件 = (节点: { path: string; name: string }) =>
  执行规则操作(() => {
    添加递归文件排除(节点.name)
  })

/** 处理右键取消递归排除 */
const 处理右键取消递归排除 = (节点: { path: string; name: string; isFolder: boolean }) =>
  执行规则操作(() => {
    恢复规则({ 类别: 节点.isFolder ? '递归文件夹' : '递归文件', 值: 节点.name })
  })

/** 排除所有选中节点 */
const 处理排除选中 = () =>
  执行规则操作(() => {
    const 选中路径列表 = [...选中路径集合.value]
    if (选中路径列表.length === 0) return

    for (const 路径 of 选中路径列表) {
      const 节点 = 根节点列表.value.find((n) => n.path === 路径)
      if (节点?.isFolder) {
        添加文件夹排除(路径)
      } else {
        添加文件排除(路径)
      }
    }
  })

/** 取消排除所有选中节点 */
const 处理取消排除选中 = () =>
  执行规则操作(() => {
    const 选中路径列表 = [...选中路径集合.value]
    if (选中路径列表.length === 0) return

    for (const 路径 of 选中路径列表) {
      if (精确文件夹排除列表.value.includes(路径)) {
        恢复规则({ 类别: '精确文件夹', 值: 路径 })
      } else if (精确文件排除列表.value.includes(路径)) {
        恢复规则({ 类别: '精确文件', 值: 路径 })
      } else {
        const 节点 = 根节点列表.value.find((n) => n.path === 路径)
        恢复规则({ 类别: 节点?.isFolder ? '精确文件夹' : '精确文件', 值: 路径 })
      }
    }
  })

/** 判断右键菜单是否应显示批量操作模式（选中 ≥2 个节点时启用） */
function 是否显示排除选中(): boolean {
  return 是否选中(右键菜单节点?.value?.path ?? '') && 选中路径集合.value.size >= 2
}

// ==================== 右键菜单（状态与包装函数） ====================

const { 右键菜单显示, 右键菜单X, 右键菜单Y, 右键菜单节点, 处理右键菜单, 关闭右键菜单, 点击排除, 点击排除选中, 点击取消排除选中, 点击排除占位, 点击取消占位, 点击通配, 点击恢复, 点击恢复豁免, 点击豁免, 点击取消通配, 点击递归排除, 点击取消递归排除, 判断显示排除选中 } = 使用右键菜单(处理右键排除, 处理右键恢复, 处理右键恢复豁免, 处理右键豁免, 处理右键通配, 处理取消通配, 处理右键排除占位, 处理右键取消占位, 处理右键递归排除文件夹, 处理右键递归排除文件, 处理右键取消递归排除, 处理排除选中, 处理取消排除选中, 是否显示排除选中)

// ==================== 中栏数据组合 ====================

const 当前规则文本 = computed(() => 规则转文本(有序规则列表.value))

// ==================== 中栏事件处理（自动保存） ====================

/** 整体保存规则（来自编辑器的 @保存规则 事件） */
async function 处理保存规则(文本: string) {
  await 确保有规则文件()
  const { 精确文件夹, 递归文件夹, 精确文件, 递归文件, 占位文件夹, 豁免, 通配符 } = 文本转规则(文本)
  精确文件夹排除列表.value = 精确文件夹
  递归文件夹排除列表.value = 递归文件夹
  精确文件排除列表.value = 精确文件
  递归文件排除列表.value = 递归文件
  占位文件夹列表.value = 占位文件夹
  豁免列表.value = 豁免
  通配符列表.value = 通配符
  重建统一顺序列表()
  await 保存当前规则()
}

/** 清除所有排除后自动保存 */
async function 处理清除所有排除() {
  清除所有排除()
  await 保存当前规则()
}

// ==================== 预览模式 ====================

/** 自定义保存函数：通过 IPC 写入文件 */
async function 自定义保存(内容: string): Promise<boolean> {
  if (!是否Electron环境 || !当前路径.value) return false
  const 响应 = await window.electronAPI.保存输出文件(当前路径.value, 内容)
  return 响应.成功
}

const { 当前模式, 模式列表, 复制提示, 保存提示, 复制成功标志, 保存成功标志, 未排除节点列表, 文件计数, 切换模式, 当前预览文本, 是否为空, 复制内容, 保存文件 } = 使用预览模式(() => 根节点列表.value, 是否被排除, 是否被豁免, 自定义保存)

// ==================== 隐藏排除项 ====================

const 隐藏排除项 = ref(false)

// ==================== 合并数据 ====================

const {
  显示弹窗: 显示合并弹窗,
  打开弹窗: 打开合并弹窗,
  关闭弹窗: 关闭合并弹窗,
  栏标题: 合并栏标题,
  有规则文件: 合并有规则文件,
  规则文件列表: 合并规则文件列表,
  处理新建规则: 合并新建规则,
  处理切换规则文件: 合并切换规则文件,
  处理删除规则文件: 合并删除规则文件,
  处理清空所有规则文件: 合并清空所有规则文件,
  处理标题提交: 合并标题提交,
  文件路径列表: 合并文件路径列表,
  文件数: 合并文件数,
  预计合并大小: 合并预计大小,
  保存路径列表: 合并保存路径列表,
  一键获取: 合并一键获取,
  清空列表: 合并清空列表,
  一键获取可用: 合并一键获取可用,
  支持的文件类型: 合并支持的文件类型,
  输出格式: 合并输出格式,
  添加路径注释: 合并添加路径注释,
  添加分隔: 合并添加分隔,
  合并规则路径,
  输出保存路径: 合并输出保存路径,
  合并中: 合并合并中,
  合并结果: 合并合并结果,
  跳过文件列表: 合并跳过文件列表,
  开始合并: 合并开始合并,
  自动合并代码: 合并自动合并代码,
  保存当前配置: 合并保存当前配置,
} = 使用合并数据(
  () => 未排除节点列表.value,
  () => 当前路径.value,
  () => 扫描完成.value,
)

// ==================== 合并代码（自动合并） ====================

/** 合并代码按钮是否可用的计算属性 */
const 合并代码可用 = computed(() => {
  return 是否Electron环境 && 扫描完成.value && 栏标题.value !== '未创建规则' && 未排除节点列表.value.length > 0 && !合并合并中.value
})

// ==================== 全局规则弹窗 ====================

const 显示全局规则弹窗 = ref(false)

function 打开全局规则弹窗() {
  显示全局规则弹窗.value = true
}

function 关闭全局规则弹窗() {
  显示全局规则弹窗.value = false
}

// ==================== 多选/加选/减选状态 ====================

const { 是否选中, 选中路径集合, 处理点击节点 } = 使用选择(
  () => 根节点列表.value,
  是否折叠,
  () => 隐藏排除项.value,
  获取节点状态,
)

// ==================== 分栏布局（拖拽、隐藏/显示、快捷键） ====================

const { leftFlex, middleFlex, rightFlex, middleVisible, rightVisible, startDrag, toggleMiddle, toggleRight, resetLayout } = 使用分栏布局()

// ==================== 快捷键处理 ====================

使用全局快捷键({
  q: () => toggleMiddle(),
  w: () => toggleRight(),
  e: () => resetLayout(),
  Escape: () => { if (显示历史记录.value) 显示历史记录.value = false },
})

// ==================== 右键菜单外部点击关闭 ====================

onMounted(() => {
  document.addEventListener('click', 关闭右键菜单)
})

onUnmounted(() => {
  document.removeEventListener('click', 关闭右键菜单)
})
</script>

<template>
  <div class="获取路径视图">
    <GetPathLayout :leftFlex="leftFlex" :middleFlex="middleFlex" :rightFlex="rightFlex" :middleVisible="middleVisible" :rightVisible="rightVisible" @startDrag="startDrag" @toggleMiddle="toggleMiddle" @toggleRight="toggleRight" @resetLayout="resetLayout">
      <template #header>
        <button class="顶部按钮" @click="打开全局规则弹窗">规则配置</button>
        <button class="顶部按钮" @click="打开合并弹窗">合并数据</button>
      </template>
      <template #left>
        <div class="文件列表区">
          <!-- 固定区域：路径输入、操作栏、扫描状态栏 -->
          <div class="左栏-固定区">
            <div class="路径输入区">
              <input type="text" v-model="当前路径" placeholder="粘贴 Windows 路径，如 E:\project\my-app" class="路径输入框" @keyup.enter="获取项目" />
              <div class="历史按钮容器">
                <button class="历史按钮" @click.stop="显示历史记录 = !显示历史记录">历史记录</button>
                <div v-if="显示历史记录" class="历史记录下拉">
                  <div v-if="历史记录列表.length === 0" class="历史记录-空">暂无历史记录</div>
                  <div v-for="记录 in 历史记录列表" :key="记录" class="历史记录-项" @click="历史选择路径(记录)">
                    <span class="历史记录-路径">{{ 记录 }}</span>
                    <button class="历史记录-删除" @click="删除单条历史记录(记录, $event)">✕</button>
                  </div>
                  <div v-if="历史记录列表.length > 0" class="历史记录-清空" @click="清空所有历史记录">清空全部</div>
                </div>
              </div>
            </div>

            <div class="操作栏">
              <button class="获取项目按钮" :disabled="加载中" @click="获取项目">
                {{ 加载中 ? '扫描中...' : '获取项目' }}
              </button>
              <label class="隐藏排除开关">
                <input type="checkbox" v-model="隐藏排除项" />
                隐藏排除项
              </label>
              <button class="展开按钮" @click="展开所有">展开</button>
              <button v-if="扫描中" class="暂停按钮" @click="暂停扫描">暂停</button>
              <button v-if="!扫描中 && !扫描完成 && 已扫描队列.length > 0" class="继续按钮" @click="继续扫描">继续</button>
              <span v-if="错误信息" class="错误信息">{{ 错误信息 }}</span>
            </div>

            <!-- 扫描状态提示 -->
            <div v-if="扫描中" class="扫描状态栏">
              <span class="扫描状态-图标">⏳</span>
              <span class="扫描状态-文本">正在扫描：{{ 当前扫描文件夹 }}</span>
              <span class="扫描状态-计数">已发现 {{ 渐进式文件列表.length }} 个文件</span>
            </div>
            <div v-else-if="!扫描中 && !扫描完成 && 已扫描队列.length > 0" class="扫描状态栏 扫描状态栏-暂停">
              <span class="扫描状态-图标">⏸</span>
              <span class="扫描状态-文本">已暂停</span>
              <span class="扫描状态-计数">已发现 {{ 渐进式文件列表.length }} 个文件</span>
            </div>
            <div v-else-if="扫描完成" class="扫描状态栏 扫描状态栏-完成">
              <span class="扫描状态-图标">✅</span>
              <span class="扫描状态-文本">扫描完成</span>
              <span class="扫描状态-计数">共 {{ 渐进式文件列表.length }} 个文件</span>
            </div>
          </div>

          <!-- 滚动区域：树形列表 -->
          <ul class="树形列表">
            <RecursiveNode :节点列表="根节点列表" :层级="0" :是否被排除="是否被排除" :获取排除来源="获取排除规则类别" :获取节点状态="获取节点状态" :是否直接豁免="是否直接豁免" :隐藏排除项="隐藏排除项" :是否选中="是否选中" @排除节点="处理右键排除" @恢复节点="处理右键恢复" @恢复豁免="处理右键恢复豁免" @豁免节点="处理右键豁免" @通配节点="处理右键通配" @取消通配="处理取消通配" @右键菜单="处理右键菜单" @点击节点="处理点击节点" />
          </ul>
        </div>
      </template>

      <template #middle-header>
        <BarTitleLine :标题="栏标题" :有规则文件="有规则文件" :规则文件列表="规则文件列表" :待命名="标题待命名" @切换中栏="toggleMiddle" @新建规则="处理新建规则" @复制规则="处理复制规则" @切换规则文件="处理切换规则文件" @删除规则文件="处理删除规则文件" @标题提交="处理标题提交" @清空所有规则文件="处理清空所有规则文件" />
      </template>
      <template #middle>
        <ExcludePanel :规则文本="当前规则文本" :显示升维="true" @保存规则="处理保存规则" @清除所有排除="处理清除所有排除" />
      </template>

      <template #right-header>
        <button class="栏标题按钮" :class="{ '栏标题按钮-成功': 复制成功标志 }" :disabled="是否为空" title="复制到剪贴板" @click="复制内容">
          <i :class="复制成功标志 ? 'fas fa-check' : 'fas fa-copy'"></i>
        </button>
        <button class="栏标题按钮" :class="{ '栏标题按钮-成功': 保存成功标志 }" :disabled="是否为空" title="保存路径" @click="保存文件">
          <i :class="保存成功标志 ? 'fas fa-check' : 'fas fa-save'"></i>
        </button>
        <button class="栏标题按钮" :disabled="!扫描输出路径" title="打开输出文件夹" @click="打开输出文件夹">
          <i class="fas fa-folder-open"></i>
        </button>
        <button class="栏标题按钮" :disabled="!合并代码可用" title="合并代码" @click="合并自动合并代码(() => 未排除节点列表, 栏标题)">
          <i class="fas fa-code-branch"></i>
        </button>
      </template>
      <template #right>
        <!-- 预览中占位文件夹显示为黑色（与其它文本统一），所以将 placeholder 映射为 normal -->
        <PreviewContainer :当前模式="当前模式" :模式列表="模式列表" :复制提示="复制提示" :保存提示="保存提示" :复制成功标志="复制成功标志" :保存成功标志="保存成功标志" :当前预览文本="当前预览文本" :未排除节点列表="未排除节点列表" :是否为空="是否为空" :文件数="文件计数.文件数" :文件夹数="文件计数.文件夹数" :获取节点状态="(路径: string) => (获取节点状态(路径) === 'placeholder' ? 'normal' : 获取节点状态(路径))" @切换模式="切换模式" @复制内容="复制内容" @保存文件="保存文件" />
      </template>
    </GetPathLayout>

    <GlobalRuleDialog :显示="显示全局规则弹窗" :项目路径="当前路径" @关闭="关闭全局规则弹窗" />

    <MergeDialog
      :显示="显示合并弹窗"
      :栏标题="合并栏标题"
      :有规则文件="合并有规则文件"
      :规则文件列表="合并规则文件列表"
      :文件路径列表="合并文件路径列表"
      :文件数="合并文件数"
      :预计合并大小="合并预计大小"
      :配置="{
        支持的文件类型: 合并支持的文件类型,
        输出格式: 合并输出格式,
        添加路径注释: 合并添加路径注释,
        添加分隔: 合并添加分隔,
        合并规则路径: 合并规则路径,
        输出保存路径: 合并输出保存路径,
      }"
      :合并中="合并合并中"
      :合并结果="合并合并结果"
      :跳过文件列表="合并跳过文件列表"
      :一键获取可用="合并一键获取可用"
      :项目路径="当前路径"
      @关闭="关闭合并弹窗"
      @新建规则="() => 合并新建规则(栏标题 === '未创建规则' ? undefined : 栏标题)"
      @切换规则文件="合并切换规则文件"
      @删除规则文件="合并删除规则文件"
      @清空所有规则文件="合并清空所有规则文件"
      @标题提交="合并标题提交"
      @保存路径列表="合并保存路径列表"
      @一键获取="合并一键获取"
      @清空列表="合并清空列表"
      @更新配置="
        (新配置: { 支持的文件类型: string[]; 输出格式: 'md' | 'txt'; 添加路径注释: boolean; 添加分隔: boolean; 合并规则路径: string; 输出保存路径: string }) => {
          合并支持的文件类型 = 新配置.支持的文件类型
          合并输出格式 = 新配置.输出格式
          合并添加路径注释 = 新配置.添加路径注释
          合并添加分隔 = 新配置.添加分隔
        }
      "
      @开始合并="合并开始合并"
      @保存配置="合并保存当前配置"
    />

    <ContextMenu :显示="右键菜单显示" :菜单X="右键菜单X" :菜单Y="右键菜单Y" :节点="右键菜单节点" :获取节点状态="获取节点状态" :获取排除规则类别="获取排除规则类别" :是否直接豁免="是否直接豁免" :判断显示排除选中="判断显示排除选中" @关闭="关闭右键菜单" @排除="点击排除" @排除选中="点击排除选中" @取消排除选中="点击取消排除选中" @排除占位="点击排除占位" @取消占位="点击取消占位" @通配="点击通配" @恢复="点击恢复" @恢复豁免="点击恢复豁免" @豁免="点击豁免" @取消通配="点击取消通配" @递归排除="点击递归排除" @取消递归排除="点击取消递归排除" />
  </div>
</template>

<style scoped>
.路径输入区 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.路径输入框 {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-family: inherit;
}
.历史按钮容器 {
  position: relative;
}
.历史按钮,
.获取项目按钮 {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  background: #0078d4;
  color: #fff;
  cursor: pointer;
}
.历史记录下拉 {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  min-width: 320px;
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #d0d0d0;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  margin-top: 4px;
}
.历史记录-空 {
  padding: 12px 16px;
  color: #999;
  font-size: 13px;
  text-align: center;
}
.历史记录-项 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 13px;
}
.历史记录-项:hover {
  background: #f0f7ff;
}
.历史记录-路径 {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #333;
}
.历史记录-删除 {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
}
.历史记录-删除:hover {
  background: #ffebee;
  color: #d32f2f;
}
.历史记录-清空 {
  padding: 8px 12px;
  text-align: center;
  color: #999;
  font-size: 12px;
  cursor: pointer;
  border-top: 1px solid #eee;
}
.历史记录-清空:hover {
  background: #f5f5f5;
  color: #666;
}
.操作栏 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.获取项目按钮:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.错误信息 {
  color: #d32f2f;
  font-size: 13px;
}
.隐藏排除开关 {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  margin-left: 12px;
  color: #333;
}
.展开按钮 {
  margin-left: 8px;
  padding: 4px 10px;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.展开按钮:hover {
  background: #f0f0f0;
  border-color: #aaa;
}

.暂停按钮 {
  padding: 4px 10px;
  border: 1px solid #ff9800;
  border-radius: 6px;
  background: #fff8e1;
  color: #e65100;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.暂停按钮:hover {
  background: #fff3cd;
  border-color: #f57c00;
}

.继续按钮 {
  padding: 4px 10px;
  border: 1px solid #4caf50;
  border-radius: 6px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.继续按钮:hover {
  background: #c8e6c9;
  border-color: #388e3c;
}

/* 扫描状态栏 */
.扫描状态栏 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin: 6px 0;
  background: #e3f2fd;
  border: 1px solid #90caf9;
  border-radius: 6px;
  font-size: 12px;
  color: #1565c0;
}
.扫描状态栏-暂停 {
  background: #fff8e1;
  border-color: #ffe082;
  color: #e65100;
}
.扫描状态栏-完成 {
  background: #e8f5e9;
  border-color: #a5d6a7;
  color: #2e7d32;
}
.扫描状态-图标 {
  flex-shrink: 0;
  font-size: 14px;
}
.扫描状态-文本 {
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.扫描状态-计数 {
  margin-left: auto;
  flex-shrink: 0;
  color: inherit;
  opacity: 0.8;
}
.顶部按钮 {
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #555;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.顶部按钮:hover {
  background: #e8e8e8;
  color: #333;
}
.栏标题按钮 {
  width: 32px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  background: #fff;
  color: #555;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
}
.栏标题按钮:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #aaa;
}
.栏标题按钮:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.栏标题按钮-保存 {
  color: #2e7d32;
}
.栏标题按钮-保存:hover:not(:disabled) {
  background: #e8f5e9;
  border-color: #66bb6a;
}
.栏标题按钮-删除 {
  color: #d32f2f;
}
.栏标题按钮-删除:hover:not(:disabled) {
  background: #ffebee;
  border-color: #ef5350;
}
.栏标题按钮-成功 {
  background: #16a34a;
  color: #fff;
  border-color: #16a34a;
}
.栏标题按钮-成功:hover:not(:disabled) {
  background: #15803d;
  color: #fff;
  border-color: #15803d;
}
.文件列表区 {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.左栏-固定区 {
  flex-shrink: 0;
}
.文件列表区 :deep(.树形项:not(.树形项-已排除):not(.树形项-已豁免) .名称) {
  color: #16a34a;
}
.树形列表 {
  list-style: none;
  margin: 12px 0 0 0;
  padding: 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
</style>

<style>
/* 全局移除按钮的 focus-visible 橘色外边框 */
button:focus-visible {
  outline: none;
}
</style>
