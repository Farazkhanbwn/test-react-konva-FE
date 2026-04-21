/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FURNITURE HOOK (Phase 3.3)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Manages furniture grouping, selection, and movement.
 * 
 * WHAT IT PROVIDES:
 * - furnitureGroups: Grouped furniture lines
 * - furnitureLabels: Map of group key → label
 * - moveFurniture: Move a furniture group
 * - deleteFurniture: Delete a furniture group
 * - getFurnitureCategory: Get category for a group
 * 
 * WHY SEPARATE:
 * - Encapsulates furniture-specific logic
 * - Easier to add features (rotate, duplicate, library)
 * - Testable furniture operations
 * - Can add furniture catalog, templates, etc.
 * 
 * USAGE:
 * ```tsx
 * function FurnitureLayer() {
 *   const { furnitureGroups, moveFurniture } = useDxfFurniture()
 *   return furnitureGroups.map(({ key, lines }) => (
 *     <Group key={key} onDragEnd={(dx, dy) => moveFurniture(key, dx, dy)}>
 *       {lines.map(ln => <Line ... />)}
 *     </Group>
 *   ))
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useCallback } from 'react'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useSelection } from '@/contexts/SelectionStateContext'
import type { DxfLine } from '@/constants/dxfJsonData'
import { FURNITURE_DXF_TEMPLATES } from '@/data/furnitureLibraryDxf'

/**
 * Group id for draggable furniture — lines with the same key move as one object.
 */
function furnitureGroupKeyFromHandle(handle: string): string {
  if (!handle.startsWith('furn-')) return handle
  // Use only the first word after "furn-" so that component handles like
  // furn-bed-pillow-1 and furn-bed-1 all fall into the same "furn-bed" group.
  // Timestamp-based drag-drop handles (furn-1234567890-0) are also handled
  // correctly since the timestamp becomes the sole group identifier.
  return `furn-${handle.slice('furn-'.length).split('-')[0]}`
}

/** Maps block_name / template label → category (built once at module load). */
const FURNITURE_LABEL_TO_CATEGORY = new Map<string, string>(
  FURNITURE_DXF_TEMPLATES.map(t => [t.label, t.category as string])
)

export function useDxfFurniture() {
  const { planDoc, setPlanDoc, snapshot } = useEditorState()
  const { selectedFurnKey } = useSelection()

  /**
   * Furniture lines grouped so each piece drags together
   */
  const furnitureGroups = useMemo(() => {
    const groups = new Map<string, DxfLine[]>()
    const lines = planDoc.furniture_lines ?? []
    
    for (const ln of lines) {
      const key = furnitureGroupKeyFromHandle(ln.handle)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(ln)
    }
    
    return Array.from(groups.entries()).map(([key, lines]) => ({ key, lines }))
  }, [planDoc.furniture_lines])

  /**
   * Maps each furniture group key → the block_name from the nearest furniture insert
   */
  const furnitureLabels = useMemo(() => {
    const map = new Map<string, string>()
    
    for (const { key, lines } of furnitureGroups) {
      if (lines.length === 0) continue
      
      // Calculate centroid
      let sx = 0, sy = 0, count = 0
      for (const ln of lines) {
        sx += ln.start.x + ln.end.x
        sy += ln.start.y + ln.end.y
        count += 2
      }
      const cx = sx / count
      const cy = sy / count
      
      // Find nearest insert
      let bestLabel = ''
      let bestDist = Infinity
      for (const ins of planDoc.furniture_inserts) {
        const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
        if (d < bestDist) {
          bestDist = d
          bestLabel = ins.block_name
        }
      }
      
      if (bestLabel) map.set(key, bestLabel)
    }
    
    return map
  }, [furnitureGroups, planDoc.furniture_inserts])

  /**
   * Get category for a furniture group
   */
  const getFurnitureCategory = useCallback((furnKey: string): string | undefined => {
    const label = furnitureLabels.get(furnKey)
    if (!label) return undefined
    return FURNITURE_LABEL_TO_CATEGORY.get(label)
  }, [furnitureLabels])

  /**
   * Move a furniture group by delta
   */
  const moveFurniture = useCallback((furnKey: string, dx: number, dy: number) => {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
    
    setPlanDoc(prev => {
      // Identify which insert is linked to this group so we can move it too.
      // We find it by proximity to the group centroid BEFORE the move.
      const groupLines = (prev.furniture_lines ?? []).filter(
        ln => furnitureGroupKeyFromHandle(ln.handle) === furnKey
      )
      
      let linkedHandle = ''
      if (groupLines.length > 0) {
        let sx = 0, sy = 0, n = 0
        for (const ln of groupLines) {
          sx += ln.start.x + ln.end.x
          sy += ln.start.y + ln.end.y
          n += 2
        }
        const cx = sx / n, cy = sy / n
        
        let best = Infinity
        for (const ins of prev.furniture_inserts) {
          const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
          if (d < best) {
            best = d
            linkedHandle = ins.handle
          }
        }
      }
      
      return {
        ...prev,
        furniture_lines: (prev.furniture_lines ?? []).map(ln => {
          if (furnitureGroupKeyFromHandle(ln.handle) !== furnKey) return ln
          return {
            ...ln,
            start: { ...ln.start, x: ln.start.x + dx, y: ln.start.y + dy },
            end: { ...ln.end, x: ln.end.x + dx, y: ln.end.y + dy },
          }
        }),
        furniture_inserts: prev.furniture_inserts.map(ins =>
          ins.handle === linkedHandle
            ? { ...ins, position: { ...ins.position, x: ins.position.x + dx, y: ins.position.y + dy } }
            : ins
        ),
      }
    })
  }, [setPlanDoc])

  /**
   * Delete a furniture group
   */
  const deleteFurniture = useCallback((furnKey: string) => {
    snapshot()
    
    setPlanDoc(prev => {
      // Find the linked insert (by proximity) and remove it only if synthetic.
      const groupLines = (prev.furniture_lines ?? []).filter(
        ln => furnitureGroupKeyFromHandle(ln.handle) === furnKey
      )
      
      let syntheticHandle = ''
      if (groupLines.length > 0) {
        let sx = 0, sy = 0, n = 0
        for (const ln of groupLines) {
          sx += ln.start.x + ln.end.x
          sy += ln.start.y + ln.end.y
          n += 2
        }
        const cx = sx / n, cy = sy / n
        
        let best = Infinity, bestH = ''
        for (const ins of prev.furniture_inserts) {
          const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
          if (d < best) {
            best = d
            bestH = ins.handle
          }
        }
        
        if (bestH.startsWith('furn-ins-')) syntheticHandle = bestH
      }
      
      return {
        ...prev,
        furniture_lines: (prev.furniture_lines ?? []).filter(
          ln => furnitureGroupKeyFromHandle(ln.handle) !== furnKey
        ),
        furniture_inserts: syntheticHandle
          ? prev.furniture_inserts.filter(ins => ins.handle !== syntheticHandle)
          : prev.furniture_inserts,
      }
    })
  }, [snapshot, setPlanDoc])

  /**
   * Get centroid of a furniture group
   */
  const getFurnitureCentroid = useCallback((furnKey: string): { x: number; y: number } | null => {
    const group = furnitureGroups.find(g => g.key === furnKey)
    if (!group || group.lines.length === 0) return null
    
    let sx = 0, sy = 0, n = 0
    for (const ln of group.lines) {
      sx += ln.start.x + ln.end.x
      sy += ln.start.y + ln.end.y
      n += 2
    }
    
    return { x: sx / n, y: sy / n }
  }, [furnitureGroups])

  return {
    // State
    furnitureGroups,
    furnitureLabels,
    selectedFurnKey,
    
    // Actions
    moveFurniture,
    deleteFurniture,
    getFurnitureCategory,
    getFurnitureCentroid,
    
    // Utility
    furnitureGroupKeyFromHandle,
  }
}
