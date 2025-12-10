import { http, HttpResponse } from 'msw'
import { SearchResults } from '@/types'

export const handlers = [
  http.get('https://api.example.com/user', () => {
    return HttpResponse.json({
      id: 'c7b3d8e0-5e0b-4b0f-8b3a-3b9f4b3d3b3d',
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),

  // Repository API handlers
  http.get('/api/repositories', () => {
    return HttpResponse.json({
      data: [
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
    })
  }),

  http.delete('/api/repositories/:id', () => {
    return HttpResponse.json({ success: true })
  }),

  // POST create repository
  http.post('/api/repositories', () => {
    return HttpResponse.json({
      id: 'new-repo',
      name: '新知识库',
      description: '',
      color: '#000000',
      isDefault: false,
      userId: 'user-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
  }),

  // PUT update repository
  http.put('/api/repositories/:id', () => {
    return HttpResponse.json({
      id: 'repo-1',
      name: '更新后的知识库',
      description: '更新后的描述',
      color: '#10b981',
      isDefault: false,
      userId: 'user-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: new Date().toISOString()
    })
  }),

  // Search API
  http.get('/api/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')

    if (!query || query.trim() === '') {
      return HttpResponse.json({
        success: true,
        data: { title: [], tags: [], content: [], repositories: [] }
      })
    }

    // Mock search results based on query
    let mockResults: SearchResults = {
      title: [],
      tags: [],
      content: [],
      repositories: []
    }

    // Only return results if query matches
    if (query.includes('test') || query.includes('测试')) {
      mockResults.title = [
        {
          id: 'note-1',
          title: '测试笔记',
          content: '这是测试内容',
          tags: [{ id: 'tag-1', name: '测试', userId: 'user-1', createdAt: '2024-01-01T00:00:00Z' }],
          user: { id: 'user-1', name: '测试用户', email: 'test@example.com', image: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ]
    }

    if (query.includes('#重要')) {
      mockResults.tags = [
        {
          id: 'note-2',
          title: '标签笔记',
          content: '包含标签的内容',
          tags: [{ id: 'tag-2', name: '重要', userId: 'user-1', createdAt: '2024-01-02T00:00:00Z' }],
          user: { id: 'user-1', name: '测试用户', email: 'test@example.com', image: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z'
        }
      ]
    }

    if (query.includes('@工作')) {
      mockResults.repositories = [
        {
          id: 'note-3',
          title: '知识库笔记',
          content: '知识库中的笔记',
          tags: [],
          user: { id: 'user-1', name: '测试用户', email: 'test@example.com', image: null, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-03T00:00:00Z'
        }
      ]
    }

    return HttpResponse.json({
      success: true,
      data: mockResults
    })
  }),
]
