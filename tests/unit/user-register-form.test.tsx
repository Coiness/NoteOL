import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { UserRegisterForm } from '@/components/auth/user-register-form'

// Mock all dependencies
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn()
  }
}))

vi.mock('react-hook-form', () => ({
  useForm: vi.fn(() => ({
    register: vi.fn(),
    handleSubmit: vi.fn((fn) => fn),
    getValues: vi.fn(() => ({ email: 'test@example.com' })),
    formState: { errors: {} }
  }))
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => ({}))
}))

global.fetch = vi.fn()

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('UserRegisterForm Component', () => {
  it('should render the registration form with all required fields', () => {
    render(
      React.createElement(UserRegisterForm),
      { wrapper: Wrapper }
    )

    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('6位验证码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('确认密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '获取验证码' })).toBeInTheDocument()
  })
})