import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { generateExportZip } from "@/lib/export"
import { Note, Folder } from "@/types"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const db = await connectToDatabase()
  const notesCollection = db.collection("notes")
  const foldersCollection = db.collection("folders")

  const [notes, folders] = await Promise.all([
    notesCollection
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .sort({ position: 1, updatedAt: -1 })
      .toArray(),
    foldersCollection
      .find({ userId: session.user.id, isDeleted: { $ne: true } })
      .toArray(),
  ])

  const mappedNotes: Note[] = notes.map((n) => ({
    _id: n._id.toString(),
    title: n.title,
    content: n.content || "",
    folderId: n.folderId || undefined,
    userId: n.userId || undefined,
    position: n.position ?? 0,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  }))

  const mappedFolders: Folder[] = folders.map((f) => ({
    _id: f._id.toString(),
    name: f.name,
    userId: f.userId || undefined,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  }))

  if (mappedNotes.length === 0) {
    return NextResponse.json({ success: false, error: "No notes to export" }, { status: 404 })
  }

  const zipBuffer = await generateExportZip(mappedNotes, mappedFolders)

  const dateStr = new Date().toISOString().slice(0, 10)
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="notes-export-${dateStr}.zip"`,
    },
  })
}
