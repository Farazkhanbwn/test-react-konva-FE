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
 * • Undo (Ctrl-Z) – 20-step stack; Delete/Backspace removes selected wall.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Line, Text, Group, Rect, Circle } from 'react-konva'
import type Konva from 'konva'
import { Link } from 'react-router-dom'
import polygonClipping from 'polygon-clipping'
import { DXF_JSON_DATA, type DxfJsonDocument } from '@/constants/dxfJsonData'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import { wallsFromDxfJson } from '@/utils/wallsFromDxfJson'

/* ─── Types ──────────────────────────────────────── */
interface Pt { x: number; y: number }

/* ─── Constants ──────────────────────────────────── */
const PAD = 55
const STAGE_MIN_W = 320
const STAGE_MIN_H = 280
const SNAP_TH = 0.15   // world metres — snap threshold
const HP_SCR  = 5      // endpoint handle radius in screen px
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

/* ─── Polygon area (shoelace, world Y-up coords) ── */
function polyArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
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
  const [history, setHistory]     = useState<WallSeg[][]>([])
  const [zoom, setZoom]           = useState(1)
  const [pos, setPos]             = useState({ x: 0, y: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionBox, setSelectionBox] = useState<{ start: Pt; current: Pt } | null>(null)
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [orthoEnabled, setOrthoEnabled] = useState(false)
  const [showDetail, setShowDetail]   = useState(true)
  const [showLabels, setShowLabels]   = useState(true)

  /* editor chrome (Synaps-style) */
  const [activeTool, setActiveTool] = useState<'select' | 'hand' | 'frame' | 'draw' | 'text'>('select')
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
    toMoveWallIds: string[]
    toMoveTextIds: string[]
    initWX:    number   // world-space mouse position when drag started
    initWY:    number
  }
  const activeDragRef = useRef<ActiveDrag | null>(null)
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta]   = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const dragDeltaRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 })

  /** Translate all selected walls by the current delta. */
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
    if (!activeDrag) return planDoc.texts
    const { toMoveTextIds } = activeDrag
    const { dx, dy } = dragDelta
    const tSet = new Set(toMoveTextIds)
    return planDoc.texts.map(tx => 
      tSet.has(tx.handle) ? { ...tx, position: { x: tx.position.x + dx, y: tx.position.y + dy, z: 0 } } : tx
    )
  }, [planDoc.texts, activeDrag, dragDelta])

  /* derived rooms — recalculates live during drag */
  const rooms = useMemo(() => {
    // Rooms only recalculate after drag ends for large performance gain, 
    // or we can keep it live if the wall count is low. Let's keep it live for now.
    const ws = activeDrag ? applyDrag(walls, activeDrag, dragDelta) : walls
    return detectRooms(ws)
  }, [walls, activeDrag, dragDelta, applyDrag])

  /* ── undo ── */
  const snapshot = useCallback(() => {
    setHistory(h => [...h.slice(-20), [...walls]])
  }, [walls])

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h
      setWalls(h[h.length - 1])
      return h.slice(0, -1)
    })
  }, [])

  /* ── snap helper ── */
  const getSnap = useCallback((x: number, y: number, excludeIds: string[]): Pt => {
    if (!snapEnabled) return { x, y }
    let best: Pt | null = null, bestD = SNAP_TH
    for (const w of walls) {
      if (excludeIds.includes(w.id)) continue
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
  }, [])

  /* ── rubber-band selection ── */
  const onStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const isStage = e.target === stageRef.current || e.target.name() === 'background-rect'
    if (!isStage || activeTool !== 'select' || spaceHeld) return

    const pos = stageRef.current?.getPointerPosition()
    if (!pos) return

    const [wx, wy] = toW(pos.x, pos.y, t)
    setSelectionBox({ start: { x: wx, y: wy }, current: { x: wx, y: wy } })
    if (!e.evt.shiftKey) setSelectedIds(new Set())
  }, [activeTool, spaceHeld, t])

  const onStageMouseMove = useCallback((_e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = stageRef.current?.getPointerPosition()
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
    }
  }, [selectionBox, activeDrag, t, orthoEnabled])

  const onStageMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
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

    setSelectedIds(prev => {
      if (e.evt.shiftKey) {
        const next = new Set(prev)
        newlySelected.forEach(id => next.add(id))
        return next
      }
      return newlySelected
    })
  }, [selectionBox, walls])

  /* ── mid-handle drag (move whole wall + stretch connected walls live) ── */
  const onMidDragStart = useCallback((
    e: Konva.KonvaEventObject<MouseEvent>,
    targetId: string,
    currentSel: Set<string>
  ) => {
    snapshot()
    const pos = stageRef.current?.getPointerPosition()
    if (!pos) return
    const [wx, wy] = toW(pos.x, pos.y, t)

    const toMoveW = walls.filter(w => currentSel.has(w.id)).map(w => w.id)
    const toMoveT = planDoc.texts.filter(t => currentSel.has(t.handle)).map(t => t.handle)

    const drag: ActiveDrag = {
      wallId:        targetId,
      toMoveWallIds: toMoveW,
      toMoveTextIds: toMoveT,
      initWX:        wx,
      initWY:        wy,
    }
    activeDragRef.current = drag
    setActiveDrag(drag)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [snapshot, walls, planDoc.texts, t])

  // Removed onMidDragMove as it's now handled by onStageMouseMove

  const onMidDragEnd = useCallback(() => {
    const drag = activeDragRef.current
    if (!drag) return
    const delta = dragDeltaRef.current
    
    setWalls(prev => applyDrag(prev, drag, delta))
    setPlanDoc(prev => ({
      ...prev,
      texts: prev.texts.map(tx => 
        new Set(drag.toMoveTextIds).has(tx.handle) 
          ? { ...tx, position: { x: tx.position.x + delta.dx, y: tx.position.y + delta.dy, z: 0 } } 
          : tx
      )
    }))

    activeDragRef.current = null
    setActiveDrag(null)
    dragDeltaRef.current = { dx: 0, dy: 0 }
    setDragDelta({ dx: 0, dy: 0 })
  }, [applyDrag])

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
      if (e.key === 'Escape') setSelectedIds(new Set())
      if (e.key === 'o' || e.key === 'O') setOrthoEnabled(v => !v)
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
  }, [selectedIds, snapshot, undo])

  /* ── derived values ── */
  const HR  = HP_SCR / zoom   // endpoint handle radius in canvas units
  const MH  = 7 / zoom        // mid-handle half-size
  const visWalls = showDetail ? walls : walls.filter(w => !w.isDetail)

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

  /** Walls with the active midpoint drag applied (single segment only). */
  const effectiveWalls = useMemo(() =>
    activeDrag ? applyDrag(visWalls, activeDrag, dragDelta) : visWalls,
  [visWalls, activeDrag, dragDelta, applyDrag])

  /** Wall length in metres */
  const wallLength = (w: WallSeg) =>
    Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y)

  /** Format a length according to the chosen units */
  const fmtLen = useCallback((m: number) => {
    if (units === 'cm')  return `${(m * 100).toFixed(2)} cm`
    if (units === 'mm')  return `${(m * 1000).toFixed(0)} mm`
    return `${m.toFixed(2)} m`
  }, [units])

  /**
   * Only the Hand tool (or Space-bar held) should pan the canvas.
   * In Select mode the stage must NOT be draggable — otherwise a slight pointer
   * movement while clicking a wall triggers a canvas pan instead of a selection.
   */
  const stageDraggable = (activeTool === 'hand' || spaceHeld) && !isDraggingEp

  const doc = planDoc

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
                <div key={i} className="dxf-room-pill small"
                  style={{ borderLeftColor: ROOM_STROKES[i % ROOM_STROKES.length] }}
                >
                  R{i + 1} · <strong>{formatArea(polyArea(r))}</strong>
                </div>
              ))}
          </div>
        </aside>

        {/* ── Center: toolbar + white canvas + prompt ── */}
        <main className="dxf-editor-main">
          <div className="dxf-floating-toolbar" role="toolbar" aria-label="Editor tools">
            {([
              { id: 'select' as const, label: 'Select', icon: 'M4 4l7 7-7 7' },
              { id: 'hand' as const, label: 'Pan', icon: 'M9 11V5l-2 2M15 11V5l2 2M9 19v-6l-2 2M15 19v-6l2 2' },
              { id: 'frame' as const, label: 'Frame', icon: 'M4 6h16v12H4z' },
              { id: 'draw' as const, label: 'Draw', icon: 'M3 17l6-6 4 4 8-8' },
              { id: 'text' as const, label: 'Text', icon: 'M5 5h14M9 9v10M15 9v10' },
            ]).map(({ id, label }) => (
              <button
                key={id}
                type="button"
                title={label}
                className={`dxf-tool-icon${activeTool === id ? ' active' : ''}`}
                onClick={() => setActiveTool(id)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  {id === 'select' && <path d="M4 4l7 7-4 1-3-4z" />}
                  {id === 'hand' && (
                    <>
                      <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
                      <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
                      <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
                      <path d="M18 11a2 2 0 1 1 4 0v5a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 19" />
                    </>
                  )}
                  {id === 'frame' && <rect x="5" y="5" width="14" height="14" rx="1" />}
                  {id === 'draw' && <path d="M3 21l4.5-4.5M12 3l6 6-9 9H3v-6l9-9z" />}
                  {id === 'text' && <><path d="M4 6h16M10 6v14M14 6v14" /></>}
                </svg>
              </button>
            ))}
            <span className="dxf-toolbar-divider" />
            <button type="button" className="dxf-tool-icon" title="Zoom out" onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}>−</button>
            <span className="dxf-zoom-pill">{Math.round(zoom * 100)}%</span>
            <button type="button" className="dxf-tool-icon" title="Zoom in" onClick={() => setZoom(z => Math.min(8, z + 0.25))}>+</button>
            <button type="button" className="dxf-tool-icon" title="Fit" onClick={() => { setZoom(1); setPos({ x: 0, y: 0 }) }}>⊡</button>
          </div>

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
            onClick={e => { if (e.target === stageRef.current) setSelectedIds(new Set()) }}
            style={{
              display: 'block',
              cursor: isDraggingEp
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
            <Layer listening={false}>
              {rooms.map((room, i) => (
                <Line
                  key={`room-${i}`}
                  points={room.flatMap(p => toC(p.x, p.y, t))}
                  closed
                  fill={ROOM_COLORS[i % ROOM_COLORS.length]}
                  stroke={ROOM_STROKES[i % ROOM_STROKES.length]}
                  strokeWidth={1 / zoom}
                />
              ))}
            </Layer>

            {/* ── walls + handles ── */}
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

                /* Dimension label — shown above/beside the wall midpoint */
                const lenLabel = showDim ? fmtLen(wallLength(wall)) : null
                /* Offset the label perpendicular to the wall so it doesn't overlap */
                const wallAngle  = Math.atan2(ey - sy, ex - sx)
                const perpOffset = 18 / zoom   // pixels above the wall (screen space)
                const labelX     = midX - Math.sin(wallAngle) * perpOffset
                const labelY     = midY + Math.cos(wallAngle) * perpOffset
                const labelFontSize = Math.max(9, 11 / zoom)

                return (
                  <Group key={wall.id}>
                    {/* ── wide invisible click / drag area ── */}
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke="transparent"
                      strokeWidth={16 / zoom}
                      onMouseDown={e => {
                        e.cancelBubble = true
                        // CAD logic: dragging an unselected item selects it first
                        let currentSel = selectedIds
                        if (!selectedIds.has(wall.id)) {
                          const isShift = e.evt.shiftKey
                          currentSel = new Set(isShift ? selectedIds : [])
                          currentSel.add(wall.id)
                          setSelectedIds(currentSel)
                        }
                        onMidDragStart(e as any, wall.id, currentSel)
                      }}
                      onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                      onClick={e => {
                        e.cancelBubble = true
                        const isShift = e.evt.shiftKey
                        setSelectedIds(prev => {
                          const next = new Set(isShift ? prev : [])
                          if (prev.has(wall.id) && isShift) next.delete(wall.id)
                          else next.add(wall.id)
                          return next
                        })
                      }}
                      onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                      onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                    />

                    {/* ── visible wall line ── */}
                    <Line
                      points={[sx, sy, ex, ey]}
                      stroke={
                        isDragging ? '#3b82f6'
                        : isSel    ? '#f59e0b'
                        : wallColor
                      }
                      strokeWidth={
                        (isDragging || isSel) ? 2.2 / zoom : strokeW
                      }
                      lineCap="round"
                      listening={false}
                    />

                    {/* ── live dimension label (Synaps-style blue pill) ── */}
                    {lenLabel && (
                      <Group listening={false}>
                        {/* pill background */}
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

                    {/* ── handles (only for non-detail walls) ── */}
                    {!wall.isDetail && (
                      <>
                        {/* mid-point square → drag to translate this wall only */}
                        <Rect
                          x={midX - MH} y={midY - MH}
                          width={MH * 2} height={MH * 2}
                          fill={isDragging ? '#2563eb' : '#334155'}
                          stroke="#64748b" strokeWidth={0.8 / zoom}
                          cornerRadius={2 / zoom}
                          draggable
                          onDragStart={e => {
                            e.cancelBubble = true
                            let currentSel = selectedIds
                            if (!selectedIds.has(wall.id)) {
                              const isShift = e.evt.shiftKey
                              currentSel = new Set(isShift ? selectedIds : [])
                              currentSel.add(wall.id)
                              setSelectedIds(currentSel)
                            }
                            onMidDragStart(e as any, wall.id, currentSel)
                          }}
                          onDragEnd={onMidDragEnd}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'move' }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        />

                        {/* start endpoint */}
                        <Circle
                          x={sx} y={sy} radius={HR}
                          fill={isSel ? '#3b82f6' : 'transparent'}
                          stroke={isSel ? '#fff' : 'transparent'}
                          strokeWidth={isSel ? 1.2 / zoom : 0}
                          draggable={isSel}
                          onDragStart={() => { snapshot(); setIsDraggingEp(true) }}
                          onDragMove={e => onEpDragMove(e, wall.id, 'start')}
                          onDragEnd={onEpDragEnd}
                          onMouseEnter={ev => { ev.target.getStage()!.container().style.cursor = 'crosshair' }}
                          onMouseLeave={ev => { ev.target.getStage()!.container().style.cursor = 'default' }}
                        />

                        {/* end endpoint */}
                        <Circle
                          x={ex} y={ey} radius={HR}
                          fill={isSel ? '#3b82f6' : 'transparent'}
                          stroke={isSel ? '#fff' : 'transparent'}
                          strokeWidth={isSel ? 1.2 / zoom : 0}
                          draggable={isSel}
                          onDragStart={() => { snapshot(); setIsDraggingEp(true) }}
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
                  const lines = tx.text.split('\n')
                  const [lx, ly] = toC(tx.position.x, tx.position.y, t)
                  const fs = Math.max(7, tx.height * t.sc * 3.5)
                  const isSel = selectedIds.has(tx.handle)
                  return (
                    <Group 
                      key={tx.handle}
                      x={lx}
                      y={ly}
                      onMouseEnter={e => { e.target.getStage()!.container().style.cursor = 'grab' }}
                      onMouseLeave={e => { e.target.getStage()!.container().style.cursor = 'default' }}
                      onMouseDown={e => {
                        e.cancelBubble = true
                        let currentSel = selectedIds
                        if (!selectedIds.has(tx.handle)) {
                          const isShift = (e.evt as any).shiftKey
                          currentSel = new Set(isShift ? selectedIds : [])
                          currentSel.add(tx.handle)
                          setSelectedIds(currentSel)
                        }
                        onMidDragStart(e as any, tx.handle, currentSel)
                      }}
                      onMouseUp={e => { e.cancelBubble = true; onMidDragEnd() }}
                    >
                      {/* Highlight Halo for Selection */}
                      {isSel && (
                        <Rect
                          x={-2 / zoom}
                          y={-fs - 2 / zoom}
                          width={(fs * lines[0].length * 0.6) + 4 / zoom}
                          height={(fs * lines.length * 1.25) + 4 / zoom}
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke="#f59e0b"
                          strokeWidth={1 / zoom}
                          cornerRadius={2 / zoom}
                        />
                      )}
                      <Text
                        x={0}
                        y={-fs}
                        text={lines[0]}
                        fontSize={fs}
                        fontStyle="bold"
                        fill={isSel ? '#f59e0b' : '#2563eb'}
                        fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                      />
                      {lines[1] && (
                        <Text
                          x={0}
                          y={-fs + fs * 1.25}
                          text={lines[1]}
                          fontSize={fs * 0.78}
                          fill={isSel ? '#f59e0b' : '#64748b'}
                          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
                        />
                      )}
                    </Group>
                  )
                })}
              </Layer>
            )}
          </Stage>
            </div>
          </div>
        </main>

        {/* ── Right: Canvas + Style (properties) ── */}
        <aside className="dxf-right-rail">
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
