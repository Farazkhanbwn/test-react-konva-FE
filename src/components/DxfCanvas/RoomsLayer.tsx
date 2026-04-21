import { Layer, Line, Group } from 'react-konva'
import type Konva from 'konva'
import { useSelectionState } from '@/contexts/SelectionStateContext'
import { useDxfDrag } from '@/hooks/useDxfDrag'
import { toC } from '@/utils/dxfGeometry'

interface RoomsLayerProps {
  roomsWithWalls: Array<{ polygon: Array<{ x: number; y: number }>; wallIds: string[] }>
  t: ReturnType<typeof import('@/utils/dxfGeometry').buildTransform>
  zoom: number
  hoveredRoomIdx: number | null
  setHoveredRoomIdx: (idx: number | null) => void
  ROOM_COLORS: string[]
  ROOM_STROKES: string[]
}

export function RoomsLayer({
  roomsWithWalls,
  t,
  zoom,
  hoveredRoomIdx,
  setHoveredRoomIdx,
  ROOM_COLORS,
  ROOM_STROKES,
}: RoomsLayerProps) {
  const { setSelectedIds } = useSelectionState()
  const { startWallDrag, endDrag } = useDxfDrag()

  return (
    <Layer>
      {roomsWithWalls.map((r, i) => {
        const isHovered = hoveredRoomIdx === i
        return (
          <Group key={`room-${i}`}>
            <Line
              points={r.polygon.flatMap(p => toC(p.x, p.y, t))}
              closed
              fill={ROOM_COLORS[i % ROOM_COLORS.length]}
              stroke={ROOM_STROKES[i % ROOM_STROKES.length]}
              strokeWidth={isHovered ? 2.5 / zoom : 1 / zoom}
              listening={true}
              onClick={e => {
                e.cancelBubble = true
                const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                setSelectedIds(prev => {
                  if (isCtrl) {
                    const next = new Set(prev)
                    r.wallIds.forEach(id => next.add(id))
                    return next
                  }
                  return new Set(r.wallIds)
                })
              }}
              onMouseDown={e => {
                e.cancelBubble = true
                const currentSel = new Set(r.wallIds)
                setSelectedIds(currentSel)
                startWallDrag(r.wallIds[0] ?? '', currentSel)
              }}
              onMouseUp={e => {
                e.cancelBubble = true
                endDrag()
              }}
              onMouseEnter={ev => {
                ev.target.getStage()!.container().style.cursor = 'move'
                setHoveredRoomIdx(i)
              }}
              onMouseLeave={ev => {
                ev.target.getStage()!.container().style.cursor = 'default'
                setHoveredRoomIdx(null)
              }}
            />
          </Group>
        )
      })}
    </Layer>
  )
}
