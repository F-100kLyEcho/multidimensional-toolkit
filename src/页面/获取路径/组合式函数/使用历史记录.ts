/**
 * 使用历史记录 —— 管理路径历史记录的加载、添加、删除、清空和下拉菜单状态
 *
 * 功能：
 * - 从后端 IPC 读取/添加/删除/清空历史记录
 * - 管理历史记录下拉菜单的打开/关闭及外部点击关闭
 * - 从历史记录选择路径并通过回调触发扫描
 */
import { ref, onMounted, onUnmounted } from 'vue'

/**
 * @param 是否Electron环境 - 判断是否在 Electron 环境中
 * @param 选择路径回调 - 选择历史路径后的回调函数（接收路径参数）
 */
export function 使用历史记录(是否Electron环境: boolean, 选择路径回调: (路径: string) => Promise<void>) {
  /** 历史记录列表 */
  const 历史记录列表 = ref<string[]>([])

  /** 是否显示历史记录下拉 */
  const 显示历史记录 = ref(false)

  /**
   * 刷新历史记录列表
   */
  async function 刷新历史记录() {
    if (!是否Electron环境) return
    const 响应 = await window.electronAPI.读取历史记录()
    if (响应.成功 && 响应.记录列表) {
      历史记录列表.value = 响应.记录列表
    }
  }

  /**
   * 从历史记录中选择路径并自动触发获取项目
   */
  async function 选择历史路径(路径: string) {
    显示历史记录.value = false
    await 选择路径回调(路径)
  }

  /**
   * 删除单条历史记录
   */
  async function 删除单条历史记录(路径: string, event: MouseEvent) {
    event.stopPropagation()
    if (!是否Electron环境) return
    await window.electronAPI.删除历史记录(路径)
    await 刷新历史记录()
  }

  /**
   * 清空所有历史记录
   */
  async function 清空所有历史记录() {
    if (!是否Electron环境) return
    await window.electronAPI.清空历史记录()
    await 刷新历史记录()
  }

  /**
   * 关闭历史记录下拉
   */
  function 关闭历史记录() {
    显示历史记录.value = false
  }

  /**
   * 点击外部关闭历史记录
   */
  function 点击外部关闭历史记录(e: MouseEvent) {
    if (显示历史记录.value) {
      const target = e.target as HTMLElement
      if (!target.closest('.历史按钮容器')) {
        显示历史记录.value = false
      }
    }
  }

  /** 进入页面时刷新历史记录 */
  onMounted(async () => {
    await 刷新历史记录()
  })

  /** 注册/注销外部点击监听 */
  onMounted(() => {
    document.addEventListener('click', 点击外部关闭历史记录)
  })

  onUnmounted(() => {
    document.removeEventListener('click', 点击外部关闭历史记录)
  })

  return {
    历史记录列表,
    显示历史记录,
    刷新历史记录,
    选择历史路径,
    删除单条历史记录,
    清空所有历史记录,
    关闭历史记录,
  }
}
