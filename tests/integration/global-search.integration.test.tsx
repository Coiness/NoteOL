import { describe, it, expect, beforeEach, vi, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GlobalSearch } from '@/components/global-search'
import { server } from '@/mocks/server'

// Mock router
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

// Start MSW server
beforeEach(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )

  Wrapper.displayName = 'TestWrapper'

  return Wrapper
}

describe('GlobalSearch Integration', () => {
  it('should perform end-to-end search flow', async () => {
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      React.createElement(GlobalSearch),
      { wrapper: Wrapper }
    )

    // Open search dialog
    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')).toBeInTheDocument()
    })

    // Type search query
    const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
    await user.type(input, '测试')

    // Wait for search results to appear
    await waitFor(() => {
      expect(screen.getByText('标题匹配')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify search results are displayed
    expect(screen.getByText('测试笔记')).toBeInTheDocument()
  })

  it('should handle empty search results', async () => {
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      React.createElement(GlobalSearch),
      { wrapper: Wrapper }
    )

    // Open search dialog
    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    // Type non-existent query
    const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
    await user.type(input, 'nonexistent')

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('未找到结果')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('should handle tag-based search', async () => {
    const Wrapper = createWrapper()
    const user = userEvent.setup()

    render(
      React.createElement(GlobalSearch),
      { wrapper: Wrapper }
    )

    // Open search dialog
    const searchButton = screen.getByRole('button', { name: /搜索笔记/ })
    await user.click(searchButton)

    // Type tag search query
    const input = screen.getByPlaceholderText('搜索笔记... (使用 #标签, @知识库, title:, content: 进行精确搜索)')
    await user.type(input, '#重要')

    // Wait for tag results
    await waitFor(() => {
      expect(screen.getByText('标签匹配')).toBeInTheDocument()
    }, { timeout: 3000 })

    // Verify tag results
    expect(screen.getByText('标签笔记')).toBeInTheDocument()
    expect(screen.getByText('#重要')).toBeInTheDocument()
  })
})