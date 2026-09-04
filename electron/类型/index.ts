/**
 * 后端 IPC 通信类型定义
 * 所有 IPC 通道名称和参数类型集中管理
 */

// ==================== IPC 通道名称 ====================

/** 获取路径页面 IPC 通道 */
export const IPC通道 = {
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
} as const

// ==================== 请求/响应类型 ====================

/** 扫描单个文件夹请求参数 */
export interface 扫描单个文件夹请求 {
  路径: string
}

/** 文件信息 */
export interface 文件信息 {
  名称: string
  扩展名: string
  完整路径: string
}

/** 扫描单个文件夹响应 */
export interface 扫描单个文件夹响应 {
  成功: boolean
  当前文件夹路径?: string
  文件列表?: 文件信息[]
  子文件夹列表?: string[]
  占位文件夹列表?: string[]
  错误信息?: string
}

/** 排除规则数据（与前端类型同步） */
export interface 排除规则数据 {
  精确文件夹排除列表: string[]
  递归文件夹排除列表: string[]
  精确文件排除列表: string[]
  递归文件排除列表: string[]
  豁免列表: string[]
  通配符列表: string[]
  占位文件夹列表: string[]
}

/** 读取排除规则响应 */
export interface 读取排除规则响应 {
  成功: boolean
  规则?: 排除规则数据
  错误信息?: string
}

/** 保存排除规则请求 */
export interface 保存排除规则请求 {
  项目路径: string
  规则: 排除规则数据
}

/** 保存排除规则响应 */
export interface 保存排除规则响应 {
  成功: boolean
  错误信息?: string
}

/** 规则文件信息 */
export interface 规则文件信息 {
  文件名: string
  文件路径: string
}

/** 列出规则文件响应 */
export interface 列出规则文件响应 {
  成功: boolean
  文件列表?: 规则文件信息[]
  错误信息?: string
}

/** 创建规则文件请求 */
export interface 创建规则文件请求 {
  项目路径: string
  基础名称?: string // 如 "排除规则"，不包含后缀和数字
}

/** 创建规则文件响应 */
export interface 创建规则文件响应 {
  成功: boolean
  文件名?: string
  文件路径?: string
  错误信息?: string
}

/** 删除规则文件请求 */
export interface 删除规则文件请求 {
  项目路径: string
  文件名: string
}

/** 重命名规则文件请求 */
export interface 重命名规则文件请求 {
  项目路径: string
  旧文件名: string
  新文件名: string
}

/** 读取 .mdignore 文件响应 */
export interface 读取Mdignore响应 {
  成功: boolean
  规则?: 排除规则数据
  错误信息?: string
}

/** 保存 .mdignore 文件请求 */
export interface 保存Mdignore请求 {
  项目路径: string
  文件名: string
  规则: 排除规则数据
}

/** 规则存储路径响应 */
export interface 规则存储路径响应 {
  成功: boolean
  项目规则路径?: string
  全局规则路径?: string
  扫描输出路径?: string
  合并规则路径?: string
  合并代码输出路径?: string
  错误信息?: string
}

// ==================== 合并数据类型 ====================

/** 合并配置 */
export interface 合并配置 {
  支持的文件类型: string[]
  输出格式: 'md' | 'txt'
  添加路径注释: boolean
  添加分隔: boolean
}

/** 合并文件请求 */
export interface 合并文件请求 {
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
export interface 合并文件响应 {
  成功: boolean
  输出文件路径?: string
  已合并文件数?: number
  跳过文件数?: number
  跳过文件列表?: string[]
  错误信息?: string
}
