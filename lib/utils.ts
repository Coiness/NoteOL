import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * 合并 Tailwind CSS 类名
 * 
 * 结合了 clsx (处理条件类名) 和 tailwind-merge (处理类名冲突) 的功能。
 * 确保覆盖样式（如 p-4）能正确覆盖默认样式（如 p-2）。
 * 
 * @param {...ClassValue[]} inputs - 类名列表或条件对象
 * @returns {string} - 合并后的类名字符串
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 移除 HTML 标签，仅保留纯文本
 * 
 * 常用于生成预览文本或计算纯文本长度。
 * 
 * @param {string} html - 包含 HTML 标签的字符串
 * @returns {string} - 纯文本字符串
 */
export function stripHtml(html: string) {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "")
}

export class FetchError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * 通用 Fetch 包装器
 * 
 * 封装了 fetch API，自动处理 JSON 解析和错误抛出。
 * 
 * @template T - 期望的响应数据类型
 * @param {string} url - 请求地址
 * @param {RequestInit} [options] - fetch 选项
 * @returns {Promise<T>} - 响应数据
 * @throws {FetchError} - 当响应状态码不为 2xx 时抛出
 */
export async function fetcher<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    if (res.status === 401) {
        throw new FetchError("Unauthorized", 401)
    }
    throw new FetchError("An error occurred while fetching the data.", res.status)
  }
  return res.json()
}

// 预定义标签颜色
const TAG_COLORS = ['blue', 'green', 'orange', 'pink', 'purple', 'yellow'] as const

/**
 * 根据字符串生成确定性的颜色名称
 * 
 * 简单的哈希算法，确保同一个标签名称总是返回相同的颜色。
 * 
 * @param {string} name - 标签名称
 * @returns {string} - 预定义的颜色名称
 */
export function getTagColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % TAG_COLORS.length
  return TAG_COLORS[index]
}
