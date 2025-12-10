import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { NoteEditor } from '@/components/editor/note-editor'
import { Note } from '@/types'

// Mock all complex dependencies to avoid complex setup
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => null), // Return null to show loading state
  EditorContent: () => <div data-testid="editor-content">Loading...</div>,
  Extension: { create: vi.fn() }
}))

vi.mock('@tiptap/starter-kit', () => ({ default: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-image', () => ({ default: {} }))
vi.mock('@tiptap/extension-link', () => ({ default: { configure: vi.fn() } }))
vi.mock('@tiptap/extension-task-list', () => ({ default: {} }))
vi.mock('@tiptap/extension-task-item', () => ({ default: { configure: vi.fn() } }))
vi.mock('@tiptap/extension-table', () => ({ default: { configure: vi.fn(() => ({})) }, Table: { configure: vi.fn(() => ({})) } }))
vi.mock('@tiptap/extension-table-row', () => ({ default: {} }))
vi.mock('@tiptap/extension-table-header', () => ({ default: {} }))
vi.mock('@tiptap/extension-table-cell', () => ({ default: {} }))
vi.mock('@tiptap/extension-highlight', () => ({ default: {} }))
vi.mock('@tiptap/extension-code-block-lowlight', () => ({ default: { configure: vi.fn() } }))
vi.mock('lowlight', () => ({ common: {}, createLowlight: vi.fn() }))
vi.mock('@tiptap/extension-collaboration', () => ({ default: { configure: vi.fn() } }))
vi.mock('@tiptap/extension-collaboration-cursor', () => ({ default: { configure: vi.fn() } }))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Test User' } } })
}))

vi.mock('randomcolor', () => ({ default: vi.fn(() => '#ff0000') }))
vi.mock('@hocuspocus/provider', () => ({ HocuspocusProvider: vi.fn() }))
vi.mock('yjs', () => ({ Doc: class MockDoc {} }))

// Mock custom components
vi.mock('./editor-toolbar', () => ({ EditorToolbar: () => null }))
vi.mock('./extensions/tab-keymap', () => ({ TabKeymap: {} }))
vi.mock('./extensions/save-shortcut', () => ({ SaveShortcut: {} }))
vi.mock('./extensions/slash-command', () => ({ SlashCommand: { configure: vi.fn() } }))
vi.mock('./extensions/suggestion', () => ({ suggestion: {} }))
vi.mock('./table-of-contents', () => ({ TableOfContents: () => null }))

// Create wrapper with QueryClient
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// Mock note data
const mockNote: Note = {
  id: 'test-note-123',
  title: 'Test Note',
  content: 'Test content',
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com', image: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: [],
  role: 'OWNER'
}

const mockOfflineNote: Note = {
  id: 'local_test-note-123',
  title: 'Offline Test Note',
  content: 'Offline test content',
  user: { id: 'user-123', name: 'Test User', email: 'test@example.com', image: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  tags: [],
  role: 'OWNER'
}

describe('NoteEditor Component', () => {
  const yDoc = new (require('yjs').Doc)()
  const provider = null

  it('should render loading state when editor is not ready', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockNote,
        yDoc,
        provider,
        status: 'connecting'
      }),
      { wrapper: Wrapper }
    )

    // When editor is not ready, it shows a loading spinner
    expect(screen.getByText('连接中...')).toBeInTheDocument()
    // Should not show editor content
    expect(screen.queryByTestId('editor-content')).not.toBeInTheDocument()
  })

  it('should show offline note indicator', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockOfflineNote,
        yDoc,
        provider,
        status: 'connected'
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('离线笔记')).toBeInTheDocument()
  })

  it('should show connected status', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockNote,
        yDoc,
        provider,
        status: 'connected'
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('已连接')).toBeInTheDocument()
  })

  it('should show connecting status', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockNote,
        yDoc,
        provider,
        status: 'connecting'
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('连接中...')).toBeInTheDocument()
  })

  it('should show disconnected status', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockNote,
        yDoc,
        provider,
        status: 'disconnected'
      }),
      { wrapper: Wrapper }
    )

    expect(screen.getByText('离线模式')).toBeInTheDocument()
  })

  it('should render in read-only mode', () => {
    render(
      React.createElement(NoteEditor, {
        note: mockNote,
        readOnly: true,
        yDoc,
        provider,
        status: 'connected'
      }),
      { wrapper: Wrapper }
    )

    // Read-only mode shows loading state when editor is not ready
    expect(screen.getByText('已连接')).toBeInTheDocument()
    // Should not show editor content when editor is not ready
    expect(screen.queryByTestId('editor-content')).not.toBeInTheDocument()
  })
})