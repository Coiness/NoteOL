import { describe, it, expect, vi, beforeEach } from 'vitest'
import { noteService } from '@/lib/services/note-service'
import { offlineManager } from '@/lib/offline-manager'
import { Doc } from 'yjs'

// Mock dependencies
vi.mock('@/lib/offline-manager', () => ({
  offlineManager: {
    generateLocalNoteId: vi.fn(() => 'local_123'),
    updateNoteIndex: vi.fn(),
    getNoteIndex: vi.fn(),
    searchNotes: vi.fn(),
    saveNoteIndex: vi.fn()
  }
}))

// Mock y-indexeddb
vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: class {
    whenSynced: Promise<void>
    constructor() {
      this.whenSynced = Promise.resolve()
    }
    destroy() {}
  }
}))

describe('NoteService Local-First Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset window mock for client-side check
    vi.stubGlobal('window', {})
  })

  describe('createNote', () => {
    it('should write metadata to Y.Doc and update local index', async () => {
      // Setup
      const mockNoteEntry = { 
        id: 'local_123', 
        title: 'New Note', 
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        preview: ''
      }
      vi.mocked(offlineManager.getNoteIndex).mockResolvedValue(mockNoteEntry as any)

      // Execute
      const note = await noteService.createNote({ title: 'New Note' })

      // Verify
      expect(offlineManager.generateLocalNoteId).toHaveBeenCalled()
      // Check if updateNoteIndex was called (which implies Y.Doc was created and populated)
      expect(offlineManager.updateNoteIndex).toHaveBeenCalled()
      
      // Verify the call argument to updateNoteIndex contains correct metadata
      const updateCall = vi.mocked(offlineManager.updateNoteIndex).mock.calls[0][0]
      expect(updateCall).toBeInstanceOf(Doc)
      const metadata = (updateCall as Doc).getMap('metadata')
      expect(metadata.get('title')).toBe('New Note')
      expect(metadata.get('id')).toBe('local_123')
    })
  })

  describe('getNotes', () => {
    it('should query notes_index via offlineManager', async () => {
      // Setup
      const mockEntries = [
        { id: '1', title: 'A', updatedAt: new Date('2023-01-01'), createdAt: new Date(), tags: [], preview: '' },
        { id: '2', title: 'B', updatedAt: new Date('2023-01-02'), createdAt: new Date(), tags: [], preview: '' }
      ]
      vi.mocked(offlineManager.searchNotes).mockResolvedValue(mockEntries as any)

      // Execute
      const notes = await noteService.getNotes()

      // Verify
      expect(offlineManager.searchNotes).toHaveBeenCalledWith('')
      expect(notes).toHaveLength(2)
      expect(notes[0].title).toBe('B') // Default sort desc
    })
  })

  describe('syncMetadataSnapshot', () => {
    it('should fetch from API and populate local index', async () => {
      // Setup
      const mockServerNotes = [{ id: 'server_1', title: 'Synced Note', updatedAt: new Date().toISOString() }]
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockServerNotes })
      })

      // Execute
      await noteService.syncMetadataSnapshot()

      // Verify
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/notes'))
      expect(offlineManager.saveNoteIndex).toHaveBeenCalledWith(expect.objectContaining({
        id: 'server_1',
        title: 'Synced Note',
        status: 'synced'
      }))
    })
  })
})
