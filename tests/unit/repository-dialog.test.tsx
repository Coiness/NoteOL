import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { RepositoryDialog } from '@/components/repository/repository-dialog'
import { Repository } from '@/types'

// Mock all dependencies
vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock repository data
const mockRepository: Repository = {
  id: 'repo-1',
  name: '测试知识库',
  description: '这是一个测试知识库',
  color: '#3b82f6',
  isDefault: false,
  userId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('RepositoryDialog Component', () => {
  it('should render create dialog with default trigger button', () => {
    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    expect(screen.getByRole('button', { name: /新建知识库/ })).toBeInTheDocument()
  })

  it('should render edit dialog with settings icon when repository provided', () => {
    render(
      React.createElement(RepositoryDialog, { repository: mockRepository }),
      { wrapper: Wrapper }
    )

    expect(screen.getByRole('button')).toBeInTheDocument()
    // Settings icon should be present
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('should open dialog when trigger is clicked', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('创建一个新的知识库来分类您的笔记')).toBeInTheDocument()
    })
  })

  it('should show edit mode when repository is provided', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog, { repository: mockRepository }),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button')
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('编辑知识库')).toBeInTheDocument()
      expect(screen.getByText('修改知识库的基本信息')).toBeInTheDocument()
    })
  })

  it('should render form fields correctly', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByLabelText('名称')).toBeInTheDocument()
      expect(screen.getByLabelText('描述')).toBeInTheDocument()
      expect(screen.getByText('颜色标记')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '立即创建' })).toBeInTheDocument()
    })
  })

  it('should pre-fill form when editing repository', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog, { repository: mockRepository }),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button')
    await user.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByDisplayValue('测试知识库')).toBeInTheDocument()
      expect(screen.getByDisplayValue('这是一个测试知识库')).toBeInTheDocument()
    })
  })

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: '立即创建' })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('名称不能为空')).toBeInTheDocument()
    })
  })

  it('should show validation error for name too long', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(async () => {
      const nameInput = screen.getByLabelText('名称')
      await user.type(nameInput, 'a'.repeat(51)) // 51 characters

      const submitButton = screen.getByRole('button', { name: '立即创建' })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('名称不能超过50个字符')).toBeInTheDocument()
    })
  })

  it('should allow color selection', async () => {
    const user = userEvent.setup()

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(() => {
      const colorInput = screen.getByDisplayValue('#000000')
      expect(colorInput).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()

    // Mock fetch to never resolve
    global.fetch = vi.fn(() => new Promise(() => {})) as any

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(async () => {
      const nameInput = screen.getByLabelText('名称')
      await user.type(nameInput, '测试知识库')

      const submitButton = screen.getByRole('button', { name: '立即创建' })
      await user.click(submitButton)
    })

    await waitFor(() => {
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '立即创建' })).toBeDisabled()
    })
  })

  it('should close dialog after successful submission', async () => {
    const user = userEvent.setup()

    // Mock successful fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 'new-repo', name: '新知识库' })
      } as Response)
    )

    render(
      React.createElement(RepositoryDialog),
      { wrapper: Wrapper }
    )

    const triggerButton = screen.getByRole('button', { name: /新建知识库/ })
    await user.click(triggerButton)

    await waitFor(async () => {
      const nameInput = screen.getByLabelText('名称')
      await user.type(nameInput, '新知识库')

      const submitButton = screen.getByRole('button', { name: '立即创建' })
      await user.click(submitButton)
    })

    // Dialog should close after successful submission
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('should handle controlled open state', () => {
    const onOpenChange = vi.fn()

    render(
      React.createElement(RepositoryDialog, {
        open: true,
        onOpenChange: onOpenChange
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('创建一个新的知识库来分类您的笔记')).toBeInTheDocument()
  })

  it('should render custom trigger', () => {
    const customTrigger = <button>Custom Trigger</button>

    render(
      React.createElement(RepositoryDialog, { trigger: customTrigger }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
  })
})