/**
 * 首页 IPC 处理器
 * 注册所有首页相关的 IPC handler：工作空间管理、开机自启、默认启动页
 */
import { ipcMain, dialog } from 'electron'
import { 获取工作空间列表, 新建工作空间, 复制工作空间, 重命名工作空间, 删除工作空间, 切换工作空间, 打开文件夹, 打开文件所在目录, 获取配置文件完整路径, 设置开机自启, 读取开机自启状态, 设置默认启动页, 读取默认启动页 } from '../../工具/路径配置'

export function 注册首页处理器(): void {
  // ==================== 工作空间列表 ====================

  ipcMain.handle('首页-读取工作空间列表', async () => {
    try {
      return 获取工作空间列表()
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 新建工作空间 ====================

  ipcMain.handle('首页-新建工作空间', async (_e, p: { 名称: string; 路径: string }) => {
    try {
      const { 名称, 路径 } = p
      if (!名称 || !路径) {
        return { 成功: false, 错误信息: '名称和路径不能为空' }
      }
      const 结果 = 新建工作空间(名称, 路径)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 复制工作空间 ====================

  ipcMain.handle('首页-复制工作空间', async (_e, p: { 源名称: string; 新名称: string; 新路径: string }) => {
    try {
      const { 源名称, 新名称, 新路径 } = p
      if (!源名称 || !新名称 || !新路径) {
        return { 成功: false, 错误信息: '参数不完整' }
      }
      const 结果 = 复制工作空间(源名称, 新名称, 新路径)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 重命名工作空间 ====================

  ipcMain.handle('首页-重命名工作空间', async (_e, p: { 旧名称: string; 新名称: string }) => {
    try {
      const { 旧名称, 新名称 } = p
      if (!旧名称 || !新名称) {
        return { 成功: false, 错误信息: '名称不能为空' }
      }
      if (旧名称 === 新名称) {
        return { 成功: true }
      }
      const 结果 = 重命名工作空间(旧名称, 新名称)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 删除工作空间 ====================

  ipcMain.handle('首页-删除工作空间', async (_e, p: { 名称: string }) => {
    try {
      const { 名称 } = p
      if (!名称) {
        return { 成功: false, 错误信息: '名称不能为空' }
      }
      const 结果 = 删除工作空间(名称)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 切换工作空间 ====================

  ipcMain.handle('首页-切换工作空间', async (_e, p: { 名称: string }) => {
    try {
      const { 名称 } = p
      if (!名称) {
        return { 成功: false, 错误信息: '名称不能为空' }
      }
      // 切换工作空间会触发 app.relaunch() + app.exit()
      // 不会返回响应给前端
      const 结果 = 切换工作空间(名称)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 打开文件夹 ====================

  ipcMain.handle('首页-打开文件夹', async (_e, p: { 路径: string }) => {
    try {
      const { 路径 } = p
      if (!路径) {
        return { 成功: false, 错误信息: '路径不能为空' }
      }
      return 打开文件夹(路径)
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('首页-打开文件所在目录', async (_e, p: { 文件路径: string }) => {
    try {
      const { 文件路径 } = p
      if (!文件路径) {
        return { 成功: false, 错误信息: '路径不能为空' }
      }
      return 打开文件所在目录(文件路径)
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 选择目录 ====================

  ipcMain.handle('首页-选择目录', async (_e, p: { 标题?: string }) => {
    try {
      const r = await dialog.showOpenDialog({
        title: p?.标题 || '选择目录',
        properties: ['openDirectory'],
      })
      if (r.canceled) {
        return { 成功: false, 路径: '' }
      }
      return { 成功: true, 路径: r.filePaths[0] }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 开机自启 ====================

  ipcMain.handle('首页-设置开机自启', async (_e, p: { 开启: boolean }) => {
    try {
      const 结果 = 设置开机自启(p.开启)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('首页-读取开机自启', async () => {
    try {
      const 开启 = 读取开机自启状态()
      return { 成功: true, 开启 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 默认启动页 ====================

  ipcMain.handle('首页-设置默认启动页', async (_e, p: { 路由: string }) => {
    try {
      const 结果 = 设置默认启动页(p.路由)
      return 结果
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  ipcMain.handle('首页-读取默认启动页', async () => {
    try {
      const 路由 = 读取默认启动页()
      return { 成功: true, 路由 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })

  // ==================== 配置文件路径 ====================

  ipcMain.handle('首页-获取配置文件路径', async () => {
    try {
      const 路径 = 获取配置文件完整路径()
      return { 成功: true, 路径 }
    } catch (e) {
      return { 成功: false, 错误信息: String(e) }
    }
  })
}
