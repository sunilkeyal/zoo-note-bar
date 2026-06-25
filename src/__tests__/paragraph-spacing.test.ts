import { describe, it, expect, vi } from 'vitest'
import { ParagraphSpacing } from '@/extensions/ParagraphSpacing'

describe('ParagraphSpacing', () => {
  it('has name paragraphSpacing', () => {
    expect(ParagraphSpacing.name).toBe('paragraphSpacing')
  })

  it('options default types to ["paragraph"]', () => {
    const ext = ParagraphSpacing.configure()
    expect(ext.options.types).toEqual(['paragraph'])
  })

  it('addGlobalAttributes returns paragraphSpacing attribute with default null', () => {
    const ext = ParagraphSpacing.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    expect(attrs).toHaveLength(1)
    expect(attrs[0].types).toEqual(['paragraph'])
    expect(attrs[0].attributes.paragraphSpacing.default).toBeNull()
  })

  it('parseHTML extracts margin-bottom from style attribute', () => {
    const ext = ParagraphSpacing.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    const { parseHTML } = attrs[0].attributes.paragraphSpacing

    const el = document.createElement('p')
    el.style.marginBottom = '12px'
    expect(parseHTML(el)).toBe('12px')

    const el2 = document.createElement('p')
    expect(parseHTML(el2)).toBeNull()
  })

  it('renderHTML returns style when paragraphSpacing is set, empty object when null', () => {
    const ext = ParagraphSpacing.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    const { renderHTML } = attrs[0].attributes.paragraphSpacing

    expect(renderHTML({ paragraphSpacing: '10px' })).toEqual({ style: 'margin-bottom: 10px' })
    expect(renderHTML({ paragraphSpacing: null })).toEqual({})
  })

  it('addCommands returns setParagraphSpacing and unsetParagraphSpacing', () => {
    const ext = ParagraphSpacing.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    expect(commands).toHaveProperty('setParagraphSpacing')
    expect(commands).toHaveProperty('unsetParagraphSpacing')
    expect(typeof commands.setParagraphSpacing).toBe('function')
    expect(typeof commands.unsetParagraphSpacing).toBe('function')
  })

  it('setParagraphSpacing command calls chain().focus().updateAttributes("paragraph", { paragraphSpacing })', () => {
    const ext = ParagraphSpacing.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    const run = vi.fn()
    const updateAttributes = vi.fn().mockReturnValue({ run })
    const focus = vi.fn().mockReturnValue({ updateAttributes })
    const chainFn = vi.fn().mockReturnValue({ focus })

    commands.setParagraphSpacing('10px')({ chain: chainFn })

    expect(chainFn).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
    expect(updateAttributes).toHaveBeenCalledWith('paragraph', { paragraphSpacing: '10px' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('unsetParagraphSpacing command calls chain().focus().updateAttributes("paragraph", { paragraphSpacing: null })', () => {
    const ext = ParagraphSpacing.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    const run = vi.fn()
    const updateAttributes = vi.fn().mockReturnValue({ run })
    const focus = vi.fn().mockReturnValue({ updateAttributes })
    const chainFn = vi.fn().mockReturnValue({ focus })

    commands.unsetParagraphSpacing()({ chain: chainFn })

    expect(chainFn).toHaveBeenCalledOnce()
    expect(focus).toHaveBeenCalledOnce()
    expect(updateAttributes).toHaveBeenCalledWith('paragraph', { paragraphSpacing: null })
    expect(run).toHaveBeenCalledOnce()
  })
})
