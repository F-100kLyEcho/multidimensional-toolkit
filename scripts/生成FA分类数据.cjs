/**
 * 构建脚本：从 @fortawesome/fontawesome-free 提取分类数据
 * 生成 electron/页面处理/启动/FA分类数据.ts（中文版）
 *
 * 用法：node scripts/生成FA分类数据.cjs
 * 何时重新运行：仅当 FA 版本升级后需重新执行
 */
const fs = require('node:fs')
const path = require('node:path')

const FA_ROOT = path.resolve(__dirname, '../node_modules/@fortawesome/fontawesome-free')
const CATEGORIES_YML = path.join(FA_ROOT, 'metadata/categories.yml')
const SVGS_DIR = path.join(FA_ROOT, 'svgs')
const OUTPUT = path.resolve(__dirname, '../electron/页面处理/启动/FA分类数据.ts')
const 中文映射文件 = path.resolve(__dirname, '图标中文映射.txt')

const 分类名中文 = {
  accessibility: '无障碍',
  alert: '警告',
  alphabet: '字母',
  animals: '动物',
  arrows: '箭头',
  astronomy: '天文',
  automotive: '汽车',
  buildings: '建筑',
  business: '商务',
  camping: '露营',
  charity: '慈善',
  'charts-diagrams': '图表',
  childhood: '童年',
  'clothing-fashion': '服装时尚',
  coding: '编程',
  communication: '通讯',
  connectivity: '连接',
  construction: '建筑工地',
  design: '设计',
  'devices-hardware': '设备硬件',
  'disaster-crisis': '灾难危机',
  disaster: '灾难危机',
  editing: '编辑',
  education: '教育',
  emoji: '表情',
  energy: '能源',
  files: '文件',
  'film-video': '影视',
  'food-beverage': '美食饮品',
  'fruits-vegetables': '果蔬',
  gaming: '游戏',
  genders: '性别',
  gender: '性别',
  halloween: '万圣节',
  hands: '手',
  holidays: '节日',
  household: '家居',
  humanitarian: '人道主义',
  logistics: '物流',
  maps: '地图',
  maritime: '航海',
  marketing: '营销',
  mathematics: '数学',
  'media-playback': '媒体播放',
  'medical-health': '医疗健康',
  money: '金钱',
  moving: '搬家',
  'music-audio': '音乐音频',
  nature: '自然',
  numbers: '数字',
  'photos-images': '照片图片',
  political: '政治',
  'punctuation-symbols': '标点符号',
  religion: '宗教',
  science: '科学',
  'science-fiction': '科幻',
  security: '安全',
  shapes: '形状',
  shopping: '购物',
  social: '社交',
  spinners: '加载',
  'sports-fitness': '运动健身',
  'text-formatting': '文本格式',
  time: '时间',
  toggle: '开关',
  transportation: '交通',
  'travel-hotel': '旅行酒店',
  'users-people': '用户人物',
  weather: '天气',
  writing: '书写',
}

function 加载图标中文映射() {
  const 内容 = fs.readFileSync(中文映射文件, 'utf-8')
  const 映射 = {}
  for (const 行 of 内容.split('\n')) {
    const 匹配 = 行.match(/^'([^']+)':\s*'([^']*)'/)
    if (匹配) 映射[匹配[1]] = 匹配[2]
  }
  return 映射
}

function 解析YAML简单(内容) {
  const 行列表 = 内容.split('\n')
  const 结果 = {}
  let 当前键 = null
  let 当前图标列表 = null
  let 当前标签 = null
  let 在图标列表中 = false

  for (const 行 of 行列表) {
    const 去空行 = 行.trimEnd()
    if (!去空行 || 去空行.startsWith('#')) continue

    if (!行.startsWith(' ') && 去空行.endsWith(':')) {
      if (当前键 && 当前图标列表) {
        结果[当前键] = { icons: 当前图标列表, label: 当前标签 || 当前键 }
      }
      当前键 = 去空行.slice(0, -1)
      当前图标列表 = null
      当前标签 = null
      在图标列表中 = false
      continue
    }

    const 缩进行 = 行.trim()
    if (缩进行.startsWith('icons:')) {
      当前图标列表 = []
      在图标列表中 = true
      continue
    }

    if (缩进行.startsWith('label:')) {
      当前标签 = 缩进行
        .slice(6)
        .trim()
        .replace(/^["']|["']$/g, '')
      在图标列表中 = false
      continue
    }

    if (在图标列表中 && 缩进行.startsWith('- ')) {
      当前图标列表.push(缩进行.slice(2).trim())
    }
  }

  if (当前键 && 当前图标列表) {
    结果[当前键] = { icons: 当前图标列表, label: 当前标签 || 当前键 }
  }

  return 结果
}

function 获取可用图标名集合() {
  const solid = new Set(fs.readdirSync(path.join(SVGS_DIR, 'solid')).map((f) => f.replace('.svg', '')))
  const regular = new Set(fs.readdirSync(path.join(SVGS_DIR, 'regular')).map((f) => f.replace('.svg', '')))
  const brands = new Set(fs.readdirSync(path.join(SVGS_DIR, 'brands')).map((f) => f.replace('.svg', '')))
  return { solid, regular, brands }
}

function 生成分类数据(分类, 可用图标, 图标中文) {
  const 图标列表 = []

  for (const 图标名 of 分类.icons) {
    const 样式 = []
    if (可用图标.solid.has(图标名)) 样式.push('solid')
    if (可用图标.regular.has(图标名)) 样式.push('regular')
    if (可用图标.brands.has(图标名)) 样式.push('brands')

    if (样式.length === 0) continue

    for (const 样 of 样式) {
      const 前缀 = 样 === 'solid' ? 'fas' : 样 === 'regular' ? 'far' : 'fab'
      图标列表.push({
        值: `${前缀} fa-${图标名}`,
        显示名: 图标中文[图标名] || 图标名,
        样式: 样,
      })
    }
  }

  return 图标列表
}

function 主函数() {
  console.log('加载中文映射...')
  const 图标中文 = 加载图标中文映射()
  console.log(`  图标名映射: ${Object.keys(图标中文).length} 个`)

  console.log('读取 categories.yml...')
  const yml内容 = fs.readFileSync(CATEGORIES_YML, 'utf-8')
  const 分类数据 = 解析YAML简单(yml内容)

  console.log('扫描 SVG 目录...')
  const 可用图标 = 获取可用图标名集合()
  console.log(`  Solid: ${可用图标.solid.size}, Regular: ${可用图标.regular.size}, Brands: ${可用图标.brands.size}`)

  const 输出分类列表 = []
  let 总图标数 = 0
  let 未翻译数 = 0

  for (const [分类键, 分类] of Object.entries(分类数据)) {
    const 图标列表 = 生成分类数据(分类, 可用图标, 图标中文)
    if (图标列表.length === 0) continue

    const 分类名 = 分类名中文[分类键] || 分类.label

    for (const 图标 of 图标列表) {
      if (图标.显示名 === 图标.值.split(' fa-')[1]) 未翻译数++
    }

    输出分类列表.push({
      分类键,
      分类名,
      图标数: 图标列表.length,
      图标列表,
    })
    总图标数 += 图标列表.length
  }

  console.log(`共 ${输出分类列表.length} 个分类，${总图标数} 个图标样式`)
  if (未翻译数 > 0) console.log(`  警告: ${未翻译数} 个图标名未翻译`)

  const ts内容 = 生成TS文件(输出分类列表)
  fs.writeFileSync(OUTPUT, ts内容, 'utf-8')
  console.log(`已写入: ${OUTPUT}`)
}

function 生成TS文件(分类列表) {
  const 行 = []
  行.push('/**')
  行.push(' * FA 分类数据（由 scripts/生成FA分类数据.cjs 自动生成）')
  行.push(` * 生成时间: ${new Date().toISOString()}`)
  行.push(` * 分类数: ${分类列表.length}`)
  行.push(` * 图标样式总数: ${分类列表.reduce((s, c) => s + c.图标数, 0)}`)
  行.push(' */')
  行.push('')
  行.push('export interface FA分类图标项 {')
  行.push("  值: string // 'fas fa-star' | 'far fa-star' | 'fab fa-github'")
  行.push('  显示名: string')
  行.push("  样式: 'solid' | 'regular' | 'brands'")
  行.push('}')
  行.push('')
  行.push('export interface FA分类项 {')
  行.push('  分类键: string')
  行.push('  分类名: string')
  行.push('  图标数: number')
  行.push('  图标列表: FA分类图标项[]')
  行.push('}')
  行.push('')
  行.push('export const FA分类数据: FA分类项[] = [')

  for (const 分类 of 分类列表) {
    行.push('  {')
    行.push(`    分类键: '${分类.分类键}',`)
    行.push(`    分类名: '${分类.分类名}',`)
    行.push(`    图标数: ${分类.图标数},`)
    行.push('    图标列表: [')
    for (const 图标 of 分类.图标列表) {
      行.push(`      { 值: '${图标.值}', 显示名: '${图标.显示名}', 样式: '${图标.样式}' },`)
    }
    行.push('    ],')
    行.push('  },')
  }

  行.push(']')
  行.push('')

  return 行.join('\n')
}

主函数()
