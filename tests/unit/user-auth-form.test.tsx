import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { UserAuthForm } from '@/components/auth/user-auth-form'

// Mock all dependencies
vi.mock('next-auth/react', () => ({
  signIn: vi.fn()
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn(() => '/dashboard')
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
    formState: { errors: {} }
  }))
}))

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(() => ({}))
}))

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('UserAuthForm Component', () => {
  it('should render the login form with email and password fields', () => {
    render(
      React.createElement(UserAuthForm),
      { wrapper: Wrapper }
    )

    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument()
  })
})