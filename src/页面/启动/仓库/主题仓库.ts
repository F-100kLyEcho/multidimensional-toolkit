import { defineStore } from 'pinia'
import { ref, watch, computed, reactive } from 'vue'

const 是Electron = typeof window !== 'undefined' && window.electronAPI?.启动读取主题

function 防抖<T extends (...args: any[]) => any>(fn: T, 延迟: number) {
  let 定时器: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (定时器) clearTimeout(定时器)
    定时器 = setTimeout(() => fn(...args), 延迟)
  }
}

export interface 壁纸分组 {
  名称: string
  图片列表: string[]
  图标代码: string
}

export const 使用主题仓库 = defineStore('主题仓库', () => {
  const 存储键 = '主题设置'

  // ===== 毛玻璃主题 =====
  const 背景色值 = ref(parseInt(localStorage.getItem(`${存储键}_背景色值`) || '0'))
  const 不透明度 = ref(parseFloat(localStorage.getItem(`${存储键}_不透明度`) || '0.25'))
  const 磨砂强度 = ref(parseInt(localStorage.getItem(`${存储键}_磨砂强度`) || '12'))

  // ===== 背景模式 =====
  const 背景模式 = ref<'图片' | '纯色'>((localStorage.getItem(`${存储键}_背景模式`) as '图片' | '纯色') || '图片')
  const 背景纯色 = ref(localStorage.getItem(`${存储键}_背景纯色`) || '#1a1a2e')
  const 背景纯色历史 = ref<string[]>([])

  // ===== 壁纸分组 =====
  const 壁纸存储位置 = ref<'工作空间' | '全局空间'>((localStorage.getItem(`${存储键}_壁纸存储位置`) as '工作空间' | '全局空间') || '全局空间')
  const 全局壁纸路径 = ref('')
  const 全局壁纸路径已设置 = ref(false)
  const 壁纸分组列表 = ref<壁纸分组[]>([])
  const 当前壁纸分组索引 = ref(parseInt(localStorage.getItem(`${存储键}_当前壁纸分组索引`) || '0'))
  const 当前壁纸分组内索引 = ref(parseInt(localStorage.getItem(`${存储键}_当前壁纸分组内索引`) || '0'))
  const 裁切屏幕宽度 = ref(parseInt(localStorage.getItem(`${存储键}_裁切屏幕宽度`) || '0') || 0)
  const 裁切屏幕高度 = ref(parseInt(localStorage.getItem(`${存储键}_裁切屏幕高度`) || '0') || 0)
  const 裁切保留原图 = ref(localStorage.getItem(`${存储键}_裁切保留原图`) === 'true')
  const 背景图片URL缓存 = ref<string>('')
  const 背景图片缩略图缓存 = reactive(new Map<string, string>())

  // ===== 卡片设置 =====
  const 卡片尺寸 = ref(parseInt(localStorage.getItem(`${存储键}_卡片尺寸`) || '80'))
  const 卡片圆角 = ref(parseInt(localStorage.getItem(`${存储键}_卡片圆角`) || '4'))
  const 卡片间距水平 = ref(parseInt(localStorage.getItem(`${存储键}_卡片间距水平`) || '20'))
  const 卡片间距垂直 = ref(parseInt(localStorage.getItem(`${存储键}_卡片间距垂直`) || '20'))

  // ===== 图标比例（相对于卡片尺寸的百分比，最终尺寸取正整数偶数） =====
  const FA图标比例 = ref(parseInt(localStorage.getItem(`${存储键}_FA图标比例`) || '36'))
  const Emoji图标比例 = ref(parseInt(localStorage.getItem(`${存储键}_Emoji图标比例`) || '36'))
  const 文字图标比例 = ref(parseInt(localStorage.getItem(`${存储键}_文字图标比例`) || '36'))
  const 标题比例 = ref(parseInt(localStorage.getItem(`${存储键}_标题比例`) || '18'))

  const 卡片圆角最大值 = computed(() => Math.floor(卡片尺寸.value / 2))

  const 卡片图标尺寸 = computed(() => Math.round(卡片尺寸.value * FA图标比例.value / 100 / 2) * 2)
  const Emoji图标尺寸 = computed(() => Math.round(卡片尺寸.value * Emoji图标比例.value / 100 / 2) * 2)
  const 文字图标尺寸 = computed(() => Math.round(卡片尺寸.value * 文字图标比例.value / 100 / 2) * 2)
  const 标题尺寸 = computed(() => Math.round(卡片尺寸.value * 标题比例.value / 100))

  /** 当前壁纸分组 */
  const 当前分组 = computed(() => 壁纸分组列表.value[当前壁纸分组索引.value])

  /** 当前选中壁纸的文件名 */
  const 当前壁纸文件名 = computed(() => 当前分组.value?.图片列表[当前壁纸分组内索引.value] || '')

  /** 从后端加载主题 */
  async function 加载主题() {
    if (是Electron) {
      try {
        const 结果 = await window.electronAPI.启动读取主题()
        if (结果.成功 && 结果.主题) {
          背景色值.value = 结果.主题.背景色值
          不透明度.value = 结果.主题.不透明度
          磨砂强度.value = 结果.主题.磨砂强度
          卡片尺寸.value = 结果.主题.卡片尺寸 ?? 80
          卡片圆角.value = 结果.主题.卡片圆角 ?? 4
          卡片间距水平.value = 结果.主题.卡片间距水平 ?? 20
          卡片间距垂直.value = 结果.主题.卡片间距垂直 ?? 20
          FA图标比例.value = 结果.主题.FA图标比例 ?? 36
          Emoji图标比例.value = 结果.主题.Emoji图标比例 ?? 36
          文字图标比例.value = 结果.主题.文字图标比例 ?? 36
          标题比例.value = 结果.主题.标题比例 ?? 18
          背景模式.value = 结果.主题.背景模式 ?? '图片'
          背景纯色.value = 结果.主题.背景纯色 ?? '#1a1a2e'
          背景纯色历史.value = Array.isArray(结果.主题.背景纯色历史) ? 结果.主题.背景纯色历史 : []
          壁纸存储位置.value = 结果.主题.壁纸存储位置 ?? '全局空间'
          当前壁纸分组索引.value = 结果.主题.当前壁纸分组索引 ?? 0
          当前壁纸分组内索引.value = 结果.主题.当前壁纸分组内索引 ?? 0
          裁切屏幕宽度.value = 结果.主题.裁切屏幕宽度 ?? 0
          裁切屏幕高度.value = 结果.主题.裁切屏幕高度 ?? 0
          await 加载全局壁纸路径()
          if (壁纸存储位置.value === '全局空间' && !全局壁纸路径已设置.value) {
            壁纸存储位置.value = '工作空间'
          }
          加载壁纸分组列表()
          return
        }
      } catch (e) {
        console.error('读取主题失败', e)
      }
    }
  }

  const 保存到后端 = 防抖(async () => {
    if (!是Electron) return
    try {
      await window.electronAPI.启动保存主题({
        版本: '1.0',
        最后更新: Date.now(),
        背景色值: 背景色值.value,
        不透明度: 不透明度.value,
        磨砂强度: 磨砂强度.value,
        卡片尺寸: 卡片尺寸.value,
        卡片圆角: 卡片圆角.value,
        卡片间距水平: 卡片间距水平.value,
        卡片间距垂直: 卡片间距垂直.value,
        FA图标比例: FA图标比例.value,
        Emoji图标比例: Emoji图标比例.value,
        文字图标比例: 文字图标比例.value,
        标题比例: 标题比例.value,
        背景模式: 背景模式.value,
        背景纯色: 背景纯色.value,
        背景纯色历史: [...背景纯色历史.value],
        壁纸存储位置: 壁纸存储位置.value,
        当前壁纸分组索引: 当前壁纸分组索引.value,
        当前壁纸分组内索引: 当前壁纸分组内索引.value,
        裁切屏幕宽度: 裁切屏幕宽度.value,
        裁切屏幕高度: 裁切屏幕高度.value,
      })
    } catch (e) {
      console.error('保存主题失败', e)
    }
  }, 500)

  function 保存到本地() {
    localStorage.setItem(`${存储键}_背景色值`, String(背景色值.value))
    localStorage.setItem(`${存储键}_不透明度`, String(不透明度.value))
    localStorage.setItem(`${存储键}_磨砂强度`, String(磨砂强度.value))
    localStorage.setItem(`${存储键}_卡片尺寸`, String(卡片尺寸.value))
    localStorage.setItem(`${存储键}_卡片圆角`, String(卡片圆角.value))
    localStorage.setItem(`${存储键}_卡片间距水平`, String(卡片间距水平.value))
    localStorage.setItem(`${存储键}_卡片间距垂直`, String(卡片间距垂直.value))
    localStorage.setItem(`${存储键}_FA图标比例`, String(FA图标比例.value))
    localStorage.setItem(`${存储键}_Emoji图标比例`, String(Emoji图标比例.value))
    localStorage.setItem(`${存储键}_文字图标比例`, String(文字图标比例.value))
    localStorage.setItem(`${存储键}_标题比例`, String(标题比例.value))
    localStorage.setItem(`${存储键}_背景模式`, 背景模式.value)
    localStorage.setItem(`${存储键}_背景纯色`, 背景纯色.value)
    localStorage.setItem(`${存储键}_背景纯色历史`, JSON.stringify(背景纯色历史.value))
    localStorage.setItem(`${存储键}_当前壁纸分组索引`, String(当前壁纸分组索引.value))
    localStorage.setItem(`${存储键}_当前壁纸分组内索引`, String(当前壁纸分组内索引.value))
    localStorage.setItem(`${存储键}_壁纸存储位置`, 壁纸存储位置.value)
    localStorage.setItem(`${存储键}_裁切屏幕宽度`, String(裁切屏幕宽度.value))
    localStorage.setItem(`${存储键}_裁切屏幕高度`, String(裁切屏幕高度.value))
    localStorage.setItem(`${存储键}_裁切保留原图`, String(裁切保留原图.value))
  }

  watch([背景色值, 不透明度, 磨砂强度, 卡片尺寸, 卡片圆角, 卡片间距水平, 卡片间距垂直, FA图标比例, Emoji图标比例, 文字图标比例, 标题比例, 背景模式, 背景纯色, 背景纯色历史, 当前壁纸分组索引, 当前壁纸分组内索引, 壁纸存储位置, 裁切屏幕宽度, 裁切屏幕高度], () => {
    保存到本地()
    保存到后端()
  })

  watch(壁纸存储位置, async () => {
    if (壁纸存储位置.value === '全局空间') {
      await 加载全局壁纸路径()
      if (!全局壁纸路径已设置.value) return
    }
    壁纸分组列表.value = []
    背景图片缩略图缓存.clear()
    当前壁纸分组索引.value = 0
    当前壁纸分组内索引.value = 0
    加载壁纸分组列表()
  })

  function 限制圆角() {
    if (卡片圆角.value > 卡片圆角最大值.value) {
      卡片圆角.value = 卡片圆角最大值.value
    }
  }

  watch(卡片尺寸, () => {
    限制圆角()
  })

  // ===== 壁纸分组操作 =====

  /** 加载全局壁纸路径 */
  async function 加载全局壁纸路径() {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动获取全局壁纸路径()
      全局壁纸路径.value = 结果.路径
      全局壁纸路径已设置.value = 结果.已设置
    } catch {
      // 静默
    }
  }

  /** 设置全局壁纸路径 */
  async function 设置全局壁纸路径(路径: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动保存全局壁纸路径(路径)
      if (结果.成功) {
        全局壁纸路径.value = 路径
        全局壁纸路径已设置.value = true
      }
    } catch {
      // 静默
    }
  }

  /** 从后端加载壁纸分组列表 */
  async function 加载壁纸分组列表() {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动列出背景图片(壁纸存储位置.value)
      if (结果.成功 && 结果.分组列表) {
        const 旧分组名 = 当前分组.value?.名称
        const 旧文件名 = 当前分组.value?.图片列表[当前壁纸分组内索引.value]
        壁纸分组列表.value = 结果.分组列表.map((分组) => ({ 名称: 分组.名称, 图片列表: 分组.文件列表, 图标代码: 分组.图标代码 || '' }))
        if (旧分组名 && 旧文件名) {
          const 新分组索引 = 壁纸分组列表.value.findIndex((g) => g.名称 === 旧分组名)
          if (新分组索引 >= 0) {
            当前壁纸分组索引.value = 新分组索引
            const 新组内索引 = 壁纸分组列表.value[新分组索引]!.图片列表.indexOf(旧文件名)
            当前壁纸分组内索引.value = 新组内索引 >= 0 ? 新组内索引 : 0
          } else {
            当前壁纸分组索引.value = 0
            当前壁纸分组内索引.value = 0
          }
        } else {
          if (当前壁纸分组索引.value >= 壁纸分组列表.value.length) {
            当前壁纸分组索引.value = 0
          }
          if (当前分组.value && 当前壁纸分组内索引.value >= 当前分组.value.图片列表.length) {
            当前壁纸分组内索引.value = 0
          }
        }
        加载当前背景图片URL()
        加载所有缩略图()
      }
    } catch (e) {
      console.error('加载壁纸分组列表失败', e)
    }
  }

  /** 加载所有分组的缩略图 */
  async function 加载所有缩略图() {
    if (!是Electron) return
    const 前缀 = 壁纸存储位置.value
    for (const 分组 of 壁纸分组列表.value) {
      for (const 文件名 of 分组.图片列表) {
        const 缓存键 = `${前缀}/${分组.名称}/${文件名}`
        if (!背景图片缩略图缓存.has(缓存键)) {
          try {
            const 结果 = await window.electronAPI.启动读取壁纸缩略图(文件名, 分组.名称, 壁纸存储位置.value)
            if (结果.成功 && 结果.base64) {
              背景图片缩略图缓存.set(缓存键, 结果.base64)
            }
          } catch {
            /* 静默 */
          }
        }
      }
    }
  }

  /** 加载当前选中壁纸的 URL */
  async function 加载当前背景图片URL() {
    if (!是Electron || !当前分组.value || 当前分组.value.图片列表.length === 0) {
      背景图片URL缓存.value = ''
      return
    }
    const 文件名 = 当前分组.value.图片列表[当前壁纸分组内索引.value]
    if (!文件名) {
      背景图片URL缓存.value = ''
      return
    }
    await 加载指定壁纸URL(文件名, 当前分组.value.名称)
  }

  /** 加载指定壁纸的压缩全尺寸图 URL */
  async function 加载指定壁纸URL(文件名: string, 分组名: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动读取背景图片(文件名, 分组名, 壁纸存储位置.value)
      if (结果.成功 && 结果.base64) {
        背景图片URL缓存.value = 结果.base64
      } else {
        背景图片URL缓存.value = ''
      }
    } catch (e) {
      console.error('读取背景图片失败', e)
      背景图片URL缓存.value = ''
    }
  }

  /** 上传背景图片到指定分组 */
  async function 上传背景图片(base64内容: string, 分组名?: string) {
    if (!是Electron) return
    const 目标分组名 = 分组名 || 当前分组.value?.名称 || '默认'
    try {
      const 结果 = await window.electronAPI.启动保存背景图片(base64内容, 目标分组名, 壁纸存储位置.value)
      if (结果.成功 && 结果.文件名) {
        await 加载壁纸分组列表()
      } else {
        console.error('上传背景图片失败:', 结果.错误信息 || '未知错误')
      }
    } catch (e) {
      console.error('上传背景图片异常', e)
    }
  }

  /** 删除指定分组的指定图片 */
  async function 删除背景图片(文件名: string, 分组名: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动删除背景图片(文件名, 分组名, 壁纸存储位置.value)
      if (结果.成功) {
        背景图片缩略图缓存.delete(`${壁纸存储位置.value}/${分组名}/${文件名}`)
        await 加载壁纸分组列表()
        加载当前背景图片URL()
      }
    } catch (e) {
      console.error('删除背景图片失败', e)
    }
  }

  /** 批量删除图片 */
  async function 批量删除背景图片(文件名列表: string[], 分组名: string) {
    if (!是Electron) return
    for (const 文件名 of 文件名列表) {
      try {
        await window.electronAPI.启动删除背景图片(文件名, 分组名, 壁纸存储位置.value)
        背景图片缩略图缓存.delete(`${壁纸存储位置.value}/${分组名}/${文件名}`)
      } catch {
        /* 静默 */
      }
    }
    await 加载壁纸分组列表()
    加载当前背景图片URL()
  }

  /** 新建壁纸分组 */
  async function 新建壁纸分组(分组名: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动新建壁纸分组(分组名, 壁纸存储位置.value)
      if (结果.成功) {
        await 加载壁纸分组列表()
      }
    } catch (e) {
      console.error('新建壁纸分组失败', e)
    }
    return null
  }

  /** 删除壁纸分组 */
  async function 删除壁纸分组(分组名: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动删除壁纸分组(分组名, 壁纸存储位置.value)
      if (结果.成功) {
        await 加载壁纸分组列表()
      }
      return 结果
    } catch (e) {
      console.error('删除壁纸分组失败', e)
      return { 成功: false, 错误信息: String(e) }
    }
  }

  /** 重命名壁纸分组 */
  async function 重命名壁纸分组(旧名称: string, 新名称: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动重命名壁纸分组(旧名称, 新名称, 壁纸存储位置.value)
      if (结果.成功) {
        await 加载壁纸分组列表()
      }
      return 结果
    } catch (e) {
      console.error('重命名壁纸分组失败', e)
      return { 成功: false, 错误信息: String(e) }
    }
  }

  /** URL 下载背景图片 */
  async function 下载背景图片(url: string, 分组名?: string) {
    if (!是Electron) return
    const 目标分组名 = 分组名 || 当前分组.value?.名称 || '默认'
    try {
      const 结果 = await window.electronAPI.启动下载背景图片(url, 目标分组名, 壁纸存储位置.value)
      if (结果.成功) {
        await 加载壁纸分组列表()
      }
      return 结果
    } catch (e) {
      console.error('下载背景图片失败', e)
      return { 成功: false, 错误信息: String(e) }
    }
  }

  /** 保存壁纸分组图标 */
  async function 保存分组图标(分组名: string, 图标代码: string) {
    if (!是Electron) return
    try {
      const 结果 = await window.electronAPI.启动保存分组图标(分组名, 图标代码, 壁纸存储位置.value)
      if (结果.成功) {
        const 分组 = 壁纸分组列表.value.find((g) => g.名称 === 分组名)
        if (分组) 分组.图标代码 = 图标代码
      }
      return 结果
    } catch (e) {
      console.error('保存分组图标失败', e)
      return { 成功: false, 错误信息: String(e) }
    }
  }

  /** 选中壁纸（设置分组索引+组内索引） */
  function 选中壁纸(分组索引: number, 组内索引: number) {
    当前壁纸分组索引.value = 分组索引
    当前壁纸分组内索引.value = 组内索引
    加载当前背景图片URL()
  }

  function 重置为默认() {
    背景色值.value = 0
    不透明度.value = 0.25
    磨砂强度.value = 12
    卡片尺寸.value = 80
    卡片圆角.value = 4
    卡片间距水平.value = 20
    卡片间距垂直.value = 20
    背景模式.value = '图片'
    背景纯色.value = '#1a1a2e'
    当前壁纸分组索引.value = 0
    当前壁纸分组内索引.value = 0
  }

  加载主题()

  return {
    背景色值,
    不透明度,
    磨砂强度,
    背景模式,
    背景纯色,
    背景纯色历史,
    壁纸存储位置,
    全局壁纸路径,
    全局壁纸路径已设置,
    壁纸分组列表,
    当前壁纸分组索引,
    当前壁纸分组内索引,
    裁切屏幕宽度,
    裁切屏幕高度,
    裁切保留原图,
    当前分组,
    当前壁纸文件名,
    背景图片URL缓存,
    背景图片缩略图缓存,
    卡片尺寸,
    卡片图标尺寸,
    Emoji图标尺寸,
    文字图标尺寸,
    标题尺寸,
    FA图标比例,
    Emoji图标比例,
    文字图标比例,
    标题比例,
    卡片圆角,
    卡片间距水平,
    卡片间距垂直,
    卡片圆角最大值,
    加载主题,
    限制圆角,
    重置为默认,
    加载壁纸分组列表,
    加载当前背景图片URL,
    加载指定壁纸URL,
    加载所有缩略图,
    上传背景图片,
    删除背景图片,
    批量删除背景图片,
    新建壁纸分组,
    删除壁纸分组,
    重命名壁纸分组,
    下载背景图片,
    保存分组图标,
    加载全局壁纸路径,
    设置全局壁纸路径,
    选中壁纸,
  }
})
