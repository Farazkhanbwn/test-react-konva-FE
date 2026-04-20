import type { CanvasState } from '@/hooks/useDesignCanvasState'
import type { WallSeg } from './wallsFromDxfJson'
import type { DxfText, DxfArc, DxfLine } from '@/constants/dxfJsonData'
import { downloadDxf } from './exportToDxf'

/**
 * Convert canvas state (rooms, walls, doors, windows) to DXF format
 * and trigger download for Autodesk import
 */
export function exportCanvasToDxf(state: CanvasState, filename = 'floor-plan.dxf'): void {
  const walls: WallSeg[] = []
  const texts: DxfText[] = []
  const arcs: DxfArc[] = []
  const lines: DxfLine[] = []

  console.log('Exporting canvas state:', state)

  // Convert walls
  state.walls.forEach((wall) => {
    walls.push({
      id: wall.id,
      start: { x: wall.x1, y: wall.y1 },
      end: { x: wall.x2, y: wall.y2 },
      isOuter: wall.isOuter ?? true,
      isDetail: false,
    })
  })

  // Convert rooms to polylines (walls)
  state.rooms.forEach((room) => {
    const roomId = room.id
    // Create 4 walls for each room (rectangle)
    walls.push(
      // Top wall
      {
        id: `${roomId}-top`,
        start: { x: room.x, y: room.y },
        end: { x: room.x + room.width, y: room.y },
        isOuter: false,
        isDetail: false,
        groupId: roomId,
      },
      // Right wall
      {
        id: `${roomId}-right`,
        start: { x: room.x + room.width, y: room.y },
        end: { x: room.x + room.width, y: room.y + room.height },
        isOuter: false,
        isDetail: false,
        groupId: roomId,
      },
      // Bottom wall
      {
        id: `${roomId}-bottom`,
        start: { x: room.x + room.width, y: room.y + room.height },
        end: { x: room.x, y: room.y + room.height },
        isOuter: false,
        isDetail: false,
        groupId: roomId,
      },
      // Left wall
      {
        id: `${roomId}-left`,
        start: { x: room.x, y: room.y + room.height },
        end: { x: room.x, y: room.y },
        isOuter: false,
        isDetail: false,
        groupId: roomId,
      },
    )

    // Add room label as text
    texts.push({
      handle: `text-${room.id}`,
      layer: 'Text',
      text: room.label,
      position: {
        x: room.x + room.width / 2,
        y: room.y + room.height / 2,
        z: 0,
      },
      height: 0.3,
      rotation: 0,
    })
  })

  // Convert doors to arcs
  state.doors.forEach((door) => {
    const doorRadius = door.width
    const rotation = door.rotation || 0

    // Create arc for door swing
    arcs.push({
      handle: `arc-${door.id}`,
      layer: 'Doors',
      center: { x: door.x, y: door.y, z: 0 },
      radius: doorRadius,
      start_angle: rotation,
      end_angle: rotation + 90,
    })

    // Create door frame lines (jambs)
    const rad = (rotation * Math.PI) / 180
    const dx = doorRadius * Math.cos(rad)
    const dy = doorRadius * Math.sin(rad)

    lines.push({
      handle: `dfl-${door.id}-jamb`,
      layer: 'Doors',
      start: { x: door.x, y: door.y, z: 0 },
      end: { x: door.x + dx, y: door.y + dy, z: 0 },
    })
  })

  // Convert windows to lines
  state.windows.forEach((win) => {
    lines.push({
      handle: `win-${win.id}`,
      layer: 'Windows',
      start: { x: win.x1, y: win.y1, z: 0 },
      end: { x: win.x2, y: win.y2, z: 0 },
    })
  })

  // Convert furniture to rectangles (as lines)
  state.furniture.forEach((item) => {
    const cos = Math.cos((item.rotation * Math.PI) / 180)
    const sin = Math.sin((item.rotation * Math.PI) / 180)

    // Calculate rotated corners
    const corners = [
      { x: 0, y: 0 },
      { x: item.width, y: 0 },
      { x: item.width, y: item.depth },
      { x: 0, y: item.depth },
    ].map((p) => ({
      x: item.x + p.x * cos - p.y * sin,
      y: item.y + p.x * sin + p.y * cos,
    }))

    // Create 4 lines for furniture rectangle
    for (let i = 0; i < 4; i++) {
      const start = corners[i]
      const end = corners[(i + 1) % 4]
      lines.push({
        handle: `furn-${item.id}-${i}`,
        layer: 'Furniture',
        start: { x: start.x, y: start.y, z: 0 },
        end: { x: end.x, y: end.y, z: 0 },
      })
    }

    // Add furniture label
    texts.push({
      handle: `text-furn-${item.id}`,
      layer: 'Text',
      text: item.label,
      position: {
        x: item.x + (item.width * cos) / 2 - (item.depth * sin) / 2,
        y: item.y + (item.width * sin) / 2 + (item.depth * cos) / 2,
        z: 0,
      },
      height: 0.15,
      rotation: item.rotation,
    })
  })

  console.log('Generated DXF data:', { walls: walls.length, texts: texts.length, arcs: arcs.length, lines: lines.length })

  // Trigger DXF download
  downloadDxf(walls, texts, arcs, lines, filename)
}
