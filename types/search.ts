// 搜索相关的类型定义
import { Note } from "./note"

export interface SearchResults {
  title: Note[]
  tags: Note[]
  content: Note[]
  repositories: Note[]
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
  hasMore: boolean
}

export interface NotesResponse {
  notes: Note[]
  pagination: PaginationInfo
}