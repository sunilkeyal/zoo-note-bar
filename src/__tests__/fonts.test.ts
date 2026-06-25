import { describe, it, expect, vi } from 'vitest'
import { FontSize } from '@/extensions/FontSize'

describe('FontSize', () => {
  it('has name fontSize', () => {
    expect(FontSize.name).toBe('fontSize')
  })

  it('options default types to ["textStyle"]', () => {
    const ext = FontSize.configure()
    expect(ext.options.types).toEqual(['textStyle'])
  })

  it('addGlobalAttributes returns fontSize attribute with default null', () => {
    const ext = FontSize.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    expect(attrs).toHaveLength(1)
    expect(attrs[0].types).toEqual(['textStyle'])
    expect(attrs[0].attributes.fontSize.default).toBeNull()
  })

  it('parseHTML extracts font-size from style attribute', () => {
    const ext = FontSize.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    const { parseHTML } = attrs[0].attributes.fontSize

    const el = document.createElement('span')
    el.style.fontSize = '16px'
    expect(parseHTML(el)).toBe('16px')

    const el2 = document.createElement('span')
    expect(parseHTML(el2)).toBeNull()
  })

  it('renderHTML returns style when fontSize is set, empty object when null', () => {
    const ext = FontSize.configure()
    const attrs = ext.config.addGlobalAttributes.call({ options: ext.options })
    const { renderHTML } = attrs[0].attributes.fontSize

    expect(renderHTML({ fontSize: '18px' })).toEqual({ style: 'font-size: 18px' })
    expect(renderHTML({ fontSize: null })).toEqual({})
  })

  it('addCommands returns setFontSize and unsetFontSize', () => {
    const ext = FontSize.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    expect(commands).toHaveProperty('setFontSize')
    expect(commands).toHaveProperty('unsetFontSize')
    expect(typeof commands.setFontSize).toBe('function')
    expect(typeof commands.unsetFontSize).toBe('function')
  })

  it('setFontSize command calls chain().setMark("textStyle", { fontSize })', () => {
    const ext = FontSize.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    const run = vi.fn()
    const setMark = vi.fn().mockReturnValue({ run })
    const chainFn = vi.fn().mockReturnValue({ setMark })

    commands.setFontSize('20px')({ chain: chainFn })

    expect(chainFn).toHaveBeenCalledOnce()
    expect(setMark).toHaveBeenCalledWith('textStyle', { fontSize: '20px' })
    expect(run).toHaveBeenCalledOnce()
  })

  it('unsetFontSize command calls chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle()', () => {
    const ext = FontSize.configure()
    const commands = ext.config.addCommands.call({ options: ext.options })

    const run = vi.fn()
    const removeEmptyTextStyle = vi.fn().mockReturnValue({ run })
    const setMark = vi.fn().mockReturnValue({ removeEmptyTextStyle })
    const chainFn = vi.fn().mockReturnValue({ setMark })

    commands.unsetFontSize()({ chain: chainFn })

    expect(chainFn).toHaveBeenCalledOnce()
    expect(setMark).toHaveBeenCalledWith('textStyle', { fontSize: null })
    expect(removeEmptyTextStyle).toHaveBeenCalledOnce()
    expect(run).toHaveBeenCalledOnce()
  })
})
