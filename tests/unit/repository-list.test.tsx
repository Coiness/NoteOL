import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { RepositoryList } from '@/components/repository/repository-list'
import { Repository } from '@/types'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

// Mock all dependencies
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 天前'),
  zhCN: {}
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

vi.mock('./repository-dialog', () => ({
  RepositoryDialog: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="repository-dialog">{children}</div>
  )
}))

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock repository data
const mockRepositories: Repository[] = [
  {
    id: 'repo-1',
    name: '默认知识库',
    description: '系统默认知识库',
    color: '#3b82f6',
    isDefault: true,
    userId: 'user-1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'repo-2',
    name: '工作笔记',
    description: '工作相关的笔记',
    color: '#10b981',
    isDefault: false,
    userId: 'user-1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z'
  }
]

describe('RepositoryList Component', () => {
  it('should show loading state when fetching repositories', () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    expect(document.querySelector('.animate-spin')).toBeInTheDocument() // Loader2 icon
  })

  it('should render repositories list when data is loaded', async () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('默认知识库')).toBeInTheDocument()
      expect(screen.getByText('工作笔记')).toBeInTheDocument()
    })

    expect(screen.getByText('系统默认知识库')).toBeInTheDocument()
    expect(screen.getByText('工作相关的笔记')).toBeInTheDocument()
  })

  it('should show create new repository button', async () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('新建知识库')).toBeInTheDocument()
    })
  })

  it('should show default repository badge for default repositories', async () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('默认')).toBeInTheDocument()
    })
  })

  it('should show repository color indicators', async () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      const colorIndicators = document.querySelectorAll('[style*="background-color"]')
      expect(colorIndicators.length).toBeGreaterThan(0)
    })
  })

  it('should show formatted update time', async () => {
    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getAllByText(/更新于 2 天前/)).toHaveLength(2)
    })
  })

  it('should show empty description when repository has no description', async () => {
    // Override the handler for this test
    server.use(
      http.get('/api/repositories', () => {
        return HttpResponse.json({
          data: [
            {
              id: 'repo-1',
              name: '测试仓库',
              description: '',
              color: '#3b82f6',
              isDefault: false,
              userId: 'user-1',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ]
        })
      })
    )

    render(
      React.createElement(RepositoryList),
      { wrapper: Wrapper }
    )

    await waitFor(() => {
      expect(screen.getByText('暂无描述')).toBeInTheDocument()
    })

    // Reset handlers after test
    server.resetHandlers()
  })
})