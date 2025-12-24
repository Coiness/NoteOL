/**
 * 笔记核心数据模型定义
 * 
 * 对应数据库中的 Note、Tag 和 Collaborator 实体。
 */

import { User } from "./user"
import { Repository } from "./repository"

/**
 * 笔记实体
 */
export interface Note {
  id: string
  title: string
  /** 笔记内容 (HTML/JSON 字符串) */
  content?: string | null
  createdAt?: string
  updatedAt: string
  /** 关联的标签列表 */
  tags?: Tag[]
  /** 当前用户对此笔记的权限角色 */
  role?: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
  /** 笔记所有者 */
  user?: User
  /** 协作者列表 */
  collaborators?: Collaborator[]
  /** 所属知识库关联 (多对多关系，但通常 UI 上只显示一个主知识库) */
  noteRepositories?: NoteRepository[]
  /** 字数统计 */
  wordCount?: number
  /** 是否为离线笔记 (前端辅助字段) */
  isOffline?: boolean
}

/**
 * 标签实体
 */
export interface Tag {
  id: string
  name: string
  /** 标签颜色 (Hex 或 Tailwind 类名) */
  color?: string | null
  userId: string
  createdAt: string
}

/**
 * 协作者实体
 */
export interface Collaborator {
  id: string
  userId: string
  /** 协作权限角色 */
  role: "OWNER" | "ADMIN" | "EDITOR" | "VIEWER"
  user: User
  createdAt: string
}

/**
 * 笔记与知识库的关联表
 */
export interface NoteRepository {
  repository: Repository
  repositoryId: string
  noteId: string
}