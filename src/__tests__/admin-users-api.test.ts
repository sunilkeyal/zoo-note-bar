import { describe, it, expect, vi, beforeEach } from "vitest"

const mockDb = {
  collection: vi.fn(),
}
const mockCollection = vi.fn()

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}))

vi.mock("@/lib/password", () => ({
  generatePassword: vi.fn().mockReturnValue("GenPass123!"),
}))

vi.mock("@/lib/email", () => ({
  sendUserWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.collection = mockCollection
})

describe("GET /api/admin/users", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 403 if not admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "user" } } as any)

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users")
    const res = await GET(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe("Forbidden")
  })

  it("returns paginated users list", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    const mockUsers = [
      { _id: { toString: () => "1" }, email: "a@a.com", displayName: "A", role: "admin", createdAt: new Date(), updatedAt: new Date() },
      { _id: { toString: () => "2" }, email: "b@b.com", displayName: "B", role: "user", createdAt: new Date(), updatedAt: new Date() },
    ]

    const mockSort = vi.fn().mockReturnThis()
    const mockSkip = vi.fn().mockReturnThis()
    const mockLimit = vi.fn().mockReturnThis()
    const mockToArray = vi.fn().mockResolvedValue(mockUsers)
    const mockCountDocuments = vi.fn().mockResolvedValue(2)

    mockCollection.mockReturnValue({
      find: vi.fn().mockReturnValue({ sort: mockSort, skip: mockSkip, limit: mockLimit, toArray: mockToArray }),
      countDocuments: mockCountDocuments,
    })

    const { GET } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users?page=1&limit=20")
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.users).toHaveLength(2)
    expect(body.data.total).toBe(2)
    expect(body.data.page).toBe(1)
    expect(body.data.limit).toBe(20)
  })
})

describe("POST /api/admin/users", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("creates a new user and returns it with temporary password", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockInsertOne = vi.fn().mockResolvedValue({ insertedId: { toString: () => "new-id" } })
    const mockFindOne = vi.fn()
      .mockResolvedValueOnce(null) // no duplicate
      .mockResolvedValueOnce({ // created user
        _id: { toString: () => "new-id" },
        email: "new@test.com",
        displayName: "New User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

    mockCollection.mockReturnValue({
      findOne: mockFindOne,
      insertOne: mockInsertOne,
    })

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New User", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.temporaryPassword).toBe("GenPass123!")
    expect(body.data.user.email).toBe("new@test.com")
  })

  it("returns 409 if email already exists", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({ email: "existing@test.com" }),
    })

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "existing@test.com", displayName: "Existing", role: "user" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it("returns 400 if role is invalid", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const { POST } = await import("@/app/api/admin/users/route")
    const req = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "new@test.com", displayName: "New", role: "superadmin" }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
