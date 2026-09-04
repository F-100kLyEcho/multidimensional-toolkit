/**
 * 文件夹折叠状态管理
 * 模块级共享的 reactive Map，所有组件实例共享同一份状态
 */
import { reactive } from 'vue'

const 折叠状态 = reactive(new Map<string, boolean>())

export function 切换折叠(路径: string) {
  折叠状态.set(路径, !折叠状态.get(路径))
}

export function 是否折叠(路径: string): boolean {
  return 折叠状态.get(路径) ?? false
}

export function 展开所有() {
  折叠状态.clear()
}
