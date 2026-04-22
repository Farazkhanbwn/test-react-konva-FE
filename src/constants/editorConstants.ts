/**
 * Editor Constants
 * 
 * All constant values used in the DXF Floor Plan Editor.
 * Extracted for better organization and maintainability.
 */

import { FURNITURE_DXF_TEMPLATES } from '@/data/furnitureLibraryDxf'

/* ─── AutoCAD Color Index (ACI) Palette ──────────────────────────────────────── */
export const ACI_PALETTE: Record<number, string> = {
  // Standard named indices
  1: '#FF0000', 2: '#FFFF00', 3: '#00FF00', 4: '#00FFFF',
  5: '#0000FF', 6: '#FF00FF', 7: '#FFFFFF', 8: '#414141', 9: '#808080',
  // Red group
  10: '#FF0000', 11: '#FF7F7F', 12: '#A50000', 13: '#A55252', 14: '#7F0000',
  15: '#7F3F3F', 16: '#4F0000', 17: '#4F3232', 18: '#3F0000', 19: '#3F2929',
  // Orange group
  20: '#FF7F00', 21: '#FFBF7F', 22: '#A54F00', 23: '#A57F52', 24: '#7F3F00',
  25: '#7F5F3F', 26: '#4F2700', 27: '#4F3F32', 28: '#3F1F00', 29: '#3F3229',
  // Yellow-orange group
  30: '#FFBF00', 31: '#FFDF7F', 32: '#A57B00', 33: '#A59152', 34: '#7F5F00',
  35: '#7F6F3F', 36: '#4F3B00', 37: '#4F4532', 38: '#3F2F00', 39: '#3F3829',
  // Yellow group
  40: '#FFFF00', 41: '#FFFF7F', 42: '#A5A500', 43: '#A5A552', 44: '#7F7F00',
  45: '#7F7F3F', 46: '#4F4F00', 47: '#4F4F32', 48: '#3F3F00', 49: '#3F3F29',
  // Yellow-green group
  50: '#BFFF00', 51: '#DFFF7F', 52: '#7BA500', 53: '#91A552', 54: '#5F7F00',
  55: '#6F7F3F', 56: '#3B4F00', 57: '#454F32', 58: '#2F3F00', 59: '#383F29',
  // Chartreuse group
  60: '#7FFF00', 61: '#BFFF7F', 62: '#4FA500', 63: '#7CA552', 64: '#3F7F00',
  65: '#5F7F3F', 66: '#274F00', 67: '#3F4F32', 68: '#1F3F00', 69: '#323F29',
  // Spring green group
  70: '#3FFF00', 71: '#9FFF7F', 72: '#27A500', 73: '#67A552', 74: '#1F7F00',
  75: '#4F7F3F', 76: '#134F00', 77: '#374F32', 78: '#0F3F00', 79: '#2C3F29',
  // Green group
  80: '#00FF00', 81: '#7FFF7F', 82: '#00A500', 83: '#52A552', 84: '#007F00',
  85: '#3F7F3F', 86: '#004F00', 87: '#324F32', 88: '#003F00', 89: '#293F29',
  // Aquamarine group
  90: '#00FF3F', 91: '#7FFF9F', 92: '#00A527', 93: '#52A567', 94: '#007F1F',
  95: '#3F7F4F', 96: '#004F13', 97: '#324F37', 98: '#003F0F', 99: '#293F2C',
  // Emerald group
  100: '#00FF7F', 101: '#7FFFBF', 102: '#00A54F', 103: '#52A57C', 104: '#007F3F',
  105: '#3F7F5F', 106: '#004F27', 107: '#324F3F', 108: '#003F1F', 109: '#293F32',
  // Turquoise group
  110: '#00FFBF', 111: '#7FFFDF', 112: '#00A57B', 113: '#52A591', 114: '#007F5F',
  115: '#3F7F6F', 116: '#004F3B', 117: '#324F45', 118: '#003F2F', 119: '#293F38',
  // Cyan group
  120: '#00FFFF', 121: '#7FFFFF', 122: '#00A5A5', 123: '#52A5A5', 124: '#007F7F',
  125: '#3F7F7F', 126: '#004F4F', 127: '#324F4F', 128: '#003F3F', 129: '#293F3F',
  // Sky blue group
  130: '#00BFFF', 131: '#7FDFFF', 132: '#007BA5', 133: '#5291A5', 134: '#005F7F',
  135: '#3F6F7F', 136: '#003B4F', 137: '#32454F', 138: '#002F3F', 139: '#29383F',
  // Azure group
  140: '#007FFF', 141: '#7FBFFF', 142: '#004FA5', 143: '#527CA5', 144: '#003F7F',
  145: '#3F5F7F', 146: '#00274F', 147: '#323F4F', 148: '#001F3F', 149: '#29323F',
  // Cerulean group
  150: '#003FFF', 151: '#7F9FFF', 152: '#0027A5', 153: '#5267A5', 154: '#001F7F',
  155: '#3F4F7F', 156: '#00134F', 157: '#32374F', 158: '#000F3F', 159: '#292C3F',
  // Blue group
  160: '#0000FF', 161: '#7F7FFF', 162: '#0000A5', 163: '#5252A5', 164: '#00007F',
  165: '#3F3F7F', 166: '#00004F', 167: '#32324F', 168: '#00003F', 169: '#29293F',
  // Violet group
  170: '#3F00FF', 171: '#9F7FFF', 172: '#2700A5', 173: '#6752A5', 174: '#1F007F',
  175: '#4F3F7F', 176: '#13004F', 177: '#37324F', 178: '#0F003F', 179: '#2C293F',
  // Purple group
  180: '#7F00FF', 181: '#BF7FFF', 182: '#4F00A5', 183: '#7C52A5', 184: '#3F007F',
  185: '#5F3F7F', 186: '#27004F', 187: '#3F324F', 188: '#1F003F', 189: '#32293F',
  // Fuchsia group
  190: '#BF00FF', 191: '#DF7FFF', 192: '#7B00A5', 193: '#9152A5', 194: '#5F007F',
  195: '#6F3F7F', 196: '#3B004F', 197: '#45324F', 198: '#2F003F', 199: '#38293F',
  // Magenta group
  200: '#FF00FF', 201: '#FF7FFF', 202: '#A500A5', 203: '#A552A5', 204: '#7F007F',
  205: '#7F3F7F', 206: '#4F004F', 207: '#4F324F', 208: '#3F003F', 209: '#3F293F',
  // Pink-magenta group
  210: '#FF00BF', 211: '#FF7FDF', 212: '#A5007B', 213: '#A55291', 214: '#7F005F',
  215: '#7F3F6F', 216: '#4F003B', 217: '#4F3245', 218: '#3F002F', 219: '#3F2938',
  // Hot pink / rose group
  220: '#FF007F', 221: '#FF7FBF', 222: '#A5004F', 223: '#A5527C', 224: '#7F003F',
  225: '#7F3F5F', 226: '#4F0027', 227: '#4F323F', 228: '#3F001F', 229: '#3F2932',
  // Deep pink group
  230: '#FF003F', 231: '#FF7F9F', 232: '#A50027', 233: '#A55267', 234: '#7F001F',
  235: '#7F3F4F', 236: '#4F0013', 237: '#4F3237', 238: '#3F000F', 239: '#3F292C',
  // Red (repeat group, wraps back)
  240: '#FF0000', 241: '#FF7F7F', 242: '#A50000', 243: '#A55252', 244: '#7F0000',
  245: '#7F3F3F', 246: '#4F0000', 247: '#4F3232', 248: '#3F0000', 249: '#3F2929',
  // Grays
  250: '#505050', 251: '#696969', 252: '#828282', 253: '#BEBEBE', 254: '#D2D2D2', 255: '#E1E1E1',
  // Special
  0: '#FFFFFF', 256: '#FFFFFF',
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
