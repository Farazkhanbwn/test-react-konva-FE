/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTEXT TYPES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Shared types for context providers.
 * Separated to avoid Fast Refresh issues.
 */

import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import type { WallSeg } from '@/utils/wallsFromDxfJson'

/**
 * Snapshot for undo/redo
 */
export interface EditorSnapshot {
  walls: WallSeg[]
  planDoc: DxfJsonDocument
}

/**
 * Available tools
 */
export type Tool = 
  | 'select' 
  | 'hand' 
  | 'frame' 
  | 'drawLine' 
  | 'drawPolyline' 
  | 'text' 
  | 'drawArc' 
  | 'drawCircle'

/**
 * Measurement units
 */
export type Units = 'm' | 'cm' | 'mm'
