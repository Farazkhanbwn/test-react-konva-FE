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
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Line, Text, Group, Rect, Circle } from 'react-konva'
import type Konva from 'konva'
import { Link } from 'react-router-dom'
import polygonClipping from 'polygon-clipping'
import {
  DXF_JSON_DATA,
  type DxfJsonDocument,
  type DxfArc,
  type DxfLine,
  type DxfPolyline,
  type DxfPolylineVertex,
  type DxfText,
} from '@/constants/dxfJsonData'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import { wallSegsFromPolyline, wallsFromDxfJson } from '@/utils/wallsFromDxfJson'

/* ─── Types ──────────────────────────────────────── */
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
  const handle = `arc-user-${Date.now()}`
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
    entity_counts: { ...next.stats.entity_counts, ARC: (next.stats.entity_counts.ARC ?? 0) + 1 },
  }
  return { next, arc }
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
  for (const ln of doc.lines ?? [])     layerSet.add(ln.layer || '0')
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

function appendUserText(
  doc: DxfJsonDocument,
  position: Pt,
  text = 'Label',
  height = 0.2,
): { next: DxfJsonDocument; handle: string } {
  const handle = `user-t-${Date.now()}`
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

/* ─── Constants ──────────────────────────────────── */
const PAD = 55
const STAGE_MIN_W = 320
const STAGE_MIN_H = 280
const SNAP_TH = 0.15   // world metres — snap threshold
const HP_SCR  = 7      // endpoint handle radius in screen px
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

/** Match detected room polygon edges to editable wall segments (world space). */
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
      if (fwd || rev) {
        found.add(w.id)
        break
      }
    }
  }
  return [...found]
}

/** Apply the same translation to every listed wall (plan + room move). */
function translateWallsByIds(ws: WallSeg[], ids: Set<string>, dx: number, dy: number): WallSeg[] {
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

/** Keep `planDoc` line / polyline entities aligned after a rigid room translation. */
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
    }
    else if (wid.startsWith('pl-')) {
      const rest = wid.slice(3)
      const dash = rest.lastIndexOf('-')
      if (dash <= 0) continue
      const ph = rest.slice(0, dash)
      const ei = Number(rest.slice(dash + 1))
      if (!Number.isFinite(ei)) continue
      if (!polyVertIdx.has(ph)) polyVertIdx.set(ph, new Set())
      const s = polyVertIdx.get(ph)!
      s.add(ei)
      s.add(ei + 1)
    }
  }
  for (const [ph, idxs] of polyVertIdx) {
    next.polylines = next.polylines.map(pl => {
      if (pl.handle !== ph) return pl
      const vertices = pl.vertices.map((v, j) =>
        idxs.has(j) ? { ...v, x: v.x + dx, y: v.y + dy } : v,
      )
      return { ...pl, vertices }
    })
  }
  return next
}

/* ─── Transform helpers ──────────────────────────── */
/** Build a world→canvas transform that centres the drawing with padding (fits actual Stage px size). */
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

/** world → canvas (DXF Y is upward, canvas Y is downward) */
const toC = (wx: number, wy: number, t: T): [number, number] => [
  (wx - t.emin[0]) * t.sc + t.oX,
  t.oY + (t.wH - (wy - t.emin[1])) * t.sc,
]

/** canvas → world (inverse of toC) */
const toW = (cx: number, cy: number, t: T): [number, number] => [
  (cx - t.oX) / t.sc + t.emin[0],
  t.emin[1] + t.wH - (cy - t.oY) / t.sc,
]

/**
 * Generate canvas-space points for a DXF ARC (CCW, degrees).
 * Handles arcs that wrap through 0° (end_angle < start_angle).
 */
function arcPoints(arc: DxfArc, t: T, steps = 48): number[] {
  const startRad = arc.start_angle * Math.PI / 180
  const endDeg = arc.end_angle > arc.start_angle ? arc.end_angle : arc.end_angle + 360
  const endRad = endDeg * Math.PI / 180
  const pts: number[] = []
  for (let i = 0; i <= steps; i++) {
    const angle = startRad + (endRad - startRad) * i / steps
    const [cx, cy] = toC(
      arc.center.x + arc.radius * Math.cos(angle),
      arc.center.y + arc.radius * Math.sin(angle),
      t,
    )
    pts.push(cx, cy)
  }
  return pts
}

/* ─── Polygon area (shoelace, world Y-up coords) ── */
function polyArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}

/* ─── DCEL-based minimal face extraction ────────── */
/**
 * Finds all minimal bounded faces (rooms) from non-detail wall segments:
 *  1. Merge coincident endpoints into shared nodes (within SNAP_TH)
 *  2. Build undirected edge list
 *  3. For every directed half-edge u→v the "next" half-edge at v is the one
 *     with the smallest clockwise turn from the reversed direction v→u
 *  4. Trace all faces; keep CCW faces (positive shoelace area = interior)
 *  5. Validate / simplify via polygon-clipping union — this resolves degenerate
 *     faces that the DCEL can produce when walls are nearly-collinear.
 */
function detectRooms(walls: WallSeg[]): Pt[][] {
  const segs = walls.filter(w => !w.isDetail)
  if (segs.length < 3) return []

  /* Step 1 – merge coincident endpoints */
  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++)
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
    return nodes.push({ x, y }) - 1
  }

  /* Step 2 – deduplicated edge list */
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

  /* Step 3 – adjacency sorted by angle */
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
      Math.atan2(nodes[b].y - pn.y, nodes[b].x - pn.x),
    )
  }

  /* Step 4 – next half-edge map */
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

  /* Step 5 – trace faces */
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

  /* Keep CCW faces (positive shoelace area = bounded interior) */
  const interiorFaces = rawFaces.filter(f => polyArea(f) > 0.05)
  if (!interiorFaces.length) return []

  /**
   * Step 6 – polygon-clipping union pass.
   * Run each face through polygon-clipping union(face, face) — this resolves
   * self-intersections and normalises winding so the Konva fill renders cleanly.
   * Faces that degenerate (tiny area, self-crossing) are silently dropped.
   */
  const validFaces: Pt[][] = []
  for (const face of interiorFaces) {
    try {
      /* polygon-clipping uses [x,y] pairs; Y-axis direction is irrelevant for union */
      const ring = face.map(p => [p.x, p.y] as [number, number])
      /* close the ring */
      ring.push(ring[0])
      const result = polygonClipping.union([[ring]])
      for (const poly of result) {
        for (const contour of poly) {
          /* drop the repeated closing vertex */
          const pts = contour.slice(0, -1).map(([x, y]) => ({ x, y }))
          if (pts.length >= 3 && Math.abs(polyArea(pts)) > 0.05) validFaces.push(pts)
        }
      }
    } catch {
      /* if polygon-clipping fails, use the raw face as-is */
      validFaces.push(face)
    }
  }
  return validFaces
}

/* ─── Component ──────────────────────────────────── */
export function DxfJsonViewPage() {
  const stageRef = useRef<Konva.Stage>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  /** Stage pixel size — driven by container so the floor plan fills the centre column (no fixed 900×660). */
  const [stageSize, setStageSize] = useState({ w: 900, h: 620 })

  /** Authoritative document: bundled JSON from `src/constants/dxfJsonData.ts` only. */
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

  /* core state */
  const [walls, setWalls]         = useState<WallSeg[]>(() => wallsFromDxfJson(DXF_JSON_DATA))
  const [history, setHistory]     = useState<EditorSnapshot[]>([])
  const [zoom, setZoom]           = useState(1)
  const [pos, setPos]             = useState({ x: 0, y: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null)
  const [selectedTextHandle, setSelectedTextHandle] = useState<string | null>(null)
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
  const [showDetail, setShowDetail]   = useState(true)
  const [showLabels, setShowLabels]   = useState(true)
  const [selectedArcHandle, setSelectedArcHandle] = useState<string | null>(null)
  const [selectedWinKey, setSelectedWinKey]       = useState<string | null>(null)

  /* Arc / circle drawing state machine */
  const [arcDraftCenter,     setArcDraftCenter]     = useState<Pt | null>(null)
  const [arcDraftRadius,     setArcDraftRadius]     = useState<number | null>(null)
  const [arcDraftStartAngle, setArcDraftStartAngle] = useState<number | null>(null)
  const [circleDraftCenter,  setCircleDraftCenter]  = useState<Pt | null>(null)
  /** Live pointer position for arc/circle previews */
  const [shapePointer, setShapePointer] = useState<Pt | null>(null)

  /* editor chrome (Synaps-style) */
  const [activeTool, setActiveTool] = useState<
    'select' | 'hand' | 'frame' | 'drawLine' | 'drawPolyline' | 'text' | 'drawArc' | 'drawCircle'
  >('select')
  const [units, setUnits] = useState<'m' | 'cm' | 'mm'>('m')
  const [strokeHex, setStrokeHex] = useState('#474747')
  const [strokeScale, setStrokeScale] = useState(1)

  /* drag feedback */
  const [snapTarget, setSnapTarget]   = useState<Pt | null>(null)
  const [isDraggingEp, setIsDraggingEp] = useState(false)
  /* Space-bar temporary pan mode */
  const [spaceHeld, setSpaceHeld] = useState(false)

  /**
   * Unified mid-handle drag model.
   * `activeDragRef` gives synchronous access inside Konva drag event callbacks.
   * `activeDrag` state drives React rendering (dimension labels while dragging).
   * `dragDelta` is the live world-space offset that feeds `effectiveWalls`.
   */
  interface ActiveDrag {
    wallId:    string
    origStart: Pt
    origEnd:   Pt
    initCX:    number   // canvas-space handle position when drag started
    initCY:    number
  }
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta]   = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  /** Rigid move of every wall segment on a detected room boundary. */
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

  /** Translate only the wall being midpoint-dragged (no connected-wall stretching). */
  const applyDrag = useCallback((ws: WallSeg[], drag: ActiveDrag, delta: { dx: number; dy: number }): WallSeg[] => {
    const { wallId, origStart, origEnd } = drag
    const { dx, dy } = delta
    const newStart = { x: origStart.x + dx, y: origStart.y + dy }
    const newEnd   = { x: origEnd.x   + dx, y: origEnd.y   + dy }
    return ws.map(w => (w.id === wallId ? { ...w, start: newStart, end: newEnd } : w))
  }, [])

  /** Walls with midpoint-drag preview only (baseline for room detection + room move). */
  const wallsBase = useMemo(
    () => (activeDrag ? applyDrag(walls, activeDrag, dragDelta) : walls),
    [walls, activeDrag, dragDelta, applyDrag],
  )

  /* derived rooms — includes live room-translation preview */
  const rooms = useMemo(() => {
    const g = roomDrag
      ? translateWallsByIds(wallsBase, roomDrag.wallIds, roomDragDelta.dx, roomDragDelta.dy)
      : wallsBase
    return detectRooms(g)
  }, [wallsBase, roomDrag, roomDragDelta])

  /* ── undo ── */
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

  /* ── snap helper ── */
  const getSnap = useCallback((x: number, y: number, excludeId: string): Pt => {
    if (!snapEnabled) return { x, y }
    let best: Pt | null = null, bestD = SNAP_TH
    for (const w of walls) {
      if (w.id === excludeId) continue
      for (const ep of [w.start, w.end]) {
        const d = Math.hypot(ep.x - x, ep.y - y)
        if (d < bestD) { bestD = d; best = ep }
      }
    }
    return best ?? { x, y }
  }, [walls, snapEnabled])

  /* ── endpoint drag ── */
  const onEpDragMove = useCallback((
    e: Konva.KonvaEventObject<DragEvent>,
    wallId: string,
    ep: 'start' | 'end',
  ) => {
    const node = e.target
    const [rawX, rawY] = toW(node.x(), node.y(), t)
    const snapped = getSnap(rawX, rawY, wallId)
    /* force node to snapped canvas position so Konva tracks the right place */
    const [scx, scy] = toC(snapped.x, snapped.y, t)
    node.x(scx); node.y(scy)
    setSnapTarget(snapped.x !== rawX || snapped.y !== rawY ? snapped : null)
    setWalls(prev => prev.map(w =>
      w.id !== wallId ? w : { ...w, [ep]: snapped },
    ))
  }, [t, getSnap])

  const onEpDragEnd = useCallback(() => {
    setSnapTarget(null)
    setIsDraggingEp(false)
  }, [])

  /* ── mid-handle drag (move whole wall + stretch connected walls live) ── */
  const onMidDragStart = useCallback((
    e: Konva.KonvaEventObject<DragEvent>,
    wall: WallSeg,
  ) => {
    if (roomDragRef.current) return
    setSelectedRoomIndex(null)
    snapshot()
    const drag: ActiveDrag = {
      wallId:    wall.id,
      origStart: { ...wall.start },
      origEnd:   { ...wall.end },
      initCX:    e.target.x(),
      initCY:    e.target.y(),
    }
    activeDragRef.current = drag
    setActiveDrag(drag)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [snapshot])

  const onMidDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const drag = activeDragRef.current
    if (!drag) return
    const dx =  (e.target.x() - drag.initCX) / t.sc
    const dy = -(e.target.y() - drag.initCY) / t.sc   // Y-axis is inverted in DXF
    dragDeltaRef.current = { dx, dy }
    setDragDelta({ dx, dy })
  }, [t.sc])

  const onMidDragEnd = useCallback(() => {
    const drag = activeDragRef.current
    if (!drag) return
    const delta = dragDeltaRef.current
    setWalls(prev => applyDrag(prev, drag, delta))
    activeDragRef.current = null
    setActiveDrag(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [applyDrag])

  /** Move an arc and all its associated door-frame lines by (dx, dy) in world metres. */
  const moveArcAndLines = useCallback((arcHandle: string, dx: number, dy: number) => {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
    const arcKey = arcHandle.replace(/^arc-/, '')
    setPlanDoc(prev => ({
      ...prev,
      arcs: prev.arcs.map(a =>
        a.handle !== arcHandle ? a : {
          ...a,
          center: { x: a.center.x + dx, y: a.center.y + dy, z: a.center.z },
        },
      ),
      lines: prev.lines.map(l => {
        if (!l.handle.startsWith(`dfl-${arcKey}`)) return l
        return {
          ...l,
          start: { ...l.start, x: l.start.x + dx, y: l.start.y + dy },
          end:   { ...l.end,   x: l.end.x   + dx, y: l.end.y   + dy },
        }
      }),
    }))
  }, [])

  /** Move all window lines that belong to `winKey` by (dx, dy) in world metres. */
  const moveWindowLines = useCallback((winKey: string, dx: number, dy: number) => {
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return
    setPlanDoc(prev => ({
      ...prev,
      lines: prev.lines.map(l => {
        if (!l.handle.startsWith(`win-${winKey}`)) return l
        return {
          ...l,
          start: { ...l.start, x: l.start.x + dx, y: l.start.y + dy },
          end:   { ...l.end,   x: l.end.x   + dx, y: l.end.y   + dy },
        }
      }),
    }))
  }, [])

  /** Windows grouped by key (e.g. "u45") for dragging as a unit. */
  const windowGroups = useMemo(() => {
    const groups = new Map<string, DxfLine[]>()
    for (const ln of planDoc.lines) {
      if (!ln.handle.startsWith('win-')) continue
      const key = ln.handle.replace(/^win-/, '').replace(/-\d+$/, '')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(ln)
    }
    return Array.from(groups.entries()).map(([key, lines]) => ({ key, lines }))
  }, [planDoc.lines])

  const onRoomMoveDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (selectedRoomIndex === null || activeDragRef.current) return
    const snapshotRooms = detectRooms(wallsBase)
    const poly = snapshotRooms[selectedRoomIndex]
    if (!poly) return
    const idsArr = wallIdsOnRoomBoundary(poly, wallsBase)
    if (!idsArr.length) return
    snapshot()
    const drag: RoomDrag = {
      wallIds: new Set(idsArr),
      initCX: e.target.x(),
      initCY: e.target.y(),
    }
    roomDragRef.current = drag
    setRoomDrag(drag)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }
    setRoomDragDelta({ dx: 0, dy: 0 })
    setIsDraggingRoom(true)
  }, [selectedRoomIndex, wallsBase, snapshot])

  const onRoomMoveDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const drag = roomDragRef.current
    if (!drag) return
    const dx = (e.target.x() - drag.initCX) / t.sc
    const dy = -(e.target.y() - drag.initCY) / t.sc
    roomDragDeltaRef.current = { dx, dy }
    setRoomDragDelta({ dx, dy })
    e.target.position({ x: drag.initCX, y: drag.initCY })
  }, [t.sc])

  const onRoomMoveDragEnd = useCallback(() => {
    const drag = roomDragRef.current
    if (!drag) return
    const { dx, dy } = roomDragDeltaRef.current
    const idList = [...drag.wallIds]
    roomDragRef.current = null
    setRoomDrag(null)
    roomDragDeltaRef.current = { dx: 0, dy: 0 }
    setRoomDragDelta({ dx: 0, dy: 0 })
    setIsDraggingRoom(false)
    if (dx === 0 && dy === 0) return
    setWalls(prev => translateWallsByIds(prev, drag.wallIds, dx, dy))
    setPlanDoc(prev => applyRoomDeltaToDoc(prev, idList, dx, dy))
  }, [])

  /* ── zoom via wheel ── */
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current; if (!stage) return
    const pt = stage.getPointerPosition() ?? { x: 0, y: 0 }
    const mpX = (pt.x - pos.x) / zoom, mpY = (pt.y - pos.y) / zoom
    const nz = Math.min(8, Math.max(0.25, zoom * (e.evt.deltaY < 0 ? 1.12 : 0.9)))
    setZoom(nz)
    setPos({ x: pt.x - mpX * nz, y: pt.y - mpY * nz })
  }, [zoom, pos])

  /* ── derived values ── */
  const HR  = HP_SCR / zoom   // endpoint handle radius in canvas units
  const MH  = 7 / zoom        // mid-handle half-size
  const visWalls = useMemo(
    () => (showDetail ? walls : walls.filter(w => !w.isDetail)),
    [walls, showDetail],
  )

  const gridLines = useMemo(() => {
    const sw = stageSize.w
    const sh = stageSize.h
    const lines = []
    for (let i = 0; i <= sw; i += 40) lines.push(<Line key={`gv${i}`} points={[i, 0, i, sh]} stroke="#e4e4e7" strokeWidth={0.5} listening={false} />)
    for (let j = 0; j <= sh; j += 40) lines.push(<Line key={`gh${j}`} points={[0, j, sw, j]} stroke="#e4e4e7" strokeWidth={0.5} listening={false} />)
    return lines
  }, [stageSize.w, stageSize.h])

  const formatArea = useCallback((m2: number) => {
    if (units === 'm') return `${Math.abs(m2).toFixed(2)} m²`
    if (units === 'cm') return `${(Math.abs(m2) * 10000).toFixed(0)} cm²`
    return `${(Math.abs(m2) * 1e6).toFixed(0)} mm²`
  }, [units])

  /** Walls with room move + midpoint drag previews applied. */
  const effectiveWalls = useMemo(() => {
    let ws = visWalls
    if (roomDrag)
      ws = translateWallsByIds(ws, roomDrag.wallIds, roomDragDelta.dx, roomDragDelta.dy)
    if (activeDrag)
      ws = applyDrag(ws, activeDrag, dragDelta)
    return ws
  }, [visWalls, roomDrag, roomDragDelta, activeDrag, dragDelta, applyDrag])

  /** Wall length in metres */
  const wallLength = (w: WallSeg) =>
    Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)

  /** Format a length according to the chosen units */
  const fmtLen = useCallback((m: number) => {
    if (units === 'cm')  return `${(m * 100).toFixed(2)} cm`
    if (units === 'mm')  return `${(m * 1000).toFixed(0)} mm`
    return `${m.toFixed(2)} m`
  }, [units])

  /* ── exports ── */
  const exportPng = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' })
    const base = (planDoc.source_file ?? 'floor-plan').replace(/\.dxf$/i, '')
    triggerDownload(dataURL, `${base}.png`)
  }, [planDoc.source_file])

  const exportDxf = useCallback(() => {
    const dxfStr = docToDxfString(planDoc)
    const blob = new Blob([dxfStr], { type: 'application/dxf' })
    const url = URL.createObjectURL(blob)
    const base = (planDoc.source_file ?? 'floor-plan').replace(/\.dxf$/i, '')
    triggerDownload(url, `${base}-exported.dxf`)
    URL.revokeObjectURL(url)
  }, [planDoc])

  /**
   * Only the Hand tool (or Space-bar held) should pan the canvas.
   * In Select mode the stage must NOT be draggable — otherwise a slight pointer
   * movement while clicking a wall triggers a canvas pan instead of a selection.
   */
  const stageDraggable = (activeTool === 'hand' || spaceHeld) && !isDraggingEp && !isDraggingRoom

  const handleStageMouseMove = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const p = stage.getPointerPosition()
    if (!p) return
    const [wx, wy] = toW(p.x, p.y, t)
    if (activeTool === 'drawLine' && drawLineAnchorRef.current) {
      const snapped = getSnap(wx, wy, '')
      setDrawLinePointer(snapped)
      return
    }
    if (activeTool === 'drawPolyline' && polylineDraftRef.current.length > 0) {
      setPolylineHover(getSnap(wx, wy, ''))
    }
    else if (activeTool === 'drawPolyline') {
      setPolylineHover(null)
    }
    if (activeTool === 'drawArc' || activeTool === 'drawCircle') {
      setShapePointer({ x: wx, y: wy })
    }
  }, [activeTool, t, getSnap])

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return
    const stage = stageRef.current
    if (!stage) return
    const p = stage.getPointerPosition()
    if (!p) return
    const [wx, wy] = toW(p.x, p.y, t)

    if (activeTool === 'drawLine') {
      const snapped = getSnap(wx, wy, '')
      if (!drawLineAnchorRef.current) {
        drawLineAnchorRef.current = snapped
        setDrawLineAnchor(snapped)
        setDrawLinePointer(snapped)
        return
      }
      const start = drawLineAnchorRef.current
      const end = snapped
      drawLineAnchorRef.current = null
      setDrawLineAnchor(null)
      setDrawLinePointer(null)
      if (Math.hypot(end.x - start.x, end.y - start.y) < 0.02) return
      snapshot()
      const { next, handle } = appendUserLine(planDoc, start, end)
      const newId = `ln-${handle}`
      setPlanDoc(next)
      setWalls(w => [...w, {
        id: newId,
        start: { ...start },
        end: { ...end },
        isOuter: false,
        isDetail: false,
      }])
      /* Auto-select the new wall so endpoint handles are immediately draggable */
      setSelectedId(newId)
      setSelectedRoomIndex(null)
      setSelectedTextHandle(null)
      setActiveTool('select')
      return
    }

    if (activeTool === 'drawPolyline') {
      const snapped = getSnap(wx, wy, '')
      const nextDraft = [...polylineDraftRef.current, snapped]
      polylineDraftRef.current = nextDraft
      setPolylineDraft(nextDraft)
      return
    }

    if (activeTool === 'text') {
      snapshot()
      const { next, handle } = appendUserText(planDoc, { x: wx, y: wy })
      setPlanDoc(next)
      setShowLabels(true)
      setSelectedId(null)
      setSelectedRoomIndex(null)
      setSelectedTextHandle(handle)
      return
    }

    if (activeTool === 'drawArc') {
      if (!arcDraftCenter) {
        setArcDraftCenter({ x: wx, y: wy })
        setArcDraftRadius(null)
        setArcDraftStartAngle(null)
        return
      }
      const dx = wx - arcDraftCenter.x
      const dy = wy - arcDraftCenter.y
      const angle = Math.atan2(dy, dx) * (180 / Math.PI)
      const radius = Math.hypot(dx, dy)
      if (arcDraftRadius === null) {
        if (radius < 0.01) return
        setArcDraftRadius(radius)
        setArcDraftStartAngle(angle)
        return
      }
      /* Step 3 — commit arc */
      let endAngle = angle
      if (endAngle <= arcDraftStartAngle!) endAngle += 360
      snapshot()
      const { next } = appendUserArc(planDoc, arcDraftCenter, arcDraftRadius, arcDraftStartAngle!, endAngle)
      setPlanDoc(next)
      setArcDraftCenter(null)
      setArcDraftRadius(null)
      setArcDraftStartAngle(null)
      setShapePointer(null)
      setActiveTool('select')
      return
    }

    if (activeTool === 'drawCircle') {
      if (!circleDraftCenter) {
        setCircleDraftCenter({ x: wx, y: wy })
        return
      }
      const radius = Math.hypot(wx - circleDraftCenter.x, wy - circleDraftCenter.y)
      if (radius < 0.01) return
      snapshot()
      const { next } = appendUserArc(planDoc, circleDraftCenter, radius, 0, 360)
      setPlanDoc(next)
      setCircleDraftCenter(null)
      setShapePointer(null)
      setActiveTool('select')
      return
    }

    setSelectedId(null)
    setSelectedRoomIndex(null)
    setSelectedTextHandle(null)
    setSelectedArcHandle(null)
    setSelectedWinKey(null)
  }, [activeTool, t, getSnap, planDoc, snapshot, setActiveTool,
      arcDraftCenter, arcDraftRadius, arcDraftStartAngle, circleDraftCenter])

  const finishPolyline = useCallback(() => {
    const pts = polylineDraftRef.current
    if (pts.length < 2) return
    const closed = polylineClosed && pts.length >= 3
    snapshot()
    const { next, poly } = appendUserPolyline(planDoc, pts, closed)
    const newSegs = wallSegsFromPolyline(poly, false)
    setPlanDoc(next)
    setWalls(w => [...w, ...newSegs])
    polylineDraftRef.current = []
    setPolylineDraft([])
    setPolylineHover(null)
    /* Auto-select first segment and switch to Select so handles are ready */
    if (newSegs.length > 0) {
      setSelectedId(newSegs[0].id)
      setSelectedRoomIndex(null)
      setSelectedTextHandle(null)
      setActiveTool('select')
    }
  }, [planDoc, snapshot, polylineClosed, setActiveTool])

  useEffect(() => {
    finishPolylineRef.current = finishPolyline
  }, [finishPolyline])

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTextHandle) {
          snapshot()
          setPlanDoc(p => removeTextFromDoc(p, selectedTextHandle))
          setSelectedTextHandle(null)
        }
        else if (selectedId) {
          snapshot()
          const ph = polylineHandleFromWallId(selectedId)
          if (ph) {
            setPlanDoc(p => removePolylineFromDocByHandle(p, ph))
            setWalls(p => p.filter(w => !w.id.startsWith(`pl-${ph}-`)))
          }
          else {
            setPlanDoc(p => removeLineFromDocByWallId(p, selectedId))
            setWalls(p => p.filter(w => w.id !== selectedId))
          }
          setSelectedId(null)
        }
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault(); undo()
      }
      if (e.key === 'Enter' && activeTool === 'drawPolyline' && polylineDraftRef.current.length >= 2) {
        e.preventDefault()
        finishPolylineRef.current()
      }
      if (e.key === 'Escape') {
        setSelectedId(null)
        setSelectedRoomIndex(null)
        setSelectedTextHandle(null)
        setSelectedArcHandle(null)
        setSelectedWinKey(null)
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
      }
      if (e.code === 'Space' && !e.repeat) { e.preventDefault(); setSpaceHeld(true) }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedId, selectedTextHandle, snapshot, undo, activeTool])

  const doc = planDoc
  const selectedTextEntity = selectedTextHandle
    ? doc.texts.find(tx => tx.handle === selectedTextHandle)
    : undefined

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
        <Link to="/" className="dxf-editor-home">Home</Link>
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
            <button
              type="button"
              className={`dxf-layer-item${showLabels ? ' active' : ''}`}
              onClick={() => setShowLabels(v => !v)}
            >
              <span className="dxf-layer-icon dxf-layer-text" /> Room labels
            </button>
          </div>
          <div className="dxf-rail-section compact">
            <div className="dxf-rail-label">Rooms</div>
            {rooms.length === 0
              ? <p className="dxf-note">Close loops to detect rooms.</p>
              : rooms.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className={`dxf-room-pill small${selectedRoomIndex === i ? ' active' : ''}`}
                  style={{ borderLeftColor: ROOM_STROKES[i % ROOM_STROKES.length] }}
                  onClick={() => {
                    setActiveTool('select')
                    setSelectedId(null)
                    setSelectedTextHandle(null)
                    setSelectedRoomIndex(selectedRoomIndex === i ? null : i)
                  }}
                >
                  R{i + 1} · <strong>{formatArea(polyArea(r))}</strong>
                </button>
              ))}
          </div>
        </aside>

        {/* ── Center: toolbar + white canvas + prompt ── */}
        <main className="dxf-editor-main">
          <div className="dxf-main-tools" role="toolbar" aria-label="Editor tools">
            {([
              { id: 'select'      as const, label: 'Select' },
              { id: 'hand'        as const, label: 'Pan' },
              { id: 'frame'       as const, label: 'Frame' },
              { id: 'drawLine'    as const, label: 'Line' },
              { id: 'drawPolyline'as const, label: 'Polyline' },
              { id: 'drawArc'     as const, label: 'Arc' },
              { id: 'drawCircle'  as const, label: 'Circle' },
              { id: 'text'        as const, label: 'Text' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                title={label}
                className={`dxf-tool-icon dxf-tool-labeled${activeTool === id ? ' active' : ''}`}
                onClick={() => {
                  if (id !== 'drawLine') {
                    drawLineAnchorRef.current = null
                    setDrawLineAnchor(null)
                    setDrawLinePointer(null)
                  }
                  if (id !== 'drawPolyline') {
                    polylineDraftRef.current = []
                    setPolylineDraft([])
                    setPolylineHover(null)
                  }
                  if (id !== 'drawArc') {
                    setArcDraftCenter(null)
                    setArcDraftRadius(null)
                    setArcDraftStartAngle(null)
                  }
                  if (id !== 'drawCircle') {
                    setCircleDraftCenter(null)
                  }
                  if (id !== 'drawArc' && id !== 'drawCircle') {
                    setShapePointer(null)
                  }
                  setActiveTool(id)
                }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {id === 'select'       && <path d="M4 4l7 7-4 1-3-4z" />}
                  {id === 'hand'         && (
                    <>
                      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                      <path d="M18 11a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 19" />
                    </>
                  )}
                  {id === 'frame'        && <rect x="5" y="5" width="14" height="14" rx="1" />}
                  {id === 'drawLine'     && <path d="M3 21l4.5-4.5M12 3l6 6-9 9H3v-6l9-9z" />}
                  {id === 'drawPolyline' && <path d="M4 16l4-6 4 5 4-8 4 6" />}
                  {id === 'drawArc'      && <path d="M3 19 A10 10 0 0 1 21 19" />}
                  {id === 'drawCircle'   && <circle cx="12" cy="12" r="9" />}
                  {id === 'text'         && <><path d="M4 6h16M10 6v14M14 6v14" /></>}
                </svg>
                {(['drawLine','drawPolyline','drawArc','drawCircle'] as string[]).includes(id) &&
                  <span className="dxf-tool-caption">{label}</span>}
              </button>
            ))}
          </div>

          {(['drawLine','drawPolyline','drawArc','drawCircle','text'] as string[]).includes(activeTool) && (
            <p className="dxf-note" style={{ margin: '0 0 8px 0' }}>
              {activeTool === 'drawLine' && (
                drawLineAnchor
                  ? 'Line: click again to set the end point (Esc cancels).'
                  : 'Line: click start, then click end. See Add walls in the right panel. Snaps when Snap is on.'
              )}
              {activeTool === 'drawPolyline' && (
                polylineDraft.length === 0
                  ? 'Polyline: each click adds a vertex. Turn on Close path if you want a loop, then Enter or Finish.'
                  : `Polyline: ${polylineDraft.length} vertex(ices). Enter or Finish to add to the plan; Esc cancels.`
              )}
              {activeTool === 'drawArc' && (
                !arcDraftCenter
                  ? 'Arc: click to place the center point.'
                  : arcDraftRadius === null
                    ? 'Arc: click to set the start angle and radius.'
                    : 'Arc: click to set the end angle and place the arc (Esc cancels).'
              )}
              {activeTool === 'drawCircle' && (
                !circleDraftCenter
                  ? 'Circle: click to place the center point.'
                  : 'Circle: click anywhere to set the radius and place the circle (Esc cancels).'
              )}
              {activeTool === 'text' && (
                'Text: click empty space to place. Turn on Room labels if hidden. Select a label to move it, drag the blue handle to resize, or edit below.'
              )}
            </p>
          )}

          <div className="dxf-canvas-frame">
            <div ref={canvasHostRef} className="dxf-canvas-host">
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
            onMouseMove={handleStageMouseMove}
            onClick={handleStageClick}
            style={{
              display: 'block',
              cursor: isDraggingEp
                ? 'crosshair'
                : (activeTool === 'hand' || spaceHeld)
                  ? 'grab'
                  : ['drawLine','drawPolyline','drawArc','drawCircle','text'].includes(activeTool)
                    ? 'crosshair'
                    : 'default',
            }}
          >

            {/* ── white artboard + light grid (Synaps-style) ── */}
            <Layer listening={false}>
              <Rect x={0} y={0} width={stageSize.w} height={stageSize.h} fill="#ffffff" />
              {gridLines}
            </Layer>

            {/* ── room colour fills (below walls: edge clicks hit walls first) ── */}
            <Layer listening={activeTool === 'select' && !spaceHeld}>
              {rooms.map((room, i) => {
                const isRoomSel = selectedRoomIndex === i
                return (
                  <Line
                    key={`room-${i}`}
                    points={room.flatMap(p => toC(p.x, p.y, t))}
                  closed
                  fill={ROOM_COLORS[i % ROOM_COLORS.length]}
                  stroke={isRoomSel ? '#f59e0b' : ROOM_STROKES[i % ROOM_STROKES.length]}
                  strokeWidth={(isRoomSel ? 2.4 : 1) / zoom}
                  onClick={(e) => {
                    e.cancelBubble = true
                    setSelectedId(null)
                    setSelectedTextHandle(null)
                    setSelectedRoomIndex(isRoomSel ? null : i)
                  }}
                />
                )
              })}
            </Layer>

            {/* ── doors (arcs + frame lines) + windows — draggable in Select mode ── */}
            <Layer listening={activeTool === 'select' && !spaceHeld}>

              {/* ── Windows — grouped by key so they drag as one unit ── */}
              {windowGroups.map(({ key, lines }) => {
                const isSelWin = selectedWinKey === key
                const winColor = isSelWin ? '#f59e0b' : strokeHex
                const sw = (1.5 * strokeScale) / zoom
                return (
                  <Group
                    key={`wingrp-${key}`}
                    draggable
                    onDragStart={e => {
                      e.cancelBubble = true
                      snapshot()
                      setSelectedWinKey(key)
                      setSelectedArcHandle(null)
                      setSelectedId(null)
                      setSelectedTextHandle(null)
                      setSelectedRoomIndex(null)
                    }}
                    onDragEnd={e => {
                      const dcx = e.target.x()
                      const dcy = e.target.y()
                      e.target.position({ x: 0, y: 0 })
                      moveWindowLines(key, dcx / t.sc, -dcy / t.sc)
                    }}
                    onClick={e => {
                      e.cancelBubble = true
                      setSelectedId(null)
                      setSelectedArcHandle(null)
                      setSelectedTextHandle(null)
                      setSelectedRoomIndex(null)
                      setSelectedWinKey(isSelWin ? null : key)
                    }}
                    onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                    onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                  >
                    {lines.map(ln => {
                      const [x1, y1] = toC(ln.start.x, ln.start.y, t)
                      const [x2, y2] = toC(ln.end.x, ln.end.y, t)
                      return (
                        <Line
                          key={ln.handle}
                          points={[x1, y1, x2, y2]}
                          stroke={winColor}
                          strokeWidth={sw}
                          lineCap="round"
                          hitStrokeWidth={10 / zoom}
                        />
                      )
                    })}
                  </Group>
                )
              })}

              {/* ── Door arcs + associated frame lines ── */}
              {planDoc.arcs.map((arc) => {
                const isFullCircle = arc.end_angle - arc.start_angle >= 360
                const isSelArc  = selectedArcHandle === arc.handle
                const arcKey    = arc.handle.replace(/^arc-/, '')
                const frameLines = planDoc.lines.filter(ln => ln.handle.startsWith(`dfl-${arcKey}`))
                const arcColor  = isSelArc ? '#f59e0b' : strokeHex
                const sw = (1.5 * strokeScale) / zoom
                const [arcCx, arcCy] = toC(arc.center.x, arc.center.y, t)
                const rCanvas = arc.radius * t.sc

                return (
                  <Group
                    key={arc.handle}
                    draggable
                    onDragStart={e => {
                      e.cancelBubble = true
                      snapshot()
                      setSelectedArcHandle(arc.handle)
                      setSelectedWinKey(null)
                      setSelectedId(null)
                      setSelectedTextHandle(null)
                      setSelectedRoomIndex(null)
                    }}
                    onDragEnd={e => {
                      const dcx = e.target.x()
                      const dcy = e.target.y()
                      e.target.position({ x: 0, y: 0 })
                      moveArcAndLines(arc.handle, dcx / t.sc, -dcy / t.sc)
                    }}
                    onClick={e => {
                      e.cancelBubble = true
                      setSelectedId(null)
                      setSelectedWinKey(null)
                      setSelectedTextHandle(null)
                      setSelectedRoomIndex(null)
                      setSelectedArcHandle(isSelArc ? null : arc.handle)
                    }}
                    onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                    onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                  >
                    {/* arc sweep — or full circle */}
                    {isFullCircle ? (
                      <Circle
                        x={arcCx} y={arcCy}
                        radius={rCanvas}
                        stroke={arcColor}
                        strokeWidth={sw}
                        fill="transparent"
                        hitStrokeWidth={10 / zoom}
                      />
                    ) : (
                      <Line
                        points={arcPoints(arc, t)}
                        stroke={arcColor}
                        strokeWidth={sw}
                        lineCap="round"
                        lineJoin="round"
                        hitStrokeWidth={10 / zoom}
                      />
                    )}
                    {/* door frame lines */}
                    {frameLines.map(ln => {
                      const [x1, y1] = toC(ln.start.x, ln.start.y, t)
                      const [x2, y2] = toC(ln.end.x, ln.end.y, t)
                      return (
                        <Line
                          key={ln.handle}
                          points={[x1, y1, x2, y2]}
                          stroke={arcColor}
                          strokeWidth={sw}
                          lineCap="round"
                          listening={false}
                        />
                      )
                    })}
                  </Group>
                )
              })}
            </Layer>

            {/* ── walls + midpoint handles (pass 1 — bodies only) ── */}
            <Layer>
              {effectiveWalls.map(wall => {
                const [sx, sy] = toC(wall.start.x, wall.start.y, t)
                const [ex, ey] = toC(wall.end.x,   wall.end.y,   t)
                const midX = (sx + ex) / 2, midY = (sy + ey) / 2
                const isSel      = selectedId === wall.id
                const isDragging = activeDrag?.wallId === wall.id
                const showDim = (isSel || isDragging) && !wall.isDetail

                const wallColor = wall.isDetail ? '#60a5fa' : strokeHex
                const strokeW   = ((wall.isOuter ? 2.8 : wall.isDetail ? 0.65 : 1.15) * strokeScale) / zoom

                const lenLabel = showDim ? fmtLen(wallLength(wall)) : null
                const wallAngle  = Math.atan2(ey - sy, ex - sx)
                const perpOffset = 18 / zoom
                const labelX     = midX - Math.sin(wallAngle) * perpOffset
                const labelY     = midY + Math.cos(wallAngle) * perpOffset
                const labelFontSize = Math.max(9, 11 / zoom)

                return (
                  <Group key={wall.id}>
                    {/* wide invisible click / drag area */}
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke="transparent"
                      strokeWidth={16 / zoom}
                      onClick={e => {
                        e.cancelBubble = true
                        setSelectedTextHandle(null)
                        setSelectedRoomIndex(null)
                        setSelectedArcHandle(null)
                        if (activeTool !== 'select') return
                        setSelectedId(isSel ? null : wall.id)
                      }}
                    />

                    {/* visible wall line */}
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke={isDragging ? '#3b82f6' : isSel ? '#f59e0b' : wallColor}
                      strokeWidth={(isDragging || isSel) ? 2.2 / zoom : strokeW}
                      lineCap="round"
                      listening={false}
                    />

                    {/* live dimension label */}
                    {lenLabel && (
                      <Group listening={false}>
                        <Rect
                          x={labelX - (labelFontSize * lenLabel.length * 0.32)}
                          y={labelY - labelFontSize * 0.7}
                          width={labelFontSize * lenLabel.length * 0.64}
                          height={labelFontSize * 1.4}
                          fill="#2563eb"
                          cornerRadius={labelFontSize * 0.35}
                          opacity={0.92}
                        />
                        <Text
                          x={labelX - (labelFontSize * lenLabel.length * 0.32)}
                          y={labelY - labelFontSize * 0.52}
                          width={labelFontSize * lenLabel.length * 0.64}
                          text={lenLabel}
                          fontSize={labelFontSize}
                          fontStyle="bold"
                          fontFamily="system-ui,-apple-system,'Segoe UI',sans-serif"
                          fill="#ffffff"
                          align="center"
                        />
                      </Group>
                    )}

                    {/* mid-point square — only for non-selected, non-detail walls.
                        The selected wall's midpoint is re-rendered in pass 2c (on top). */}
                    {!wall.isDetail && wall.id !== selectedId && (
                      <Rect
                        x={midX - MH} y={midY - MH}
                        width={MH * 2} height={MH * 2}
                        fill="#334155"
                        stroke="#64748b" strokeWidth={0.8 / zoom}
                        cornerRadius={2 / zoom}
                        draggable
                        onDragStart={e => { e.cancelBubble = true; onMidDragStart(e, wall) }}
                        onDragMove={e => { e.cancelBubble = true; onMidDragMove(e) }}
                        onDragEnd={onMidDragEnd}
                        onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                        onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                      />
                    )}
                  </Group>
                )
              })}

              {/*
               * ── Endpoint circles — three-pass z-order guarantee ──
               *
               * Pass 2a: unselected walls' endpoints (below selected)
               * Pass 2b: selected wall's midpoint square (must move with the wall)
               * Pass 2c: selected wall's endpoints — rendered ABSOLUTELY LAST so they
               *          are always on top of every other wall body and every crossing
               *          wall's hit-line, making them always clickable / draggable.
               */}
              {/* 2a — unselected endpoint dots (invisible, no interaction when not selected) */}
              {effectiveWalls
                .filter(w => !w.isDetail && w.id !== selectedId)
                .map(wall => {
                  const [sx, sy] = toC(wall.start.x, wall.start.y, t)
                  const [ex, ey] = toC(wall.end.x,   wall.end.y,   t)
                  return (
                    <Group key={`ep-${wall.id}`}>
                      <Circle x={sx} y={sy} radius={HR} fill="transparent" stroke="transparent" hitStrokeWidth={0} listening={false} />
                      <Circle x={ex} y={ey} radius={HR} fill="transparent" stroke="transparent" hitStrokeWidth={0} listening={false} />
                    </Group>
                  )
                })
              }

              {/* 2c — SELECTED wall: midpoint square + endpoint circles, on top of everything */}
              {(() => {
                const wall = effectiveWalls.find(w => w.id === selectedId && !w.isDetail)
                if (!wall) return null
                const [sx, sy] = toC(wall.start.x, wall.start.y, t)
                const [ex, ey] = toC(wall.end.x,   wall.end.y,   t)
                const midX = (sx + ex) / 2, midY = (sy + ey) / 2
                const isDragging = activeDrag?.wallId === wall.id
                return (
                  <Group key={`ep-sel-${wall.id}`}>
                    {/* midpoint square re-rendered on top so it's also above crossings */}
                    <Rect
                      x={midX - MH} y={midY - MH}
                      width={MH * 2} height={MH * 2}
                      fill={isDragging ? '#2563eb' : '#334155'}
                      stroke="#64748b" strokeWidth={0.8 / zoom}
                      cornerRadius={2 / zoom}
                      draggable
                      onDragStart={e => { e.cancelBubble = true; onMidDragStart(e, wall) }}
                      onDragMove={e => { e.cancelBubble = true; onMidDragMove(e) }}
                      onDragEnd={onMidDragEnd}
                      onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    />
                    {/* start endpoint — always topmost */}
                    <Circle
                      x={sx} y={sy}
                      radius={HR}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={1.2 / zoom}
                      hitStrokeWidth={HR * 1.6}
                      draggable
                      onDragStart={() => { setSelectedRoomIndex(null); snapshot(); setIsDraggingEp(true) }}
                      onDragMove={e => onEpDragMove(e, wall.id, 'start')}
                      onDragEnd={onEpDragEnd}
                      onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    />
                    {/* end endpoint — always topmost */}
                    <Circle
                      x={ex} y={ey}
                      radius={HR}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={1.2 / zoom}
                      hitStrokeWidth={HR * 1.6}
                      draggable
                      onDragStart={() => { setSelectedRoomIndex(null); snapshot(); setIsDraggingEp(true) }}
                      onDragMove={e => onEpDragMove(e, wall.id, 'end')}
                      onDragEnd={onEpDragEnd}
                      onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    />
                  </Group>
                )
              })()}

              {/* ── snap indicator ── */}
              {snapTarget && (() => {
                const [scx, scy] = toC(snapTarget.x, snapTarget.y, t)
                return (
                  <Circle
                    x={scx} y={scy}
                    radius={10 / zoom}
                    stroke="#f59e0b" strokeWidth={2 / zoom}
                    fill="rgba(245,158,11,0.2)"
                    listening={false}
                  />
                )
              })()}

              {activeTool === 'drawLine' && drawLineAnchor && drawLinePointer && (
                <Line
                  points={[
                    ...toC(drawLineAnchor.x, drawLineAnchor.y, t),
                    ...toC(drawLinePointer.x, drawLinePointer.y, t),
                  ]}
                  stroke="#3b82f6"
                  strokeWidth={1.5 / zoom}
                  lineCap="round"
                  dash={[8 / zoom, 6 / zoom]}
                  listening={false}
                />
              )}

              {activeTool === 'drawPolyline' && polylineDraft.length >= 1 && polylineHover && (
                <Group listening={false}>
                  {polylineDraft.length >= 2 && (
                    <Line
                      points={polylineDraft.flatMap(p => toC(p.x, p.y, t))}
                      stroke="#3b82f6"
                      strokeWidth={1.5 / zoom}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                  <Line
                    points={[
                      ...toC(polylineDraft[polylineDraft.length - 1].x, polylineDraft[polylineDraft.length - 1].y, t),
                      ...toC(polylineHover.x, polylineHover.y, t),
                    ]}
                    stroke="#3b82f6"
                    strokeWidth={1.5 / zoom}
                    lineCap="round"
                    dash={[8 / zoom, 6 / zoom]}
                  />
                </Group>
              )}

              {/* ── Arc draw preview ── */}
              {activeTool === 'drawArc' && shapePointer && arcDraftCenter && (() => {
                const [cx, cy] = toC(arcDraftCenter.x, arcDraftCenter.y, t)
                const [px, py] = toC(shapePointer.x, shapePointer.y, t)
                const rawDx = shapePointer.x - arcDraftCenter.x
                const rawDy = shapePointer.y - arcDraftCenter.y
                const pAngle = Math.atan2(rawDy, rawDx) * (180 / Math.PI)
                const pRadius = Math.hypot(rawDx, rawDy)

                if (arcDraftRadius === null) {
                  /* Phase 1: show radius line from center to pointer */
                  return (
                    <Group listening={false}>
                      <Circle x={cx} y={cy} radius={5 / zoom} fill="#3b82f6" />
                      <Line points={[cx, cy, px, py]} stroke="#3b82f6" strokeWidth={1.5 / zoom} dash={[6 / zoom, 4 / zoom]} />
                      <Text x={px + 6 / zoom} y={py - 10 / zoom} text={fmtLen(pRadius)} fill="#3b82f6" fontSize={11 / zoom} listening={false} />
                    </Group>
                  )
                }
                /* Phase 2: show arc sweep from start angle to pointer angle */
                let endAngle = pAngle
                if (endAngle <= arcDraftStartAngle!) endAngle += 360
                const previewArc: DxfArc = {
                  entity_type: 'ARC', handle: '__preview__', layer: '0',
                  center: { x: arcDraftCenter.x, y: arcDraftCenter.y, z: 0 }, radius: arcDraftRadius,
                  start_angle: arcDraftStartAngle!, end_angle: endAngle,
                }
                return (
                  <Group listening={false}>
                    <Circle x={cx} y={cy} radius={5 / zoom} fill="#3b82f6" />
                    <Line
                      points={arcPoints(previewArc, t, 64)}
                      stroke="#3b82f6" strokeWidth={1.5 / zoom}
                      lineCap="round" lineJoin="round"
                      dash={[6 / zoom, 4 / zoom]}
                    />
                  </Group>
                )
              })()}
              {activeTool === 'drawArc' && !arcDraftCenter && shapePointer && (() => {
                /* No center yet — just show crosshair dot at pointer */
                const [px, py] = toC(shapePointer.x, shapePointer.y, t)
                return <Circle x={px} y={py} radius={5 / zoom} fill="#3b82f6" listening={false} />
              })()}

              {/* ── Circle draw preview ── */}
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
                    <Circle
                      x={cx} y={cy}
                      radius={radius * t.sc}
                      stroke="#3b82f6" strokeWidth={1.5 / zoom}
                      fill="transparent"
                      dash={[6 / zoom, 4 / zoom]}
                    />
                    <Text
                      x={cx + radius * t.sc / Math.SQRT2 + 4 / zoom}
                      y={cy - radius * t.sc / Math.SQRT2 - 14 / zoom}
                      text={`r = ${fmtLen(radius)}`}
                      fill="#3b82f6" fontSize={11 / zoom} listening={false}
                    />
                  </Group>
                )
              })()}

            </Layer>

            {/* ── room labels (MTEXT) ── */}
            {showLabels && (
              <Layer>
                {doc.texts.map(tx => {
                  const lines = tx.text.split('\n')
                  const [lx, ly] = toC(tx.position.x, tx.position.y, t)
                  const fs = Math.max(7, tx.height * t.sc * 3.5)
                  const isTxtSel = selectedTextHandle === tx.handle
                  const estW = Math.max(fs * 3, (lines[0]?.length ?? 1) * fs * 0.52)
                  const boxH = fs * (lines[1] ? 2.15 : 1) + 8 / zoom
                  const handleY = fs * 0.2
                  const canDragText = isTxtSel && activeTool === 'select' && !spaceHeld

                  return (
                    <Group
                      key={tx.handle}
                      x={lx}
                      y={ly}
                      draggable={canDragText}
                      onClick={(e) => {
                        e.cancelBubble = true
                        if (activeTool === 'hand' || spaceHeld) return
                        if (activeTool === 'drawLine' || activeTool === 'drawPolyline') return
                        setSelectedId(null)
                        setSelectedRoomIndex(null)
                        const next = isTxtSel ? null : tx.handle
                        setSelectedTextHandle(next)
                      }}
                      onDragStart={(e) => {
                        if (!canDragText) return
                        e.cancelBubble = true
                        snapshot()
                      }}
                      onDragEnd={(e) => {
                        if (!canDragText) return
                        const n = e.target
                        const [nwx, nwy] = toW(n.x(), n.y(), t)
                        setPlanDoc(prev => ({
                          ...prev,
                          texts: prev.texts.map(t =>
                            t.handle === tx.handle ? { ...t, position: { ...t.position, x: nwx, y: nwy } } : t,
                          ),
                        }))
                      }}
                    >
                      <Text
                        x={0}
                        y={-fs}
                        text={lines[0]}
                        fontSize={fs}
                        fontStyle="bold"
                        fill="#2563eb"
                        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                      />
                      {lines[1] && (
                        <Text
                          x={0}
                          y={-fs + fs * 1.25}
                          text={lines[1]}
                          fontSize={fs * 0.78}
                          fill="#64748b"
                          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                        />
                      )}
                      {isTxtSel && activeTool === 'select' && (
                        <>
                          <Rect
                            x={-4 / zoom}
                            y={-fs - 4 / zoom}
                            width={estW + 8 / zoom}
                            height={boxH}
                            stroke="#f59e0b"
                            strokeWidth={1.2 / zoom}
                            fill="transparent"
                            listening={false}
                          />
                          <Circle
                            x={estW}
                            y={handleY}
                            radius={HR}
                            fill="#3b82f6"
                            stroke="#fff"
                            strokeWidth={1.2 / zoom}
                            draggable
                            onDragStart={(e) => {
                              e.cancelBubble = true
                              snapshot()
                              const stage = e.target.getStage()!
                              const p = stage.getPointerPosition()!
                              const [, wy] = toW(p.x, p.y, t)
                              textHeightDragRef.current = {
                                handle: tx.handle,
                                startH: tx.height,
                                startPointerWy: wy,
                              }
                            }}
                            onDragMove={(e) => {
                              e.cancelBubble = true
                              const r = textHeightDragRef.current
                              if (!r || r.handle !== tx.handle) return
                              const stage = e.target.getStage()!
                              const p = stage.getPointerPosition()!
                              const [, wy] = toW(p.x, p.y, t)
                              const dWy = wy - r.startPointerWy
                              const newH = Math.max(0.05, Math.min(3, r.startH + dWy * 0.45))
                              setPlanDoc(prev => ({
                                ...prev,
                                texts: prev.texts.map(t =>
                                  t.handle === tx.handle ? { ...t, height: newH } : t,
                                ),
                              }))
                              e.target.position({ x: estW, y: handleY })
                            }}
                            onDragEnd={(e) => {
                              e.cancelBubble = true
                              textHeightDragRef.current = null
                              e.target.position({ x: estW, y: handleY })
                            }}
                            onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'ns-resize' }}
                            onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                          />
                        </>
                      )}
                    </Group>
                  )
                })}
              </Layer>
            )}

            {/* Room move handle on top so MTEXT labels do not steal drags */}
            <Layer>
              {activeTool === 'select' && !spaceHeld && selectedRoomIndex !== null && rooms[selectedRoomIndex] && (() => {
                const room = rooms[selectedRoomIndex]
                let ax = 0, ay = 0
                for (const p of room) { ax += p.x; ay += p.y }
                ax /= room.length; ay /= room.length
                const [rcx, rcy] = toC(ax, ay, t)
                return (
                  <Circle
                    x={rcx}
                    y={rcy}
                    radius={Math.max(HR * 1.15, 8 / zoom)}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth={1.2 / zoom}
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
            </div>
          </div>
        </main>

        {/* ── Right: Canvas + Style (properties) ── */}
        <aside className="dxf-right-rail">
          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Add walls</div>
            <p className="dxf-prop-hint">Add LINE (two clicks) or LWPOLYLINE (multi-vertex) to the JSON plan.</p>
            <div className="dxf-add-wall-btns">
              <button
                type="button"
                className={`dxf-action-btn${activeTool === 'drawLine' ? ' dxf-action-btn-active' : ''}`}
                onClick={() => {
                  polylineDraftRef.current = []
                  setPolylineDraft([])
                  setPolylineHover(null)
                  setActiveTool('drawLine')
                }}
              >
                Line
              </button>
              <button
                type="button"
                className={`dxf-action-btn${activeTool === 'drawPolyline' ? ' dxf-action-btn-active' : ''}`}
                onClick={() => {
                  drawLineAnchorRef.current = null
                  setDrawLineAnchor(null)
                  setDrawLinePointer(null)
                  setActiveTool('drawPolyline')
                }}
              >
                Polyline
              </button>
            </div>
            {activeTool === 'drawPolyline' && (
              <>
                <label className="dxf-toggle" style={{ marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={polylineClosed}
                    onChange={e => setPolylineClosed(e.target.checked)}
                  />
                  Close path (≥3 vertices)
                </label>
                <button
                  type="button"
                  className="dxf-action-btn"
                  style={{ marginTop: '8px' }}
                  disabled={polylineDraft.length < 2}
                  onClick={() => finishPolyline()}
                >
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
                <input
                  type="color"
                  value={strokeHex}
                  onChange={e => setStrokeHex(e.target.value)}
                  aria-label="Wall stroke colour"
                />
                <span className="dxf-stroke-hex">{strokeHex}</span>
              </div>
            </label>
            <label className="dxf-prop-field">
              <span>Thickness</span>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={strokeScale}
                onChange={e => setStrokeScale(Number(e.target.value))}
              />
            </label>
            <div className="dxf-prop-hint">Applies to wall segments (non-detail).</div>
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Editing</div>
            <label className="dxf-toggle">
              <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
              Snap endpoints
            </label>
            <label className="dxf-toggle">
              <input type="checkbox" checked={showDetail} onChange={e => setShowDetail(e.target.checked)} />
              Detail lines (stairs)
            </label>
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
                drawLineAnchorRef.current = null
                setDrawLineAnchor(null)
                setDrawLinePointer(null)
                polylineDraftRef.current = []
                setPolylineDraft([])
                setPolylineHover(null)
              }}
            >
              Reset plan
            </button>
            {selectedId && (
              <button type="button" className="dxf-action-btn danger" onClick={() => {
                snapshot()
                const id = selectedId
                const ph = polylineHandleFromWallId(id)
                if (ph) {
                  setPlanDoc(p => removePolylineFromDocByHandle(p, ph))
                  setWalls(p => p.filter(w => !w.id.startsWith(`pl-${ph}-`)))
                }
                else {
                  setPlanDoc(p => removeLineFromDocByWallId(p, id))
                  setWalls(p => p.filter(w => w.id !== id))
                }
                setSelectedId(null)
              }}>Delete selected</button>
            )}
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Export</div>
            <p className="dxf-prop-hint">PNG captures the current view. DXF re-serialises all entities from the live JSON plan.</p>
            <div className="dxf-export-btns">
              <button
                type="button"
                className="dxf-action-btn dxf-export-btn"
                onClick={exportPng}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                </svg>
                PNG
              </button>
              <button
                type="button"
                className="dxf-action-btn dxf-export-btn"
                onClick={exportDxf}
              >
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
              <p className="dxf-prop-hint">
                R{selectedRoomIndex + 1} · <strong>{formatArea(polyArea(rooms[selectedRoomIndex]))}</strong>
                {' — '}drag the orange handle at the centroid to move all boundary walls together (shared walls move with the first room you drag).
              </p>
            </div>
          )}

          {selectedTextEntity && selectedTextHandle && (
            <div className="dxf-prop-panel">
              <div className="dxf-prop-label">Label</div>
              <label className="dxf-prop-field">
                <span>Text</span>
                <textarea
                  className="dxf-prop-textarea"
                  rows={3}
                  value={selectedTextEntity.text}
                  onChange={(e) => {
                    const v = e.target.value
                    const h = selectedTextHandle
                    setPlanDoc(prev => ({
                      ...prev,
                      texts: prev.texts.map(t => (t.handle === h ? { ...t, text: v } : t)),
                    }))
                  }}
                />
              </label>
              <label className="dxf-prop-field">
                <span>Height (m)</span>
                <input
                  type="number"
                  min={0.05}
                  max={3}
                  step={0.01}
                  value={selectedTextEntity.height}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isFinite(v)) return
                    const clamped = Math.max(0.05, Math.min(3, v))
                    const h = selectedTextHandle
                    setPlanDoc(prev => ({
                      ...prev,
                      texts: prev.texts.map(t => (t.handle === h ? { ...t, height: clamped } : t)),
                    }))
                  }}
                />
              </label>
              <div className="dxf-prop-hint">Uses the same MTEXT height → size rule as imported labels.</div>
              <button
                type="button"
                className="dxf-action-btn danger"
                onClick={() => {
                  const h = selectedTextHandle
                  snapshot()
                  setPlanDoc(p => removeTextFromDoc(p, h!))
                  setSelectedTextHandle(null)
                }}
              >
                Delete label
              </button>
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
