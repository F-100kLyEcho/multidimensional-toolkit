import { ref, onMounted, onUnmounted } from 'vue'

// ==================== 类型定义 ====================

const STORAGE_KEY = 'get-path-layout-v2'
const EXPIRY_DAYS = 30
const TOTAL_FLEX_SUM = 4.5 // 默认 flex 总和：1.8 + 1.2 + 1.5

interface 布局存储数据 {
  leftFlex: number
  middleFlex: number
  rightFlex: number
  middleVisible: boolean
  rightVisible: boolean
  timestamp: number
}

// 最小值配置（px）
const MIN_WIDTHS = {
  left: 320,
  middle: 240,
  right: 280,
}

// ==================== 状态管理 ====================

export function 使用分栏布局() {
  // ---- 响应式状态 ----
  const leftFlex = ref(1.8)
  const middleFlex = ref(1.2)
  const rightFlex = ref(1.5)
  const middleVisible = ref(true)
  const rightVisible = ref(true)

  // 缓存隐藏前的 flex 值（用于恢复）
  const cachedMiddleFlex = ref(1.2)
  const cachedRightFlex = ref(1.5)

  // 拖拽状态
  const dragging = ref(false)
  const dragTarget = ref<'left-middle' | 'middle-right' | null>(null)
  const startX = ref(0)
  const startLeftFlex = ref(1.8)
  const startMiddleFlex = ref(1.2)
  const startRightFlex = ref(1.5)
  const containerWidth = ref(0)

  // ---- 初始化（读取 localStorage） ----
  function 读取存储数据(): 布局存储数据 | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const data: 布局存储数据 = JSON.parse(raw)
      // 校验数据结构完整性
      if (typeof data.leftFlex !== 'number' || typeof data.middleFlex !== 'number' || typeof data.rightFlex !== 'number' || typeof data.middleVisible !== 'boolean' || typeof data.rightVisible !== 'boolean' || typeof data.timestamp !== 'number') {
        return null
      }
      // 检查过期
      if (Date.now() - data.timestamp > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return data
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
  }

  function 初始化() {
    const data = 读取存储数据()
    if (data) {
      leftFlex.value = data.leftFlex
      middleFlex.value = data.middleFlex
      rightFlex.value = data.rightFlex
      middleVisible.value = data.middleVisible
      rightVisible.value = data.rightVisible
      // 同步缓存
      cachedMiddleFlex.value = data.middleFlex
      cachedRightFlex.value = data.rightFlex
    }
  }

  // ---- 持久化保存 ----
  function 保存到存储() {
    const data: 布局存储数据 = {
      leftFlex: leftFlex.value,
      middleFlex: middleFlex.value,
      rightFlex: rightFlex.value,
      middleVisible: middleVisible.value,
      rightVisible: rightVisible.value,
      timestamp: Date.now(),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage 写入失败（如配额超限），静默忽略
    }
  }

  // ---- 更新容器宽度 ----
  function 更新容器宽度() {
    const el = document.querySelector('.布局-主体') as HTMLElement | null
    if (el) {
      containerWidth.value = el.clientWidth
    }
  }

  // ==================== 拖拽逻辑 ====================

  function startDrag(event: MouseEvent, paneKey: 'left-middle' | 'middle-right') {
    // 如果目标栏不可见，阻止拖拽
    if (paneKey === 'left-middle' && !middleVisible.value) return
    if (paneKey === 'middle-right' && !rightVisible.value) return

    更新容器宽度()
    dragTarget.value = paneKey
    dragging.value = true
    startX.value = event.clientX

    // 记录当前 flex 值
    startLeftFlex.value = leftFlex.value
    startMiddleFlex.value = middleFlex.value
    startRightFlex.value = rightFlex.value

    // 绑定全局事件
    document.addEventListener('mousemove', onDragMove)
    document.addEventListener('mouseup', onDragEnd)
    document.documentElement.style.userSelect = 'none'
  }

  function 获取鼠标X(e: MouseEvent): number {
    return e.clientX
  }

  function onDragMove(e: MouseEvent) {
    if (!dragging.value || !dragTarget.value) return

    const currentX = 获取鼠标X(e)
    const deltaX = currentX - startX.value

    // 计算 px 到 flex 的转换比例：flex增量 = deltaX / containerWidth * TOTAL_FLEX_SUM
    const flexPerPx = TOTAL_FLEX_SUM / containerWidth.value
    const flexDelta = deltaX * flexPerPx

    if (dragTarget.value === 'left-middle') {
      // 调整左栏和中栏
      let newLeft = startLeftFlex.value + flexDelta
      let newMiddle = startMiddleFlex.value - flexDelta

      // 最小值限制（px → flex）
      const minLeftFlex = (MIN_WIDTHS.left / containerWidth.value) * TOTAL_FLEX_SUM
      const minMiddleFlex = (MIN_WIDTHS.middle / containerWidth.value) * TOTAL_FLEX_SUM

      if (newLeft < minLeftFlex) {
        newLeft = minLeftFlex
        newMiddle = TOTAL_FLEX_SUM - newLeft - rightFlex.value
      }
      if (newMiddle < minMiddleFlex) {
        newMiddle = minMiddleFlex
        newLeft = TOTAL_FLEX_SUM - newMiddle - rightFlex.value
      }

      // 确保右栏不变
      leftFlex.value = newLeft
      middleFlex.value = newMiddle
    } else if (dragTarget.value === 'middle-right') {
      // 调整中栏和右栏
      let newMiddle = startMiddleFlex.value + flexDelta
      let newRight = startRightFlex.value - flexDelta

      const minMiddleFlex = (MIN_WIDTHS.middle / containerWidth.value) * TOTAL_FLEX_SUM
      const minRightFlex = (MIN_WIDTHS.right / containerWidth.value) * TOTAL_FLEX_SUM

      if (newMiddle < minMiddleFlex) {
        newMiddle = minMiddleFlex
        newRight = TOTAL_FLEX_SUM - leftFlex.value - newMiddle
      }
      if (newRight < minRightFlex) {
        newRight = minRightFlex
        newMiddle = TOTAL_FLEX_SUM - leftFlex.value - newRight
      }

      middleFlex.value = newMiddle
      rightFlex.value = newRight
    }
  }

  function onDragEnd() {
    dragging.value = false
    dragTarget.value = null
    document.removeEventListener('mousemove', onDragMove)
    document.removeEventListener('mouseup', onDragEnd)
    document.documentElement.style.userSelect = ''
    保存到存储()
  }

  // ==================== 隐藏/显示逻辑 ====================

  /**
   * 切换中栏可见性
   */
  function toggleMiddle() {
    if (middleVisible.value) {
      // 隐藏中栏
      cachedMiddleFlex.value = middleFlex.value
      middleVisible.value = false
      // 剩余两栏等比例放大（总和不变）
      const remaining = leftFlex.value + rightFlex.value
      if (remaining > 0) {
        leftFlex.value = Math.round((leftFlex.value / remaining) * TOTAL_FLEX_SUM * 100) / 100
        rightFlex.value = Math.round((rightFlex.value / remaining) * TOTAL_FLEX_SUM * 100) / 100
      }
    } else {
      // 显示中栏：还原比例
      // 先按中栏恢复前比例缩小左右栏
      const remaining = leftFlex.value + rightFlex.value
      if (remaining > 0) {
        leftFlex.value = Math.round((leftFlex.value / remaining) * (TOTAL_FLEX_SUM - cachedMiddleFlex.value) * 100) / 100
        rightFlex.value = Math.round((rightFlex.value / remaining) * (TOTAL_FLEX_SUM - cachedMiddleFlex.value) * 100) / 100
      }
      middleFlex.value = cachedMiddleFlex.value
      middleVisible.value = true
    }
    保存到存储()
  }

  /**
   * 切换右栏可见性
   */
  function toggleRight() {
    if (rightVisible.value) {
      // 隐藏右栏
      cachedRightFlex.value = rightFlex.value
      rightVisible.value = false
      // 剩余两栏等比例放大
      const remaining = leftFlex.value + middleFlex.value
      if (remaining > 0) {
        leftFlex.value = Math.round((leftFlex.value / remaining) * TOTAL_FLEX_SUM * 100) / 100
        middleFlex.value = Math.round((middleFlex.value / remaining) * TOTAL_FLEX_SUM * 100) / 100
      }
    } else {
      // 显示右栏：还原比例
      const remaining = leftFlex.value + middleFlex.value
      if (remaining > 0) {
        leftFlex.value = Math.round((leftFlex.value / remaining) * (TOTAL_FLEX_SUM - cachedRightFlex.value) * 100) / 100
        middleFlex.value = Math.round((middleFlex.value / remaining) * (TOTAL_FLEX_SUM - cachedRightFlex.value) * 100) / 100
      }
      rightFlex.value = cachedRightFlex.value
      rightVisible.value = true
    }
    保存到存储()
  }

  // ==================== 重置布局 ====================

  function resetLayout() {
    leftFlex.value = 1.8
    middleFlex.value = 1.2
    rightFlex.value = 1.5
    middleVisible.value = true
    rightVisible.value = true
    cachedMiddleFlex.value = 1.2
    cachedRightFlex.value = 1.5
    保存到存储()
  }

  // ==================== 初始化 ====================

  初始化()
  // 窗口尺寸变化时重新计算最小值（下次拖拽时生效）
  onMounted(() => {
    window.addEventListener('resize', 更新容器宽度)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', 更新容器宽度)
  })

  return {
    // 状态
    leftFlex,
    middleFlex,
    rightFlex,
    middleVisible,
    rightVisible,

    // 拖拽
    startDrag,

    // 隐藏/显示
    toggleMiddle,
    toggleRight,

    // 重置
    resetLayout,
  }
}
