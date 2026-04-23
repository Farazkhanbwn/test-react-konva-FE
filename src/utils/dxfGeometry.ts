/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DXF GEOMETRY UTILITIES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 * This file contains pure mathematical functions for coordinate transformations
 * and geometric calculations used in the DXF floor plan editor.
 *
 * WHAT IT DOES:
 * - Converts between world coordinates (meters) and canvas coordinates (pixels)
 * - Performs geometric calculations (rotation, distance, area, intersection)
 * - Generates rendering points for arcs and curves
 *
 * WHY IT'S SEPARATE:
 * - Pure functions with no side effects → easy to test
 * - No React dependencies → can be used anywhere
 * - Math operations are reusable across different components
 *
 * USED BY:
 * - DxfJsonViewPage.tsx (main editor component)
 * - Other utility files (dxfRoomDetection, dxfSnapping)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import { arcHandleFromArcSegWallId, type WallSeg } from './wallsFromDxfJson'
import { cloneDoc } from './dxfDocumentUtils'

/**
 * ───────────────────────────────────────────────────────────────────────────
 * TYPE DEFINITIONS
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Point in 2D space (world or canvas coordinates)
 *
 * @property x - Horizontal position
 * @property y - Vertical position
 *
 * @example
 * const worldPoint: Pt = { x: 5.5, y: 3.2 }  // 5.5m, 3.2m in world space
 * const canvasPoint: Pt = { x: 450, y: 320 } // 450px, 320px on canvas
 */
export interface Pt {
  x: number
  y: number
}

/**
 * Transformation matrix for converting between world and canvas coordinates
 *
 * @property sc - Scale factor (pixels per meter)
 * @property oX - Canvas X offset (pixels)
 * @property oY - Canvas Y offset (pixels)
 * @property emin - World space minimum extents [minX, minY]
 * @property wH - World space height (meters)
 *
 * @example
 * const t = buildTransform([0, 0], [10, 8], 800, 600)
 * // Fits a 10m×8m floor plan into an 800×600 canvas
 */
export interface Transform {
  sc: number
  oX: number
  oY: number
  emin: number[]
  wH: number
}

/**
 * ───────────────────────────────────────────────────────────────────────────
 * COORDINATE TRANSFORMATION FUNCTIONS
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Convert world coordinates to canvas coordinates
 *
 * World coordinates = real-world measurements in meters (e.g., 5.5m, 3.2m)
 * Canvas coordinates = pixel positions on screen (e.g., 450px, 320px)
 *
 * @param wx - World X coordinate (meters)
 * @param wy - World Y coordinate (meters)
 * @param t - Transformation matrix
 * @returns [canvasX, canvasY] in pixels
 *
 * @example
 * const t = buildTransform([0, 0], [10, 8], 800, 600)
 * const [cx, cy] = toC(5.0, 4.0, t)
 * // Returns [400, 300] - center of canvas for center of room
 */
export function toC(wx: number, wy: number, t: Transform): [number, number] {
  return [
    (wx - t.emin[0]) * t.sc + t.oX,
    t.oY + (t.wH - (wy - t.emin[1])) * t.sc,
  ]
}

/**
 * Convert canvas coordinates to world coordinates
 *
 * Inverse of toC() - converts mouse clicks (pixels) to real-world positions (meters)
 *
 * @param cx - Canvas X coordinate (pixels)
 * @param cy - Canvas Y coordinate (pixels)
 * @param t - Transformation matrix
 * @returns [worldX, worldY] in meters
 *
 * @example
 * const t = buildTransform([0, 0], [10, 8], 800, 600)
 * const [wx, wy] = toW(400, 300, t)
 * // Returns [5.0, 4.0] - center of room for center of canvas
 */
export function toW(cx: number, cy: number, t: Transform): [number, number] {
  return [
    (cx - t.oX) / t.sc + t.emin[0],
    t.emin[1] + t.wH - (cy - t.oY) / t.sc,
  ]
}

/**
 * Build transformation matrix to fit floor plan into canvas
 *
 * Calculates scale and offset to center the floor plan on canvas with padding.
 * Maintains aspect ratio - no distortion.
 *
 * @param emin - World space minimum extents [minX, minY]
 * @param emax - World space maximum extents [maxX, maxY]
 * @param canvasW - Canvas width in pixels
 * @param canvasH - Canvas height in pixels
 * @param padding - Padding around edges in pixels (default: 55)
 * @returns Transform object for coordinate conversion
 *
 * @example
 * // Floor plan is 10m × 8m, canvas is 800px × 600px
 * const t = buildTransform([0, 0], [10, 8], 800, 600, 55)
 * // Result: scale = 68.125 pixels/meter, centered with 55px padding
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
 * ───────────────────────────────────────────────────────────────────────────
 * GEOMETRIC CALCULATION FUNCTIONS
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Rotate a point around a center point
 *
 * Uses rotation matrix: [cos θ  -sin θ] [x]
 *                        [sin θ   cos θ] [y]
 *
 * @param px - Point X coordinate
 * @param py - Point Y coordinate
 * @param cx - Center X coordinate
 * @param cy - Center Y coordinate
 * @param angle - Rotation angle in radians (positive = counterclockwise)
 * @returns [newX, newY] rotated coordinates
 *
 * @example
 * // Rotate point (5, 0) around origin by 90° (π/2 radians)
 * const [x, y] = rotatePoint(5, 0, 0, 0, Math.PI / 2)
 * // Returns [0, 5] - point moved from East to North
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
 * Find the closest point on a line segment to a given point
 *
 * Used for:
 * - Snapping cursor to walls
 * - Finding where to split a wall
 * - Distance calculations
 *
 * @param px - Point X coordinate
 * @param py - Point Y coordinate
 * @param ax - Segment start X
 * @param ay - Segment start Y
 * @param bx - Segment end X
 * @param by - Segment end Y
 * @returns Object with:
 *   - pt: Closest point on segment
 *   - t: Parameter (0 = start, 1 = end, 0.5 = midpoint)
 *   - dist: Distance from point to segment
 *
 * @example
 * // Find closest point on wall from (2, 2) to (5, 2) for cursor at (3.5, 3)
 * const result = closestPointOnSegment(3.5, 3, 2, 2, 5, 2)
 * // Returns: { pt: {x: 3.5, y: 2}, t: 0.5, dist: 1.0 }
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
 * Calculate polygon area using the shoelace formula
 *
 * Returns signed area:
 * - Positive = counterclockwise winding
 * - Negative = clockwise winding
 * - Zero = degenerate (line or point)
 *
 * @param pts - Array of polygon vertices
 * @returns Area in square meters (signed)
 *
 * @example
 * // Square room 3m × 3m
 * const room = [
 *   { x: 0, y: 0 },
 *   { x: 3, y: 0 },
 *   { x: 3, y: 3 },
 *   { x: 0, y: 3 }
 * ]
 * const area = polyArea(room)
 * // Returns 9.0 (or -9.0 depending on winding)
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
 * Check if two points are nearly identical (within tolerance)
 *
 * Used for:
 * - Detecting connected walls
 * - Snapping endpoints together
 * - Finding room boundaries
 *
 * @param a - First point
 * @param b - Second point
 * @param eps - Tolerance (epsilon) in meters
 * @returns true if points are within eps distance
 *
 * @example
 * const p1 = { x: 5.0001, y: 3.0 }
 * const p2 = { x: 5.0, y: 3.0 }
 * nearSamePt(p1, p2, 0.01)  // true - within 1cm tolerance
 * nearSamePt(p1, p2, 0.0001) // false - outside 0.1mm tolerance
 */
export function nearSamePt(a: Pt, b: Pt, eps: number): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps
}

/**
 * Check if a line segment intersects or is contained by a rectangle
 *
 * Used for:
 * - Selection box (crossing selection)
 * - Collision detection
 * - Visibility culling
 *
 * @param a - Line start point
 * @param b - Line end point
 * @param x1 - Rectangle min X
 * @param y1 - Rectangle min Y
 * @param x2 - Rectangle max X
 * @param y2 - Rectangle max Y
 * @returns true if line intersects or is inside rectangle
 *
 * @example
 * // Wall from (1, 1) to (5, 5)
 * const wall = { x: 1, y: 1 }, { x: 5, y: 5 }
 * // Selection box from (0, 0) to (3, 3)
 * const intersects = lineIntersectsRect(wall, wall, 0, 0, 3, 3)
 * // Returns true - wall crosses selection box
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

/**
 * DXF ARC entity (used for doors, circles, curved walls)
 *
 * @property entity_type - Always 'ARC'
 * @property handle - Unique identifier (e.g., 'arc-123', 'user-ar-1234567890')
 * @property layer - Layer name (e.g., '0', 'DOORS', 'WALLS')
 * @property center - Arc center point in world coordinates
 * @property radius - Arc radius in meters
 * @property start_angle - Start angle in degrees (0° = East, counterclockwise)
 * @property end_angle - End angle in degrees
 *
 * @example
 * // Door swing arc (90° arc with 0.9m radius)
 * const doorArc: DxfArc = {
 *   entity_type: 'ARC',
 *   handle: 'arc-door-1',
 *   layer: 'DOORS',
 *   center: { x: 2.5, y: 3.0, z: 0 },
 *   radius: 0.9,
 *   start_angle: 0,
 *   end_angle: 90
 * }
 */
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
 * ───────────────────────────────────────────────────────────────────────────
 * RENDERING HELPER FUNCTIONS
 * ───────────────────────────────────────────────────────────────────────────
 */

/**
 * Generate canvas points for rendering an arc as a polyline
 *
 * Converts a DXF arc (center, radius, angles) into a series of canvas
 * coordinates that can be drawn as a smooth curve.
 *
 * @param arc - DXF arc entity
 * @param t - Transformation matrix
 * @param steps - Number of line segments (default: 48, higher = smoother)
 * @returns Flat array [x1, y1, x2, y2, ...] for Konva Line component
 *
 * @example
 * const doorArc: DxfArc = {
 *   entity_type: 'ARC',
 *   handle: 'arc-1',
 *   layer: '0',
 *   center: { x: 2.5, y: 3.0, z: 0 },
 *   radius: 0.9,
 *   start_angle: 0,
 *   end_angle: 90
 * }
 * const points = arcPoints(doorArc, transform, 24)
 * // Returns [x1, y1, x2, y2, ..., x24, y24] for smooth 90° arc
 *
 * // Usage in React:
 * <Line points={arcPoints(arc, t)} stroke="black" />
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

export function applyRotation(
  ws: WallSeg[],
  ids: Set<string>,
  cx: number,
  cy: number,
  angle: number,
): WallSeg[] {
  if (angle === 0) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const [sx, sy] = rotatePoint(w.start.x, w.start.y, cx, cy, angle)
    const [ex, ey] = rotatePoint(w.end.x, w.end.y, cx, cy, angle)
    return { ...w, start: { x: sx, y: sy }, end: { x: ex, y: ey } }
  })
}

export function applyResizeToWalls(
  ws: WallSeg[],
  ids: Set<string>,
  origBox: { minWX: number; minWY: number; maxWX: number; maxWY: number },
  newBox:  { minWX: number; minWY: number; maxWX: number; maxWY: number },
): WallSeg[] {
  const origW = origBox.maxWX - origBox.minWX || 1e-9
  const origH = origBox.maxWY - origBox.minWY || 1e-9
  const newW  = newBox.maxWX - newBox.minWX
  const newH  = newBox.maxWY - newBox.minWY
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const scaleX = (p: number) => newBox.minWX + (p - origBox.minWX) / origW * newW
    const scaleY = (p: number) => newBox.minWY + (p - origBox.minWY) / origH * newH
    return { ...w, start: { x: scaleX(w.start.x), y: scaleY(w.start.y) }, end: { x: scaleX(w.end.x), y: scaleY(w.end.y) } }
  })
}

export function applyRoomDeltaToDoc(doc: DxfJsonDocument, wallIds: string[], dx: number, dy: number): DxfJsonDocument {
  if (!wallIds.length || (dx === 0 && dy === 0)) return doc
  const next = cloneDoc(doc)
  const polyVertIdx = new Map<string, Set<number>>()
  for (const wid of wallIds) {
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
      s.add(ei); s.add(ei + 1)
    }
  }
  for (const [ph, idxs] of polyVertIdx) {
    next.polylines = next.polylines.map(pl => {
      if (pl.handle !== ph) return pl
      const vertices = pl.vertices.map((v, j) =>
        idxs.has(j) ? { ...v, x: v.x + dx, y: v.y + dy } : v)
      return { ...pl, vertices }
    })
  }
  const arcHandles = new Set<string>()
  for (const wid of wallIds) {
    const ah = arcHandleFromArcSegWallId(wid)
    if (ah) arcHandles.add(ah)
  }
  if (arcHandles.size) {
    next.arcs = next.arcs.map(a => {
      if (!arcHandles.has(a.handle)) return a
      return { ...a, center: { ...a.center, x: a.center.x + dx, y: a.center.y + dy } }
    })
  }
  return next
}


export function normalizeDocument(doc: DxfJsonDocument): DxfJsonDocument {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const updateBounds = (x: number, y: number) => {
    if (isFinite(x) && isFinite(y)) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
  }
  for (const line of doc.lines) { updateBounds(line.start.x, line.start.y); updateBounds(line.end.x, line.end.y) }
  for (const arc of doc.arcs ?? []) {
    updateBounds(arc.center.x - arc.radius, arc.center.y - arc.radius)
    updateBounds(arc.center.x + arc.radius, arc.center.y + arc.radius)
  }
  for (const pl of doc.polylines) { for (const v of pl.vertices) updateBounds(v.x, v.y) }
  if (isFinite(minX) && maxX > minX) {
    const padX = (maxX - minX) * 0.05
    const padY = (maxY - minY) * 0.05
    doc.meta.extmin = [minX - padX, minY - padY, 0]
    doc.meta.extmax = [maxX + padX, maxY + padY, 0]
  }
  return doc
}

// Use only the first word after "furn-" so component handles like furn-bed-pillow-1
// and furn-bed-1 both fall into the same "furn-bed" group.
export function furnitureGroupKeyFromHandle(handle: string): string {
  if (!handle.startsWith('furn-')) return handle
  return `furn-${handle.slice('furn-'.length).split('-')[0]}`
}

export function getGroupWallIds(wallId: string, walls: WallSeg[]): string[] {
  const wall = walls.find(w => w.id === wallId)
  if (!wall?.groupId) return [wallId]
  return walls.filter(w => w.groupId === wall.groupId).map(w => w.id)
}
