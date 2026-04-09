import type { DxfJsonDocument, DxfPolyline } from '@/constants/dxfJsonData'

/** Editable wall segment derived from parsed DXF JSON (lines + polyline edges). */
export interface WallSeg {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  isOuter: boolean
  isDetail: boolean
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

/** Wall segments for one LWPOLYLINE (open chain or closed loop). */
export function wallSegsFromPolyline(pl: DxfPolyline, isOuter: boolean): WallSeg[] {
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
    })
  }
  return ws
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
    ws.push(...wallSegsFromPolyline(pl, isOuter))
  }

  return ws
}
