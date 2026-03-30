import { Group, Rect, Line, Circle, Text } from 'react-konva'
import { SCALE, PLAN_OFFSET_X, PLAN_OFFSET_Y } from '@/hooks/useDesignCanvasState'
import type { FurnitureItem } from '@/hooks/useDesignCanvasState'

const m = (v: number) => v * SCALE

interface FurnitureRendererProps {
  item: FurnitureItem
  isSelected: boolean
  tool: string
  onSelect: () => void
  onDelete: () => void
  onDragMove: (x: number, y: number) => void
  onDragEnd: (x: number, y: number) => void
  scale: number
  stagePos: { x: number; y: number }
}

function FurnitureShape({ type, w, h, stroke }: { type: string; w: number; h: number; stroke: string }) {
  switch (type) {
    case 'sink':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Rect
            x={w * 0.15}
            y={h * 0.15}
            width={w * 0.7}
            height={h * 0.5}
            stroke={stroke}
            strokeWidth={0.8}
            cornerRadius={3}
            fill="transparent"
          />
          <Circle x={w * 0.5} y={h * 0.8} radius={Math.min(w, h) * 0.08} fill={stroke} />
        </>
      )
    case 'stove':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Circle
            x={w * 0.3}
            y={h * 0.3}
            radius={Math.min(w, h) * 0.15}
            stroke={stroke}
            strokeWidth={0.8}
            fill="transparent"
          />
          <Circle
            x={w * 0.7}
            y={h * 0.3}
            radius={Math.min(w, h) * 0.15}
            stroke={stroke}
            strokeWidth={0.8}
            fill="transparent"
          />
          <Circle
            x={w * 0.3}
            y={h * 0.7}
            radius={Math.min(w, h) * 0.15}
            stroke={stroke}
            strokeWidth={0.8}
            fill="transparent"
          />
          <Circle
            x={w * 0.7}
            y={h * 0.7}
            radius={Math.min(w, h) * 0.12}
            stroke={stroke}
            strokeWidth={0.8}
            fill="transparent"
          />
        </>
      )
    case 'fridge':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Line points={[0, h * 0.4, w, h * 0.4]} stroke={stroke} strokeWidth={0.8} />
          <Line points={[w * 0.85, h * 0.15, w * 0.85, h * 0.35]} stroke={stroke} strokeWidth={1} />
          <Line points={[w * 0.85, h * 0.5, w * 0.85, h * 0.85]} stroke={stroke} strokeWidth={1} />
        </>
      )
    case 'bed-single':
    case 'bed-double':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Rect
            x={w * 0.08}
            y={h * 0.05}
            width={w * 0.84}
            height={h * 0.15}
            stroke={stroke}
            strokeWidth={0.8}
            fill={stroke}
            opacity={0.15}
          />
          <Rect
            x={w * 0.05}
            y={h * 0.25}
            width={w * 0.9}
            height={h * 0.7}
            stroke={stroke}
            strokeWidth={0.6}
            fill="transparent"
          />
        </>
      )
    case 'sofa':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Rect
            x={0}
            y={h * 0.65}
            width={w}
            height={h * 0.35}
            stroke={stroke}
            strokeWidth={0.6}
            fill={stroke}
            opacity={0.1}
          />
          <Rect x={0} y={0} width={w * 0.08} height={h} stroke={stroke} strokeWidth={0.6} fill={stroke} opacity={0.1} />
          <Rect
            x={w * 0.92}
            y={0}
            width={w * 0.08}
            height={h}
            stroke={stroke}
            strokeWidth={0.6}
            fill={stroke}
            opacity={0.1}
          />
        </>
      )
    case 'coffee-table':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Rect x={w * 0.1} y={h * 0.1} width={w * 0.8} height={h * 0.8} stroke={stroke} strokeWidth={0.5} fill="transparent" />
        </>
      )
    case 'dining-table':
      return (
        <>
          <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
          <Rect x={w * 0.05} y={h * 0.05} width={w * 0.9} height={h * 0.9} stroke={stroke} strokeWidth={0.5} fill="transparent" />
        </>
      )
    case 'toilet':
      return (
        <>
          <Rect x={w * 0.1} y={0} width={w * 0.8} height={h * 0.35} stroke={stroke} strokeWidth={0.8} fill="transparent" />
          <Rect
            x={0}
            y={h * 0.3}
            width={w}
            height={h * 0.7}
            stroke={stroke}
            strokeWidth={1}
            cornerRadius={[0, 0, w * 0.3, w * 0.3]}
            fill="transparent"
          />
        </>
      )
    case 'generic':
      // DXF/CAD furniture with no semantic type (e.g. LINE + vertices only) – draw as simple box
      return <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" cornerRadius={2} />
    default:
      return <Rect x={0} y={0} width={w} height={h} stroke={stroke} strokeWidth={1} fill="transparent" />
  }
}

export default function FurnitureRenderer({
  item,
  isSelected,
  tool,
  onSelect,
  onDelete,
  onDragMove,
  onDragEnd,
  scale: stageScale,
  stagePos,
}: FurnitureRendererProps) {
  const px = PLAN_OFFSET_X + m(item.x)
  const py = PLAN_OFFSET_Y + m(item.y)
  const pw = m(item.width)
  const ph = m(item.depth)
  const stroke = isSelected ? '#3b82f6' : '#1a1a1a'

  const calcPos = (node: any) => {
    const absPos = node.getAbsolutePosition()
    const newX = (absPos.x / stageScale - stagePos.x / stageScale - PLAN_OFFSET_X) / SCALE
    const newY = (absPos.y / stageScale - stagePos.y / stageScale - PLAN_OFFSET_Y) / SCALE
    return { newX, newY }
  }

  return (
    <Group
      x={px}
      y={py}
      rotation={item.rotation}
      draggable={tool === 'select'}
      onDragMove={(e) => {
        const { newX, newY } = calcPos(e.target)
        onDragMove(newX, newY)
        e.target.x(PLAN_OFFSET_X + m(newX))
        e.target.y(PLAN_OFFSET_Y + m(newY))
      }}
      onDragEnd={(e) => {
        const { newX, newY } = calcPos(e.target)
        onDragEnd(newX, newY)
      }}
      onClick={(e) => {
        e.cancelBubble = true
        if (tool === 'delete') {
          onSelect()
          setTimeout(onDelete, 0)
        } else {
          onSelect()
        }
      }}
    >
      <FurnitureShape type={item.furnitureType} w={pw} h={ph} stroke={stroke} />
      <Text x={0} y={ph + 2} width={pw} text={item.label} fontSize={7} fill={stroke} align="center" listening={false} />
      <Rect x={-2} y={-2} width={pw + 4} height={ph + 4} fill="transparent" />
    </Group>
  )
}

