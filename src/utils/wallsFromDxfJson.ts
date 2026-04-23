/**
 * wallsFromDxfJson.ts  —  Full entity coverage
 *
 * Converts a DxfJsonDocument into:
 *   • WallSeg[]   – structural line segments that drive room detection + editing
 *   • RenderItem[] – every other entity the canvas should DISPLAY but not edit as walls
 *
 * Philosophy
 * ──────────
 *  "Wall" segments → room detection, draggable endpoints, snap, join/group.
 *  "Render" items → displayed faithfully but not broken into editable segments.
 *
 * Entities treated as WALLS:
 *   LINE, LWPOLYLINE / POLYLINE (edges), ARC (chord-tessellated, non-door)
 *
 * Entities treated as RENDER ITEMS (display-only):
 *   CIRCLE, ELLIPSE, SPLINE, HATCH, DIMENSION (dim_lines/arcs),
 *   SOLID / TRACE, LEADER, MLEADER, TOLERANCE,
 *   IMAGE (placeholder rect), WIPEOUT (mask),
 *   3DFACE (projected outline), MESH (wireframe), HELIX (tessellated),
 *   TEXT / MTEXT (handled separately by canvas text layer),
 *   INSERT geometry (inlined lines/arcs from block expansion)
 */

import type {
  DxfArc,
  DxfDimension,
  DxfEllipse,
  DxfHatch,
  DxfInsert,
  DxfJsonDocument,
  DxfPolyline,
  DxfSpline,
} from '@/constants/dxfJsonData'

/* ──────────────────────────────────────────────────────────────────────────
   CanvasGroup  — pre-computed group metadata for O(1) hit-testing
   ────────────────────────────────────────────────────────────────────────── */

export interface CanvasGroup {
  /** Matches DxfGroup.id from the compact GROUPS array */
  id: number
  name: string
  category: string
  insert: { x: number; y: number }
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
  /** Wall-segment IDs (ln-*, pl-*, ar-*) — safe to add to selectedIds */
  wallIds: Set<string>
  /** Raw arc handles (e.g. 'A12') — kept separate to avoid bbox inflation via center±radius */
  arcHandles: Set<string>
  insertLayer: string 
}

/* ──────────────────────────────────────────────────────────────────────────
   WallSeg  (unchanged public shape — editing engine depends on this)
   ────────────────────────────────────────────────────────────────────────── */

export interface WallSeg {
  id: string
  start: { x: number; y: number }
  end:   { x: number; y: number }
  isOuter: boolean
  isDetail: boolean
  /** When set, this segment belongs to a named polyline group. */
  groupId?: string
  /** Chord of this ARC entity (non-door arcs only). */
  fromArc?: string
  /** Layer from source entity (for layer visibility toggling). */
  layer?: string
  /** ACI / true-colour override from the source entity. */
  color?: number | string | null
  /** Optional bezier curve: the user-dragged midpoint that defines the curve. */
  curveMidPt?: { x: number; y: number }
}

/* ──────────────────────────────────────────────────────────────────────────
   RenderItem  — passed to canvas display layers, not to room detection
   ────────────────────────────────────────────────────────────────────────── */

export type RenderItemType =
  | 'circle'
  | 'ellipse'
  | 'spline'
  | 'hatch'
  | 'dimension'
  | 'solid'
  | 'leader'
  | 'mleader'
  | 'tolerance'
  | 'image'
  | 'wipeout'
  | 'face3d'
  | 'mesh'
  | 'helix'
  | 'insert_geometry'

interface RenderBase {
  id: string
  kind: RenderItemType
  layer: string
  color?: number | string | null
  visible?: boolean
}

export interface RenderCircle extends RenderBase {
  kind: 'circle'
  cx: number; cy: number; r: number
}

export interface RenderEllipse extends RenderBase {
  kind: 'ellipse'
  cx: number; cy: number
  /** Half-length of the major axis in world units. */
  rx: number
  /** Half-length of the minor axis (rx * ratio). */
  ry: number
  /** Rotation angle of major axis from +X, in degrees. */
  rotation: number
  startParam: number   // radians
  endParam: number     // radians
}

export interface RenderSpline extends RenderBase {
  kind: 'spline'
  /** Tessellated polyline (WCS). */
  points: Array<{ x: number; y: number }>
  closed: boolean
}

export interface RenderHatch extends RenderBase {
  kind: 'hatch'
  solidFill: boolean
  patternName: string
  /** Outer boundary vertices for rendering as a filled polygon. */
  outerBoundary: Array<{ x: number; y: number }>
  /** Inner boundaries (holes). */
  holes: Array<Array<{ x: number; y: number }>>
  patternAngle: number
  patternScale: number
  gradient: DxfHatch['gradient']
}

export interface RenderDimension extends RenderBase {
  kind: 'dimension'
  subtype: string
  text: string
  textPos: { x: number; y: number }
  lines: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>
  arcs: Array<{ cx: number; cy: number; r: number; startAngle: number; endAngle: number }>
}

export interface RenderSolid extends RenderBase {
  kind: 'solid'
  /** 4 vertices in drawing order. */
  points: Array<{ x: number; y: number }>
}

export interface RenderLeader extends RenderBase {
  kind: 'leader'
  vertices: Array<{ x: number; y: number }>
  hasArrowhead: boolean
  annotationText?: string
}

export interface RenderMLeader extends RenderBase {
  kind: 'mleader'
  lines: Array<Array<{ x: number; y: number }>>
  text?: string
  textPos?: { x: number; y: number }
}

export interface RenderTolerance extends RenderBase {
  kind: 'tolerance'
  text: string
  position: { x: number; y: number }
}

export interface RenderImage extends RenderBase {
  kind: 'image'
  /** WCS bounding box (approximate, for placeholder rect). */
  x: number; y: number; w: number; h: number
  imagePath: string
}

export interface RenderWipeout extends RenderBase {
  kind: 'wipeout'
  boundary: Array<{ x: number; y: number }>
  showFrame: boolean
}

export interface RenderFace3d extends RenderBase {
  kind: 'face3d'
  /** 4 corners projected to XY plane. */
  points: Array<{ x: number; y: number }>
  invisibleEdges: number
}

export interface RenderMesh extends RenderBase {
  kind: 'mesh'
  /** Tessellated triangle edges as line pairs for wireframe rendering. */
  edges: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>
}

export interface RenderHelix extends RenderBase {
  kind: 'helix'
  points: Array<{ x: number; y: number }>
}

export interface RenderInsertGeometry extends RenderBase {
  kind: 'insert_geometry'
  blockName: string
  category: string
  lines: Array<{ start: { x: number; y: number }; end: { x: number; y: number }; color?: number | string | null }>
  arcs: Array<{ cx: number; cy: number; r: number; startAngle: number; endAngle: number; color?: number | string | null }>
  circles: Array<{ cx: number; cy: number; r: number; color?: number | string | null }>
  polylines: Array<{ points: Array<{ x: number; y: number }>; closed: boolean; color?: number | string | null }>
}

export type RenderItem =
  | RenderCircle | RenderEllipse | RenderSpline | RenderHatch
  | RenderDimension | RenderSolid | RenderLeader | RenderMLeader
  | RenderTolerance | RenderImage | RenderWipeout | RenderFace3d
  | RenderMesh | RenderHelix | RenderInsertGeometry

/* ──────────────────────────────────────────────────────────────────────────
   Internal helpers
   ────────────────────────────────────────────────────────────────────────── */

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

/** Tessellate a bulged polyline segment into intermediate points.
 *  bulge = tan(θ/4); if |bulge| < 0.001 treat as straight line.
 */
function tessellateSegment(
  x0: number, y0: number,
  x1: number, y1: number,
  bulge: number,
  steps = 16,
): Array<{ x: number; y: number }> {
  if (Math.abs(bulge) < 0.001) return [{ x: x1, y: y1 }]

  const theta = 4 * Math.atan(bulge)        // total arc angle (signed)
  const d = Math.hypot(x1 - x0, y1 - y0)
  const r = d / (2 * Math.abs(Math.sin(theta / 2)))
  const midX = (x0 + x1) / 2, midY = (y0 + y1) / 2
  const dir = Math.atan2(y1 - y0, x1 - x0)
  const offset = r * Math.cos(theta / 2)
  const perp = dir + (bulge > 0 ? Math.PI / 2 : -Math.PI / 2)
  const cx = midX - offset * Math.cos(perp)
  const cy = midY - offset * Math.sin(perp)
  const startAngle = Math.atan2(y0 - cy, x0 - cx)
  const pts: Array<{ x: number; y: number }> = []
  for (let i = 1; i <= steps; i++) {
    const a = startAngle + (theta * i) / steps
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return pts
}

/** Tessellated boundary of a polyline (handles bulge arcs). */
function polylineTessellate(pl: DxfPolyline): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  const n = pl.vertices.length
  if (n === 0) return pts
  pts.push({ x: pl.vertices[0].x, y: pl.vertices[0].y })
  const maxI = pl.closed ? n : n - 1
  for (let i = 0; i < maxI; i++) {
    const v0 = pl.vertices[i]
    const j = pl.closed ? (i + 1) % n : i + 1
    const v1 = pl.vertices[j]
    const extra = tessellateSegment(v0.x, v0.y, v1.x, v1.y, v0.bulge ?? 0)
    pts.push(...extra)
  }
  return pts
}

/* ──────────────────────────────────────────────────────────────────────────
   Public helpers re-exported (unchanged signatures used by canvas)
   ────────────────────────────────────────────────────────────────────────── */

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
      end:   { x: v1.x, y: v1.y },
      isOuter,
      isDetail: false,
      layer: pl.layer,
      color: pl.color,
      ...(groupId ? { groupId } : {}),
    })
  }
  return ws
}

export function isDoorStyleArc(doc: DxfJsonDocument, arc: DxfArc): boolean {
  const key = arc.handle.replace(/^arc-/, '')
  return (
    doc.lines.some(ln => ln.handle.startsWith(`dfl-${key}`)) ||
    (doc.door_lines ?? []).some(ln => ln.handle.startsWith(`dfl-${key}`))
  )
}

export function arcHandleFromArcSegWallId(wallId: string): string | null {
  if (!wallId.startsWith('ar-')) return null
  const rest = wallId.slice(3)
  const dash = rest.lastIndexOf('-')
  if (dash <= 0) return null
  if (!/^\d+$/.test(rest.slice(dash + 1))) return null
  return rest.slice(0, dash)
}

export function wallSegsFromArc(arc: DxfArc, isOuter: boolean): WallSeg[] {
  const ws: WallSeg[] = []
  if (arc.radius < 0.01) return ws
  const startRad = arc.start_angle * (Math.PI / 180)
  const spanDeg =
    arc.end_angle > arc.start_angle
      ? arc.end_angle - arc.start_angle
      : arc.end_angle + 360 - arc.start_angle
  const sweep = spanDeg * (Math.PI / 180)
  const steps = Math.max(8, Math.min(96, Math.ceil(spanDeg / 5)))
  for (let i = 0; i < steps; i++) {
    const a0 = startRad + (sweep * i) / steps
    const a1 = startRad + (sweep * (i + 1)) / steps
    const x0 = arc.center.x + arc.radius * Math.cos(a0)
    const y0 = arc.center.y + arc.radius * Math.sin(a0)
    const x1 = arc.center.x + arc.radius * Math.cos(a1)
    const y1 = arc.center.y + arc.radius * Math.sin(a1)
    if (Math.hypot(x1 - x0, y1 - y0) < 0.01) continue
    ws.push({
      id: `ar-${arc.handle}-${i}`,
      start: { x: x0, y: y0 },
      end:   { x: x1, y: y1 },
      isOuter,
      isDetail: false,
      fromArc: arc.handle,
      layer: arc.layer,
      color: arc.color,
    })
  }
  return ws
}

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
        const w = remaining.splice(i, 1)[0]
        chain.push({ ...w, start: w.end, end: w.start })
        matched = true
        break
      }
    }
    if (!matched) chain.push(...remaining.splice(0))
  }
  return chain
}

/* ──────────────────────────────────────────────────────────────────────────
   ELLIPSE → render item
   ────────────────────────────────────────────────────────────────────────── */

function renderEllipse(el: DxfEllipse): RenderEllipse {
  const rx = Math.hypot(el.major_axis.x, el.major_axis.y)
  const ry = rx * el.ratio
  const rotation = Math.atan2(el.major_axis.y, el.major_axis.x) * (180 / Math.PI)
  return {
    id: el.handle,  // handle is already prefixed `el-{li}-{cx}-{cy}` by the compact parser
    kind: 'ellipse',
    layer: el.layer,
    color: el.color,
    visible: el.is_visible !== false,
    cx: el.center.x,
    cy: el.center.y,
    rx, ry, rotation,
    startParam: el.start_param,
    endParam: el.end_param,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   SPLINE → render item (use tessellation if present, else control-point polyline)
   ────────────────────────────────────────────────────────────────────────── */

function renderSpline(sp: DxfSpline): RenderSpline {
  const pts: Array<{ x: number; y: number }> = sp.tessellation
    ? sp.tessellation.map(p => ({ x: p.x, y: p.y }))
    : sp.control_points.length > 0
      ? sp.control_points.map(p => ({ x: p.x, y: p.y }))
      : sp.fit_points.map(p => ({ x: p.x, y: p.y }))
  return {
    id: `sp-${sp.handle}`,
    kind: 'spline',
    layer: sp.layer,
    color: sp.color,
    visible: sp.is_visible !== false,
    points: pts,
    closed: sp.closed,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   HATCH → render item
   ────────────────────────────────────────────────────────────────────────── */

function hatchBoundaryToPoints(b: DxfHatch['boundaries'][0]): Array<{ x: number; y: number }> {
  if (b.type === 'POLYLINE' && b.vertices) {
    return b.vertices.map(v => ({ x: v.x, y: v.y }))
  }
  // EDGE boundary — tessellate each edge type
  const pts: Array<{ x: number; y: number }> = []
  for (const edge of b.edges ?? []) {
    if (edge.type === 'LINE' && edge.start && edge.end) {
      if (pts.length === 0) pts.push({ x: edge.start.x, y: edge.start.y })
      pts.push({ x: edge.end.x, y: edge.end.y })
    } else if (edge.type === 'ARC' && edge.center != null) {
      const c = edge.center!, r = edge.radius ?? 0
      const sa = (edge.start_angle ?? 0) * (Math.PI / 180)
      const ea = (edge.end_angle ?? 360) * (Math.PI / 180)
      const span = edge.is_ccw !== false ? (ea >= sa ? ea - sa : ea + 2 * Math.PI - sa) : (sa >= ea ? sa - ea : sa + 2 * Math.PI - ea)
      const steps = Math.max(8, Math.ceil((span * 180 / Math.PI) / 5))
      for (let i = 0; i <= steps; i++) {
        const a = (edge.is_ccw !== false ? sa : sa) + span * i / steps * (edge.is_ccw !== false ? 1 : -1)
        pts.push({ x: c.x + r * Math.cos(a), y: c.y + r * Math.sin(a) })
      }
    }
    // ELLIPSE + SPLINE edges are handled similarly (omitted for brevity; add as needed)
  }
  return pts
}

function renderHatch(h: DxfHatch): RenderHatch {
  const outer = h.boundaries.find(b => b.is_outer) ?? h.boundaries[0]
  const outerPts = outer ? hatchBoundaryToPoints(outer) : []
  const holes = h.boundaries.filter(b => !b.is_outer).map(hatchBoundaryToPoints)
  return {
    id: `hatch-${h.handle}`,
    kind: 'hatch',
    layer: h.layer,
    color: h.color,
    visible: h.is_visible !== false,
    solidFill: h.solid_fill,
    patternName: h.pattern_name,
    outerBoundary: outerPts,
    holes,
    patternAngle: h.pattern_angle ?? 0,
    patternScale: h.pattern_scale ?? 1,
    gradient: h.gradient ?? null,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   DIMENSION → render item
   ────────────────────────────────────────────────────────────────────────── */

function renderDimension(d: DxfDimension): RenderDimension {
  const lines = (d.dim_lines ?? []).map(l => ({
    start: { x: l.start.x, y: l.start.y },
    end:   { x: l.end.x,   y: l.end.y   },
  }))
  const arcs = (d.dim_arcs ?? []).map(a => ({
    cx: a.center.x, cy: a.center.y, r: a.radius,
    startAngle: a.start_angle, endAngle: a.end_angle,
  }))
  return {
    id: `dim-${d.handle}`,
    kind: 'dimension',
    layer: d.layer,
    color: d.color,
    visible: d.is_visible !== false,
    subtype: d.subtype,
    text: d.text || (d.actual_measurement != null ? String(d.actual_measurement.toFixed(3)) : ''),
    textPos: { x: d.text_midpoint.x, y: d.text_midpoint.y },
    lines, arcs,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   INSERT geometry → render item (uses backend-inlined geometry)
   ────────────────────────────────────────────────────────────────────────── */

function renderInsert(ins: DxfInsert): RenderInsertGeometry | null {
  const geo = ins.geometry
  if (!geo) return null   // no inline geometry — backend must provide it
  return {
    id: `ins-${ins.handle}`,
    kind: 'insert_geometry',
    layer: ins.layer,
    color: ins.color,
    visible: ins.is_visible !== false,
    blockName: ins.block_name,
    category: ins.category,
    lines: (geo.lines ?? []).map(l => ({
      start: { x: l.start.x, y: l.start.y },
      end:   { x: l.end.x,   y: l.end.y   },
      color: l.color,
    })),
    arcs: (geo.arcs ?? []).map(a => ({
      cx: a.center.x, cy: a.center.y, r: a.radius,
      startAngle: a.start_angle, endAngle: a.end_angle,
      color: a.color,
    })),
    circles: (geo.circles ?? []).map(c => ({
      cx: c.center.x, cy: c.center.y, r: c.radius, color: c.color,
    })),
    polylines: (geo.polylines ?? []).map(p => ({
      points: polylineTessellate({ ...p, entity_type: 'LWPOLYLINE', handle: '', layer: '', closed: p.closed, vertex_count: p.vertices.length, vertices: p.vertices }),
      closed: p.closed,
      color: p.color,
    })),
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   Main export: wallsFromDxfJson  +  renderItemsFromDxfJson
   ────────────────────────────────────────────────────────────────────────── */

/**
 * Build editable wall segments from a DxfJsonDocument.
 * Segments from LINE / LWPOLYLINE / POLYLINE / ARC (non-door).
 */
export function wallsFromDxfJson(doc: DxfJsonDocument): WallSeg[] {
  const ws: WallSeg[] = []

  /* ── LINE entities ── */
  for (const ln of doc.lines) {
    if (ln.handle.startsWith('dfl-') || ln.handle.startsWith('win-')) continue
    const len = Math.hypot(ln.end.x - ln.start.x, ln.end.y - ln.start.y)
    if (len < 0.01) continue
    ws.push({
      id: `ln-${ln.handle}`,
      start: { x: ln.start.x, y: ln.start.y },
      end:   { x: ln.end.x,   y: ln.end.y   },
      isOuter: false,
      isDetail: len < DETAIL_LEN_M,
      layer: ln.layer,
      color: ln.color,
    })
  }

  /* ── LWPOLYLINE / POLYLINE entities ── */
  const perims = doc.polylines.map(polylinePerimeter)
  const maxPerim = perims.length ? Math.max(...perims) : 0

  for (let pi = 0; pi < doc.polylines.length; pi++) {
    const pl = doc.polylines[pi]
    const isOuter = perims[pi] >= maxPerim
    const groupId = `pl-${pl.handle}`
    ws.push(...wallSegsFromPolyline(pl, isOuter, groupId))
  }

  /* ── ARC entities (chord-tessellated, non-door) ── */
  for (const ar of doc.arcs ?? []) {
    if (isDoorStyleArc(doc, ar)) continue
    ws.push(...wallSegsFromArc(ar, false))
  }

  return ws
}

/**
 * Build render items for every entity that is NOT a wall segment.
 * The canvas should draw these in a separate layer below the wall/selection layer.
 */
export function renderItemsFromDxfJson(doc: DxfJsonDocument): RenderItem[] {
  const items: RenderItem[] = []

  /* ── CIRCLE ── */
  for (const c of doc.circles ?? []) {
    items.push({
      id: `ci-${c.handle}`,
      kind: 'circle',
      layer: c.layer,
      color: c.color,
      visible: c.is_visible !== false,
      cx: c.center.x, cy: c.center.y, r: c.radius,
    })
  }

  /* ── ELLIPSE ── */
  for (const el of doc.ellipses ?? []) items.push(renderEllipse(el))

  /* ── SPLINE ── */
  for (const sp of doc.splines ?? []) items.push(renderSpline(sp))

  /* ── HATCH ── */
  for (const h of doc.hatches ?? []) items.push(renderHatch(h))

  /* ── DIMENSION ── */
  for (const d of doc.dimensions ?? []) items.push(renderDimension(d))

  /* ── SOLID / TRACE ── */
  for (const s of doc.solids ?? []) {
    items.push({
      id: `sol-${s.handle}`,
      kind: 'solid',
      layer: s.layer,
      color: s.color,
      visible: s.is_visible !== false,
      points: s.points.map(p => ({ x: p.x, y: p.y })),
    })
  }

  /* ── LEADER ── */
  for (const ldr of doc.leaders ?? []) {
    items.push({
      id: `ldr-${ldr.handle}`,
      kind: 'leader',
      layer: ldr.layer,
      color: ldr.color,
      visible: ldr.is_visible !== false,
      vertices: ldr.vertices.map(v => ({ x: v.x, y: v.y })),
      hasArrowhead: ldr.has_arrowhead,
      annotationText: ldr.annotation?.text,
    })
  }

  /* ── MLEADER ── */
  for (const ml of doc.mleaders ?? []) {
    items.push({
      id: `ml-${ml.handle}`,
      kind: 'mleader',
      layer: ml.layer,
      color: ml.color,
      visible: ml.is_visible !== false,
      lines: ml.leader_lines.map(l => l.vertices.map(v => ({ x: v.x, y: v.y }))),
      text: ml.mtext?.text,
      textPos: ml.mtext ? { x: ml.mtext.position.x, y: ml.mtext.position.y } : undefined,
    })
  }

  /* ── TOLERANCE ── */
  for (const t of doc.tolerances ?? []) {
    items.push({
      id: `tol-${t.handle}`,
      kind: 'tolerance',
      layer: t.layer,
      color: t.color,
      visible: t.is_visible !== false,
      text: t.string,
      position: { x: t.insertion_point.x, y: t.insertion_point.y },
    })
  }

  /* ── IMAGE ── */
  for (const img of doc.images ?? []) {
    const w = Math.hypot(img.u_vector.x, img.u_vector.y) * img.pixel_size.x
    const h = Math.hypot(img.v_vector.x, img.v_vector.y) * img.pixel_size.y
    items.push({
      id: `img-${img.handle}`,
      kind: 'image',
      layer: img.layer,
      color: null,
      visible: img.is_visible !== false,
      x: img.insert.x, y: img.insert.y, w, h,
      imagePath: img.image_path,
    })
  }

  /* ── WIPEOUT ── */
  for (const wo of doc.wipeouts ?? []) {
    items.push({
      id: `wo-${wo.handle}`,
      kind: 'wipeout',
      layer: wo.layer,
      color: null,
      visible: wo.is_visible !== false,
      boundary: wo.boundary.map(p => ({ x: p.x, y: p.y })),
      showFrame: wo.show_frame,
    })
  }

  /* ── 3DFACE ── */
  for (const f of doc.faces3d ?? []) {
    items.push({
      id: `f3-${f.handle}`,
      kind: 'face3d',
      layer: f.layer,
      color: f.color,
      visible: f.is_visible !== false,
      points: f.points.map(p => ({ x: p.x, y: p.y })),
      invisibleEdges: f.invisible_edges,
    })
  }

  /* ── MESH ── */
  for (const m of doc.meshes ?? []) {
    const edges: RenderMesh['edges'] = []
    for (const face of m.faces) {
      for (let i = 0; i < face.length; i++) {
        const a = m.vertices[face[i]], b = m.vertices[face[(i + 1) % face.length]]
        if (a && b) edges.push({ start: { x: a.x, y: a.y }, end: { x: b.x, y: b.y } })
      }
    }
    items.push({ id: `mesh-${m.handle}`, kind: 'mesh', layer: m.layer, color: m.color, edges })
  }

  /* ── HELIX ── */
  for (const hx of doc.helices ?? []) {
    items.push({
      id: `hx-${hx.handle}`,
      kind: 'helix',
      layer: hx.layer,
      color: hx.color,
      visible: hx.is_visible !== false,
      points: hx.tessellation.map(p => ({ x: p.x, y: p.y })),
    })
  }

  /* ── INSERT geometry (all categories) ── */
  const allInserts = [
    ...doc.inserts,
    ...doc.door_inserts,
    ...doc.window_inserts,
    ...doc.furniture_inserts,
    ...doc.stair_inserts,
  ]
  for (const ins of allInserts) {
    const ri = renderInsert(ins)
    if (ri) items.push(ri)
  }

  return items
}

/**
 * Build CanvasGroup[] from a DxfJsonDocument and the current wall segments.
 *
 * Call once on load (or whenever walls change) and cache the result with useMemo.
 * Mapping rules (compact v7.2):
 *   group.primitives.LN[i]  → handle `L{i}` → wall id `ln-L{i}`
 *   group.primitives.LW[i]  → handle `P{i}` → wall ids `pl-P{i}-*`
 *   group.primitives.AR[i]  → handle `A{i}` → wall ids `ar-A{i}-*`
 */
export function canvasGroupsFromDxfJson(
  doc: DxfJsonDocument,
  walls: WallSeg[],
): CanvasGroup[] {
  if (!doc.groups?.length) return []
 
  // ── Build fast lookup maps ───────────────────────────────────────────────
  const wallById = new Map<string, WallSeg>()
  for (const w of walls) wallById.set(w.id, w)
 
  // Tessellated arc walls indexed by their fromArc handle
  const arcWalls = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.fromArc) continue
    if (!arcWalls.has(w.fromArc)) arcWalls.set(w.fromArc, [])
    arcWalls.get(w.fromArc)!.push(w)
  }
 
  // Polyline wall segments indexed by polyline handle (e.g. "P0", "P3")
  const plWalls = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.id.startsWith('pl-')) continue
    const rest = w.id.slice(3)
    const dash = rest.lastIndexOf('-')
    if (dash <= 0) continue
    const ph = rest.slice(0, dash)   // e.g. "P3"
    if (!plWalls.has(ph)) plWalls.set(ph, [])
    plWalls.get(ph)!.push(w)
  }
 
  // ── Build one CanvasGroup per DxfGroup ───────────────────────────────────
  return doc.groups.map(g => {
    const wallIds = new Set<string>()
 
    // LN[i]: 0-based index into the compact LN flat array
    // _parseLNFlat generates handle = "L{i}" → wall id = "ln-L{i}"
    for (const idx of g.primitives.LN) {
      wallIds.add(`ln-L${idx}`)
    }
 
    // LW[i]: 0-based polyline index
    // _parseLWEntryV5 loop index i → handle = "P{i}"
    // Wall ids are "pl-P{i}-0", "pl-P{i}-1", ...
    for (const idx of g.primitives.LW) {
      const segs = plWalls.get(`P${idx}`)
      if (segs) for (const s of segs) wallIds.add(s.id)
    }
 
    // AR[i]: 0-based arc index → handle = "A{i}"
    // Door arcs: handle goes to arcHandles (no tessellated wall segs)
    // Non-door arcs: tessellated segs go to wallIds, handle still to arcHandles
    const arcHandles = new Set<string>()
    for (const idx of g.primitives.AR) {
      const arcHandle = `A${idx}`
      arcHandles.add(arcHandle)                    // kept separate — never in selectedIds
      const segs = arcWalls.get(arcHandle)
      if (segs) for (const s of segs) wallIds.add(s.id)
    }

    // ── Recompute bounds from actual wall positions ───────────────────────
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let hasPts = false
    for (const id of wallIds) {
      const w = wallById.get(id)
      if (!w) continue
      for (const p of [w.start, w.end]) {
        if (!isFinite(p.x) || !isFinite(p.y)) continue
        if (p.x < minX) minX = p.x
        if (p.x > maxX) maxX = p.x
        if (p.y < minY) minY = p.y
        if (p.y > maxY) maxY = p.y
        hasPts = true
      }
    }

    // Fallback to stored bounds only when no walls matched at all
    if (!hasPts) {
      minX = g.bounds[0]; minY = g.bounds[1]
      maxX = g.bounds[2]; maxY = g.bounds[3]
    }

    return {
      id: g.id,
      name: g.name,
      category: g.category,
      insert: { x: g.insert[0], y: g.insert[1] },
      bounds: { minX, minY, maxX, maxY },
      wallIds,
      arcHandles,
       insertLayer: g.insert_layer ?? "0",  
    }
  })
}