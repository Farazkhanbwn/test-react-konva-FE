/**
 * DXF Room Detection Utilities
 * DCEL-based minimal face extraction for detecting enclosed rooms
 */

import type { Pt } from './dxfGeometry'
import { polyArea, nearSamePt } from './dxfGeometry'
import type { WallSeg } from './wallsFromDxfJson'
import polygonClipping from 'polygon-clipping'

const SNAP_TH = 0.15

/**
 * Detect rooms from wall segments (returns polygons only)
 */
export function detectRooms(walls: WallSeg[]): Pt[][] {
  // Exclude arc chord segments and original DXF polylines (large floor plan perimeters).
  // Keep user-created polylines ('pl-user-pl-*') so drag-dropped room templates are detected.
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.fromArc &&
    (!w.id.startsWith('pl-') || w.id.startsWith('pl-user-pl-')))
  if (segs.length < 3) return []

  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
    }
    return nodes.push({ x, y }) - 1
  }

  const eKeys = new Set<string>()
  const eList: [number, number][] = []
  
  for (const w of segs) {
    const u = getN(w.start.x, w.start.y)
    const v = getN(w.end.x, w.end.y)
    if (u === v) continue
    const k = `${Math.min(u, v)},${Math.max(u, v)}`
    if (!eKeys.has(k)) {
      eKeys.add(k)
      eList.push([u, v])
    }
  }
  
  if (eList.length < 3) return []

  const adj = new Map<number, number[]>()
  for (const [u, v] of eList) {
    for (const [a, b] of [[u, v], [v, u]] as const) {
      if (!adj.has(a)) adj.set(a, [])
      adj.get(a)!.push(b)
    }
  }
  
  for (const [n, nb] of adj) {
    const pn = nodes[n]
    nb.sort((a, b) =>
      Math.atan2(nodes[a].y - pn.y, nodes[a].x - pn.x) -
      Math.atan2(nodes[b].y - pn.y, nodes[b].x - pn.x)
    )
  }

  const nextHE = new Map<string, string>()
  for (const [u, v] of eList) {
    for (const [s, e] of [[u, v], [v, u]] as const) {
      const backA = Math.atan2(nodes[s].y - nodes[e].y, nodes[s].x - nodes[e].x)
      let bestW = -1
      let bestCW = Infinity
      
      for (const w of adj.get(e) ?? []) {
        const outA = Math.atan2(nodes[w].y - nodes[e].y, nodes[w].x - nodes[e].x)
        let cw = backA - outA
        while (cw <= 0) cw += 2 * Math.PI
        if (cw < bestCW) {
          bestCW = cw
          bestW = w
        }
      }
      
      if (bestW !== -1) nextHE.set(`${s},${e}`, `${e},${bestW}`)
    }
  }

  const traced = new Set<string>()
  const rawFaces: Pt[][] = []
  
  for (const [u, v] of eList) {
    for (const [s, e] of [[u, v], [v, u]] as const) {
      const sk = `${s},${e}`
      if (traced.has(sk) || !nextHE.has(sk)) continue
      
      const ids: number[] = []
      let cur = sk
      let guard = 0
      
      do {
        traced.add(cur)
        ids.push(Number(cur.split(',')[0]))
        cur = nextHE.get(cur) ?? ''
        guard++
      } while (cur !== sk && cur !== '' && guard < 60)
      
      if (cur === sk && ids.length >= 3) {
        rawFaces.push(ids.map(i => nodes[i]))
      }
    }
  }

  const interiorFaces = rawFaces.filter(f => polyArea(f) > 0.05)
  if (!interiorFaces.length) return []

  const validFaces: Pt[][] = []
  for (const face of interiorFaces) {
    try {
      const ring = face.map(p => [p.x, p.y] as [number, number])
      ring.push(ring[0])
      const result = polygonClipping.union([[ring]])
      
      for (const poly of result) {
        for (const contour of poly) {
          const pts = contour.slice(0, -1).map(([x, y]) => ({ x, y }))
          if (pts.length >= 3 && Math.abs(polyArea(pts)) > 0.05) {
            validFaces.push(pts)
          }
        }
      }
    } catch {
      validFaces.push(face)
    }
  }
  
  return validFaces
}

/**
 * Detect rooms with associated wall IDs
 */
export function detectRoomsWithWalls(walls: WallSeg[]): Array<{ polygon: Pt[]; wallIds: string[] }> {
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.fromArc &&
    (!w.id.startsWith('pl-') || w.id.startsWith('pl-user-pl-')))
  if (segs.length < 3) return []

  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++) {
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
    }
    return nodes.push({ x, y }) - 1
  }

  const eKeys = new Set<string>()
  const eList: [number, number][] = []
  const eWallIds: string[] = []

  for (const w of segs) {
    const u = getN(w.start.x, w.start.y)
    const v = getN(w.end.x, w.end.y)
    if (u === v) continue
    const k = `${Math.min(u, v)},${Math.max(u, v)}`
    if (!eKeys.has(k)) {
      eKeys.add(k)
      eList.push([u, v])
      eWallIds.push(w.id)
    }
  }
  
  if (eList.length < 3) return []

  const adj = new Map<number, number[]>()
  for (const [u, v] of eList) {
    for (const [a, b] of [[u, v], [v, u]] as const) {
      if (!adj.has(a)) adj.set(a, [])
      adj.get(a)!.push(b)
    }
  }
  
  for (const [n, nb] of adj) {
    const pn = nodes[n]
    nb.sort((a, b) =>
      Math.atan2(nodes[a].y - pn.y, nodes[a].x - pn.x) -
      Math.atan2(nodes[b].y - pn.y, nodes[b].x - pn.x)
    )
  }

  const heWallId = new Map<string, string>()
  for (let idx = 0; idx < eList.length; idx++) {
    const [u, v] = eList[idx]
    const wid = eWallIds[idx]
    heWallId.set(`${u},${v}`, wid)
    heWallId.set(`${v},${u}`, wid)
  }

  const nextHE = new Map<string, string>()
  for (const [u, v] of eList) {
    for (const [s, e] of [[u, v], [v, u]] as const) {
      const backA = Math.atan2(nodes[s].y - nodes[e].y, nodes[s].x - nodes[e].x)
      let bestW = -1
      let bestCW = Infinity
      
      for (const w of adj.get(e) ?? []) {
        const outA = Math.atan2(nodes[w].y - nodes[e].y, nodes[w].x - nodes[e].x)
        let cw = backA - outA
        while (cw <= 0) cw += 2 * Math.PI
        if (cw < bestCW) {
          bestCW = cw
          bestW = w
        }
      }
      
      if (bestW !== -1) nextHE.set(`${s},${e}`, `${e},${bestW}`)
    }
  }

  const traced = new Set<string>()
  const result: Array<{ polygon: Pt[]; wallIds: string[] }> = []
  
  for (const [u, v] of eList) {
    for (const [s, e] of [[u, v], [v, u]] as const) {
      const sk = `${s},${e}`
      if (traced.has(sk) || !nextHE.has(sk)) continue
      
      const ids: number[] = []
      const faceWallIds: string[] = []
      let cur = sk
      let guard = 0
      
      do {
        traced.add(cur)
        ids.push(Number(cur.split(',')[0]))
        const wid = heWallId.get(cur)
        if (wid && !faceWallIds.includes(wid)) faceWallIds.push(wid)
        cur = nextHE.get(cur) ?? ''
        guard++
      } while (cur !== sk && cur !== '' && guard < 60)
      
      if (cur === sk && ids.length >= 3) {
        const polygon = ids.map(i => nodes[i])
        if (polyArea(polygon) > 0.05) {
          result.push({ polygon, wallIds: faceWallIds })
        }
      }
    }
  }
  
  return result
}

/**
 * Find wall IDs on room boundary
 */
export function wallIdsOnRoomBoundary(room: Pt[], segs: WallSeg[]): string[] {
  const eps = Math.max(SNAP_TH * 5, 0.12)
  const n = room.length
  const found = new Set<string>()
  
  for (let i = 0; i < n; i++) {
    const a = room[i]
    const b = room[(i + 1) % n]
    
    for (const w of segs) {
      const s = w.start
      const e = w.end
      const fwd = nearSamePt(s, a, eps) && nearSamePt(e, b, eps)
      const rev = nearSamePt(s, b, eps) && nearSamePt(e, a, eps)
      
      if (fwd || rev) {
        found.add(w.id)
        break
      }
    }
  }
  
  return [...found]
}

/**
 * Translate walls by IDs
 */
export function translateWallsByIds(
  ws: WallSeg[],
  ids: Set<string>,
  dx: number,
  dy: number
): WallSeg[] {
  if (!ids.size || (dx === 0 && dy === 0)) return ws
  
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    return {
      ...w,
      start: { x: w.start.x + dx, y: w.start.y + dy },
      end: { x: w.end.x + dx, y: w.end.y + dy },
    }
  })
}
