/**
 * Performance-critical hooks and utilities for the DXF floor plan editor.
 */

import { useRef, useMemo, useCallback, useEffect } from 'react'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import { closestPointOnSegment } from '@/utils/dxfGeometry'

// ─────────────────────────────────────────────────────────────────────────────
// 1. SPATIAL INDEX
//    Builds a uniform grid once when walls change.
//    Hit-test and snap queries go from O(n) to O(k), k ≈ 5–20.
// ─────────────────────────────────────────────────────────────────────────────

export interface SpatialIndex {
  query: (x: number, y: number, radius: number) => WallSeg[]
  CELL_SIZE: number
}

export function useSpatialIndex(walls: WallSeg[]): SpatialIndex {
  return useMemo(() => {
    const CELL_SIZE = 2.0 // world units — tune for your plan scale
    const grid = new Map<number, WallSeg[]>()

    // Fast integer hash: pack (cx, cy) into one number assuming |coord| < 65536
    const key = (cx: number, cy: number) => (cx + 65536) * 131072 + (cy + 65536)
    const wc = (v: number) => Math.floor(v / CELL_SIZE)

    for (const wall of walls) {
      const x0 = Math.min(wall.start.x, wall.end.x)
      const x1 = Math.max(wall.start.x, wall.end.x)
      const y0 = Math.min(wall.start.y, wall.end.y)
      const y1 = Math.max(wall.start.y, wall.end.y)
      for (let cx = wc(x0); cx <= wc(x1); cx++) {
        for (let cy = wc(y0); cy <= wc(y1); cy++) {
          const k = key(cx, cy)
          if (!grid.has(k)) grid.set(k, [])
          grid.get(k)!.push(wall)
        }
      }
    }

    const query = (x: number, y: number, radius: number): WallSeg[] => {
      const seen = new Set<string>()
      const result: WallSeg[] = []
      const r = Math.ceil(radius / CELL_SIZE) + 1
      const cx0 = wc(x) - r, cx1 = wc(x) + r
      const cy0 = wc(y) - r, cy1 = wc(y) + r
      for (let cx = cx0; cx <= cx1; cx++) {
        for (let cy = cy0; cy <= cy1; cy++) {
          const bucket = grid.get(key(cx, cy))
          if (!bucket) continue
          for (const w of bucket) {
            if (!seen.has(w.id)) {
              seen.add(w.id)
              result.push(w)
            }
          }
        }
      }
      return result
    }

    return { query, CELL_SIZE }
  }, [walls])
}


// ─────────────────────────────────────────────────────────────────────────────
// 2. STABLE CALLBACKS via "state snapshot ref"
//    All mutable state is mirrored into a ref on every render.
//    Event handlers read from the ref → can have empty dep arrays → never rebuild.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usage:
 *   const liveRef = useLiveRef({ walls, planDoc, t, selectedIds, ... })
 *   const onMidDragStart = useCallback((e, id, sel) => {
 *     const { walls, t } = liveRef.current
 *     // ...
 *   }, []) // ← empty deps, stable forever
 */
export function useLiveRef<T extends object>(state: T): React.MutableRefObject<T> {
  const ref = useRef<T>(state)
  // Sync every render — no overhead since this is just a ref write
  ref.current = state
  return ref
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. ENTITY BBOX CACHE
//    One bounding box per entity, recomputed only when geometry changes.
//    effectiveSelBBox becomes O(|selection|) instead of O(|all walls|).
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityBBox {
  minX: number; minY: number; maxX: number; maxY: number
}

export function useEntityBBoxCache(
  walls: WallSeg[],
  texts: Array<{ handle: string; position: { x: number; y: number }; height: number; text: string }>,
  arcs: Array<{ handle: string; center: { x: number; y: number }; radius: number }>,
): Map<string, EntityBBox> {
  return useMemo(() => {
    const cache = new Map<string, EntityBBox>()

    for (const w of walls) {
      cache.set(w.id, {
        minX: Math.min(w.start.x, w.end.x),
        maxX: Math.max(w.start.x, w.end.x),
        minY: Math.min(w.start.y, w.end.y),
        maxY: Math.max(w.start.y, w.end.y),
      })
    }

    for (const tx of texts) {
      // Approximate text bbox — same heuristic as renderer
      const lines = tx.text.replace(/\n$/, '').split('\n').filter(l => l.trim())
      const longest = lines.reduce((a, b) => a.length > b.length ? a : b, '')
      const h = tx.height
      const estW = Math.max(h * 1.5, longest.length * h * 0.52)
      const estH = h * 1.35 * Math.max(1, lines.length)
      cache.set(tx.handle, {
        minX: tx.position.x,
        maxX: tx.position.x + estW,
        minY: tx.position.y - estH,
        maxY: tx.position.y,
      })
    }

    for (const a of arcs) {
      cache.set(a.handle, {
        minX: a.center.x - a.radius,
        maxX: a.center.x + a.radius,
        minY: a.center.y - a.radius,
        maxY: a.center.y + a.radius,
      })
    }

    return cache
  }, [walls, texts, arcs])
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. BATCHED SELECTION STATE
//    8 separate useState calls → 1 object → 1 re-render per selection change
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionState {
  ids: Set<string>
  groupId: number | null
  singleId: string | null      // legacy selectedId
  roomIndex: number | null
  textHandle: string | null
  arcHandle: string | null
  winKey: string | null
  furnKey: string | null
  dimKey: string | null
}

export const EMPTY_SELECTION: SelectionState = {
  ids: new Set(),
  groupId: null,
  singleId: null,
  roomIndex: null,
  textHandle: null,
  arcHandle: null,
  winKey: null,
  furnKey: null,
  dimKey: null,
}

// Immutable helpers to avoid accidental mutation
export const withIds = (sel: SelectionState, ids: Set<string>): SelectionState =>
  ({ ...sel, ids, groupId: null, singleId: null, roomIndex: null,
     textHandle: null, arcHandle: null, winKey: null, furnKey: null, dimKey: null })

export const withGroup = (sel: SelectionState, groupId: number, ids: Set<string>): SelectionState =>
  ({ ...EMPTY_SELECTION, groupId, ids })

export const withText = (sel: SelectionState, textHandle: string): SelectionState =>
  ({ ...EMPTY_SELECTION, textHandle, ids: new Set([textHandle]) })

export const withArc = (sel: SelectionState, arcHandle: string): SelectionState =>
  ({ ...EMPTY_SELECTION, arcHandle, ids: new Set([arcHandle]) })

export const withWin = (sel: SelectionState, winKey: string): SelectionState =>
  ({ ...EMPTY_SELECTION, winKey })

export const withFurn = (sel: SelectionState, furnKey: string): SelectionState =>
  ({ ...EMPTY_SELECTION, furnKey })

export const withRoom = (sel: SelectionState, roomIndex: number): SelectionState =>
  ({ ...EMPTY_SELECTION, roomIndex })


// ─────────────────────────────────────────────────────────────────────────────
// 5. RAF-THROTTLED MOUSEMOVE
//    Ensures snap/preview updates run at most once per animation frame.
//    Drag-move bypasses throttle (runs immediately via ref).
// ─────────────────────────────────────────────────────────────────────────────

export function useRafThrottle<T>(callback: (arg: T) => void): (arg: T) => void {
  const rafRef = useRef(0)
  const pendingRef = useRef<T | null>(null)
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  return useCallback((arg: T) => {
    pendingRef.current = arg
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0
        if (pendingRef.current !== null) {
          callbackRef.current(pendingRef.current)
          pendingRef.current = null
        }
      })
    }
  }, [])
}


// ─────────────────────────────────────────────────────────────────────────────
// 6. DEBOUNCED ROOM DETECTION
//    Room detection (DCEL) runs at most once per 200ms after wall changes stop.
//    During editing, stale rooms are shown — imperceptible to users.
// ─────────────────────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}


// ─────────────────────────────────────────────────────────────────────────────
// 7. LAYER VISIBILITY CACHE
//    isLayerVisible(layer) called inside tight render loops.
//    Convert to a Set lookup instead of a callback closure.
// ─────────────────────────────────────────────────────────────────────────────

export function useLayerCache(
  hiddenLayers: Set<string>,
  lockedLayers: Set<string>,
) {
  // Returns stable object references when sets haven't changed
  const visibleSet = useMemo(() => hiddenLayers, [hiddenLayers])
  const lockedSet = useMemo(() => lockedLayers, [lockedLayers])

  const isVisible = useCallback((layer: string) => !visibleSet.has(layer), [visibleSet])
  const isLocked = useCallback((layer: string) => lockedSet.has(layer), [lockedSet])

  return { isVisible, isLocked, visibleSet, lockedSet }
}


// ─────────────────────────────────────────────────────────────────────────────
// 8. WALL HIT-TEST (replaces wallHitAreaLines JSX array)
//    O(k) with spatial index vs O(n) brute force.
//    Returns the closest wall within threshold, or null.
// ─────────────────────────────────────────────────────────────────────────────

export function makeWallHitTest(
  walls: WallSeg[],
  spatialIndex: SpatialIndex,
  toMoveSet: Set<string>,
  isLayerVisible: (l: string) => boolean,
  isLayerLocked: (l: string) => boolean,
  tSc: number,     // transform scale (world→canvas)
  zoom: number,
) {
  const threshold = 10 / (tSc * zoom) // 10px in world coords

  return (wx: number, wy: number): WallSeg | null => {
    const candidates = spatialIndex.query(wx, wy, threshold * 2)
    let bestWall: WallSeg | null = null
    let bestDist = threshold

    for (const wall of candidates) {
      if (wall.fromArc) continue
      if (toMoveSet.has(wall.id)) continue
      if (!isLayerVisible(wall.layer ?? '0')) continue
      if (isLayerLocked(wall.layer ?? '0')) continue

      const { dist } = closestPointOnSegment(wx, wy, wall.start.x, wall.start.y, wall.end.x, wall.end.y)
      if (dist < bestDist) {
        bestDist = dist
        bestWall = wall
      }
    }
    return bestWall
  }
}