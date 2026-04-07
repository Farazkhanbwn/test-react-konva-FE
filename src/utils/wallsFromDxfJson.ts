import type { DxfJsonDocument } from '@/constants/dxfJsonData'

/** Editable wall segment derived from parsed DXF JSON (lines + polyline edges). */
export interface WallSeg {
  id: string
  start: { x: number; y: number }
  end: { x: number; y: number }
  isOuter: boolean
  isDetail: boolean
}

const DETAIL_LEN_M = 1.5

/**
 * Build editable wall segments from a `DxfJsonDocument`.
 * Same shape your backend should return (or a subset) so the canvas stays in sync.
 */
export function wallsFromDxfJson(doc: DxfJsonDocument): WallSeg[] {
  const ws: WallSeg[] = []

  for (const ln of doc.lines) {
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

  const perims = doc.polylines.map((pl) => {
    let p = 0
    for (let i = 0; i < pl.vertices.length - 1; i++) {
      p += Math.hypot(
        pl.vertices[i + 1].x - pl.vertices[i].x,
        pl.vertices[i + 1].y - pl.vertices[i].y,
      )
    }
    return p
  })
  const maxPerim = perims.length ? Math.max(...perims) : 0

  for (let pi = 0; pi < doc.polylines.length; pi++) {
    const pl = doc.polylines[pi]
    const isOuter = perims[pi] >= maxPerim
    for (let i = 0; i < pl.vertices.length - 1; i++) {
      const v0 = pl.vertices[i]
      const v1 = pl.vertices[i + 1]
      if (Math.hypot(v1.x - v0.x, v1.y - v0.y) < 0.01) continue
      ws.push({
        id: `pl-${pl.handle}-${i}`,
        start: { x: v0.x, y: v0.y },
        end: { x: v1.x, y: v1.y },
        isOuter,
        isDetail: false,
      })
    }
  }

  return ws
}
