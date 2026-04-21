/**
 * Editor Types & Interfaces
 * 
 * All type definitions and interfaces used in the DXF Floor Plan Editor.
 * Extracted for better organization and reusability.
 */

import type { WallSeg } from '@/utils/wallsFromDxfJson'
import type { DxfJsonDocument } from '@/constants/dxfJsonData'

/* ─── Basic Types ─────────────────────────────────────────────────────────────── */

/** Point in 2D space */
export interface Pt {
  x: number
  y: number
}

/* ─── Editor State Types ──────────────────────────────────────────────────────── */

/** Snapshot of editor state for undo/redo */
export interface EditorSnapshot {
  walls: WallSeg[]
  planDoc: DxfJsonDocument
}

/* ─── Drag Operation Types ────────────────────────────────────────────────────── */

/** Active drag operation for walls, texts, and arcs */
export interface ActiveDrag {
  wallId: string
  toMoveWallIds: string[]
  toMoveTextIds: string[]
  toMoveArcHandles: string[]
  initWX: number
  initWY: number
}

/** Active polyline drag operation */
export interface ActivePolylineDrag {
  polyHandle: string
  leaderSegId: string
  segments: { id: string; origStart: Pt; origEnd: Pt }[]
  initCX: number
  initCY: number
}

/** Rotation drag operation */
export interface RotationDrag {
  centerWX: number
  centerWY: number
  startMouseAngle: number
  wallIds: string[]
  textHandles: string[]
  arcHandles: string[]
  winKey?: string    // window group key if rotating a window
  furnKey?: string   // furniture group key if rotating furniture
}

/** Resize drag operation */
export interface ResizeDrag {
  handle: 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  initBBox: { minWX: number; minWY: number; maxWX: number; maxWY: number }
  initMouseWX: number
  initMouseWY: number
  wallIds: string[]
  textHandles: string[]
  arcHandles: string[]
  winKey?: string    // window group key if resizing a window
  furnKey?: string   // furniture group key if resizing furniture
}

/** Room drag operation */
export interface RoomDrag {
  wallIds: Set<string>
  initCX: number
  initCY: number
}

/* ─── Selection Box Type ──────────────────────────────────────────────────────── */

/** Selection box for rubber-band selection */
export interface SelectionBox {
  start: Pt
  current: Pt
}

/* ─── Tool Types ──────────────────────────────────────────────────────────────── */

/** Available editor tools */
export type EditorTool = 
  | 'select' 
  | 'hand' 
  | 'frame' 
  | 'drawLine' 
  | 'drawPolyline' 
  | 'text' 
  | 'drawArc' 
  | 'drawCircle'

/** Unit types for measurements */
export type MeasurementUnit = 'm' | 'cm' | 'mm'

/** Snap target types */
export type SnapTargetType = 'endpoint' | 'midpoint' | 'arcCenter' | 'arcQuadrant' | null

/* ─── Alignment Guide Type ────────────────────────────────────────────────────── */

/** Alignment guide for snapping */
export interface AlignmentGuide {
  type: 'h' | 'v'
  coord: number
}
