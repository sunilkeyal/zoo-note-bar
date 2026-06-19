import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { processImportFile } from "@/lib/import"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const formData = await request.formData()
  const files = formData.getAll("files") as File[]

  if (files.length === 0) {
    return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processImportFile(buffer, file.name)

    if (result.error) {
      errors.push(result.error)
      continue
    }

    for (const parsed of result.notes) {
      if (!parsed.title && !parsed.content) {
        skipped++
        continue
      }

      let folderId: string | undefined
      if (parsed.folder) {
        const existingFolder = await foldersCollection.findOne({
          userId: session.user.id,
          name: parsed.folder,
          isDeleted: { $ne: true },
        })
        if (existingFolder) {
          folderId = existingFolder._id.toString()
        } else {
          const now = new Date()
          const result = await foldersCollection.insertOne({
            name: parsed.folder,
            userId: session.user.id,
            createdAt: now,
            updatedAt: now,
          })
          folderId = result.insertedId.toString()
        }
      }

      const title = parsed.title || file.name.replace(/\.md$/i, "")

      const now = new Date()
      const doc: Record<string, unknown> = {
        title,
        content: parsed.content || "",
        position: 0,
        userId: session.user.id,
        createdAt: now,
        updatedAt: now,
      }
      if (folderId) doc.folderId = folderId

      await notesCollection.insertOne(doc)
      imported++
    }
  }

  return NextResponse.json({
    success: true,
    data: { imported, skipped, errors },
  })
}
