// 笔记相关的类型定义
import { User } from "./user"
import { Repository } from "./repository"

export interface Note {
  id: string
  title: string
  content?: string | null
  createdAt?: string
  updatedAt: string
  tags?: Tag[]
  role?: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
  user?: User
  collaborators?: Collaborator[]
  noteRepositories?: NoteRepository[]
  wordCount?: number
}

export interface Tag {
  id: string
  name: string
  color?: string | null
  userId: string
  createdAt: string
}

export interface Collaborator {
  id: string
  userId: string
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
  user: User
  createdAt: string
}

export interface NoteRepository {
  repository: Repository
  repositoryId: string
  noteId: string
}