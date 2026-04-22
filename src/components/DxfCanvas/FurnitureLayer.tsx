/**
 * Furniture Layer Component
 * 
 * Renders all furniture items with drag, selection, and rotation support.
 */

import { Layer, Group, Line, Text } from 'react-konva'
import { useDxfFurniture } from '@/hooks/useDxfFurniture'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useToolState } from '@/contexts/ToolStateContext'
import { useSelectionState } from '@/contexts/SelectionStateContext'
import { toC } from '@/utils/dxfGeometry'

interface FurnitureLayerProps {
  t: any
  zoom: number
  strokeHex: string
  strokeScale: number
  showFurnitureLabels: boolean
  snapshot: () => void
  moveFurnitureGroupByKey: (key: string, dx: number, dy: number) => void
}

const FURNITURE_CATEGORY_COLORS: Record<string, string> = {
  'Kitchen': '#f97316',
  'Bedroom': '#8b5cf6',
  'Living Room': '#3b82f6',
  'Dining Room': '#10b981',
  'Bathroom': '#06b6d4',
  'Office': '#ef4444',
  'Conference': '#6366f1',
  'Break Room': '#84cc16',
  'Reception': '#f59e0b',
  'Corridor': '#78716c',
}

export function FurnitureLayer({
  t,
  zoom,
  strokeHex,
  strokeScale,
  showFurnitureLabels,
  snapshot,
  moveFurnitureGroupByKey,
}: FurnitureLayerProps) {
  const { furnitureGroups, furnitureLabels, selectedFurnKey } = useDxfFurniture()
  const { activeTool } = useToolState()
  const { setSelectedFurnKey, setSelectedIds, setSelectedWinKey, setSelectedArcHandle, setSelectedId, setSelectedTextHandle, setSelectedRoomIndex } = useSelectionState()

  if (activeTool !== 'select') return null

  return (
    <Layer listening={true}>
      {furnitureGroups.map(({ key, lines }) => {
        const isSel = selectedFurnKey === key
        const label = furnitureLabels.get(key)
        const category = label ? FURNITURE_LABEL_TO_CATEGORY.get(label) : undefined
        const categoryColor = category ? FURNITURE_CATEGORY_COLORS[category] : undefined
        const baseColor = categoryColor ?? strokeHex
        const furnColor = isSel ? '#f59e0b' : baseColor
        const sw = (1.5 * strokeScale) / zoom

        let cx = 0, cy = 0
        if (lines.length > 0) {
          let sx = 0, sy = 0, n = 0
          for (const ln of lines) {
            sx += ln.start.x + ln.end.x
            sy += ln.start.y + ln.end.y
            n += 2
          }
          ;[cx, cy] = toC(sx / n, sy / n, t)
        }

        return (
          <Group
            key={`furngrp-${key}`}
            draggable
            onDragStart={(e) => {
              e.cancelBubble = true
              snapshot()
              setSelectedFurnKey(key)
              setSelectedIds(new Set())
              setSelectedWinKey(null)
              setSelectedArcHandle(null)
              setSelectedId(null)
              setSelectedTextHandle(null)
              setSelectedRoomIndex(null)
            }}
            onDragEnd={(e) => {
              const dcx = e.target.x(), dcy = e.target.y()
              e.target.position({ x: 0, y: 0 })
              moveFurnitureGroupByKey(key, dcx / t.sc, -dcy / t.sc)
            }}
            onClick={(e) => {
              e.cancelBubble = true
              setSelectedFurnKey(isSel ? null : key)
              setSelectedIds(new Set())
              setSelectedWinKey(null)
              setSelectedArcHandle(null)
              setSelectedId(null)
              setSelectedTextHandle(null)
              setSelectedRoomIndex(null)
            }}
            onMouseEnter={(ev) => {
              ev.target.getStage()!.container().style.cursor = 'move'
            }}
            onMouseLeave={(ev) => {
              ev.target.getStage()!.container().style.cursor = 'default'
            }}
          >
            {lines.map((ln) => {
              const [x1, y1] = toC(ln.start.x, ln.start.y, t)
              const [x2, y2] = toC(ln.end.x, ln.end.y, t)
              return (
                <Line
                  key={ln.handle}
                  points={[x1, y1, x2, y2]}
                  stroke={furnColor}
                  strokeWidth={sw}
                  lineCap="round"
                  hitStrokeWidth={10 / zoom}
                />
              )
            })}
            {showFurnitureLabels && label && (
              <Text
                x={cx}
                y={cy}
                text={label}
                fontSize={11 / zoom}
                fill={isSel ? '#f59e0b' : (categoryColor ?? '#64748b')}
                listening={false}
              />
            )}
          </Group>
        )
      })}
    </Layer>
  )
}

const FURNITURE_LABEL_TO_CATEGORY = new Map<string, string>()
