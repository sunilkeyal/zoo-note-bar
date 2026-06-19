import { NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { auth } from "@/lib/auth"
import { convertHtmlToMarkdown, generateFrontMatter } from "@/lib/export"
import { generatePdf } from "@/lib/pdf"
import { ObjectId } from "mongodb"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const format = request.nextUrl.searchParams.get("format") || "markdown"

  const db = await connectToDatabase()
  const collection = db.collection("notes")

  const note = await collection.findOne({
    _id: new ObjectId(id),
    userId: session.user.id,
    isDeleted: { $ne: true },
  })

  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found" }, { status: 404 })
  }

  if (format === "markdown") {
    const frontMatter = generateFrontMatter(note.title)
    const markdownBody = convertHtmlToMarkdown(note.content || "")
    const content = frontMatter + markdownBody

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${note.title}.md"`,
      },
    })
  }

  if (format === "pdf") {
    const pdfBuffer = await generatePdf(note.content || "<p></p>")
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${note.title}.pdf"`,
      },
    })
  }

  return NextResponse.json({ success: false, error: "Invalid format" }, { status: 400 })
}
