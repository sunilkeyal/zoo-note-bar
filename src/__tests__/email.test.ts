import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResendSend, mockResendConstructor } = vi.hoisted(() => {
  const mockResendSend = vi.fn()
  const mockResendConstructor = vi.fn(function() {
    return { emails: { send: mockResendSend } }
  })
  return { mockResendSend, mockResendConstructor }
})

vi.mock('resend', () => ({
  Resend: mockResendConstructor,
}))

describe('sendPasswordResetEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockResendConstructor.mockImplementation(function() {
      return { emails: { send: mockResendSend } }
    })
    mockResendSend.mockResolvedValue({ error: null })
  })

  it('logs reset link to console when no RESEND_API_KEY is set', async () => {
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc')

    expect(logSpy).toHaveBeenCalledWith('[Password Reset] Link: https://example.com/reset?token=abc')
    logSpy.mockRestore()
  })

  it('sends email via Resend when API key is set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    process.env.EMAIL_FROM = 'noreply@test.com'

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset?token=abc')

    expect(mockResendSend).toHaveBeenCalledWith({
      from: 'noreply@test.com',
      to: 'user@example.com',
      subject: 'Reset your password',
      html: expect.stringContaining('https://example.com/reset?token=abc'),
    })
  })

  it('uses default from address when EMAIL_FROM is not set', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    delete process.env.EMAIL_FROM

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await sendPasswordResetEmail('user@example.com', 'https://example.com/reset')

    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@mylaunch.top' })
    )
  })

  it('throws on Resend error', async () => {
    process.env.RESEND_API_KEY = 're_abc123'
    mockResendSend.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })

    const { sendPasswordResetEmail } = await import('@/lib/email')
    await expect(
      sendPasswordResetEmail('user@example.com', 'https://example.com/reset')
    ).rejects.toThrow('Rate limit exceeded')
  })
})
