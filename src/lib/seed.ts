import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"

let seedingDone = false
let seedingPromise: Promise<void> | null = null

export async function ensureAdmin() {
  if (seedingDone) return
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    try {
      const db = await connectToDatabase()
      const existing = await db.collection("users").countDocuments()
      if (existing === 0) {
        const password = process.env.ADMIN_PASSWORD || "admin123"
        const hash = await bcrypt.hash(password, 12)
        await db.collection("users").insertOne({
          username: "admin",
          email: "admin@example.com",
          displayName: "Admin User",
          passwordHash: hash,
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
      seedingDone = true
    } catch (err) {
      seedingPromise = null
      console.error("Failed to seed admin user:", err)
    }
  })()

  return seedingPromise
}
