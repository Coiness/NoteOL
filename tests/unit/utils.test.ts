import { describe, it, expect } from 'vitest'
import { stripHtml, getTagColor } from '@/lib/utils'

describe('Utils Functions', () => {
  describe('stripHtml', () => {
    it('should remove HTML tags from text', () => {
      const html = '<p>Hello <strong>world</strong>!</p>'
      const result = stripHtml(html)
      expect(result).toBe('Hello world!')
    })

    it('should handle empty string', () => {
      expect(stripHtml('')).toBe('')
    })

    it('should handle text without HTML', () => {
      expect(stripHtml('Hello world')).toBe('Hello world')
    })

    it('should handle complex HTML', () => {
      const html = '<div><h1>Title</h1><p>Some <em>text</em> here</p></div>'
      const result = stripHtml(html)
      expect(result).toBe('TitleSome text here')
    })
  })

  describe('getTagColor', () => {
    it('should return valid color variants', () => {
      const colors = ['blue', 'green', 'orange', 'pink', 'purple', 'yellow']
      const result = getTagColor('test')
      expect(colors).toContain(result)
    })

    it('should return consistent color for same input', () => {
      const result1 = getTagColor('test')
      const result2 = getTagColor('test')
      expect(result1).toBe(result2)
    })

    it('should handle empty string', () => {
      const result = getTagColor('')
      expect(typeof result).toBe('string')
    })
  })
})