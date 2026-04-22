/**
 * Editor Constants
 * 
 * All constant values used in the DXF Floor Plan Editor.
 * Extracted for better organization and maintainability.
 */

import { FURNITURE_DXF_TEMPLATES } from '@/data/furnitureLibraryDxf'

/* ─── AutoCAD Color Index (ACI) Palette ──────────────────────────────────────── */
export const ACI_PALETTE: Record<number, string> = {
  1:  '#FF0000', 2:  '#FFFF00', 3:  '#00FF00', 4:  '#00FFFF',
  5:  '#0000FF', 6:  '#FF00FF', 7:  '#FFFFFF', 8:  '#808080',
  9:  '#C0C0C0', 10: '#FF0000', 11: '#FF7F7F', 12: '#A50000',
  13: '#A55252', 14: '#7F0000', 20: '#FF7F00', 21: '#FFBF7F',
  22: '#A54F00', 30: '#FFBF00', 40: '#FFFF00', 50: '#7FFF00',
  60: '#00FF00', 70: '#00FF7F', 80: '#00FFFF', 90: '#007FFF',
  100:'#0000FF', 110:'#7F00FF', 120:'#FF00FF', 130:'#FF007F',
  140:'#FF0000', 150:'#804040', 160:'#408040', 170:'#404080',
  // 256 = BYLAYER (handled at runtime), 0 = BYBLOCK (fallback to white)
  0:  '#FFFFFF', 256:'#FFFFFF',
}

/* ─── Furniture Category Colors ──────────────────────────────────────────────── */
export const FURNITURE_CATEGORY_COLORS: Record<string, string> = {
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

/* ─── Room Template MIME Type ─────────────────────────────────────────────────── */
export const ROOM_TEMPLATE_MIME = 'application/x-room-template'

/* ─── Room Library Templates ──────────────────────────────────────────────────── */
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

/* ─── Stage & Canvas Constants ────────────────────────────────────────────────── */
export const STAGE_MIN_W = 320
export const STAGE_MIN_H = 280

/* ─── Snap & Alignment Thresholds ─────────────────────────────────────────────── */
export const SNAP_TH = 0.15
export const SNAP_LINE_TH = 0.25

/* ─── Handle & UI Sizes ────────────────────────────────────────────────────────── */
export const HP_SCR = 7  // Handle point screen radius

/* ─── Room Fill Colors ─────────────────────────────────────────────────────────── */
export const ROOM_COLORS = [
  'rgba(59,130,246,0.15)',
  'rgba(16,185,129,0.15)',
  'rgba(245,158,11,0.15)',
  'rgba(139,92,246,0.15)',
  'rgba(236,72,153,0.15)',
  'rgba(239,68,68,0.15)',
  'rgba(20,184,166,0.15)',
  'rgba(234,179,8,0.15)',
]

/* ─── Room Stroke Colors ───────────────────────────────────────────────────────── */
export const ROOM_STROKES = ROOM_COLORS.map(c => c.replace('0.15', '0.55'))

/* ─── Furniture Label to Category Map ──────────────────────────────────────────── */
/** Maps block_name / template label → category (built once at module load). */
export const FURNITURE_LABEL_TO_CATEGORY = new Map<string, string>(
  FURNITURE_DXF_TEMPLATES.map(t => [t.label, t.category as string])
)
