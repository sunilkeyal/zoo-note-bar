import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockConnectToDatabase = vi.fn()
const mockBcryptHash = vi.fn()

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: mockConnectToDatabase }))
vi.mock('bcryptjs', () => ({ default: { hash: mockBcryptHash } }))

describe('ensureAdmin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.resetModules()
  })

  it('connects to database', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockBcryptHash.mockResolvedValue('hashedpass')

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    expect(mockConnectToDatabase).toHaveBeenCalled()
  })

  it('creates default admin and user accounts if they do not exist', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockBcryptHash.mockResolvedValue('hashedpass')

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    expect(mockDb.collection).toHaveBeenCalledWith('users')
    expect(mockDb.insertOne).toHaveBeenCalledTimes(2)
    expect(mockDb.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@example.com', role: 'admin' })
    )
    expect(mockDb.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'user@example.com', role: 'user' })
    )
  })

  it('hashes passwords with bcrypt', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockBcryptHash.mockResolvedValue('hashedpass')

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    expect(mockBcryptHash).toHaveBeenCalledWith('admin123', 12)
    expect(mockBcryptHash).toHaveBeenCalledWith('user123', 12)
  })

  it('does not create existing users', async () => {
    const existingAdmin = { _id: { toString: () => 'admin1' }, email: 'admin@example.com' }
    const existingUser = { _id: { toString: () => 'user1' }, email: 'user@example.com' }
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn()
        .mockResolvedValueOnce(existingAdmin)
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(existingAdmin),
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    expect(mockDb.insertOne).not.toHaveBeenCalled()
  })

  it('migrates existing notes/folders without userId to the admin user', async () => {
    const adminUser = { _id: { toString: () => 'admin1' }, email: 'admin@example.com' }
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn()
        .mockResolvedValueOnce(null)      // findOne({ role: "admin" }) → no admin → seed
        .mockResolvedValueOnce(null)      // findOne({ email: "admin@example.com" }) → not found → create
        .mockResolvedValueOnce(null)      // findOne({ email: "user@example.com" }) → not found → create
        .mockResolvedValueOnce(adminUser), // findOne({ email: "admin@example.com" }) → found → migration
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockBcryptHash.mockResolvedValue('hashedpass')

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    expect(mockDb.collection).toHaveBeenCalledWith('notes')
    expect(mockDb.collection).toHaveBeenCalledWith('folders')
    expect(mockDb.updateMany).toHaveBeenCalledTimes(2)
    expect(mockDb.updateMany).toHaveBeenCalledWith(
      { userId: { $exists: false } },
      { $set: { userId: 'admin1' } }
    )
  })

  it('handles errors gracefully', async () => {
    mockConnectToDatabase.mockRejectedValue(new Error('Connection failed'))

    const { ensureAdmin } = await import('@/lib/seed')
    await expect(ensureAdmin()).resolves.not.toThrow()
  })

  it('uses caching to avoid re-running', async () => {
    const mockDb = {
      collection: vi.fn().mockReturnThis(),
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn(),
      updateMany: vi.fn(),
    }
    mockConnectToDatabase.mockResolvedValue(mockDb)
    mockBcryptHash.mockResolvedValue('hashedpass')

    const { ensureAdmin } = await import('@/lib/seed')
    await ensureAdmin()

    vi.clearAllMocks()

    await ensureAdmin()

    expect(mockConnectToDatabase).not.toHaveBeenCalled()
  })
})
