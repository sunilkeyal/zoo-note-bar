import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'

const mockEnsureAdmin = vi.fn()
const mockConnectToDatabase = vi.fn()
const mockBcryptCompare = vi.fn()
const mockCredentials = vi.fn()

vi.mock('@/lib/seed', () => ({ ensureAdmin: mockEnsureAdmin }))
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: mockConnectToDatabase }))
vi.mock('bcryptjs', () => ({ default: { compare: mockBcryptCompare } }))
vi.mock('@/lib/auth.config', () => ({
  authConfig: {
    pages: { signIn: '/login' },
    session: { strategy: 'jwt' },
    callbacks: {},
  },
}))
vi.mock('next-auth', () => ({
  default: vi.fn(() => ({
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  })),
}))
vi.mock('next-auth/providers/credentials', () => ({ default: mockCredentials }))

let authorize: (...args: any[]) => any

describe('auth', () => {
  beforeAll(async () => {
    await import('@/lib/auth')
    authorize = mockCredentials.mock.calls[0][0].authorize
  })

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('exports handlers, signIn, signOut, auth', async () => {
    const mod = await import('@/lib/auth')
    expect(mod.handlers).toBeDefined()
    expect(mod.signIn).toBeDefined()
    expect(mod.signOut).toBeDefined()
    expect(mod.auth).toBeDefined()
  })

  describe('authorize', () => {
    it('returns null when credentials missing', async () => {
      expect(await authorize({})).toBeNull()
      expect(await authorize({ email: 'test@test.com' })).toBeNull()
      expect(await authorize({ password: 'pass' })).toBeNull()
    })

    it('calls ensureAdmin', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      })
      mockEnsureAdmin.mockResolvedValue(undefined)

      await authorize({ email: 't@t.com', password: 'pass' })
      expect(mockEnsureAdmin).toHaveBeenCalled()
    })

    it('looks up user by lowercased trimmed email in MongoDB', async () => {
      const mockDb = {
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      }
      mockConnectToDatabase.mockResolvedValue(mockDb)

      await authorize({ email: '  Test@Example.COM  ', password: 'pass' })
      expect(mockDb.collection).toHaveBeenCalledWith('users')
      expect(mockDb.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
    })

    it('returns null if user not found', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(null),
      })

      const result = await authorize({ email: 'missing@test.com', password: 'pass' })
      expect(result).toBeNull()
    })

    it('compares password with bcrypt', async () => {
      const mockUser = {
        _id: { toString: () => 'u1' },
        displayName: 'T',
        email: 't@t.com',
        role: 'user',
        passwordHash: 'hash123',
      }
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue(mockUser),
      })
      mockBcryptCompare.mockResolvedValue(true)

      await authorize({ email: 't@t.com', password: 'mypass' })
      expect(mockBcryptCompare).toHaveBeenCalledWith('mypass', 'hash123')
    })

    it('returns null if password does not match', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          passwordHash: 'hash123',
        }),
      })
      mockBcryptCompare.mockResolvedValue(false)

      const result = await authorize({ email: 't@t.com', password: 'wrong' })
      expect(result).toBeNull()
    })

    it('returns user object with id, name, email, role on success', async () => {
      mockConnectToDatabase.mockResolvedValue({
        collection: vi.fn().mockReturnThis(),
        findOne: vi.fn().mockResolvedValue({
          _id: { toString: () => 'u1' },
          displayName: 'Test User',
          email: 't@t.com',
          role: 'admin',
          passwordHash: 'hash123',
        }),
      })
      mockBcryptCompare.mockResolvedValue(true)

      const result = await authorize({ email: 't@t.com', password: 'correct' })
      expect(result).toEqual({
        id: 'u1',
        name: 'Test User',
        email: 't@t.com',
        role: 'admin',
      })
    })
  })
})
