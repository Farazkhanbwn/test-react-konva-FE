/**
 * DXF Geometry Utilities
 * Pure functions for coordinate transformations and geometric calculations
 */

export interface Pt {
  x: number
  y: number
}

export interface Transform {
  sc: number
  oX: number
  oY: number
  emin: number[]
  wH: number
}

/**
 * Convert world coordinates to canvas coordinates
 */
export function toC(wx: number, wy: number, t: Transform): [number, number] {
  return [
    (wx - t.emin[0]) * t.sc + t.oX,
    t.oY + (t.wH - (wy - t.emin[1])) * t.sc,
  ]
}

/**
 * Convert canvas coordinates to world coordinates
 */
export function toW(cx: number, cy: number, t: Transform): [number, number] {
  return [
    (cx - t.oX) / t.sc + t.emin[0],
    t.emin[1] + t.wH - (cy - t.oY) / t.sc,
  ]
}

/**
 * Build transform object from extents and canvas size
 */
export function buildTransform(
  emin: number[],
  emax: number[],
  canvasW: number,
  canvasH: number,
  padding: number = 55
): Transform {
  const wW = emax[0] - emin[0]
  const wH = emax[1] - emin[1]
  const aW = Math.max(40, canvasW - padding * 2)
  const aH = Math.max(40, canvasH - padding * 2)
  const sc = Math.min(aW / wW, aH / wH)
  const oX = padding + (aW - wW * sc) / 2
  const oY = padding + (aH - wH * sc) / 2
  return { sc, oX, oY, emin, wH }
}

/**
 * Rotate a point around a center
 */
export function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angle: number
): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = px - cx
  const dy = py - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

/**
 * Find closest point on a line segment
 */
export function closestPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { pt: Pt; t: number; dist: number } {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  
  if (lenSq < 1e-12) {
    return {
      pt: { x: ax, y: ay },
      t: 0,
      dist: Math.hypot(px - ax, py - ay),
    }
  }
  
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + t * dx
  const cy = ay + t * dy
  
  return {
    pt: { x: cx, y: cy },
    t,
    dist: Math.hypot(px - cx, py - cy),
  }
}

/**
 * Calculate polygon area (signed)
 */
export function polyArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}

/**
 * Check if two points are nearly the same
 */
export function nearSamePt(a: Pt, b: Pt, eps: number): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps
}

/**
 * Check if a line intersects a rectangle
 */
export function lineIntersectsRect(
  a: Pt,
  b: Pt,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): boolean {
  // Check if either endpoint is inside
  if (a.x >= x1 && a.x <= x2 && a.y >= y1 && a.y <= y2) return true
  if (b.x >= x1 && b.x <= x2 && b.y >= y1 && b.y <= y2) return true
  
  // Check intersection with rectangle edges
  const intersect = (p1: Pt, p2: Pt, p3: Pt, p4: Pt) => {
    const den = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y)
    if (den === 0) return false
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / den
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / den
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
  }
  
  const rect = [
    { a: { x: x1, y: y1 }, b: { x: x2, y: y1 } },
    { a: { x: x2, y: y1 }, b: { x: x2, y: y2 } },
    { a: { x: x2, y: y2 }, b: { x: x1, y: y2 } },
    { a: { x: x1, y: y2 }, b: { x: x1, y: y1 } },
  ]
  
  return rect.some(edge => intersect(a, b, edge.a, edge.b))
}

export interface DxfArc {
  entity_type: 'ARC'
  handle: string
  layer: string
  center: { x: number; y: number; z: number }
  radius: number
  start_angle: number
  end_angle: number
}

/**
 * Generate arc points for rendering
 */
export function arcPoints(
  arc: DxfArc,
  t: Transform,
  steps: number = 48
): number[] {
  const startRad = arc.start_angle * Math.PI / 180
  const endDeg = arc.end_angle > arc.start_angle ? arc.end_angle : arc.end_angle + 360
  const endRad = endDeg * Math.PI / 180
  const pts: number[] = []
  
  for (let i = 0; i <= steps; i++) {
    const angle = startRad + (endRad - startRad) * i / steps
    const wx = arc.center.x + arc.radius * Math.cos(angle)
    const wy = arc.center.y + arc.radius * Math.sin(angle)
    const [cx, cy] = toC(wx, wy, t)
    pts.push(cx, cy)
  }
  
  return pts
}
