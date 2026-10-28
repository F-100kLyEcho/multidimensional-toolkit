/** 拆分场景字符串为主场景 + 辅助标签。第一个为主场景，其余为辅助标签 */
export function 拆分场景(场景: string): { 主: string; 辅: string[] } {
  if (!场景) return { 主: '', 辅: [] }
  const 部分 = 场景.split('，').map((s) => s.trim()).filter(Boolean)
  return { 主: 部分[0] || '', 辅: 部分.slice(1) }
}
