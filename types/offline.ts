export interface NoteIndexEntry {
  id: string
  title: string
  preview: string
  tags: string[]
  repositoryId?: string
  createdAt: Date
  updatedAt: Date
  status: 'pending' | 'synced' // Simple status
}

// Deprecated types (kept for reference if needed, but should be removed eventually)
// export interface OfflineNote { ... }
// export interface OfflineOperation { ... }
// export interface SyncResult { ... }