"use client"

import React, { useState } from "react"

const sample = [
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump! The five boxing wizards jump quickly. Sphinx of black quartz, judge my vow.",
  "Writing notes is a deeply personal practice. The way text appears on screen — its size, its rhythm, its breathing room — shapes how we think and revisit our ideas. Good typography fades into the background so the words can speak.",
  "This is the third paragraph in each sample. Notice how the spacing between paragraphs changes across options. Some feel airy and editorial, others tight and data-dense. The right choice depends on what feels most comfortable for extended reading.",
]

interface StyleOption {
  name: string
  desc: string
  p: React.CSSProperties
  gapBetween?: number
}

const styles: StyleOption[] = [
  {
    name: "Default (current)",
    desc: "16px, 1.75 line-height, 8px bottom margin",
    p: { fontSize: 16, lineHeight: 1.75, marginBottom: 8 },
  },
  {
    name: "Shadcn Paragraph",
    desc: "14px, 28px line-height, 24px between paragraphs (not first)",
    p: { fontSize: 14, lineHeight: "28px", margin: 0 },
    gapBetween: 24,
  },
  {
    name: "Compact & Dense",
    desc: "14px, 1.5 line-height, 6px bottom margin",
    p: { fontSize: 14, lineHeight: 1.5, marginBottom: 6 },
  },
  {
    name: "Generous Reading",
    desc: "16px, 1.8 line-height, 16px bottom margin",
    p: { fontSize: 16, lineHeight: 1.8, marginBottom: 16 },
  },
  {
    name: "Editorial Classic",
    desc: "15px, 1.7 line-height, 12px bottom margin, justified",
    p: { fontSize: 15, lineHeight: 1.7, marginBottom: 12, textAlign: "justify" },
  },
  {
    name: "Airy & Spacious",
    desc: "15px, 2.0 line-height, 20px bottom margin",
    p: { fontSize: 15, lineHeight: 2.0, marginBottom: 20 },
  },
  {
    name: "Slim & Modern",
    desc: "13px, 1.6 line-height, 10px bottom margin, muted",
    p: { fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: "#555" },
  },
  {
    name: "Typewriter",
    desc: "16px, 1.6 line-height, 8px bottom margin, serif",
    p: { fontSize: 16, lineHeight: 1.6, marginBottom: 8, fontFamily: "Georgia, 'Times New Roman', serif" },
  },
  {
    name: "Data-Dense",
    desc: "13px, 1.4 line-height, 4px bottom margin",
    p: { fontSize: 13, lineHeight: 1.4, marginBottom: 4 },
  },
  {
    name: "Relaxed Prose",
    desc: "16.5px, 1.85 line-height, 14px bottom margin",
    p: { fontSize: 16.5, lineHeight: 1.85, marginBottom: 14 },
  },
  {
    name: "Indented Prose",
    desc: "15px, 1.75 line-height, 10px bottom margin, 2rem text-indent",
    p: { fontSize: 15, lineHeight: 1.75, marginBottom: 10, textIndent: "2rem" },
  },
  {
    name: "Wide Tracking",
    desc: "14px, 1.7 line-height, 12px bottom margin, 0.3px letter-spacing",
    p: { fontSize: 14, lineHeight: 1.7, marginBottom: 12, letterSpacing: "0.3px" },
  },
  {
    name: "Large Print",
    desc: "17px, 1.9 line-height, 18px bottom margin",
    p: { fontSize: 17, lineHeight: 1.9, marginBottom: 18 },
  },
  {
    name: "Minimal",
    desc: "14.5px, 1.65 line-height, 8px bottom margin, lighter weight",
    p: { fontSize: 14.5, lineHeight: 1.65, marginBottom: 8, fontWeight: 350 },
  },
]

export default function StylePreview() {
  const [selected, setSelected] = useState<number | null>(null)
  const [previewText, setPreviewText] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-lg font-semibold">Paragraph Style Preview</h1>
            <p className="text-xs text-muted-foreground">
              {selected !== null ? `Previewing: ${styles[selected].name}` : "Click a style to select it"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={previewText} onChange={(e) => setPreviewText(e.target.checked)} />
              Show raw text
            </label>
            <a href="/" className="text-xs text-muted-foreground underline-offset-4 hover:underline">
              Back to notes
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-4">
          {styles.map((s, i) => {
            const isSelected = selected === i
            return (
              <button
                key={i}
                onClick={() => setSelected(isSelected ? null : i)}
                className={`block w-full rounded-lg border p-5 text-left transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-ring/50"
                }`}
              >
                <div className="mb-3 flex items-baseline gap-3">
                  <span className="text-sm font-semibold">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.desc}</span>
                  {isSelected && (
                    <span className="ml-auto text-xs font-medium text-primary">Selected</span>
                  )}
                </div>
                <div className="rounded-md bg-card p-4">
                  {sample.map((text, j) => {
                    const style: React.CSSProperties = { ...s.p }
                    if (j > 0 && s.gapBetween !== undefined) {
                      style.marginTop = s.gapBetween
                      style.marginBottom = 0
                    }
                    return previewText ? (
                      <pre key={j} style={{ ...style, fontFamily: "inherit", whiteSpace: "pre-wrap" }}>
                        {text}
                      </pre>
                    ) : (
                      <p key={j} style={style}>{text}</p>
                    )
                  })}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
