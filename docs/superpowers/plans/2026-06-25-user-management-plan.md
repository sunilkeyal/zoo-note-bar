# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dummy user management page with a real admin panel — list, search, create, edit, disable, delete users, and reset passwords.

**Architecture:** Client component page (`src/app/admin/users/page.tsx`) with sub-components for table, dialogs. API routes at `/api/admin/users/*` handle all CRUD against MongoDB. Auth checks `isActive` at login. Email via Resend.

**Tech Stack:** Next.js 16 (App Router), TypeScript, MongoDB driver, Auth.js/next-auth v5, bcryptjs, Resend, shadcn/ui

---

### Task 1: Add email helper functions

**Files:**
- Modify: `src/lib/email.ts`
- Modify: `src/__tests__/email.test.ts`

- [ ] **Step 1: Write failing tests for new email functions**

Add to `src/__tests__/email.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest'

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}))

// After existing tests, add:
describe('sendUserWelcomeEmail', () => {
  it('sends welcome email with temporary password', async () => {
    const { sendUserWelcomeEmail } = await import('@/lib/email')
    await expect(sendUserWelcomeEmail('test@test.com', 'TempPass123!')).resolves.not.toThrow()
  })
})

describe('sendPasswordResetByAdminEmail', () => {
  it('sends reset email with temporary password', async () => {
    const { sendPasswordResetByAdminEmail } = await import('@/lib/email')
    await expect(sendPasswordResetByAdminEmail('test@test.com', 'NewPass456!')).resolves.not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/email.test.ts`
Expected: FAIL — `sendUserWelcomeEmail` and `sendPasswordResetByAdminEmail` are not exported

- [ ] **Step 3: Implement the email functions**

Add to `src/lib/email.ts`:
```ts
export async function sendUserWelcomeEmail(
  to: string,
  temporaryPassword: string
): Promise<void> {
  if (!resendClient) {
    console.log(`[Welcome] Email: ${to}, Temporary password: ${temporaryPassword}`)
    return
  }

  const { error } = await resendClient.emails.send({
    from: emailFrom,
    to,
    subject: "Your ZooNoteBar account has been created",
    html: `<p>An admin has created an account for you at ZooNoteBar.</p><p>Your temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
  })

  if (error) {
    console.error("[Resend] Failed to send welcome email:", error)
    throw new Error(error.message)
  }
}

export async function sendPasswordResetByAdminEmail(
  to: string,
  temporaryPassword: string
): Promise<void> {
  if (!resendClient) {
    console.log(`[Admin Password Reset] Email: ${to}, Temporary password: ${temporaryPassword}`)
    return
  }

  const { error } = await resendClient.emails.send({
    from: emailFrom,
    to,
    subject: "Your ZooNoteBar password has been reset",
    html: `<p>An admin has reset your ZooNoteBar password.</p><p>Your new temporary password is: <strong>${temporaryPassword}</strong></p><p>Please log in and change your password.</p>`,
  })

  if (error) {
    console.error("[Resend] Failed to send reset email:", error)
    throw new Error(error.message)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/email.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/email.ts src/__tests__/email.test.ts
git commit -m "feat: add email helpers for user welcome and admin password reset"
```

---

### Task 2: Add `isActive` check to auth

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/__tests__/auth.test.ts`

- [ ] **Step 1: Write failing test for isActive check**

Add to `src/__tests__/auth.test.ts` inside the `describe('authorize'` block, before the "returns user object" test:

```ts
it('returns null if user is disabled (isActive === false)', async () => {
  mockConnectToDatabase.mockResolvedValue({
    collection: vi.fn().mockReturnThis(),
    findOne: vi.fn().mockResolvedValue({
      _id: { toString: () => 'u1' },
      displayName: 'Disabled User',
      email: 'disabled@test.com',
      role: 'user',
      passwordHash: 'hash123',
      isActive: false,
    }),
  })
  mockBcryptCompare.mockResolvedValue(true)

  const result = await authorize({ email: 'disabled@test.com', password: 'correct' })
  expect(result).toBeNull()
})

it('allows login when isActive is true', async () => {
  mockConnectToDatabase.mockResolvedValue({
    collection: vi.fn().mockReturnThis(),
    findOne: vi.fn().mockResolvedValue({
      _id: { toString: () => 'u1' },
      displayName: 'Active User',
      email: 'active@test.com',
      role: 'user',
      passwordHash: 'hash123',
      isActive: true,
    }),
  })
  mockBcryptCompare.mockResolvedValue(true)

  const result = await authorize({ email: 'active@test.com', password: 'correct' })
  expect(result).toEqual({
    id: 'u1',
    name: 'Active User',
    email: 'active@test.com',
    role: 'user',
  })
})

it('allows login when isActive field is missing (backward compat)', async () => {
  mockConnectToDatabase.mockResolvedValue({
    collection: vi.fn().mockReturnThis(),
    findOne: vi.fn().mockResolvedValue({
      _id: { toString: () => 'u1' },
      displayName: 'Old User',
      email: 'old@test.com',
      role: 'user',
      passwordHash: 'hash123',
    }),
  })
  mockBcryptCompare.mockResolvedValue(true)

  const result = await authorize({ email: 'old@test.com', password: 'correct' })
  expect(result).toEqual({
    id: 'u1',
    name: 'Old User',
    email: 'old@test.com',
    role: 'user',
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/__tests__/auth.test.ts`
Expected: The new tests fail

- [ ] **Step 3: Add isActive check to authorize callback**

In `src/lib/auth.ts`, after finding the user and before password comparison, add:

```ts
const user = await db.collection("users").findOne({ email })
if (!user) return null

// Check if account is disabled
if (user.isActive === false) return null

const valid = await bcrypt.compare(password, user.passwordHash)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/__tests__/auth.test.ts
git commit -m "feat: reject login for disabled users (isActive check)"
```

---

### Task 3: Generate password utility

- [ ] **Step 1: Create the utility file**

Create `src/lib/password.ts`:
```ts
import crypto from "crypto"

export function generatePassword(length = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("")
}
```

- [ ] **Step 2: Write test**

Create `src/__tests__/password.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { generatePassword } from "@/lib/password"

describe("generatePassword", () => {
  it("returns a string of the specified length", () => {
    expect(generatePassword(12)).toHaveLength(12)
    expect(generatePassword(16)).toHaveLength(16)
  })

  it("contains at least one special character", () => {
    const pw = generatePassword(12)
    expect(pw).toMatch(/[!@#$%^&*]/)
  })

  it("generates different values each call", () => {
    const pw1 = generatePassword()
    const pw2 = generatePassword()
    expect(pw1).not.toBe(pw2)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/__tests__/password.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/password.ts src/__tests__/password.test.ts
git commit -m "feat: add password generation utility"
```

---

### Task 4: Create GET (list) + POST (create) admin users API

**Files:**
- Create: `src/app/api/admin/users/route.ts`
- Create: `src/__tests__/admin-users-api.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/admin-users-api.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the empty test file to confirm setup works**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: PASS with 0 tests (just setup)

- [ ] **Step 3: Write tests for GET route**

Add to the test file:
```ts
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
```

- [ ] **Step 4: Write tests for POST route**

Add to the test file:
```ts
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
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: FAIL — routes don't exist yet. Or at least POST tests fail etc.

- [ ] **Step 6: Implement the route**

Create `src/app/api/admin/users/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { generatePassword } from "@/lib/password"
import { sendUserWelcomeEmail } from "@/lib/email"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get("search") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")))
  const role = searchParams.get("role")
  const status = searchParams.get("status")

  const db = await connectToDatabase()
  const filter: Record<string, any> = {}

  if (search) {
    const regex = { $regex: search, $options: "i" }
    filter.$or = [{ displayName: regex }, { email: regex }]
  }

  if (role && ["admin", "user"].includes(role)) {
    filter.role = role
  }

  if (status === "active") {
    filter.$or = [{ isActive: { $exists: false } }, { isActive: true }]
  } else if (status === "disabled") {
    filter.isActive = false
  }

  const total = await db.collection("users").countDocuments(filter)
  const users = await db.collection("users")
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray()

  const mapped = users.map((u) => ({
    _id: u._id.toString(),
    email: u.email,
    displayName: u.displayName,
    role: u.role,
    isActive: u.isActive !== false,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  }))

  return NextResponse.json({
    success: true,
    data: { users: mapped, total, page, limit },
  })
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { email, displayName, role } = body

  if (!email || !displayName || !role) {
    return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
  }

  if (!["admin", "user"].includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const normalizedEmail = email.toLowerCase().trim()

  const existing = await db.collection("users").findOne({ email: normalizedEmail })
  if (existing) {
    return NextResponse.json({ success: false, error: "Email already exists" }, { status: 409 })
  }

  const password = generatePassword()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = new Date()

  const result = await db.collection("users").insertOne({
    email: normalizedEmail,
    displayName,
    passwordHash,
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  })

  // Send email (non-blocking — don't fail if email fails)
  sendUserWelcomeEmail(normalizedEmail, password).catch((err) =>
    console.error("[Admin] Failed to send welcome email:", err)
  )

  return NextResponse.json({
    success: true,
    data: {
      user: {
        _id: result.insertedId.toString(),
        email: normalizedEmail,
        displayName,
        role,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      temporaryPassword: password,
    },
  }, { status: 201 })
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/api/admin/users/route.ts src/__tests__/admin-users-api.test.ts
git commit -m "feat: add GET (list) and POST (create) admin users API"
```

---

### Task 5: Create GET/PUT/DELETE single user API route

**Files:**
- Create: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/__tests__/admin-users-api.test.ts`

- [ ] **Step 1: Write tests**

Add to `src/__tests__/admin-users-api.test.ts`:
```ts
describe("GET /api/admin/users/[id]", () => {
  it("returns 401 if not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1")
    const res = await GET(req, { params: { id: "1" } })
    expect(res.status).toBe(401)
  })

  it("returns user without passwordHash", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "1" },
        email: "u@u.com",
        displayName: "User",
        role: "user",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    })

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1")
    const res = await GET(req, { params: { id: "1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.email).toBe("u@u.com")
    expect(body.data.passwordHash).toBeUndefined()
  })

  it("returns 404 if not found", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
    })

    const { GET } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/999")
    const res = await GET(req, { params: { id: "999" } })
    expect(res.status).toBe(404)
  })
})

describe("PUT /api/admin/users/[id]", () => {
  it("updates user fields", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    const mockUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 })

    mockCollection.mockReturnValue({
      findOne: vi.fn()
        .mockResolvedValueOnce({ // existing user
          _id: { toString: () => "1" },
          email: "u@u.com",
          displayName: "Old Name",
          role: "user",
        })
        .mockResolvedValueOnce({ // updated user
          _id: { toString: () => "1" },
          email: "u@u.com",
          displayName: "New Name",
          role: "admin",
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      updateOne: mockUpdateOne,
      countDocuments: vi.fn().mockResolvedValue(2), // not last admin
    })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: "New Name", role: "admin" }),
    })
    const res = await PUT(req, { params: { id: "1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.displayName).toBe("New Name")
  })

  it("prevents disabling the last admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: (): "1" },
        email: "admin@test.com",
        role: "admin",
      }),
      countDocuments: vi.fn().mockResolvedValue(1), // only 1 admin
    })

    const { PUT } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    })
    const res = await PUT(req, { params: { id: "1" } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain("last admin")
  })
})

describe("DELETE /api/admin/users/[id]", () => {
  it("deletes user and their data", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "1" },
        email: "delete@test.com",
      }),
      countDocuments: vi.fn().mockResolvedValue(2),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 5 }),
    })

    const { DELETE } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1", { method: "DELETE" })
    const res = await DELETE(req, { params: { id: "1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it("prevents deleting the last admin", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "1" },
        email: "admin@test.com",
        role: "admin",
      }),
      countDocuments: vi.fn().mockResolvedValue(1),
    })

    const { DELETE } = await import("@/app/api/admin/users/[id]/route")
    const req = new Request("http://localhost/api/admin/users/1", { method: "DELETE" })
    const res = await DELETE(req, { params: { id: "1" } })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: FAIL — route file doesn't exist yet

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/users/[id]/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"

async function getAdminSession() {
  const session = await auth()
  if (!session?.user) return null
  if (session.user.role !== "admin") return null
  return session
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: new ObjectId(params.id) })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive !== false,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const db = await connectToDatabase()

  const user = await db.collection("users").findOne({ _id: new ObjectId(params.id) })
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  const update: Record<string, any> = {}

  if (body.displayName !== undefined) {
    update.displayName = body.displayName
  }
  if (body.role !== undefined) {
    if (!["admin", "user"].includes(body.role)) {
      return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 })
    }
    update.role = body.role
  }
  if (body.isActive !== undefined) {
    if (user.role === "admin" && body.isActive === false) {
      const adminCount = await db.collection("users").countDocuments({ role: "admin", $or: [{ isActive: { $exists: false } }, { isActive: true }] })
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, error: "Cannot disable the last admin account" }, { status: 400 })
      }
    }
    update.isActive = body.isActive
  }

  update.updatedAt = new Date()

  await db.collection("users").updateOne(
    { _id: new ObjectId(params.id) },
    { $set: update }
  )

  const updated = await db.collection("users").findOne({ _id: new ObjectId(params.id) })

  return NextResponse.json({
    success: true,
    data: {
      _id: updated!._id.toString(),
      email: updated!.email,
      displayName: updated!.displayName,
      role: updated!.role,
      isActive: updated!.isActive !== false,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    },
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: new ObjectId(params.id) })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  if (user.role === "admin") {
    const adminCount = await db.collection("users").countDocuments({ role: "admin" })
    if (adminCount <= 1) {
      return NextResponse.json({ success: false, error: "Cannot delete the last admin account" }, { status: 400 })
    }
  }

  const userId = params.id

  await db.collection("notes").deleteMany({ userId })
  await db.collection("folders").deleteMany({ userId })
  await db.collection("users").deleteOne({ _id: new ObjectId(params.id) })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/[id]/route.ts src/__tests__/admin-users-api.test.ts
git commit -m "feat: add GET, PUT, DELETE single user API"
```

---

### Task 6: Create POST /api/admin/users/[id]/reset-password route

**Files:**
- Create: `src/app/api/admin/users/[id]/reset-password/route.ts`
- Modify: `src/__tests__/admin-users-api.test.ts`

- [ ] **Step 1: Write test**

Add to `src/__tests__/admin-users-api.test.ts`:
```ts
describe("POST /api/admin/users/[id]/reset-password", () => {
  it("resets password and returns temporary password", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue({
        _id: { toString: () => "1" },
        email: "u@u.com",
      }),
      updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    })

    const { POST } = await import("@/app/api/admin/users/[id]/reset-password/route")
    const req = new Request("http://localhost/api/admin/users/1/reset-password", { method: "POST" })
    const res = await POST(req, { params: { id: "1" } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.temporaryPassword).toBeDefined()
  })

  it("returns 404 if user not found", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin1", role: "admin" } } as any)

    mockCollection.mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
    })

    const { POST } = await import("@/app/api/admin/users/[id]/reset-password/route")
    const req = new Request("http://localhost/api/admin/users/999/reset-password", { method: "POST" })
    const res = await POST(req, { params: { id: "999" } })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: FAIL — route file doesn't exist yet

- [ ] **Step 3: Implement the route**

Create `src/app/api/admin/users/[id]/reset-password/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { generatePassword } from "@/lib/password"
import { sendPasswordResetByAdminEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: new ObjectId(params.id) })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  const password = generatePassword()
  const passwordHash = await bcrypt.hash(password, 12)

  await db.collection("users").updateOne(
    { _id: new ObjectId(params.id) },
    { $set: { passwordHash, updatedAt: new Date() } }
  )

  sendPasswordResetByAdminEmail(user.email, password).catch((err) =>
    console.error("[Admin] Failed to send password reset email:", err)
  )

  return NextResponse.json({
    success: true,
    temporaryPassword: password,
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/admin-users-api.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/users/[id]/reset-password/route.ts
git commit -m "feat: add admin password reset API"
```

---

### Task 7: Create UserTable component

**Files:**
- Create: `src/app/admin/users/users-table.tsx`
- Create: `src/__tests__/users-table.test.tsx` (optional — basic render test)

- [ ] **Step 1: Create the component**

Create `src/app/admin/users/users-table.tsx`:
```tsx
"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

export interface UserRow {
  _id: string
  email: string
  displayName: string
  role: "admin" | "user"
  isActive: boolean
  createdAt: string
}

interface Props {
  users: UserRow[]
  total: number
  page: number
  limit: number
  loading: boolean
  search: string
  roleFilter: string
  statusFilter: string
  onSearchChange: (value: string) => void
  onRoleFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onToggleActive: (user: UserRow) => void
  onEdit: (user: UserRow) => void
  onResetPassword: (user: UserRow) => void
  onDelete: (user: UserRow) => void
}

export default function UsersTable({
  users, total, page, limit, loading,
  search, roleFilter, statusFilter,
  onSearchChange, onRoleFilterChange, onStatusFilterChange,
  onPageChange, onLimitChange,
  onToggleActive, onEdit, onResetPassword, onDelete,
}: Props) {
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={onRoleFilterChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full mb-2" />
                  ))}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.displayName}</td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={() => onToggleActive(u)}
                      />
                      <span className={u.isActive ? "text-green-600" : "text-red-600"}>
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onEdit(u)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onResetPassword(u)}>
                        Reset PW
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(u)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page:</span>
          <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
            <SelectTrigger className="w-16">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/users/users-table.tsx
git commit -m "feat: add users table component with search, filters, pagination"
```

---

### Task 8: Create dialog components

**Files:**
- Create: `src/app/admin/users/create-user-dialog.tsx`
- Create: `src/app/admin/users/edit-user-dialog.tsx`
- Create: `src/app/admin/users/delete-user-dialog.tsx`
- Create: `src/app/admin/users/reset-password-dialog.tsx`

- [ ] **Step 1: Create create-user-dialog.tsx**

```tsx
"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  open: boolean
  onClose: () => void
  onCreated: (user: any) => void
}

export default function CreateUserDialog({ open, onClose, onCreated }: Props) {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<{ email: string; temporaryPassword: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, displayName, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to create user")
        return
      }

      setResult({ email: data.data.user.email, temporaryPassword: data.data.temporaryPassword })
      onCreated(data.data.user)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setEmail("")
    setDisplayName("")
    setRole("user")
    setError("")
    setResult(null)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>User Created</DialogTitle>
              <DialogDescription>
                The user has been created. Share the temporary password with them.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p className="text-sm"><strong>Email:</strong> {result.email}</p>
              <p className="text-sm"><strong>Temporary password:</strong> <code className="bg-background px-2 py-0.5 rounded">{result.temporaryPassword}</code></p>
              <p className="text-xs text-muted-foreground">An email has also been sent to the user.</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Enter the details for the new user account.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create edit-user-dialog.tsx**

```tsx
"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { UserRow } from "./users-table"

interface Props {
  open: boolean
  user: UserRow | null
  onClose: () => void
  onUpdated: (user: any) => void
}

export default function EditUserDialog({ open, user, onClose, onUpdated }: Props) {
  const [displayName, setDisplayName] = useState("")
  const [role, setRole] = useState("user")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName)
      setRole(user.role)
      setError("")
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, role }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update user")
        return
      }

      onUpdated(data.data)
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Display Name</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 3: Create delete-user-dialog.tsx**

```tsx
"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { UserRow } from "./users-table"

interface Props {
  open: boolean
  user: UserRow | null
  onClose: () => void
  onDeleted: (userId: string) => void
}

export default function DeleteUserDialog({ open, user, onClose, onDeleted }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleDelete() {
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${user._id}`, { method: "DELETE" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to delete user")
        return
      }

      onDeleted(user._id)
      onClose()
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete <strong>{user?.displayName}</strong> ({user?.email})?
            This will also delete all of their notes and folders. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600 px-6">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Create reset-password-dialog.tsx**

```tsx
"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { UserRow } from "./users-table"

interface Props {
  open: boolean
  user: UserRow | null
  onClose: () => void
}

export default function ResetPasswordDialog({ open, user, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<string | null>(null)

  async function handleReset() {
    if (!user) return
    setLoading(true)
    setError("")

    try {
      const res = await fetch(`/api/admin/users/${user._id}/reset-password`, { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to reset password")
        return
      }

      setResult(data.temporaryPassword)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setResult(null)
    setError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader>
              <DialogTitle>Password Reset</DialogTitle>
              <DialogDescription>
                The password has been reset. Share the new temporary password with the user.
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Temporary password:</strong>{" "}
                <code className="bg-background px-2 py-0.5 rounded">{result}</code>
              </p>
              <p className="text-xs text-muted-foreground mt-2">An email has also been sent.</p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Generate a new temporary password for <strong>{user?.displayName}</strong>?
                An email will be sent to {user?.email} with the new credentials.
              </DialogDescription>
            </DialogHeader>
            {error && <p className="text-sm text-red-600 px-6">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleReset} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/users/create-user-dialog.tsx src/app/admin/users/edit-user-dialog.tsx src/app/admin/users/delete-user-dialog.tsx src/app/admin/users/reset-password-dialog.tsx
git commit -m "feat: add user management dialog components"
```

---

### Task 9: Rewrite the user management page

**Files:**
- Modify: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Rewrite page.tsx**

```tsx
"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import UsersTable, { type UserRow } from "./users-table"
import CreateUserDialog from "./create-user-dialog"
import EditUserDialog from "./edit-user-dialog"
import DeleteUserDialog from "./delete-user-dialog"
import ResetPasswordDialog from "./reset-password-dialog"

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null)
  const [resetPwUser, setResetPwUser] = useState<UserRow | null>(null)

  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(limit))
      if (search) params.set("search", search)
      if (roleFilter !== "all") params.set("role", roleFilter)
      if (statusFilter !== "all") params.set("status", statusFilter)

      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.data.users)
        setTotal(data.data.total)
      }
    } catch (err) {
      console.error("Failed to fetch users:", err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, roleFilter, statusFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function handleSearchChange(value: string) {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }

  async function handleToggleActive(user: UserRow) {
    try {
      const res = await fetch(`/api/admin/users/${user._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u._id === user._id ? { ...u, isActive: !u.isActive } : u))
        )
      }
    } catch (err) {
      console.error("Failed to toggle user status:", err)
    }
  }

  function handleUserCreated(user: any) {
    setUsers((prev) => [user, ...prev])
    setTotal((t) => t + 1)
  }

  function handleUserUpdated(user: any) {
    setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, ...user } : u)))
  }

  function handleUserDeleted(userId: string) {
    setUsers((prev) => prev.filter((u) => u._id !== userId))
    setTotal((t) => t - 1)
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage user accounts, passwords, and access.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <UsersTable
        users={users}
        total={total}
        page={page}
        limit={limit}
        loading={loading}
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onSearchChange={handleSearchChange}
        onRoleFilterChange={(v) => { setRoleFilter(v); setPage(1) }}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1) }}
        onPageChange={setPage}
        onLimitChange={(v) => { setLimit(v); setPage(1) }}
        onToggleActive={handleToggleActive}
        onEdit={setEditUser}
        onResetPassword={setResetPwUser}
        onDelete={setDeleteUser}
      />

      <CreateUserDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleUserCreated}
      />

      <EditUserDialog
        open={!!editUser}
        user={editUser}
        onClose={() => setEditUser(null)}
        onUpdated={handleUserUpdated}
      />

      <DeleteUserDialog
        open={!!deleteUser}
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDeleted={handleUserDeleted}
      />

      <ResetPasswordDialog
        open={!!resetPwUser}
        user={resetPwUser}
        onClose={() => setResetPwUser(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/users/page.tsx
git commit -m "feat: wire up user management page with live data"
```

---

### Plan Self-Review

Check against spec requirements:
- ✅ User model: `isActive` field added (handled in auth + API)
- ✅ GET list: search, pagination, role/status filters
- ✅ POST create: auto-generate password, email user, return temporary password
- ✅ GET single: returns user without passwordHash
- ✅ PUT update: displayName, role, isActive; last admin guard
- ✅ DELETE: hard delete user + data; last admin guard
- ✅ POST reset-password: generate, email, return password
- ✅ Auth: reject disabled users at login
- ✅ Email: welcome + reset templates via Resend
- ✅ UI: table + search/filters + pagination + modals
