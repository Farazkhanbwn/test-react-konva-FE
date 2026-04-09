import type { DxfJsonDocument, DxfPolyline } from '@/constants/dxfJsonData'

/** Editable wall segment derived from parsed DXF JSON (lines + polyline edges). */
export interface WallSeg {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  isOuter: boolean
  isDetail: boolean
  /** When set, this segment belongs to a named polyline group. Clicking any member
   *  selects the entire group; drag / rotate / resize operate on the group as a unit. */
  groupId?: string
}

const DETAIL_LEN_M = 1.5

function polylinePerimeter(pl: DxfPolyline): number {
  const n = pl.vertices.length
  if (n < 2) return 0
  let p = 0
  const maxI = pl.closed ? n : n - 1
  for (let i = 0; i < maxI; i++) {
    const v0 = pl.vertices[i]
    const j = pl.closed ? (i + 1) % n : i + 1
    const v1 = pl.vertices[j]
    p += Math.hypot(v1.x - v0.x, v1.y - v0.y)
  }
  return p
}

/** Wall segments for one LWPOLYLINE (open chain or closed loop).
 *  Pass `groupId` so all segments are tagged as belonging to the same entity. */
export function wallSegsFromPolyline(pl: DxfPolyline, isOuter: boolean, groupId?: string): WallSeg[] {
  const ws: WallSeg[] = []
  const n = pl.vertices.length
  if (n < 2) return ws
  const maxI = pl.closed ? n : n - 1
  for (let i = 0; i < maxI; i++) {
    const v0 = pl.vertices[i]
    const j = pl.closed ? (i + 1) % n : i + 1
    const v1 = pl.vertices[j]
    if (Math.hypot(v1.x - v0.x, v1.y - v0.y) < 0.01) continue
    ws.push({
      id: `pl-${pl.handle}-${i}`,
      start: { x: v0.x, y: v0.y },
      end: { x: v1.x, y: v1.y },
      isOuter,
      isDetail: false,
      ...(groupId ? { groupId } : {}),
    })
  }
  return ws
}

/**
 * Given an array of WallSegs that all share the same groupId, returns them
 * in chain order so that each segment's end point connects to the next
 * segment's start point.  Segments are flipped (start↔end swapped) when
 * needed to maintain connectivity.  Any disconnected tail is appended as-is.
 *
 * This is required before DXF export so grouped walls become a valid
 * LWPOLYLINE (ordered vertex list) rather than an unordered bag of edges.
 */
export function sortPolylineVertices(walls: WallSeg[]): WallSeg[] {
  if (walls.length <= 1) return [...walls]
  const THRESH = 0.01
  const near = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.abs(a.x - b.x) < THRESH && Math.abs(a.y - b.y) < THRESH

  const remaining = [...walls]
  const chain: WallSeg[] = [remaining.splice(0, 1)[0]]

  while (remaining.length > 0) {
    const tail = chain[chain.length - 1].end
    let matched = false
    for (let i = 0; i < remaining.length; i++) {
      if (near(remaining[i].start, tail)) {
        chain.push(remaining.splice(i, 1)[0])
        matched = true
        break
      }
      if (near(remaining[i].end, tail)) {
        // segment is backwards — flip it
        const w = remaining.splice(i, 1)[0]
        chain.push({ ...w, start: w.end, end: w.start })
        matched = true
        break
      }
    }
    if (!matched) {
      // gap in chain — append the rest as-is (export will still work, just not closed)
      chain.push(...remaining.splice(0))
    }
  }
  return chain
}

/**
 * Build editable wall segments from a `DxfJsonDocument`.
 * Same shape your backend should return (or a subset) so the canvas stays in sync.
 */
export function wallsFromDxfJson(doc: DxfJsonDocument): WallSeg[] {
  const ws: WallSeg[] = []

  for (const ln of doc.lines) {
    /* Door-frame lines (dfl-*) and window lines (win-*) are rendered in the
       dedicated arc/door layer, not as editable wall segments. */
    if (ln.handle.startsWith('dfl-') || ln.handle.startsWith('win-')) continue
    const len = Math.hypot(ln.end.x - ln.start.x, ln.end.y - ln.start.y)
    if (len < 0.01) continue
    ws.push({
      id: `ln-${ln.handle}`,
      start: { x: ln.start.x, y: ln.start.y },
      end: { x: ln.end.x, y: ln.end.y },
      isOuter: false,
      isDetail: len < DETAIL_LEN_M,
    })
  }

  const perims = doc.polylines.map(polylinePerimeter)
  const maxPerim = perims.length ? Math.max(...perims) : 0

  for (let pi = 0; pi < doc.polylines.length; pi++) {
    const pl = doc.polylines[pi]
    const isOuter = perims[pi] >= maxPerim
    // All segments of the same LWPOLYLINE share a groupId — they are one DXF entity.
    // On export, grouped walls → LWPOLYLINE; ungrouped walls → LINE.
    const groupId = `pl-${pl.handle}`
    ws.push(...wallSegsFromPolyline(pl, isOuter, groupId))
  }

  return ws
}
