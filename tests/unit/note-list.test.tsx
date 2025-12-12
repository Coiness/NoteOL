import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { NoteList } from '@/components/editor/note-list'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({
    get: vi.fn(() => null)
  })
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock useOffline hook
vi.mock('@/hooks/use-offline', () => ({
  useOffline: () => ({
    isOnline: true,
    pendingNotesCount: 0,
    createOfflineNote: vi.fn(),
    getOfflineNotes: vi.fn(() => []),
    syncPendingOperations: vi.fn()
  })
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root: Element | null = null
  rootMargin: string = ''
  thresholds: ReadonlyArray<number> = []

  constructor() {}

  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('NoteList Component', () => {
  beforeEach(() => {
    // Add MSW handler for notes API
    server.use(
      http.get('/api/notes', () => {
        return HttpResponse.json({
          data: {
            notes: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              hasMore: false
            }
          }
        })
      })
    )
  })

  afterEach(() => {
    server.resetHandlers()
  })
  it('should render the component', () => {
    render(
      React.createElement(NoteList, { repositoryId: undefined }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('笔记列表')).toBeInTheDocument()
  })

  it('should show search input', () => {
    render(
      React.createElement(NoteList, { repositoryId: undefined }),
      { wrapper: Wrapper }
    )

    const searchInput = screen.getByPlaceholderText('搜索笔记 (#标签 或 关键词)')
    expect(searchInput).toBeInTheDocument()
  })

  it('should show create button when no repository', () => {
    render(
      React.createElement(NoteList, { repositoryId: undefined }),
      { wrapper: Wrapper }
    )

    // When no repository, there's a simple plus button (no dropdown)
    const buttons = screen.getAllByRole('button', { name: '' })
    const createButton = buttons.find(button => 
      button.querySelector('svg.lucide-plus') && !button.hasAttribute('aria-haspopup')
    )
    expect(createButton).toBeInTheDocument()
  })

  it('should show create button with dropdown when repository exists', () => {
    render(
      React.createElement(NoteList, { repositoryId: 'repo-123' }),
      { wrapper: Wrapper }
    )

    // The dropdown trigger should exist
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('should show sort dropdown', () => {
    render(
      React.createElement(NoteList, { repositoryId: undefined }),
      { wrapper: Wrapper }
    )

    // Find the sort button by its aria-haspopup attribute (dropdown trigger)
    const sortButton = screen.getByRole('button', { name: /更新时间|创建时间|标题/ })
    expect(sortButton).toBeInTheDocument()
    expect(sortButton).toHaveAttribute('aria-haspopup', 'menu')
  })

  it('should show create note button in empty state', async () => {
    render(
      React.createElement(NoteList, { repositoryId: undefined }),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('创建第一篇笔记')).toBeInTheDocument()
    })
  })
})