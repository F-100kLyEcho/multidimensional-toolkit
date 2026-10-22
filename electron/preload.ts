const { contextBridge, ipcRenderer } = require('electron')

/**
 * 获取路径页面 IPC 通道名称
 * 与后端类型/index.ts 中的 IPC通道 保持同步
 */
const IPC通道 = {
  扫描单个文件夹: 'scan-single-directory',
  读取排除规则: 'read-exclude-rules',
  保存排除规则: 'save-exclude-rules',
  删除排除规则: 'delete-exclude-rules',
  保存输出文件: 'save-output-file',
  读取全局规则: 'read-global-rules',
  保存全局规则: 'save-global-rules',
  读取历史记录: 'read-history',
  添加历史记录: 'add-history',
  删除历史记录: 'delete-history',
  清空历史记录: 'clear-history',
  读取上次路径: 'read-last-path',
  保存上次路径: 'save-last-path',
  // 规则文件管理
  列出规则文件: 'list-rule-files',
  创建规则文件: 'create-rule-file',
  删除规则文件: 'delete-rule-file',
  重命名规则文件: 'rename-rule-file',
  读取Mdignore: 'read-mdignore',
  保存Mdignore: 'save-mdignore',
  // 全局规则 .mdignore 管理
  读取全局Mdignore: 'read-global-mdignore',
  保存全局Mdignore: 'save-global-mdignore',
  追加全局Mdignore: 'append-global-mdignore',
  删除全局Mdignore行: 'remove-global-mdignore',
  // 合并数据
  合并文件: 'merge-files',
  读取合并配置: 'read-merge-config',
  保存合并配置: 'save-merge-config',
  // 合并规则文件管理
  列出合并规则文件: 'list-merge-rule-files',
  创建合并规则文件: 'create-merge-rule-file',
  读取合并规则文件: 'read-merge-rule-file',
  保存合并规则文件: 'save-merge-rule-file',
  删除合并规则文件: 'delete-merge-rule-file',
  重命名合并规则文件: 'rename-merge-rule-file',
  // 系统操作
  打开文件夹: 'open-folder',
  // 规则存储路径
  获取规则存储路径: 'get-rule-storage-paths',
  // 窗口管理
  创建独立窗口: 'create-independent-window',
}

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // ==================== 文件扫描 ====================

  /** 扫描单个文件夹（仅一层），返回文件和子文件夹列表 */
  扫描单个文件夹: (路径: string) => ipcRenderer.invoke(IPC通道.扫描单个文件夹, { 路径 }),

  // ==================== 排除规则 ====================

  /** 读取项目目录下的排除规则 */
  读取排除规则: (项目路径: string) => ipcRenderer.invoke(IPC通道.读取排除规则, 项目路径),

  /** 保存排除规则到项目目录 */
  保存排除规则: (项目路径: string, 规则: unknown) => ipcRenderer.invoke(IPC通道.保存排除规则, { 项目路径, 规则 }),

  /** 删除项目目录下的排除规则文件 */
  删除排除规则: (项目路径: string) => ipcRenderer.invoke(IPC通道.删除排除规则, 项目路径),

  // ==================== 输出文件 ====================

  /** 保存输出文件到项目目录下的 .多维/获取路径信息/输出/获取路径.md */
  保存输出文件: (项目路径: string, 内容: string) => ipcRenderer.invoke(IPC通道.保存输出文件, { 项目路径, 内容 }),

  // ==================== 全局规则（配置） ====================

  /** 读取全局规则配置 */
  读取全局规则: () => ipcRenderer.invoke(IPC通道.读取全局规则),

  /** 保存全局规则配置 */
  保存全局规则: (规则: unknown) => ipcRenderer.invoke(IPC通道.保存全局规则, 规则),

  // ==================== 全局规则 .mdignore ====================

  /** 读取全局 .mdignore 内容并解析为规则数据 */
  读取全局Mdignore: () => ipcRenderer.invoke(IPC通道.读取全局Mdignore),

  /** 保存全局 .mdignore 规则数据 */
  保存全局Mdignore: (规则: unknown) => ipcRenderer.invoke(IPC通道.保存全局Mdignore, 规则),

  /** 向全局 .mdignore 追加一条规则 */
  追加全局Mdignore: (规则行: string) => ipcRenderer.invoke(IPC通道.追加全局Mdignore, 规则行),

  /** 从全局 .mdignore 删除一条规则 */
  删除全局Mdignore行: (规则行: string) => ipcRenderer.invoke(IPC通道.删除全局Mdignore行, 规则行),

  // ==================== 历史记录 ====================

  /** 读取历史记录列表 */
  读取历史记录: () => ipcRenderer.invoke(IPC通道.读取历史记录),

  /** 添加一条历史记录 */
  添加历史记录: (路径: string) => ipcRenderer.invoke(IPC通道.添加历史记录, 路径),

  /** 删除单条历史记录 */
  删除历史记录: (路径: string) => ipcRenderer.invoke(IPC通道.删除历史记录, 路径),

  /** 清空所有历史记录 */
  清空历史记录: () => ipcRenderer.invoke(IPC通道.清空历史记录),

  // ==================== 上次路径 ====================

  /** 读取上次打开的路径 */
  读取上次路径: () => ipcRenderer.invoke(IPC通道.读取上次路径),

  /** 保存上次打开的路径 */
  保存上次路径: (路径: string) => ipcRenderer.invoke(IPC通道.保存上次路径, 路径),

  // ==================== 规则文件管理 ====================

  /** 列出规则目录下所有 .mdignore 文件 */
  列出规则文件: (项目路径: string) => ipcRenderer.invoke(IPC通道.列出规则文件, 项目路径),

  /** 创建新的规则文件（自动处理重名） */
  创建规则文件: (项目路径: string, 基础名称?: string) => ipcRenderer.invoke(IPC通道.创建规则文件, { 项目路径, 基础名称 }),

  /** 删除指定规则文件 */
  删除规则文件: (项目路径: string, 文件名: string) => ipcRenderer.invoke(IPC通道.删除规则文件, { 项目路径, 文件名 }),

  /** 重命名规则文件 */
  重命名规则文件: (项目路径: string, 旧文件名: string, 新文件名: string) => ipcRenderer.invoke(IPC通道.重命名规则文件, { 项目路径, 旧文件名, 新文件名 }),

  /** 读取指定 .mdignore 文件内容并解析为规则数据 */
  读取Mdignore: (项目路径: string, 文件名: string) => ipcRenderer.invoke(IPC通道.读取Mdignore, { 项目路径, 文件名 }),

  /** 将规则数据保存到指定 .mdignore 文件 */
  保存Mdignore: (项目路径: string, 文件名: string, 规则: unknown) => ipcRenderer.invoke(IPC通道.保存Mdignore, { 项目路径, 文件名, 规则 }),

  // ==================== 合并数据 ====================

  /** 合并文件列表并保存 */
  合并文件: (请求: unknown) => ipcRenderer.invoke(IPC通道.合并文件, 请求),

  /** 读取合并配置 */
  读取合并配置: () => ipcRenderer.invoke(IPC通道.读取合并配置),

  /** 保存合并配置 */
  保存合并配置: (配置: unknown) => ipcRenderer.invoke(IPC通道.保存合并配置, 配置),

  // ==================== 合并规则文件管理 ====================

  /** 列出所有合并规则文件 */
  列出合并规则文件: (项目路径: string) => ipcRenderer.invoke(IPC通道.列出合并规则文件, 项目路径),

  /** 创建新的合并规则文件 */
  创建合并规则文件: (项目路径: string, 基础名称?: string) => ipcRenderer.invoke(IPC通道.创建合并规则文件, { 项目路径, 基础名称 }),

  /** 读取合并规则文件内容 */
  读取合并规则文件: (项目路径: string, 文件名: string) => ipcRenderer.invoke(IPC通道.读取合并规则文件, { 项目路径, 文件名 }),

  /** 保存合并规则文件 */
  保存合并规则文件: (项目路径: string, 文件名: string, 路径列表: string[]) => ipcRenderer.invoke(IPC通道.保存合并规则文件, { 项目路径, 文件名, 路径列表 }),

  /** 删除合并规则文件 */
  删除合并规则文件: (项目路径: string, 文件名: string) => ipcRenderer.invoke(IPC通道.删除合并规则文件, { 项目路径, 文件名 }),

  /** 重命名合并规则文件 */
  重命名合并规则文件: (项目路径: string, 旧文件名: string, 新文件名: string) => ipcRenderer.invoke(IPC通道.重命名合并规则文件, { 项目路径, 旧文件名, 新文件名 }),

  // ==================== 窗口管理 ====================

  /** 创建独立窗口加载指定路由 */
  创建独立窗口: (路由路径: string) => ipcRenderer.invoke(IPC通道.创建独立窗口, 路由路径),

  /** 运行时设置无边框窗口标题栏叠层（系统按钮符号色/背景色） */
  窗口设置标题栏叠层: (参数: { symbolColor?: string; color?: string }) => ipcRenderer.invoke('窗口-设置标题栏叠层', 参数),

  // ==================== 系统操作 ====================

  /** 在资源管理器中打开指定文件夹 */
  打开文件夹: (路径: string, 项目路径?: string) => ipcRenderer.invoke(IPC通道.打开文件夹, { 路径, 项目路径 }),

  /** 获取规则存储路径（项目规则、全局规则、扫描输出） */
  获取规则存储路径: (项目路径?: string) => ipcRenderer.invoke(IPC通道.获取规则存储路径, 项目路径),

  // ==================== 启动页面 ====================

  // ---- 主题 ----
  /** 读取主题参数 */
  启动读取主题: () => ipcRenderer.invoke('启动-读取主题'),

  /** 保存主题参数 */
  启动保存主题: (主题: any) => ipcRenderer.invoke('启动-保存主题', { 主题 }),

  // ---- 背景图片 ----
  /** 保存背景图片（base64） */
  启动保存背景图片: (base64内容: string, 分组名?: string, 存储位置?: string) => ipcRenderer.invoke('启动-保存背景图片', { base64内容, 分组名, 存储位置 }),

  /** 读取背景图片返回 base64（超大图自动压缩到屏幕分辨率） */
  启动读取背景图片: (文件名: string, 分组名?: string, 存储位置?: string) => ipcRenderer.invoke('启动-读取背景图片', { 文件名, 分组名, 存储位置 }),

  /** 读取壁纸缩略图（最大宽200px，有磁盘缓存） */
  启动读取壁纸缩略图: (文件名: string, 分组名?: string, 存储位置?: string) => ipcRenderer.invoke('启动-读取壁纸缩略图', { 文件名, 分组名, 存储位置 }),

  /** 删除背景图片 */
  启动删除背景图片: (文件名: string, 分组名?: string, 存储位置?: string) => ipcRenderer.invoke('启动-删除背景图片', { 文件名, 分组名, 存储位置 }),

  /** 列出所有背景图片（含分组） */
  启动列出背景图片: (存储位置?: string) => ipcRenderer.invoke('启动-列出背景图片', { 存储位置 }),

  /** 新建壁纸分组 */
  启动新建壁纸分组: (分组名: string, 存储位置?: string) => ipcRenderer.invoke('启动-新建壁纸分组', { 分组名, 存储位置 }),

  /** 删除壁纸分组 */
  启动删除壁纸分组: (分组名: string, 存储位置?: string) => ipcRenderer.invoke('启动-删除壁纸分组', { 分组名, 存储位置 }),

  /** 重命名壁纸分组 */
  启动重命名壁纸分组: (旧名称: string, 新名称: string, 存储位置?: string) => ipcRenderer.invoke('启动-重命名壁纸分组', { 旧名称, 新名称, 存储位置 }),

  /** 下载 URL 图片到壁纸分组 */
  启动下载背景图片: (url: string, 分组名?: string, 存储位置?: string) => ipcRenderer.invoke('启动-下载背景图片', { url, 分组名, 存储位置 }),

  /** 保存壁纸分组图标 */
  启动保存分组图标: (分组名: string, 图标代码: string, 存储位置?: string) => ipcRenderer.invoke('启动-保存分组图标', { 分组名, 图标代码, 存储位置 }),

  /** 获取全局壁纸路径 */
  启动获取全局壁纸路径: () => ipcRenderer.invoke('启动-获取全局壁纸路径'),

  /** 保存全局壁纸路径 */
  启动保存全局壁纸路径: (路径: string) => ipcRenderer.invoke('启动-保存全局壁纸路径', { 路径 }),

  /** 裁切壁纸 */
  启动裁切壁纸: (文件名: string, 分组名: string, 存储位置: string, 裁切参数: { x: number; y: number; w: number; h: number }, 保留原图?: boolean) => ipcRenderer.invoke('启动-裁切壁纸', { 文件名, 分组名, 存储位置, 裁切参数, 保留原图 }),

  // ---- 配置（ID 计数器）----
  /** 读取配置（自增ID计数器） */
  启动读取配置: () => ipcRenderer.invoke('启动-读取配置'),

  /** 保存配置（支持只传部分字段，后端会合并写入） */
  启动保存配置: (配置: { 下一级菜单ID?: number; 下一级卡片ID?: number; 折叠状态?: Record<number, boolean>; 是否紧凑?: boolean }) => ipcRenderer.invoke('启动-保存配置', { 配置 }),

  // ---- 菜单结构 ----
  /** 读取菜单结构 */
  启动读取菜单结构: () => ipcRenderer.invoke('启动-读取菜单结构'),

  /** 保存菜单结构 */
  启动保存菜单结构: (菜单结构: { 一级菜单列表: any[] }) => ipcRenderer.invoke('启动-保存菜单结构', { 菜单结构 }),

  // ---- 卡片读写 ----
  /** 读取指定二级菜单的卡片列表 */
  启动读取卡片: (归属菜单ID: number) => ipcRenderer.invoke('启动-读取卡片文件', { 归属菜单ID }),

  /** 保存指定二级菜单的卡片列表 */
  启动保存卡片: (归属菜单ID: number, 卡片列表: any[]) => ipcRenderer.invoke('启动-保存卡片文件', { 归属菜单ID, 卡片列表 }),

  /** 删除指定二级菜单的卡片文件夹（含图片） */
  启动删除卡片文件夹: (归属菜单ID: number) => ipcRenderer.invoke('启动-删除卡片文件夹', { 归属菜单ID }),

  /** 列出所有卡片（遍历所有菜单合并） */
  启动列出所有卡片: () => ipcRenderer.invoke('启动-列出所有卡片'),

  // ---- 图标提取与缓存管理 ----
  /** 提取程序图标（PE 解析 + Electron 系统图标降级） */
  启动提取程序图标单方法: (路径: string) => ipcRenderer.invoke('启动-提取程序图标-单方法', { 路径 }),

  /** 获取网页 favicon */
  启动获取网页图标: (url: string) => ipcRenderer.invoke('启动-获取网页图标', { url }),

  /** 扫描网页图片（favicon + 网页图片并行） */
  启动扫描网页图片: (url: string) => ipcRenderer.invoke('启动-扫描网页图片', { url }),

  /** 上传图片到缓存（用户上传本地图片） */
  启动上传图片到缓存: (base64内容: string) => ipcRenderer.invoke('启动-上传图片到缓存', { base64内容 }),

  /** 确认保存图标（从缓存移至卡片目录） */
  启动确认保存图标: (临时文件名: string, 归属菜单ID: number, 卡片ID: number) => ipcRenderer.invoke('启动-确认保存图标', { 临时文件名, 归属菜单ID, 卡片ID }),

  /** 取消图标选择，清空缓存 */
  启动取消图标选择: () => ipcRenderer.invoke('启动-取消图标选择'),

  /** 读取缓存图片返回 base64 */
  启动读取缓存图片: (临时文件名: string) => ipcRenderer.invoke('启动-读取缓存图片', { 临时文件名 }),

  /** 读取卡片图片返回 base64（从卡片目录读取） */
  启动读取卡片图片: (归属菜单ID: number, 图片路径: string) => ipcRenderer.invoke('启动-读取卡片图片', { 归属菜单ID, 图片路径 }),

  /** 删除卡片图片文件 */
  启动删除卡片图片: (归属菜单ID: number, 图片路径: string) => ipcRenderer.invoke('启动-删除卡片图片', { 归属菜单ID, 图片路径 }),

  // ---- 图片扫描（图标选择弹窗）----
  /** 扫描程序目录图片，返回图标列表 */
  启动扫描程序目录图片: (程序路径: string) => ipcRenderer.invoke('启动-扫描程序目录图片', { 程序路径 }),

  /** 读取本地图片文件返回 base64 */
  启动读取本地图片: (文件路径: string) => ipcRenderer.invoke('启动-读取本地图片', { 文件路径 }),

  // ---- 工具 ----
  /** 打开系统文件选择对话框 */
  启动选择文件: (p?: any) => ipcRenderer.invoke('启动-选择文件', p),

  /** 打开系统文件夹选择对话框 */
  启动选择文件夹: (p?: any) => ipcRenderer.invoke('启动-选择文件夹', p),

  /** 检测路径是否存在 */
  启动检测路径: (路径: string) => ipcRenderer.invoke('启动-检测路径', { 路径 }),

  /** 打开卡片（URL/文件夹/文件） */
  启动打开卡片: (类型: string, 值: string) => ipcRenderer.invoke('启动-打开卡片', { 类型, 值 }),

  // ==================== 通用 IPC 调用（供弹窗组件使用）====================

  /** 通用 IPC invoke 方法 */
  __invokeIPC: (通道: string, 参数?: unknown) => ipcRenderer.invoke(通道, 参数),

  // ==================== 首页 - 工作空间管理 ====================

  /** 读取工作空间列表 */
  首页读取工作空间列表: () => ipcRenderer.invoke('首页-读取工作空间列表'),

  /** 切换工作空间 */
  首页切换工作空间: (名称: string) => ipcRenderer.invoke('首页-切换工作空间', { 名称 }),

  /** 读取开机自启状态 */
  首页读取开机自启: () => ipcRenderer.invoke('首页-读取开机自启'),

  /** 设置开机自启 */
  首页设置开机自启: (开启: boolean) => ipcRenderer.invoke('首页-设置开机自启', { 开启 }),

  /** 读取默认启动页 */
  首页读取默认启动页: () => ipcRenderer.invoke('首页-读取默认启动页'),

  /** 设置默认启动页 */
  首页设置默认启动页: (路由: string) => ipcRenderer.invoke('首页-设置默认启动页', { 路由 }),

  // ==================== 图标库管理 ====================

  /** 读取图标库全部数据 */
  图标库读取数据: () => ipcRenderer.invoke('图标库-读取数据'),

  /** 保存图标库全部数据 */
  图标库保存数据: (数据: any) => ipcRenderer.invoke('图标库-保存数据', { 数据 }),

  /** 添加分组 */
  图标库添加分组: (类别: string, 分组名称: string) => ipcRenderer.invoke('图标库-添加分组', { 类别, 分组名称 }),

  /** 删除分组 */
  图标库删除分组: (类别: string, 分组名称: string) => ipcRenderer.invoke('图标库-删除分组', { 类别, 分组名称 }),

  /** 重命名分组 */
  图标库重命名分组: (类别: string, 旧名称: string, 新名称: string) => ipcRenderer.invoke('图标库-重命名分组', { 类别, 旧名称, 新名称 }),

  /** 添加图标到分组 */
  图标库添加图标: (类别: string, 分组名称: string, 图标: any) => ipcRenderer.invoke('图标库-添加图标', { 类别, 分组名称, 图标 }),

  /** 删除图标 */
  图标库删除图标: (类别: string, 分组名称: string, 图标值: string) => ipcRenderer.invoke('图标库-删除图标', { 类别, 分组名称, 图标值 }),

  /** 移动图标（同分组排序 / 跨分组移动） */
  图标库移动图标: (类别: string, 源分组名: string, 图标值: string, 目标分组名: string, 目标索引: number) => ipcRenderer.invoke('图标库-移动图标', { 类别, 源分组名, 图标值, 目标分组名, 目标索引 }),

  /** 移动分组（调整分组顺序） */
  图标库移动分组: (类别: string, 分组名: string, 目标索引: number) => ipcRenderer.invoke('图标库-移动分组', { 类别, 分组名, 目标索引 }),

  /** 编辑图标显示名 */
  图标库编辑图标名: (类别: string, 分组名称: string, 图标值: string, 新显示名: string) => ipcRenderer.invoke('图标库-编辑图标名', { 类别, 分组名称, 图标值, 新显示名 }),

  /** 上传图片到图标库 */
  图标库上传图片: (base64内容: string) => ipcRenderer.invoke('图标库-上传图片', { base64内容 }),

  /** 下载 URL 图片到图标库 */
  图标库下载图片: (url: string) => ipcRenderer.invoke('图标库-下载图片', { url }),

  /** 读取图标库图片返回 base64 */
  图标库读取图片: (相对路径: string) => ipcRenderer.invoke('图标库-读取图片', { 相对路径 }),

  /** 删除图标库图片 */
  图标库删除图片: (相对路径: string) => ipcRenderer.invoke('图标库-删除图片', { 相对路径 }),

  /** 覆盖写回图标库图片（裁切结果） */
  图标库写回图片: (相对路径: string, base64内容: string) => ipcRenderer.invoke('图标库-写回图片', { 相对路径, base64内容 }),

  /** 恢复默认分组 */
  图标库恢复默认分组: (类别: string) => ipcRenderer.invoke('图标库-恢复默认分组', { 类别 }),

  /** 按 FA 分类恢复分组 */
  图标库按分类恢复分组: (分类键列表: string[]) => ipcRenderer.invoke('图标库-按分类恢复分组', { 分类键列表 }),

  /** 获取 FA 分类摘要列表 */
  图标库获取FA分类摘要: () => ipcRenderer.invoke('图标库-获取FA分类摘要'),

  /** 按 Emoji 分类恢复分组 */
  图标库按Emoji分类恢复分组: (分类键列表: string[]) => ipcRenderer.invoke('图标库-按Emoji分类恢复分组', { 分类键列表 }),

  /** 获取 Emoji 分类摘要列表 */
  图标库获取Emoji分类摘要: () => ipcRenderer.invoke('图标库-获取Emoji分类摘要'),

  // ==================== 图标库缓存管理（URL 下载专用） ====================

  /** 下载 URL 图片到图标库缓存 */
  图标库下载图片到缓存: (url: string) => ipcRenderer.invoke('图标库-下载图片到缓存', { url }),

  /** 读取图标库缓存图片返回 base64 */
  图标库读取缓存图片: (缓存文件名: string) => ipcRenderer.invoke('图标库-读取缓存图片', { 缓存文件名 }),

  /** 确认图标库缓存图片（从缓存移至持久化目录） */
  图标库确认缓存图片: (缓存文件名: string) => ipcRenderer.invoke('图标库-确认缓存图片', { 缓存文件名 }),

  /** 清空图标库缓存 */
  图标库清理缓存: () => ipcRenderer.invoke('图标库-清理缓存'),

  /** 扫描大图标（超过阈值的位图） */
  图标库扫描大图标: () => ipcRenderer.invoke('图标库-扫描大图标'),

  /** 批量清理图标（按值列表，含物理文件，一次写盘） */
  图标库批量清理图标: (图标值列表: string[]) => ipcRenderer.invoke('图标库-批量清理图标', { 图标值列表 }),

  // ==================== 图标库颜色配置 ====================

  /** 读取图标库颜色配置 */
  图标库读取颜色配置: () => ipcRenderer.invoke('图标库-读取颜色配置'),

  /** 保存图标库颜色配置 */
  图标库保存颜色配置: (配置: any) => ipcRenderer.invoke('图标库-保存颜色配置', { 配置 }),

  // ==================== 开发工具 ====================

  /** 切换当前窗口 DevTools */
  toggleDevtools: () => ipcRenderer.send('toggle-devtools'),
})
