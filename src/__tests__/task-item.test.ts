import { describe, it, expect, vi } from 'vitest'
import { CustomTaskItem } from '@/extensions/TaskItem'

describe('CustomTaskItem', () => {
  it('is created by extending TaskItem', () => {
    expect(CustomTaskItem.name).toBe('taskItem')
  })

  describe('renderHTML', () => {
    it('returns correct structure for checked state with SVG polyline', () => {
      const result = CustomTaskItem.config.renderHTML({
        node: { attrs: { checked: true } },
        HTMLAttributes: {},
      })

      expect(result[0]).toBe('li')
      expect(result[1]).toEqual({ 'data-type': 'taskItem' })

      const label = result[2]
      expect(label[0]).toBe('label')
      const span = label[1]
      expect(span[0]).toBe('span')
      expect(span[1].class).toBe('task-checkbox')
      expect(span[1]['data-checked']).toBe('true')

      const svg = span[2]
      expect(svg[0]).toBe('svg')
      expect(svg[2][0]).toBe('polyline')
      expect(svg[2][1].points).toBe('20 6 9 17 4 12')

      const div = result[3]
      expect(div[0]).toBe('div')
      expect(div[1].class).toBe('task-content')
      expect(div[2]).toBe(0)
    })

    it('returns correct structure for unchecked state without SVG', () => {
      const result = CustomTaskItem.config.renderHTML({
        node: { attrs: { checked: false } },
        HTMLAttributes: {},
      })

      const span = result[2][1]
      expect(span[0]).toBe('span')
      expect(span[1].class).toBe('task-checkbox')
      expect(span[1]['data-checked']).toBeUndefined()
      expect(span).toHaveLength(2)
    })
  })

  describe('addNodeView', () => {
    const mockType = { name: 'taskItem' }
    const mockContext = {
      options: { HTMLAttributes: {} },
      type: mockType,
    }
    const mockEditor = {
      isEditable: false,
      extensionManager: { attributes: [] },
      chain: vi.fn(),
    }

    it('returns object with dom, contentDOM, update properties', () => {
      const createNodeView = CustomTaskItem.config.addNodeView.call(mockContext)
      const nodeView = createNodeView({
        node: { attrs: { checked: false }, type: mockType },
        HTMLAttributes: {},
        getPos: vi.fn(),
        editor: mockEditor,
      })

      expect(nodeView).toHaveProperty('dom')
      expect(nodeView).toHaveProperty('contentDOM')
      expect(nodeView).toHaveProperty('update')
      expect(typeof nodeView.update).toBe('function')
      expect(nodeView.dom).toBeInstanceOf(HTMLElement)
      expect(nodeView.contentDOM).toBeInstanceOf(HTMLElement)
      expect(nodeView.dom.tagName).toBe('LI')
      expect(nodeView.contentDOM.tagName).toBe('DIV')
    })

    it('update returns true when node type matches', () => {
      const createNodeView = CustomTaskItem.config.addNodeView.call(mockContext)
      const nodeView = createNodeView({
        node: { attrs: { checked: false }, type: mockType },
        HTMLAttributes: {},
        getPos: vi.fn(),
        editor: mockEditor,
      })

      const result = nodeView.update({ type: mockType, attrs: { checked: true } })
      expect(result).toBe(true)
    })

    it('update returns false when node type does not match', () => {
      const createNodeView = CustomTaskItem.config.addNodeView.call(mockContext)
      const nodeView = createNodeView({
        node: { attrs: { checked: false }, type: mockType },
        HTMLAttributes: {},
        getPos: vi.fn(),
        editor: mockEditor,
      })

      const result = nodeView.update({ type: { name: 'different' } })
      expect(result).toBe(false)
    })
  })
})
