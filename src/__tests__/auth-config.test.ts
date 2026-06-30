import { describe, it, expect } from 'vitest'
import { authConfig } from '@/lib/auth.config'

describe('authConfig', () => {
  it('has correct signIn page', () => {
    expect(authConfig.pages.signIn).toBe('/login')
  })

  it('uses JWT session strategy', () => {
    expect(authConfig.session.strategy).toBe('jwt')
  })

  describe('authorized callback', () => {
    it('returns true for login page', async () => {
      const result = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/login' } },
        auth: null,
      } as any)
      expect(result).toBe(true)
    })

    it('returns true for signup page', async () => {
      const result = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/signup' } },
        auth: null,
      } as any)
      expect(result).toBe(true)
    })

    it('returns true for forgot-password page', async () => {
      const result = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/forgot-password' } },
        auth: null,
      } as any)
      expect(result).toBe(true)
    })

    it('returns true for reset-password page', async () => {
      const result = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/reset-password' } },
        auth: null,
      } as any)
      expect(result).toBe(true)
    })

    it('returns true for paths starting with /api/auth', async () => {
      const result = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/api/auth/session' } },
        auth: null,
      } as any)
      expect(result).toBe(true)
    })

    it('returns !!auth for /trash paths', async () => {
      const authed = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/trash' } },
        auth: { user: { name: 'Test' } },
      } as any)
      expect(authed).toBe(true)

      const unauthed = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/trash' } },
        auth: null,
      } as any)
      expect(unauthed).toBe(false)
    })

    it('returns auth?.user?.role === "admin" for /admin paths', async () => {
      const admin = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/admin/users' } },
        auth: { user: { role: 'admin' } },
      } as any)
      expect(admin).toBe(true)

      const user = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/admin/users' } },
        auth: { user: { role: 'user' } },
      } as any)
      expect(user).toBe(false)

      const noAuth = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/admin/users' } },
        auth: null,
      } as any)
      expect(noAuth).toBe(false)
    })

    it('returns !!auth for all other paths', async () => {
      const authed = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/some-path' } },
        auth: { user: {} },
      } as any)
      expect(authed).toBe(true)

      const unauthed = await authConfig.callbacks.authorized({
        request: { nextUrl: { pathname: '/some-path' } },
        auth: null,
      } as any)
      expect(unauthed).toBe(false)
    })
  })

  describe('jwt callback', () => {
    it('adds role and id to token when user is present', async () => {
      const token = await authConfig.callbacks.jwt({
        token: { sub: '123' },
        user: { id: 'abc', role: 'admin' },
      } as any)
      expect(token.role).toBe('admin')
      expect(token.id).toBe('abc')
    })

    it('returns token unchanged when user is not present', async () => {
      const token = await authConfig.callbacks.jwt({
        token: { sub: '123' },
      } as any)
      expect(token.role).toBeUndefined()
      expect(token.id).toBeUndefined()
      expect(token.sub).toBe('123')
    })
  })

  describe('session callback', () => {
    it('adds role and id to session.user when session.user exists', async () => {
      const session = await authConfig.callbacks.session({
        session: { user: { name: 'Test' }, expires: '2025-01-01' },
        token: { role: 'admin', id: 'abc' },
      } as any)
      expect(session.user.role).toBe('admin')
      expect(session.user.id).toBe('abc')
    })
  })
})
