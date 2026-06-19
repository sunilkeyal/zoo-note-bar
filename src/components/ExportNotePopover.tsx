"use client"

import React, { useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Note } from "@/types"
import { Download, FileText, File } from "lucide-react"

interface Props {
  note: Note
  children: React.ReactElement
}

type ExportFormat = "markdown" | "pdf"

export default function ExportNotePopover({ note, children }: Props) {
  const [format, setFormat] = useState<ExportFormat>("markdown")
  const [exporting, setExporting] = useState(false)
  const [open, setOpen] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/notes/${note._id}/export?format=${format}`)
      if (!res.ok) throw new Error("Export failed")

      const blob = await res.blob()
      const ext = format === "markdown" ? "md" : "pdf"
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${note.title}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={children} />
      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-sm font-medium mb-3">Export "{note.title}" as:</p>
        <div className="flex flex-col gap-1 mb-3">
          <button
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              format === "markdown"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setFormat("markdown")}
          >
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">Markdown (.md)</div>
              <div className="text-xs text-muted-foreground">Plain text with front matter</div>
            </div>
          </button>
          <button
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              format === "pdf"
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setFormat("pdf")}
          >
            <File className="h-4 w-4 text-red-600" />
            <div className="text-left">
              <div className="font-medium">PDF</div>
              <div className="text-xs text-muted-foreground">Styled like editor rendering</div>
            </div>
          </button>
        </div>
        <Button
          className="w-full"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export"}
        </Button>
      </PopoverContent>
    </Popover>
  )
}
