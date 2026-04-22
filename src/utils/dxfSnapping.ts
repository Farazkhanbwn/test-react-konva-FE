/**
 * DXF Snapping Utilities
 * Snap-to-endpoint, snap-to-line, and alignment guide calculations
 */

import type { Pt } from './dxfGeometry'
import { closestPointOnSegment } from './dxfGeometry'
import type { WallSeg } from './wallsFromDxfJson'
import type { DxfArc } from '@/constants/dxfJsonData'

export type SnapType = 'endpoint' | 'midpoint' | 'arcCenter' | 'arcQuadrant' | null

export interface SnapPoint {
  x: number
  y: number
  type: SnapType
}

export interface AlignGuide {
  type: 'h' | 'v'
  coord: number
}

export interface SnapResult {
  point: Pt
  type: SnapType
  alignGuides: AlignGuide[]
  snapLineWall: { wallId: string; t: number } | null
}

/**
 * Calculate snap point from cursor position
 */
export function calculateSnap(
  x: number,
  y: number,
  walls: WallSeg[],
  arcs: DxfArc[],
  excludeIds: string[],
  snapEnabled: boolean,
  snapThreshold: number = 0.15,
  snapLineThreshold: number = 0.25
): SnapResult {
  if (!snapEnabled) {
    return {
      point: { x, y },
      type: null,
      alignGuides: [],
      snapLineWall: null,
    }
  }

  const excl = Array.isArray(excludeIds) ? excludeIds : (excludeIds ? [excludeIds] : [])

  // Collect all snap points from walls + arcs
  const snapPts: SnapPoint[] = []
  
  for (const w of walls) {
    if (excl.includes(w.id)) continue
    snapPts.push({ ...w.start, type: 'endpoint' })
    snapPts.push({ ...w.end, type: 'endpoint' })
    snapPts.push({
      x: (w.start.x + w.end.x) / 2,
      y: (w.start.y + w.end.y) / 2,
      type: 'midpoint',
    })
  }
  
  for (const a of arcs) {
    snapPts.push({ x: a.center.x, y: a.center.y, type: 'arcCenter' })
    for (const deg of [0, 90, 180, 270]) {
      const rad = deg * Math.PI / 180
      snapPts.push({
        x: a.center.x + a.radius * Math.cos(rad),
        y: a.center.y + a.radius * Math.sin(rad),
        type: 'arcQuadrant',
      })
    }
  }

  // 1. Nearest snap point (endpoint / midpoint / arc)
  let best: SnapPoint | null = null
  let bestD = snapThreshold
  
  for (const sp of snapPts) {
    const d = Math.hypot(sp.x - x, sp.y - y)
    if (d < bestD) {
      bestD = d
      best = sp
    }
  }
  
  if (best) {
    return {
      point: { x: best.x, y: best.y },
      type: best.type,
      alignGuides: [],
      snapLineWall: null,
    }
  }

  // 2. Segment midpoint snap (on-wall)
  let bestSeg: { wallId: string; t: number; pt: Pt } | null = null
  let bestSegD = snapLineThreshold
  
  for (const w of walls) {
    if (excl.includes(w.id)) continue
    const { pt, t, dist } = closestPointOnSegment(x, y, w.start.x, w.start.y, w.end.x, w.end.y)
    if (t > 0.01 && t < 0.99 && dist < bestSegD) {
      bestSegD = dist
      bestSeg = { wallId: w.id, t, pt }
    }
  }
  
  if (bestSeg) {
    return {
      point: bestSeg.pt,
      type: 'midpoint',
      alignGuides: [],
      snapLineWall: { wallId: bestSeg.wallId, t: bestSeg.t },
    }
  }

  // 3. Alignment guides (X or Y match)
  const ALIGN_TH = snapLineThreshold * 1.8
  const guides: AlignGuide[] = []
  let ax = x
  let ay = y
  
  for (const sp of snapPts) {
    if (Math.abs(sp.x - x) < ALIGN_TH && !guides.some(g => g.type === 'v')) {
      guides.push({ type: 'v', coord: sp.x })
      ax = sp.x
    }
    if (Math.abs(sp.y - y) < ALIGN_TH && !guides.some(g => g.type === 'h')) {
      guides.push({ type: 'h', coord: sp.y })
      ay = sp.y
    }
  }
  
  if (guides.length > 0) {
    return {
      point: { x: ax, y: ay },
      type: null,
      alignGuides: guides,
      snapLineWall: null,
    }
  }

  return {
    point: { x, y },
    type: null,
    alignGuides: [],
    snapLineWall: null,
  }
}
