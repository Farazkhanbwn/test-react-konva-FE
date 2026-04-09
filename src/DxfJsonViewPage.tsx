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
import { wallsFromDxfJson, sortPolylineVertices, wallSegsFromPolyline } from '@/utils/wallsFromDxfJson'

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

/* ─── Build DxfJsonDocument from current canvas walls ── */
/**
 * Reconstructs the `lines` and `polylines` arrays of a DxfJsonDocument from
 * the live `walls` state so that `docToDxfString` always exports current
 * positions — even after endpoint drags, rotations, or resizes that only
 * update `walls` state without touching `planDoc`.
 *
 * Metadata (extmin/extmax, arcs, texts) is preserved from the source doc.
 */
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
const SNAP_TH     = 0.15   // world metres — endpoint snap threshold
const SNAP_LINE_TH = 0.25  // world metres — snap-to-line threshold (slightly wider)
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

/* ─── Rotation helpers ───────────────────────────── */
/** Rotate point (px, py) around centre (cx, cy) by angle radians (CCW in standard maths). */
function rotatePoint(px: number, py: number, cx: number, cy: number, angle: number): [number, number] {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const dx = px - cx, dy = py - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

/** Return a new wall array with selected walls rotated around (cx, cy) by angle radians. */
function applyRotation(ws: WallSeg[], ids: Set<string>, cx: number, cy: number, angle: number): WallSeg[] {
  if (angle === 0) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const [sx, sy] = rotatePoint(w.start.x, w.start.y, cx, cy, angle)
    const [ex, ey] = rotatePoint(w.end.x,   w.end.y,   cx, cy, angle)
    return { ...w, start: { x: sx, y: sy }, end: { x: ex, y: ey } }
  })
}

/* ─── Resize helpers ────────────────────────────── */
/** Scale point around center */
function scalePoint(px: number, py: number, cx: number, cy: number, sx: number, sy: number): [number, number] {
  return [cx + (px - cx) * sx, cy + (py - cy) * sy]
}

/** Apply scale to selected walls */
function applyScale(ws: WallSeg[], ids: Set<string>, cx: number, cy: number, sx: number, sy: number): WallSeg[] {
  if (sx === 1 && sy === 1) return ws
  return ws.map(w => {
    if (!ids.has(w.id)) return w
    const [startX, startY] = scalePoint(w.start.x, w.start.y, cx, cy, sx, sy)
    const [endX, endY] = scalePoint(w.end.x, w.end.y, cx, cy, sx, sy)
    return { ...w, start: { x: startX, y: startY }, end: { x: endX, y: endY } }
  })
}

/**
 * Returns the closest point on segment (ax,ay)→(bx,by) to (px,py),
 * and the parametric t ∈ [0,1] along the segment.
 */
function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): { pt: { x: number; y: number }; t: number; dist: number } {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return { pt: { x: ax, y: ay }, t: 0, dist: Math.hypot(px - ax, py - ay) }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + t * dx, cy = ay + t * dy
  return { pt: { x: cx, y: cy }, t, dist: Math.hypot(px - cx, py - cy) }
}

/**
 * Returns all wall IDs that belong to the same group as `wallId`.
 * If the wall has no groupId, returns `[wallId]` (just itself).
 */
function getGroupWallIds(wallId: string, walls: WallSeg[]): string[] {
  const target = walls.find(w => w.id === wallId)
  if (!target?.groupId) return [wallId]
  const gid = target.groupId
  return walls.filter(w => w.groupId === gid).map(w => w.id)
}

/** Check if a line segment (a-b) intersects or is inside a box defined by (x1,y1) to (x2,y2). */
function lineIntersectsRect(a: Pt, b: Pt, x1: number, y1: number, x2: number, y2: number): boolean {
  // 1. One endpoint inside
  if (a.x >= x1 && a.x <= x2 && a.y >= y1 && a.y <= y2) return true
  if (b.x >= x1 && b.x <= x2 && b.y >= y1 && b.y <= y2) return true
  // 2. Line intersects any of the 4 edges
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
  // Only use LINE-derived walls for room detection.
  // LWPOLYLINE segments (pl-*) are long boundary edges that bypass intermediate junction
  // nodes (e.g., the full left wall y=22.8→34.8 skips junctions at 25.8 and 30.8), which
  // prevents the DCEL from closing faces like KITCHEN, BATH, WC.
  // The LINE entities already define every room boundary redundantly, so we can safely
  // exclude polyline walls here. Also exclude isOuter (wall-thickness offset) and isDetail.
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.id.startsWith('pl-'))
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

/* ─── applyResizeToWalls ────────────────────────── */
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
    return {
      ...w,
      start: { x: scaleX(w.start.x), y: scaleY(w.start.y) },
      end:   { x: scaleX(w.end.x),   y: scaleY(w.end.y) },
    }
  })
}


/* ─── detectRoomsWithWalls ─────────────────────── */
/** Same DCEL logic as detectRooms but also returns the wall IDs that form each room boundary. */
function detectRoomsWithWalls(walls: WallSeg[]): Array<{ polygon: Pt[]; wallIds: string[] }> {
  // Only use LINE-derived walls for room detection.
  // LWPOLYLINE segments (pl-*) are long boundary edges that bypass intermediate junction
  // nodes (e.g., the full left wall y=22.8→34.8 skips junctions at 25.8 and 30.8), which
  // prevents the DCEL from closing faces like KITCHEN, BATH, WC.
  // The LINE entities already define every room boundary redundantly, so we can safely
  // exclude polyline walls here. Also exclude isOuter (wall-thickness offset) and isDetail.
  const segs = walls.filter(w => !w.isDetail && !w.isOuter && !w.id.startsWith('pl-'))
  if (segs.length < 3) return []

  const nodes: Pt[] = []
  const getN = (x: number, y: number): number => {
    for (let i = 0; i < nodes.length; i++)
      if (Math.abs(nodes[i].x - x) < SNAP_TH && Math.abs(nodes[i].y - y) < SNAP_TH) return i
    return nodes.push({ x, y }) - 1
  }

  const eKeys = new Set<string>()
  const eList: [number, number][] = []
  const eWallIds: string[] = []   // parallel to eList – the wall id for each undirected edge

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

  // Build heWallId map: half-edge key → wall id
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
        if (polyArea(polygon) > 0.05) {
          result.push({ polygon, wallIds: faceWallIds })
        }
      }
    }
  }
  return result
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionBox, setSelectionBox] = useState<{ start: Pt; current: Pt } | null>(null)
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
  const [orthoEnabled, setOrthoEnabled] = useState(false)
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

  /** groupId being hovered — all walls with this groupId get a preview highlight. */
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [hoveredRoomIdx, setHoveredRoomIdx] = useState<number | null>(null)

  /* editor chrome (Synaps-style) */
  const [activeTool, setActiveTool] = useState<
    'select' | 'hand' | 'frame' | 'drawLine' | 'drawPolyline' | 'text' | 'drawArc' | 'drawCircle'
  >('select')
  const [units, setUnits] = useState<'m' | 'cm' | 'mm'>('m')
  const [strokeHex, setStrokeHex] = useState('#474747')
  const [strokeScale, setStrokeScale] = useState(1)

  /* drag feedback */
  const [snapTarget, setSnapTarget]   = useState<Pt | null>(null)
  /** When snapping to the interior of a wall (not its endpoint), records the target wall id
   *  so we can split it on drag-end. null when snapping to an endpoint. */
  const snapLineWallRef = useRef<{ wallId: string; t: number } | null>(null)
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
    toMoveWallIds: string[]
    toMoveTextIds: string[]
    toMoveArcHandles: string[]
    initWX:    number   // world-space mouse position when drag started
    initWY:    number
  }
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta]   = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  /** Snapshot of selectedIds taken at mousedown — used by onClick to distinguish
   *  "already selected before this click" (→ toggle off) from "just added by mousedown" (→ keep). */
  const selBeforeMouseDown = useRef<Set<string>>(new Set())
  /** Tracks which wall + which endpoint ('start'|'end') is actively being dragged,
   *  so onEpDragEnd can auto-join when the endpoint snaps onto another wall. */
  const draggingEpInfo = useRef<{ wallId: string; ep: 'start' | 'end' } | null>(null)

  /* ── rotation drag ── */
  interface RotationDrag {
    centerWX: number       // world-space rotation centre
    centerWY: number
    startMouseAngle: number // atan2 of initial mouse position relative to centre (canvas px)
    wallIds: string[]
    textHandles: string[]
    arcHandles: string[]
  }
  const rotationDragRef = useRef<RotationDrag | null>(null)
  const [rotationDrag, setRotationDrag] = useState<RotationDrag | null>(null)
  const rotationAngleDeltaRef = useRef(0)
  const [rotationAngleDelta, setRotationAngleDelta] = useState(0)

  /* ── resize drag ── */
  interface ResizeDrag {
    handle: 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
    initBBox: { minWX: number; minWY: number; maxWX: number; maxWY: number }
    initMouseWX: number
    initMouseWY: number
    wallIds: string[]
    textHandles: string[]
    arcHandles: string[]
  }
  const resizeDragRef = useRef<ResizeDrag | null>(null)
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag | null>(null)
  const resizePreviewRef = useRef<{ minWX: number; minWY: number; maxWX: number; maxWY: number } | null>(null)
  const [resizePreview, setResizePreview] = useState<{ minWX: number; minWY: number; maxWX: number; maxWY: number } | null>(null)

  /** Translate all selected walls by the current delta. */
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
    const { toMoveWallIds } = drag
    const { dx, dy } = delta
    const toMove = new Set(toMoveWallIds)

    return ws.map(w => {
      if (toMove.has(w.id)) {
        return { 
          ...w, 
          start: { x: w.start.x + dx, y: w.start.y + dy }, 
          end:   { x: w.end.x   + dx, y: w.end.y   + dy } 
        }
      }
      return w
    })
  }, [])

  /** Real-time reactive labels — recalculated live during any drag or selection transformation. */
  const effectiveTexts = useMemo(() => {
    let texts = planDoc.texts
    if (activeDrag) {
      const { toMoveTextIds } = activeDrag
      const { dx, dy } = dragDelta
      const tSet = new Set(toMoveTextIds)
      texts = texts.map(tx =>
        tSet.has(tx.handle) ? { ...tx, position: { x: tx.position.x + dx, y: tx.position.y + dy, z: 0 } } : tx
      )
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
      // Scale font size proportionally with the geometric mean of the resize ratio
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

  /** Live arc positions during drag / rotation / resize — mirrors effectiveTexts. */
  const effectiveArcs = useMemo(() => {
    let arcs = planDoc.arcs
    if (activeDrag) {
      const aSet = new Set(activeDrag.toMoveArcHandles)
      const { dx, dy } = dragDelta
      arcs = arcs.map(a => aSet.has(a.handle)
        ? { ...a, center: { ...a.center, x: a.center.x + dx, y: a.center.y + dy } }
        : a)
    }
    if (rotationDrag && rotationAngleDelta !== 0) {
      const aSet = new Set(rotationDrag.arcHandles)
      arcs = arcs.map(a => {
        if (!aSet.has(a.handle)) return a
        const [nx, ny] = rotatePoint(a.center.x, a.center.y, rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
        return { ...a, center: { ...a.center, x: nx, y: ny } }
      })
    }
    if (resizeDrag && resizePreview) {
      const { arcHandles, initBBox } = resizeDrag
      const origW = initBBox.maxWX - initBBox.minWX || 1e-9
      const origH = initBBox.maxWY - initBBox.minWY || 1e-9
      const newW  = resizePreview.maxWX - resizePreview.minWX
      const newH  = resizePreview.maxWY - resizePreview.minWY
      const aSet = new Set(arcHandles)
      arcs = arcs.map(a => {
        if (!aSet.has(a.handle)) return a
        const nx = resizePreview.minWX + (a.center.x - initBBox.minWX) / origW * newW
        const ny = resizePreview.minWY + (a.center.y - initBBox.minWY) / origH * newH
        return { ...a, center: { ...a.center, x: nx, y: ny } }
      })
    }
    return arcs
  }, [planDoc.arcs, activeDrag, dragDelta, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  /* derived rooms with wall IDs — recalculates live during drag */
  const roomsWithWalls = useMemo(() => {
    let ws = walls
    if (activeDrag) {
      ws = applyDrag(ws, activeDrag, dragDelta)
    }
    if (rotationDrag && rotationAngleDelta !== 0) {
      ws = applyRotation(ws, new Set(rotationDrag.wallIds), rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
    }
    if (resizeDrag && resizePreview) {
      ws = applyResizeToWalls(ws, new Set(resizeDrag.wallIds), resizeDrag.initBBox, resizePreview)
    }
    return detectRoomsWithWalls(ws)
  }, [walls, activeDrag, dragDelta, applyDrag, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])
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

  /* ── snap helper — endpoint-priority then snap-to-line interior ── */
  const getSnap = useCallback((x: number, y: number, excludeIds: string[]): Pt => {
    if (!snapEnabled) { snapLineWallRef.current = null; return { x, y } }

    // Phase 1: snap to any endpoint (highest priority, tight threshold)
    let bestEp: Pt | null = null, bestEpD = SNAP_TH
    for (const w of walls) {
      if (excludeIds.includes(w.id)) continue
      for (const ep of [w.start, w.end]) {
        const d = Math.hypot(ep.x - x, ep.y - y)
        if (d < bestEpD) { bestEpD = d; bestEp = ep }
      }
    }
    if (bestEp) { snapLineWallRef.current = null; return bestEp }

    // Phase 2: snap to nearest point along any wall segment interior
    let bestSeg: { wallId: string; t: number; pt: Pt } | null = null, bestSegD = SNAP_LINE_TH
    for (const w of walls) {
      if (excludeIds.includes(w.id)) continue
      const { pt, t, dist } = closestPointOnSegment(x, y, w.start.x, w.start.y, w.end.x, w.end.y)
      // Exclude t≈0 and t≈1 (those are the endpoints, already checked above)
      if (t > 0.01 && t < 0.99 && dist < bestSegD) {
        bestSegD = dist; bestSeg = { wallId: w.id, t, pt }
      }
    }
    if (bestSeg) {
      snapLineWallRef.current = { wallId: bestSeg.wallId, t: bestSeg.t }
      return bestSeg.pt
    }

    snapLineWallRef.current = null
    return { x, y }
  }, [walls, snapEnabled])

  /* ── endpoint drag ── */
  const onEpDragMove = useCallback((
    e: Konva.KonvaEventObject<DragEvent>,
    wallId: string,
    ep: 'start' | 'end',
  ) => {
    const node = e.target
    const [rawX, rawY] = toW(node.x(), node.y(), t)
    const snapped = getSnap(rawX, rawY, [wallId])
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

    const info = draggingEpInfo.current
    const lineSnap = snapLineWallRef.current
    draggingEpInfo.current = null
    snapLineWallRef.current = null
    if (!info) return

    setWalls(prev => {
      const moved = prev.find(w => w.id === info.wallId)
      if (!moved) return prev
      const pt = moved[info.ep]

      // ── Case A: snapped to the interior of another wall → split that wall ──
      if (lineSnap) {
        const target = prev.find(w => w.id === lineSnap.wallId)
        if (target) {
          const splitPt = pt  // moved endpoint IS the snap point on the target wall
          // Create two new wall segments replacing the target
          const segA: WallSeg = {
            ...target,
            id: `${target.id}-a`,
            end: splitPt,
          }
          const segB: WallSeg = {
            ...target,
            id: `${target.id}-b`,
            start: splitPt,
          }
          // Unify group: moved wall + both split halves
          const existingGroups = new Set<string>(
            [moved, target].map(w => w.groupId).filter(Boolean) as string[]
          )
          const unified = existingGroups.size > 0 ? [...existingGroups][0] : `g-${Date.now()}`
          const toJoin = new Set([
            moved.id,
            segA.id, segB.id,
            ...prev.filter(w => w.groupId && existingGroups.has(w.groupId)).map(w => w.id),
          ])
          return [
            ...prev
              .filter(w => w.id !== target.id)
              .map(w => toJoin.has(w.id) ? { ...w, groupId: unified } : w),
            { ...segA, groupId: unified },
            { ...segB, groupId: unified },
          ]
        }
      }

      // ── Case B: snapped to another wall's endpoint → auto-group ──
      const connected = prev.filter(w =>
        w.id !== moved.id && (
          (Math.abs(w.start.x - pt.x) < SNAP_TH && Math.abs(w.start.y - pt.y) < SNAP_TH) ||
          (Math.abs(w.end.x   - pt.x) < SNAP_TH && Math.abs(w.end.y   - pt.y) < SNAP_TH)
        )
      )
      if (connected.length === 0) return prev

      const existingGroupIds = new Set<string>(
        [moved, ...connected].map(w => w.groupId).filter(Boolean) as string[]
      )
      const unified = existingGroupIds.size > 0 ? [...existingGroupIds][0] : `g-${Date.now()}`
      const toJoin = new Set([
        moved.id,
        ...connected.map(w => w.id),
        ...prev.filter(w => w.groupId && existingGroupIds.has(w.groupId)).map(w => w.id),
      ])
      return prev.map(w => toJoin.has(w.id) ? { ...w, groupId: unified } : w)
    })
  }, [])

  /* ── commit pending rotation to wall state ── */
  const commitRotation = useCallback(() => {
    const rd = rotationDragRef.current
    const angle = rotationAngleDeltaRef.current
    rotationDragRef.current = null
    rotationAngleDeltaRef.current = 0
    setRotationDrag(null)
    setRotationAngleDelta(0)
    if (!rd || angle === 0) return
    const ids = new Set(rd.wallIds)
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    setWalls(prev => applyRotation(prev, ids, rd.centerWX, rd.centerWY, angle))
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
        return { ...a, center: { ...a.center, x: nx, y: ny } }
      }),
      lines: prev.lines.map(l => {
        const belongsToRotatedArc = rd.arcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))
        if (!belongsToRotatedArc) return l
        const [sx, sy] = rotatePoint(l.start.x, l.start.y, rd.centerWX, rd.centerWY, angle)
        const [ex, ey] = rotatePoint(l.end.x,   l.end.y,   rd.centerWX, rd.centerWY, angle)
        return { ...l, start: { ...l.start, x: sx, y: sy }, end: { ...l.end, x: ex, y: ey } }
      }),
    }))
  }, [])

  /* ── commit pending resize to wall state ── */
  const commitResize = useCallback(() => {
    const rd = resizeDragRef.current
    const preview = resizePreviewRef.current
    resizeDragRef.current = null
    resizePreviewRef.current = null
    setResizeDrag(null)
    setResizePreview(null)
    if (!rd || !preview) return
    const ids = new Set(rd.wallIds)
    setWalls(prev => applyResizeToWalls(prev, ids, rd.initBBox, preview))
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
      lines: prev.lines.map(l => {
        const belongsToResizedArc = rd.arcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))
        if (!belongsToResizedArc) return l
        const s = scalePos(l.start.x, l.start.y)
        const e = scalePos(l.end.x, l.end.y)
        return { ...l, start: { ...l.start, x: s.x, y: s.y }, end: { ...l.end, x: e.x, y: e.y } }
      }),
    }))
  }, [])

  /* ── grouping ── */
  /**
   * Join all currently selected walls into a single polyline group.
   * After joining, clicking any member selects the entire group as one element.
   */
  const joinSelected = useCallback(() => {
    const wallIds = walls.filter(w => selectedIds.has(w.id)).map(w => w.id)
    if (wallIds.length < 2) return
    snapshot()
    const newGroupId = `g-${Date.now()}`
    setWalls(prev => prev.map(w => wallIds.includes(w.id) ? { ...w, groupId: newGroupId } : w))
  }, [walls, selectedIds, snapshot])

  /**
   * Remove groupId from all selected walls (and every sibling in the same group).
   * Each segment becomes an independent wall again.
   */
  const ungroupSelected = useCallback(() => {
    // Collect the groupIds touched by the current selection
    const touchedGroups = new Set(
      walls.filter(w => selectedIds.has(w.id) && w.groupId).map(w => w.groupId!)
    )
    if (touchedGroups.size === 0) return
    snapshot()
    setWalls(prev => prev.map(w =>
      (w.groupId && touchedGroups.has(w.groupId)) ? { ...w, groupId: undefined } : w
    ))
  }, [walls, selectedIds, snapshot])

  /* ── rubber-band selection ── */
  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isStage = e.target === stageRef.current || e.target.name() === 'background-rect'
    if (!isStage || activeTool !== 'select' || spaceHeld) return

    // getRelativePointerPosition accounts for stage zoom + pan; getPointerPosition does not.
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

    if (selectionBox) { // Box Selection
      setSelectionBox(prev => prev ? { ...prev, current: { x: wx, y: wy } } : null)
    } else if (activeDrag) { // Entity Drag
      let dx = wx - activeDrag.initWX
      let dy = wy - activeDrag.initWY

      if (orthoEnabled) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0
      }

      dragDeltaRef.current = { dx, dy }
      setDragDelta({ dx, dy })
    } else if (rotationDragRef.current) { // Rotation Drag
      const rd = rotationDragRef.current
      const [ccx, ccy] = toC(rd.centerWX, rd.centerWY, t)
      // pos is already in logical canvas coords (getRelativePointerPosition), same space as toC output
      const currentAngle = Math.atan2(pos.y - ccy, pos.x - ccx)
      const delta = currentAngle - rd.startMouseAngle
      rotationAngleDeltaRef.current = delta
      setRotationAngleDelta(delta)
    } else if (resizeDragRef.current) { // Resize Drag
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
    } else if (activeTool === 'drawLine' && drawLineAnchorRef.current) {
      setDrawLinePointer(getSnap(wx, wy, ''))
    } else if (activeTool === 'drawPolyline') {
      if (polylineDraftRef.current.length > 0) setPolylineHover(getSnap(wx, wy, ''))
      else setPolylineHover(null)
    } else if (activeTool === 'drawArc' || activeTool === 'drawCircle') {
      setShapePointer({ x: wx, y: wy })
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
    
    // AutoCAD convention: L-to-R (start.x < current.x) is Window (Inside)
    // R-to-L (start.x > current.x) is Crossing (Touches)
    const isWindow = start.x < current.x

    // Selection box logic: check both walls and room labels
    const newlySelected = new Set<string>()
    for (const w of walls) {
      if (isWindow) {
        const sIn = w.start.x >= x1 && w.start.x <= x2 && w.start.y >= y1 && w.start.y <= y2
        const eIn = w.end.x   >= x1 && w.end.x   <= x2 && w.end.y   >= y1 && w.end.y   <= y2
        if (sIn && eIn) newlySelected.add(w.id)
      } else {
        // Crossing: use precise segment-rectangle intersection
        if (lineIntersectsRect(w.start, w.end, x1, y1, x2, y2)) newlySelected.add(w.id)
      }
    }
    for (const tx of planDoc.texts) {
      const isInside = tx.position.x >= x1 && tx.position.x <= x2 && tx.position.y >= y1 && tx.position.y <= y2
      if (isInside) newlySelected.add(tx.handle)
    }
    for (const a of planDoc.arcs) {
      const isInside = a.center.x >= x1 && a.center.x <= x2 && a.center.y >= y1 && a.center.y <= y2
      if (isInside) newlySelected.add(a.handle)
    }

    setSelectedIds(prev => {
      if (e.evt.ctrlKey || e.evt.metaKey) {
        const next = new Set(prev)
        newlySelected.forEach(id => next.add(id))
        return next
      }
      return newlySelected
    })
  }, [selectionBox, walls, commitRotation, commitResize])

  /* ── mid-handle drag (move whole wall + stretch connected walls live) ── */
  const onMidDragStart = useCallback((
    e: Konva.KonvaEventObject<MouseEvent>,
    targetId: string,
    currentSel: Set<string>
  ) => {
    if (roomDragRef.current) return
    setSelectedRoomIndex(null)
    snapshot()
    const pos = stageRef.current?.getRelativePointerPosition()
    if (!pos) return
    const [wx, wy] = toW(pos.x, pos.y, t)

    const toMoveW = walls.filter(w => currentSel.has(w.id)).map(w => w.id)
    const toMoveT = planDoc.texts.filter(t => currentSel.has(t.handle)).map(t => t.handle)
    const toMoveA = planDoc.arcs.filter(a => currentSel.has(a.handle)).map(a => a.handle)

    const drag: ActiveDrag = {
      wallId:           targetId,
      toMoveWallIds:    toMoveW,
      toMoveTextIds:    toMoveT,
      toMoveArcHandles: toMoveA,
      initWX:           wx,
      initWY:           wy,
    }
    activeDragRef.current = drag
    setActiveDrag(drag)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [snapshot, walls, planDoc.texts, t])

  const onMidDragEnd = useCallback(() => {
    const drag = activeDragRef.current
    if (!drag) return
    const delta = dragDeltaRef.current
    
    const aSet = new Set(drag.toMoveArcHandles)
    const arcKey = (h: string) => h.replace(/^arc-/, '')
    setWalls(prev => applyDrag(prev, drag, delta))
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx =>
        new Set(drag.toMoveTextIds).has(tx.handle)
          ? { ...tx, position: { x: tx.position.x + delta.dx, y: tx.position.y + delta.dy, z: 0 } }
          : tx
      ),
      arcs: prev.arcs.map(a =>
        aSet.has(a.handle)
          ? { ...a, center: { ...a.center, x: a.center.x + delta.dx, y: a.center.y + delta.dy } }
          : a
      ),
      lines: prev.lines.map(l => {
        const belongsToMovedArc = drag.toMoveArcHandles.some(h => l.handle.startsWith(`dfl-${arcKey(h)}`))
        if (!belongsToMovedArc) return l
        return { ...l, start: { ...l.start, x: l.start.x + delta.dx, y: l.start.y + delta.dy }, end: { ...l.end, x: l.end.x + delta.dx, y: l.end.y + delta.dy } }
      }),
    }))

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

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          snapshot()
          setWalls(p => p.filter(w => !selectedIds.has(w.id)))
          setSelectedIds(new Set())
        }
      }
      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault(); undo()
      }
      if (e.key === 'Escape') {
        // Cancel any active rotation drag first, then clear selection
        if (rotationDragRef.current) {
          rotationDragRef.current = null
          rotationAngleDeltaRef.current = 0
          setRotationDrag(null)
          setRotationAngleDelta(0)
        } else if (resizeDragRef.current) {
          resizeDragRef.current = null
          resizePreviewRef.current = null
          setResizeDrag(null)
          setResizePreview(null)
        } else {
          setSelectedIds(new Set())
        }
      }
      if (e.key === 'o' || e.key === 'O') setOrthoEnabled(v => !v)
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); joinSelected() }
      if (e.key === 'u' || e.key === 'U') { e.preventDefault(); ungroupSelected() }
      /* Space = temporary pan */
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
  }, [selectedIds, snapshot, undo, joinSelected, ungroupSelected])

  /* ── global mouseup: commit any in-progress drag/rotate/resize even if pointer
     leaves the canvas or the browser window (prevents "stuck" drag state) ── */
  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (activeDragRef.current)     { onMidDragEnd() }
      if (rotationDragRef.current)   { commitRotation() }
      if (resizeDragRef.current)     { commitResize() }
      if (selectionBox)              { /* selectionBox commits via onStageMouseUp; safe to leave */ }
      if (isDraggingEp)              { onEpDragEnd() }
    }
    window.addEventListener('mouseup', onGlobalMouseUp)
    return () => window.removeEventListener('mouseup', onGlobalMouseUp)
  }, [onMidDragEnd, commitRotation, commitResize, onEpDragEnd, selectionBox, isDraggingEp])

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

  /** Walls with the active midpoint drag and/or live rotation/resize preview applied. */
  const effectiveWalls = useMemo(() => {
    let ws = visWalls
    
    // Apply drag transformation
    if (activeDrag) {
      ws = applyDrag(ws, activeDrag, dragDelta)
    }
    
    // Apply rotation transformation
    if (rotationDrag && rotationAngleDelta !== 0) {
      ws = applyRotation(ws, new Set(rotationDrag.wallIds), rotationDrag.centerWX, rotationDrag.centerWY, rotationAngleDelta)
    }
    
    // Apply resize transformation
    if (resizeDrag && resizePreview) {
      ws = applyResizeToWalls(ws, new Set(resizeDrag.wallIds), resizeDrag.initBBox, resizePreview)
    }
    
    return ws
  }, [visWalls, activeDrag, dragDelta, applyDrag, rotationDrag, rotationAngleDelta, resizeDrag, resizePreview])

  /** Bounding box of selected walls in canvas (pixel) coordinates — used to position rotation handle. */
  const effectiveSelBBox = useMemo(() => {
    if (selectedIds.size === 0) return null
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
      minCX = Math.min(minCX, cx); maxCX = Math.max(maxCX, cx)
      minCY = Math.min(minCY, cy); maxCY = Math.max(maxCY, cy)
      hasAny = true
    }
    for (const a of effectiveArcs.filter(a => selectedIds.has(a.handle))) {
      const [cx, cy] = toC(a.center.x, a.center.y, t)
      const r = a.radius * t.sc
      minCX = Math.min(minCX, cx - r); maxCX = Math.max(maxCX, cx + r)
      minCY = Math.min(minCY, cy - r); maxCY = Math.max(maxCY, cy + r)
      hasAny = true
    }
    if (!hasAny) return null
    return { minCX, minCY, maxCX, maxCY }
  }, [effectiveWalls, effectiveTexts, effectiveArcs, selectedIds, t])

  /** World-space bounds of all selected elements (walls + texts + arcs). */
  const worldSelBounds = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let hasAny = false
    for (const w of walls.filter(w => selectedIds.has(w.id))) {
      for (const p of [w.start, w.end]) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
        hasAny = true
      }
    }
    for (const tx of planDoc.texts.filter(tx => selectedIds.has(tx.handle))) {
      minX = Math.min(minX, tx.position.x); maxX = Math.max(maxX, tx.position.x)
      minY = Math.min(minY, tx.position.y); maxY = Math.max(maxY, tx.position.y)
      hasAny = true
    }
    for (const a of planDoc.arcs.filter(a => selectedIds.has(a.handle))) {
      minX = Math.min(minX, a.center.x - a.radius); maxX = Math.max(maxX, a.center.x + a.radius)
      minY = Math.min(minY, a.center.y - a.radius); maxY = Math.max(maxY, a.center.y + a.radius)
      hasAny = true
    }
    if (!hasAny) return null
    return { minX, minY, maxX, maxY }
  }, [walls, planDoc.texts, planDoc.arcs, selectedIds])

  /** World-space centre of selected walls — stored at rotation/resize-drag start as the pivot. */
  const baseSelCenter = useMemo(() => {
    if (!worldSelBounds) return null
    return { 
      wx: (worldSelBounds.minX + worldSelBounds.maxX) / 2, 
      wy: (worldSelBounds.minY + worldSelBounds.maxY) / 2 
    }
  }, [worldSelBounds])

  /** World-space bbox of all selected elements — used as initBBox for resize drags. */
  const baseSelWBox = useMemo(() => {
    if (!worldSelBounds) return null
    return { minWX: worldSelBounds.minX, minWY: worldSelBounds.minY, maxWX: worldSelBounds.maxX, maxWY: worldSelBounds.maxY }
  }, [worldSelBounds])

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
    // Sync current wall positions (from canvas edits) into planDoc before exporting.
    // planDoc.lines/polylines go stale after endpoint-drag/rotate/resize since those
    // operations only update `walls` state, not planDoc.
    const syncedDoc = buildDocFromWalls(planDoc, walls)
    const dxfStr = docToDxfString(syncedDoc)
    const blob = new Blob([dxfStr], { type: 'application/dxf' })
    const url = URL.createObjectURL(blob)
    const base = (planDoc.source_file ?? 'floor-plan').replace(/\.dxf$/i, '')
    triggerDownload(url, `${base}-exported.dxf`)
    URL.revokeObjectURL(url)
  }, [planDoc, walls])

  /**
   * Only the Hand tool (or Space-bar held) should pan the canvas.
   * In Select mode the stage must NOT be draggable — otherwise a slight pointer
   * movement while clicking a wall triggers a canvas pan instead of a selection.
   */
  const stageDraggable = (activeTool === 'hand' || spaceHeld) && !isDraggingEp && !isDraggingRoom

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
            onMouseDown={onStageMouseDown}
            onMouseMove={onStageMouseMove}
            onMouseUp={onStageMouseUp}
            onClick={e => {
              if (e.target === stageRef.current) {
                setSelectedIds(new Set())
                handleStageClick(e)
              }
            }}
            style={{
              display: 'block',
              cursor: resizeDrag
                ? `${resizeDrag.handle}-resize`
                : (isDraggingEp || rotationDrag)
                  ? 'crosshair'
                  : (activeTool === 'hand' || spaceHeld)
                    ? 'grab'
                    : selectionBox
                      ? 'default'
                      : activeTool === 'draw' || activeTool === 'text'
                        ? 'crosshair'
                        : 'default',
            }}
          >

            {/* ── white artboard + light grid (Synaps-style) ── */}
            <Layer listening={false}>
              <Rect name="background-rect" x={0} y={0} width={stageSize.w} height={stageSize.h} fill="#ffffff" />
              {gridLines}
            </Layer>

            {/* ── room colour fills ── */}
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
                        setSelectedIds(prev => {
                          if (isCtrl) {
                            const next = new Set(prev)
                            r.wallIds.forEach(id => next.add(id))
                            return next
                          }
                          return new Set(r.wallIds)
                        })
                      }}
                      onMouseDown={e => {
                        if (rotationDragRef.current) return
                        e.cancelBubble = true
                        const currentSel = new Set(r.wallIds)
                        setSelectedIds(currentSel)
                        onMidDragStart(e as any, r.wallIds[0] ?? '', currentSel)
                      }}
                      onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                      onMouseEnter={ev => {
                        ev.target.getStage()!.container().style.cursor = 'move'
                        setHoveredRoomIdx(i)
                      }}
                      onMouseLeave={ev => {
                        ev.target.getStage()!.container().style.cursor = 'default'
                        setHoveredRoomIdx(null)
                      }}
                    />
                  </Group>
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
              {effectiveArcs.map((arc) => {
                const isFullCircle = arc.end_angle - arc.start_angle >= 360
                const isSelArc  = selectedIds.has(arc.handle)
                const arcKey    = arc.handle.replace(/^arc-/, '')
                const frameLines = planDoc.lines.filter(ln => ln.handle.startsWith(`dfl-${arcKey}`))
                const arcColor  = isSelArc ? '#f59e0b' : strokeHex
                const sw = (1.5 * strokeScale) / zoom
                const [arcCx, arcCy] = toC(arc.center.x, arc.center.y, t)
                const rCanvas = arc.radius * t.sc

                return (
                  <Group
                    key={arc.handle}
                    onClick={e => {
                      e.cancelBubble = true
                      if (activeTool === 'hand' || spaceHeld) return
                      setSelectedRoomIndex(null)
                      setSelectedTextHandle(null)
                      setSelectedId(null)
                      const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                      setSelectedIds(prev => {
                        const next = new Set(isCtrl ? prev : [])
                        if (isSelArc && isCtrl) next.delete(arc.handle)
                        else next.add(arc.handle)
                        return next
                      })
                    }}
                    onMouseDown={e => {
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
                const isSel       = selectedIds.has(wall.id)
                const isDragging  = activeDrag?.wallId === wall.id
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
                      onMouseDown={e => {
                        e.cancelBubble = true
                        selBeforeMouseDown.current = new Set(selectedIds)
                        // Resolve the full group so drag always moves the whole element
                        const groupIds = getGroupWallIds(wall.id, walls)
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
                        e.cancelBubble = true
                        const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                        const groupIds = getGroupWallIds(wall.id, walls)
                        setSelectedIds(prev => {
                          if (!isCtrl) {
                            // Plain click → select entire group (or just this wall if ungrouped)
                            return new Set(groupIds)
                          }
                          // Ctrl+click: toggle the entire group based on pre-mousedown state
                          if (selBeforeMouseDown.current.has(wall.id)) {
                            const next = new Set(prev)
                            groupIds.forEach(id => next.delete(id))
                            return next
                          }
                          return prev // mousedown already added all group members
                        })
                      }}
                      onMouseEnter={ev => {
                        ev.target.getStage()!.container().style.cursor = 'move'
                        if (wall.groupId) setHoveredGroupId(wall.groupId)
                      }}
                      onMouseLeave={ev => {
                        ev.target.getStage()!.container().style.cursor = 'default'
                        setHoveredGroupId(null)
                      }}
                    />

                    {/* ── visible wall line ── */}
                    {(() => {
                      const isHoverGroup = !isSel && !isDragging && !!wall.groupId && wall.groupId === hoveredGroupId
                      return (
                        <Line
                          points={[sx, sy, ex, ey]}
                          stroke={
                            isDragging   ? '#3b82f6'
                            : isSel      ? '#f59e0b'
                            : isHoverGroup ? '#a855f7'
                            : wallColor
                          }
                          strokeWidth={
                            (isDragging || isSel || isHoverGroup) ? 2.2 / zoom : strokeW
                          }
                          lineCap="round"
                          listening={false}
                        />
                      )
                    })()}

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



                    {/* ── endpoint handles (ALL walls when selected, enables snapping + auto-join) ── */}
                    {isSel && (
                      <>
                        <Circle
                          x={sx} y={sy} radius={HR}
                          fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom}
                          draggable
                          onDragStart={() => {
                            snapshot()
                            setIsDraggingEp(true)
                            draggingEpInfo.current = { wallId: wall.id, ep: 'start' }
                          }}
                          onDragMove={e => onEpDragMove(e, wall.id, 'start')}
                          onDragEnd={onEpDragEnd}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        />
                        <Circle
                          x={ex} y={ey} radius={HR}
                          fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom}
                          draggable
                          onDragStart={() => {
                            snapshot()
                            setIsDraggingEp(true)
                            draggingEpInfo.current = { wallId: wall.id, ep: 'end' }
                          }}
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
                      onMouseDown={e => {
                        e.cancelBubble = true
                        const currentSel = new Set(selectedIds)
                        if (!currentSel.has(wall.id)) currentSel.add(wall.id)
                        onMidDragStart(e as any, wall.id, currentSel)
                      }}
                      onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
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

            {/* ── rubber-band selection UI ── */}
            {selectionBox && (() => {
              const [sx, sy] = toC(selectionBox.start.x, selectionBox.start.y, t)
              const [cx, cy] = toC(selectionBox.current.x, selectionBox.current.y, t)
              const isWindow = selectionBox.start.x < selectionBox.current.x
              return (
                <Layer listening={false}>
                  <Rect
                    x={Math.min(sx, cx)}
                    y={Math.min(sy, cy)}
                    width={Math.abs(cx - sx)}
                    height={Math.abs(cy - sy)}
                    fill={isWindow ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)'}
                    stroke={isWindow ? '#3b82f6' : '#22c55e'}
                    strokeWidth={1 / zoom}
                    dash={[4 / zoom, 2 / zoom]}
                  />
                </Layer>
              )
            })()}

            {showLabels && (
              <Layer>
                {effectiveTexts.map(tx => {
                  const textLines = tx.text.split('\n')
                  const [lx, ly] = toC(tx.position.x, tx.position.y, t)
                  const fs = Math.max(7, tx.height * t.sc * 3.5)
                  // A label is "selected" if it's in the unified selectedIds set
                  const isTxtSel = selectedIds.has(tx.handle)
                  const estW = Math.max(fs * 3, (textLines[0]?.length ?? 1) * fs * 0.52)
                  const boxH = fs * (textLines[1] ? 2.15 : 1) + 8 / zoom
                  const handleY = fs * 0.2

                  return (
                    <Group
                      key={tx.handle}
                      x={lx}
                      y={ly}
                      onClick={(e) => {
                        e.cancelBubble = true
                        if (activeTool === 'hand' || spaceHeld) return
                        if (activeTool !== 'select') return
                        setSelectedRoomIndex(null)
                        setSelectedId(null)
                        const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                        setSelectedIds(prev => {
                          const next = new Set(isCtrl ? prev : [])
                          if (isTxtSel && isCtrl) next.delete(tx.handle)
                          else next.add(tx.handle)
                          return next
                        })
                        setSelectedTextHandle(isTxtSel && !e.evt.ctrlKey ? null : tx.handle)
                      }}
                      onMouseDown={e => {
                        e.cancelBubble = true
                        if (activeTool !== 'select' || spaceHeld) return
                        const isCtrl = e.evt.ctrlKey || e.evt.metaKey
                        const currentSel = new Set(isCtrl ? selectedIds : (isTxtSel ? selectedIds : new Set<string>()))
                        currentSel.add(tx.handle)
                        if (!isCtrl && !isTxtSel) setSelectedIds(currentSel)
                        onMidDragStart(e as any, tx.handle, currentSel)
                      }}
                      onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                      onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    >
                      {/* selection highlight */}
                      {isTxtSel && (
                        <Rect
                          x={-4 / zoom} y={-fs - 4 / zoom}
                          width={estW + 8 / zoom} height={boxH}
                          fill="rgba(245,158,11,0.12)" stroke="#f59e0b"
                          strokeWidth={1.2 / zoom} cornerRadius={2 / zoom}
                          listening={false}
                        />
                      )}
                      <Text
                        x={0} y={-fs}
                        text={textLines[0]}
                        fontSize={fs} fontStyle="bold"
                        fill={isTxtSel ? '#f59e0b' : '#2563eb'}
                        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                      />
                      {textLines[1] && (
                        <Text
                          x={0} y={-fs + fs * 1.25}
                          text={textLines[1]}
                          fontSize={fs * 0.78}
                          fill={isTxtSel ? '#f59e0b' : '#64748b'}
                          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                        />
                      )}
                      {/* per-label font-size resize handle — only when it's the sole selection */}
                      {isTxtSel && selectedIds.size === 1 && activeTool === 'select' && (
                        <Circle
                          x={estW} y={handleY}
                          radius={HR} fill="#3b82f6" stroke="#fff" strokeWidth={1.2 / zoom}
                          draggable
                          onDragStart={(e) => {
                            e.cancelBubble = true
                            snapshot()
                            const stage = e.target.getStage()!
                            const p = stage.getRelativePointerPosition()!
                            const [, wy] = toW(p.x, p.y, t)
                            textHeightDragRef.current = { handle: tx.handle, startH: tx.height, startPointerWy: wy }
                          }}
                          onDragMove={(e) => {
                            e.cancelBubble = true
                            const r = textHeightDragRef.current
                            if (!r || r.handle !== tx.handle) return
                            const stage = e.target.getStage()!
                            const p = stage.getRelativePointerPosition()!
                            const [, wy] = toW(p.x, p.y, t)
                            const newH = Math.max(0.05, Math.min(3, r.startH + (wy - r.startPointerWy) * 0.45))
                            setPlanDoc(prev => ({ ...prev, texts: prev.texts.map(t => t.handle === tx.handle ? { ...t, height: newH } : t) }))
                            e.target.position({ x: estW, y: handleY })
                          }}
                          onDragEnd={(e) => { e.cancelBubble = true; textHeightDragRef.current = null; e.target.position({ x: estW, y: handleY }) }}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'ns-resize' }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        />
                      )}
                    </Group>
                  )
                })}
              </Layer>
            )}

            {/* ── Dim overlay moved to SVG outside Stage — see below ── */}

            {/* ── Resize + rotation handles (separate interactive layer) ── */}
            {effectiveSelBBox && selectedIds.size > 0 && activeTool === 'select' && !activeDrag && (() => {
              const { minCX, minCY, maxCX, maxCY } = effectiveSelBBox
              const pad = 6 / zoom
              const w = maxCX - minCX
              const h = maxCY - minCY
              const handleSize = 8 / zoom
              const halfHandle = handleSize / 2
              const corners = {
                nw: { x: minCX - pad, y: minCY - pad },
                ne: { x: maxCX + pad, y: minCY - pad },
                sw: { x: minCX - pad, y: maxCY + pad },
                se: { x: maxCX + pad, y: maxCY + pad },
                n: { x: minCX + w / 2, y: minCY - pad },
                s: { x: minCX + w / 2, y: maxCY + pad },
                e: { x: maxCX + pad, y: minCY + h / 2 },
                w: { x: minCX - pad, y: minCY + h / 2 },
              }
              const cx = (minCX + maxCX) / 2
              const topY = minCY - pad
              const stemLen = 28 / zoom
              const handleY = topY - stemLen
              const rotHandleR = 7 / zoom
              return (
                <Layer>
                  {/* Resize handles */}
                  {Object.entries(corners).map(([pos, pt]) => (
                    <Rect
                      key={pos}
                      x={pt.x - halfHandle}
                      y={pt.y - halfHandle}
                      width={handleSize}
                      height={handleSize}
                      fill="white"
                      stroke="#3b82f6"
                      strokeWidth={1.5 / zoom}
                      onMouseDown={e => {
                        e.cancelBubble = true
                        if (!baseSelWBox) return
                        const mpos = stageRef.current?.getRelativePointerPosition()
                        if (!mpos) return
                        const [mwx, mwy] = toW(mpos.x, mpos.y, t)
                        snapshot()
                        const rd: ResizeDrag = {
                          handle: pos as ResizeDrag['handle'],
                          initBBox: { ...baseSelWBox },
                          initMouseWX: mwx,
                          initMouseWY: mwy,
                          wallIds: walls.filter(w => selectedIds.has(w.id)).map(w => w.id),
                          textHandles: planDoc.texts.filter(tx => selectedIds.has(tx.handle)).map(tx => tx.handle),
                          arcHandles: planDoc.arcs.filter(a => selectedIds.has(a.handle)).map(a => a.handle),
                        }
                        resizeDragRef.current = rd
                        resizePreviewRef.current = { ...baseSelWBox }
                        setResizeDrag(rd)
                        setResizePreview({ ...baseSelWBox })
                      }}
                      onMouseUp={e => { e.cancelBubble = true; commitResize() }}
                      onMouseEnter={ev => {
                        const cursor = pos.includes('n') ? 'n' : pos.includes('s') ? 's' : ''
                        ev.target.getStage()!.container().style.cursor = 
                          pos === 'n' || pos === 's' ? 'ns-resize'
                          : pos === 'e' || pos === 'w' ? 'ew-resize'
                          : pos === 'nw' || pos === 'se' ? 'nwse-resize'
                          : 'nesw-resize'
                      }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    />
                  ))}
                  
                  {/* stem line for rotation handle */}
                  <Line
                    points={[cx, topY, cx, handleY]}
                    stroke="#3b82f6" strokeWidth={1 / zoom}
                    listening={false}
                  />
                  
                  {/* rotation handle circle */}
                  <Circle
                    x={cx} y={handleY}
                    radius={rotHandleR}
                    fill={rotationDrag ? '#3b82f6' : 'white'}
                    stroke="#3b82f6" strokeWidth={1.5 / zoom}
                    onMouseDown={e => {
                      e.cancelBubble = true
                      if (!baseSelCenter) return
                      const mpos = stageRef.current?.getRelativePointerPosition()
                      if (!mpos) return
                      const [ccx, ccy] = toC(baseSelCenter.wx, baseSelCenter.wy, t)
                      const startAngle = Math.atan2(mpos.y - ccy, mpos.x - ccx)
                      snapshot()
                      const rd: RotationDrag = {
                        centerWX:        baseSelCenter.wx,
                        centerWY:        baseSelCenter.wy,
                        startMouseAngle: startAngle,
                        wallIds:         walls.filter(w => selectedIds.has(w.id)).map(w => w.id),
                        textHandles:     planDoc.texts.filter(tx => selectedIds.has(tx.handle)).map(tx => tx.handle),
                        arcHandles:      planDoc.arcs.filter(a => selectedIds.has(a.handle)).map(a => a.handle),
                      }
                      rotationDragRef.current = rd
                      rotationAngleDeltaRef.current = 0
                      setRotationDrag(rd)
                      setRotationAngleDelta(0)
                    }}
                    onMouseUp={e => { e.cancelBubble = true; commitRotation() }}
                    onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                    onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                  />
                  
                  {/* small curved arrow icon inside handle */}
                  <Text
                    x={cx - rotHandleR} y={handleY - rotHandleR}
                    width={rotHandleR * 2} height={rotHandleR * 2}
                    text="↻"
                    fontSize={rotHandleR * 1.3}
                    align="center"
                    verticalAlign="middle"
                    fill={rotationDrag ? 'white' : '#3b82f6'}
                    listening={false}
                  />
                </Layer>
              )
            })()}
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

          {/* ── Dimension / selection overlay (SVG, absolutely positioned over canvas) ──
               Rendered OUTSIDE the Konva Stage so it is completely immune to
               Stage zoom/pan transforms.  All coordinates are in screen pixels:
                 screenX = stageLocalX * zoom + pos.x
                 screenY = stageLocalY * zoom + pos.y                              */}
          {effectiveSelBBox && selectedIds.size > 0 && activeTool === 'select' && !activeDrag && (() => {
            /* ── All drawing is in canvas-local (pre-zoom) coordinates ──
               The <g> transform mirrors the Konva Stage transform exactly:
                 translate(pos.x, pos.y) scale(zoom)
               so any canvas-local point (cx, cy) lands at the same screen
               pixel as the corresponding Konva element.  Fixed-size items
               (stroke widths, text, arrow heads) use /zoom to counteract
               the scale so they stay a constant screen size.              */
            const { minCX, minCY, maxCX, maxCY } = effectiveSelBBox
            const pad = 6 / zoom          // canvas-local padding
            const rX = minCX - pad, rY = minCY - pad
            const rW = (maxCX - minCX) + pad * 2
            const rH = (maxCY - minCY) + pad * 2

            // World-space dimensions for label text
            const selWalls = effectiveWalls.filter(ww => selectedIds.has(ww.id))
            let dimW = 0, dimH = 0
            if (selWalls.length > 0) {
              let mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity
              for (const ww of selWalls) for (const p of [ww.start, ww.end]) {
                mnX = Math.min(mnX, p.x); mxX = Math.max(mxX, p.x)
                mnY = Math.min(mnY, p.y); mxY = Math.max(mxY, p.y)
              }
              dimW = Math.abs(mxX - mnX); dimH = Math.abs(mxY - mnY)
            }
            const dimWLabel = fmtLen(dimW)
            const dimHLabel = fmtLen(dimH)

            // Canvas-local sizes that appear as fixed screen pixels
            const DIM_OFFSET = 22 / zoom
            const TICK       = 5  / zoom
            const ARROW_SZ   = 6  / zoom
            const FS         = 11 / zoom
            const LBL_PAD    = 4  / zoom
            const SW         = 1  / zoom   // stroke width
            const DASH       = `${5/zoom},${3/zoom}`

            const wDimY = rY + rH + DIM_OFFSET
            const wMidX = rX + rW / 2
            const hDimX = rX + rW + DIM_OFFSET
            const hMidY = rY + rH / 2

            const arrowPath = (tipX: number, tipY: number, fromX: number, fromY: number) => {
              const angle = Math.atan2(tipY - fromY, tipX - fromX)
              return [
                `M${tipX - ARROW_SZ * Math.cos(angle - 0.35)},${tipY - ARROW_SZ * Math.sin(angle - 0.35)}`,
                `L${tipX},${tipY}`,
                `L${tipX - ARROW_SZ * Math.cos(angle + 0.35)},${tipY - ARROW_SZ * Math.sin(angle + 0.35)}`,
              ].join(' ')
            }

            const lblW  = dimWLabel.length * FS * 0.6 + LBL_PAD * 2
            const hlblW = dimHLabel.length * FS * 0.6 + LBL_PAD * 2
            const lblH  = FS * 1.5

            return (
              <svg
                style={{
                  position: 'absolute', top: 0, left: 0,
                  width: stageSize.w, height: stageSize.h,
                  pointerEvents: 'none', overflow: 'visible',
                }}
              >
                {/* Mirror the Stage transform: translate by pos then scale by zoom.
                    Everything inside is drawn in canvas-local coordinates. */}
                <g transform={`translate(${pos.x},${pos.y}) scale(${zoom})`}>
                  {/* dashed selection rect */}
                  <rect
                    x={rX} y={rY} width={rW} height={rH}
                    fill="none" stroke="#3b82f6" strokeWidth={SW}
                    strokeDasharray={DASH}
                  />

                  {/* ── Width dimension (below bbox) ── */}
                  {dimW > 0.01 && <>
                    <line x1={rX} y1={rY + rH} x2={rX} y2={wDimY + TICK} stroke="#64748b" strokeWidth={SW * 0.8} />
                    <line x1={rX + rW} y1={rY + rH} x2={rX + rW} y2={wDimY + TICK} stroke="#64748b" strokeWidth={SW * 0.8} />
                    <line x1={rX} y1={wDimY} x2={rX + rW} y2={wDimY} stroke="#64748b" strokeWidth={SW} />
                    <path d={arrowPath(rX, wDimY, rX + rW, wDimY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                    <path d={arrowPath(rX + rW, wDimY, rX, wDimY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                    <rect x={wMidX - lblW / 2} y={wDimY - lblH / 2} width={lblW} height={lblH} fill="white" rx={2 / zoom} />
                    <text x={wMidX} y={wDimY + FS * 0.35} textAnchor="middle" fontSize={FS} fill="#1e40af" fontWeight="bold" fontFamily="system-ui,-apple-system,'Segoe UI',sans-serif">{dimWLabel}</text>
                  </>}

                  {/* ── Height dimension (right of bbox) ── */}
                  {dimH > 0.01 && <>
                    <line x1={rX + rW} y1={rY} x2={hDimX + TICK} y2={rY} stroke="#64748b" strokeWidth={SW * 0.8} />
                    <line x1={rX + rW} y1={rY + rH} x2={hDimX + TICK} y2={rY + rH} stroke="#64748b" strokeWidth={SW * 0.8} />
                    <line x1={hDimX} y1={rY} x2={hDimX} y2={rY + rH} stroke="#64748b" strokeWidth={SW} />
                    <path d={arrowPath(hDimX, rY, hDimX, rY + rH)} stroke="#64748b" strokeWidth={SW} fill="none" />
                    <path d={arrowPath(hDimX, rY + rH, hDimX, rY)} stroke="#64748b" strokeWidth={SW} fill="none" />
                    <rect
                      x={hDimX - lblH / 2} y={hMidY - hlblW / 2}
                      width={lblH} height={hlblW}
                      fill="white" rx={2 / zoom}
                      transform={`rotate(-90,${hDimX},${hMidY})`}
                    />
                    <text
                      x={hDimX} y={hMidY + FS * 0.35}
                      textAnchor="middle" fontSize={FS} fill="#1e40af" fontWeight="bold"
                      fontFamily="system-ui,-apple-system,'Segoe UI',sans-serif"
                      transform={`rotate(-90,${hDimX},${hMidY})`}
                    >{dimHLabel}</text>
                  </>}
                </g>
              </svg>
            )
          })()}
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
            <label className="dxf-toggle">
              <input type="checkbox" checked={orthoEnabled} onChange={e => setOrthoEnabled(e.target.checked)} />
              Ortho Mode (O)
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
            {selectedIds.size > 0 && (
              <button className="dxf-action-btn danger" onClick={() => {
                snapshot()
                setWalls(p => p.filter(w => !selectedIds.has(w.id)))
                setPlanDoc(prev => ({
                  ...prev,
                  texts: prev.texts.filter(tx => !selectedIds.has(tx.handle))
                }))
                setSelectedIds(new Set())
              }}>Delete Selection</button>
            )}
          </div>

          <div className="dxf-prop-panel">
            <div className="dxf-prop-label">Grouping</div>
            <div className="dxf-prop-hint">
              Select ≥ 2 walls then Join to treat them as one element.
              Hover a joined wall to preview all members (purple).
            </div>
            <button
              className="dxf-action-btn"
              disabled={walls.filter(w => selectedIds.has(w.id)).length < 2}
              onClick={joinSelected}
              title="J"
            >
              Join selected (J)
            </button>
            {walls.some(w => selectedIds.has(w.id) && !!w.groupId) && (
              <button className="dxf-action-btn" onClick={ungroupSelected} title="U">
                Break group (U)
              </button>
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