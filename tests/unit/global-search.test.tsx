import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { GlobalSearch } from '@/components/global-search'
import { Note } from '@/types'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'

// Mock all dependencies
const mockRouter = { push: vi.fn() }
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

vi.mock('@/hooks/use-debounce', () => ({
  useDebounce: vi.fn((value) => value) // Return value immediately for testing
}))

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 天前'),
  zhCN: {}
}))

// Mock data
const mockSearchResults = {
  title: [
    {
      id: 'note-1',
      title: '测试笔记',
      content: '这是测试内容',
      tags: [{ id: 'tag-1', name: '测试' }],
      repositoryId: 'repo-1',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ],
  tags: [
    {
      id: 'note-2',
      title: '标签笔记',
      content: '包含标签的内容',
      tags: [{ id: 'tag-2', name: '重要' }],
      repositoryId: 'repo-1',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z'
    }
  ],
  content: [],
  repositories: [
    {
      id: 'note-3',
      title: '知识库笔记',
      content: '知识库中的笔记',
      tags: [],
      repositoryId: 'repo-2',
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z'
    }
  ]
}

describe('GlobalSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search button with keyboard shortcut', () => {
    render(React.createElement(GlobalSearch))

    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByText('搜索笔记...')).toBeInTheDocument()
    expect(screen.getByText((content, element) => {
      return element?.textContent === '⌘K'
    })).toBeInTheDocument()
  })

  it('should open dialog when search button is clicked', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')).toBeInTheDocument()
    })
  })

  it('should open dialog with keyboard shortcut', () => {
    render(React.createElement(GlobalSearch))

    // Simulate Ctrl+K
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should open dialog with Cmd+K on Mac', () => {
    render(React.createElement(GlobalSearch))

    // Simulate Cmd+K
    fireEvent.keyDown(document, { key: 'k', metaKey: true })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should show loading state while searching', async () => {
    const user = userEvent.setup()

    // Mock MSW to delay response significantly
    server.use(
      http.get('/api/search', async () => {
        await new Promise(resolve => setTimeout(resolve, 500)) // Longer delay to ensure loading state is visible
        return HttpResponse.json({
          success: true,
          data: { title: [], tags: [], content: [], repositories: [] }
        })
      })
    )

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, 'test')
    })

    // Check for loading spinner in CommandEmpty
    await waitFor(() => {
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('should display search results grouped by type', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, 'test')
    })

    await waitFor(() => {
      expect(screen.getByText('标题匹配')).toBeInTheDocument()
      expect(screen.getByText('测试笔记')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should show tags for tag-matched notes', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, '#重要')
    })

    await waitFor(() => {
      expect(screen.getByText('#重要')).toBeInTheDocument()
    })
  })

  it('should show empty state when no results', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
    await user.type(input, 'nonexistent')

    // Wait for MSW to respond and check empty state
    await waitFor(() => {
      expect(screen.getByText('未找到结果')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should navigate to note when result is selected', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, 'test')
    })

    await waitFor(() => {
      const resultItem = screen.getByText('测试笔记')
      fireEvent.click(resultItem)
    })

    expect(mockRouter.push).toHaveBeenCalledWith('/notes/note-1')
  })

  it('should clear search when dialog closes', async () => {
    const user = userEvent.setup()

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, 'test')
      expect(input).toHaveValue('test')
    })

    // Close dialog
    const closeButton = screen.getByRole('button', { name: 'Close' })
    await user.click(closeButton)

    // Reopen dialog
    await user.click(searchButton)

    await waitFor(() => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      expect(input).toHaveValue('')
    })
  })

  it('should handle search API errors gracefully', async () => {
    const user = userEvent.setup()
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock API error using MSW
    server.use(
      http.get('/api/search', () => {
        return HttpResponse.error()
      })
    )

    render(React.createElement(GlobalSearch))

    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    await waitFor(async () => {
      const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
      await user.type(input, 'test')
    })

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled()
    })

    consoleSpy.mockRestore()
  })
})