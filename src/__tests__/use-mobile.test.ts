import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns true when window width is less than 768', async () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it('returns false when window width is 768 or greater', async () => {
    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it('updates value when window is resized below breakpoint', async () => {
    const matchMediaListener = vi.fn()
    window.matchMedia = vi.fn(() => ({
      addEventListener: matchMediaListener,
      removeEventListener: vi.fn(),
    }))

    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
        configurable: true,
      })
      const onChange = matchMediaListener.mock.calls[0]?.[1]
      if (onChange) onChange()
    })

    expect(result.current).toBe(true)
  })

  it('updates value when window is resized above breakpoint', async () => {
    const matchMediaListener = vi.fn()
    window.matchMedia = vi.fn(() => ({
      addEventListener: matchMediaListener,
      removeEventListener: vi.fn(),
    }))

    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true,
        configurable: true,
      })
      const onChange = matchMediaListener.mock.calls[0]?.[1]
      if (onChange) onChange()
    })

    expect(result.current).toBe(false)
  })

  it('cleans up event listener on unmount', async () => {
    const removeEventListener = vi.fn()
    window.matchMedia = vi.fn(() => ({
      addEventListener: vi.fn(),
      removeEventListener,
    }))

    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
      configurable: true,
    })

    const { useIsMobile } = await import('@/hooks/use-mobile')
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(removeEventListener).toHaveBeenCalled()
  })
})
