import { ref } from 'vue'

/** 多维记忆皮肤状态（模块级单例，记忆首页与记忆泡共用） */
export const 深色 = ref(localStorage.getItem('多维记忆_深色') === 'true')

export function 设皮肤(值: boolean) {
  深色.value = 值
  localStorage.setItem('多维记忆_深色', String(值))
}
