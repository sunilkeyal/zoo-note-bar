import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockTurndown, mockTurndownConstructor, mockDump, mockArchiveInstance, mockZipArchive, archiveHandlers } = vi.hoisted(() => {
  const mockTurndown = vi.fn()
  const mockTurndownConstructor = vi.fn(function() {
    return { turndown: mockTurndown }
  })
  const mockDump = vi.fn()
  const archiveHandlers: Record<string, (...args: unknown[]) => void> = {}
  const mockArchiveInstance = {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      archiveHandlers[event] = handler
      return mockArchiveInstance
    }),
    append: vi.fn(),
    finalize: vi.fn(() => {
      archiveHandlers.data?.(Buffer.from('mock-zip-data'))
      archiveHandlers.end?.()
    }),
  }
  const mockZipArchive = vi.fn(function() { return mockArchiveInstance })

  return { mockTurndown, mockTurndownConstructor, mockDump, mockArchiveInstance, mockZipArchive, archiveHandlers }
})

vi.mock('turndown', () => ({
  default: mockTurndownConstructor,
}))

vi.mock('js-yaml', () => ({
  dump: mockDump,
}))

vi.mock('archiver', () => ({
  ZipArchive: mockZipArchive,
}))

describe('export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockTurndownConstructor.mockImplementation(function() {
      return { turndown: mockTurndown }
    })
    mockTurndown.mockImplementation((html: string) => `md(${html})`)
    mockDump.mockImplementation((data: Record<string, string>) =>
      Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n') + '\n'
    )
    mockZipArchive.mockImplementation(function() { return mockArchiveInstance })
    mockArchiveInstance.finalize.mockImplementation(() => {
      archiveHandlers.data?.(Buffer.from('mock-zip-data'))
      archiveHandlers.end?.()
    })
  })

  describe('convertHtmlToMarkdown', () => {
    it('converts HTML to Markdown via turndown', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown('<p>Hello</p>')

      expect(mockTurndown).toHaveBeenCalledWith('<p>Hello</p>')
      expect(result).toBe('md(<p>Hello</p>)')
    })

    it('handles empty HTML string', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown('')

      expect(result).toBe('md()')
    })

    it('handles null-ish input', async () => {
      const { convertHtmlToMarkdown } = await import('@/lib/export')
      const result = convertHtmlToMarkdown(null as unknown as string)

      expect(result).toBe('md()')
    })
  })

  describe('generateFrontMatter', () => {
    it('generates YAML front matter with title', async () => {
      const { generateFrontMatter } = await import('@/lib/export')
      mockDump.mockReturnValue('title: My Note\n')

      const result = generateFrontMatter('My Note')

      expect(result).toBe('---\ntitle: My Note\n---\n\n')
      expect(mockDump).toHaveBeenCalledWith({ title: 'My Note' })
    })

    it('includes folder name when provided', async () => {
      const { generateFrontMatter } = await import('@/lib/export')
      mockDump.mockReturnValue('title: My Note\nfolder: My Folder\n')

      const result = generateFrontMatter('My Note', 'My Folder')

      expect(result).toBe('---\ntitle: My Note\nfolder: My Folder\n---\n\n')
      expect(mockDump).toHaveBeenCalledWith({ title: 'My Note', folder: 'My Folder' })
    })
  })

  describe('generateExportZip', () => {
    const mockNote = (overrides: Record<string, unknown> = {}) => ({
      _id: 'note1',
      title: 'Test Note',
      content: '<p>Hello</p>',
      position: 0,
      folderId: undefined as string | undefined,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    const mockFolder = (overrides: Record<string, unknown> = {}) => ({
      _id: 'folder1',
      name: 'My Folder',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides,
    })

    it('creates a ZIP archive and returns a Buffer', async () => {
      const { generateExportZip } = await import('@/lib/export')

      const result = await generateExportZip([mockNote()], [])

      expect(Buffer.isBuffer(result)).toBe(true)
      expect(mockArchiveInstance.finalize).toHaveBeenCalled()
    })

    it('appends notes with front matter and markdown content', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: Test Note\n')

      await generateExportZip([mockNote()], [])

      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        '---\ntitle: Test Note\n---\n\nmd(<p>Hello</p>)',
        { name: 'Test Note.md' }
      )
    })

    it('sanitizes filenames by replacing invalid characters', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: Bad/File:*Name\n')

      await generateExportZip([mockNote({ title: 'Bad/File:*Name' })], [])

      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(String),
        { name: 'Bad_File__Name.md' }
      )
    })

    it('groups notes into subdirectories by folder', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: Note\nfolder: My Folder\n')

      await generateExportZip(
        [mockNote({ folderId: 'folder1', title: 'Note' })],
        [mockFolder()]
      )

      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(String),
        { name: 'My Folder/Note.md' }
      )
    })

    it('handles duplicate filenames by appending a counter', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: Note\nfolder: Folder\n')

      const notes = [
        mockNote({ _id: 'n1', title: 'Note', folderId: 'folder1' }),
        mockNote({ _id: 'n2', title: 'Note', folderId: 'folder1' }),
      ]

      await generateExportZip(notes, [mockFolder({ name: 'Folder' })])

      const calls = mockArchiveInstance.append.mock.calls
      expect(calls[0][1].name).toBe('Folder/Note.md')
      expect(calls[1][1].name).toBe('Folder/Note-1.md')
    })

    it('does not create duplicate filenames across folders', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: Note\n')

      const notes = [
        mockNote({ _id: 'n1', title: 'Note', folderId: 'folder1' }),
        mockNote({ _id: 'n2', title: 'Note', folderId: undefined }),
      ]

      await generateExportZip(notes, [mockFolder()])

      const calls = mockArchiveInstance.append.mock.calls
      expect(calls[0][1].name).toBe('My Folder/Note.md')
      expect(calls[1][1].name).toBe('Note.md')
    })

    it('uses "untitled" for notes with empty title after sanitization', async () => {
      const { generateExportZip } = await import('@/lib/export')
      mockDump.mockReturnValue('title: \n')

      await generateExportZip([mockNote({ title: '' })], [])

      expect(mockArchiveInstance.append).toHaveBeenCalledWith(
        expect.any(String),
        { name: 'untitled.md' }
      )
    })
  })
})
