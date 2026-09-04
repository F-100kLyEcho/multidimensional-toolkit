/**
 * 使用规则文件 —— 管理 mdignore 规则文件的创建、切换、删除、重命名、持久化
 *
 * 功能：
 * - 从后端 IPC 加载/保存 mdignore 规则文件
 * - 管理当前规则文件名、栏标题、规则文件列表
 * - 支持复制、新建、切换、删除、清空、重命名
 * - 当前文件名自动持久化到 localStorage
 */
import { ref, type Ref } from 'vue'

/**
 * @param 当前项目路径 - 返回当前项目路径的 getter
 * @param 清除所有排除 - 外部暴露的清除所有排除函数（无规则文件时调用）
 * @param 重建统一顺序列表 - 外部暴露的重建函数（切换规则文件后调用）
 * @param 外部精确文件夹排除列表 - 外部排除规则的 ref（将被直接修改）
 * @param 外部精确文件排除列表 - 外部排除规则的 ref
 * @param 外部递归文件排除列表 - 外部排除规则的 ref
 * @param 外部豁免列表 - 外部排除规则的 ref
 * @param 外部通配符列表 - 外部排除规则的 ref
 * @param 外部占位文件夹列表 - 外部排除规则的 ref
 */
export function 使用规则文件(当前项目路径: () => string, 清除所有排除: () => void, 重建统一顺序列表: () => void, 外部精确文件夹排除列表: Ref<string[]>, 外部递归文件夹排除列表: Ref<string[]>, 外部精确文件排除列表: Ref<string[]>, 外部递归文件排除列表: Ref<string[]>, 外部豁免列表: Ref<string[]>, 外部通配符列表: Ref<string[]>, 外部占位文件夹列表: Ref<string[]>) {
  /** 判断是否在 Electron 环境中 */
  const 是否Electron环境 = typeof window !== 'undefined' && window.electronAPI !== undefined

  /** 当前栏标题文本 */
  const 栏标题 = ref('未创建规则')
  /** 是否有规则文件存在 */
  const 有规则文件 = ref(false)
  /** 规则文件列表（仅文件名） */
  const 规则文件列表 = ref<string[]>([])
  /** 是否处于待命名态（新建后不可编辑） */
  const 标题待命名 = ref(false)
  /** 当前激活的规则文件名 */
  const 当前文件名 = ref('')

  /** localStorage 键名 */
  const 存储键_当前规则文件 = 'get-path-current-rule-file'

  /**
   * 保存当前规则文件名到 localStorage
   */
  function 保存当前文件名到存储() {
    if (当前文件名.value && 当前项目路径()) {
      try {
        localStorage.setItem(
          存储键_当前规则文件,
          JSON.stringify({
            项目路径: 当前项目路径(),
            文件名: 当前文件名.value,
          }),
        )
      } catch {
        // 忽略存储错误
      }
    }
  }

  /**
   * 从 localStorage 恢复上次打开的规则文件名
   */
  function 从存储恢复文件名(): string | null {
    try {
      const 数据 = localStorage.getItem(存储键_当前规则文件)
      if (数据) {
        const { 项目路径, 文件名 } = JSON.parse(数据)
        if (项目路径 === 当前项目路径() && 文件名) {
          return 文件名
        }
      }
    } catch {
      // 忽略读取错误
    }
    return null
  }

  /**
   * 从后端加载规则文件列表
   */
  async function 加载规则文件列表() {
    if (!是否Electron环境 || !当前项目路径()) return

    const 响应 = await window.electronAPI.列出规则文件(当前项目路径())
    if (响应.成功 && 响应.文件列表) {
      规则文件列表.value = 响应.文件列表.map((f) => f.文件名)

      if (响应.文件列表.length > 0) {
        // 优先恢复上次打开的规则文件
        const 上次文件名 = 从存储恢复文件名()
        if (上次文件名 && 规则文件列表.value.includes(上次文件名)) {
          await 切换规则文件(上次文件名)
        } else if (当前文件名.value && 规则文件列表.value.includes(当前文件名.value)) {
          await 切换规则文件(当前文件名.value)
        } else {
          // 否则激活第一个文件
          await 切换规则文件(响应.文件列表[0]!.文件名)
        }
      } else {
        // 没有规则文件，回到初始态
        当前文件名.value = ''
        栏标题.value = '未创建规则'
        有规则文件.value = false
        标题待命名.value = false
        清除所有排除()
      }
    }
  }

  /**
   * 将当前规则保存到后端
   */
  async function 保存当前规则() {
    if (!是否Electron环境 || !当前项目路径() || !当前文件名.value) return

    const 规则数据 = JSON.parse(
      JSON.stringify({
        精确文件夹排除列表: 外部精确文件夹排除列表.value,
        递归文件夹排除列表: 外部递归文件夹排除列表.value,
        精确文件排除列表: 外部精确文件排除列表.value,
        递归文件排除列表: 外部递归文件排除列表.value,
        豁免列表: 外部豁免列表.value,
        通配符列表: 外部通配符列表.value,
        占位文件夹列表: 外部占位文件夹列表.value,
      }),
    )

    await window.electronAPI.保存Mdignore(当前项目路径(), 当前文件名.value, 规则数据)
  }

  /**
   * 从指定规则文件加载规则数据
   */
  async function 切换规则文件(文件名: string) {
    if (!是否Electron环境 || !当前项目路径()) return

    当前文件名.value = 文件名
    栏标题.value = 文件名.replace('.mdignore', '')
    标题待命名.value = false
    有规则文件.value = true
    保存当前文件名到存储()

    const 响应 = await window.electronAPI.读取Mdignore(当前项目路径(), 文件名)
    if (响应.成功 && 响应.规则) {
      const 规则 = 响应.规则
      外部精确文件夹排除列表.value = 规则.精确文件夹排除列表 ?? []
      外部递归文件夹排除列表.value = 规则.递归文件夹排除列表 ?? []
      外部精确文件排除列表.value = 规则.精确文件排除列表 ?? []
      外部递归文件排除列表.value = 规则.递归文件排除列表 ?? []
      外部豁免列表.value = 规则.豁免列表 ?? []
      外部通配符列表.value = 规则.通配符列表 ?? []
      外部占位文件夹列表.value = 规则.占位文件夹列表 ?? []
      重建统一顺序列表()
    }
  }

  /**
   * 处理复制规则文件
   */
  async function 处理复制规则() {
    if (!是否Electron环境 || !当前项目路径() || !当前文件名.value) return

    // 1. 先保存当前规则到后端
    await 保存当前规则()

    // 2. 计算基础名称
    const 基础名称 = 当前文件名.value.replace('.mdignore', '') + '-副本'

    // 3. 调用后端创建规则文件接口（自动处理重名）
    const 创建响应 = await window.electronAPI.创建规则文件(当前项目路径(), 基础名称)
    if (!创建响应.成功 || !创建响应.文件名) return
    const 新文件名 = 创建响应.文件名

    // 4. 深拷贝五个 ref 数组，调用保存接口写入新文件
    const 规则数据 = JSON.parse(
      JSON.stringify({
        精确文件夹排除列表: 外部精确文件夹排除列表.value,
        递归文件夹排除列表: 外部递归文件夹排除列表.value,
        精确文件排除列表: 外部精确文件排除列表.value,
        递归文件排除列表: 外部递归文件排除列表.value,
        豁免列表: 外部豁免列表.value,
        通配符列表: 外部通配符列表.value,
        占位文件夹列表: 外部占位文件夹列表.value,
      }),
    )
    await window.electronAPI.保存Mdignore(当前项目路径(), 新文件名, 规则数据)

    // 5. 将新文件名追加到规则文件列表
    规则文件列表.value.push(新文件名)

    // 6. 切换到新文件
    await 切换规则文件(新文件名)
  }

  /**
   * 处理新建规则文件
   */
  async function 处理新建规则() {
    if (!是否Electron环境 || !当前项目路径()) return

    const 响应 = await window.electronAPI.创建规则文件(当前项目路径())
    if (响应.成功 && 响应.文件名) {
      规则文件列表.value.push(响应.文件名)
      await 切换规则文件(响应.文件名)
    }
  }

  /**
   * 处理切换规则文件（来自下拉菜单）
   */
  async function 处理切换规则文件(文件名: string) {
    // 先保存当前规则
    await 保存当前规则()
    await 切换规则文件(文件名)
  }

  /**
   * 处理删除规则文件
   */
  async function 处理删除规则文件(文件名: string) {
    if (!是否Electron环境 || !当前项目路径()) return

    await window.electronAPI.删除规则文件(当前项目路径(), 文件名)
    规则文件列表.value = 规则文件列表.value.filter((f) => f !== 文件名)

    if (规则文件列表.value.length === 0) {
      当前文件名.value = ''
      栏标题.value = '未创建规则'
      有规则文件.value = false
      标题待命名.value = false
      清除所有排除()
    } else {
      // 自动切换到下一个可用文件
      const 下一个 = 规则文件列表.value[0]!
      await 切换规则文件(下一个)
    }
  }

  /**
   * 处理清空所有规则文件
   */
  async function 处理清空所有规则文件() {
    if (!是否Electron环境 || !当前项目路径()) return

    // 逐个删除所有规则文件
    for (const 文件名 of [...规则文件列表.value]) {
      await window.electronAPI.删除规则文件(当前项目路径(), 文件名)
    }

    规则文件列表.value = []
    当前文件名.value = ''
    栏标题.value = '未创建规则'
    有规则文件.value = false
    标题待命名.value = false
    清除所有排除()
  }

  /**
   * 处理标题提交（重命名规则文件）
   */
  async function 处理标题提交(新标题: string) {
    if (!是否Electron环境 || !当前项目路径() || !当前文件名.value) return

    const 新文件名 = `${新标题}.mdignore`
    // 检查重名冲突
    if (规则文件列表.value.includes(新文件名) && 新文件名 !== 当前文件名.value) return

    const 响应 = await window.electronAPI.重命名规则文件(当前项目路径(), 当前文件名.value, 新文件名)
    if (响应.成功) {
      // 更新文件列表
      const 索引 = 规则文件列表.value.indexOf(当前文件名.value)
      if (索引 !== -1) {
        规则文件列表.value[索引] = 新文件名
      }
      当前文件名.value = 新文件名
      栏标题.value = 新标题
      标题待命名.value = false
    }
  }

  /**
   * 初始态时自动创建规则文件（供外部右键菜单/添加规则时调用）
   */
  async function 确保有规则文件() {
    if (当前文件名.value || !是否Electron环境 || !当前项目路径()) return

    const 响应 = await window.electronAPI.创建规则文件(当前项目路径())
    if (响应.成功 && 响应.文件名) {
      规则文件列表.value.push(响应.文件名)
      await 切换规则文件(响应.文件名)
    }
  }

  return {
    栏标题,
    有规则文件,
    规则文件列表,
    标题待命名,
    当前文件名,
    加载规则文件列表,
    保存当前规则,
    切换规则文件,
    处理复制规则,
    处理新建规则,
    处理切换规则文件,
    处理删除规则文件,
    处理清空所有规则文件,
    处理标题提交,
    确保有规则文件,
  }
}
