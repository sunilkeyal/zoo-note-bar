import TurndownService from "turndown"
import { Note, Folder } from "@/types"
import * as yaml from "js-yaml"
import * as archiver from "archiver"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
})

export function convertHtmlToMarkdown(html: string): string {
  return turndown.turndown(html || "")
}

export function generateFrontMatter(title: string, folderName?: string): string {
  const data: Record<string, string> = { title }
  if (folderName) {
    data.folder = folderName
  }
  return "---\n" + yaml.dump(data) + "---\n\n"
}

export async function generateExportZip(
  notes: Note[],
  folders: Folder[]
): Promise<Buffer> {
  const folderMap = new Map(folders.map((f) => [f._id, f.name]))

  return new Promise((resolve, reject) => {
    const archive = new archiver.ZipArchive({ zlib: { level: 9 } })
    const chunks: Buffer[] = []

    archive.on("data", (chunk: Buffer) => chunks.push(chunk))
    archive.on("end", () => resolve(Buffer.concat(chunks)))
    archive.on("error", reject)

    for (const note of notes) {
      const folderName = note.folderId ? folderMap.get(note.folderId) : undefined
      const frontMatter = generateFrontMatter(note.title, folderName)
      const markdownBody = convertHtmlToMarkdown(note.content)
      const content = frontMatter + markdownBody
      const filename = folderName
        ? `${folderName}/${note.title}.md`
        : `${note.title}.md`

      archive.append(content, { name: filename })
    }

    archive.finalize()
  })
}
