/**
 * 使用右键菜单 —— 管理文件列表右键菜单的显示状态和事件包装
 *
 * 功能：
 * - 右键菜单的显示/隐藏、定位
 * - 提供各种右键操作（排除、恢复、豁免、通配等）的包装函数
 * - 自动在点击包装函数后关闭菜单
 */
import { ref } from 'vue'
import type { 树形节点 } from '../类型/index'

/**
 * @param 处理右键排除 - 外部传入的实际排除处理函数
 * @param 处理右键恢复 - 外部传入的实际恢复处理函数
 * @param 处理右键恢复豁免 - 外部传入的实际恢复豁免处理函数
 * @param 处理右键豁免 - 外部传入的实际豁免处理函数
 * @param 处理右键通配 - 外部传入的实际通配处理函数
 * @param 处理取消通配 - 外部传入的实际取消通配处理函数
 * @param 处理右键排除占位 - 外部传入的排除占位处理函数
 * @param 处理右键取消占位 - 外部传入的取消占位处理函数
 * @param 处理递归排除文件夹 - 外部传入的递归排除文件夹处理函数
 * @param 处理递归排除文件 - 外部传入的递归排除文件处理函数
 * @param 处理排除选中 - 外部传入的批量排除选中处理函数
 * @param 处理取消排除选中 - 外部传入的批量取消排除选中处理函数
 * @param 是否显示排除选中 - 外部传入的判断是否显示批量操作模式的函数
 */
export function 使用右键菜单(
  处理右键排除: (节点: { path: string; isFolder: boolean }) => void,
  处理右键恢复: (节点: { path: string; isFolder: boolean }) => void,
  处理右键恢复豁免: (节点: { path: string }) => void,
  处理右键豁免: (节点: { path: string }) => void,
  处理右键通配: (节点: { name: string }) => void,
  处理取消通配: (节点: { path: string }) => void,
  处理右键排除占位: (节点: { path: string }) => void,
  处理右键取消占位: (节点: { path: string }) => void,
  处理递归排除文件夹: (节点: { path: string; name: string }) => Promise<void>,
  处理递归排除文件: (节点: { path: string; name: string }) => Promise<void>,
  处理取消递归排除: (节点: { path: string; name: string; isFolder: boolean }) => Promise<void>,
  处理排除选中: () => void,
  处理取消排除选中: () => void,
  是否显示排除选中: () => boolean,
) {
  const 右键菜单显示 = ref(false)
  const 右键菜单X = ref(0)
  const 右键菜单Y = ref(0)
  const 右键菜单节点 = ref<树形节点 | null>(null)

  function 处理右键菜单(event: MouseEvent, 节点: 树形节点) {
    右键菜单显示.value = true
    右键菜单X.value = event.clientX
    右键菜单Y.value = event.clientY
    右键菜单节点.value = 节点
  }

  function 关闭右键菜单() {
    右键菜单显示.value = false
    右键菜单节点.value = null
  }

  /** 包装函数：处理右键排除后关闭菜单 */
  function 点击排除() {
    处理右键排除(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 排除所有选中节点 */
  async function 点击排除选中() {
    await 处理排除选中()
    关闭右键菜单()
  }

  /** 取消排除所有选中节点 */
  async function 点击取消排除选中() {
    await 处理取消排除选中()
    关闭右键菜单()
  }

  /** 包装函数：处理右键排除占位后关闭菜单 */
  function 点击排除占位() {
    处理右键排除占位(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理右键取消占位后关闭菜单 */
  function 点击取消占位() {
    处理右键取消占位(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理右键通配后关闭菜单 */
  function 点击通配() {
    处理右键通配(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理右键恢复后关闭菜单 */
  function 点击恢复() {
    处理右键恢复(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理右键恢复豁免后关闭菜单 */
  function 点击恢复豁免() {
    处理右键恢复豁免(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理右键豁免后关闭菜单 */
  function 点击豁免() {
    处理右键豁免(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理取消通配后关闭菜单 */
  function 点击取消通配() {
    处理取消通配(右键菜单节点.value!)
    关闭右键菜单()
  }

  /** 包装函数：处理递归排除后关闭菜单 */
  function 点击递归排除() {
    if (!右键菜单节点.value) return
    if (右键菜单节点.value.isFolder) {
      处理递归排除文件夹(右键菜单节点.value)
    } else {
      处理递归排除文件(右键菜单节点.value)
    }
    关闭右键菜单()
  }

  /** 包装函数：处理取消递归排除后关闭菜单 */
  async function 点击取消递归排除() {
    if (!右键菜单节点.value) return
    await 处理取消递归排除(右键菜单节点.value)
    关闭右键菜单()
  }

  /** 获取当前右键菜单节点是否满足显示批量排除的条件 */
  function 判断显示排除选中(): boolean {
    if (!右键菜单节点.value) return false
    return 是否显示排除选中()
  }

  return {
    右键菜单显示,
    右键菜单X,
    右键菜单Y,
    右键菜单节点,
    处理右键菜单,
    关闭右键菜单,
    点击排除,
    点击排除选中,
    点击取消排除选中,
    点击排除占位,
    点击取消占位,
    点击通配,
    点击恢复,
    点击恢复豁免,
    点击豁免,
    点击取消通配,
    点击递归排除,
    点击取消递归排除,
    判断显示排除选中,
  }
}
