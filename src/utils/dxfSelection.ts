/**
 * DXF Selection Utilities
 * Selection box calculations and multi-select logic
 */

import type { Pt } from './dxfGeometry'
import { lineIntersectsRect } from './dxfGeometry'
import type { WallSeg } from './wallsFromDxfJson'
import type { DxfText, DxfArc } from '@/constants/dxfJsonData'

export interface SelectionBox {
  start: Pt
  current: Pt
}

export interface SelectionResult {
  box: {
    x1: number
    y1: number
    x2: number
    y2: number
    isWindow: boolean
  }
  newlySelectedCount: number
  ids: string[]
}

/**
 * Calculate selection from a selection box
 */
export function calculateSelection(
  selectionBox: SelectionBox,
  walls: WallSeg[],
  texts: DxfText[],
  arcs: DxfArc[]
): SelectionResult {
  const { start, current } = selectionBox
  const x1 = Math.min(start.x, current.x)
  const x2 = Math.max(start.x, current.x)
  const y1 = Math.min(start.y, current.y)
  const y2 = Math.max(start.y, current.y)
  const isWindow = start.x < current.x

  const newlySelected = new Set<string>()

  // Select walls
  for (const w of walls) {
    if (w.fromArc) continue
    
    if (isWindow) {
      // Window selection: both endpoints must be inside
      const sIn = w.start.x >= x1 && w.start.x <= x2 && w.start.y >= y1 && w.start.y <= y2
      const eIn = w.end.x >= x1 && w.end.x <= x2 && w.end.y >= y1 && w.end.y <= y2
      if (sIn && eIn) newlySelected.add(w.id)
    } else {
      // Crossing selection: line intersects box
      if (lineIntersectsRect(w.start, w.end, x1, y1, x2, y2)) {
        newlySelected.add(w.id)
      }
    }
  }

  // Select texts
  for (const tx of texts) {
    if (tx.position.x >= x1 && tx.position.x <= x2 && tx.position.y >= y1 && tx.position.y <= y2) {
      newlySelected.add(tx.handle)
    }
  }

  // Select arcs
  for (const a of arcs) {
    if (a.center.x >= x1 && a.center.x <= x2 && a.center.y >= y1 && a.center.y <= y2) {
      newlySelected.add(a.handle)
    }
  }

  return {
    box: { x1, y1, x2, y2, isWindow },
    newlySelectedCount: newlySelected.size,
    ids: [...newlySelected],
  }
}

/**
 * Get all wall IDs in a group
 */
export function getGroupWallIds(wallId: string, walls: WallSeg[]): string[] {
  const target = walls.find(w => w.id === wallId)
  if (!target?.groupId) return [wallId]
  
  const gid = target.groupId
  return walls.filter(w => w.groupId === gid).map(w => w.id)
}

/**
 * Toggle selection with Ctrl/Cmd modifier
 */
export function toggleSelection(
  currentSelection: Set<string>,
  itemId: string,
  isCtrlPressed: boolean
): Set<string> {
  if (!isCtrlPressed) {
    return new Set([itemId])
  }
  
  const next = new Set(currentSelection)
  if (next.has(itemId)) {
    next.delete(itemId)
  } else {
    next.add(itemId)
  }
  
  return next
}

/**
 * Add items to selection
 */
export function addToSelection(
  currentSelection: Set<string>,
  itemIds: string[]
): Set<string> {
  const next = new Set(currentSelection)
  itemIds.forEach(id => next.add(id))
  return next
}

/**
 * Remove items from selection
 */
export function removeFromSelection(
  currentSelection: Set<string>,
  itemIds: string[]
): Set<string> {
  const next = new Set(currentSelection)
  itemIds.forEach(id => next.delete(id))
  return next
}
