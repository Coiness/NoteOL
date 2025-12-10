// 离线操作相关的类型定义
export interface OfflineNote {
  id: string           // 本地生成的临时ID (local_timestamp_random)
  title: string
  content?: string
  tags: string[]
  repositoryId?: string
  createdAt: Date
  updatedAt: Date
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  yDocState?: string   // Y.js 文档的二进制状态
  serverId?: string    // 同步成功后的服务器ID
}

export interface OfflineOperation {
  id: string
  type: 'create_note' | 'update_note' | 'delete_note'
  data: any
  timestamp: Date
  retryCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

export interface SyncResult {
  success: boolean
  operationId: string
  serverId?: string
  error?: string
}