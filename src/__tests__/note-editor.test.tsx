import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import NoteEditor from '@/components/NoteEditor'

vi.mock('@tiptap/react', () => ({
  EditorContent: ({ editor }: { editor: unknown }) => <div data-testid="editor-content" />,
}))

describe('NoteEditor', () => {
  it('returns null when editor is null', () => {
    const note = { _id: '1', title: 'Test', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    const { container } = render(<NoteEditor note={note} editor={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders EditorContent when editor is provided', () => {
    const note = { _id: '1', title: 'Test', content: '', position: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' }
    const editor = { isEditable: true } as any
    render(<NoteEditor note={note} editor={editor} />)
    expect(screen.getByTestId('editor-content')).toBeInTheDocument()
  })
})
