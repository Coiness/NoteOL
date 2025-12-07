export type SiteConfig = {
  name: string
  description: string
  url: string
  ogImage: string
  links: {
    twitter: string
    github: string
  }
}

export interface Note {
  id: string
  title: string
  content?: string | null
  createdAt?: string
  updatedAt: string
  tags?: { id: string; name: string }[]
  role?: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
}

export type ApiResponse<T = any> = {
  success: boolean
  data?: T
  error?: string
  details?: any
}

export interface Repository {
  id: string
  name: string
  description?: string | null
  userId: string
  isDefault: boolean
  color?: string | null
  createdAt: string
  updatedAt: string
}
