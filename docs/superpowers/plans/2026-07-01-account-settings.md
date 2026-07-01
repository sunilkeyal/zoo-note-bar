# Account Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the Account menu item in the sidebar dropdown, wiring it to a slide-out sheet where users can update their display name, email, and password.

**Architecture:** A new `AccountSheet` client component renders a fixed right-side drawer. A new `PATCH /api/account` route handles updates; it verifies the session, validates inputs, updates MongoDB, and returns which fields changed. The sidebar mounts the sheet and passes open/close state.

**Tech Stack:** Next.js 15 App Router, NextAuth v5 (next-auth), MongoDB (native driver), bcryptjs, React, Tailwind CSS, Vitest + Testing Library

## Global Constraints

- All new files use TypeScript strict mode — no `any` except where existing codebase already uses it
- Test files live in `src/__tests__/`, follow Vitest + Testing Library patterns matching existing tests
- Run `npx vitest run` (not `npm test`) to execute the test suite
- Passwords hashed with bcrypt, 12 salt rounds
- Emails stored lowercase + trimmed
- Branch: `feature/account-settings`

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `src/lib/auth.config.ts` | Handle `trigger: 'update'` in jwt callback so name-only changes reflect without sign-out |
| Create | `src/app/api/account/route.ts` | `PATCH` handler — validates, updates DB, returns `changed[]` |
| Create | `src/__tests__/api-account.test.ts` | Unit tests for the API route |
| Create | `src/components/AccountSheet.tsx` | Slide-out sheet UI component |
| Create | `src/__tests__/account-sheet.test.tsx` | Unit tests for AccountSheet |
| Modify | `src/components/NotesSidebar.tsx` | Enable Account item, move above Settings, mount AccountSheet |
| Modify | `src/__tests__/notes-sidebar.test.tsx` | Add AccountSheet mock, add Account item tests |
| Delete | `src/app/acc-visuals/page.tsx` | Brainstorming artifact — remove |

---

## Task 1: API Route — `PATCH /api/account`

**Files:**
- Modify: `src/lib/auth.config.ts`
- Create: `src/app/api/account/route.ts`
- Create: `src/__tests__/api-account.test.ts`

**Interfaces:**
- Produces: `PATCH /api/account` accepts `{ name?, email?, currentPassword?, newPassword? }`, returns `{ changed: string[] }` or `{ error: string }`

---

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/api-account.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"

const mockFindOne = vi.fn()
const mockUpdateOne = vi.fn()
const mockCollection = vi.fn(() => ({
  findOne: mockFindOne,
  updateOne: mockUpdateOne,
}))
const mockDb = { collection: mockCollection }

vi.mock("@/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(mockDb),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue("hashed_new_password"),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("PATCH /api/account", () => {
  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue(null)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "Test" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized.")
  })

  it("returns 400 when name is empty string", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "   " }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Name is required.")
  })

  it("returns 400 for invalid email format", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "not-an-email" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid email format.")
  })

  it("returns 400 when newPassword provided without currentPassword", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ newPassword: "newpass123" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Current password is required to change your password.")
  })

  it("returns 400 when newPassword is fewer than 8 characters", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ currentPassword: "old", newPassword: "short" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("New password must be at least 8 characters.")
  })

  it("returns 400 when currentPassword is incorrect", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })

    const bcrypt = await import("bcryptjs")
    vi.mocked(bcrypt.default.compare).mockResolvedValue(false as never)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ currentPassword: "wrongpass", newPassword: "newpassword123" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Incorrect current password.")
  })

  it("returns 409 when new email is already taken", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    // First findOne: current user. Second findOne: email conflict check.
    mockFindOne
      .mockResolvedValueOnce({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
      .mockResolvedValueOnce({ _id: "other-id", email: "taken@example.com" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "taken@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe("An account with this email already exists.")
  })

  it("updates name only and returns changed: ['name']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old Name", email: "old@example.com", passwordHash: "hash" })
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "New Name" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["name"])
  })

  it("updates email and returns changed: ['email']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne
      .mockResolvedValueOnce({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
      .mockResolvedValueOnce(null) // email not taken
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ email: "new@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["email"])
  })

  it("updates password and returns changed: ['password']", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Old", email: "old@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Old", email: "old@example.com", passwordHash: "hash" })
    mockUpdateOne.mockResolvedValue({ modifiedCount: 1 })

    const bcrypt = await import("bcryptjs")
    vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never)

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ currentPassword: "oldpass", newPassword: "newpassword123" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual(["password"])
  })

  it("returns changed: [] when nothing has actually changed", async () => {
    const { auth } = await import("@/lib/auth")
    vi.mocked(auth).mockResolvedValue({ user: { id: "507f1f77bcf86cd799439011", name: "Same", email: "same@example.com" } } as any)
    mockFindOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011", displayName: "Same", email: "same@example.com", passwordHash: "hash" })

    const { PATCH } = await import("@/app/api/account/route")
    const req = new Request("http://localhost/api/account", { method: "PATCH", body: JSON.stringify({ name: "Same", email: "same@example.com" }) })
    const res = await PATCH(req as any)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.changed).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/sunil.keyal@optum.com/Projects/sunilkeyal/zoo-note
npx vitest run src/__tests__/api-account.test.ts
```

Expected: all tests fail with import/module errors (route doesn't exist yet).

- [ ] **Step 3: Update `auth.config.ts` jwt callback to handle name updates**

In `src/lib/auth.config.ts`, update the `jwt` callback signature and body:

```typescript
// Before:
async jwt({ token, user }) {
  if (user) {
    token.role = (user as { role: string }).role
    token.id = user.id
  }
  return token
},

// After:
async jwt({ token, user, trigger, session }) {
  if (user) {
    token.role = (user as { role: string }).role
    token.id = user.id
  }
  if (trigger === "update" && (session as { name?: string })?.name) {
    token.name = (session as { name: string }).name
  }
  return token
},
```

- [ ] **Step 4: Create `src/app/api/account/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  let body: { name?: string; email?: string; currentPassword?: string; newPassword?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  const { name, email, currentPassword, newPassword } = body

  if (name !== undefined && name.trim() === "") {
    return NextResponse.json({ error: "Name is required." }, { status: 400 })
  }

  if (email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format." }, { status: 400 })
    }
  }

  if (newPassword !== undefined) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required to change your password." },
        { status: 400 }
      )
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      )
    }
  }

  const db = await connectToDatabase()
  const userId = new ObjectId(session.user.id)
  const user = await db.collection("users").findOne({ _id: userId })

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }

  const changed: string[] = []
  const update: Record<string, unknown> = { updatedAt: new Date().toISOString() }

  if (newPassword !== undefined) {
    const valid = await bcrypt.compare(currentPassword!, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: "Incorrect current password." }, { status: 400 })
    }
    update.passwordHash = await bcrypt.hash(newPassword, 12)
    changed.push("password")
  }

  if (email !== undefined) {
    const normalizedEmail = email.toLowerCase().trim()
    if (normalizedEmail !== user.email) {
      const existing = await db
        .collection("users")
        .findOne({ email: normalizedEmail, _id: { $ne: userId } })
      if (existing) {
        return NextResponse.json(
          { error: "An account with this email already exists." },
          { status: 409 }
        )
      }
      update.email = normalizedEmail
      changed.push("email")
    }
  }

  if (name !== undefined && name.trim() !== user.displayName) {
    update.displayName = name.trim()
    changed.push("name")
  }

  if (changed.length > 0) {
    await db.collection("users").updateOne({ _id: userId }, { $set: update })
  }

  return NextResponse.json({ changed })
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/api-account.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.config.ts src/app/api/account/route.ts src/__tests__/api-account.test.ts
git commit -m "feat: add PATCH /api/account route with tests"
```

---

## Task 2: AccountSheet Component

**Files:**
- Create: `src/components/AccountSheet.tsx`
- Create: `src/__tests__/account-sheet.test.tsx`

**Interfaces:**
- Consumes: `PATCH /api/account` (from Task 1) — `{ name?, email?, currentPassword?, newPassword? }` → `{ changed: string[] }`
- Produces: `AccountSheet({ open: boolean, onClose: () => void })` — default export

---

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/account-sheet.test.tsx`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

const mockUpdate = vi.fn()
const mockSignOut = vi.fn()

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { name: "Test User", email: "test@example.com" } },
    update: mockUpdate,
  })),
  signOut: mockSignOut,
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  vi.clearAllMocks()
})

describe("AccountSheet", () => {
  it("renders nothing when open=false", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const { container } = render(<AccountSheet open={false} onClose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders the sheet with prefilled name and email when open=true", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument()
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument()
  })

  it("calls onClose when Cancel is clicked", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const onClose = vi.fn()
    render(<AccountSheet open={true} onClose={onClose} />)
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("calls onClose when the overlay is clicked", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    const onClose = vi.fn()
    render(<AccountSheet open={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText("Close account sheet overlay"))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it("shows validation error when name is cleared on submit", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    await userEvent.clear(nameInput)
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("Name is required.")).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("shows validation error when passwords don't match", async () => {
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const inputs = screen.getAllByPlaceholderText(/password/i)
    await userEvent.type(inputs[0], "currentpass")
    await userEvent.type(inputs[1], "newpassword1")
    await userEvent.type(inputs[2], "differentpass")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("calls fetch with correct body on valid name-only submit", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["name"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "New Name")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith(
      "/api/account",
      expect.objectContaining({ method: "PATCH" })
    ))
    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(callBody.name).toBe("New Name")
  })

  it("calls update() and shows success message on name-only change", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["name"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const nameInput = screen.getByDisplayValue("Test User")
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, "New Name")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith({ name: "New Name" }))
    expect(screen.getByText("Account updated.")).toBeInTheDocument()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it("calls signOut when email is changed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["email"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const emailInput = screen.getByDisplayValue("test@example.com")
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, "new@example.com")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }))
  })

  it("calls signOut when password is changed", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ changed: ["password"] }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const inputs = screen.getAllByPlaceholderText(/password/i)
    await userEvent.type(inputs[0], "currentpass")
    await userEvent.type(inputs[1], "newpassword1")
    await userEvent.type(inputs[2], "newpassword1")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/login" }))
  })

  it("shows inline error when email is already taken (409)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "An account with this email already exists." }),
    })
    const { default: AccountSheet } = await import("@/components/AccountSheet")
    render(<AccountSheet open={true} onClose={() => {}} />)
    const emailInput = screen.getByDisplayValue("test@example.com")
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, "taken@example.com")
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }))
    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/__tests__/account-sheet.test.tsx
```

Expected: all tests fail — component doesn't exist yet.

- [ ] **Step 3: Create `src/components/AccountSheet.tsx`**

```typescript
"use client"

import { useState, useEffect } from "react"
import { X, Eye, EyeOff } from "lucide-react"
import { useSession, signOut } from "next-auth/react"

interface AccountSheetProps {
  open: boolean
  onClose: () => void
}

export default function AccountSheet({ open, onClose }: AccountSheetProps) {
  const { data: session, update } = useSession()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successMsg, setSuccessMsg] = useState("")
  const [loading, setLoading] = useState(false)

  // Re-populate from session whenever the sheet opens
  useEffect(() => {
    if (open) {
      setName(session?.user?.name ?? "")
      setEmail(session?.user?.email ?? "")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setErrors({})
      setSuccessMsg("")
    }
  }, [open, session?.user?.name, session?.user?.email])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = "Name is required."
    if (!email.trim()) {
      errs.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Invalid email format."
    }
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) errs.currentPassword = "Current password is required."
      if (newPassword.length < 8) errs.newPassword = "New password must be at least 8 characters."
      if (newPassword !== confirmPassword) errs.confirmPassword = "Passwords do not match."
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setSuccessMsg("")
    setErrors({})

    const body: Record<string, string> = { name, email }
    if (newPassword) {
      body.currentPassword = currentPassword
      body.newPassword = newPassword
    }

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    setLoading(false)
    const data = await res.json()

    if (!res.ok) {
      if (res.status === 409) {
        setErrors({ email: data.error })
      } else if (data.error?.toLowerCase().includes("password")) {
        setErrors({ currentPassword: data.error })
      } else {
        setErrors({ form: data.error })
      }
      return
    }

    const { changed } = data as { changed: string[] }

    if (changed.includes("email") || changed.includes("password")) {
      await signOut({ callbackUrl: "/login" })
    } else {
      if (changed.includes("name")) {
        await update({ name })
      }
      setSuccessMsg("Account updated.")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-label="Close account sheet overlay"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-label="Account settings"
        className="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Account</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form wraps scrollable body + sticky footer */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
            {/* Avatar row */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0 select-none">
                {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {session?.user?.name ?? "User"}
                </p>
                <p className="text-xs text-gray-400">{session?.user?.email ?? ""}</p>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Display name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ${
                  errors.email
                    ? "border-red-400 focus:ring-red-400"
                    : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                }`}
              />
              {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
            </div>

            <hr className="border-gray-100 dark:border-gray-800" />

            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Change password
            </p>

            {/* Current password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Current password
              </label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 pr-8 ${
                    errors.currentPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-red-500">{errors.currentPassword}</p>
              )}
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                New password
              </label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 pr-8 ${
                    errors.newPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-500">{errors.newPassword}</p>}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Confirm new password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className={`w-full rounded-md border bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 pr-8 ${
                    errors.confirmPassword
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {errors.form && <p className="text-xs text-red-500">{errors.form}</p>}
            {successMsg && <p className="text-xs text-green-600">{successMsg}</p>}
          </div>

          {/* Sticky footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex flex-col gap-2 shrink-0">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run src/__tests__/account-sheet.test.tsx
```

Expected: all 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/AccountSheet.tsx src/__tests__/account-sheet.test.tsx
git commit -m "feat: add AccountSheet slide-out component with tests"
```

---

## Task 3: Wire NotesSidebar + Cleanup

**Files:**
- Modify: `src/components/NotesSidebar.tsx`
- Modify: `src/__tests__/notes-sidebar.test.tsx`
- Delete: `src/app/acc-visuals/page.tsx`

**Interfaces:**
- Consumes: `AccountSheet({ open: boolean, onClose: () => void })` from Task 2

---

- [ ] **Step 1: Add AccountSheet mock to the sidebar test and add new assertions**

Open `src/__tests__/notes-sidebar.test.tsx`. After the existing `vi.mock` blocks (before the first `describe`), add:

```typescript
vi.mock('@/components/AccountSheet', () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="account-sheet">
        <button onClick={onClose}>Close Account</button>
      </div>
    ) : null,
}))
```

Then add a new `describe` block at the end of the file (after existing describe blocks):

```typescript
describe("Account menu item", () => {
  beforeEach(() => {
    const { useNotes } = require('@/contexts/NoteContext')
    vi.mocked(useNotes).mockReturnValue({
      notes: [], folders: [], createNote: vi.fn(), updateNote: vi.fn(),
      deleteNote: vi.fn(), createFolder: vi.fn(), updateFolder: vi.fn(),
      deleteFolder: vi.fn(), reorderNotes: vi.fn(), reorderFolders: vi.fn(),
      moveNoteToFolder: vi.fn(), restoreNote: vi.fn(), restoreFolder: vi.fn(),
    })
    const { useSession } = require('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: { user: { name: 'Test User', email: 'test@example.com', role: 'user' } },
      status: 'authenticated',
    })
  })

  it("renders Account menu item (not disabled)", () => {
    render(<NotesSidebar />)
    // Open the user dropdown by clicking the trigger
    const trigger = screen.getByText('Test User')
    fireEvent.click(trigger)
    const accountItem = screen.getByText('Account')
    expect(accountItem.closest('[data-disabled]')).toBeNull()
  })

  it("opens AccountSheet when Account item is clicked", async () => {
    render(<NotesSidebar />)
    const trigger = screen.getByText('Test User')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByText('Account'))
    expect(await screen.findByTestId('account-sheet')).toBeInTheDocument()
  })

  it("closes AccountSheet when sheet's close is triggered", async () => {
    render(<NotesSidebar />)
    const trigger = screen.getByText('Test User')
    fireEvent.click(trigger)
    fireEvent.click(screen.getByText('Account'))
    expect(await screen.findByTestId('account-sheet')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Close Account'))
    expect(screen.queryByTestId('account-sheet')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the sidebar tests to confirm the new ones fail**

```bash
npx vitest run src/__tests__/notes-sidebar.test.tsx
```

Expected: the three new Account tests fail; existing tests still pass.

- [ ] **Step 3: Modify NotesSidebar.tsx — import AccountSheet and add state**

At the top of `src/components/NotesSidebar.tsx`, add the import after the existing imports:

```typescript
import AccountSheet from "./AccountSheet"
```

Inside the `NotesSidebar` function body, add the state (near the other `useState` calls):

```typescript
const [accountOpen, setAccountOpen] = useState(false)
```

- [ ] **Step 4: Update the dropdown menu items — move Account above Settings, enable it**

Find the `DropdownMenuSeparator` and the two disabled items in the footer. Replace:

```typescript
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <Settings /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <UserIcon /> Account
                  </DropdownMenuItem>
```

With:

```typescript
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAccountOpen(true)}>
                    <UserIcon /> Account
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <Settings /> Settings
                  </DropdownMenuItem>
```

- [ ] **Step 5: Render AccountSheet adjacent to the Sidebar**

Find the closing `</>` fragment at the bottom of the NotesSidebar return statement (after the `<DeleteFolderDialog>`). Add `<AccountSheet>` just before it:

```typescript
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      <DeleteConfirmDialog ... />
      <DeleteFolderDialog ... />
    </>
```

The exact location — find this section at the bottom of the return:

```typescript
      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
    </>
```

Replace with:

```typescript
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
      <DeleteConfirmDialog open={deleteNoteTarget !== null} onClose={() => setDeleteNoteTarget(null)} onConfirm={handleDeleteNote} />
      <DeleteFolderDialog open={deleteFolderTarget !== null} folderName={deleteFolderTarget?.name || ""}
        notesCount={deleteFolderTarget ? notes.filter((n) => n.folderId === deleteFolderTarget._id).length : 0}
        onClose={() => setDeleteFolderTarget(null)} onConfirm={handleDeleteFolder} />
    </>
```

- [ ] **Step 6: Delete the acc-visuals brainstorming page**

```bash
rm src/app/acc-visuals/page.tsx
rmdir src/app/acc-visuals
```

- [ ] **Step 7: Run all sidebar tests**

```bash
npx vitest run src/__tests__/notes-sidebar.test.tsx
```

Expected: all tests pass including the three new Account tests.

- [ ] **Step 8: Run the full test suite**

```bash
npx vitest run
```

Expected: all tests pass (no regressions).

- [ ] **Step 9: Verify the feature in the browser**

1. Open [http://localhost:3000](http://localhost:3000) and sign in
2. Click your name in the bottom-left of the sidebar
3. Confirm "Account" appears **above** Settings in the dropdown and is clickable
4. Click Account — the sheet slides in from the right
5. Verify name and email are pre-filled
6. Test name update: change name, save → sidebar avatar initial updates, no sign-out
7. Test email update: change email, save → signs out, redirected to login
8. Test password update: fill all three password fields, save → signs out
9. Test email-already-exists: use an email from another account → inline error appears
10. Test password mismatch: mismatched confirm → inline error, no submit

- [ ] **Step 10: Commit**

```bash
git add src/components/NotesSidebar.tsx src/__tests__/notes-sidebar.test.tsx
git commit -m "feat: wire AccountSheet into NotesSidebar, enable Account menu item"
git add -A
git commit -m "chore: remove acc-visuals brainstorming page"
```
