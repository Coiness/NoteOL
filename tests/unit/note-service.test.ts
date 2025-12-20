import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NoteService } from '@/lib/services/note-service'
import { offlineManager } from '@/lib/offline-manager'
import { Note } from '@/types/note'
import { OfflineNote } from '@/types/offline'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

// Mock dependencies
// 准备返回的数据
vi.mock('@/lib/offline-manager', () => ({
  // A: vi 是 Vitest 的工具对象，用于创建模拟(Mock)、监视(Spy)和控制测试环境。
  // 这里我们告诉测试系统：不要用真的 offlineManager，用下面这个假的代替。
  offlineManager: {
    getOfflineNotes: vi.fn(),
    getOfflineNote: vi.fn(),
    createOfflineNote: vi.fn(),
    updateOfflineNote: vi.fn(),
    saveOfflineNote: vi.fn(),
    syncPendingOperations: vi.fn(),
  }
}))

// Mock navigator
// 准备伪造环境
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true
  },
  writable: true
})

// 测试NoteService部分
describe('NoteService', () => {
  let service: NoteService

  // A: beforeEach 是生命周期钩子，会在每个测试用例(it/test)运行前执行。
  // 确保每个测试都从一个干净的状态开始（重置 Mock 计数器、重置服务实例等）。
  beforeEach(() => {
    vi.clearAllMocks()
    service = new NoteService()
    // Default online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
  })

  // PartA：离线读取
  describe('Scenario A: Offline Read', () => {
    it('should return data from IndexedDB when offline without error', async () => {
      // Setup mock data
      const mockOfflineNotes: OfflineNote[] = [
        {
          id: 'local_1',
          title: 'Offline Note 1',
          content: 'Content 1',
          tags: ['tag1'],
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          status: 'pending'
        }
      ]
      
      // Mock implementation
      // A: vi.mocked 用于获取 Mock 函数的类型提示。
      // .mockResolvedValue 设定了“假行为”：当 getOfflineNotes 被调用时，
      // 不要查数据库，直接返回我们准备好的 mockOfflineNotes 数据。
      vi.mocked(offlineManager.getOfflineNotes).mockResolvedValue(mockOfflineNotes)
      // 模拟离线
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })

      // 调用 NoteService 的 getNotes 方法
      const notes = await service.getNotes()

      // 检查结果是否符合预期
      // A: 这是一个断言(Assertion)。我们要验证 noteService 是否真的去调用了 offlineManager。
      // toHaveBeenCalledTimes(1) 意思是“必须恰好被调用了1次”，多了少了都算错。
      expect(offlineManager.getOfflineNotes).toHaveBeenCalledTimes(1)
      // 是否拿到了一条数据
      expect(notes).toHaveLength(1)
      // 检查数据id是否正确
      expect(notes[0].id).toBe('local_1')
    })
  })

  // 在线同步
  describe('Scenario B: Online Sync', () => {
    it('should return IDB data first, then trigger API sync', async () => {
      // 1.设题：
      //   本地有一条旧数据 ”Old Title“
      //   服务器有一条新数据 ”New Title“（通过 MSW 模拟）
      const mockOfflineNotes: OfflineNote[] = [
        {
          id: 'server_1',
          title: 'Old Title',
          content: 'Old Content',
          tags: [],
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
          status: 'synced',
          serverId: 'server_1'
        }
      ]
      vi.mocked(offlineManager.getOfflineNotes).mockResolvedValue(mockOfflineNotes)
      vi.mocked(offlineManager.getOfflineNote).mockResolvedValue(mockOfflineNotes[0])

      // 2. 设置模拟API的数据
      const mockServerNotes = [
        {
          id: 'server_1',
          title: 'New Title',
          content: 'New Content',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z', // Newer
          tags: [],
          noteRepositories: []
        }
      ]

      server.use(
        http.get('/api/notes', () => {
          return HttpResponse.json({ data: mockServerNotes })
        })
      )

      // 3. 调用服务器方法
      const notes = await service.getNotes()

      // 4. Assert IDB data is returned immediately
      expect(notes[0].title).toBe('Old Title')

      // 5. 等待一段时间，因为这个操作是后台运行的
      await new Promise(resolve => setTimeout(resolve, 100))

      // 6. 判断是不是存到本地了
      expect(offlineManager.saveOfflineNote).toHaveBeenCalledWith(expect.objectContaining({
        id: 'server_1',
        title: 'New Title',
        updatedAt: new Date('2023-01-02T00:00:00Z')
      }))
    })
  })

  // 离线创建
  describe('Scenario C: Offline Create', () => {
    it('should write to IDB via OfflineManager when creating note', async () => {
      const newNoteInput: Partial<Note> = {
        title: 'New Offline Note',
        content: 'New Content',
        tags: [{ id: 't1', name: 'idea', userId: 'u1', createdAt: '' }]
      }

      const mockCreatedNote: OfflineNote = {
        id: 'local_new_1',
        title: 'New Offline Note',
        content: 'New Content',
        tags: ['idea'],
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'pending'
      }

      vi.mocked(offlineManager.createOfflineNote).mockResolvedValue(mockCreatedNote)

      const result = await service.createNote(newNoteInput)

      expect(offlineManager.createOfflineNote).toHaveBeenCalledWith({
        title: 'New Offline Note',
        content: 'New Content',
        tags: ['idea'],
        repositoryId: undefined
      })

      expect(result.id).toBe('local_new_1')
      expect(result.title).toBe('New Offline Note')
    })
  })

  // 冲突解决
  describe('Scenario D: Conflict Resolution', () => {
    it('should not overwrite local pending changes with server data', async () => {
      // 1. 本地有一条笔记，状态是”pending“（修改了但是还没同步）
      const mockPendingNote: OfflineNote = {
        id: 'server_1',
        title: 'My Local Edit',
        content: 'Content',
        tags: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-03'), // Local is newer
        status: 'pending', // Dirty
        serverId: 'server_1'
      }
      vi.mocked(offlineManager.getOfflineNote).mockResolvedValue(mockPendingNote)

      // 2. 服务器也有一条同名笔记，但是内容不一样
      const mockServerNotes = [
        {
          id: 'server_1',
          title: 'Server Edit',
          content: 'Content',
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-02T00:00:00Z',
          tags: [],
          noteRepositories: []
        }
      ]

      server.use(
        http.get('/api/notes', () => {
          return HttpResponse.json({ data: mockServerNotes })
        })
      )

      // 触发同步
      await service.syncFromApi()

      // 4. 判定：不能保存服务器的数据，本地优先
      // A: .not.toHaveBeenCalled() 意思是“绝对不能被调用”。
      // 因为本地数据更新（dirty），所以不能被服务器的旧数据覆盖，如果调用了 save 就是 bug。
      expect(offlineManager.saveOfflineNote).not.toHaveBeenCalled()
    })
  })

  // 检测过滤和分类
  describe('Scenario E: Filtering and Sorting', () => {
    it('should filter local data and request filtered data from API', async () => {
      // 1. Setup Local Data
      const mockOfflineNotes: OfflineNote[] = [
        {
          id: '1', title: 'Alpha Note', content: 'Content', tags: [],
          createdAt: new Date('2023-01-01'), updatedAt: new Date('2023-01-01'), status: 'synced'
        },
        {
          id: '2', title: 'Beta Note', content: 'Content', tags: [],
          createdAt: new Date('2023-01-02'), updatedAt: new Date('2023-01-02'), status: 'synced'
        }
      ]
      vi.mocked(offlineManager.getOfflineNotes).mockResolvedValue(mockOfflineNotes)

      // 2. Setup Server Interception
      let capturedUrl: URL | undefined
      server.use(
        http.get('/api/notes', ({ request }) => {
          capturedUrl = new URL(request.url)
          return HttpResponse.json({ data: [] })
        })
      )

      // 3. Call getNotes with filter
      const notes = await service.getNotes({ searchQuery: 'Beta' })

      // 4. Assert Local Filtering
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('Beta Note')

      // 5. Assert API Params
      await new Promise(r => setTimeout(r, 100))
      expect(capturedUrl).toBeDefined()
      expect(capturedUrl?.searchParams.get('query')).toBe('Beta')
    })
  })
})
