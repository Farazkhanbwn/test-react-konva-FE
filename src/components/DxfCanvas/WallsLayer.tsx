import { Layer, Line, Circle, Group } from 'react-konva'
import type Konva from 'konva'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useToolState } from '@/contexts/ToolStateContext'
import { useSelectionState } from '@/contexts/SelectionStateContext'
import { useDxfDrag } from '@/hooks/useDxfDrag'
import { toC } from '@/utils/dxfGeometry'
import { roomLabelHandle } from '@/utils/dxfDocumentUtils'
import type { WallSeg } from '@/utils/wallsFromDxfJson'

interface WallsLayerProps {
  t: ReturnType<typeof import('@/utils/dxfGeometry').buildTransform>
  zoom: number
  strokeHex: string
  strokeScale: number
  hoveredGroupId: string | null
  setHoveredGroupId: (id: string | null) => void
  onEpDragMove: (e: Konva.KonvaEventObject<DragEvent>, wallId: string, ep: 'start' | 'end') => void
  onEpDragEnd: () => void
  setIsDraggingEp: (v: boolean) => void
  draggingEpInfo: React.MutableRefObject<{ wallId: string; ep: 'start' | 'end' } | null>
  getGroupWallIds: (wallId: string, walls: WallSeg[]) => string[]
}

export function WallsLayer({
  t, zoom, strokeHex, strokeScale, hoveredGroupId, setHoveredGroupId,
  onEpDragMove, onEpDragEnd, setIsDraggingEp, draggingEpInfo, getGroupWallIds
}: WallsLayerProps) {
  const { planDoc, snapshot } = useEditorState()
  const { activeTool, spaceHeld } = useToolState()
  const { selectedIds, setSelectedIds } = useSelectionState()
  const { effectiveWalls, startWallDrag, endDrag, isDragging } = useDxfDrag()

  const isDrawingTool = ['drawPolyline', 'drawLine', 'drawArc', 'drawCircle', 'text'].includes(activeTool)
  const HP_SCR = 7
  const HR = HP_SCR / zoom

  return (
    <Layer>
      {effectiveWalls.map(wall => {
        if (wall.fromArc) return null
        const [sx, sy] = toC(wall.start.x, wall.start.y, t)
        const [ex, ey] = toC(wall.end.x, wall.end.y, t)
        const isSel = selectedIds.has(wall.id)
        const isWallDragging = isDragging && effectiveWalls.some(w => w.id === wall.id)
        const wallColor = wall.isDetail ? '#60a5fa' : strokeHex
        const strokeW = ((wall.isOuter ? 2.8 : wall.isDetail ? 0.65 : 1.15) * strokeScale) / zoom

        return (
          <Group key={wall.id}>
            <Line
              points={[sx, sy, ex, ey]}
              stroke="transparent"
              strokeWidth={16 / zoom}
              onMouseDown={e => {
                if (isDrawingTool) return
                e.cancelBubble = true
                const groupIds = getGroupWallIds(wall.id, effectiveWalls)
                if (wall.groupId?.startsWith('pl-')) {
                  const lbl = roomLabelHandle(wall.groupId.slice(3))
                  if (planDoc.texts.some(tx => tx.handle === lbl)) groupIds.push(lbl)
                }
                const groupFullySelected = groupIds.every(id => selectedIds.has(id))
                let currentSel = selectedIds
                if (!groupFullySelected) {
                  const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                  currentSel = new Set(isCtrl ? selectedIds : [])
                  groupIds.forEach(id => currentSel.add(id))
                  setSelectedIds(currentSel)
                }
                startWallDrag(wall.id, currentSel)
              }}
              onMouseUp={e => {
                e.cancelBubble = true
                endDrag()
              }}
              onClick={e => {
                if (isDrawingTool) return
                e.cancelBubble = true
                const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                const groupIds = getGroupWallIds(wall.id, effectiveWalls)
                if (wall.groupId?.startsWith('pl-')) {
                  const lbl = roomLabelHandle(wall.groupId.slice(3))
                  if (planDoc.texts.some(tx => tx.handle === lbl)) groupIds.push(lbl)
                }
                setSelectedIds(prev => {
                  if (!isCtrl) return new Set(groupIds)
                  if (prev.has(wall.id)) {
                    const next = new Set(prev)
                    groupIds.forEach(id => next.delete(id))
                    return next
                  }
                  return prev
                })
              }}
              onMouseEnter={ev => {
                ev.target.getStage()!.container().style.cursor = 'move'
                if (wall.groupId) setHoveredGroupId(wall.groupId)
              }}
              onMouseLeave={ev => {
                ev.target.getStage()!.container().style.cursor = 'default'
                setHoveredGroupId(null)
              }}
            />
            {(() => {
              const isHoverGroup = !isSel && !isWallDragging && !!wall.groupId && wall.groupId === hoveredGroupId
              return (
                <Line
                  points={[sx, sy, ex, ey]}
                  stroke={isWallDragging ? '#3b82f6' : isSel ? '#f59e0b' : isHoverGroup ? '#a855f7' : wallColor}
                  strokeWidth={(isWallDragging || isSel || isHoverGroup) ? 2.2 / zoom : strokeW}
                  lineCap="round"
                  listening={false}
                />
              )
            })()}
            {isSel && (
              <>
                <Circle
                  x={sx}
                  y={sy}
                  radius={HR}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={1.2 / zoom}
                  draggable
                  onDragStart={() => {
                    snapshot()
                    setIsDraggingEp(true)
                    draggingEpInfo.current = { wallId: wall.id, ep: 'start' }
                  }}
                  onDragMove={e => onEpDragMove(e, wall.id, 'start')}
                  onDragEnd={onEpDragEnd}
                  onMouseEnter={ev => {
                    ev.target.getStage()!.container().style.cursor = 'crosshair'
                  }}
                  onMouseLeave={ev => {
                    ev.target.getStage()!.container().style.cursor = 'default'
                  }}
                />
                <Circle
                  x={ex}
                  y={ey}
                  radius={HR}
                  fill="#3b82f6"
                  stroke="#fff"
                  strokeWidth={1.2 / zoom}
                  draggable
                  onDragStart={() => {
                    snapshot()
                    setIsDraggingEp(true)
                    draggingEpInfo.current = { wallId: wall.id, ep: 'end' }
                  }}
                  onDragMove={e => onEpDragMove(e, wall.id, 'end')}
                  onDragEnd={onEpDragEnd}
                  onMouseEnter={ev => {
                    ev.target.getStage()!.container().style.cursor = 'crosshair'
                  }}
                  onMouseLeave={ev => {
                    ev.target.getStage()!.container().style.cursor = 'default'
                  }}
                />
              </>
            )}
          </Group>
        )
      })}
    </Layer>
  )
}
