import React, { useCallback, useRef, useState } from 'react'
import { NodeViewProps, NodeViewWrapper } from '@tiptap/react'

export default function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const { src, width, height } = node.attrs
  const [resizing, setResizing] = useState(false)
  const imageRef = useRef<HTMLImageElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = imageRef.current?.offsetWidth || 400

    const onMouseMove = (ev: MouseEvent) => {
      const delta = ev.clientX - startXRef.current
      const newWidth = Math.max(100, startWidthRef.current + delta)
      const aspect = (imageRef.current?.naturalHeight || 1) / (imageRef.current?.naturalWidth || 1)
      updateAttributes({ width: `${newWidth}px`, height: `${Math.round(newWidth * aspect)}px` })
    }

    const onMouseUp = () => {
      setResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [updateAttributes])

  return (
    <NodeViewWrapper className="image-node-wrapper">
      <div className={`relative inline-block group ${selected ? 'ring-2 ring-blue-500 rounded' : ''}`}>
        {selected && (
          <div
            className="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-8 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground select-none"
            contentEditable={false}
            draggable="true"
            data-drag-handle=""
          >
            <span className="text-lg leading-none tracking-tighter" style={{ letterSpacing: '-2px', fontSize: '18px' }}>⠿</span>
          </div>
        )}
        <img
          ref={imageRef}
          src={src}
          width={width}
          height={height}
          className="max-w-full h-auto rounded"
          draggable={false}
          alt=""
        />
        {selected && (
          <div
            className="absolute bottom-1 right-1 w-4 h-4 bg-blue-500 border-2 border-white rounded-sm cursor-se-resize hover:scale-110 transition-transform"
            onMouseDown={onMouseDown}
            style={{ pointerEvents: resizing ? 'none' : 'auto' }}
          />
        )}
      </div>
    </NodeViewWrapper>
  )
}
