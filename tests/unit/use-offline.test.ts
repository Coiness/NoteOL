import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useOffline } from '@/app/hooks/use-offline'

// Mock IndexedDB for testing
const mockIndexedDB = {
  open: vi.fn(() => ({
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: {
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn()
      })),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          put: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          get: vi.fn()
        }))
      }))
    }
  })),
  deleteDatabase: vi.fn()
}

// Mock global indexedDB
Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
})

// Create a wrapper component with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useOffline Hook', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
  })

  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useOffline(), { wrapper: Wrapper })

    expect(result.current.isOnline).toBe(true) // 在测试环境中navigator.onLine为true
  })

  it('should have all required methods', () => {
    const { result } = renderHook(() => useOffline(), { wrapper: Wrapper })

    expect(result.current).toHaveProperty('isOnline')
    expect(result.current).toHaveProperty('setGlobalRefreshCallback')
    expect(result.current).toHaveProperty('triggerGlobalRefresh')
  })
})