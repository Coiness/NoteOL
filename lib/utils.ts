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
