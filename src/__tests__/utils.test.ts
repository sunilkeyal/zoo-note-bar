import { describe, it, expect } from 'vitest'
import { cn, stripHtml } from '@/lib/utils'

describe('cn', () => {
  it('merges class strings', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden')).toBe('base')
    expect(cn('base', true && 'visible')).toBe('base visible')
  })

  it('handles undefined and null values', () => {
    expect(cn('a', undefined, null)).toBe('a')
  })

  it('handles array arguments', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c')
  })

  it('merges Tailwind classes with later wins', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('preserves non-conflicting classes', () => {
    expect(cn('flex', 'items-center', 'gap-2')).toBe('flex items-center gap-2')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})

describe('stripHtml', () => {
  it('strips HTML tags', () => {
    expect(stripHtml('<p>Hello <strong>world</strong></p>')).toBe('Hello world')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('hello world')).toBe('hello world')
  })

  it('trims whitespace', () => {
    expect(stripHtml('  <p>content</p>  ')).toBe('content')
  })
})
