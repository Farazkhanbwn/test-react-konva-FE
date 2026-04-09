/**
 * DXF export utility
 *
 * Converts the canvas wall/text state back into a valid DXF R2010 (AC1024) file
 * that can be opened and edited in AutoCAD, LibreCAD, BricsCAD, etc.
 *
 * Mapping:
 *   WallSeg (no groupId)          → LINE entity
 *   WallSeg[] (shared groupId)    → LWPOLYLINE entity (vertices sorted via sortPolylineVertices)
 *   DxfText                       → MTEXT entity
 *
 * Usage:
 *   const dxf = exportToDxf(walls, texts)
 *   const blob = new Blob([dxf], { type: 'application/dxf' })
 *   // then trigger a download
 */

import type { WallSeg } from './wallsFromDxfJson'
import { sortPolylineVertices } from './wallsFromDxfJson'
import type { DxfText } from '@/constants/dxfJsonData'

/* ─── Low-level DXF group-code helpers ─────────────────────────────────── */

/** Emit a single DXF group code + value pair as two lines. */
function gc(code: number, value: string | number): string {
  return `${code}\n${value}\n`
}

function xy(x: number, y: number, z = 0): string {
  return gc(10, x.toFixed(6)) + gc(20, y.toFixed(6)) + gc(30, z.toFixed(6))
}

/* ─── Section builders ──────────────────────────────────────────────────── */

function headerSection(): string {
  return (
    gc(0, 'SECTION') +
    gc(2, 'HEADER') +
    gc(9, '$ACADVER') +
    gc(1, 'AC1024') +   // R2010 — widely supported
    gc(9, '$INSUNITS') +
    gc(70, 6) +          // 6 = metres
    gc(0, 'ENDSEC')
  )
}

function tablesSection(): string {
  // Minimal TABLES: just the LAYER table with one layer ("0")
  return (
    gc(0, 'SECTION') +
    gc(2, 'TABLES') +
    gc(0, 'TABLE') +
    gc(2, 'LAYER') +
    gc(70, 1) +
    gc(0, 'LAYER') +
    gc(2, '0') +         // layer name
    gc(70, 0) +          // flags (0 = on, thawed)
    gc(62, 7) +          // colour (7 = white/black)
    gc(6, 'Continuous') +
    gc(0, 'ENDTAB') +
    gc(0, 'ENDSEC')
  )
}

/* ─── Entity builders ───────────────────────────────────────────────────── */

let _handleCounter = 0x100

function nextHandle(): string {
  return (_handleCounter++).toString(16).toUpperCase()
}

function lineEntity(wall: WallSeg): string {
  return (
    gc(0, 'LINE') +
    gc(5, nextHandle()) +
    gc(8, '0') +         // layer
    xy(wall.start.x, wall.start.y) +
    gc(11, wall.end.x.toFixed(6)) +
    gc(21, wall.end.y.toFixed(6)) +
    gc(31, (0).toFixed(6))
  )
}

function polylineEntity(walls: WallSeg[]): string {
  // Sort into connected chain order before writing vertices
  const ordered = sortPolylineVertices(walls)

  // Collect unique vertices in chain order
  const verts: Array<{ x: number; y: number }> = []
  for (const w of ordered) {
    const last = verts[verts.length - 1]
    if (!last || Math.abs(last.x - w.start.x) > 1e-9 || Math.abs(last.y - w.start.y) > 1e-9) {
      verts.push({ x: w.start.x, y: w.start.y })
    }
    verts.push({ x: w.end.x, y: w.end.y })
  }

  // Detect closed polyline: first vertex ≈ last vertex
  const isClosed =
    verts.length > 2 &&
    Math.abs(verts[0].x - verts[verts.length - 1].x) < 0.01 &&
    Math.abs(verts[0].y - verts[verts.length - 1].y) < 0.01

  if (isClosed) verts.pop()  // DXF closed flag handles the closing edge

  return (
    gc(0, 'LWPOLYLINE') +
    gc(5, nextHandle()) +
    gc(8, '0') +
    gc(90, verts.length) +      // vertex count
    gc(70, isClosed ? 1 : 0) +  // flags: 1 = closed
    verts.map(v =>
      gc(10, v.x.toFixed(6)) +
      gc(20, v.y.toFixed(6))
    ).join('')
  )
}

function mtextEntity(tx: DxfText): string {
  return (
    gc(0, 'MTEXT') +
    gc(5, nextHandle()) +
    gc(8, tx.layer || '0') +
    gc(10, tx.position.x.toFixed(6)) +
    gc(20, tx.position.y.toFixed(6)) +
    gc(30, (tx.position.z ?? 0).toFixed(6)) +
    gc(40, tx.height.toFixed(6)) +  // text height
    gc(71, 1) +                     // attachment point (top-left)
    gc(1, tx.text)
  )
}

/* ─── Main export function ──────────────────────────────────────────────── */

/**
 * Build a complete DXF string from the current canvas state.
 *
 * @param walls  - current wall segments (from canvas state)
 * @param texts  - current text labels (from planDoc.texts)
 * @returns      - DXF file content as a string
 */
export function exportToDxf(walls: WallSeg[], texts: DxfText[]): string {
  _handleCounter = 0x100  // reset handle counter each export

  // Separate ungrouped walls (→ LINE) from grouped walls (→ LWPOLYLINE)
  const ungrouped = walls.filter(w => !w.groupId)

  const grouped = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.groupId) continue
    if (!grouped.has(w.groupId)) grouped.set(w.groupId, [])
    grouped.get(w.groupId)!.push(w)
  }

  const entities =
    ungrouped.map(lineEntity).join('') +
    [...grouped.values()].map(polylineEntity).join('') +
    texts.map(mtextEntity).join('')

  return (
    headerSection() +
    tablesSection() +
    gc(0, 'SECTION') +
    gc(2, 'ENTITIES') +
    entities +
    gc(0, 'ENDSEC') +
    gc(0, 'EOF')
  )
}

/**
 * Convenience: trigger a browser download of the DXF file.
 *
 * @param walls  - current wall segments
 * @param texts  - current text labels
 * @param filename - output file name (default: 'floor-plan.dxf')
 */
export function downloadDxf(
  walls: WallSeg[],
  texts: DxfText[],
  filename = 'floor-plan.dxf',
): void {
  const content = exportToDxf(walls, texts)
  const blob = new Blob([content], { type: 'application/dxf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
