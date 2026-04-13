/**
 * exportToDxf.ts — AutoCAD R2000 (AC1015) DXF exporter
 *
 * Validated against ezdxf strict-mode parser (zero errors, zero fixes).
 * Produces CRLF line endings required by AutoCAD on Windows.
 *
 * Handle assignments match the ezdxf R2000 reference exactly:
 *   VPORT table   = 8     LTYPE table   = 2     LAYER table   = 1
 *   STYLE table   = 5     VIEW table    = 7     UCS table     = 6
 *   APPID table   = 3     DIMSTYLE table= 4     BKREC table   = 9
 *   *Model_Space BKREC = 17   *Paper_Space BKREC = 1B
 *   Model LAYOUT  = 1A   Layout1 LAYOUT = 1E
 *   Root DICT     = A    Layout DICT    = D    Group DICT    = C
 *   Dynamic entity handles start at 0x100 (well above all fixed handles)
 */

import type { WallSeg } from './wallsFromDxfJson'
import { sortPolylineVertices } from './wallsFromDxfJson'
import type { DxfText, DxfArc, DxfLine } from '@/constants/dxfJsonData'

// ─── Handle counter ───────────────────────────────────────────────────────────
let _h = 0x100
const nh = (): string => (_h++).toString(16).toUpperCase()

// ─── Group-code formatter ─────────────────────────────────────────────────────
const FLOAT = new Set<number>([
  10,11,12,13,14,15,16,17,18,19,
  20,21,22,23,24,25,26,27,28,29,
  30,31,32,33,34,35,36,37,38,39,
  40,41,42,43,44,45,46,47,48,49,
  50,51,52,53,54,55,56,57,58,59,
  140,141,142,143,144,145,146,147,148,149,
])

function g(code: number, value: string | number): string {
  const c = String(code).padStart(3, ' ')
  if (typeof value === 'number') {
    return FLOAT.has(code)
      ? `${c}\n${value.toFixed(8)}\n`
      : `${c}\n${Math.round(value)}\n`
  }
  return `${c}\n${value}\n`
}

// ─── Fixed handle constants ───────────────────────────────────────────────────
const H_VPORT_TBL  = '8'
const H_LTYPE_TBL  = '2',  H_LTYPE_BB = '24', H_LTYPE_BL = '25', H_LTYPE_CO = '26'
const H_LAYER_TBL  = '1',  H_LAYER_0  = '27'
const H_STYLE_TBL  = '5',  H_STYLE_ST = '29'
const H_VIEW_TBL   = '7'
const H_UCS_TBL    = '6'
const H_APPID_TBL  = '3',  H_APPID_AC = '2A'
const H_DIM_TBL    = '4',  H_DIM_ST   = '2B'
const H_BKREC_TBL  = '9'
const H_MS_BKREC   = '17', H_PS_BKREC = '1B'
const H_MS_BLOCK   = '18', H_MS_ENDBL = '19'
const H_PS_BLOCK   = '1C', H_PS_ENDBL = '1D'
const H_MS_LAYOUT  = '1A', H_PS_LAYOUT= '1E'
const H_ROOT_DICT  = 'A',  H_LAY_DICT = 'D',   H_GRP_DICT = 'C'

// ─── Bounding box ─────────────────────────────────────────────────────────────
interface BBox { minX: number; minY: number; maxX: number; maxY: number }

function bbox(walls: WallSeg[], arcs: DxfArc[], lines: DxfLine[]): BBox {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  const ex = (x: number, y: number) => {
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  for (const w of walls)  { ex(w.start.x, w.start.y); ex(w.end.x, w.end.y) }
  for (const a of arcs)   { ex(a.center.x-a.radius, a.center.y-a.radius); ex(a.center.x+a.radius, a.center.y+a.radius) }
  for (const l of lines)  { ex(l.start.x, l.start.y); ex(l.end.x, l.end.y) }
  if (!isFinite(x0))      { x0 = 0; y0 = 0; x1 = 1; y1 = 1 }
  return { minX: x0, minY: y0, maxX: x1, maxY: y1 }
}

// ─── Layer collection ─────────────────────────────────────────────────────────
// AutoCAD ACI color index: 7 = white/black, 1 = red, 4 = cyan, 3 = green, 2 = yellow, 8 = dark grey
const LAYER_COLORS: Record<string, number> = {
  '0':       7,  // white/black — walls draw as black on white bg
  'Detail':  9,  // grey
  'Doors':   7,  // white/black — same as walls (original AutoCAD doors are not coloured)
  'Windows': 4,  // cyan
  'Text':    3,  // green
  'Dimensions': 2,
  'Furniture':  8,
  'Annotations':6,
}

function collectLayers(
  walls: WallSeg[], texts: DxfText[], arcs: DxfArc[], lines: DxfLine[]
): Array<{ name: string; color: number }> {
  const map = new Map<string, number>(Object.entries(LAYER_COLORS))
  for (const w  of walls)  map.set(w.isDetail ? 'Detail' : '0', map.get(w.isDetail ? 'Detail' : '0') ?? 7)
  for (const tx of texts)  if (tx.layer) map.set(tx.layer, map.get(tx.layer) ?? 3)
  for (const a  of arcs)   if (a.layer)  map.set(a.layer,  map.get(a.layer)  ?? 7)
  for (const l  of lines)  if (l.layer)  map.set(l.layer,  map.get(l.layer)  ?? 7)
  return [...map.entries()].map(([name, color]) => ({ name, color }))
}

// ═════════════════════════════════════════════════════════════════════════════
// SECTION builders
// ═════════════════════════════════════════════════════════════════════════════

// ── HEADER ────────────────────────────────────────────────────────────────────
function headerSection(bb: BBox): string {
  const cx = (bb.minX + bb.maxX) / 2
  const cy = (bb.minY + bb.maxY) / 2
  const vh = Math.max(1, bb.maxY - bb.minY)
  return (
    g(0,'SECTION') + g(2,'HEADER') +
    g(9,'$ACADVER')      + g(1,'AC1015') +
    g(9,'$ACADMAINTVER') + g(70,6) +
    g(9,'$DWGCODEPAGE')  + g(3,'ANSI_1252') +
    g(9,'$INSUNITS')     + g(70,6) +      // 6 = metres
    g(9,'$EXTMIN')       + g(10,bb.minX) + g(20,bb.minY) + g(30,0) +
    g(9,'$EXTMAX')       + g(10,bb.maxX) + g(20,bb.maxY) + g(30,0) +
    g(9,'$LIMMIN')       + g(10,0) + g(20,0) +
    g(9,'$LIMMAX')       + g(10,bb.maxX+1) + g(20,bb.maxY+1) +
    g(9,'$ORTHOMODE')    + g(70,0) +
    g(9,'$LTSCALE')      + g(40,1) +
    g(9,'$TEXTSIZE')     + g(40,0.2) +
    g(9,'$TEXTSTYLE')    + g(7,'Standard') +
    g(9,'$CLAYER')       + g(8,'0') +
    g(9,'$CELTYPE')      + g(6,'ByLayer') +
    g(9,'$CECOLOR')      + g(62,256) +     // 256 = ByLayer
    g(9,'$DIMSCALE')     + g(40,1) +
    g(9,'$DIMSTYLE')     + g(2,'Standard') +
    g(9,'$LWDISPLAY')    + g(290,0) +
    g(9,'$INSBASE')      + g(10,0) + g(20,0) + g(30,0) +
    // Centre the view on the geometry so AutoCAD opens correctly zoomed
    g(9,'$VIEWCTR')      + g(10,cx) + g(20,cy) +
    g(9,'$VIEWSIZE')     + g(40,vh * 1.2) +  // 20% margin so geometry isn't edge-to-edge
    g(9,'$MEASUREMENT')  + g(70,1) +
    g(9,'$HANDSEED')     + g(5,'FFFF') +
    g(0,'ENDSEC')
  )
}

// ── CLASSES ───────────────────────────────────────────────────────────────────
function classesSection(): string {
  const cls = (dxfname: string, cppname: string, appname: string, proxy: number) =>
    g(0,'CLASS') + g(1,dxfname) + g(2,cppname) + g(3,appname) + g(90,proxy) + g(280,0) + g(281,0)
  return (
    g(0,'SECTION') + g(2,'CLASSES') +
    cls('LAYOUT',     'AcDbLayout',    'ObjectDBX Classes', 0) +
    cls('DICTIONARY', 'AcDbDictionary','ObjectDBX Classes', 0) +
    cls('MTEXT',      'AcDbMText',     'ObjectDBX Classes', 0) +
    cls('LWPOLYLINE', 'AcDbPolyline',  'ObjectDBX Classes', 0) +
    g(0,'ENDSEC')
  )
}

// ── TABLES ────────────────────────────────────────────────────────────────────
function tablesSection(layers: Array<{ name: string; color: number }>, bb: BBox, doorDefs: DoorBlockDef[]): string {
  let out = g(0,'SECTION') + g(2,'TABLES')

  // Use actual geometry centre + height so AutoCAD opens correctly zoomed
  const vCx = (bb.minX + bb.maxX) / 2
  const vCy = (bb.minY + bb.maxY) / 2
  const vH  = Math.max(1, bb.maxY - bb.minY) * 1.35   // 35% margin

  // VPORT
  out +=
    g(0,'TABLE') + g(2,'VPORT') +
    g(5,H_VPORT_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,1) +
    g(0,'VPORT') + g(5,nh()) + g(330,H_VPORT_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbViewportTableRecord') +
    g(2,'*Active') + g(70,0) +
    g(10,0) + g(20,0) + g(11,1) + g(21,1) +
    g(12,vCx) + g(22,vCy) + g(13,0) + g(23,0) +
    g(14,0.5) + g(24,0.5) + g(15,0.5) + g(25,0.5) +
    g(16,0) + g(26,0) + g(36,1) + g(17,0) + g(27,0) + g(37,0) +
    g(40,vH) + g(41,1.5) + g(42,50) +
    g(43,0) + g(44,0) + g(50,0) + g(51,0) +
    g(71,0) + g(72,1000) + g(73,1) + g(74,3) +
    g(75,0) + g(76,0) + g(77,0) + g(78,0) +
    g(0,'ENDTAB')

  // LTYPE
  out +=
    g(0,'TABLE') + g(2,'LTYPE') +
    g(5,H_LTYPE_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,3)
  for (const [h, name, desc] of [
    [H_LTYPE_BB,'ByBlock',''], [H_LTYPE_BL,'ByLayer',''], [H_LTYPE_CO,'Continuous','Solid line'],
  ] as const) {
    out +=
      g(0,'LTYPE') + g(5,h) + g(330,H_LTYPE_TBL) +
      g(100,'AcDbSymbolTableRecord') + g(100,'AcDbLinetypeTableRecord') +
      g(2,name) + g(70,0) + g(3,desc) + g(72,65) + g(73,0) + g(40,0)
  }
  out += g(0,'ENDTAB')

  // LAYER — layer 0 gets fixed handle H_LAYER_0, others get dynamic handles
  out +=
    g(0,'TABLE') + g(2,'LAYER') +
    g(5,H_LAYER_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,layers.length)
  for (const { name, color } of layers) {
    const h = name === '0' ? H_LAYER_0 : nh()
    out +=
      g(0,'LAYER') + g(5,h) + g(330,H_LAYER_TBL) +
      g(100,'AcDbSymbolTableRecord') + g(100,'AcDbLayerTableRecord') +
      g(2,name) + g(70,0) + g(62,color) + g(6,'Continuous') +
      g(370,-3) + g(390,H_LAYER_0)
  }
  out += g(0,'ENDTAB')

  // STYLE — Standard (fallback) + Arial (used for MTEXT labels)
  const H_STYLE_ARIAL = nh()
  out +=
    g(0,'TABLE') + g(2,'STYLE') +
    g(5,H_STYLE_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,2) +
    g(0,'STYLE') + g(5,H_STYLE_ST) + g(330,H_STYLE_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbTextStyleTableRecord') +
    g(2,'Standard') + g(70,0) + g(40,0) + g(41,1) +
    g(50,0) + g(71,0) + g(42,0.2) + g(3,'txt') + g(4,'') +
    // Arial TTF style — group 4 = bigfont, group 1071 = extended flag for TTF
    g(0,'STYLE') + g(5,H_STYLE_ARIAL) + g(330,H_STYLE_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbTextStyleTableRecord') +
    g(2,'Arial') + g(70,0) + g(40,0) + g(41,1) +
    g(50,0) + g(71,0) + g(42,0.2) + g(3,'Arial.ttf') + g(4,'') +
    g(0,'ENDTAB')

  // VIEW
  out +=
    g(0,'TABLE') + g(2,'VIEW') +
    g(5,H_VIEW_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,0) +
    g(0,'ENDTAB')

  // UCS
  out +=
    g(0,'TABLE') + g(2,'UCS') +
    g(5,H_UCS_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,0) +
    g(0,'ENDTAB')

  // APPID
  out +=
    g(0,'TABLE') + g(2,'APPID') +
    g(5,H_APPID_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,1) +
    g(0,'APPID') + g(5,H_APPID_AC) + g(330,H_APPID_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbRegAppTableRecord') +
    g(2,'ACAD') + g(70,0) +
    g(0,'ENDTAB')

  // DIMSTYLE — entry handle uses group code 105 (not 5!) per AC1015 spec
  out +=
    g(0,'TABLE') + g(2,'DIMSTYLE') +
    g(5,H_DIM_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70,1) +
    g(100,'AcDbDimStyleTable') +
    g(0,'DIMSTYLE') + g(105,H_DIM_ST) + g(330,H_DIM_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbDimStyleTableRecord') +
    g(2,'Standard') + g(70,0) +
    g(0,'ENDTAB')

  // BLOCK_RECORD — 2 standard + one per door block
  out +=
    g(0,'TABLE') + g(2,'BLOCK_RECORD') +
    g(5,H_BKREC_TBL) + g(330,0) + g(100,'AcDbSymbolTable') + g(70, 2 + doorDefs.length) +
    g(0,'BLOCK_RECORD') + g(5,H_MS_BKREC) + g(330,H_BKREC_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbBlockTableRecord') +
    g(2,'*Model_Space') + g(340,H_MS_LAYOUT) +
    g(0,'BLOCK_RECORD') + g(5,H_PS_BKREC) + g(330,H_BKREC_TBL) +
    g(100,'AcDbSymbolTableRecord') + g(100,'AcDbBlockTableRecord') +
    g(2,'*Paper_Space') + g(340,H_PS_LAYOUT)
  for (const d of doorDefs) {
    out +=
      g(0,'BLOCK_RECORD') + g(5,d.brHandle) + g(330,H_BKREC_TBL) +
      g(100,'AcDbSymbolTableRecord') + g(100,'AcDbBlockTableRecord') +
      g(2,d.name)
  }
  out += g(0,'ENDTAB')

  return out + g(0,'ENDSEC')
}

// ── BLOCKS ────────────────────────────────────────────────────────────────────
function blocksSection(doorDefs: DoorBlockDef[], lines: DxfLine[]): string {
  let out = g(0,'SECTION') + g(2,'BLOCKS')

  out +=
    g(0,'BLOCK')  + g(5,H_MS_BLOCK) + g(330,H_MS_BKREC) +
    g(100,'AcDbEntity') + g(8,'0') +
    g(100,'AcDbBlockBegin') +
    g(2,'*Model_Space') + g(70,0) + g(10,0) + g(20,0) + g(30,0) +
    g(3,'*Model_Space') + g(1,'') +
    g(0,'ENDBLK') + g(5,H_MS_ENDBL) + g(330,H_MS_BKREC) +
    g(100,'AcDbEntity') + g(8,'0') + g(100,'AcDbBlockEnd') +

    g(0,'BLOCK')  + g(5,H_PS_BLOCK) + g(330,H_PS_BKREC) +
    g(100,'AcDbEntity') + g(67,1) + g(8,'0') +
    g(100,'AcDbBlockBegin') +
    g(2,'*Paper_Space') + g(70,0) + g(10,0) + g(20,0) + g(30,0) +
    g(3,'*Paper_Space') + g(1,'') +
    g(0,'ENDBLK') + g(5,H_PS_ENDBL) + g(330,H_PS_BKREC) +
    g(100,'AcDbEntity') + g(67,1) + g(8,'0') + g(100,'AcDbBlockEnd')

  for (const d of doorDefs) out += doorBlockDef(d, lines)

  return out + g(0,'ENDSEC')
}

// ── ENTITIES helpers ──────────────────────────────────────────────────────────
function eH(type: string, layer: string): string {
  return (
    g(0,type) + g(5,nh()) + g(330,H_MS_BKREC) +
    g(100,'AcDbEntity') + g(8,layer || '0')
  )
}

function wallLine(w: WallSeg): string {
  const layer = w.isDetail ? 'Detail' : '0'
  return (
    eH('LINE', layer) +
    g(100,'AcDbLine') +
    g(10,w.start.x) + g(20,w.start.y) + g(30,0) +
    g(11,w.end.x)   + g(21,w.end.y)   + g(31,0)
  )
}

function dxfLine(ln: DxfLine): string {
  if (
    Math.abs(ln.end.x - ln.start.x) < 1e-9 &&
    Math.abs(ln.end.y - ln.start.y) < 1e-9
  ) return ''
  const layer = ln.handle.startsWith('dfl-') ? 'Doors'
              : ln.handle.startsWith('win-') ? 'Windows'
              : ln.layer || '0'
  return (
    eH('LINE', layer) +
    g(100,'AcDbLine') +
    g(10,ln.start.x) + g(20,ln.start.y) + g(30,ln.start.z ?? 0) +
    g(11,ln.end.x)   + g(21,ln.end.y)   + g(31,ln.end.z ?? 0)
  )
}

function lwPolyline(segs: WallSeg[]): string {
  const ordered = sortPolylineVertices(segs)
  const verts: Array<{ x: number; y: number }> = []
  for (const w of ordered) {
    const last = verts[verts.length - 1]
    if (!last || Math.abs(last.x - w.start.x) > 1e-9 || Math.abs(last.y - w.start.y) > 1e-9)
      verts.push({ x: w.start.x, y: w.start.y })
    verts.push({ x: w.end.x, y: w.end.y })
  }
  const closed =
    verts.length > 2 &&
    Math.abs(verts[0].x - verts[verts.length-1].x) < 0.01 &&
    Math.abs(verts[0].y - verts[verts.length-1].y) < 0.01
  if (closed) verts.pop()
  const layer = segs[0]?.isOuter ? '0' : '0'
  return (
    eH('LWPOLYLINE', layer) +
    g(100,'AcDbLwPolyline') +
    g(90,verts.length) +
    g(70,closed ? 1 : 0) +
    verts.map(v => g(10,v.x) + g(20,v.y)).join('')
  )
}

function arcEntity(arc: DxfArc, isDoorArc: boolean): string {
  const layer = isDoorArc ? 'Doors' : '0'
  const span = arc.end_angle > arc.start_angle
    ? arc.end_angle - arc.start_angle
    : arc.end_angle + 360 - arc.start_angle
  if (span >= 359.9) {
    // Full circle
    return (
      eH('CIRCLE', layer) +
      g(100,'AcDbCircle') +
      g(10,arc.center.x) + g(20,arc.center.y) + g(30,0) +
      g(40,arc.radius)
    )
  }

  const arcOut =
    eH('ARC', layer) +
    g(100,'AcDbCircle') +
    g(10,arc.center.x) + g(20,arc.center.y) + g(30,0) +
    g(40,arc.radius) +
    g(100,'AcDbArc') +
    g(50,arc.start_angle) + g(51,arc.end_angle)

  if (!isDoorArc) return arcOut

  // Door panel line: straight line from hinge (arc center) to the closed position
  // (the arc's start_angle point), matching the original AutoCAD door symbol appearance.
  const startRad = arc.start_angle * (Math.PI / 180)
  const px = arc.center.x + arc.radius * Math.cos(startRad)
  const py = arc.center.y + arc.radius * Math.sin(startRad)
  const panelLine =
    eH('LINE', layer) +
    g(100,'AcDbLine') +
    g(10,arc.center.x) + g(20,arc.center.y) + g(30,0) +
    g(11,px) + g(21,py) + g(31,0)

  return arcOut + panelLine
}

// MTEXT: insert point, height, attachment, text style, text content
function mtextEntity(tx: DxfText): string {
  return (
    eH('MTEXT', tx.layer || 'Text') +
    g(100,'AcDbMText') +
    g(10,tx.position.x) + g(20,tx.position.y) + g(30,0) +
    g(40,tx.height) +
    g(41,0) +      // reference rectangle width (0 = unlimited)
    g(71,1) +      // attachment = top-left
    g(72,1) +      // drawing direction = left to right
    g(7,'Arial') + // text style
    g(1, tx.text.replace(/\n/g, '\\P'))
  )
}

function isDoorArc(arc: DxfArc, lines: DxfLine[]): boolean {
  const key = arc.handle.replace(/^arc-/, '')
  return lines.some(ln => ln.handle.startsWith(`dfl-${key}`))
}

// ── Door block definitions ────────────────────────────────────────────────────
// Each door becomes a named BLOCK so that in AutoCAD clicking the door
// selects the whole entity (arc + panel line) rather than individual lines.
interface DoorBlockDef {
  arc: DxfArc
  name: string         // e.g. "DOOR_arc_u19"
  brHandle: string     // BLOCK_RECORD handle
  blkHandle: string    // BLOCK entity handle
  blkEndHandle: string // ENDBLK handle
  arcH: string         // ARC inside block
  lineH: string        // LINE inside block (panel)
  insertH: string      // INSERT handle in ENTITIES
}

function buildDoorDefs(arcs: DxfArc[], lines: DxfLine[]): DoorBlockDef[] {
  return arcs
    .filter(a => isDoorArc(a, lines))
    .map(a => ({
      arc: a,
      name: `DOOR_${a.handle.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
      brHandle:     nh(),
      blkHandle:    nh(),
      blkEndHandle: nh(),
      arcH:         nh(),
      lineH:        nh(),
      insertH:      nh(),
    }))
}

// BLOCK section entry for one door (geometry in local space, centered at origin)
function doorBlockDef(d: DoorBlockDef, allLines: DxfLine[]): string {
  const { arc, name, blkHandle, blkEndHandle, brHandle, arcH, lineH } = d
  // Determine panel angle: closed = arc endpoint nearest to a jamb line point
  const key = arc.handle.replace(/^arc-/, '')
  const frameLines = allLines.filter(l => l.handle.startsWith(`dfl-${key}`))
  const sRad = arc.start_angle * (Math.PI / 180)
  const eRad = arc.end_angle   * (Math.PI / 180)
  const sX = arc.center.x + arc.radius * Math.cos(sRad)
  const sY = arc.center.y + arc.radius * Math.sin(sRad)
  const eX = arc.center.x + arc.radius * Math.cos(eRad)
  const eY = arc.center.y + arc.radius * Math.sin(eRad)
  let dStart = Infinity, dEnd = Infinity
  for (const ln of frameLines) {
    for (const pt of [ln.start, ln.end]) {
      dStart = Math.min(dStart, Math.hypot(sX - pt.x, sY - pt.y))
      dEnd   = Math.min(dEnd,   Math.hypot(eX - pt.x, eY - pt.y))
    }
  }
  const panelRad = dEnd < dStart ? eRad : sRad
  // Panel point in LOCAL space (block is centered at origin, angles preserved)
  const px = arc.radius * Math.cos(panelRad)
  const py = arc.radius * Math.sin(panelRad)
  return (
    g(0,'BLOCK') + g(5,blkHandle) + g(330,brHandle) +
    g(100,'AcDbEntity') + g(8,'0') +
    g(100,'AcDbBlockBegin') +
    g(2,name) + g(70,0) +
    g(10,0) + g(20,0) + g(30,0) +
    g(3,name) + g(1,'') +
    // ARC entity (centered at origin in local space)
    g(0,'ARC') + g(5,arcH) + g(330,blkHandle) +
    g(100,'AcDbEntity') + g(8,'Doors') +
    g(100,'AcDbCircle') +
    g(10,0) + g(20,0) + g(30,0) +
    g(40,arc.radius) +
    g(100,'AcDbArc') +
    g(50,arc.start_angle) + g(51,arc.end_angle) +
    // Panel LINE: hinge (0,0) → closed position
    g(0,'LINE') + g(5,lineH) + g(330,blkHandle) +
    g(100,'AcDbEntity') + g(8,'Doors') +
    g(100,'AcDbLine') +
    g(10,0) + g(20,0) + g(30,0) +
    g(11,px) + g(21,py) + g(31,0) +
    g(0,'ENDBLK') + g(5,blkEndHandle) + g(330,brHandle) +
    g(100,'AcDbEntity') + g(8,'0') + g(100,'AcDbBlockEnd')
  )
}

// INSERT entity: places the door block at the arc's world center
function doorInsert(d: DoorBlockDef): string {
  const { arc, name, insertH } = d
  return (
    g(0,'INSERT') + g(5,insertH) + g(330,H_MS_BKREC) +
    g(100,'AcDbEntity') + g(8,'Doors') +
    g(100,'AcDbBlockReference') +
    g(2,name) +
    g(10,arc.center.x) + g(20,arc.center.y) + g(30,0) +
    g(41,1) + g(42,1) + g(43,1) +  // scale 1,1,1
    g(50,0)                          // rotation 0°
  )
}

// ── ENTITIES ──────────────────────────────────────────────────────────────────
function entitiesSection(walls: WallSeg[], texts: DxfText[], arcs: DxfArc[], lines: DxfLine[], doorDefs: DoorBlockDef[]): string {
  let out = g(0,'SECTION') + g(2,'ENTITIES')

  // 1. Ungrouped wall segments → LINE  (skip arc-tessellation chords)
  for (const w of walls.filter(w => !w.groupId && !w.fromArc)) out += wallLine(w)

  // 2. Grouped wall segments → LWPOLYLINE  (skip arc-tessellation chords)
  const groups = new Map<string, WallSeg[]>()
  for (const w of walls) {
    if (!w.groupId || w.fromArc) continue
    if (!groups.has(w.groupId)) groups.set(w.groupId, [])
    groups.get(w.groupId)!.push(w)
  }
  for (const segs of groups.values()) out += lwPolyline(segs)

  // 3. Door arcs → INSERT (block reference, selectable as one entity in AutoCAD)
  //    Non-door arcs/circles → direct ARC / CIRCLE entity
  const doorHandles = new Set(doorDefs.map(d => d.arc.handle))
  for (const d of doorDefs) out += doorInsert(d)
  for (const arc of arcs) {
    if (!doorHandles.has(arc.handle)) out += arcEntity(arc, false)
  }

  // 4. Window sill lines (win-*) and door jamb lines (dfl-*) and other raw lines.
  //    dfl-* lines mark the wall opening edges — include them so there are no visual gaps.
  for (const ln of lines) {
    out += dxfLine(ln)
  }

  // 5. MTEXT labels
  for (const tx of texts) out += mtextEntity(tx)

  return out + g(0,'ENDSEC')
}

// ── OBJECTS ───────────────────────────────────────────────────────────────────
function objectsSection(): string {
  const layout = (handle: string, name: string, bkRecHandle: string, tabOrder: number): string =>
    g(0,'LAYOUT') + g(5,handle) + g(330,H_LAY_DICT) +
    g(100,'AcDbPlotSettings') +
    g(1,'') + g(4,'A3') + g(6,'') +
    g(40,7.5) + g(41,20) + g(42,7.5) + g(43,20) +
    g(44,420) + g(45,297) +
    g(46,0) + g(47,0) + g(48,0) + g(49,0) +
    g(140,0) + g(141,0) + g(142,1) + g(143,1) +
    g(70,tabOrder === 0 ? 1024 : 0) +
    g(72,1) + g(73,0) + g(74,5) +
    g(7,'') + g(75,16) + g(76,0) + g(77,2) + g(78,300) +
    g(147,1) + g(148,0) + g(149,0) +
    g(100,'AcDbLayout') +
    g(1,name) + g(70,1) + g(71,tabOrder) +
    g(10,0) + g(20,0) +
    g(11,420) + g(21,297) +
    g(12,0) + g(22,0) + g(32,0) +
    g(14,1e+20) + g(24,1e+20) + g(34,1e+20) +
    g(15,-1e+20) + g(25,-1e+20) + g(35,-1e+20) +
    g(146,0) +
    g(13,0) + g(23,0) + g(33,0) +
    g(16,1) + g(26,0) + g(36,0) +
    g(17,0) + g(27,1) + g(37,0) +
    g(76,1) + g(330,bkRecHandle)

  return (
    g(0,'SECTION') + g(2,'OBJECTS') +

    g(0,'DICTIONARY') + g(5,H_ROOT_DICT) + g(330,0) +
    g(100,'AcDbDictionary') + g(281,1) +
    g(3,'ACAD_GROUP')  + g(350,H_GRP_DICT) +
    g(3,'ACAD_LAYOUT') + g(350,H_LAY_DICT) +

    g(0,'DICTIONARY') + g(5,H_GRP_DICT) + g(330,H_ROOT_DICT) +
    g(100,'AcDbDictionary') + g(281,1) +

    g(0,'DICTIONARY') + g(5,H_LAY_DICT) + g(330,H_ROOT_DICT) +
    g(100,'AcDbDictionary') + g(281,1) +
    g(3,'Model')   + g(350,H_MS_LAYOUT) +
    g(3,'Layout1') + g(350,H_PS_LAYOUT) +

    layout(H_MS_LAYOUT, 'Model',   H_MS_BKREC, 0) +
    layout(H_PS_LAYOUT, 'Layout1', H_PS_BKREC, 1) +

    g(0,'ENDSEC')
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// Public API
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete DXF R2000 string from the live canvas state.
 *
 * @param walls  - live wall segments (React state `walls`)
 * @param texts  - text labels (`planDoc.texts`)
 * @param arcs   - arc/circle entities (`planDoc.arcs`) — includes user-drawn circles
 * @param lines  - raw DXF lines (`planDoc.lines`) — dfl-* door frames, win-* windows
 */
export function exportToDxf(
  walls: WallSeg[],
  texts: DxfText[],
  arcs:  DxfArc[]  = [],
  lines: DxfLine[] = [],
): string {
  _h = 0x100   // reset handle counter on every export
  const doorDefs = buildDoorDefs(arcs, lines)
  const bb     = bbox(walls, arcs, lines)
  const layers = collectLayers(walls, texts, arcs, lines)
  return (
    headerSection(bb) +
    classesSection() +
    tablesSection(layers, bb, doorDefs) +
    blocksSection(doorDefs, lines) +
    entitiesSection(walls, texts, arcs, lines, doorDefs) +
    objectsSection() +
    g(0,'EOF')
  )
}

/**
 * Trigger a browser download of the DXF file.
 *
 * @param walls    - live wall segments
 * @param texts    - text labels
 * @param arcs     - arc entities (pass planDoc.arcs)
 * @param lines    - raw DXF lines (pass planDoc.lines)
 * @param filename - output filename (default: 'floor-plan.dxf')
 */
export function downloadDxf(
  walls:    WallSeg[],
  texts:    DxfText[],
  arcs:     DxfArc[]  = [],
  lines:    DxfLine[] = [],
  filename  = 'floor-plan.dxf',
): void {
  // AutoCAD requires CRLF line endings on Windows
  const content = exportToDxf(walls, texts, arcs, lines).replace(/\n/g, '\r\n')
  const blob = new Blob([content], { type: 'application/dxf' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
