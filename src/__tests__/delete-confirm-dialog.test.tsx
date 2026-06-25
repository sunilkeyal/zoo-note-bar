import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog'

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

describe('DeleteConfirmDialog', () => {
  it('renders dialog with title "Delete Note"', () => {
    render(<DeleteConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Delete Note')
  })

  it('shows description about moving to trash', () => {
    render(<DeleteConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByTestId('dialog-description')).toHaveTextContent(/moved to the trash/)
  })

  it('has Cancel and Delete buttons', () => {
    render(<DeleteConfirmDialog open={true} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('calls onClose when Cancel clicked', () => {
    const onClose = vi.fn()
    render(<DeleteConfirmDialog open={true} onClose={onClose} onConfirm={() => {}} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onConfirm when Delete clicked', () => {
    const onConfirm = vi.fn()
    render(<DeleteConfirmDialog open={true} onClose={() => {}} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Delete'))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('does not render when open is false', () => {
    render(<DeleteConfirmDialog open={false} onClose={() => {}} onConfirm={() => {}} />)
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
  })
})
