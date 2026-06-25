import { NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { auth } from "@/lib/auth"
import { connectToDatabase } from "@/lib/mongodb"
import bcrypt from "bcryptjs"
import { generatePassword } from "@/lib/password"
import { sendPasswordResetByAdminEmail } from "@/lib/email"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  let objectId: ObjectId
  try {
    objectId = new ObjectId(id)
  } catch {
    return NextResponse.json({ success: false, error: "Invalid user ID format" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const user = await db.collection("users").findOne({ _id: objectId })

  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
  }

  const password = generatePassword()
  const passwordHash = await bcrypt.hash(password, 12)

  await db.collection("users").updateOne(
    { _id: objectId },
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
