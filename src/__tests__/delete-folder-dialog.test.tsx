import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DeleteFolderDialog from '@/components/DeleteFolderDialog'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-title">{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="dialog-description">{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, ...props }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant} {...props}>{children}</button>
  ),
}))

describe('DeleteFolderDialog', () => {
  it('renders dialog with title "Delete folder?"', () => {
    render(<DeleteFolderDialog open={true} folderName="Test Folder" notesCount={0} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete folder?')
  })

  it('shows folder name in description', () => {
    render(<DeleteFolderDialog open={true} folderName="Work Notes" notesCount={0} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('Work Notes')
  })

  it('shows notes count when > 0', () => {
    render(<DeleteFolderDialog open={true} folderName="Work Notes" notesCount={5} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent('5')
  })

  it('does not show notes count when 0', () => {
    render(<DeleteFolderDialog open={true} folderName="Empty Folder" notesCount={0} onClose={() => {}} onConfirm={() => {}} />)
    const desc = screen.getByTestId('dialog-description')
    expect(desc).not.toHaveTextContent(/with all/)
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(<DeleteFolderDialog open={true} folderName="Folder" notesCount={0} onClose={onClose} onConfirm={() => {}} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when Delete clicked', () => {
    const onConfirm = vi.fn()
    render(<DeleteFolderDialog open={true} folderName="Folder" notesCount={0} onClose={() => {}} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('does not render when open is false', () => {
    render(<DeleteFolderDialog open={false} folderName="Folder" notesCount={0} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
