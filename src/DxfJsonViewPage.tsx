/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DXF JSON Interactive Floor-Plan Editor
 *
 * Libraries in use
 * ─────────────────
 * • Konva / react-konva  – hardware-accelerated 2D canvas rendering, hit-testing,
 *                          draggable handles, zoom/pan
 * • polygon-clipping     – robust polygon union / intersection (Greiner-Hormann).
 *                          Used to validate and merge room polygons after every edit
 *                          so the room fills are always geometrically correct.
 * • DCEL face extraction – pure-JS planar graph algorithm (no extra dependency) that
 *                          finds all minimal bounded faces from a set of wall segments
 *                          and feeds them into polygon-clipping for final validation.
 *
 * Key behaviours
 * ──────────────
 * • Select tool   – click a wall to select; background click deselects; canvas does
 *                   NOT pan (use Hand tool / Space to pan).
 * • Hand tool     – drag canvas to pan; scroll to zoom.
 * • Drag endpoint – moves one endpoint with snap-to-near-endpoint.
 * • Drag midpoint – translates the whole wall segment only (shared joints are not
 *                   pulled; other walls stay fixed).
 * • Room detection – recalculated live after every edit via useMemo.
 * • Select room (fill) vs wall (edge): walls layer is above fills — clicks on edges
 *   pick the wall; clicks inside a room pick that room. Drag the room centroid to
 *   translate all boundary walls together (doc lines / polylines stay in sync).
 * • Undo (Ctrl-Z) – 20-step stack; Delete/Backspace removes selected wall.
 * • Resize handles – scale selected items while maintaining relative positions.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'
import { Stage, Layer, Line, Text, Group, Rect, Circle } from 'react-konva'
import type Konva from 'konva'
import { Link } from 'react-router-dom'
import polygonClipping from 'polygon-clipping'
import {
  DXF_JSON_DATA,
  type DxfJsonDocument,
  type DxfArc,
  type DxfInsert,
  type DxfLine,
  type DxfPolyline,
  type DxfPolylineVertex,
  type DxfText,
} from '@/constants/dxfJsonData'
import { FurnitureLibraryPanel, FURNITURE_DXF_DRAG_MIME } from '@/components/FurnitureLibraryPanel'
import {
  buildFurnitureLinesFromLibraryId,
  getFurnitureDxfTemplate,
  FURNITURE_DXF_TEMPLATES,
} from '@/data/furnitureLibraryDxf'
import { clientXYToWorldXY } from '@/utils/konvaDropToWorld'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import {
  arcHandleFromArcSegWallId,
  isDoorStyleArc,
  wallSegsFromArc,
  sortPolylineVertices,
  wallSegsFromPolyline,
  wallsFromDxfJson,
} from '@/utils/wallsFromDxfJson'
import { downloadDxf } from './utils/exportToDxf'

/* ─── Types ──────────────────────────────────────────────── */
interface Pt { x: number; y: number }

interface EditorSnapshot {
  walls: WallSeg[]
  planDoc: DxfJsonDocument
}

function cloneDoc(doc: DxfJsonDocument): DxfJsonDocument {
  return JSON.parse(JSON.stringify(doc)) as DxfJsonDocument
}

function appendUserLine(doc: DxfJsonDocument, start: Pt, end: Pt): { next: DxfJsonDocument; handle: string } {
  const handle = `user-${Date.now()}`
  const line: DxfLine = {
    entity_type: 'LINE',
    handle,
    layer: '0',
    start: { x: start.x, y: start.y, z: 0 },
    end: { x: end.x, y: end.y, z: 0 },
  }
  const next = cloneDoc(doc)
  next.lines = [...next.lines, line]
  next.stats = {
    ...next.stats,
    line_count: next.stats.line_count + 1,
    entity_counts: {
      ...next.stats.entity_counts,
      LINE: (next.stats.entity_counts.LINE ?? 0) + 1,
    },
  }
  return { next, handle }
}

function appendUserArc(
  doc: DxfJsonDocument,
  center: Pt,
  radius: number,
  startAngle: number,
  endAngle: number,
): { next: DxfJsonDocument; arc: DxfArc } {
  const handle = `user-ar-${Date.now()}`
  const arc: DxfArc = {
    entity_type: 'ARC',
    handle,
    layer: '0',
    center: { x: center.x, y: center.y, z: 0 },
    radius,
    start_angle: startAngle,
    end_angle: endAngle,
  }
  const next = cloneDoc(doc)
  next.arcs = [...next.arcs, arc]
  next.stats = {
    ...next.stats,
    arc_count: (next.stats.arc_count ?? 0) + 1,
    entity_counts: { ...next.stats.entity_counts, ARC: (next.stats.entity_counts.ARC ?? 0) + 1 },
  }
  return { next, arc }
}

function removeArcFromDocByHandle(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const arcs = doc.arcs.filter(a => a.handle !== handle)
  if (arcs.length === doc.arcs.length) return doc
  const next = cloneDoc(doc)
  next.arcs = arcs
  next.stats = {
    ...next.stats,
    arc_count: Math.max(0, (next.stats.arc_count ?? 0) - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      ARC: Math.max(0, (next.stats.entity_counts.ARC ?? 0) - 1),
    },
  }
  return next
}

function appendUserPolyline(
  doc: DxfJsonDocument,
  vertices: Pt[],
  closed: boolean,
): { next: DxfJsonDocument; poly: DxfPolyline } {
  const handle = `user-pl-${Date.now()}`
  const vertList: DxfPolylineVertex[] = vertices.map(v => ({ x: v.x, y: v.y, z: 0, bulge: 0 }))
  const poly: DxfPolyline = {
    entity_type: 'LWPOLYLINE',
    handle,
    layer: '0',
    closed,
    vertex_count: vertList.length,
    vertices: vertList,
  }
  const next = cloneDoc(doc)
  next.polylines = [...next.polylines, poly]
  next.stats = {
    ...next.stats,
    polyline_count: next.stats.polyline_count + 1,
    total_vertex_count: next.stats.total_vertex_count + vertList.length,
    entity_counts: {
      ...next.stats.entity_counts,
      LWPOLYLINE: (next.stats.entity_counts.LWPOLYLINE ?? 0) + 1,
    },
  }
  return { next, poly }
}

function polylineHandleFromWallId(wallId: string): string | null {
  if (!wallId.startsWith('pl-')) return null
  const rest = wallId.slice(3)
  const dash = rest.lastIndexOf('-')
  if (dash <= 0) return null
  if (!/^\d+$/.test(rest.slice(dash + 1))) return null
  return rest.slice(0, dash)
}

function removePolylineFromDocByHandle(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const polylines = doc.polylines.filter(p => p.handle !== handle)
  if (polylines.length === doc.polylines.length) return doc
  const removed = doc.polylines.find(p => p.handle === handle)!
  const next = cloneDoc(doc)
  next.polylines = polylines
  next.stats = {
    ...next.stats,
    polyline_count: Math.max(0, next.stats.polyline_count - 1),
    total_vertex_count: Math.max(0, next.stats.total_vertex_count - removed.vertex_count),
    entity_counts: {
      ...next.stats.entity_counts,
      LWPOLYLINE: Math.max(0, (next.stats.entity_counts.LWPOLYLINE ?? 0) - 1),
    },
  }
  return next
}

/* ─── Furniture category colours ──────────────────────────── */
const FURNITURE_CATEGORY_COLORS: Record<string, string> = {
  'Kitchen':      '#f97316',
  'Bedroom':      '#8b5cf6',
  'Living Room':  '#3b82f6',
  'Dining Room':  '#10b981',
  'Bathroom':     '#06b6d4',
  'Office':       '#ef4444',
  'Conference':   '#6366f1',
  'Break Room':   '#84cc16',
  'Reception':    '#f59e0b',
  'Corridor':     '#78716c',
}

/** Maps block_name / template label → category (built once at module load). */
const FURNITURE_LABEL_TO_CATEGORY = new Map<string, string>(
  FURNITURE_DXF_TEMPLATES.map(t => [t.label, t.category as string])
)

/* ─── Room library templates ───────────────────────────────── */
export const ROOM_TEMPLATE_MIME = 'application/x-room-template'

export const ROOM_TEMPLATES = [
  { id: 'bedroom',        label: 'Bedroom',        w: 3.0, h: 3.6, color: '#8b5cf6' },
  { id: 'master-bedroom', label: 'Master Bedroom',  w: 4.0, h: 4.5, color: '#7c3aed' },
  { id: 'living-room',    label: 'Living Room',     w: 5.0, h: 4.0, color: '#3b82f6' },
  { id: 'kitchen',        label: 'Kitchen',         w: 3.0, h: 3.0, color: '#f97316' },
  { id: 'bathroom',       label: 'Bathroom',        w: 2.0, h: 2.5, color: '#06b6d4' },
  { id: 'dining-room',    label: 'Dining Room',     w: 4.0, h: 3.5, color: '#10b981' },
  { id: 'office',         label: 'Office',          w: 3.0, h: 3.0, color: '#ef4444' },
  { id: 'hallway',        label: 'Hallway',         w: 1.5, h: 4.0, color: '#78716c' },
] as const

/* ─── DXF Export ─────────────────────────────────────────── */
/* ─── Build DxfJsonDocument from current canvas walls ── */
// buildDocFromWalls and docToDxfString removed — use downloadDxf from exportToDxf.ts
function buildDocFromWalls(doc: DxfJsonDocument, walls: WallSeg[]): DxfJsonDocument {
  const ungrouped = walls.filter(w => !w.groupId)
  const grouped = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.groupId) continue
    if (!grouped.has(w.groupId)) grouped.set(w.groupId, [])
    grouped.get(w.groupId)!.push(w)
  }

  const lines: DxfLine[] = ungrouped.map(w => ({
    entity_type: 'LINE' as const,
    handle: w.id.replace(/^ln-/, ''),
    layer: '0',
    start: { x: w.start.x, y: w.start.y, z: 0 },
    end:   { x: w.end.x,   y: w.end.y,   z: 0 },
  }))

  const polylines: DxfPolyline[] = [...grouped.entries()].map(([gid, segs]) => {
    const ordered = sortPolylineVertices(segs)
    const verts: DxfPolylineVertex[] = []
    for (const s of ordered) {
      const last = verts[verts.length - 1]
      if (!last || Math.abs(last.x - s.start.x) > 0.01 || Math.abs(last.y - s.start.y) > 0.01)
        verts.push({ x: s.start.x, y: s.start.y, z: 0, bulge: 0 })
      verts.push({ x: s.end.x, y: s.end.y, z: 0, bulge: 0 })
    }
    const closed =
      verts.length > 2 &&
      Math.abs(verts[0].x - verts[verts.length - 1].x) < 0.01 &&
      Math.abs(verts[0].y - verts[verts.length - 1].y) < 0.01
    if (closed) verts.pop()
    return {
      entity_type: 'LWPOLYLINE' as const,
      handle: gid.replace(/^pl-/, ''),
      layer: '0',
      closed,
      vertex_count: verts.length,
      vertices: verts,
    }
  })

  return { ...doc, lines, polylines }
}

/* ─── DXF exporter ─────────────────────────────── */
/**
 * Serialises a DxfJsonDocument to a standards-compliant AutoCAD ASCII DXF.
 *
 * Produces the sections Autodesk Viewer requires:
 *   HEADER → TABLES (VPORT/LTYPE/LAYER/STYLE/VIEW/UCS/APPID/DIMSTYLE/BLOCK_RECORD)
 *   → BLOCKS (*Model_Space + *Paper_Space) → ENTITIES → OBJECTS (root DICTIONARY)
 *
 * Group-code formatting matches AutoCAD output:
 *   • codes right-aligned in 3-char field ("  0", " 10", "100")
 *   • integer values right-aligned in 6-char field ("     1", "   256")
 *   • float / string values written verbatim
 */
function docToDxfString(doc: DxfJsonDocument): string {
  const out: string[] = []

  const push = (code: number, value: string | number) => {
    out.push(String(code).padStart(3, ' '))
    if (typeof value === 'number' && Number.isInteger(value)) {
      out.push(String(value).padStart(6, ' '))
    } else {
      out.push(String(value))
    }
  }

  const n = (v: number) => v.toFixed(8)

  /* Fixed handle assignments (matching standard AutoCAD layout) */
  const H_BLOCK_REC_TABLE  = '1'
  const H_LAYER_TABLE      = '2'
  const H_STYLE_TABLE      = '3'
  const H_LTYPE_TABLE      = '5'
  const H_VIEW_TABLE       = '6'
  const H_UCS_TABLE        = '7'
  const H_VPORT_TABLE      = '8'
  const H_APPID_TABLE      = '9'
  const H_DIMSTYLE_TABLE   = 'A'
  const H_ROOT_DICT        = 'C'
  const H_LAYER_0          = '10'
  const H_LTYPE_BYBLOCK    = '14'
  const H_LTYPE_BYLAYER    = '15'
  const H_LTYPE_CONTINUOUS = '16'
  const H_DIMSTYLE_STD     = '27'
  const H_STYLE_STD        = '11'
  const H_APPID_ACAD       = '12'
  const H_VPORT_ACTIVE     = '94'
  const H_MS_BLOCK_REC     = '1F'
  const H_MS_BLOCK         = '20'
  const H_MS_ENDBLK        = '21'
  const H_MS_LAYOUT        = '22'
  const H_PS_BLOCK_REC     = '58'
  const H_PS_BLOCK         = '5A'
  const H_PS_ENDBLK        = '5B'
  const H_PS_LAYOUT        = '59'

  let handleSeed = 0x300
  const nextH = () => (handleSeed++).toString(16).toUpperCase()

  const layerSet = new Set<string>()
  for (const ln of doc.lines ?? [])              layerSet.add(ln.layer || '0')
  for (const ln of doc.furniture_lines ?? [])    layerSet.add(ln.layer || '0')
  for (const pl of doc.polylines ?? []) layerSet.add(pl.layer || '0')
  for (const tx of doc.texts ?? [])     layerSet.add(tx.layer || '0')
  for (const ar of doc.arcs ?? [])      layerSet.add(ar.layer || '0')
  layerSet.add('0')
  const layers = [...layerSet].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

  const extmin = doc.meta?.extmin ?? [0, 0, 0]
  const extmax = doc.meta?.extmax ?? [1, 1, 0]
  const cx = (extmin[0] + extmax[0]) / 2
  const cy = (extmin[1] + extmax[1]) / 2
  const vHeight = Math.max(1, extmax[1] - extmin[1])

  /* ── HEADER ─────────────────────────────────────── */
  push(0, 'SECTION'); push(2, 'HEADER')
  push(9, '$ACADVER');   push(1, 'AC1015')
  push(9, '$INSUNITS');  push(70, 6)
  push(9, '$INSBASE');   push(10, 0); push(20, 0); push(30, 0)
  push(9, '$EXTMIN');    push(10, n(extmin[0])); push(20, n(extmin[1])); push(30, '0.0')
  push(9, '$EXTMAX');    push(10, n(extmax[0])); push(20, n(extmax[1])); push(30, '0.0')
  push(9, '$LIMMIN');    push(10, 0); push(20, 0)
  push(9, '$LIMMAX');    push(10, 50); push(20, 50)
  push(9, '$ORTHOMODE'); push(70, 0)
  push(9, '$LTSCALE');   push(40, '1.0')
  push(9, '$TEXTSIZE');  push(40, '0.2')
  push(9, '$TEXTSTYLE'); push(7, 'Standard')
  push(9, '$CLAYER');    push(8, '0')
  push(9, '$CELTYPE');   push(6, 'ByLayer')
  push(9, '$CECOLOR');   push(62, 256)
  push(9, '$DIMSCALE');  push(40, '1.0')
  push(9, '$DIMSTYLE');  push(2, 'Standard')
  push(0, 'ENDSEC')

  /* ── TABLES ──────────────────────────────────────── */
  push(0, 'SECTION'); push(2, 'TABLES')

  push(0, 'TABLE'); push(2, 'VPORT')
  push(5, H_VPORT_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 1)
  push(0, 'VPORT'); push(5, H_VPORT_ACTIVE); push(330, H_VPORT_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbViewportTableRecord')
  push(2, '*Active'); push(70, 0)
  push(10, 0); push(20, 0); push(11, 1); push(21, 1)
  push(12, n(cx)); push(22, n(cy)); push(13, 0); push(23, 0)
  push(14, 0.5); push(24, 0.5); push(15, 0.5); push(25, 0.5)
  push(16, 0); push(26, 0); push(36, 1); push(17, 0); push(27, 0); push(37, 0)
  push(40, n(vHeight)); push(41, '1.0'); push(42, '50.0'); push(43, 0); push(44, 0)
  push(50, 0); push(51, 0); push(71, 0); push(72, 1000); push(73, 1); push(74, 3)
  push(75, 0); push(76, 0); push(77, 0); push(78, 0)
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'LTYPE')
  push(5, H_LTYPE_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 3)
  for (const [h, name, desc] of [
    [H_LTYPE_BYBLOCK, 'ByBlock', ''],
    [H_LTYPE_BYLAYER, 'ByLayer', ''],
    [H_LTYPE_CONTINUOUS, 'Continuous', 'Solid line'],
  ] as const) {
    push(0, 'LTYPE'); push(5, h); push(330, H_LTYPE_TABLE)
    push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbLinetypeTableRecord')
    push(2, name); push(70, 0); push(3, desc); push(72, 65); push(73, 0); push(40, 0)
  }
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'LAYER')
  push(5, H_LAYER_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, layers.length)
  for (const layerName of layers) {
    const h = layerName === '0' ? H_LAYER_0 : nextH()
    push(0, 'LAYER'); push(5, h); push(330, H_LAYER_TABLE)
    push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbLayerTableRecord')
    push(2, layerName); push(70, 0); push(62, 7); push(6, 'Continuous')
    push(370, -3); push(390, 'F')
  }
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'STYLE')
  push(5, H_STYLE_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 1)
  push(0, 'STYLE'); push(5, H_STYLE_STD); push(330, H_STYLE_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbTextStyleTableRecord')
  push(2, 'Standard'); push(70, 0); push(40, 0); push(41, '1.0'); push(50, 0); push(71, 0); push(42, '0.2')
  push(3, 'arial.ttf'); push(4, '')
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'VIEW')
  push(5, H_VIEW_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 0)
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'UCS')
  push(5, H_UCS_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 0)
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'APPID')
  push(5, H_APPID_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 1)
  push(0, 'APPID'); push(5, H_APPID_ACAD); push(330, H_APPID_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbRegAppTableRecord')
  push(2, 'ACAD'); push(70, 0)
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'DIMSTYLE')
  push(5, H_DIMSTYLE_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 1)
  push(0, 'DIMSTYLE'); push(5, H_DIMSTYLE_STD); push(330, H_DIMSTYLE_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbDimStyleTableRecord')
  push(2, 'Standard'); push(70, 0)
  push(0, 'ENDTAB')

  push(0, 'TABLE'); push(2, 'BLOCK_RECORD')
  push(5, H_BLOCK_REC_TABLE); push(330, 0); push(100, 'AcDbSymbolTable'); push(70, 2)
  push(0, 'BLOCK_RECORD'); push(5, H_MS_BLOCK_REC); push(330, H_BLOCK_REC_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbBlockTableRecord')
  push(2, '*Model_Space'); push(340, H_MS_LAYOUT); push(70, 0); push(280, 1); push(281, 0)
  push(0, 'BLOCK_RECORD'); push(5, H_PS_BLOCK_REC); push(330, H_BLOCK_REC_TABLE)
  push(100, 'AcDbSymbolTableRecord'); push(100, 'AcDbBlockTableRecord')
  push(2, '*Paper_Space'); push(340, H_PS_LAYOUT); push(70, 0); push(280, 1); push(281, 0)
  push(0, 'ENDTAB')

  push(0, 'ENDSEC')

  /* ── BLOCKS ──────────────────────────────────────── */
  push(0, 'SECTION'); push(2, 'BLOCKS')

  push(0, 'BLOCK'); push(5, H_MS_BLOCK); push(330, H_MS_BLOCK_REC)
  push(100, 'AcDbEntity'); push(8, '0')
  push(100, 'AcDbBlockBegin')
  push(2, '*Model_Space'); push(70, 0); push(10, 0); push(20, 0); push(30, 0)
  push(3, '*Model_Space'); push(1, '')
  push(0, 'ENDBLK'); push(5, H_MS_ENDBLK); push(330, H_MS_BLOCK_REC)
  push(100, 'AcDbEntity'); push(8, '0'); push(100, 'AcDbBlockEnd')

  push(0, 'BLOCK'); push(5, H_PS_BLOCK); push(330, H_PS_BLOCK_REC)
  push(100, 'AcDbEntity'); push(67, 1); push(8, '0')
  push(100, 'AcDbBlockBegin')
  push(2, '*Paper_Space'); push(70, 0); push(10, 0); push(20, 0); push(30, 0)
  push(3, '*Paper_Space'); push(1, '')
  push(0, 'ENDBLK'); push(5, H_PS_ENDBLK); push(330, H_PS_BLOCK_REC)
  push(100, 'AcDbEntity'); push(67, 1); push(8, '0'); push(100, 'AcDbBlockEnd')

  push(0, 'ENDSEC')

  /* ── ENTITIES ────────────────────────────────────── */
  push(0, 'SECTION'); push(2, 'ENTITIES')

  for (const ln of doc.lines ?? []) {
    push(0, 'LINE')
    push(5, nextH()); push(330, H_MS_BLOCK_REC)
    push(100, 'AcDbEntity'); push(8, ln.layer || '0')
    push(100, 'AcDbLine')
    push(10, n(ln.start.x)); push(20, n(ln.start.y)); push(30, n(ln.start.z ?? 0))
    push(11, n(ln.end.x));   push(21, n(ln.end.y));   push(31, n(ln.end.z ?? 0))
  }

  for (const ln of doc.furniture_lines ?? []) {
    push(0, 'LINE')
    push(5, nextH()); push(330, H_MS_BLOCK_REC)
    push(100, 'AcDbEntity'); push(8, ln.layer || '0')
    push(100, 'AcDbLine')
    push(10, n(ln.start.x)); push(20, n(ln.start.y)); push(30, n(ln.start.z ?? 0))
    push(11, n(ln.end.x));   push(21, n(ln.end.y));   push(31, n(ln.end.z ?? 0))
  }

  for (const ar of doc.arcs ?? []) {
    push(0, 'ARC')
    push(5, nextH()); push(330, H_MS_BLOCK_REC)
    push(100, 'AcDbEntity'); push(8, ar.layer || '0')
    push(100, 'AcDbCircle')
    push(10, n(ar.center.x)); push(20, n(ar.center.y)); push(30, '0.0')
    push(40, n(ar.radius))
    push(100, 'AcDbArc')
    push(50, n(ar.start_angle)); push(51, n(ar.end_angle))
  }

  for (const pl of doc.polylines ?? []) {
    push(0, 'LWPOLYLINE')
    push(5, nextH()); push(330, H_MS_BLOCK_REC)
    push(100, 'AcDbEntity'); push(8, pl.layer || '0')
    push(100, 'AcDbLwPolyline')
    push(90, pl.vertices.length); push(70, pl.closed ? 1 : 0)
    for (const v of pl.vertices) {
      push(10, n(v.x)); push(20, n(v.y))
      if (v.bulge !== 0) push(42, n(v.bulge))
    }
  }

  for (const tx of doc.texts ?? []) {
    push(0, 'MTEXT')
    push(5, nextH()); push(330, H_MS_BLOCK_REC)
    push(100, 'AcDbEntity'); push(8, tx.layer || '0')
    push(100, 'AcDbMText')
    push(10, n(tx.position.x)); push(20, n(tx.position.y)); push(30, '0.0')
    push(40, n(tx.height))
    push(41, '10.0')
    push(46, '0.0')
    push(71, 1)
    push(72, 1)
    push(1, tx.text.replace(/\n/g, '\\P'))
    push(73, 1); push(44, '1.0')
  }

  push(0, 'ENDSEC')

  /* ── OBJECTS ─────────────────────────────────────── */
  push(0, 'SECTION'); push(2, 'OBJECTS')
  push(0, 'DICTIONARY'); push(5, H_ROOT_DICT); push(330, 0)
  push(100, 'AcDbDictionary'); push(281, 1)
  push(3, 'ACAD_GROUP'); push(350, 'D')
  push(0, 'ENDSEC')

  push(0, 'EOF')

  return out.join('\n') + '\n'
}

/** Trigger a browser download from a data-url or blob-url. */
function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/* ─── Complete DXF exporter (arcs + circles + door frames + windows + texts) ─── */

function exportToDxfString(
  walls:  WallSeg[],
  texts:  DxfText[],
  arcs:   DxfArc[],
  lines:  DxfLine[],
): string {
  let _handleCounter = 0x300
  const nextH = () => (_handleCounter++).toString(16).toUpperCase()

  const n8 = (v: number) => v.toFixed(8)

  const gc = (code: number, value: string | number): string => {
    const codeStr = String(code).padStart(3, ' ')
    if (typeof value === 'number' && Number.isInteger(value)) {
      return `${codeStr}\n${String(value).padStart(6, ' ')}\n`
    }
    return `${codeStr}\n${value}\n`
  }

  // ── Compute extents ──
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const expand = (x: number, y: number) => {
    if (x < minX) minX = x; if (x > maxX) maxX = x
    if (y < minY) minY = y; if (y > maxY) maxY = y
  }
  for (const w of walls)  { expand(w.start.x, w.start.y); expand(w.end.x, w.end.y) }
  for (const a of arcs)   { expand(a.center.x - a.radius, a.center.y - a.radius); expand(a.center.x + a.radius, a.center.y + a.radius) }
  for (const l of lines)  { expand(l.start.x, l.start.y); expand(l.end.x, l.end.y) }
  for (const tx of texts) { expand(tx.position.x, tx.position.y) }
  if (!isFinite(minX))    { minX = 0; minY = 0; maxX = 1; maxY = 1 }

  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  const viewH = Math.max(1, maxY - minY)

  // ── Layer registry ──
  const layerColors: Record<string, number> = {
    '0': 7, 'Walls': 7, 'Detail': 9,
    'Doors': 1, 'Windows': 4, 'Text': 3,
    'Dimensions': 2, 'Furniture': 8, 'Annotations': 6,
  }
  const layerSet = new Set<string>(['0'])
  for (const w of walls)  layerSet.add(w.isDetail ? 'Detail' : '0')
  for (const tx of texts) if (tx.layer) layerSet.add(tx.layer)
  for (const a of arcs)   if (a.layer)  layerSet.add(a.layer)
  for (const l of lines)  if (l.layer)  layerSet.add(l.layer)
  const layers = [...layerSet].sort()

  // ── Fixed handles ──
  const H_VPORT_TABLE = '8', H_VPORT_ACTIVE = '94'
  const H_LTYPE_TABLE = '5', H_LTYPE_BYBLOCK = '14', H_LTYPE_BYLAYER = '15', H_LTYPE_CONTINUOUS = '16'
  const H_LAYER_TABLE = '2', H_LAYER_0 = '10'
  const H_STYLE_TABLE = '3', H_STYLE_STD = '11'
  const H_VIEW_TABLE = '6', H_UCS_TABLE = '7'
  const H_APPID_TABLE = '9', H_APPID_ACAD = '12'
  const H_DIMSTYLE_TABLE = 'A', H_DIMSTYLE_STD = '27'
  const H_BLOCK_REC_TABLE = '1'
  const H_MS_BLOCK_REC = '1F', H_PS_BLOCK_REC = '58'
  const H_MS_LAYOUT = '22', H_PS_LAYOUT = '59'
  const H_MS_BLOCK = '20', H_MS_ENDBLK = '21'
  const H_PS_BLOCK = '5A', H_PS_ENDBLK = '5B'
  const H_ROOT_DICT = 'C'

  let out = ''

  // ════════════════ HEADER ════════════════
  out +=
    gc(0,'SECTION') + gc(2,'HEADER') +
    gc(9,'$ACADVER')   + gc(1,'AC1024') +
    gc(9,'$INSUNITS')  + gc(70,6) +
    gc(9,'$EXTMIN')    + gc(10,n8(minX)) + gc(20,n8(minY)) + gc(30,'0.00000000') +
    gc(9,'$EXTMAX')    + gc(10,n8(maxX)) + gc(20,n8(maxY)) + gc(30,'0.00000000') +
    gc(9,'$LIMMIN')    + gc(10,0) + gc(20,0) +
    gc(9,'$LIMMAX')    + gc(10,n8(maxX+1)) + gc(20,n8(maxY+1)) +
    gc(9,'$ORTHOMODE') + gc(70,0) +
    gc(9,'$LTSCALE')   + gc(40,'1.00000000') +
    gc(9,'$TEXTSIZE')  + gc(40,'0.20000000') +
    gc(9,'$TEXTSTYLE') + gc(7,'Standard') +
    gc(9,'$CLAYER')    + gc(8,'0') +
    gc(9,'$CELTYPE')   + gc(6,'ByLayer') +
    gc(9,'$CECOLOR')   + gc(62,256) +
    gc(9,'$DIMSCALE')  + gc(40,'1.00000000') +
    gc(9,'$DIMSTYLE')  + gc(2,'Standard') +
    gc(9,'$LWDISPLAY') + gc(290,1) +
    gc(9,'$VIEWCTR')   + gc(10,n8(cx)) + gc(20,n8(cy)) +
    gc(9,'$VIEWSIZE')  + gc(40,n8(viewH)) +
    gc(0,'ENDSEC')

  // ════════════════ TABLES ════════════════
  out += gc(0,'SECTION') + gc(2,'TABLES')

  // VPORT
  out +=
    gc(0,'TABLE') + gc(2,'VPORT') +
    gc(5,H_VPORT_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,1) +
    gc(0,'VPORT') + gc(5,H_VPORT_ACTIVE) + gc(330,H_VPORT_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbViewportTableRecord') +
    gc(2,'*Active') + gc(70,0) +
    gc(10,0) + gc(20,0) + gc(11,1) + gc(21,1) +
    gc(12,n8(cx)) + gc(22,n8(cy)) + gc(13,0) + gc(23,0) +
    gc(14,0.5) + gc(24,0.5) + gc(15,0.5) + gc(25,0.5) +
    gc(16,0) + gc(26,0) + gc(36,1) + gc(17,0) + gc(27,0) + gc(37,0) +
    gc(40,n8(viewH)) + gc(41,'1.00000000') + gc(42,'50.00000000') +
    gc(43,0) + gc(44,0) + gc(50,0) + gc(51,0) +
    gc(71,0) + gc(72,1000) + gc(73,1) + gc(74,3) +
    gc(75,0) + gc(76,0) + gc(77,0) + gc(78,0) +
    gc(0,'ENDTAB')

  // LTYPE
  out +=
    gc(0,'TABLE') + gc(2,'LTYPE') +
    gc(5,H_LTYPE_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,3)
  for (const [h, name, desc] of [
    [H_LTYPE_BYBLOCK,'ByBlock',''], [H_LTYPE_BYLAYER,'ByLayer',''], [H_LTYPE_CONTINUOUS,'Continuous','Solid line'],
  ] as const) {
    out +=
      gc(0,'LTYPE') + gc(5,h) + gc(330,H_LTYPE_TABLE) +
      gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbLinetypeTableRecord') +
      gc(2,name) + gc(70,0) + gc(3,desc) + gc(72,65) + gc(73,0) + gc(40,0)
  }
  out += gc(0,'ENDTAB')

  // LAYER
  out +=
    gc(0,'TABLE') + gc(2,'LAYER') +
    gc(5,H_LAYER_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,layers.length)
  for (const layerName of layers) {
    const h = layerName === '0' ? H_LAYER_0 : nextH()
    const color = layerColors[layerName] ?? 7
    out +=
      gc(0,'LAYER') + gc(5,h) + gc(330,H_LAYER_TABLE) +
      gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbLayerTableRecord') +
      gc(2,layerName) + gc(70,0) + gc(62,color) + gc(6,'Continuous') +
      gc(370,-3) + gc(390,'F')
  }
  out += gc(0,'ENDTAB')

  // STYLE
  out +=
    gc(0,'TABLE') + gc(2,'STYLE') +
    gc(5,H_STYLE_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,1) +
    gc(0,'STYLE') + gc(5,H_STYLE_STD) + gc(330,H_STYLE_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbTextStyleTableRecord') +
    gc(2,'Standard') + gc(70,0) + gc(40,0) + gc(41,'1.00000000') +
    gc(50,0) + gc(71,0) + gc(42,'0.20000000') +
    gc(3,'arial.ttf') + gc(4,'') +
    gc(0,'ENDTAB')

  // VIEW / UCS
  out += gc(0,'TABLE') + gc(2,'VIEW')  + gc(5,H_VIEW_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,0) + gc(0,'ENDTAB')
  out += gc(0,'TABLE') + gc(2,'UCS')   + gc(5,H_UCS_TABLE)  + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,0) + gc(0,'ENDTAB')

  // APPID
  out +=
    gc(0,'TABLE') + gc(2,'APPID') +
    gc(5,H_APPID_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,1) +
    gc(0,'APPID') + gc(5,H_APPID_ACAD) + gc(330,H_APPID_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbRegAppTableRecord') +
    gc(2,'ACAD') + gc(70,0) +
    gc(0,'ENDTAB')

  // DIMSTYLE
  out +=
    gc(0,'TABLE') + gc(2,'DIMSTYLE') +
    gc(5,H_DIMSTYLE_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,1) +
    gc(0,'DIMSTYLE') + gc(5,H_DIMSTYLE_STD) + gc(330,H_DIMSTYLE_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbDimStyleTableRecord') +
    gc(2,'Standard') + gc(70,0) +
    gc(0,'ENDTAB')

  // BLOCK_RECORD
  out +=
    gc(0,'TABLE') + gc(2,'BLOCK_RECORD') +
    gc(5,H_BLOCK_REC_TABLE) + gc(330,0) + gc(100,'AcDbSymbolTable') + gc(70,2) +
    gc(0,'BLOCK_RECORD') + gc(5,H_MS_BLOCK_REC) + gc(330,H_BLOCK_REC_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbBlockTableRecord') +
    gc(2,'*Model_Space') + gc(340,H_MS_LAYOUT) + gc(70,0) + gc(280,1) + gc(281,0) +
    gc(0,'BLOCK_RECORD') + gc(5,H_PS_BLOCK_REC) + gc(330,H_BLOCK_REC_TABLE) +
    gc(100,'AcDbSymbolTableRecord') + gc(100,'AcDbBlockTableRecord') +
    gc(2,'*Paper_Space') + gc(340,H_PS_LAYOUT) + gc(70,0) + gc(280,1) + gc(281,0) +
    gc(0,'ENDTAB')

  out += gc(0,'ENDSEC')

  // ════════════════ BLOCKS ════════════════
  out +=
    gc(0,'SECTION') + gc(2,'BLOCKS') +

    gc(0,'BLOCK')  + gc(5,H_MS_BLOCK) + gc(330,H_MS_BLOCK_REC) +
    gc(100,'AcDbEntity') + gc(8,'0') +
    gc(100,'AcDbBlockBegin') +
    gc(2,'*Model_Space') + gc(70,0) + gc(10,0) + gc(20,0) + gc(30,0) +
    gc(3,'*Model_Space') + gc(1,'') +
    gc(0,'ENDBLK') + gc(5,H_MS_ENDBLK) + gc(330,H_MS_BLOCK_REC) +
    gc(100,'AcDbEntity') + gc(8,'0') + gc(100,'AcDbBlockEnd') +

    gc(0,'BLOCK')  + gc(5,H_PS_BLOCK) + gc(330,H_PS_BLOCK_REC) +
    gc(100,'AcDbEntity') + gc(67,1) + gc(8,'0') +
    gc(100,'AcDbBlockBegin') +
    gc(2,'*Paper_Space') + gc(70,0) + gc(10,0) + gc(20,0) + gc(30,0) +
    gc(3,'*Paper_Space') + gc(1,'') +
    gc(0,'ENDBLK') + gc(5,H_PS_ENDBLK) + gc(330,H_PS_BLOCK_REC) +
    gc(100,'AcDbEntity') + gc(67,1) + gc(8,'0') + gc(100,'AcDbBlockEnd') +

    gc(0,'ENDSEC')

  // ════════════════ ENTITIES ════════════════
  out += gc(0,'SECTION') + gc(2,'ENTITIES')

  const eh = (type: string, layer: string) =>
    gc(0,type) + gc(5,nextH()) + gc(330,H_MS_BLOCK_REC) +
    gc(100,'AcDbEntity') + gc(8, layer || '0')

  // 1. Wall LINEs (ungrouped, non-arc-chord)
  const ungroupedWalls = walls.filter(w => !w.groupId && !w.fromArc)
  for (const w of ungroupedWalls) {
    const layer = w.isDetail ? 'Detail' : '0'
    out +=
      eh('LINE', layer) + gc(100,'AcDbLine') +
      gc(10,n8(w.start.x)) + gc(20,n8(w.start.y)) + gc(30,'0.00000000') +
      gc(11,n8(w.end.x))   + gc(21,n8(w.end.y))   + gc(31,'0.00000000')
  }

  // 2. Grouped walls → LWPOLYLINE
  const grouped = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.groupId || w.fromArc) continue
    if (!grouped.has(w.groupId)) grouped.set(w.groupId, [])
    grouped.get(w.groupId)!.push(w)
  }
  for (const group of grouped.values()) {
    const ordered = sortPolylineVertices(group)
    const verts: Array<{ x: number; y: number }> = []
    for (const w of ordered) {
      const last = verts[verts.length - 1]
      if (!last || Math.abs(last.x - w.start.x) > 1e-9 || Math.abs(last.y - w.start.y) > 1e-9)
        verts.push({ x: w.start.x, y: w.start.y })
      verts.push({ x: w.end.x, y: w.end.y })
    }
    const isClosed =
      verts.length > 2 &&
      Math.abs(verts[0].x - verts[verts.length - 1].x) < 0.01 &&
      Math.abs(verts[0].y - verts[verts.length - 1].y) < 0.01
    if (isClosed) verts.pop()
    out +=
      eh('LWPOLYLINE', '0') + gc(100,'AcDbLwPolyline') +
      gc(90, verts.length) + gc(70, isClosed ? 1 : 0) +
      verts.map(v => gc(10,n8(v.x)) + gc(20,n8(v.y))).join('')
  }

  // 3. Arcs and circles (all DxfArc entities — door swings + user-drawn)
  for (const arc of arcs) {
    const isDoor = lines.some(ln => ln.handle.startsWith(`dfl-${arc.handle.replace(/^arc-/, '')}`))
    const layer = isDoor ? 'Doors' : '0'
    const spanDeg = arc.end_angle > arc.start_angle
      ? arc.end_angle - arc.start_angle
      : arc.end_angle + 360 - arc.start_angle
    const isFullCircle = spanDeg >= 359.9

    if (isFullCircle) {
      out +=
        eh('CIRCLE', layer) + gc(100,'AcDbCircle') +
        gc(10,n8(arc.center.x)) + gc(20,n8(arc.center.y)) + gc(30,'0.00000000') +
        gc(40,n8(arc.radius))
    } else {
      out +=
        eh('ARC', layer) + gc(100,'AcDbCircle') +
        gc(10,n8(arc.center.x)) + gc(20,n8(arc.center.y)) + gc(30,'0.00000000') +
        gc(40,n8(arc.radius)) +
        gc(100,'AcDbArc') +
        gc(50,n8(arc.start_angle)) + gc(51,n8(arc.end_angle))
    }
  }

  // 4. All raw DXF lines: door jambs (dfl-*), window sill lines (win-*), and any others
  for (const ln of lines) {
    if (
      Math.abs(ln.end.x - ln.start.x) < 1e-9 &&
      Math.abs(ln.end.y - ln.start.y) < 1e-9
    ) continue
    const layer = ln.handle.startsWith('dfl-') ? 'Doors'
                : ln.handle.startsWith('win-') ? 'Windows'
                : ln.layer || '0'
    out +=
      eh('LINE', layer) + gc(100,'AcDbLine') +
      gc(10,n8(ln.start.x)) + gc(20,n8(ln.start.y)) + gc(30,n8(ln.start.z ?? 0)) +
      gc(11,n8(ln.end.x))   + gc(21,n8(ln.end.y))   + gc(31,n8(ln.end.z ?? 0))
  }

  // 5. MTEXT labels
  for (const tx of texts) {
    const body = tx.text.replace(/\n/g, '\\P')
    const layer = tx.layer || 'Text'
    out +=
      eh('MTEXT', layer) + gc(100,'AcDbMText') +
      gc(10,n8(tx.position.x)) + gc(20,n8(tx.position.y)) + gc(30,'0.00000000') +
      gc(40,n8(tx.height)) +
      gc(41,'10.00000000') +
      gc(46,'0.00000000') +
      gc(71,1) +
      gc(72,1) +
      gc(1, body) +
      gc(7,'Standard') +
      gc(73,1) +
      gc(44,'1.00000000')
  }

  out += gc(0,'ENDSEC')

  // ════════════════ OBJECTS ════════════════
  out +=
    gc(0,'SECTION') + gc(2,'OBJECTS') +
    gc(0,'DICTIONARY') + gc(5,H_ROOT_DICT) + gc(330,0) +
    gc(100,'AcDbDictionary') + gc(281,1) +
    gc(3,'ACAD_GROUP') + gc(350,'D') +
    gc(0,'ENDSEC')

  out += gc(0,'EOF')

  return out
}

/** Returns `room-lbl-{polyHandle}` — used to link a room label to its polyline. */
function roomLabelHandle(polyHandle: string): string {
  return `room-lbl-${polyHandle}`
}

function appendUserText(
  doc: DxfJsonDocument,
  position: Pt,
  text = 'Label',
  height = 0.2,
  overrideHandle?: string,
): { next: DxfJsonDocument; handle: string } {
  const handle = overrideHandle ?? `user-t-${Date.now()}`
  const entity: DxfText = {
    entity_type: 'MTEXT',
    handle,
    layer: '0',
    text,
    position: { x: position.x, y: position.y, z: 0 },
    height,
  }
  const next = cloneDoc(doc)
  next.texts = [...next.texts, entity]
  next.stats = {
    ...next.stats,
    text_count: next.stats.text_count + 1,
    entity_counts: {
      ...next.stats.entity_counts,
      MTEXT: (next.stats.entity_counts.MTEXT ?? 0) + 1,
    },
  }
  return { next, handle }
}

function removeLineFromDocByWallId(doc: DxfJsonDocument, wallId: string): DxfJsonDocument {
  if (!wallId.startsWith('ln-')) return doc
  const handle = wallId.slice(3)
  const lines = doc.lines.filter(l => l.handle !== handle)
  if (lines.length === doc.lines.length) return doc
  const next = cloneDoc(doc)
  next.lines = lines
  next.stats = {
    ...next.stats,
    line_count: Math.max(0, next.stats.line_count - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      LINE: Math.max(0, (next.stats.entity_counts.LINE ?? 0) - 1),
    },
  }
  return next
}

function removeTextFromDoc(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const texts = doc.texts.filter(t => t.handle !== handle)
  if (texts.length === doc.texts.length) return doc
  const next = cloneDoc(doc)
  next.texts = texts
  next.stats = {
    ...next.stats,
    text_count: Math.max(0, next.stats.text_count - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      MTEXT: Math.max(0, (next.stats.entity_counts.MTEXT ?? 0) - 1),
    },
  }
  return next
}

/* ─── Constants ──────────────────────────────────────────────── */
const PAD = 55
const STAGE_MIN_W = 320
const STAGE_MIN_H = 280
const SNAP_TH     = 0.15
const SNAP_LINE_TH = 0.25
const HP_SCR  = 7
const ROOM_COLORS = [
  'rgba(59,130,246,0.15)',
  'rgba(16,185,129,0.15)',
  'rgba(245,158,11,0.15)',
  'rgba(139,92,246,0.15)',
  'rgba(236,72,153,0.15)',
  'rgba(239,68,68,0.15)',
  'rgba(20,184,166,0.15)',
  'rgba(234,179,8,0.15)',
]
const ROOM_STROKES = ROOM_COLORS.map(c => c.replace('0.15', '0.55'))

function nearSamePt(a: Pt, b: Pt, eps: number) {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps
}

function wallIdsOnRoomBoundary(room: Pt[], segs: WallSeg[]): string[] {
  const eps = Math.max(SNAP_TH * 5, 0.12)
  const n = room.length
  const found = new Set<string>()
  for (let i = 0; i < n; i++) {
    const a = room[i]
    const b = room[(i + 1) % n]
    for (const w of segs) {
      const s = w.start, e = w.end
      const fwd = nearSamePt(s, a, eps) && nearSamePt(e, b, eps)
      const rev = nearSamePt(s, b, eps) && nearSamePt(e, a, eps)
      if (fwd || rev) { found.add(w.id); break }
    }
  }
  return [...found]
}

function translateWallsByIds(ws: WallSeg[], ids: Set<string>, dx: number, dy: number): WallSeg[] {
  if (!ids.size || (dx === 0 && dy === 0)) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    return { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } }
  })
}

function applyRoomDeltaToDoc(doc: DxfJsonDocument, wallIds: string[], dx: number, dy: number): DxfJsonDocument {
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

/* ─── Transform helpers ──────────────────────────────────────── */
function buildT(emin: number[], emax: number[], canvasW: number, canvasH: number) {
  const wW = emax[0] - emin[0]
  const wH = emax[1] - emin[1]
  const aW = Math.max(40, canvasW - PAD * 2)
  const aH = Math.max(40, canvasH - PAD * 2)
  const sc = Math.min(aW / wW, aH / wH)
  const oX = PAD + (aW - wW * sc) / 2
  const oY = PAD + (aH - wH * sc) / 2
  return { sc, oX, oY, emin, wH }
}
type T = ReturnType<typeof buildT>

const toC = (wx: number, wy: number, t: T): [number, number] => [
  (wx - t.emin[0]) * t.sc + t.oX,
  t.oY + (t.wH - (wy - t.emin[1])) * t.sc,
]

const toW = (cx: number, cy: number, t: T): [number, number] => [
  (cx - t.oX) / t.sc + t.emin[0],
  t.emin[1] + t.wH - (cy - t.oY) / t.sc,
]

function getStageCanvasPointer(stage: Konva.Stage): { x: number; y: number } | null {
  const p = stage.getPointerPosition()
  if (!p) return null
  const inv = stage.getAbsoluteTransform().copy().invert()
  return inv.point(p)
}

function arcPoints(arc: DxfArc, t: T, steps = 48): number[] {
  const startRad = arc.start_angle * Math.PI / 180
  const endDeg = arc.end_angle > arc.start_angle ? arc.end_angle : arc.end_angle + 360
  const endRad = endDeg * Math.PI / 180
  const pts: number[] = []
  for (let i = 0; i <= steps; i++) {
    const angle = startRad + (endRad - startRad) * i / steps
    const [cx, cy] = toC(arc.center.x + arc.radius * Math.cos(angle), arc.center.y + arc.radius * Math.sin(angle), t)
    pts.push(cx, cy)
  }
  return pts
}

function polyArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}

function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number): [number, number] {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const dx = px - cx, dy = py - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

function applyRotation(ws: WallSeg[], ids: Set<string>, cx: number, cy: number, angle: number): WallSeg[] {
  if (angle === 0) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const [sx, sy] = rotatePoint(w.start.x, w.start.y, cx, cy, angle)
    const [ex, ey] = rotatePoint(w.end.x, w.end.y, cx, cy, angle)
    return { ...w, start: { x: sx, y: sy }, end: { x: ex, y: ey } }
  })
}

function scalePoint(px: number, py: number, cx: number, cy: number, sx: number, sy: number): [number, number] {
  return [cx + (px - cx) * sx, cy + (py - cy) * sy]
}

function applyScale(ws: WallSeg[], ids: Set<string>, cx: number, cy: number, sx: number, sy: number): WallSeg[] {
  if (sx === 1 && sy === 1) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const [startX, startY] = scalePoint(w.start.x, w.start.y, cx, cy, sx, sy)
    const [endX, endY] = scalePoint(w.end.x, w.end.y, cx, cy, sx, sy)
    return { ...w, start: { x: startX, y: startY }, end: { x: endX, y: endY } }
  })
}

function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): { pt: { x: number; y: number }; t: number; dist: number } {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return { pt: { x: ax, y: ay }, t: 0, dist: Math.hypot(px - ax, py - ay) }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + t * dx, cy = ay + t * dy
  return { pt: { x: cx, y: cy }, t, dist: Math.hypot(px - cx, py - cy) }
}

function getGroupWallIds(wallId: string, walls: WallSeg[]): string[] {
  const target = walls.find(w => w.id === wallId)
  if (!target?.groupId) return [wallId]
  const gid = target.groupId
  return walls.filter(w => w.groupId === gid).map(w => w.id)
}

function lineIntersectsRect(a: Pt, b: Pt, x1: number, y1: number, x2: number, y2: number): boolean {
  if (a.x >= x1 && a.x <= x2 && a.y >= y1 && a.y <= y2) return true
  if (b.x >= x1 && b.x <= x2 && b.y >= y1 && b.y <= y2) return true
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

/* ─── DCEL-based minimal face extraction ────────── */
function detectRooms(walls: WallSeg[]): Pt[][] {
  // Exclude arc chord segments (circles/arcs) — arcs form closed curves but are not rooms
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.id.startsWith('pl-') && !w.fromArc)
  if (segs.length < 3) return []

  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++)
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
    return nodes.push({ x, y }) - 1
  }

  const eKeys = new Set<string>()
  const eList: [number, number][] = []
  for (const w of segs) {
    const u = getN(w.start.x, w.start.y)
    const v = getN(w.end.x, w.end.y)
    if (u === v) continue
    const k = `${Math.min(u, v)},${Math.max(u, v)}`
    if (!eKeys.has(k)) { eKeys.add(k); eList.push([u, v]) }
  }
  if (eList.length < 3) return []

  const adj = new Map<number, number[]>()
  for (const [u, v] of eList)
    for (const [a, b] of [[u, v], [v, u]] as const) {
      if (!adj.has(a)) adj.set(a, [])
      adj.get(a)!.push(b)
    }
  for (const [n, nb] of adj) {
    const pn = nodes[n]
    nb.sort((a, b) =>
      Math.atan2(nodes[a].y - pn.y, nodes[a].x - pn.x) -
      Math.atan2(nodes[b].y - pn.y, nodes[b].x - pn.x))
  }

  const nextHE = new Map<string, string>()
  for (const [u, v] of eList) {
    for (const [s, e] of [[u, v], [v, u]] as const) {
      const backA = Math.atan2(nodes[s].y - nodes[e].y, nodes[s].x - nodes[e].x)
      let bestW = -1, bestCW = Infinity
      for (const w of adj.get(e) ?? []) {
        const outA = Math.atan2(nodes[w].y - nodes[e].y, nodes[w].x - nodes[e].x)
        let cw = backA - outA
        while (cw <= 0) cw += 2 * Math.PI
        if (cw < bestCW) { bestCW = cw; bestW = w }
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
      let cur = sk, guard = 0
      do {
        traced.add(cur)
        ids.push(Number(cur.split(',')[0]))
        cur = nextHE.get(cur) ?? ''
        guard++
      } while (cur !== sk && cur !== '' && guard < 60)
      if (cur === sk && ids.length >= 3) rawFaces.push(ids.map(i => nodes[i]))
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
      for (const poly of result)
        for (const contour of poly) {
          const pts = contour.slice(0, -1).map(([x, y]) => ({ x, y }))
          if (pts.length >= 3 && Math.abs(polyArea(pts)) > 0.05) validFaces.push(pts)
        }
    } catch { validFaces.push(face) }
  }
  return validFaces
}

function applyResizeToWalls(
  ws: WallSeg[], ids: Set<string>,
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

function detectRoomsWithWalls(walls: WallSeg[]): Array<{ polygon: Pt[]; wallIds: string[] }> {
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.id.startsWith('pl-') && !w.fromArc)
  if (segs.length < 3) return []

  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++)
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
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
    if (!eKeys.has(k)) { eKeys.add(k); eList.push([u, v]); eWallIds.push(w.id) }
  }
  if (eList.length < 3) return []

  const adj = new Map<number, number[]>()
  for (const [u, v] of eList)
    for (const [a, b] of [[u, v], [v, u]] as const) {
      if (!adj.has(a)) adj.set(a, [])
      adj.get(a)!.push(b)
    }
  for (const [n, nb] of adj) {
    const pn = nodes[n]
    nb.sort((a, b) =>
      Math.atan2(nodes[a].y - pn.y, nodes[a].x - pn.x) -
      Math.atan2(nodes[b].y - pn.y, nodes[b].x - pn.x))
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
      let bestW = -1, bestCW = Infinity
      for (const w of adj.get(e) ?? []) {
        const outA = Math.atan2(nodes[w].y - nodes[e].y, nodes[w].x - nodes[e].x)
        let cw = backA - outA
        while (cw <= 0) cw += 2 * Math.PI
        if (cw < bestCW) { bestCW = cw; bestW = w }
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
      let cur = sk, guard = 0
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
        if (polyArea(polygon) > 0.05) result.push({ polygon, wallIds: faceWallIds })
      }
    }
  }
  return result
}

/* ─── Component ──────────────────────────────────────────────── */
/** Group id for draggable furniture — lines with the same key move as one object. */
function furnitureGroupKeyFromHandle(handle: string): string {
  if (!handle.startsWith('furn-')) return handle
  // Use only the first word after "furn-" so that component handles like
  // furn-bed-pillow-1 and furn-bed-1 all fall into the same "furn-bed" group.
  // Timestamp-based drag-drop handles (furn-1234567890-0) are also handled
  // correctly since the timestamp becomes the sole group identifier.
  return `furn-${handle.slice('furn-'.length).split('-')[0]}`
}

/** Returns a concise display name from an INSERT block_name, e.g. "Bed - Queen" → "Bed". */
function shortFurnLabel(blockName: string): string {
  if (blockName.includes(' - ')) return blockName.split(' - ')[0]
  const words = blockName.split(' ')
  return words.slice(0, 2).join(' ')
}

/* ─── Component ──────────────────────────────────── */
export function DxfJsonViewPage() {
  const stageRef = useRef<Konva.Stage>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 900, h: 620 })

  const [planDoc, setPlanDoc] = useState<DxfJsonDocument>(() => ({ ...DXF_JSON_DATA }))

  const displayDoc = planDoc
  const t = useMemo(
    () => buildT(displayDoc.meta.extmin, displayDoc.meta.extmax, stageSize.w, stageSize.h),
    [displayDoc.meta.extmin, displayDoc.meta.extmax, stageSize.w, stageSize.h],
  )

  useLayoutEffect(() => {
    const el = canvasHostRef.current
    if (!el) return
    const apply = () => {
      const { width, height } = el.getBoundingClientRect()
      const w = Math.max(STAGE_MIN_W, Math.floor(width))
      const h = Math.max(STAGE_MIN_H, Math.floor(height))
      setStageSize(prev => (prev.w === w && prev.h === h ? prev : { w, h }))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [walls, setWalls]         = useState<WallSeg[]>(() => wallsFromDxfJson(DXF_JSON_DATA))
  const [history, setHistory]     = useState<EditorSnapshot[]>([])
  const [zoom, setZoom]           = useState(1)
  const [pos, setPos]             = useState({ x: 0, y: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionBox, setSelectionBox] = useState<{ start: Pt; current: Pt } | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null)
  const [selectedTextHandle, setSelectedTextHandle] = useState<string | null>(null)
  const [editingTextHandle, setEditingTextHandle] = useState<string | null>(null)
  const [editingTextValue, setEditingTextValue] = useState<string>('')
  const [drawLineAnchor, setDrawLineAnchor] = useState<Pt | null>(null)
  const [drawLinePointer, setDrawLinePointer] = useState<Pt | null>(null)
  const drawLineAnchorRef = useRef<Pt | null>(null)
  const [polylineDraft, setPolylineDraft] = useState<Pt[]>([])
  const [polylineHover, setPolylineHover] = useState<Pt | null>(null)
  const polylineDraftRef = useRef<Pt[]>([])
  const finishPolylineRef = useRef<() => void>(() => {})
  const [polylineClosed, setPolylineClosed] = useState(false)
  const textHeightDragRef = useRef<{ handle: string; startH: number; startPointerWy: number } | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [orthoEnabled, setOrthoEnabled] = useState(false)
  const [showDetail, setShowDetail]   = useState(true)
  const [showLabels, setShowLabels]           = useState(true)
  const [showFurnitureLabels, setShowFurnitureLabels] = useState(true)
  const [selectedArcHandle, setSelectedArcHandle] = useState<string | null>(null)
  const [selectedWinKey, setSelectedWinKey]       = useState<string | null>(null)
  const [selectedFurnKey, setSelectedFurnKey]     = useState<string | null>(null)

  const [arcDraftCenter,     setArcDraftCenter]     = useState<Pt | null>(null)
  const [arcDraftRadius,     setArcDraftRadius]     = useState<number | null>(null)
  const [arcDraftStartAngle, setArcDraftStartAngle] = useState<number | null>(null)
  const [circleDraftCenter,  setCircleDraftCenter]  = useState<Pt | null>(null)
  const [shapePointer, setShapePointer] = useState<Pt | null>(null)

  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [hoveredRoomIdx, setHoveredRoomIdx] = useState<number | null>(null)

  const [activeTool, setActiveTool] = useState<
    'select' | 'hand' | 'frame' | 'drawLine' | 'drawPolyline' | 'text' | 'drawArc' | 'drawCircle'
  >('select')
  const [units, setUnits] = useState<'m' | 'cm' | 'mm'>('m')
  const [strokeHex, setStrokeHex] = useState('#474747')
  const [strokeScale, setStrokeScale] = useState(1)

  const [snapTarget, setSnapTarget]   = useState<Pt | null>(null)
  const [snapTargetType, setSnapTargetType] = useState<'endpoint'|'midpoint'|'arcCenter'|'arcQuadrant'|null>(null)
  const [alignGuides, setAlignGuides] = useState<Array<{type:'h'|'v', coord: number}>>([])
  const snapLineWallRef = useRef<{ wallId: string; t: number } | null>(null)
  const [isDraggingEp, setIsDraggingEp] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)

  interface ActiveDrag {
    wallId:    string
    toMoveWallIds: string[]
    toMoveTextIds: string[]
    toMoveArcHandles: string[]
    initWX:    number
    initWY:    number
  }
  interface ActivePolylineDrag {
    polyHandle: string
    leaderSegId: string
    segments: { id: string; origStart: Pt; origEnd: Pt }[]
    initCX: number
    initCY: number
  }
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta]   = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const selBeforeMouseDown = useRef<Set<string>>(new Set())
  const draggingEpInfo = useRef<{ wallId: string; ep: 'start' | 'end' } | null>(null)

  interface RotationDrag {
    centerWX: number
    centerWY: number
    startMouseAngle: number
    wallIds: string[]
    textHandles: string[]
    arcHandles: string[]
    winKey?: string    // window group key if rotating a window
    furnKey?: string   // furniture group key if rotating furniture
  }
  const rotationDragRef = useRef<RotationDrag | null>(null)
  const [rotationDrag, setRotationDrag] = useState<RotationDrag | null>(null)
  const rotationAngleDeltaRef = useRef(0)
  const [rotationAngleDelta, setRotationAngleDelta] = useState(0)

  interface ResizeDrag {
    handle: 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
    initBBox: { minWX: number; minWY: number; maxWX: number; maxWY: number }
    initMouseWX: number
    initMouseWY: number
    wallIds: string[]
    textHandles: string[]
    arcHandles: string[]
    winKey?: string    // window group key if resizing a window
    furnKey?: string   // furniture group key if resizing furniture
  }
  const resizeDragRef = useRef<ResizeDrag | null>(null)
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null)
  const resizePreviewRef = useRef<{ minWX: number; minWY: number; maxWX: number; maxWY: number } | null>(null)
  const [resizePreview, setResizePreview] = useState<{ minWX: number; minWY: number; maxWX: number; maxWY: number } | null>(null)

  const activePolyDragRef = useRef<ActivePolylineDrag | null>(null)
  const [activePolyDrag, setActivePolyDrag] = useState<ActivePolylineDrag | null>(null)
  const [polyDragDelta, setPolyDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const polyDragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  interface RoomDrag {
    wallIds: Set<string>
    initCX: number
    initCY: number
  }
  const roomDragRef = useRef<RoomDrag | null>(null)
  const [roomDrag, setRoomDrag] = useState<RoomDrag | null>(null)
  const [roomDragDelta, setRoomDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const roomDragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const [isDraggingRoom, setIsDraggingRoom] = useState(false)

  const applyDrag = useCallback((ws: WallSeg[], drag: ActiveDrag, delta: { dx: number; dy: number }): WallSeg[] => {
    const { toMoveWallIds, toMoveArcHandles } = drag
    const { dx, dy } = delta
    const toMove = new Set(toMoveWallIds)
    const arcSet = new Set(toMoveArcHandles)
    return ws.map(w => {
      if (toMove.has(w.id) || (w.fromArc && arcSet.has(w.fromArc))) {
        return { ...w, start: { x: w.start.x + dx, y: w.start.y + dy }, end: { x: w.end.x + dx, y: w.end.y + dy } }
      }
      return w
    })
  }, [])

  const applyPolylineDrag = useCallback((ws: WallSeg[], drag: ActivePolylineDrag, delta: { dx: number; dy: number }): WallSeg[] => {
    const { dx, dy } = delta
    const orig = new Map(drag.segments.map(s => [s.id, s] as const))
    return ws.map(w => {
      const seg = orig.get(w.id)
      if (!seg) return w
      return { ...w, start: { x: seg.origStart.x + dx, y: seg.origStart.y + dy }, end: { x: seg.origEnd.x + dx, y: seg.origEnd.y + dy } }
    })
  }, [])

  const effectiveTexts = useMemo(() => {
    let texts = planDoc.texts
    if (activeDrag) {
      const { toMoveTextIds } = activeDrag
      const { dx, dy } = dragDelta
      const tSet = new Set(toMoveTextIds)
      texts = texts.map(tx => tSet.has(tx.handle) ? { ...tx, position: { x: tx.position.x + dx, y: tx.position.y + dy, z: 0 } } : tx)
    }
    if (rotationDrag && rotationAngleDelta !== 0) {
      const { centerWX, centerWY, textHandles } = rotationDrag
      const tSet = new Set(textHandles)
      texts = texts.map(tx => {
        if (!tSet.has(tx.handle)) return tx
        const [nx, ny] = rotatePoint(tx.position.x, tx.position.y, centerWX, centerWY, rotationAngleDelta)
        return { ...tx, position: { x: nx, y: ny, z: 0 } }
      })
    }
    if (resizeDrag && resizePreview) {
      const { textHandles, initBBox } = resizeDrag
      const origW = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW  = resizePreview.maxWX - resizePreview.minWX
      const newH  = resizePreview.maxWY - resizePreview.minWY
      const scaleF = Math.sqrt((newW / origW) * (newH / origH))
      const tSet = new Set(textHandles)
      texts = texts.map(tx => {
        if (!tSet.has(tx.handle)) return tx
        const nx = resizePreview.minWX + (tx.position.x - initBBox.minWX) / origW * newW
        const ny = resizePreview.minWY + (tx.position.y - initBBox.minWY) / origH * newH
        return { ...tx, position: { x: nx, y: ny, z: 0 }, height: Math.max(0.05, tx.height * scaleF) }
      })
    }
    return texts
  }, [planDoc.texts, activeDrag, dragDelta, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  const effectiveArcs = useMemo(() => {
    let arcs = planDoc.arcs
    if (activeDrag) {
      const aSet = new Set(activeDrag.toMoveArcHandles)
      const { dx, dy } = dragDelta
      arcs = arcs.map(a => aSet.has(a.handle) ? { ...a, center: { ...a.center, x: a.center.x + dx, y: a.center.y + dy } } : a)
    }
    if (rotationDrag && rotationAngleDelta !== 0) {
      const aSet = new Set(rotationDrag.arcHandles)
      const angleDeltaDeg = rotationAngleDelta * (180 / Math.PI)
      arcs = arcs.map(a => {
        if (!aSet.has(a.handle)) return a
        const [nx, ny] = rotatePoint(a.center.x, a.center.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        return { ...a, center: { ...a.center, x: nx, y: ny }, start_angle: a.start_angle + angleDeltaDeg, end_angle: a.end_angle + angleDeltaDeg }
      })
    }
    if (resizeDrag && resizePreview) {
      const { arcHandles, initBBox } = resizeDrag
      const origW = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW  = resizePreview.maxWX - resizePreview.minWX
      const newH  = resizePreview.maxWY - resizePreview.minWY
      const scaleF = Math.sqrt((newW / origW) * (newH / origH))
      const aSet = new Set(arcHandles)
      arcs = arcs.map(a => {
        if (!aSet.has(a.handle)) return a
        const nx = resizePreview.minWX + (a.center.x - initBBox.minWX) / origW * newW
        const ny = resizePreview.minWY + (a.center.y - initBBox.minWY) / origH * newH
        return { ...a, center: { ...a.center, x: nx, y: ny }, radius: Math.max(0.01, a.radius * scaleF) }
      })
    }
    return arcs
  }, [planDoc.arcs, activeDrag, dragDelta, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  const effectiveLines = useMemo(() => {
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    let lines = [...(planDoc.door_lines ?? []), ...(planDoc.window_lines ?? [])]
    if (activeDrag && activeDrag.toMoveArcHandles.length > 0) {
      const { dx, dy } = dragDelta
      const dflPrefixes = activeDrag.toMoveArcHandles.map(h => `dfl-${arcKey(h)}`)
      lines = lines.map(l => {
        if (!dflPrefixes.some(pfx => l.handle.startsWith(pfx))) return l
        return { ...l, start: { ...l.start, x: l.start.x + dx, y: l.start.y + dy }, end: { ...l.end, x: l.end.x + dx, y: l.end.y + dy } }
      })
    }
    if (rotationDrag && rotationAngleDelta !== 0 && rotationDrag.arcHandles.length > 0) {
      const dflPrefixes = rotationDrag.arcHandles.map(h => `dfl-${arcKey(h)}`)
      lines = lines.map(l => {
        if (!dflPrefixes.some(pfx => l.handle.startsWith(pfx))) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      })
    }
    if (resizeDrag && resizePreview && resizeDrag.arcHandles.length > 0) {
      const { initBBox } = resizeDrag
      const origW = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW  = resizePreview.maxWX - resizePreview.minWX
      const newH  = resizePreview.maxWY - resizePreview.minWY
      const scaleX = (x: number) => resizePreview.minWX + (x - initBBox.minWX) / origW * newW
      const scaleY = (y: number) => resizePreview.minWY + (y - initBBox.minWY) / origH * newH
      const dflPrefixes = resizeDrag.arcHandles.map(h => `dfl-${arcKey(h)}`)
      lines = lines.map(l => {
        if (!dflPrefixes.some(pfx => l.handle.startsWith(pfx))) return l
        return { ...l, start: { ...l.start, x: scaleX(l.start.x), y: scaleY(l.start.y) }, end: { ...l.end, x: scaleX(l.end.x), y: scaleY(l.end.y) } }
      })
    }
    // Window rotation preview
    if (rotationDrag?.winKey && rotationAngleDelta !== 0) {
      const pfx = `win-${rotationDrag.winKey}-`
      lines = lines.map(l => {
        if (!l.handle.startsWith(pfx)) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      })
    }
    // Window resize preview
    if (resizeDrag?.winKey && resizePreview) {
      const { initBBox } = resizeDrag
      const origW2 = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH2 = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW2  = resizePreview.maxWX - resizePreview.minWX
      const newH2  = resizePreview.maxWY - resizePreview.minWY
      const scaleX2 = (x: number) => resizePreview.minWX + (x - initBBox.minWX) / origW2 * newW2
      const scaleY2 = (y: number) => resizePreview.minWY + (y - initBBox.minWY) / origH2 * newH2
      const pfx = `win-${resizeDrag.winKey}-`
      lines = lines.map(l => {
        if (!l.handle.startsWith(pfx)) return l
        return { ...l, start: { ...l.start, x: scaleX2(l.start.x), y: scaleY2(l.start.y) }, end: { ...l.end, x: scaleX2(l.end.x), y: scaleY2(l.end.y) } }
      })
    }
    return lines
  }, [planDoc.door_lines, planDoc.window_lines, activeDrag, dragDelta, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  /** Like effectiveLines but for furniture — applies live rotation/resize preview. */
  const effectiveFurnitureLines = useMemo(() => {
    let lines = planDoc.furniture_lines ?? []
    if (rotationDrag?.furnKey && rotationAngleDelta !== 0) {
      lines = lines.map(l => {
        if (furnitureGroupKeyFromHandle(l.handle) !== rotationDrag.furnKey) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      })
    }
    if (resizeDrag?.furnKey && resizePreview) {
      const { initBBox } = resizeDrag
      const origW = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW  = resizePreview.maxWX - resizePreview.minWX
      const newH  = resizePreview.maxWY - resizePreview.minWY
      const scaleX = (x: number) => resizePreview.minWX + (x - initBBox.minWX) / origW * newW
      const scaleY = (y: number) => resizePreview.minWY + (y - initBBox.minWY) / origH * newH
      lines = lines.map(l => {
        if (furnitureGroupKeyFromHandle(l.handle) !== resizeDrag.furnKey) return l
        return { ...l, start: { ...l.start, x: scaleX(l.start.x), y: scaleY(l.start.y) }, end: { ...l.end, x: scaleX(l.end.x), y: scaleY(l.end.y) } }
      })
    }
    return lines
  }, [planDoc.furniture_lines, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  const roomsWithWalls = useMemo(() => {
    let ws = walls
    if (activeDrag) ws = applyDrag(ws, activeDrag, dragDelta)
    if (rotationDrag && rotationAngleDelta !== 0) ws = applyRotation(ws, new Set(rotationDrag.wallIds), rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
    if (resizeDrag && resizePreview) ws = applyResizeToWalls(ws, new Set(resizeDrag.wallIds), resizeDrag.initBBox, resizePreview)
    return detectRoomsWithWalls(ws)
  }, [walls, activeDrag, dragDelta, applyDrag, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  const wallsBase = useMemo(() => {
    if (activePolyDrag) return applyPolylineDrag(walls, activePolyDrag, polyDragDelta)
    if (activeDrag) return applyDrag(walls, activeDrag, dragDelta)
    return walls
  }, [walls, activeDrag, dragDelta, activePolyDrag, polyDragDelta, applyDrag, applyPolylineDrag])

  const rooms = useMemo(() => {
    const g = roomDrag ? translateWallsByIds(wallsBase, roomDrag.wallIds, roomDragDelta.dx, roomDragDelta.dy) : wallsBase
    return detectRooms(g)
  }, [wallsBase, roomDrag, roomDragDelta])

  const snapshot = useCallback(() => {
    setHistory(h => [...h.slice(-20), {
      walls: walls.map(w => ({ ...w, start: { ...w.start }, end: { ...w.end } })),
      planDoc: cloneDoc(planDoc),
    }])
  }, [walls, planDoc])

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h
      const snap = h[h.length - 1]
      setWalls(snap.walls.map(w => ({ ...w, start: { ...w.start }, end: { ...w.end } })))
      setPlanDoc(cloneDoc(snap.planDoc))
      return h.slice(0, -1)
    })
  }, [])

  const getSnap = useCallback((x: number, y: number, excludeIds: string[] | string): Pt => {
    const excl = Array.isArray(excludeIds) ? excludeIds : (excludeIds ? [excludeIds] : [])
    if (!snapEnabled) {
      snapLineWallRef.current = null
      setSnapTargetType(null); setAlignGuides([])
      return { x, y }
    }

    // ── Collect all snap points from walls + arcs ─────────────────────────────
    type SP = { x: number; y: number; type: 'endpoint'|'midpoint'|'arcCenter'|'arcQuadrant' }
    const snapPts: SP[] = []
    for (const w of walls) {
      if (excl.includes(w.id)) continue
      snapPts.push({ ...w.start, type: 'endpoint' })
      snapPts.push({ ...w.end, type: 'endpoint' })
      snapPts.push({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2, type: 'midpoint' })
    }
    for (const a of planDoc.arcs) {
      snapPts.push({ x: a.center.x, y: a.center.y, type: 'arcCenter' })
      for (const deg of [0, 90, 180, 270]) {
        const rad = deg * Math.PI / 180
        snapPts.push({ x: a.center.x + a.radius * Math.cos(rad), y: a.center.y + a.radius * Math.sin(rad), type: 'arcQuadrant' })
      }
    }

    // ── 1. Nearest snap point (endpoint / midpoint / arc) ─────────────────────
    let best: SP | null = null, bestD = SNAP_TH
    for (const sp of snapPts) {
      const d = Math.hypot(sp.x - x, sp.y - y)
      if (d < bestD) { bestD = d; best = sp }
    }
    if (best) {
      snapLineWallRef.current = null
      setSnapTargetType(best.type); setAlignGuides([])
      return { x: best.x, y: best.y }
    }

    // ── 2. Segment midpoint snap (on-wall) ────────────────────────────────────
    let bestSeg: { wallId: string; t: number; pt: Pt } | null = null, bestSegD = SNAP_LINE_TH
    for (const w of walls) {
      if (excl.includes(w.id)) continue
      const { pt, t, dist } = closestPointOnSegment(x, y, w.start.x, w.start.y, w.end.x, w.end.y)
      if (t > 0.01 && t < 0.99 && dist < bestSegD) { bestSegD = dist; bestSeg = { wallId: w.id, t, pt } }
    }
    if (bestSeg) {
      snapLineWallRef.current = { wallId: bestSeg.wallId, t: bestSeg.t }
      setSnapTargetType('midpoint'); setAlignGuides([])
      return bestSeg.pt
    }
    snapLineWallRef.current = null

    // ── 3. Alignment guides (X or Y match) ───────────────────────────────────
    const ALIGN_TH = SNAP_LINE_TH * 1.8
    const guides: Array<{type:'h'|'v', coord: number}> = []
    let ax = x, ay = y
    for (const sp of snapPts) {
      if (Math.abs(sp.x - x) < ALIGN_TH && !guides.some(g => g.type === 'v')) {
        guides.push({ type: 'v', coord: sp.x }); ax = sp.x
      }
      if (Math.abs(sp.y - y) < ALIGN_TH && !guides.some(g => g.type === 'h')) {
        guides.push({ type: 'h', coord: sp.y }); ay = sp.y
      }
    }
    if (guides.length > 0) {
      setSnapTargetType(null); setAlignGuides(guides)
      return { x: ax, y: ay }
    }

    setSnapTargetType(null); setAlignGuides([])
    return { x, y }
  }, [walls, planDoc.arcs, snapEnabled])

  const onEpDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>, wallId: string, ep: 'start' | 'end') => {
    const node = e.target
    const [rawX, rawY] = toW(node.x(), node.y(), t)
    const snapped = getSnap(rawX, rawY, [wallId])
    const [scx, scy] = toC(snapped.x, snapped.y, t)
    node.x(scx); node.y(scy)
    setSnapTarget(snapped.x !== rawX || snapped.y !== rawY ? snapped : null)
    setWalls(prev => prev.map(w => w.id !== wallId ? w : { ...w, [ep]: snapped }))
  }, [t, getSnap])

  const onEpDragEnd = useCallback(() => {
    setSnapTarget(null); setSnapTargetType(null); setAlignGuides([])
    setIsDraggingEp(false)
    const info = draggingEpInfo.current
    const lineSnap = snapLineWallRef.current
    draggingEpInfo.current = null
    snapLineWallRef.current = null
    if (!info) return
    setWalls(prev => {
      const moved = prev.find(w => w.id === info.wallId)
      if (!moved) return prev
      const pt = moved[info.ep]
      if (lineSnap) {
        const target = prev.find(w => w.id === lineSnap.wallId)
        if (target) {
          const splitPt = pt
          const segA: WallSeg = { ...target, id: `${target.id}-a`, end: splitPt }
          const segB: WallSeg = { ...target, id: `${target.id}-b`, start: splitPt }
          const existingGroups = new Set<string>([moved, target].map(w => w.groupId).filter(Boolean) as string[])
          const unified = existingGroups.size > 0 ? [...existingGroups][0] : `g-${Date.now()}`
          const toJoin = new Set([moved.id, segA.id, segB.id, ...prev.filter(w => w.groupId && existingGroups.has(w.groupId)).map(w => w.id)])
          return [...prev.filter(w => w.id !== target.id).map(w => toJoin.has(w.id) ? { ...w, groupId: unified } : w), { ...segA, groupId: unified }, { ...segB, groupId: unified }]
        }
      }
      const connected = prev.filter(w => w.id !== moved.id && (
        (Math.abs(w.start.x - pt.x) < SNAP_TH && Math.abs(w.start.y - pt.y) < SNAP_TH) ||
        (Math.abs(w.end.x   - pt.x) < SNAP_TH && Math.abs(w.end.y   - pt.y) < SNAP_TH)
      ))
      if (connected.length === 0) return prev
      const existingGroupIds = new Set<string>([moved, ...connected].map(w => w.groupId).filter(Boolean) as string[])
      const unified = existingGroupIds.size > 0 ? [...existingGroupIds][0] : `g-${Date.now()}`
      const toJoin = new Set([moved.id, ...connected.map(w => w.id), ...prev.filter(w => w.groupId && existingGroupIds.has(w.groupId)).map(w => w.id)])
      return prev.map(w => toJoin.has(w.id) ? { ...w, groupId: unified } : w)
    })
  }, [])

  const commitRotation = useCallback(() => {
    const rd = rotationDragRef.current
    const angle = rotationAngleDeltaRef.current
    rotationDragRef.current = null
    rotationAngleDeltaRef.current = 0
    setRotationDrag(null)
    setRotationAngleDelta(0)
    if (!rd || angle === 0) return
    const ids = new Set(rd.wallIds)
    const arcSet = new Set(rd.arcHandles)
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    setWalls(prev => prev.map(w => {
      if (ids.has(w.id) || (w.fromArc && arcSet.has(w.fromArc))) {
        const [sx, sy] = rotatePoint(w.start.x, w.start.y, rd.centerWX, rd.centerWY, angle)
        const [ex, ey] = rotatePoint(w.end.x, w.end.y, rd.centerWX, rd.centerWY, angle)
        return { ...w, start: { x: sx, y: sy }, end: { x: ex, y: ey } }
      }
      return w
    }))
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx => {
        if (!rd.textHandles.includes(tx.handle)) return tx
        const [nx, ny] = rotatePoint(tx.position.x, tx.position.y, rd.centerWX, rd.centerWY, angle)
        return { ...tx, position: { x: nx, y: ny, z: 0 } }
      }),
      arcs: prev.arcs.map(a => {
        if (!rd.arcHandles.includes(a.handle)) return a
        const [nx, ny] = rotatePoint(a.center.x, a.center.y, rd.centerWX, rd.centerWY, angle)
        const angleDeg = angle * (180 / Math.PI)
        return { ...a, center: { ...a.center, x: nx, y: ny }, start_angle: a.start_angle + angleDeg, end_angle: a.end_angle + angleDeg }
      }),
      door_lines: (prev.door_lines ?? []).map(l => {
        if (!rd.arcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rd.centerWX, rd.centerWY, angle)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rd.centerWX, rd.centerWY, angle)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      }),
      window_lines: (prev.window_lines ?? []).map(l => {
        if (!rd.winKey || !l.handle.startsWith(`win-${rd.winKey}-`)) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rd.centerWX, rd.centerWY, angle)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rd.centerWX, rd.centerWY, angle)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      }),
      furniture_lines: rd.furnKey ? (prev.furniture_lines ?? []).map(l => {
        if (furnitureGroupKeyFromHandle(l.handle) !== rd.furnKey) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rd.centerWX, rd.centerWY, angle)
        const [ex, ey] = rotatePoint(l.end.x, l.end.y, rd.centerWX, rd.centerWY, angle)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      }) : prev.furniture_lines,
    }))
  }, [])

  const commitResize = useCallback(() => {
    const rd = resizeDragRef.current
    const preview = resizePreviewRef.current
    resizeDragRef.current = null
    resizePreviewRef.current = null
    setResizeDrag(null)
    setResizePreview(null)
    if (!rd || !preview) return
    const ids = new Set(rd.wallIds)
    const arcSet = new Set(rd.arcHandles)
    const origW = rd.initBBox.maxWX - rd.initBBox.minWX || 1e-9
    const origH = rd.initBBox.maxWY - rd.initBBox.minWY || 1e-9
    const newW  = preview.maxWX - preview.minWX
    const newH  = preview.maxWY - preview.minWY
    const scaleF = Math.sqrt((newW / origW) * (newH / origH))
    const scalePos = (x: number, y: number) => ({
      x: preview.minWX + (x - rd.initBBox.minWX) / origW * newW,
      y: preview.minWY + (y - rd.initBBox.minWY) / origH * newH,
    })
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    const newArcs = rd.arcHandles.map(h => {
      const a = planDoc.arcs.find(a => a.handle === h)
      if (!a) return null
      const { x: nx, y: ny } = scalePos(a.center.x, a.center.y)
      return { ...a, center: { ...a.center, x: nx, y: ny }, radius: Math.max(0.01, a.radius * scaleF) }
    }).filter(Boolean) as typeof planDoc.arcs

    setWalls(prev => {
      const scaled = applyResizeToWalls(prev.filter(w => !w.fromArc || !arcSet.has(w.fromArc)), ids, rd.initBBox, preview)
      const newChords = newArcs.flatMap(a => wallSegsFromArc(a, false))
      return [...scaled, ...newChords]
    })
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx => {
        if (!rd.textHandles.includes(tx.handle)) return tx
        const { x: nx, y: ny } = scalePos(tx.position.x, tx.position.y)
        return { ...tx, position: { x: nx, y: ny, z: 0 }, height: Math.max(0.05, tx.height * scaleF) }
      }),
      arcs: prev.arcs.map(a => {
        if (!rd.arcHandles.includes(a.handle)) return a
        const { x: nx, y: ny } = scalePos(a.center.x, a.center.y)
        return { ...a, center: { ...a.center, x: nx, y: ny }, radius: Math.max(0.01, a.radius * scaleF) }
      }),
      door_lines: (prev.door_lines ?? []).map(l => {
        if (!rd.arcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))) return l
        const s = scalePos(l.start.x, l.start.y)
        const e = scalePos(l.end.x, l.end.y)
        return { ...l, start: { ...l.start, x: s.x, y: s.y }, end: { ...l.end, x: e.x, y: e.y } }
      }),
      window_lines: (prev.window_lines ?? []).map(l => {
        if (!rd.winKey || !l.handle.startsWith(`win-${rd.winKey}-`)) return l
        const s = scalePos(l.start.x, l.start.y)
        const e = scalePos(l.end.x, l.end.y)
        return { ...l, start: { ...l.start, x: s.x, y: s.y }, end: { ...l.end, x: e.x, y: e.y } }
      }),
      furniture_lines: rd.furnKey ? (prev.furniture_lines ?? []).map(l => {
        if (furnitureGroupKeyFromHandle(l.handle) !== rd.furnKey) return l
        const s = scalePos(l.start.x, l.start.y)
        const e = scalePos(l.end.x, l.end.y)
        return { ...l, start: { ...l.start, x: s.x, y: s.y }, end: { ...l.end, x: e.x, y: e.y } }
      }) : prev.furniture_lines,
    }))
  }, [planDoc.arcs, applyResizeToWalls])

  const joinSelected = useCallback(() => {
    const wallIds = walls.filter(w => selectedIds.has(w.id)).map(w => w.id)
    if (wallIds.length < 2) return
    snapshot()
    const newGroupId = `g-${Date.now()}`
    setWalls(prev => prev.map(w => wallIds.includes(w.id) ? { ...w, groupId: newGroupId } : w))
  }, [walls, selectedIds, snapshot])

  const ungroupSelected = useCallback(() => {
    const touchedGroups = new Set(walls.filter(w => selectedIds.has(w.id) && w.groupId).map(w => w.groupId!))
    if (touchedGroups.size === 0) return
    snapshot()
    setWalls(prev => prev.map(w => (w.groupId && touchedGroups.has(w.groupId)) ? { ...w, groupId: undefined } : w))
  }, [walls, selectedIds, snapshot])

  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isStage = e.target === stageRef.current || e.target.name() === 'background-rect'
    if (!isStage || activeTool !== 'select' || spaceHeld) return
    const pos = stageRef.current?.getRelativePointerPosition()
    if (!pos) return
    const [wx, wy] = toW(pos.x, pos.y, t)
    setSelectionBox({ start: { x: wx, y: wy }, current: { x: wx, y: wy } })
    if (!(e.evt.ctrlKey || e.evt.metaKey)) setSelectedIds(new Set())
  }, [activeTool, spaceHeld, t])

  const onStageMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = stageRef.current?.getRelativePointerPosition()
    if (!pos) return
    const [wx, wy] = toW(pos.x, pos.y, t)
    if (selectionBox) {
      setSelectionBox(prev => prev ? { ...prev, current: { x: wx, y: wy } } : null)
    } else if (activeDrag) {
      let dx = wx - activeDrag.initWX
      let dy = wy - activeDrag.initWY
      if (orthoEnabled) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0 }
      dragDeltaRef.current = { dx, dy }
      setDragDelta({ dx, dy })
    } else if (rotationDragRef.current) {
      const rd = rotationDragRef.current
      const [ccx, ccy] = toC(rd.centerWX, rd.centerWY, t)
      const currentAngle = Math.atan2(pos.y - ccy, pos.x - ccx)
      const delta = currentAngle - rd.startMouseAngle
      rotationAngleDeltaRef.current = delta
      setRotationAngleDelta(delta)
    } else if (resizeDragRef.current) {
      const rd = resizeDragRef.current
      const dWX = wx - rd.initMouseWX
      const dWY = wy - rd.initMouseWY
      const h = rd.handle
      const nb = { ...rd.initBBox }
      if (h.includes('e')) nb.maxWX = Math.max(rd.initBBox.minWX + 0.1, rd.initBBox.maxWX + dWX)
      if (h.includes('w')) nb.minWX = Math.min(rd.initBBox.maxWX - 0.1, rd.initBBox.minWX + dWX)
      if (h.includes('n')) nb.maxWY = Math.max(rd.initBBox.minWY + 0.1, rd.initBBox.maxWY + dWY)
      if (h.includes('s')) nb.minWY = Math.min(rd.initBBox.maxWY - 0.1, rd.initBBox.minWY + dWY)
      resizePreviewRef.current = nb
      setResizePreview(nb)
    } else if (activeTool === 'drawLine') {
      const snapped = getSnap(wx, wy, '')
      if (drawLineAnchorRef.current) setDrawLinePointer(snapped)
      setSnapTarget(snapped)
    } else if (activeTool === 'drawPolyline') {
      const snapped = getSnap(wx, wy, '')
      if (polylineDraftRef.current.length > 0) {
        setPolylineHover(snapped)
      } else {
        setPolylineHover(null)
      }
      setSnapTarget(snapped)
    } else if (activeTool === 'drawArc' || activeTool === 'drawCircle') {
      const snapped = getSnap(wx, wy, '')
      setShapePointer(snapped)
      setSnapTarget(snapped)
    } else {
      // Not in any drawing mode — clear snap indicator
      if (snapTarget !== null) setSnapTarget(null)
      if (alignGuides.length > 0) setAlignGuides([])
    }
  }, [selectionBox, activeDrag, t, orthoEnabled, activeTool, getSnap])

  const onStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (rotationDragRef.current) { commitRotation(); return }
    if (resizeDragRef.current) { commitResize(); return }
    if (!selectionBox) return
    const { start, current } = selectionBox
    setSelectionBox(null)
    const x1 = Math.min(start.x, current.x), x2 = Math.max(start.x, current.x)
    const y1 = Math.min(start.y, current.y), y2 = Math.max(start.y, current.y)
    const isWindow = start.x < current.x
    const newlySelected = new Set<string>()
    for (const w of walls) {
      if (w.fromArc) continue
      if (isWindow) {
        const sIn = w.start.x >= x1 && w.start.x <= x2 && w.start.y >= y1 && w.start.y <= y2
        const eIn = w.end.x >= x1 && w.end.x <= x2 && w.end.y >= y1 && w.end.y <= y2
        if (sIn && eIn) newlySelected.add(w.id)
      } else {
        if (lineIntersectsRect(w.start, w.end, x1, y1, x2, y2)) newlySelected.add(w.id)
      }
    }
    for (const tx of planDoc.texts) {
      if (tx.position.x >= x1 && tx.position.x <= x2 && tx.position.y >= y1 && tx.position.y <= y2) newlySelected.add(tx.handle)
    }
    for (const a of planDoc.arcs) {
      if (a.center.x >= x1 && a.center.x <= x2 && a.center.y >= y1 && a.center.y <= y2) newlySelected.add(a.handle)
    }
    setSelectedIds(prev => {
      if (e.evt.ctrlKey || e.evt.metaKey) { const next = new Set(prev); newlySelected.forEach(id => next.add(id)); return next }
      return newlySelected
    })
  }, [selectionBox, walls, commitRotation, commitResize])

  const onMidDragStart = useCallback((_e: Konva.KonvaEventObject<MouseEvent>, targetId: string, currentSel: Set<string>) => {
    const targetWall = walls.find(w => w.id === targetId)
    if (targetWall?.fromArc) return
    if (roomDragRef.current) return
    setSelectedRoomIndex(null)
    snapshot()
    const pos = stageRef.current?.getRelativePointerPosition()
    if (!pos) return
    const [wx, wy] = toW(pos.x, pos.y, t)
    const toMoveW = walls.filter(w => currentSel.has(w.id)).map(w => w.id)
    const toMoveT = planDoc.texts.filter(t => currentSel.has(t.handle)).map(t => t.handle)
    const toMoveA = planDoc.arcs.filter(a => currentSel.has(a.handle)).map(a => a.handle)
    const drag: ActiveDrag = { wallId: targetId, toMoveWallIds: toMoveW, toMoveTextIds: toMoveT, toMoveArcHandles: toMoveA, initWX: wx, initWY: wy }
    activeDragRef.current = drag
    setActiveDrag(drag)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [snapshot, walls, planDoc.texts, t])

  const onMidDragEnd = useCallback(() => {
    const pDrag = activePolyDragRef.current
    if (pDrag) {
      const { dx, dy } = polyDragDeltaRef.current
      if (Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9) {
        setWalls(prev => applyPolylineDrag(prev, pDrag, { dx, dy }))
        setPlanDoc(prev => ({ ...prev, polylines: prev.polylines.map(pl => pl.handle !== pDrag.polyHandle ? pl : { ...pl, vertices: pl.vertices.map(v => ({ ...v, x: v.x + dx, y: v.y + dy })) }) }))
      }
      activePolyDragRef.current = null; setActivePolyDrag(null)
      polyDragDeltaRef.current = { dx: 0, dy: 0 }; setPolyDragDelta({ dx: 0, dy: 0 })
      return
    }
    const drag = activeDragRef.current
    if (!drag) return
    const delta = dragDeltaRef.current
    const aSet = new Set(drag.toMoveArcHandles)
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    setWalls(prev => applyDrag(prev, drag, delta))
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx => new Set(drag.toMoveTextIds).has(tx.handle) ? { ...tx, position: { x: tx.position.x + delta.dx, y: tx.position.y + delta.dy, z: 0 } } : tx),
      arcs: prev.arcs.map(a => aSet.has(a.handle) ? { ...a, center: { ...a.center, x: a.center.x + delta.dx, y: a.center.y + delta.dy } } : a),
      door_lines: (prev.door_lines ?? []).map(l => {
        const belongsToMovedArc = drag.toMoveArcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))
        if (!belongsToMovedArc) return l
        return { ...l, start: { ...l.start, x: l.start.x + delta.dx, y: l.start.y + delta.dy }, end: { ...l.end, x: l.end.x + delta.dx, y: l.end.y + delta.dy } }
      }),
    }))
    activeDragRef.current = null; setActiveDrag(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }; setDragDelta({ dx: 0, dy: 0 })
  }, [applyDrag, applyPolylineDrag])

  const moveWindowLines = useCallback((winKey: string, dx: number, dy: number) => {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
    setPlanDoc(prev => ({ ...prev, window_lines: (prev.window_lines ?? []).map(l => !l.handle.startsWith(`win-${winKey}`) ? l : { ...l, start: { ...l.start, x: l.start.x + dx, y: l.start.y + dy }, end: { ...l.end, x: l.end.x + dx, y: l.end.y + dy } }) }))
  }, [])

  const windowGroups = useMemo(() => {
    const groups = new Map<string, DxfLine[]>()
    for (const ln of effectiveLines) {
      if (!ln.handle.startsWith('win-')) continue
      const key = ln.handle.replace(/^win-/, '').replace(/-\d+$/, '')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(ln)
    }
    return Array.from(groups.entries()).map(([key, lines]) => ({ key, lines }))
  }, [effectiveLines])

  /** Furniture lines grouped so each piece drags together (see `furnitureGroupKeyFromHandle`). */
  const furnitureGroups = useMemo(() => {
    const groups = new Map<string, DxfLine[]>()
    for (const ln of effectiveFurnitureLines) {
      const key = furnitureGroupKeyFromHandle(ln.handle)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(ln)
    }
    return Array.from(groups.entries()).map(([key, lines]) => ({ key, lines }))
  }, [effectiveFurnitureLines])

  /** Maps each furniture group key → the block_name from the nearest furniture insert. */
  const furnitureLabels = useMemo(() => {
    const map = new Map<string, string>()
    for (const { key, lines } of furnitureGroups) {
      if (lines.length === 0) continue
      let sx = 0, sy = 0, count = 0
      for (const ln of lines) {
        sx += ln.start.x + ln.end.x
        sy += ln.start.y + ln.end.y
        count += 2
      }
      const cx = sx / count
      const cy = sy / count
      let bestLabel = ''
      let bestDist = Infinity
      for (const ins of planDoc.furniture_inserts) {
        const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
        if (d < bestDist) { bestDist = d; bestLabel = ins.block_name }
      }
      if (bestLabel) map.set(key, bestLabel)
    }
    return map
  }, [furnitureGroups, planDoc.furniture_inserts])

  const moveFurnitureGroupByKey = useCallback((furnKey: string, dx: number, dy: number) => {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
    setPlanDoc(prev => {
      // Identify which insert is linked to this group so we can move it too.
      // We find it by proximity to the group centroid BEFORE the move.
      const groupLines = (prev.furniture_lines ?? []).filter(
        ln => furnitureGroupKeyFromHandle(ln.handle) === furnKey,
      )
      let linkedHandle = ''
      if (groupLines.length > 0) {
        let sx = 0, sy = 0, n = 0
        for (const ln of groupLines) {
          sx += ln.start.x + ln.end.x; sy += ln.start.y + ln.end.y; n += 2
        }
        const cx = sx / n, cy = sy / n
        let best = Infinity
        for (const ins of prev.furniture_inserts) {
          const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
          if (d < best) { best = d; linkedHandle = ins.handle }
        }
      }
      return {
        ...prev,
        furniture_lines: (prev.furniture_lines ?? []).map(ln => {
          if (furnitureGroupKeyFromHandle(ln.handle) !== furnKey) return ln
          return {
            ...ln,
            start: { ...ln.start, x: ln.start.x + dx, y: ln.start.y + dy },
            end: { ...ln.end, x: ln.end.x + dx, y: ln.end.y + dy },
          }
        }),
        furniture_inserts: prev.furniture_inserts.map(ins =>
          ins.handle === linkedHandle
            ? { ...ins, position: { ...ins.position, x: ins.position.x + dx, y: ins.position.y + dy } }
            : ins,
        ),
      }
    })
  }, [])

  const onRoomMoveDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (selectedRoomIndex === null || activeDragRef.current) return
    const snapshotRooms = detectRooms(wallsBase)
    const poly = snapshotRooms[selectedRoomIndex]
    if (!poly) return
    const idsArr = wallIdsOnRoomBoundary(poly, wallsBase)
    if (!idsArr.length) return
    snapshot()
    const drag: RoomDrag = { wallIds: new Set(idsArr), initCX: e.target.x(), initCY: e.target.y() }
    roomDragRef.current = drag; setRoomDrag(drag)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }; setRoomDragDelta({ dx: 0, dy: 0 })
    setIsDraggingRoom(true)
  }, [selectedRoomIndex, wallsBase, snapshot])

  const onRoomMoveDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const drag = roomDragRef.current
    if (!drag) return
    const dx = (e.target.x() - drag.initCX) / t.sc
    const dy = -(e.target.y() - drag.initCY) / t.sc
    roomDragDeltaRef.current = { dx, dy }; setRoomDragDelta({ dx, dy })
    e.target.position({ x: drag.initCX, y: drag.initCY })
  }, [t.sc])

  const onRoomMoveDragEnd = useCallback(() => {
    const drag = roomDragRef.current
    if (!drag) return
    const { dx, dy } = roomDragDeltaRef.current
    const idList = [...drag.wallIds]
    roomDragRef.current = null; setRoomDrag(null)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }; setRoomDragDelta({ dx: 0, dy: 0 })
    setIsDraggingRoom(false)
    if (dx === 0 && dy === 0) return
    setWalls(prev => translateWallsByIds(prev, drag.wallIds, dx, dy))
    setPlanDoc(prev => applyRoomDeltaToDoc(prev, idList, dx, dy))
  }, [])

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const pt = stage.getPointerPosition() ?? { x: 0, y: 0 }
    const mpX = (pt.x - pos.x) / zoom, mpY = (pt.y - pos.y) / zoom
    const nz = Math.min(8, Math.max(0.25, zoom * (e.evt.deltaY < 0 ? 1.12 : 0.9)))
    setZoom(nz)
    setPos({ x: pt.x - mpX * nz, y: pt.y - mpY * nz })
  }, [zoom, pos])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) { snapshot(); setWalls(p => p.filter(w => !selectedIds.has(w.id))); setSelectedIds(new Set()) }
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'Escape') {
        if (rotationDragRef.current) { rotationDragRef.current = null; rotationAngleDeltaRef.current = 0; setRotationDrag(null); setRotationAngleDelta(0) }
        else if (resizeDragRef.current) { resizeDragRef.current = null; resizePreviewRef.current = null; setResizeDrag(null); setResizePreview(null) }
        else setSelectedIds(new Set())
      }
      if (e.key === 'o' || e.key === 'O') setOrthoEnabled(v => !v)
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); joinSelected() }
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); ungroupSelected() }
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceHeld(true) }
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [selectedIds, snapshot, undo, joinSelected, ungroupSelected])

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (activeDragRef.current) onMidDragEnd()
      if (rotationDragRef.current) commitRotation()
      if (resizeDragRef.current) commitResize()
      if (isDraggingEp) onEpDragEnd()
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [onMidDragEnd, commitRotation, commitResize, onEpDragEnd, selectionBox, isDraggingEp])

  const HR  = HP_SCR / zoom
  const visWalls = useMemo(() => (showDetail ? walls : walls.filter(w => !w.isDetail)), [walls, showDetail])

  const gridLines = useMemo(() => {
    const sw = stageSize.w, sh = stageSize.h
    const lines = []
    for (let i = 0; i <= sw; i += 40) lines.push(<Line key={`gv${i}`} points={[i, 0, i, sh]} stroke="#e4e4e7" strokeWidth={0.5} listening={false} />)
    for (let j = 0; j <= sh; j += 40) lines.push(<Line key={`gh${j}`} points={[0, j, sw, j]} stroke="#e4e4e7" strokeWidth={0.5} listening={false} />)
    return lines
  }, [stageSize.w, stageSize.h])

  const formatArea = useCallback((m2: number) => {
    if (units === 'm')  return `${Math.abs(m2).toFixed(2)} m²`
    if (units === 'cm') return `${(Math.abs(m2) * 10000).toFixed(0)} cm²`
    return `${(Math.abs(m2) * 1e6).toFixed(0)} mm²`
  }, [units])

  const effectiveWalls = useMemo(() => {
    let ws = visWalls
    if (activeDrag) ws = applyDrag(ws, activeDrag, dragDelta)
    if (rotationDrag && rotationAngleDelta !== 0) ws = applyRotation(ws, new Set(rotationDrag.wallIds), rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
    if (resizeDrag && resizePreview) ws = applyResizeToWalls(ws, new Set(resizeDrag.wallIds), resizeDrag.initBBox, resizePreview)
    return ws
  }, [visWalls, activeDrag, dragDelta, applyDrag, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  const effectiveSelBBox = useMemo(() => {
    if (selectedIds.size === 0 && !selectedWinKey && !selectedFurnKey) return null
    let minCX = Infinity, minCY = Infinity, maxCX = -Infinity, maxCY = -Infinity
    let hasAny = false
    for (const w of effectiveWalls.filter(w => selectedIds.has(w.id))) {
      for (const p of [w.start, w.end]) {
        const [cx, cy] = toC(p.x, p.y, t)
        minCX = Math.min(minCX, cx); maxCX = Math.max(maxCX, cx)
        minCY = Math.min(minCY, cy); maxCY = Math.max(maxCY, cy)
        hasAny = true
      }
    }
    for (const tx of effectiveTexts.filter(tx => selectedIds.has(tx.handle))) {
      const [cx, cy] = toC(tx.position.x, tx.position.y, t)
      const tLines = tx.text.split('\n')
      const fs = Math.max(8, tx.height * t.sc * 1.8)
      const estW = Math.max(fs * 3, (tLines[0]?.length ?? 1) * fs * 0.52)
      const bH = fs * (tLines[1] ? 2.15 : 1) + 8 / zoom
      minCX = Math.min(minCX, cx - 4 / zoom); maxCX = Math.max(maxCX, cx + estW + 4 / zoom)
      minCY = Math.min(minCY, cy - fs - 4 / zoom); maxCY = Math.max(maxCY, cy + bH - fs + 4 / zoom)
      hasAny = true
    }
    for (const a of effectiveArcs.filter(a => selectedIds.has(a.handle))) {
      const [cx, cy] = toC(a.center.x, a.center.y, t)
      const r = a.radius * t.sc
      minCX = Math.min(minCX, cx - r); maxCX = Math.max(maxCX, cx + r)
      minCY = Math.min(minCY, cy - r); maxCY = Math.max(maxCY, cy + r)
      hasAny = true
    }
    // Include selected window lines
    if (selectedWinKey) {
      for (const ln of effectiveLines.filter(l => l.handle.startsWith(`win-${selectedWinKey}-`))) {
        for (const p of [ln.start, ln.end]) {
          const [cx, cy] = toC(p.x, p.y, t)
          minCX = Math.min(minCX, cx); maxCX = Math.max(maxCX, cx)
          minCY = Math.min(minCY, cy); maxCY = Math.max(maxCY, cy)
          hasAny = true
        }
      }
    }
    // Include selected furniture lines
    if (selectedFurnKey) {
      for (const ln of effectiveFurnitureLines.filter(l => furnitureGroupKeyFromHandle(l.handle) === selectedFurnKey)) {
        for (const p of [ln.start, ln.end]) {
          const [cx, cy] = toC(p.x, p.y, t)
          minCX = Math.min(minCX, cx); maxCX = Math.max(maxCX, cx)
          minCY = Math.min(minCY, cy); maxCY = Math.max(maxCY, cy)
          hasAny = true
        }
      }
    }
    if (!hasAny) return null
    return { minCX, minCY, maxCX, maxCY }
  }, [effectiveWalls, effectiveTexts, effectiveArcs, effectiveLines, effectiveFurnitureLines, selectedIds, selectedWinKey, selectedFurnKey, t, zoom])

  const worldSelBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let hasAny = false
    for (const w of walls.filter(w => selectedIds.has(w.id))) {
      for (const p of [w.start, w.end]) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); hasAny = true }
    }
    for (const tx of planDoc.texts.filter(tx => selectedIds.has(tx.handle))) { minX = Math.min(minX, tx.position.x); maxX = Math.max(maxX, tx.position.x); minY = Math.min(minY, tx.position.y); maxY = Math.max(maxY, tx.position.y); hasAny = true }
    for (const a of planDoc.arcs.filter(a => selectedIds.has(a.handle))) { minX = Math.min(minX, a.center.x - a.radius); maxX = Math.max(maxX, a.center.x + a.radius); minY = Math.min(minY, a.center.y - a.radius); maxY = Math.max(maxY, a.center.y + a.radius); hasAny = true }
    if (selectedWinKey) {
      for (const ln of (planDoc.window_lines ?? []).filter(l => l.handle.startsWith(`win-${selectedWinKey}-`))) {
        for (const p of [ln.start, ln.end]) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); hasAny = true }
      }
    }
    if (selectedFurnKey) {
      for (const ln of (planDoc.furniture_lines ?? []).filter(l => furnitureGroupKeyFromHandle(l.handle) === selectedFurnKey)) {
        for (const p of [ln.start, ln.end]) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); hasAny = true }
      }
    }
    if (!hasAny) return null
    return { minX, minY, maxX, maxY }
  }, [walls, planDoc.texts, planDoc.arcs, planDoc.window_lines, planDoc.furniture_lines, selectedIds, selectedWinKey, selectedFurnKey])

  const baseSelCenter = useMemo(() => {
    if (!worldSelBounds) return null
    return { wx: (worldSelBounds.minX + worldSelBounds.maxX) / 2, wy: (worldSelBounds.minY + worldSelBounds.maxY) / 2 }
  }, [worldSelBounds])

  const baseSelWBox = useMemo(() => {
    if (!worldSelBounds) return null
    return { minWX: worldSelBounds.minX, minWY: worldSelBounds.minY, maxWX: worldSelBounds.maxX, maxWY: worldSelBounds.maxY }
  }, [worldSelBounds])

  const fmtLen = useCallback((m: number) => {
    if (units === 'cm')  return `${(m * 100).toFixed(2)} cm`
    if (units === 'mm')  return `${(m * 1000).toFixed(0)} mm`
    return `${m.toFixed(2)} m`
  }, [units])

  /* ── EXPORTS ── */
  const exportPng = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
    const base = (planDoc.source_file ?? 'floor-plan').replace(/\.dxf$/i, '')
    triggerDownload(dataURL, `${base}.png`)
  }, [planDoc.source_file])

  const handleFurnitureDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleFurnitureDrop = useCallback(
    (e: ReactDragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const stage = stageRef.current
      if (!stage) return
      const [wx, wy] = clientXYToWorldXY(stage, e.clientX, e.clientY, t)
      const snapped = getSnap(wx, wy, [])

      // ── Room template drop ──────────────────────────────────
      const roomPayload = e.dataTransfer.getData(ROOM_TEMPLATE_MIME)
      if (roomPayload) {
        const { w, h, label } = JSON.parse(roomPayload) as { id: string; w: number; h: number; label: string }
        const hw = w / 2, hh = h / 2
        snapshot()
        const { next: nextDoc, poly } = appendUserPolyline(
          planDoc,
          [
            { x: snapped.x - hw, y: snapped.y + hh },
            { x: snapped.x + hw, y: snapped.y + hh },
            { x: snapped.x + hw, y: snapped.y - hh },
            { x: snapped.x - hw, y: snapped.y - hh },
          ],
          true,
        )
        // Add a label text at the centre — handle is linked to the polyline for co-selection/deletion
        const lblHandle = roomLabelHandle(poly.handle)
        const { next: finalDoc } = appendUserText(nextDoc, { x: snapped.x, y: snapped.y }, label, 0.2, lblHandle)
        setPlanDoc(finalDoc)
        const newSegs = wallSegsFromPolyline(poly, false, `pl-${poly.handle}`)
        setWalls(prev => [...prev, ...newSegs])
        const allIds = new Set([...newSegs.map(s => s.id), lblHandle])
        setSelectedIds(allIds); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null)
        setSelectedArcHandle(null); setSelectedWinKey(null); setSelectedFurnKey(null)
        return
      }

      // ── Furniture item drop ─────────────────────────────────
      const id = e.dataTransfer.getData(FURNITURE_DXF_DRAG_MIME)
      if (!id || !getFurnitureDxfTemplate(id)) return
      snapshot()
      const tmpl = getFurnitureDxfTemplate(id)!
      const newLines = buildFurnitureLinesFromLibraryId(id, snapped.x, snapped.y)
      if (!newLines.length) return
      const groupSuffix = newLines[0]!.handle.slice('furn-'.length).split('-')[0]
      const syntheticInsert: DxfInsert = {
        entity_type: 'INSERT',
        handle: `furn-ins-${groupSuffix}`,
        layer: '0',
        block_name: tmpl.label,
        category: tmpl.category,
        is_anonymous_block: false,
        position: { x: snapped.x, y: snapped.y, z: 0 },
        rotation: 0,
        scale: { x: 1, y: 1, z: 1 },
        block_entity_types: ['LINE'],
        block_entity_count: newLines.length,
        attributes: [],
      }
      setPlanDoc(prev => ({
        ...prev,
        furniture_lines: [...(prev.furniture_lines ?? []), ...newLines],
        furniture_inserts: [...prev.furniture_inserts, syntheticInsert],
      }))
      setSelectedFurnKey(furnitureGroupKeyFromHandle(newLines[0]!.handle))
      setSelectedWinKey(null)
      setSelectedId(null)
      setSelectedRoomIndex(null)
      setSelectedTextHandle(null)
      setSelectedArcHandle(null)
      setSelectedIds(new Set())
    },
    [t, getSnap, snapshot, planDoc],
  )

  /**
   * Export DXF — uses the full live state:
   *   walls       → all LINE / LWPOLYLINE wall segments (including user-drawn)
   *   planDoc.arcs  → all ARC / CIRCLE entities (door swings + user-drawn)
   *   planDoc.lines → door jamb lines (dfl-*) + window sill lines (win-*)
   *   planDoc.texts → all MTEXT labels
   *
   * All edits (drags, rotations, resizes, additions, deletions) are reflected
   * because `walls` and `planDoc` are always kept in sync by the commit handlers.
   */
  const exportDxf = useCallback(() => {
    const base = (planDoc.source_file ?? 'floor-plan').replace(/\.dxf$/i, '')
    const allLines = [...(planDoc.door_lines ?? []), ...(planDoc.window_lines ?? []), ...(planDoc.furniture_lines ?? [])]
    downloadDxf(walls, planDoc.texts, planDoc.arcs, allLines, `${base}-exported.dxf`)
  }, [walls, planDoc])

  const stageDraggable = (activeTool === 'hand' || spaceHeld) && !isDraggingEp && !isDraggingRoom
  const isDrawingTool = ['drawPolyline', 'drawLine', 'drawArc', 'drawCircle', 'text'].includes(activeTool)

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isDrawingTool && e.target !== stageRef.current) return
    const stage = stageRef.current
    if (!stage) return
    const p = getStageCanvasPointer(stage)
    if (!p) return
    const [wx, wy] = toW(p.x, p.y, t)

    if (activeTool === 'drawLine') {
      const snapped = getSnap(wx, wy, [])
      if (!drawLineAnchorRef.current) {
        drawLineAnchorRef.current = snapped; setDrawLineAnchor(snapped); setDrawLinePointer(snapped); return
      }
      const start = drawLineAnchorRef.current, end = snapped
      if (Math.hypot(end.x - start.x, end.y - start.y) < 0.02) return
      snapshot()
      const { next, handle } = appendUserLine(planDoc, start, end)
      const newId = `ln-${handle}`
      setPlanDoc(next)
      setWalls(w => [...w, { id: newId, start: { ...start }, end: { ...end }, isOuter: false, isDetail: false }])
      setSelectedIds(new Set([newId])); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null)
      // Keep drawing mode — new anchor is last end point so user can chain segments.
      // Press Esc or switch tool to stop.
      drawLineAnchorRef.current = end; setDrawLineAnchor(end); setDrawLinePointer(end)
      return
    }

    if (activeTool === 'drawPolyline') {
      const snapped = getSnap(wx, wy, [])
      const nextDraft = [...polylineDraftRef.current, snapped]
      polylineDraftRef.current = nextDraft; setPolylineDraft(nextDraft); return
    }

    if (activeTool === 'text') {
      snapshot()
      const { next, handle } = appendUserText(planDoc, { x: wx, y: wy })
      setPlanDoc(next); setShowLabels(true)
      setSelectedIds(new Set([handle])); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(handle); return
    }

    if (activeTool === 'drawArc') {
      if (!arcDraftCenter) { setArcDraftCenter({ x: wx, y: wy }); setArcDraftRadius(null); setArcDraftStartAngle(null); return }
      const dx = wx - arcDraftCenter.x, dy = wy - arcDraftCenter.y
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      const radius = Math.hypot(dx, dy)
      if (arcDraftRadius === null) {
        if (radius < 0.01) return; setArcDraftRadius(radius); setArcDraftStartAngle(angle); return
      }
      let endAngle = angle
      if (endAngle <= arcDraftStartAngle!) endAngle += 360
      snapshot()
      const { next, arc } = appendUserArc(planDoc, arcDraftCenter, arcDraftRadius, arcDraftStartAngle!, endAngle)
      setPlanDoc(next); setWalls(w => [...w, ...wallSegsFromArc(arc, false)])
      setArcDraftCenter(null); setArcDraftRadius(null); setArcDraftStartAngle(null); setShapePointer(null)
      setSelectedArcHandle(arc.handle); setSelectedIds(new Set([arc.handle])); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null)
      setActiveTool('select'); return
    }

    if (activeTool === 'drawCircle') {
      if (!circleDraftCenter) { setCircleDraftCenter({ x: wx, y: wy }); return }
      const radius = Math.hypot(wx - circleDraftCenter.x, wy - circleDraftCenter.y)
      if (radius < 0.01) return
      snapshot()
      const { next, arc } = appendUserArc(planDoc, circleDraftCenter, radius, 0, 360)
      setPlanDoc(next); setWalls(w => [...w, ...wallSegsFromArc(arc, false)])
      setCircleDraftCenter(null); setShapePointer(null)
      setSelectedArcHandle(arc.handle); setSelectedIds(new Set([arc.handle])); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null)
      setActiveTool('select'); return
    }

    setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null); setSelectedArcHandle(null); setSelectedWinKey(null); setSelectedFurnKey(null)
  }, [activeTool, t, getSnap, planDoc, snapshot, setActiveTool, arcDraftCenter, arcDraftRadius, arcDraftStartAngle, circleDraftCenter])

  const finishPolyline = useCallback(() => {
    const pts = polylineDraftRef.current
    if (pts.length < 2) return
    const closed = polylineClosed && pts.length >= 3
    snapshot()
    const { next, poly } = appendUserPolyline(planDoc, pts, closed)
    const newSegs = wallSegsFromPolyline(poly, false)
    setPlanDoc(next); setWalls(w => [...w, ...newSegs])
    polylineDraftRef.current = []; setPolylineDraft([]); setPolylineHover(null)
    if (newSegs.length > 0) { setSelectedIds(new Set(newSegs.map(s => s.id))); setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null); setActiveTool('select') }
  }, [planDoc, snapshot, polylineClosed, setActiveTool])

  useEffect(() => { finishPolylineRef.current = finishPolyline }, [finishPolyline])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextHandle) { snapshot(); setPlanDoc(p => removeTextFromDoc(p, selectedTextHandle)); setSelectedTextHandle(null) }
        else if (selectedArcHandle) {
          const arc = planDoc.arcs.find(a => a.handle === selectedArcHandle)
          if (arc && !isDoorStyleArc(planDoc, arc)) { snapshot(); const h = selectedArcHandle; setPlanDoc(p => removeArcFromDocByHandle(p, h)); setWalls(w => w.filter(seg => seg.fromArc !== h)); setSelectedArcHandle(null) }
        } else if (selectedId) {
          if (arc && !isDoorStyleArc(planDoc, arc)) {
            snapshot()
            const h = selectedArcHandle
            setPlanDoc(p => removeArcFromDocByHandle(p, h))
            setWalls(w => w.filter(seg => seg.fromArc !== h))
            setSelectedArcHandle(null)
          }
        }
        else if (selectedFurnKey) {
          snapshot()
          const fk = selectedFurnKey
          setPlanDoc(p => {
            // Find the linked insert (by proximity) and remove it only if synthetic.
            const groupLines = (p.furniture_lines ?? []).filter(
              ln => furnitureGroupKeyFromHandle(ln.handle) === fk,
            )
            let syntheticHandle = ''
            if (groupLines.length > 0) {
              let sx = 0, sy = 0, n = 0
              for (const ln of groupLines) {
                sx += ln.start.x + ln.end.x; sy += ln.start.y + ln.end.y; n += 2
              }
              const cx = sx / n, cy = sy / n
              let best = Infinity, bestH = ''
              for (const ins of p.furniture_inserts) {
                const d = Math.hypot(ins.position.x - cx, ins.position.y - cy)
                if (d < best) { best = d; bestH = ins.handle }
              }
              if (bestH.startsWith('furn-ins-')) syntheticHandle = bestH
            }
            return {
              ...p,
              furniture_lines: (p.furniture_lines ?? []).filter(
                ln => furnitureGroupKeyFromHandle(ln.handle) !== fk,
              ),
              furniture_inserts: syntheticHandle
                ? p.furniture_inserts.filter(ins => ins.handle !== syntheticHandle)
                : p.furniture_inserts,
            }
          })
          setSelectedFurnKey(null)
        }
        else if (selectedId) {
          snapshot()
          const ph = polylineHandleFromWallId(selectedId)
          if (ph) {
            const lbl = roomLabelHandle(ph)
            setPlanDoc(p => { let d = removePolylineFromDocByHandle(p, ph); d = { ...d, texts: d.texts.filter(tx => tx.handle !== lbl) }; return d })
            setWalls(p => p.filter(w => !w.id.startsWith(`pl-${ph}-`)))
          }
          else {
            const ah = arcHandleFromArcSegWallId(selectedId)
            if (ah) {
              const a = planDoc.arcs.find(x => x.handle === ah)
              if (a && !isDoorStyleArc(planDoc, a)) { setPlanDoc(p => removeArcFromDocByHandle(p, ah)); setWalls(w => w.filter(seg => seg.fromArc !== ah)) }
            } else { setPlanDoc(p => removeLineFromDocByWallId(p, selectedId)); setWalls(p => p.filter(w => w.id !== selectedId)) }
          }
          setSelectedId(null)
        }
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.key === 'Enter' && activeTool === 'drawPolyline' && polylineDraftRef.current.length >= 2) { e.preventDefault(); finishPolylineRef.current() }
      if (e.key === 'Escape') {
        setSelectedId(null); setSelectedRoomIndex(null); setSelectedTextHandle(null); setSelectedArcHandle(null); setSelectedWinKey(null)
        drawLineAnchorRef.current = null; setDrawLineAnchor(null); setDrawLinePointer(null)
        polylineDraftRef.current = []; setPolylineDraft([]); setPolylineHover(null)
        setArcDraftCenter(null); setArcDraftRadius(null); setArcDraftStartAngle(null); setCircleDraftCenter(null); setShapePointer(null)
        activeDragRef.current = null; setActiveDrag(null); dragDeltaRef.current = { dx: 0, dy: 0 }; setDragDelta({ dx: 0, dy: 0 })
        activePolyDragRef.current = null; setActivePolyDrag(null); polyDragDeltaRef.current = { dx: 0, dy: 0 }; setPolyDragDelta({ dx: 0, dy: 0 })
        setSelectedId(null)
        setSelectedRoomIndex(null)
        setSelectedTextHandle(null)
        setSelectedArcHandle(null)
        setSelectedWinKey(null)
        setSelectedFurnKey(null)
        drawLineAnchorRef.current = null
        setDrawLineAnchor(null)
        setDrawLinePointer(null)
        polylineDraftRef.current = []
        setPolylineDraft([])
        setPolylineHover(null)
        setArcDraftCenter(null)
        setArcDraftRadius(null)
        setArcDraftStartAngle(null)
        setCircleDraftCenter(null)
        setShapePointer(null)
        activeDragRef.current = null
        setActiveDrag(null)
        dragDeltaRef.current = { dx: 0, dy: 0 }
        setDragDelta({ dx: 0, dy: 0 })
        activePolyDragRef.current = null
        setActivePolyDrag(null)
        polyDragDeltaRef.current = { dx: 0, dy: 0 }
        setPolyDragDelta({ dx: 0, dy: 0 })
      }
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceHeld(true) }
    }
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setSpaceHeld(false) }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedId, selectedArcHandle, selectedTextHandle, selectedFurnKey, planDoc, snapshot, undo, activeTool])

  const doc = planDoc
  const selectedTextEntity = selectedTextHandle ? doc.texts.find(tx => tx.handle === selectedTextHandle) : undefined

  const activateTool = (id: 'select' | 'hand' | 'frame' | 'drawLine' | 'drawPolyline' | 'text' | 'drawArc' | 'drawCircle') => {
    if (id !== 'drawLine') { drawLineAnchorRef.current = null; setDrawLineAnchor(null); setDrawLinePointer(null) }
    if (id !== 'drawPolyline') { polylineDraftRef.current = []; setPolylineDraft([]); setPolylineHover(null) }
    if (id !== 'drawArc') { setArcDraftCenter(null); setArcDraftRadius(null); setArcDraftStartAngle(null) }
    if (id !== 'drawCircle') setCircleDraftCenter(null)
    if (id !== 'drawArc' && id !== 'drawCircle') setShapePointer(null)
    setSnapTarget(null); setSnapTargetType(null); setAlignGuides([])
    setActiveTool(id)
  }

  return (
    <div className="dxf-editor">
      <header className="dxf-editor-topbar">
        <div className="dxf-editor-brand">
          <span className="dxf-editor-logo" aria-hidden>◇</span>
          <div>
            <h1 className="dxf-editor-title">Floor plan</h1>
            <p className="dxf-editor-file">{doc.source_file} · editable</p>
          </div>
        </div>
        <div className="dxf-editor-topbar-actions">
          <button type="button" className="dxf-export-btn" onClick={exportDxf} title="Export current canvas to DXF">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export DXF
          </button>
          <Link to="/" className="dxf-editor-home">Home</Link>
        </div>
      </header>

      <div className="dxf-editor-body">
        {/* ── Left: Pages + Layers ── */}
        <aside className="dxf-left-rail">
          <div className="dxf-rail-section">
            <div className="dxf-rail-label">Pages</div>
            <button type="button" className="dxf-page-item active">Page 1</button>
            <button type="button" className="dxf-page-item" disabled>Untitled</button>
          </div>
          <div className="dxf-rail-section">
            <div className="dxf-rail-label">Layers</div>
            <button type="button" className="dxf-layer-item active">
              <span className="dxf-layer-icon" /> Frame 1 — floor plan
            </button>
            <div className="dxf-layer-item static">
              <span className="dxf-layer-icon dxf-layer-dim" /> Walls ({walls.filter(w => !w.isDetail).length})
            </div>
            <button type="button" className={`dxf-layer-item${showLabels ? ' active' : ''}`} onClick={() => setShowLabels(v => !v)}>
              <span className="dxf-layer-icon dxf-layer-text" /> Room labels
            </button>
            <button type="button" className={`dxf-layer-item${showFurnitureLabels ? ' active' : ''}`} onClick={() => setShowFurnitureLabels(v => !v)}>
              <span className="dxf-layer-icon dxf-layer-text" /> Furniture labels
            </button>
          </div>
          <div className="dxf-rail-section compact">
            <div className="dxf-rail-label">Rooms</div>
            {rooms.length === 0
              ? <p className="dxf-note">Close loops to detect rooms.</p>
              : rooms.map((r, i) => (
                <button key={i} type="button"
                  className={`dxf-room-pill small${selectedRoomIndex === i ? ' active' : ''}`}
                  style={{ borderLeftColor: ROOM_STROKES[i % ROOM_STROKES.length] }}
                  onClick={() => { setActiveTool('select'); setSelectedId(null); setSelectedTextHandle(null); setSelectedRoomIndex(selectedRoomIndex === i ? null : i) }}
                >
                  R{i + 1} · <strong>{formatArea(polyArea(r))}</strong>
                </button>
              ))}
          </div>
          <div className="dxf-rail-section compact">
            <div className="dxf-rail-label">Room Library</div>
            <p className="dxf-note" style={{ marginBottom: 6 }}>Drag a room onto the canvas to place it.</p>
            <div className="dxf-room-library-grid">
              {ROOM_TEMPLATES.map(rm => (
                <div
                  key={rm.id}
                  className="dxf-room-library-item"
                  draggable
                  style={{ '--room-color': rm.color } as React.CSSProperties}
                  onDragStart={e => {
                    e.dataTransfer.setData(ROOM_TEMPLATE_MIME, JSON.stringify({ id: rm.id, w: rm.w, h: rm.h, label: rm.label }))
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  title={`${rm.label} (${rm.w}m × ${rm.h}m)`}
                >
                  <div className="dxf-room-library-swatch" style={{ background: rm.color }} />
                  <span className="dxf-room-library-name">{rm.label}</span>
                  <span className="dxf-room-library-size">{rm.w}×{rm.h}m</span>
                </div>
              ))}
            </div>
          </div>
          <div className="dxf-rail-section compact" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FurnitureLibraryPanel />
          </div>
        </aside>

        {/* ── Center: toolbar + canvas ── */}
        <main className="dxf-editor-main">
          <div className="dxf-main-tools" role="toolbar" aria-label="Editor tools">
            <div className="dxf-tool-cluster">
              {([
                { id: 'select' as const, label: 'Select' },
                { id: 'hand'   as const, label: 'Pan' },
                { id: 'frame'  as const, label: 'Frame' },
                { id: 'text'   as const, label: 'Text' },
              ]).map(({ id, label }) => (
                <button key={id} type="button" title={label} className={`dxf-tool-icon${activeTool === id ? ' active' : ''}`} onClick={() => activateTool(id)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {id === 'select' && <path d="M4 4l7 7-4 1-3-4z" />}
                    {id === 'hand' && (<><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" /><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" /><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" /><path d="M18 11a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 19" /></>)}
                    {id === 'frame' && <rect x="5" y="5" width="14" height="14" rx="1" />}
                    {id === 'text' && <><path d="M4 6h16M10 6v14M14 6v14" /></>}
                  </svg>
                </button>
              ))}
            </div>
            <div className="dxf-tool-sep" aria-hidden />
            <div className="dxf-tool-cluster dxf-draw-tool-cluster">
              {([
                { id: 'drawLine'     as const, label: 'Line' },
                { id: 'drawPolyline' as const, label: 'Polyline' },
                { id: 'drawCircle'   as const, label: 'Circle' },
                { id: 'drawArc'      as const, label: 'Arc' },
              ]).map(({ id, label }) => (
                <button key={id} type="button" title={label} className={`dxf-tool-icon dxf-tool-labeled${activeTool === id ? ' active' : ''}`} onClick={() => activateTool(id)}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    {id === 'drawLine' && (<><path d="M5 19L19 5" /><circle cx="5" cy="19" r="1.35" fill="currentColor" stroke="none" /><circle cx="19" cy="5" r="1.35" fill="currentColor" stroke="none" /></>)}
                    {id === 'drawPolyline' && (<><path d="M4 18L9 8L15 8Q20 8 20 13" /><circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" /><circle cx="9" cy="8" r="1.2" fill="currentColor" stroke="none" /><circle cx="20" cy="13" r="1.2" fill="currentColor" stroke="none" /></>)}
                    {id === 'drawCircle' && (<><circle cx="12" cy="12" r="8" /><path d="M12 12l4-4" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /></>)}
                    {id === 'drawArc' && <path d="M4 18A11 11 0 0 1 20 7" />}
                  </svg>
                  <span className="dxf-tool-caption">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {(['drawLine', 'drawPolyline', 'drawArc', 'drawCircle', 'text'] as string[]).includes(activeTool) && (
            <p className="dxf-note" style={{ margin: '0 0 8px 0' }}>
              {activeTool === 'drawLine' && (drawLineAnchor ? 'Line: click to add next point. Double-click or Esc to finish.' : 'Line: click start point. Each subsequent click adds a connected segment.')}
              {activeTool === 'drawPolyline' && (polylineDraft.length === 0 ? 'Polyline: each click adds a vertex. Turn on Close path if you want a loop, then Enter or Finish.' : `Polyline: ${polylineDraft.length} vertex(ices). Enter or Finish to add to the plan; Esc cancels.`)}
              {activeTool === 'drawArc' && (!arcDraftCenter ? 'Arc: click to place the center point.' : arcDraftRadius === null ? 'Arc: click to set the start angle and radius.' : 'Arc: click to set the end angle and place the arc (Esc cancels).')}
              {activeTool === 'drawCircle' && (!circleDraftCenter ? 'Circle: click to place the center point.' : 'Circle: click anywhere to set the radius and place the circle (Esc cancels).')}
              {activeTool === 'text' && 'Text: click empty space to place. Select a label to move it, drag the blue handle to resize, or edit below.'}
            </p>
          )}

          <p className="dxf-note" style={{ margin: '0 0 6px 0' }}>
            Furniture: drag an item from the library onto the plan (snaps if Snap is on). Symbols are LINE entities for DXF export.
          </p>
          <div className="dxf-canvas-frame">
            <div ref={canvasHostRef} className="dxf-canvas-host"
              onDragOver={handleFurnitureDragOver}
              onDrop={handleFurnitureDrop}
            >
              <Stage
                ref={stageRef}
                width={stageSize.w}
                height={stageSize.h}
                scaleX={zoom}
                scaleY={zoom}
                x={pos.x}
                y={pos.y}
                draggable={stageDraggable}
                onDragEnd={e => { if (e.target === stageRef.current) setPos({ x: e.target.x(), y: e.target.y() }) }}
                onWheel={handleWheel}
                onMouseDown={onStageMouseDown}
                onMouseMove={onStageMouseMove}
                onMouseUp={onStageMouseUp}
                onClick={e => {
                  if (isDrawingTool) { handleStageClick(e) }
                  else if (e.target === stageRef.current) { setSelectedIds(new Set()); handleStageClick(e) }
                }}
                onDblClick={() => {
                  if (activeTool === 'drawLine' && drawLineAnchorRef.current) {
                    // Double-click finishes the line chain
                    drawLineAnchorRef.current = null; setDrawLineAnchor(null); setDrawLinePointer(null)
                    setSnapTarget(null); setSnapTargetType(null); setAlignGuides([])
                    setActiveTool('select')
                  }
                  if (activeTool === 'drawPolyline' && polylineDraftRef.current.length >= 2) {
                    polylineDraftRef.current = polylineDraftRef.current.slice(0, -1)
                    setPolylineDraft([...polylineDraftRef.current])
                    finishPolylineRef.current()
                  }
                }}
                style={{
                  display: 'block',
                  cursor: resizeDrag ? `${resizeDrag.handle}-resize`
                    : (isDraggingEp || rotationDrag) ? 'crosshair'
                    : (activeTool === 'hand' || spaceHeld) ? 'grab'
                    : selectionBox ? 'default'
                    : activeTool === 'draw' || activeTool === 'text' ? 'crosshair'
                    : 'default',
                }}
              >
                {/* ── white artboard + grid ── */}
                <Layer listening={false}>
                  <Rect name="background-rect" x={0} y={0} width={stageSize.w} height={stageSize.h} fill="#ffffff" />
                  {gridLines}
                </Layer>

                {/* ── room fills ── */}
                <Layer>
                  {roomsWithWalls.map((r, i) => {
                    const isHovered = hoveredRoomIdx === i
                    return (
                      <Group key={`room-${i}`}>
                        <Line
                          points={r.polygon.flatMap(p => toC(p.x, p.y, t))}
                          closed
                          fill={ROOM_COLORS[i % ROOM_COLORS.length]}
                          stroke={ROOM_STROKES[i % ROOM_STROKES.length]}
                          strokeWidth={isHovered ? 2.5 / zoom : 1 / zoom}
                          listening={true}
                          onClick={e => {
                            e.cancelBubble = true
                            const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                            setSelectedIds(prev => { if (isCtrl) { const next = new Set(prev); r.wallIds.forEach(id => next.add(id)); return next } return new Set(r.wallIds) })
                          }}
                          onMouseDown={e => {
                            if (rotationDragRef.current) return
                            e.cancelBubble = true
                            const currentSel = new Set(r.wallIds)
                            setSelectedIds(currentSel)
                            onMidDragStart(e as any, r.wallIds[0] ?? '', currentSel)
                          }}
                          onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move'; setHoveredRoomIdx(i) }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default'; setHoveredRoomIdx(null) }}
                        />
                      </Group>
                    )
                  })}
                </Layer>

                {/* ── doors + windows ── */}
                <Layer listening={activeTool === 'select' && !spaceHeld}>
                  {/* Windows */}
                  {windowGroups.map(({ key, lines }) => {
                    const isSelWin = selectedWinKey === key
                    const winColor = isSelWin ? '#f59e0b' : strokeHex
                    const sw = (1.5 * strokeScale) / zoom
                    return (
                      <Group key={`wingrp-${key}`} draggable
                        onDragStart={e => { e.cancelBubble = true; snapshot(); setSelectedWinKey(key); setSelectedArcHandle(null); setSelectedId(null); setSelectedTextHandle(null); setSelectedRoomIndex(null) }}
                        onDragEnd={e => { const dcx = e.target.x(), dcy = e.target.y(); e.target.position({ x: 0, y: 0 }); moveWindowLines(key, dcx / t.sc, -dcy / t.sc) }}
                        onClick={e => { e.cancelBubble = true; setSelectedId(null); setSelectedArcHandle(null); setSelectedTextHandle(null); setSelectedRoomIndex(null); setSelectedWinKey(isSelWin ? null : key) }}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      >
                        {lines.map(ln => {
                          const [x1, y1] = toC(ln.start.x, ln.start.y, t)
                          const [x2, y2] = toC(ln.end.x, ln.end.y, t)
                          return <Line key={ln.handle} points={[x1, y1, x2, y2]} stroke={winColor} strokeWidth={sw} lineCap="round" hitStrokeWidth={10 / zoom} />
                        })}
                      </Group>
                    )
                  })}

                  {/* Furniture groups */}
                  {furnitureGroups.map(({ key, lines }) => {
                    const isSel = selectedFurnKey === key
                    const label = furnitureLabels.get(key)
                    const category = label ? FURNITURE_LABEL_TO_CATEGORY.get(label) : undefined
                    const categoryColor = category ? FURNITURE_CATEGORY_COLORS[category] : undefined
                    const baseColor = categoryColor ?? strokeHex
                    const furnColor = isSel ? '#f59e0b' : baseColor
                    const sw = (1.5 * strokeScale) / zoom
                    let cx = 0, cy = 0
                    if (lines.length > 0) {
                      let sx = 0, sy = 0, n = 0
                      for (const ln of lines) { sx += ln.start.x + ln.end.x; sy += ln.start.y + ln.end.y; n += 2 }
                      ;[cx, cy] = toC(sx / n, sy / n, t)
                    }
                    return (
                      <Group key={`furngrp-${key}`} draggable
                        onDragStart={e => { e.cancelBubble = true; snapshot(); setSelectedFurnKey(key); setSelectedIds(new Set()); setSelectedWinKey(null); setSelectedArcHandle(null); setSelectedId(null); setSelectedTextHandle(null); setSelectedRoomIndex(null) }}
                        onDragEnd={e => { const dcx = e.target.x(), dcy = e.target.y(); e.target.position({ x: 0, y: 0 }); moveFurnitureGroupByKey(key, dcx / t.sc, -dcy / t.sc) }}
                        onClick={e => { e.cancelBubble = true; setSelectedFurnKey(isSel ? null : key); setSelectedIds(new Set()); setSelectedWinKey(null); setSelectedArcHandle(null); setSelectedId(null); setSelectedTextHandle(null); setSelectedRoomIndex(null) }}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      >
                        {lines.map(ln => {
                          const [x1, y1] = toC(ln.start.x, ln.start.y, t)
                          const [x2, y2] = toC(ln.end.x, ln.end.y, t)
                          return <Line key={ln.handle} points={[x1, y1, x2, y2]} stroke={furnColor} strokeWidth={sw} lineCap="round" hitStrokeWidth={10 / zoom} />
                        })}
                        {showFurnitureLabels && label && (
                          <Text x={cx} y={cy} text={label} fontSize={11 / zoom} fill={isSel ? '#f59e0b' : (categoryColor ?? '#64748b')} listening={false} />
                        )}
                      </Group>
                    )
                  })}

                  {/* Door arcs */}
                  {effectiveArcs.map((arc) => {
                    const isFullCircle = arc.end_angle - arc.start_angle >= 360
                    const isSelArc  = selectedIds.has(arc.handle)
                    const arcKey    = arc.handle.replace(/^arc-/, '')
                    const frameLines = effectiveLines.filter(ln => ln.handle.startsWith(`dfl-${arcKey}`))
                    const arcColor  = isSelArc ? '#f59e0b' : strokeHex
                    const sw = (1.5 * strokeScale) / zoom
                    const [arcCx, arcCy] = toC(arc.center.x, arc.center.y, t)
                    const rCanvas = arc.radius * t.sc

                    return (
                      <Group key={arc.handle}
                        onClick={e => {
                          if (isDrawingTool) return
                          e.cancelBubble = true
                          if (activeTool === 'hand' || spaceHeld) return
                          setSelectedRoomIndex(null); setSelectedTextHandle(null); setSelectedId(null)
                          const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                          setSelectedIds(prev => { const next = new Set(isCtrl ? prev : []); if (isSelArc && isCtrl) next.delete(arc.handle); else next.add(arc.handle); return next })
                        }}
                        onMouseDown={e => {
                          if (isDrawingTool) return
                          e.cancelBubble = true
                          if (activeTool !== 'select' || spaceHeld) return
                          const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                          const currentSel = new Set(isCtrl ? selectedIds : (isSelArc ? selectedIds : new Set<string>()))
                          currentSel.add(arc.handle)
                          if (!isCtrl && !isSelArc) setSelectedIds(currentSel)
                          onMidDragStart(e as any, arc.handle, currentSel)
                        }}
                        onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      >
                        {isFullCircle ? (
                          <Circle x={arcCx} y={arcCy} radius={rCanvas} stroke={arcColor} strokeWidth={sw} fill="transparent" hitStrokeWidth={10 / zoom} />
                        ) : (
                          <>
                            {/* Arc sweep */}
                            <Line points={arcPoints(arc, t)} stroke={arcColor} strokeWidth={sw} lineCap="round" lineJoin="round" hitStrokeWidth={10 / zoom} />
                            {/* Door panel line: from hinge to closed position.
                                Closed position = whichever arc endpoint (start or end angle)
                                is closest to a jamb (dfl-*) line endpoint. */}
                            {(() => {
                              const isDoor = frameLines.length > 0
                              if (!isDoor) return null
                              const sRad = arc.start_angle * (Math.PI / 180)
                              const eRad = arc.end_angle * (Math.PI / 180)
                              const sWX = arc.center.x + arc.radius * Math.cos(sRad)
                              const sWY = arc.center.y + arc.radius * Math.sin(sRad)
                              const eWX = arc.center.x + arc.radius * Math.cos(eRad)
                              const eWY = arc.center.y + arc.radius * Math.sin(eRad)
                              let dStart = Infinity, dEnd = Infinity
                              for (const ln of frameLines) {
                                for (const pt of [ln.start, ln.end]) {
                                  dStart = Math.min(dStart, Math.hypot(sWX - pt.x, sWY - pt.y))
                                  dEnd   = Math.min(dEnd,   Math.hypot(eWX - pt.x, eWY - pt.y))
                                }
                              }
                              const panelRad = dEnd < dStart ? eRad : sRad
                              const [px, py] = toC(
                                arc.center.x + arc.radius * Math.cos(panelRad),
                                arc.center.y + arc.radius * Math.sin(panelRad),
                                t
                              )
                              return <Line points={[arcCx, arcCy, px, py]} stroke={arcColor} strokeWidth={sw} lineCap="round" listening={false} />
                            })()}
                          </>
                        )}
                        {/* Jamb stubs (wall thickness at door opening) */}
                        {frameLines.map(ln => {
                          const [x1, y1] = toC(ln.start.x, ln.start.y, t)
                          const [x2, y2] = toC(ln.end.x, ln.end.y, t)
                          return <Line key={ln.handle} points={[x1, y1, x2, y2]} stroke={arcColor} strokeWidth={sw} lineCap="round" listening={false} />
                        })}
                      </Group>
                    )
                  })}
                </Layer>

                {/* ── walls ── */}
                <Layer>
                  {effectiveWalls.map(wall => {
                    if (wall.fromArc) return null
                    const [sx, sy] = toC(wall.start.x, wall.start.y, t)
                    const [ex, ey] = toC(wall.end.x, wall.end.y, t)
                    const isSel = selectedIds.has(wall.id)
                    const isDragging = activeDrag?.wallId === wall.id
                    const wallColor = wall.isDetail ? '#60a5fa' : strokeHex
                    const strokeW = ((wall.isOuter ? 2.8 : wall.isDetail ? 0.65 : 1.15) * strokeScale) / zoom

                    return (
                      <Group key={wall.id}>
                        <Line points={[sx, sy, ex, ey]} stroke="transparent" strokeWidth={16 / zoom}
                          onMouseDown={e => {
                            if (isDrawingTool) return
                            e.cancelBubble = true
                            selBeforeMouseDown.current = new Set(selectedIds)
                            const groupIds = getGroupWallIds(wall.id, walls)
                            // If this polyline has a linked room label, include it
                            if (wall.groupId?.startsWith('pl-')) {
                              const lbl = roomLabelHandle(wall.groupId.slice(3))
                              if (planDoc.texts.some(tx => tx.handle === lbl)) groupIds.push(lbl)
                            }
                            const groupFullySelected = groupIds.every(id => selectedIds.has(id))
                            let currentSel = selectedIds
                            if (!groupFullySelected) {
                              const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                              currentSel = new Set(isCtrl ? selectedIds : [])
                              groupIds.forEach(id => currentSel.add(id))
                              setSelectedIds(currentSel)
                            }
                            onMidDragStart(e as any, wall.id, currentSel)
                          }}
                          onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                          onClick={e => {
                            if (isDrawingTool) return
                            e.cancelBubble = true
                            const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                            const groupIds = getGroupWallIds(wall.id, walls)
                            if (wall.groupId?.startsWith('pl-')) {
                              const lbl = roomLabelHandle(wall.groupId.slice(3))
                              if (planDoc.texts.some(tx => tx.handle === lbl)) groupIds.push(lbl)
                            }
                            setSelectedIds(prev => {
                              if (!isCtrl) return new Set(groupIds)
                              if (selBeforeMouseDown.current.has(wall.id)) { const next = new Set(prev); groupIds.forEach(id => next.delete(id)); return next }
                              return prev
                            })
                          }}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move'; if (wall.groupId) setHoveredGroupId(wall.groupId) }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default'; setHoveredGroupId(null) }}
                        />
                        {(() => {
                          const isHoverGroup = !isSel && !isDragging && !!wall.groupId && wall.groupId === hoveredGroupId
                          return (
                            <Line points={[sx, sy, ex, ey]}
                              stroke={isDragging ? '#3b82f6' : isSel ? '#f59e0b' : isHoverGroup ? '#a855f7' : wallColor}
                              strokeWidth={(isDragging || isSel || isHoverGroup) ? 2.2 / zoom : strokeW}
                              lineCap="round" listening={false}
                            />
                          )
                        })()}
                        {isSel && (
                          <>
                            <Circle x={sx} y={sy} radius={HR} fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom} draggable
                              onDragStart={() => { snapshot(); setIsDraggingEp(true); draggingEpInfo.current = { wallId: wall.id, ep: 'start' } }}
                              onDragMove={e => onEpDragMove(e, wall.id, 'start')}
                              onDragEnd={onEpDragEnd}
                              onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                              onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                            />
                            <Circle x={ex} y={ey} radius={HR} fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom} draggable
                              onDragStart={() => { snapshot(); setIsDraggingEp(true); draggingEpInfo.current = { wallId: wall.id, ep: 'end' } }}
                              onDragMove={e => onEpDragMove(e, wall.id, 'end')}
                              onDragEnd={onEpDragEnd}
                              onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                              onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                            />
                          </>
                        )}
                      </Group>
                    )
                  })}

                  {/* ── Alignment guide lines (cyan, extend across stage) ── */}
                  {alignGuides.map((g, i) => {
                    if (g.type === 'h') {
                      const [, cy] = toC(0, g.coord, t)
                      return <Line key={`ag-h-${i}`} points={[0, cy, stageSize.w / zoom, cy]} stroke="#06b6d4" strokeWidth={0.8 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} opacity={0.85} />
                    } else {
                      const [cx] = toC(g.coord, 0, t)
                      return <Line key={`ag-v-${i}`} points={[cx, 0, cx, stageSize.h / zoom]} stroke="#06b6d4" strokeWidth={0.8 / zoom} dash={[6 / zoom, 4 / zoom]} listening={false} opacity={0.85} />
                    }
                  })}

                  {/* ── Snap indicator — single crosshair (AutoCAD-style) ── */}
                  {snapTarget && (() => {
                    const [scx, scy] = toC(snapTarget.x, snapTarget.y, t)
                    const r = 7 / zoom, sw = 1.5 / zoom
                    return (
                      <Group listening={false}>
                        <Circle x={scx} y={scy} radius={r} stroke="#f59e0b" strokeWidth={sw} fill="rgba(245,158,11,0.10)" />
                        <Line points={[scx - r * 1.6, scy, scx + r * 1.6, scy]} stroke="#f59e0b" strokeWidth={sw * 0.7} />
                        <Line points={[scx, scy - r * 1.6, scx, scy + r * 1.6]} stroke="#f59e0b" strokeWidth={sw * 0.7} />
                      </Group>
                    )
                  })()}

                  {activeTool === 'drawLine' && drawLineAnchor && drawLinePointer && (
                    <Line points={[...toC(drawLineAnchor.x, drawLineAnchor.y, t), ...toC(drawLinePointer.x, drawLinePointer.y, t)]} stroke="#3b82f6" strokeWidth={1.5 / zoom} lineCap="round" dash={[8 / zoom, 6 / zoom]} listening={false} />
                  )}

                  {activeTool === 'drawPolyline' && polylineDraft.length >= 1 && polylineHover && (
                    <Group listening={false}>
                      {polylineDraft.length >= 2 && <Line points={polylineDraft.flatMap(p => toC(p.x, p.y, t))} stroke="#3b82f6" strokeWidth={1.5 / zoom} lineCap="round" lineJoin="round" />}
                      <Line points={[...toC(polylineDraft[polylineDraft.length - 1].x, polylineDraft[polylineDraft.length - 1].y, t), ...toC(polylineHover.x, polylineHover.y, t)]} stroke="#3b82f6" strokeWidth={1.5 / zoom} lineCap="round" dash={[8 / zoom, 6 / zoom]} />
                    </Group>
                  )}

                  {/* Arc draw preview */}
                  {activeTool === 'drawArc' && shapePointer && arcDraftCenter && (() => {
                    const [cx, cy] = toC(arcDraftCenter.x, arcDraftCenter.y, t)
                    const [px, py] = toC(shapePointer.x, shapePointer.y, t)
                    const rawDx = shapePointer.x - arcDraftCenter.x, rawDy = shapePointer.y - arcDraftCenter.y
                    const pAngle = Math.atan2(rawDy, rawDx) * (180 / Math.PI)
                    const pRadius = Math.hypot(rawDx, rawDy)
                    if (arcDraftRadius === null) {
                      return (
                        <Group listening={false}>
                          <Circle x={cx} y={cy} radius={5 / zoom} fill="#3b82f6" />
                          <Line points={[cx, cy, px, py]} stroke="#3b82f6" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} />
                          <Text x={px + 6 / zoom} y={py - 10 / zoom} text={fmtLen(pRadius)} fill="#3b82f6" fontSize={11 / zoom} listening={false} />
                        </Group>
                      )
                    }
                    let endAngle = pAngle
                    if (endAngle <= arcDraftStartAngle!) endAngle += 360
                    const previewArc: DxfArc = { entity_type: 'ARC', handle: '__preview__', layer: '0', center: { x: arcDraftCenter.x, y: arcDraftCenter.y, z: 0 }, radius: arcDraftRadius, start_angle: arcDraftStartAngle!, end_angle: endAngle }
                    return (
                      <Group listening={false}>
                        <Circle x={cx} y={cy} radius={5 / zoom} fill="#3b82f6" />
                        <Line points={arcPoints(previewArc, t, 64)} stroke="#3b82f6" strokeWidth={1.5 / zoom} lineCap="round" lineJoin="round" dash={[6 / zoom, 4 / zoom]} />
                      </Group>
                    )
                  })()}
                  {activeTool === 'drawArc' && !arcDraftCenter && shapePointer && (() => {
                    const [px, py] = toC(shapePointer.x, shapePointer.y, t)
                    return <Circle x={px} y={py} radius={5 / zoom} fill="#3b82f6" listening={false} />
                  })()}

                  {/* Circle draw preview */}
                  {activeTool === 'drawCircle' && shapePointer && (() => {
                    if (!circleDraftCenter) {
                      const [px, py] = toC(shapePointer.x, shapePointer.y, t)
                      return <Circle x={px} y={py} radius={5 / zoom} fill="#3b82f6" listening={false} />
                    }
                    const [cx, cy] = toC(circleDraftCenter.x, circleDraftCenter.y, t)
                    const radius = Math.hypot(shapePointer.x - circleDraftCenter.x, shapePointer.y - circleDraftCenter.y)
                    if (radius < 0.01) return null
                    return (
                      <Group listening={false}>
                        <Circle x={cx} y={cy} radius={5 / zoom} fill="#3b82f6" />
                        <Circle x={cx} y={cy} radius={radius * t.sc} stroke="#3b82f6" strokeWidth={1.5 / zoom} fill="transparent" dash={[6 / zoom, 4 / zoom]} />
                        <Text x={cx + radius * t.sc / Math.SQRT2 + 4 / zoom} y={cy - radius * t.sc / Math.SQRT2 - 14 / zoom} text={`r = ${fmtLen(radius)}`} fill="#3b82f6" fontSize={11 / zoom} listening={false} />
                      </Group>
                    )
                  })()}
                </Layer>

                {/* ── rubber-band selection ── */}
                {selectionBox && (() => {
                  const [sx, sy] = toC(selectionBox.start.x, selectionBox.start.y, t)
                  const [cx, cy] = toC(selectionBox.current.x, selectionBox.current.y, t)
                  const isWindow = selectionBox.start.x < selectionBox.current.x
                  return (
                    <Layer listening={false}>
                      <Rect x={Math.min(sx, cx)} y={Math.min(sy, cy)} width={Math.abs(cx - sx)} height={Math.abs(cy - sy)}
                        fill={isWindow ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)'}
                        stroke={isWindow ? '#3b82f6' : '#22c55e'} strokeWidth={1 / zoom} dash={[4 / zoom, 2 / zoom]}
                      />
                    </Layer>
                  )
                })()}

                {/* ── labels ── */}
                {showLabels && (
                  <Layer>
                    {effectiveTexts.map(tx => {
                      const textLines = tx.text.split('\n')
                      const [lx, ly] = toC(tx.position.x, tx.position.y, t)
                      // Font size scales with world height — smaller than original (1.8× vs 3.5×) to reduce overlap
                      const fs = Math.max(8, tx.height * t.sc * 1.8)
                      const isTxtSel = selectedIds.has(tx.handle)
                      const isEditing = editingTextHandle === tx.handle
                      const estW = Math.max(fs * 3, (textLines[0]?.length ?? 1) * fs * 0.52)
                      const boxH = fs * (textLines[1] ? 2.15 : 1) + 8 / zoom
                      // font-size handle sits at bottom-right corner of the text box
                      const handleX = estW + 4 / zoom
                      const handleY = boxH - fs

                      return (
                        <Group key={tx.handle} x={lx} y={ly}
                          onClick={(e) => {
                            if (isDrawingTool) return
                            e.cancelBubble = true
                            if (activeTool === 'hand' || spaceHeld) return
                            if (activeTool !== 'select') return
                            setSelectedRoomIndex(null); setSelectedId(null)
                            const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                            setSelectedIds(prev => { const next = new Set(isCtrl ? prev : []); if (isTxtSel && isCtrl) next.delete(tx.handle); else next.add(tx.handle); return next })
                            setSelectedTextHandle(isTxtSel && !e.evt.ctrlKey ? null : tx.handle)
                          }}
                          onMouseDown={e => {
                            if (isEditing) return  // textarea handles its own events
                            e.cancelBubble = true
                            if (activeTool !== 'select' || spaceHeld) return
                            const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                            const currentSel = new Set(isCtrl ? selectedIds : (isTxtSel ? selectedIds : new Set<string>()))
                            currentSel.add(tx.handle)
                            if (!isCtrl && !isTxtSel) setSelectedIds(currentSel)
                            onMidDragStart(e as any, tx.handle, currentSel)
                          }}
                          onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                          onDblClick={e => {
                            e.cancelBubble = true
                            if (activeTool !== 'select') return
                            setEditingTextHandle(tx.handle)
                            // Only let user edit the room name (first line).
                            // The size line (e.g. "3.0 X 3.35") is auto-calculated — not editable.
                            setEditingTextValue(tx.text.split('\n')[0])
                            setSelectedIds(new Set([tx.handle]))
                            setSelectedTextHandle(tx.handle)
                          }}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = isEditing ? 'text' : 'move' }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        >
                          {/* Hide background rect and text while the HTML textarea overlay is active */}
                          {isTxtSel && !isEditing && <Rect x={-4 / zoom} y={-fs - 4 / zoom} width={estW + 8 / zoom} height={boxH} fill="rgba(245,158,11,0.12)" stroke="#f59e0b" strokeWidth={1.2 / zoom} cornerRadius={2 / zoom} listening={false} />}
                          {!isEditing && <Text x={0} y={-fs} text={textLines[0]} fontSize={fs} fontStyle="bold" fill={isTxtSel ? '#f59e0b' : '#2563eb'} fontFamily="'Inter', system-ui, -apple-system, sans-serif" />}
                          {!isEditing && textLines[1] && <Text x={0} y={-fs + fs * 1.25} text={textLines[1]} fontSize={fs * 0.78} fill={isTxtSel ? '#f59e0b' : '#64748b'} fontFamily="'Inter', system-ui, -apple-system, sans-serif" />}
                          {isTxtSel && selectedIds.size === 1 && activeTool === 'select' && (
                            <Circle x={handleX} y={handleY} radius={HR} fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom} draggable
                              onDragStart={(e) => {
                                e.cancelBubble = true; snapshot()
                                const stage = e.target.getStage()!
                                const p = stage.getRelativePointerPosition()!
                                const [wx] = toW(p.x, p.y, t)
                                textHeightDragRef.current = { handle: tx.handle, startH: tx.height, startPointerWy: wx }
                              }}
                              onDragMove={(e) => {
                                e.cancelBubble = true
                                const r = textHeightDragRef.current
                                if (!r || r.handle !== tx.handle) return
                                const stage = e.target.getStage()!
                                const p = stage.getRelativePointerPosition()!
                                const [wx] = toW(p.x, p.y, t)
                                // Drag right → larger, drag left → smaller
                                const newH = Math.max(0.05, Math.min(5, r.startH + (wx - r.startPointerWy) * 0.3))
                                setPlanDoc(prev => ({ ...prev, texts: prev.texts.map(t => t.handle === tx.handle ? { ...t, height: newH } : t) }))
                                e.target.position({ x: handleX, y: handleY })
                              }}
                              onDragEnd={(e) => { e.cancelBubble = true; textHeightDragRef.current = null; e.target.position({ x: handleX, y: handleY }) }}
                              onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'ew-resize' }}
                              onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                            />
                          )}
                        </Group>
                      )
                    })}
                  </Layer>
                )}

                {/* ── resize + rotation handles ── */}
                {effectiveSelBBox && (selectedIds.size > 0 || selectedWinKey !== null || selectedFurnKey !== null) && activeTool === 'select' && !activeDrag && (() => {
                  const { minCX, minCY, maxCX, maxCY } = effectiveSelBBox
                  const pad = 6 / zoom
                  const w = maxCX - minCX, h = maxCY - minCY
                  // For text-only selection, show only a selection outline + rotation — no resize squares
                  const onlyTexts = (selectedWinKey || selectedFurnKey) ? false : [...selectedIds].every(id => planDoc.texts.some(tx => tx.handle === id))
                  const handleSize = 8 / zoom, halfHandle = handleSize / 2
                  const corners = {
                    nw: { x: minCX - pad, y: minCY - pad }, ne: { x: maxCX + pad, y: minCY - pad },
                    sw: { x: minCX - pad, y: maxCY + pad }, se: { x: maxCX + pad, y: maxCY + pad },
                    n: { x: minCX + w / 2, y: minCY - pad }, s: { x: minCX + w / 2, y: maxCY + pad },
                    e: { x: maxCX + pad, y: minCY + h / 2 }, w: { x: minCX - pad, y: minCY + h / 2 },
                  }
                  const cx = (minCX + maxCX) / 2
                  const topY = minCY - pad, stemLen = 28 / zoom, handleY = topY - stemLen, rotHandleR = 7 / zoom
                  return (
                    <Layer>
                      {!onlyTexts && Object.entries(corners).map(([pos, pt]) => (
                        <Rect key={pos} x={pt.x - halfHandle} y={pt.y - halfHandle} width={handleSize} height={handleSize}
                          fill="white" stroke="#3b82f6" strokeWidth={1.5 / zoom}
                          onMouseDown={e => {
                            e.cancelBubble = true
                            if (!baseSelWBox) return
                            const mpos = stageRef.current?.getRelativePointerPosition()
                            if (!mpos) return
                            const [mwx, mwy] = toW(mpos.x, mpos.y, t)
                            snapshot()
                            const rd: ResizeDrag = {
                              handle: pos as ResizeDrag['handle'], initBBox: { ...baseSelWBox },
                              initMouseWX: mwx, initMouseWY: mwy,
                              wallIds: walls.filter(w => selectedIds.has(w.id)).map(w => w.id),
                              textHandles: planDoc.texts.filter(tx => selectedIds.has(tx.handle)).map(tx => tx.handle),
                              arcHandles: planDoc.arcs.filter(a => selectedIds.has(a.handle)).map(a => a.handle),
                              winKey: selectedWinKey ?? undefined,
                              furnKey: selectedFurnKey ?? undefined,
                            }
                            resizeDragRef.current = rd; resizePreviewRef.current = { ...baseSelWBox }
                            setResizeDrag(rd); setResizePreview({ ...baseSelWBox })
                          }}
                          onMouseUp={e => { e.cancelBubble = true; commitResize() }}
                          onMouseEnter={ev => {
                            ev.target.getStage()!.container().style.cursor =
                              pos === 'n' || pos === 's' ? 'ns-resize' : pos === 'e' || pos === 'w' ? 'ew-resize' : pos === 'nw' || pos === 'se' ? 'nwse-resize' : 'nesw-resize'
                          }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        />
                      ))}
                      <Line points={[cx, topY, cx, handleY]} stroke="#3b82f6" strokeWidth={1 / zoom} listening={false} />
                      <Circle x={cx} y={handleY} radius={rotHandleR} fill={rotationDrag ? '#3b82f6' : 'white'} stroke="#3b82f6" strokeWidth={1.5 / zoom}
                        onMouseDown={e => {
                          e.cancelBubble = true
                          if (!baseSelCenter) return
                          const mpos = stageRef.current?.getRelativePointerPosition()
                          if (!mpos) return
                          const [ccx, ccy] = toC(baseSelCenter.wx, baseSelCenter.wy, t)
                          const startAngle = Math.atan2(mpos.y - ccy, mpos.x - ccx)
                          snapshot()
                          const rd: RotationDrag = {
                            centerWX: baseSelCenter.wx, centerWY: baseSelCenter.wy,
                            startMouseAngle: startAngle,
                            wallIds: walls.filter(w => selectedIds.has(w.id)).map(w => w.id),
                            textHandles: planDoc.texts.filter(tx => selectedIds.has(tx.handle)).map(tx => tx.handle),
                            arcHandles: planDoc.arcs.filter(a => selectedIds.has(a.handle)).map(a => a.handle),
                            winKey: selectedWinKey ?? undefined,
                            furnKey: selectedFurnKey ?? undefined,
                          }
                          rotationDragRef.current = rd; rotationAngleDeltaRef.current = 0
                          setRotationDrag(rd); setRotationAngleDelta(0)
                        }}
                        onMouseUp={e => { e.cancelBubble = true; commitRotation() }}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      />
                      <Text x={cx - rotHandleR} y={handleY - rotHandleR} width={rotHandleR * 2} height={rotHandleR * 2} text="↻" fontSize={rotHandleR * 1.3} align="center" verticalAlign="middle" fill={rotationDrag ? 'white' : '#3b82f6'} listening={false} />
                    </Layer>
                  )
                })()}

                {/* ── room move handle ── */}
                <Layer>
                  {activeTool === 'select' && !spaceHeld && selectedRoomIndex !== null && rooms[selectedRoomIndex] && (() => {
                    const room = rooms[selectedRoomIndex]
                    let ax = 0, ay = 0
                    for (const p of room) { ax += p.x; ay += p.y }
                    ax /= room.length; ay /= room.length
                    const [rcx, rcy] = toC(ax, ay, t)
                    return (
                      <Circle x={rcx} y={rcy} radius={Math.max(HR * 1.15, 8 / zoom)}
                        fill="#f59e0b" stroke="#fff" strokeWidth={1.2 / zoom}
                        draggable={!activeDrag}
                        onDragStart={e => { e.cancelBubble = true; onRoomMoveDragStart(e) }}
                        onDragMove={e => { e.cancelBubble = true; onRoomMoveDragMove(e) }}
                        onDragEnd={e => { e.cancelBubble = true; onRoomMoveDragEnd() }}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      />
                    )
                  })()}
                </Layer>
              </Stage>

              {/* ── Dimension overlay SVG ── */}
              {effectiveSelBBox && selectedIds.size > 0 && activeTool === 'select' && !activeDrag && (() => {
                const { minCX, minCY, maxCX, maxCY } = effectiveSelBBox
                const pad = 6 / zoom
                const rX = minCX - pad, rY = minCY - pad
                const rW = (maxCX - minCX) + pad * 2, rH = (maxCY - minCY) + pad * 2
                const selWalls = effectiveWalls.filter(ww => selectedIds.has(ww.id))
                let dimW = 0, dimH = 0
                if (selWalls.length > 0) {
                  let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity
                  for (const ww of selWalls) for (const p of [ww.start, ww.end]) { mnX = Math.min(mnX, p.x); mxX = Math.max(mxX, p.x); mnY = Math.min(mnY, p.y); mxY = Math.max(mxY, p.y) }
                  dimW = Math.abs(mxX - mnX); dimH = Math.abs(mxY - mnY)
                }
                const DIM_OFFSET = 22 / zoom, TICK = 5 / zoom, ARROW_SZ = 6 / zoom, FS = 11 / zoom, SW = 1 / zoom
                const DASH = `${5/zoom},${3/zoom}`
                const wDimY = rY + rH + DIM_OFFSET, wMidX = rX + rW / 2
                const hDimX = rX + rW + DIM_OFFSET, hMidY = rY + rH / 2
                const arrowPath = (tipX: number, tipY: number, fromX: number, fromY: number) => {
                  const angle = Math.atan2(tipY - fromY, tipX - fromX)
                  return [`M${tipX - ARROW_SZ * Math.cos(angle - 0.35)},${tipY - ARROW_SZ * Math.sin(angle - 0.35)}`, `L${tipX},${tipY}`, `L${tipX - ARROW_SZ * Math.cos(angle + 0.35)},${tipY - ARROW_SZ * Math.sin(angle + 0.35)}`].join(' ')
                }
                return (
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: stageSize.w, height: stageSize.h, pointerEvents: 'none', overflow: 'visible' }}>
                    <g transform={`translate(${pos.x},${pos.y}) scale(${zoom})`}>
                      <rect x={rX} y={rY} width={rW} height={rH} fill="none" stroke="#3b82f6" strokeWidth={SW} strokeDasharray={DASH} />
                      {dimW > 0.01 && <>
                        <line x1={rX} y1={rY + rH} x2={rX} y2={wDimY + TICK} stroke="#64748b" strokeWidth={SW * 0.8} />
                        <line x1={rX + rW} y1={rY + rH} x2={rX + rW} y2={wDimY + TICK} stroke="#64748b" strokeWidth={SW * 0.8} />
                        <line x1={rX} y1={wDimY} x2={rX + rW} y2={wDimY} stroke="#64748b" strokeWidth={SW} />
                        <path d={arrowPath(rX, wDimY, rX + rW, wDimY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                        <path d={arrowPath(rX + rW, wDimY, rX, wDimY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                        <text x={wMidX} y={wDimY + FS * 0.35} textAnchor="middle" fontSize={FS} fill="#1e40af" fontWeight="bold" fontFamily="'Inter',system-ui,-apple-system,sans-serif">{fmtLen(dimW)}</text>
                      </>}
                      {dimH > 0.01 && <>
                        <line x1={rX + rW} y1={rY} x2={hDimX + TICK} y2={rY} stroke="#64748b" strokeWidth={SW * 0.8} />
                        <line x1={rX + rW} y1={rY + rH} x2={hDimX + TICK} y2={rY + rH} stroke="#64748b" strokeWidth={SW * 0.8} />
                        <line x1={hDimX} y1={rY} x2={hDimX} y2={rY + rH} stroke="#64748b" strokeWidth={SW} />
                        <path d={arrowPath(hDimX, rY, hDimX, rY + rH)} stroke="#64748b" strokeWidth={SW} fill="none" />
                        <path d={arrowPath(hDimX, rY + rH, hDimX, rY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                        <text x={hDimX} y={hMidY + FS * 0.35} textAnchor="middle" fontSize={FS} fill="#1e40af" fontWeight="bold" fontFamily="'Inter',system-ui,-apple-system,sans-serif" transform={`rotate(-90,${hDimX},${hMidY})`}>{fmtLen(dimH)}</text>
                      </>}
                    </g>
                  </svg>
                )
              })()}

              {/* ── Inline label editor (Figma-style textarea over canvas) ── */}
              {editingTextHandle && (() => {
                const tx = planDoc.texts.find(t => t.handle === editingTextHandle)
                if (!tx) return null
                const [lx, ly] = toC(tx.position.x, tx.position.y, t)
                const fs = Math.max(8, tx.height * t.sc * 1.8)
                // Convert canvas-local coords to screen (host-div) coords
                const screenX = lx * zoom + pos.x
                const screenY = (ly - fs) * zoom + pos.y
                const commitEdit = () => {
                  const val = editingTextValue.trim()
                  if (val) setPlanDoc(prev => ({ ...prev, texts: prev.texts.map(t => {
                    if (t.handle !== editingTextHandle) return t
                    // Preserve the auto-calculated size line if present
                    const sizeLine = t.text.includes('\n') ? '\n' + t.text.split('\n').slice(1).join('\n') : ''
                    return { ...t, text: val + sizeLine }
                  })}))
                  setEditingTextHandle(null)
                }
                return (
                  <textarea
                    key={editingTextHandle}
                    autoFocus
                    value={editingTextValue}
                    rows={editingTextValue.split('\n').length || 1}
                    onChange={e => setEditingTextValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit() }
                      if (e.key === 'Escape') { setEditingTextHandle(null) }
                    }}
                    style={{
                      position: 'absolute',
                      left: screenX,
                      top: screenY,
                      minWidth: Math.max(80, fs * zoom * 4),
                      fontSize: fs * zoom,
                      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight: '600',
                      color: '#f59e0b',
                      background: 'rgba(255,255,255,0.92)',
                      border: '1.5px solid #f59e0b',
                      borderRadius: 3,
                      padding: '1px 4px',
                      outline: 'none',
                      resize: 'none',
                      overflow: 'hidden',
                      zIndex: 200,
                      lineHeight: 1.3,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  />
                )
              })()}
            </div>
          </div>
        </main>

        {/* ── Right rail ── */}
        <aside className="dxf-right-rail">
          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Add walls</div>
            <p className="dxf-prop-hint">Add LINE, LWPOLYLINE, ARC, or CIRCLE — same entities as the top toolbar.</p>
            <div className="dxf-add-wall-btns">
              {(['drawLine','drawPolyline','drawCircle','drawArc'] as const).map(id => (
                <button key={id} type="button" className={`dxf-action-btn${activeTool === id ? ' dxf-action-btn-active' : ''}`} onClick={() => activateTool(id)}>
                  {id === 'drawLine' ? 'Line' : id === 'drawPolyline' ? 'Polyline' : id === 'drawCircle' ? 'Circle' : 'Arc'}
                </button>
              ))}
            </div>
            {activeTool === 'drawPolyline' && (
              <>
                <label className="dxf-toggle" style={{ marginTop: '10px' }}>
                  <input type="checkbox" checked={polylineClosed} onChange={e => setPolylineClosed(e.target.checked)} />
                  Close path (≥3 vertices)
                </label>
                <button type="button" className="dxf-action-btn" style={{ marginTop: '8px' }} disabled={polylineDraft.length < 2} onClick={() => finishPolyline()}>
                  Finish polyline
                </button>
              </>
            )}
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Canvas</div>
            <label className="dxf-prop-field">
              <span>Units</span>
              <select value={units} onChange={e => setUnits(e.target.value as 'm' | 'cm' | 'mm')}>
                <option value="m">Metres</option>
                <option value="cm">Centimetres</option>
                <option value="mm">Millimetres</option>
              </select>
            </label>
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Style</div>
            <label className="dxf-prop-field">
              <span>Stroke</span>
              <div className="dxf-stroke-row">
                <input type="color" value={strokeHex} onChange={e => setStrokeHex(e.target.value)} aria-label="Wall stroke colour" />
                <span className="dxf-stroke-hex">{strokeHex}</span>
              </div>
            </label>
            <label className="dxf-prop-field">
              <span>Thickness</span>
              <input type="range" min={0.5} max={2} step={0.1} value={strokeScale} onChange={e => setStrokeScale(Number(e.target.value))} />
            </label>
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Editing</div>
            <label className="dxf-toggle"><input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} /> Snap endpoints</label>
            <label className="dxf-toggle"><input type="checkbox" checked={showDetail} onChange={e => setShowDetail(e.target.checked)} /> Detail lines (stairs)</label>
            <label className="dxf-toggle"><input type="checkbox" checked={orthoEnabled} onChange={e => setOrthoEnabled(e.target.checked)} /> Ortho Mode (O)</label>
            <button className="dxf-action-btn" onClick={undo} disabled={!history.length}>Undo</button>
            <button
              type="button"
              className="dxf-action-btn"
              onClick={() => {
                snapshot()
                setPlanDoc({ ...DXF_JSON_DATA })
                setWalls(wallsFromDxfJson(DXF_JSON_DATA))
                setHistory([])
                setSelectedId(null)
                setSelectedRoomIndex(null)
                setSelectedTextHandle(null)
                setSelectedArcHandle(null)
                setSelectedWinKey(null)
                setSelectedFurnKey(null)
                drawLineAnchorRef.current = null
                setDrawLineAnchor(null)
                setDrawLinePointer(null)
                polylineDraftRef.current = []
                setPolylineDraft([])
                setPolylineHover(null)
                setArcDraftCenter(null)
                setArcDraftRadius(null)
                setArcDraftStartAngle(null)
                setCircleDraftCenter(null)
                setShapePointer(null)
                activeDragRef.current = null
                setActiveDrag(null)
                dragDeltaRef.current = { dx: 0, dy: 0 }
                setDragDelta({ dx: 0, dy: 0 })
                activePolyDragRef.current = null
                setActivePolyDrag(null)
                polyDragDeltaRef.current = { dx: 0, dy: 0 }
                setPolyDragDelta({ dx: 0, dy: 0 })
                setActiveTool('select')
              }}
            >
              Reset plan
            </button>
            {selectedIds.size > 0 && (
              <button className="dxf-action-btn danger" onClick={() => {
                snapshot()
                setWalls(p => p.filter(w => !selectedIds.has(w.id)))
                setPlanDoc(prev => ({ ...prev, texts: prev.texts.filter(tx => !selectedIds.has(tx.handle)) }))
                setSelectedIds(new Set())
              }}>Delete Selection</button>
            )}
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Grouping</div>
            <div className="dxf-prop-hint">Select ≥ 2 walls then Join to treat them as one element.</div>
            <button className="dxf-action-btn" disabled={walls.filter(w => selectedIds.has(w.id)).length < 2} onClick={joinSelected} title="J">Join selected (J)</button>
            {walls.some(w => selectedIds.has(w.id) && !!w.groupId) && (
              <button className="dxf-action-btn" onClick={ungroupSelected} title="U">Break group (U)</button>
            )}
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Export</div>
            <p className="dxf-prop-hint">
              PNG captures the current view. DXF exports all entities — walls, arcs, circles, door frames, window lines, and text labels — fully reflecting all edits and custom-drawn elements.
            </p>
            <div className="dxf-export-btns">
              <button type="button" className="dxf-action-btn dxf-export-btn" onClick={exportPng}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
                PNG
              </button>
              <button type="button" className="dxf-action-btn dxf-export-btn" onClick={exportDxf}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                DXF
              </button>
            </div>
          </div>

          {selectedRoomIndex !== null && rooms[selectedRoomIndex] && (
            <div className="dxf-prop-panel">
              <div className="dxf-prop-label">Room</div>
              <p className="dxf-prop-hint">R{selectedRoomIndex + 1} · <strong>{formatArea(polyArea(rooms[selectedRoomIndex]))}</strong> — drag the orange handle at the centroid to move all boundary walls together.</p>
            </div>
          )}

          {selectedTextEntity && selectedTextHandle && (
            <div className="dxf-prop-panel">
              <div className="dxf-prop-label">Label</div>
              <label className="dxf-prop-field">
                <span>Text</span>
                <textarea className="dxf-prop-textarea" rows={3} value={selectedTextEntity.text}
                  onChange={(e) => { const v = e.target.value, h = selectedTextHandle; setPlanDoc(prev => ({ ...prev, texts: prev.texts.map(t => (t.handle === h ? { ...t, text: v } : t)) })) }}
                />
              </label>
              <label className="dxf-prop-field">
                <span>Height (m)</span>
                <input type="number" min={0.05} max={3} step={0.01} value={selectedTextEntity.height}
                  onChange={(e) => { const v = Number(e.target.value); if (!Number.isFinite(v)) return; const clamped = Math.max(0.05, Math.min(3, v)); const h = selectedTextHandle; setPlanDoc(prev => ({ ...prev, texts: prev.texts.map(t => (t.handle === h ? { ...t, height: clamped } : t)) })) }}
                />
              </label>
              <button type="button" className="dxf-action-btn danger" onClick={() => { const h = selectedTextHandle; snapshot(); setPlanDoc(p => removeTextFromDoc(p, h!)); setSelectedTextHandle(null) }}>Delete label</button>
            </div>
          )}

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Source</div>
            {Object.entries(doc.stats.entity_counts).map(([k, v]) => (
              <div key={k} className="dxf-stat-row">
                <span className="dxf-stat-badge">{k}</span>
                <span className="dxf-stat-val">{v}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}