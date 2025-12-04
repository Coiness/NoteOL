import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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

export function getTagColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % TAG_COLORS.length
  return TAG_COLORS[index]
}
