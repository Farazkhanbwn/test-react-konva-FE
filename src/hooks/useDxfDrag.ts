/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DRAG HOOK (Phase 3.2)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Manages all drag operations: walls, furniture, windows, rooms.
 * 
 * WHAT IT PROVIDES:
 * - startWallDrag: Begin dragging walls
 * - startRoomDrag: Begin dragging a room
 * - updateDrag: Update drag position
 * - endDrag: Commit drag changes
 * - cancelDrag: Cancel drag operation
 * 
 * WHY SEPARATE:
 * - Centralizes drag state management
 * - Easier to add drag constraints (grid snap, bounds)
 * - Testable drag logic
 * - Can add drag preview, ghost images, etc.
 * 
 * USAGE:
 * ```tsx
 * function Wall({ id }) {
 *   const { startWallDrag, updateDrag, endDrag } = useDxfDrag()
 *   return <Line 
 *     onMouseDown={() => startWallDrag(id, wx, wy)}
 *     onMouseMove={() => updateDrag(wx, wy)}
 *     onMouseUp={endDrag}
 *   />
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from 'react'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useSelection } from '@/contexts/SelectionStateContext'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import { cloneDoc } from '@/utils/dxfDocumentUtils'

interface ActiveDrag {
  wallId: string
  toMoveWallIds: string[]
  toMoveTextIds: string[]
  toMoveArcHandles: string[]
  initWX: number
  initWY: number
}

interface RoomDrag {
  wallIds: Set<string>
  initCX: number
  initCY: number
}

export function useDxfDrag() {
  const { walls, setWalls, planDoc, setPlanDoc, snapshot } = useEditorState()
  const { selectedIds } = useSelection()

  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 })
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const dragDeltaRef = useRef({ dx: 0, dy: 0 })

  const [roomDrag, setRoomDrag] = useState<RoomDrag | null>(null)
  const [roomDragDelta, setRoomDragDelta] = useState({ dx: 0, dy: 0 })
  const roomDragRef = useRef<RoomDrag | null>(null)
  const roomDragDeltaRef = useRef({ dx: 0, dy: 0 })

  /**
   * Apply drag delta to walls
   */
  const applyDrag = useCallback((ws: WallSeg[], drag: ActiveDrag, delta: { dx: number; dy: number }): WallSeg[] => {
    const { toMoveWallIds, toMoveArcHandles } = drag
    const { dx, dy } = delta
    const toMove = new Set(toMoveWallIds)
    const arcSet = new Set(toMoveArcHandles)
    
    return ws.map(w => {
      if (toMove.has(w.id) || (w.fromArc && arcSet.has(w.fromArc))) {
        return {
          ...w,
          start: { x: w.start.x + dx, y: w.start.y + dy },
          end: { x: w.end.x + dx, y: w.end.y + dy }
        }
      }
      return w
    })
  }, [])

  /**
   * Start dragging walls
   */
  const startWallDrag = useCallback((wallId: string, initWX: number, initWY: number, currentSelection: Set<string>) => {
    snapshot()
    
    const toMoveW = walls.filter(w => currentSelection.has(w.id)).map(w => w.id)
    const toMoveT = planDoc.texts.filter(t => currentSelection.has(t.handle)).map(t => t.handle)
    const toMoveA = planDoc.arcs.filter(a => currentSelection.has(a.handle)).map(a => a.handle)
    
    const drag: ActiveDrag = {
      wallId,
      toMoveWallIds: toMoveW,
      toMoveTextIds: toMoveT,
      toMoveArcHandles: toMoveA,
      initWX,
      initWY,
    }
    
    activeDragRef.current = drag
    setActiveDrag(drag)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [walls, planDoc.texts, planDoc.arcs, snapshot])

  /**
   * Start dragging a room
   */
  const startRoomDrag = useCallback((wallIds: Set<string>, initCX: number, initCY: number) => {
    snapshot()
    
    const drag: RoomDrag = {
      wallIds,
      initCX,
      initCY,
    }
    
    roomDragRef.current = drag
    setRoomDrag(drag)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }
    setRoomDragDelta({ dx: 0, dy: 0 })
  }, [snapshot])

  /**
   * Update drag position
   */
  const updateDrag = useCallback((wx: number, wy: number, orthoEnabled = false) => {
    if (activeDragRef.current) {
      let dx = wx - activeDragRef.current.initWX
      let dy = wy - activeDragRef.current.initWY
      
      if (orthoEnabled) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0
        else dx = 0
      }
      
      dragDeltaRef.current = { dx, dy }
      setDragDelta({ dx, dy })
    }
  }, [])

  /**
   * Update room drag position
   */
  const updateRoomDrag = useCallback((dx: number, dy: number) => {
    if (roomDragRef.current) {
      roomDragDeltaRef.current = { dx, dy }
      setRoomDragDelta({ dx, dy })
    }
  }, [])

  /**
   * End drag and commit changes
   */
  const endDrag = useCallback(() => {
    const drag = activeDragRef.current
    if (!drag) return

    const delta = dragDeltaRef.current
    const aSet = new Set(drag.toMoveArcHandles)
    const arcKey = (h: string) => h.replace(/^arc-/, '')

    // Apply to walls
    setWalls(prev => applyDrag(prev, drag, delta))

    // Apply to document (texts, arcs, door lines)
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx =>
        new Set(drag.toMoveTextIds).has(tx.handle)
          ? { ...tx, position: { x: tx.position.x + delta.dx, y: tx.position.y + delta.dy, z: 0 } }
          : tx
      ),
      arcs: prev.arcs.map(a =>
        aSet.has(a.handle)
          ? { ...a, center: { ...a.center, x: a.center.x + delta.dx, y: a.center.y + delta.dy } }
          : a
      ),
      door_lines: (prev.door_lines ?? []).map(l => {
        const belongsToMovedArc = drag.toMoveArcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))
        if (!belongsToMovedArc) return l
        return {
          ...l,
          start: { ...l.start, x: l.start.x + delta.dx, y: l.start.y + delta.dy },
          end: { ...l.end, x: l.end.x + delta.dx, y: l.end.y + delta.dy }
        }
      }),
    }))

    // Clear drag state
    activeDragRef.current = null
    setActiveDrag(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [applyDrag, setWalls, setPlanDoc])

  /**
   * End room drag and commit changes
   */
  const endRoomDrag = useCallback(() => {
    const drag = roomDragRef.current
    if (!drag) return

    const { dx, dy } = roomDragDeltaRef.current
    
    if (dx !== 0 || dy !== 0) {
      // Apply room delta to walls and document
      const idList = [...drag.wallIds]
      
      setWalls(prev => prev.map(w => {
        if (!drag.wallIds.has(w.id)) return w
        return {
          ...w,
          start: { x: w.start.x + dx, y: w.start.y + dy },
          end: { x: w.end.x + dx, y: w.end.y + dy }
        }
      }))

      // Apply to document
      setPlanDoc(prev => {
        const next = cloneDoc(prev)
        const polyVertIdx = new Map<string, Set<number>>()
        
        for (const wid of idList) {
          if (wid.startsWith('ln-')) {
            const h = wid.slice(3)
            next.lines = next.lines.map(l => l.handle !== h ? l : {
              ...l,
              start: { ...l.start, x: l.start.x + dx, y: l.start.y + dy },
              end: { ...l.end, x: l.end.x + dx, y: l.end.y + dy },
            })
          } else if (wid.startsWith('pl-')) {
            const rest = wid.slice(3)
            const dash = rest.lastIndexOf('-')
            if (dash <= 0) continue
            const ph = rest.slice(0, dash)
            const ei = Number(rest.slice(dash + 1))
            if (!Number.isFinite(ei)) continue
            if (!polyVertIdx.has(ph)) polyVertIdx.set(ph, new Set())
            const s = polyVertIdx.get(ph)!
            s.add(ei)
            s.add(ei + 1)
          }
        }
        
        for (const [ph, idxs] of polyVertIdx) {
          next.polylines = next.polylines.map(pl => {
            if (pl.handle !== ph) return pl
            const vertices = pl.vertices.map((v, j) =>
              idxs.has(j) ? { ...v, x: v.x + dx, y: v.y + dy } : v
            )
            return { ...pl, vertices }
          })
        }
        
        return next
      })
    }

    // Clear drag state
    roomDragRef.current = null
    setRoomDrag(null)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }
    setRoomDragDelta({ dx: 0, dy: 0 })
  }, [setWalls, setPlanDoc])

  /**
   * Cancel drag without committing
   */
  const cancelDrag = useCallback(() => {
    activeDragRef.current = null
    setActiveDrag(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
    
    roomDragRef.current = null
    setRoomDrag(null)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }
    setRoomDragDelta({ dx: 0, dy: 0 })
  }, [])

  /**
   * Get effective walls with drag applied
   */
  const getEffectiveWalls = useCallback(() => {
    if (activeDrag) {
      return applyDrag(walls, activeDrag, dragDelta)
    }
    return walls
  }, [walls, activeDrag, dragDelta, applyDrag])

  return {
    // State
    activeDrag,
    dragDelta,
    roomDrag,
    roomDragDelta,
    isDragging: activeDrag !== null || roomDrag !== null,
    
    // Actions
    startWallDrag,
    startRoomDrag,
    updateDrag,
    updateRoomDrag,
    endDrag,
    endRoomDrag,
    cancelDrag,
    getEffectiveWalls,
    
    // Refs (for external access if needed)
    activeDragRef,
    dragDeltaRef,
    roomDragRef,
    roomDragDeltaRef,
  }
}
