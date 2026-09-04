import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import { 使用主题仓库 } from '@/页面/启动/仓库/主题仓库'
import 默认壁纸URL from '@/assets/background.jpg'

export function 使用主题() {
  const 主题仓库 = 使用主题仓库()
  const { 背景色值, 不透明度, 磨砂强度, 卡片尺寸, 卡片圆角, 卡片间距水平, 卡片间距垂直, 背景模式, 背景纯色, 背景图片URL缓存 } = storeToRefs(主题仓库)

  /**
   * 将主题仓库中的值应用到 :root CSS 变量上
   */
  function 应用主题() {
    const root = document.documentElement

    // 基础变量
    root.style.setProperty('--背景色值', String(背景色值.value))
    root.style.setProperty('--不透明度', String(不透明度.value))
    root.style.setProperty('--磨砂强度', `${磨砂强度.value}px`)

    // 动态计算文字颜色：背景越深（值越接近0），文字越白；背景越浅（值越接近255），文字越黑
    const bgValue = 背景色值.value
    const brightness = 255 - bgValue

    root.style.setProperty('--全站通用文字颜色', `rgb(${brightness}, ${brightness}, ${brightness})`)
    root.style.setProperty('--全站透明文字颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.8)`)
    root.style.setProperty('--弱化文字颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.55)`)
    root.style.setProperty('--滚动条颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.3)`)
    root.style.setProperty('--滚动条悬停颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.4)`)
    root.style.setProperty('--滚动条激活颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.5)`)
    root.style.setProperty('--滑块轨道颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.2)`)
    root.style.setProperty('--滑块圆圈颜色', `rgba(${brightness}, ${brightness}, ${brightness}, 0.85)`)

    // 卡片设置
    root.style.setProperty('--卡片-当前尺寸', `${卡片尺寸.value}px`)
    root.style.setProperty('--卡片-图标尺寸', `${主题仓库.卡片图标尺寸}px`)
    root.style.setProperty('--卡片-圆角', `${卡片圆角.value}px`)
    root.style.setProperty('--卡片-间距-水平', `${卡片间距水平.value}px`)
    root.style.setProperty('--卡片-间距-垂直', `${卡片间距垂直.value}px`)

    // 背景模式
    if (背景模式.value === '纯色') {
      root.style.setProperty('--主布局-背景色', 背景纯色.value)
      root.style.setProperty('--主布局-背景图', 'none')
    } else if (背景图片URL缓存.value) {
      root.style.setProperty('--主布局-背景色', 'transparent')
      root.style.setProperty('--主布局-背景图', `url(${背景图片URL缓存.value})`)
    } else {
      root.style.setProperty('--主布局-背景色', '#0a0a0a')
      root.style.setProperty('--主布局-背景图', `url(${默认壁纸URL})`)
    }
  }

  // 监听变化自动应用（立即执行一次）
  watch([背景色值, 不透明度, 磨砂强度, 卡片尺寸, 卡片圆角, 卡片间距水平, 卡片间距垂直, 背景模式, 背景纯色, 背景图片URL缓存], 应用主题, { immediate: true })

  return { 应用主题 }
}
