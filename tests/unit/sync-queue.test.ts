import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { syncQueueManager, SyncOperation } from '@/lib/sync-queue-manager'

// Mock global fetch
global.fetch = vi.fn()

// Mock IndexedDB
const mockTransaction = {
  objectStore: vi.fn(() => ({
    add: vi.fn().mockImplementation(() => {
      const request: any = { onsuccess: null, onerror: null }
      setTimeout(() => request.onsuccess?.(), 0)
      return request
    }),
    getAll: vi.fn().mockImplementation(() => {
      const request: any = { onsuccess: null, onerror: null, result: [] }
      setTimeout(() => request.onsuccess?.(), 0)
      return request
    }),
    delete: vi.fn().mockImplementation(() => {
      const request: any = { onsuccess: null, onerror: null }
      setTimeout(() => request.onsuccess?.(), 0)
      return request
    })
  }))
}

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: {
    contains: vi.fn(() => true)
  }
}

const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => {
    const request: any = { onsuccess: null, onerror: null, result: mockDB }
    setTimeout(() => request.onsuccess?.(), 0)
    return request
  })
}

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB
})

// Mock NoteService dynamic import
vi.mock('@/lib/services/note-service', () => ({
  noteService: {
    syncMetadataSnapshot: vi.fn().mockResolvedValue(undefined)
  }
}))

describe('SyncQueueManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('should enqueue operation and process immediately if online', async () => {
    const processSpy = vi.spyOn(syncQueueManager, 'processQueue')
    
    await syncQueueManager.enqueue({
      type: 'UPDATE',
      noteId: 'test-id',
      payload: { title: 'New Title' }
    })

    expect(mockTransaction.objectStore).toHaveBeenCalledWith('sync_queue')
    expect(processSpy).toHaveBeenCalled()
  })

  it('should enqueue operation but NOT process if offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    const processSpy = vi.spyOn(syncQueueManager, 'processQueue')
    
    await syncQueueManager.enqueue({
      type: 'UPDATE',
      noteId: 'test-id',
      payload: { title: 'New Title' }
    })

    expect(mockTransaction.objectStore).toHaveBeenCalledWith('sync_queue')
    expect(processSpy).not.toHaveBeenCalled()
  })

  it('should process operations in order', async () => {
    // Mock getAll to return queued operations
    const ops: SyncOperation[] = [
      { id: 1, type: 'CREATE', noteId: 'note-1', payload: { title: 'A' }, createdAt: 100, status: 'pending', retryCount: 0 },
      { id: 2, type: 'UPDATE', noteId: 'note-1', payload: { title: 'B' }, createdAt: 200, status: 'pending', retryCount: 0 }
    ]
    
    mockTransaction.objectStore.mockImplementation(() => ({
      add: vi.fn(),
      getAll: vi.fn().mockImplementation(() => {
        const req: any = { onsuccess: null, result: ops }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      }),
      delete: vi.fn().mockImplementation(() => {
        const req: any = { onsuccess: null }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      })
    }))

    // Mock successful fetch responses
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({ ok: true }))

    await syncQueueManager.processQueue()

    // Should call fetch twice
    expect(global.fetch).toHaveBeenCalledTimes(2)
    
    // First call: CREATE (PUT)
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/notes/note-1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ title: 'A' })
    }))

    // Second call: UPDATE (PUT)
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/notes/note-1', expect.objectContaining({
      method: 'PUT',
      body: JSON.stringify({ title: 'B' })
    }))
  })

  it('should handle failed operations gracefully', async () => {
    // Mock failed fetch
    global.fetch = vi.fn().mockImplementation(() => Promise.resolve({ 
      ok: false, 
      statusText: 'Server Error' 
    }))

    const ops: SyncOperation[] = [
      { id: 1, type: 'DELETE', noteId: 'note-1', createdAt: 100, status: 'pending', retryCount: 0 }
    ]

    mockTransaction.objectStore.mockImplementation(() => ({
      add: vi.fn(),
      getAll: vi.fn().mockImplementation(() => {
        const req: any = { onsuccess: null, result: ops }
        setTimeout(() => req.onsuccess?.(), 0)
        return req
      }),
      delete: vi.fn() // Should NOT be called
    }))

    await syncQueueManager.processQueue()

    // Fetch called
    expect(global.fetch).toHaveBeenCalled()
    // Delete from DB NOT called (because it failed)
    expect(mockTransaction.objectStore().delete).not.toHaveBeenCalled()
  })
})
