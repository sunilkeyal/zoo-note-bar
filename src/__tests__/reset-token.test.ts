import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInsertOne = vi.fn()
const mockFindOne = vi.fn()
const mockUpdateOne = vi.fn()
const mockCollection = vi.fn()
const mockDb = { collection: mockCollection }

const mockConnectToDatabase = vi.fn()

vi.mock('@/lib/mongodb', () => ({
  connectToDatabase: mockConnectToDatabase,
}))

describe('reset-token', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()

    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockCollection.mockReturnValue({
      insertOne: mockInsertOne,
      findOne: mockFindOne,
      updateOne: mockUpdateOne,
    })
  })

  describe('generateResetToken', () => {
    it('returns a 64-character hex string', async () => {
      const { generateResetToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      expect(token).toMatch(/^[0-9a-f]{64}$/)
    })

    it('generates unique tokens', async () => {
      const { generateResetToken } = await import('@/lib/reset-token')
      const token1 = generateResetToken()
      const token2 = generateResetToken()
      expect(token1).not.toBe(token2)
    })
  })

  describe('hashToken', () => {
    it('returns a SHA-256 hex digest', async () => {
      const { hashToken } = await import('@/lib/reset-token')
      const hash = hashToken('test-token')
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('returns consistent hashes for the same input', async () => {
      const { hashToken } = await import('@/lib/reset-token')
      const hash1 = hashToken('same-token')
      const hash2 = hashToken('same-token')
      expect(hash1).toBe(hash2)
    })

    it('returns different hashes for different inputs', async () => {
      const { hashToken } = await import('@/lib/reset-token')
      const hash1 = hashToken('token-a')
      const hash2 = hashToken('token-b')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('storeResetToken', () => {
    it('inserts a token document into passwordResetTokens', async () => {
      const { storeResetToken } = await import('@/lib/reset-token')

      await storeResetToken('user@example.com', 'hashedToken123')

      expect(mockConnectToDatabase).toHaveBeenCalled()
      expect(mockCollection).toHaveBeenCalledWith('passwordResetTokens')
      expect(mockInsertOne).toHaveBeenCalledWith({
        email: 'user@example.com',
        tokenHash: 'hashedToken123',
        expiresAt: expect.any(Date),
        used: false,
        createdAt: expect.any(Date),
      })
    })

    it('sets expiry 1 hour in the future', async () => {
      const { storeResetToken } = await import('@/lib/reset-token')
      const now = Date.now()

      await storeResetToken('user@example.com', 'hash')

      const inserted = mockInsertOne.mock.calls[0][0]
      const expiryMs = inserted.expiresAt.getTime()
      expect(expiryMs - now).toBeGreaterThan(59 * 60 * 1000)
      expect(expiryMs - now).toBeLessThanOrEqual(60 * 60 * 1000 + 100)
    })
  })

  describe('verifyResetToken', () => {
    it('returns invalid for empty token', async () => {
      const { verifyResetToken } = await import('@/lib/reset-token')
      const result = await verifyResetToken('')
      expect(result).toEqual({ valid: false, reason: 'Invalid token' })
    })

    it('returns invalid for short token', async () => {
      const { verifyResetToken } = await import('@/lib/reset-token')
      const result = await verifyResetToken('abc')
      expect(result).toEqual({ valid: false, reason: 'Invalid token' })
    })

    it('returns invalid when token is not found in database', async () => {
      mockFindOne.mockResolvedValue(null)

      const { verifyResetToken, generateResetToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      const result = await verifyResetToken(token)

      expect(result).toEqual({ valid: false, reason: 'Invalid token' })
    })

    it('returns invalid when token has been used', async () => {
      mockFindOne.mockResolvedValue({
        email: 'user@example.com',
        tokenHash: 'hash',
        used: true,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { verifyResetToken, generateResetToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      const result = await verifyResetToken(token)

      expect(result).toEqual({ valid: false, reason: 'Invalid token' })
    })

    it('returns invalid when token has expired', async () => {
      mockFindOne.mockResolvedValue({
        email: 'user@example.com',
        tokenHash: 'hash',
        used: false,
        expiresAt: new Date(Date.now() - 1000),
      })

      const { verifyResetToken, generateResetToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      const result = await verifyResetToken(token)

      expect(result).toEqual({ valid: false, reason: 'Token has expired' })
    })

    it('returns valid with email when token is valid', async () => {
      mockFindOne.mockResolvedValue({
        email: 'user@example.com',
        tokenHash: 'hash',
        used: false,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const { verifyResetToken, generateResetToken, hashToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      const result = await verifyResetToken(token)

      expect(result).toEqual({ valid: true, email: 'user@example.com' })
    })

    it('queries the database with the hashed token', async () => {
      mockFindOne.mockResolvedValue(null)

      const { verifyResetToken, generateResetToken, hashToken } = await import('@/lib/reset-token')
      const token = generateResetToken()
      const expectedHash = hashToken(token)

      await verifyResetToken(token)

      expect(mockCollection).toHaveBeenCalledWith('passwordResetTokens')
      expect(mockFindOne).toHaveBeenCalledWith({ tokenHash: expectedHash })
    })
  })

  describe('markTokenUsed', () => {
    it('updates the token document to used', async () => {
      const { markTokenUsed, generateResetToken, hashToken } = await import('@/lib/reset-token')
      const token = generateResetToken()

      await markTokenUsed(token)

      const expectedHash = hashToken(token)
      expect(mockCollection).toHaveBeenCalledWith('passwordResetTokens')
      expect(mockUpdateOne).toHaveBeenCalledWith(
        { tokenHash: expectedHash },
        { $set: { used: true } }
      )
    })
  })

  describe('checkRateLimit', () => {
    it('returns true for first request', async () => {
      const { checkRateLimit } = await import('@/lib/reset-token')
      expect(checkRateLimit('first@example.com')).toBe(true)
    })

    it('returns false for repeated request within rate limit window', async () => {
      const { checkRateLimit } = await import('@/lib/reset-token')
      checkRateLimit('same@example.com')
      expect(checkRateLimit('same@example.com')).toBe(false)
    })

    it('returns true for different emails', async () => {
      const { checkRateLimit } = await import('@/lib/reset-token')
      checkRateLimit('a@example.com')
      expect(checkRateLimit('b@example.com')).toBe(true)
    })
  })
})
