/**
 * electronAPI 类型声明
 * 声明 preload.ts 暴露给渲染进程的 API 类型
 */

interface 扫描目录响应 {
  成功: boolean
  文件列表?: string[]
  错误信息?: string
}

interface 排除规则数据 {
  精确文件夹排除列表: string[]
  递归文件夹排除列表: string[]
  精确文件排除列表: string[]
  递归文件排除列表: string[]
  豁免列表: string[]
  通配符列表: string[]
  占位文件夹列表: string[]
}

interface 读取排除规则响应 {
  成功: boolean
  规则?: 排除规则数据
  错误信息?: string
}

interface 保存排除规则响应 {
  成功: boolean
  错误信息?: string
}

interface 全局规则配置 {
  默认排除模式: 'none' | 'node_modules' | 'git' | 'custom'
  最大扫描深度: number
  扫描忽略列表: string[]
  /** 扫描输出文件格式，默认 txt */
  扫描输出格式: 'txt' | 'md'
}

interface 读取全局规则响应 {
  成功: boolean
  规则?: 全局规则配置
  错误信息?: string
}

interface 读取历史记录响应 {
  成功: boolean
  记录列表?: string[]
  错误信息?: string
}

interface 读取上次路径响应 {
  成功: boolean
  路径?: string
  错误信息?: string
}

/** 规则文件信息 */
interface 规则文件信息 {
  文件名: string
  文件路径: string
}

/** 列出规则文件响应 */
interface 列出规则文件响应 {
  成功: boolean
  文件列表?: 规则文件信息[]
  错误信息?: string
}

/** 创建规则文件响应 */
interface 创建规则文件响应 {
  成功: boolean
  文件名?: string
  文件路径?: string
  错误信息?: string
}

/** 读取 .mdignore 文件响应 */
interface 读取Mdignore响应 {
  成功: boolean
  规则?: 排除规则数据
  错误信息?: string
}

// ==================== 合并数据类型 ====================

/** 合并配置 */
interface 合并配置 {
  支持的文件类型: string[]
  输出格式: 'md' | 'txt'
  添加路径注释: boolean
  添加分隔: boolean
}

/** 合并文件请求 */
interface 合并文件请求 {
  项目路径: string
  输出文件名: string
  文件路径列表: string[]
  配置: {
    支持的文件类型: string[]
    添加路径注释: boolean
    添加分隔: boolean
  }
}

/** 合并文件响应 */
interface 合并文件响应 {
  成功: boolean
  输出文件路径?: string
  已合并文件数?: number
  跳过文件数?: number
  跳过文件列表?: string[]
  错误信息?: string
}

// ==================== 扫描单个文件夹类型 ====================

/** 文件信息 */
interface 文件信息 {
  名称: string
  扩展名: string
  完整路径: string
}

/** 扫描单个文件夹响应 */
interface 扫描单个文件夹响应 {
  成功: boolean
  当前文件夹路径?: string
  文件列表?: 文件信息[]
  子文件夹列表?: string[]
  占位文件夹列表?: string[]
  错误信息?: string
}

// ==================== 启动页面类型 ====================

/** 主题数据 */
interface 启动主题数据 {
  版本: string
  最后更新: number
  背景色值: number
  不透明度: number
  磨砂强度: number
  卡片尺寸?: number
  卡片圆角?: number
  卡片间距水平?: number
  卡片间距垂直?: number
  FA图标比例?: number
  Emoji图标比例?: number
  文字图标比例?: number
  标题比例?: number
  背景模式?: '图片' | '纯色'
  背景纯色?: string
  背景纯色历史?: string[]
  壁纸存储位置?: '工作空间' | '全局空间'
  当前壁纸分组索引?: number
  当前壁纸分组内索引?: number
  裁切屏幕宽度?: number
  裁切屏幕高度?: number
}

/** 通用响应 */
interface 启动通用响应 {
  成功: boolean
  错误信息?: string
}

interface ElectronAPI {
  // 文件扫描
  扫描单个文件夹: (路径: string) => Promise<扫描单个文件夹响应>

  // 排除规则
  读取排除规则: (项目路径: string) => Promise<读取排除规则响应>
  保存排除规则: (项目路径: string, 规则: 排除规则数据) => Promise<保存排除规则响应>
  删除排除规则: (项目路径: string) => Promise<保存排除规则响应>

  // 输出文件
  保存输出文件: (项目路径: string, 内容: string) => Promise<保存排除规则响应 & { 文件路径?: string }>

  // 全局规则（配置）
  读取全局规则: () => Promise<读取全局规则响应>
  保存全局规则: (规则: 全局规则配置) => Promise<保存排除规则响应>

  // 全局规则 .mdignore
  读取全局Mdignore: () => Promise<读取Mdignore响应>
  保存全局Mdignore: (规则: 排除规则数据) => Promise<保存排除规则响应>
  追加全局Mdignore: (规则行: string) => Promise<保存排除规则响应>
  删除全局Mdignore行: (规则行: string) => Promise<保存排除规则响应>

  // 历史记录
  读取历史记录: () => Promise<读取历史记录响应>
  添加历史记录: (路径: string) => Promise<保存排除规则响应>
  删除历史记录: (路径: string) => Promise<保存排除规则响应>
  清空历史记录: () => Promise<保存排除规则响应>

  // 上次路径
  读取上次路径: () => Promise<读取上次路径响应>
  保存上次路径: (路径: string) => Promise<保存排除规则响应>

  // 规则文件管理
  列出规则文件: (项目路径: string) => Promise<列出规则文件响应>
  创建规则文件: (项目路径: string, 基础名称?: string) => Promise<创建规则文件响应>
  删除规则文件: (项目路径: string, 文件名: string) => Promise<保存排除规则响应>
  重命名规则文件: (项目路径: string, 旧文件名: string, 新文件名: string) => Promise<保存排除规则响应>
  读取Mdignore: (项目路径: string, 文件名: string) => Promise<读取Mdignore响应>
  保存Mdignore: (项目路径: string, 文件名: string, 规则: 排除规则数据) => Promise<保存排除规则响应>

  // 合并数据
  合并文件: (请求: 合并文件请求) => Promise<合并文件响应>
  读取合并配置: () => Promise<合并配置>
  保存合并配置: (配置: 合并配置) => Promise<void>

  // 窗口管理
  创建独立窗口: (路由路径: string) => Promise<保存排除规则响应>

  // 系统操作
  打开文件夹: (路径: string, 项目路径?: string) => Promise<保存排除规则响应>

  /** 获取规则存储路径（项目规则、全局规则、扫描输出、合并规则、合并代码输出） */
  获取规则存储路径: (项目路径?: string) => Promise<{
    成功: boolean
    项目规则路径?: string
    全局规则路径?: string
    扫描输出路径?: string
    合并规则路径?: string
    合并代码输出路径?: string
    错误信息?: string
  }>

  // 合并规则文件管理
  列出合并规则文件: (项目路径: string) => Promise<列出规则文件响应>
  创建合并规则文件: (项目路径: string, 基础名称?: string) => Promise<创建规则文件响应>
  读取合并规则文件: (项目路径: string, 文件名: string) => Promise<{ 成功: boolean; 路径列表?: string[]; 错误信息?: string }>
  保存合并规则文件: (项目路径: string, 文件名: string, 路径列表: string[]) => Promise<保存排除规则响应>
  删除合并规则文件: (项目路径: string, 文件名: string) => Promise<保存排除规则响应>
  重命名合并规则文件: (项目路径: string, 旧文件名: string, 新文件名: string) => Promise<保存排除规则响应>

  // ==================== 启动页面 ====================

  // ---- 主题 ----
  /** 读取主题参数 */
  启动读取主题: () => Promise<{ 成功: boolean; 主题?: 启动主题数据; 错误信息?: string }>

  /** 保存主题参数 */
  启动保存主题: (主题: 启动主题数据) => Promise<启动通用响应>

  // ---- 背景图片 ----
  /** 保存背景图片到指定分组 */
  启动保存背景图片: (base64内容: string, 分组名?: string, 存储位置?: string) => Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }>

  /** 读取背景图片返回 base64（超大图自动压缩到屏幕分辨率） */
  启动读取背景图片: (文件名: string, 分组名?: string, 存储位置?: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 读取壁纸缩略图（最大宽200px，有磁盘缓存） */
  启动读取壁纸缩略图: (文件名: string, 分组名?: string, 存储位置?: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 删除背景图片 */
  启动删除背景图片: (文件名: string, 分组名?: string, 存储位置?: string) => Promise<启动通用响应>

  /** 列出所有背景图片分组 */
  启动列出背景图片: (存储位置?: string) => Promise<{ 成功: boolean; 分组列表?: Array<{ 名称: string; 文件列表: string[]; 图标代码: string }>; 错误信息?: string }>

  /** 新建壁纸分组 */
  启动新建壁纸分组: (分组名: string, 存储位置?: string) => Promise<启动通用响应>

  /** 删除壁纸分组 */
  启动删除壁纸分组: (分组名: string, 存储位置?: string) => Promise<{ 成功: boolean; 图片数?: number; 错误信息?: string }>

  /** 重命名壁纸分组 */
  启动重命名壁纸分组: (旧名称: string, 新名称: string, 存储位置?: string) => Promise<启动通用响应>

  /** URL 下载背景图片 */
  启动下载背景图片: (url: string, 分组名?: string, 存储位置?: string) => Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }>

  /** 保存壁纸分组图标 */
  启动保存分组图标: (分组名: string, 图标代码: string, 存储位置?: string) => Promise<启动通用响应>

  /** 获取全局壁纸路径 */
  启动获取全局壁纸路径: () => Promise<{ 路径: string; 已设置: boolean }>

  /** 保存全局壁纸路径 */
  启动保存全局壁纸路径: (路径: string) => Promise<启动通用响应>

  /** 裁切壁纸 */
  启动裁切壁纸: (文件名: string, 分组名: string, 存储位置: string, 裁切参数: { x: number; y: number; w: number; h: number }, 保留原图?: boolean) => Promise<{ 成功: boolean; 文件名?: string; 错误信息?: string }>

  // ---- 配置（ID 计数器）----
  /** 读取配置 */
  启动读取配置: () => Promise<{ 成功: boolean; 配置: { 下一级菜单ID: number; 下一级卡片ID: number; 折叠状态: Record<number, boolean>; 是否紧凑: boolean }; 错误信息?: string }>

  /** 保存配置（支持只传部分字段，后端会合并写入） */
  启动保存配置: (配置: { 下一级菜单ID?: number; 下一级卡片ID?: number; 折叠状态?: Record<number, boolean>; 是否紧凑?: boolean }) => Promise<启动通用响应>

  // ---- 菜单结构 ----
  /** 读取菜单结构 */
  启动读取菜单结构: () => Promise<{ 成功: boolean; 菜单结构: { 一级菜单列表: import('@/页面/启动/类型/菜单类型').一级菜单节点[] }; 错误信息?: string }>

  /** 保存菜单结构 */
  启动保存菜单结构: (菜单结构: { 一级菜单列表: import('@/页面/启动/类型/菜单类型').一级菜单节点[] }) => Promise<启动通用响应>

  // ---- 卡片读写 ----
  /** 读取指定二级菜单的卡片列表 */
  启动读取卡片: (归属菜单ID: number) => Promise<{ 成功: boolean; 卡片列表: import('@/页面/启动/类型/菜单类型').卡片节点[]; 错误信息?: string }>

  /** 保存指定二级菜单的卡片列表 */
  启动保存卡片: (归属菜单ID: number, 卡片列表: import('@/页面/启动/类型/菜单类型').卡片节点[]) => Promise<启动通用响应>

  /** 删除指定二级菜单的卡片文件夹（含图片） */
  启动删除卡片文件夹: (归属菜单ID: number) => Promise<启动通用响应>

  /** 列出所有卡片 */
  启动列出所有卡片: () => Promise<{ 成功: boolean; 卡片列表: import('@/页面/启动/类型/菜单类型').卡片节点[]; 错误信息?: string }>

  // ---- 图标提取与缓存管理 ----
  /** 提取程序图标（PE 内嵌解析 + Windows 系统图标并行） */
  启动提取程序图标单方法: (路径: string) => Promise<{
    成功: boolean
    图标列表?: Array<{
      尺寸: string
      临时文件名: string
      像素尺寸: { 宽: number; 高: number }
      来源?: 'pe' | 'system'
    }>
    错误信息?: string
  }>

  /** 获取网页 favicon */
  启动获取网页图标: (url: string) => Promise<{ 成功: boolean; 临时文件名?: string; 错误信息?: string }>

  /** 扫描网页图片（favicon + 网页图片并行）+ 诊断信息 */
  启动扫描网页图片: (url: string) => Promise<{
    成功: boolean
    图标列表?: Array<{
      临时文件名: string
      来源: 'favicon' | 'webpage'
      原始URL: string
      像素尺寸: { 宽: number; 高: number }
      尺寸标注: string
    }>
    诊断信息?: {
      HTML获取状态: number
      HTML长度: number
      各来源命中: Record<string, number>
      候选URL数: number
      下载成功数: number
      下载失败数: number
      最终图标数: number
      错误?: string
    }
    错误信息?: string
  }>

  /** 上传图片到缓存 */
  启动上传图片到缓存: (base64内容: string) => Promise<{ 成功: boolean; 临时文件名?: string; 错误信息?: string }>

  /** 确认保存图标 */
  启动确认保存图标: (临时文件名: string, 归属菜单ID: number, 卡片ID: number) => Promise<{ 成功: boolean; 图片路径?: string; 错误信息?: string }>

  /** 取消图标选择，清空缓存 */
  启动取消图标选择: () => Promise<启动通用响应>

  /** 读取缓存图片返回 base64 */
  启动读取缓存图片: (临时文件名: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 读取卡片图片返回 base64（从卡片目录读取） */
  启动读取卡片图片: (归属菜单ID: number, 图片路径: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 删除卡片图片文件 */
  启动删除卡片图片: (归属菜单ID: number, 图片路径: string) => Promise<启动通用响应>

  // ---- 图片扫描（图标选择弹窗）----
  /** 扫描程序目录图片，返回图标列表 */
  启动扫描程序目录图片: (程序路径: string) => Promise<{
    成功: boolean
    图标列表?: Array<{
      文件名: string
      完整路径: string
      是官方图标: boolean
      尺寸?: { 宽: number; 高: number }
    }>
    错误信息?: string
  }>

  /** 读取本地图片文件返回 base64 */
  启动读取本地图片: (文件路径: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  // ---- 工具 ----
  /** 打开系统文件选择对话框 */
  启动选择文件: (p?: { 标题?: string; 过滤器?: any[] }) => Promise<{ 成功: boolean; 路径?: string; 错误信息?: string }>

  /** 打开系统文件夹选择对话框 */
  启动选择文件夹: (p?: { 标题?: string }) => Promise<{ 成功: boolean; 路径?: string; 错误信息?: string }>

  /** 检测路径是否存在 */
  启动检测路径: (路径: string) => Promise<{ 成功: boolean; 存在: boolean; 类型: 'folder' | 'file' | null; 错误信息?: string }>

  /** 打开卡片（URL/文件夹/文件） */
  启动打开卡片: (类型: string, 值: string) => Promise<启动通用响应>

  // ==================== 通用 IPC ====================

  /** 通用 IPC invoke 方法 */
  __invokeIPC: (通道: string, 参数?: unknown) => Promise<any>

  // ==================== 首页 - 工作空间管理 ====================

  /** 读取工作空间列表 */
  首页读取工作空间列表: () => Promise<{
    成功: boolean
    工作空间列表?: { 名称: string; 路径: string }[]
    当前工作空间名称?: string
    错误信息?: string
  }>

  /** 切换工作空间 */
  首页切换工作空间: (名称: string) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 读取开机自启状态 */
  首页读取开机自启: () => Promise<{ 成功: boolean; 开启?: boolean; 错误信息?: string }>

  /** 设置开机自启 */
  首页设置开机自启: (开启: boolean) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 读取默认启动页 */
  首页读取默认启动页: () => Promise<{ 成功: boolean; 路由?: string; 错误信息?: string }>

  /** 设置默认启动页 */
  首页设置默认启动页: (路由: string) => Promise<{ 成功: boolean; 错误信息?: string }>

  // ==================== 图标库管理 ====================

  /** 读取图标库全部数据 */
  图标库读取数据: () => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 保存图标库全部数据 */
  图标库保存数据: (数据: any) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 添加分组 */
  图标库添加分组: (类别: string, 分组名称: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 删除分组 */
  图标库删除分组: (类别: string, 分组名称: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 重命名分组 */
  图标库重命名分组: (类别: string, 旧名称: string, 新名称: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 添加图标到分组 */
  图标库添加图标: (类别: string, 分组名称: string, 图标: any) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 删除图标 */
  图标库删除图标: (类别: string, 分组名称: string, 图标值: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>
  图标库移动图标: (类别: string, 源分组名: string, 图标值: string, 目标分组名: string, 目标索引: number) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>
  图标库移动分组: (类别: string, 分组名: string, 目标索引: number) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 编辑图标显示名 */
  图标库编辑图标名: (类别: string, 分组名称: string, 图标值: string, 新显示名: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 上传图片到图标库 */
  图标库上传图片: (base64内容: string) => Promise<{ 成功: boolean; 相对路径?: string; 错误信息?: string }>

  /** 下载 URL 图片到图标库 */
  图标库下载图片: (url: string) => Promise<{ 成功: boolean; 相对路径?: string; 错误信息?: string }>

  /** 读取图标库图片返回 base64 */
  图标库读取图片: (相对路径: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 删除图标库图片 */
  图标库删除图片: (相对路径: string) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 覆盖写回图标库图片（裁切结果） */
  图标库写回图片: (相对路径: string, base64内容: string) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 恢复默认分组 */
  图标库恢复默认分组: (类别: string) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 按 FA 分类恢复分组 */
  图标库按分类恢复分组: (分类键列表: string[]) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 获取 FA 分类摘要列表 */
  图标库获取FA分类摘要: () => Promise<{ 成功: boolean; 摘要?: { 分类键: string; 分类名: string; 图标数: number }[]; 错误信息?: string }>

  /** 按 Emoji 分类恢复分组 */
  图标库按Emoji分类恢复分组: (分类键列表: string[]) => Promise<{ 成功: boolean; 数据?: any; 错误信息?: string }>

  /** 获取 Emoji 分类摘要列表 */
  图标库获取Emoji分类摘要: () => Promise<{ 成功: boolean; 摘要?: { 分类键: string; 分类名: string; 图标数: number }[]; 错误信息?: string }>

  // ==================== 图标库缓存管理（网页图标专用） ====================

  /** 下载 URL 图片到图标库缓存 */
  图标库下载图片到缓存: (url: string) => Promise<{ 成功: boolean; 缓存文件名?: string; 错误信息?: string }>

  /** 读取图标库缓存图片返回 base64 */
  图标库读取缓存图片: (缓存文件名: string) => Promise<{ 成功: boolean; base64?: string; 错误信息?: string }>

  /** 确认图标库缓存图片（从缓存移至持久化目录） */
  图标库确认缓存图片: (缓存文件名: string) => Promise<{ 成功: boolean; 相对路径?: string; 错误信息?: string }>

  /** 清空图标库缓存 */
  图标库清理缓存: () => Promise<{ 成功: boolean; 错误信息?: string }>

  // ==================== 图标库扫描与批量清理 ====================

  /** 扫描图标尺寸（所有位图，含是否大图标记） */
  图标库扫描大图标: () => Promise<{
    成功: boolean
    列表?: {
      图标值: string
      显示名: string
      类别: string
      分组名: string
      宽: number
      高: number
      体积: number
      是否大图: boolean
    }[]
    错误信息?: string
  }>

  /** 批量清理图标（按值列表，含物理文件，一次写盘） */
  图标库批量清理图标: (图标值列表: string[]) => Promise<{ 成功: boolean; 数据?: unknown; 错误信息?: string }>

  // ==================== 图标库颜色配置 ====================

  /** 读取图标库颜色配置 */
  图标库读取颜色配置: () => Promise<{
    成功: boolean
    配置?: {
      类别背景颜色: Record<string, string>
      类别透明背景: Record<string, boolean>
      颜色历史: string[]
    }
    错误信息?: string
  }>

  /** 保存图标库颜色配置 */
  图标库保存颜色配置: (配置: { 类别背景颜色: Record<string, string>; 类别透明背景: Record<string, boolean>; 颜色历史: string[] }) => Promise<{ 成功: boolean; 错误信息?: string }>

  /** 运行时设置无边框窗口标题栏叠层（系统按钮符号色/背景色） */
  窗口设置标题栏叠层: (参数: { symbolColor?: string; color?: string }) => Promise<{ 成功: boolean }>

  /** 切换当前窗口 DevTools */
  toggleDevtools: () => void
}

interface Window {
  electronAPI: ElectronAPI
}
