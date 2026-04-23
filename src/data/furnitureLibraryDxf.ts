import type { DxfInsert, DxfLine } from '@/constants/dxfJsonData'

/** Single 2D segment in metres, local furniture space (−Y = “depth” into room). */
export type FurnitureLineSeg = {
  start: { x: number; y: number }
  end: { x: number; y: number }
}

export const FURNITURE_DXF_CATEGORIES = [
  'Kitchen',
  'Bedroom',
  'Living Room',
  'Dining Room',
  'Bathroom',
  'Office',
  'Conference',
  'Break Room',
  'Reception',
  'Corridor',
] as const

export type FurnitureDxfCategory = (typeof FURNITURE_DXF_CATEGORIES)[number]

export type FurnitureDxfTemplate = {
  id: string
  label: string
  category: FurnitureDxfCategory
  /** DXF export layer for LINE entities */
  layer: string
  lines: FurnitureLineSeg[]
}

const L = (x0: number, y0: number, x1: number, y1: number): FurnitureLineSeg => ({
  start: { x: x0, y: y0 },
  end: { x: x1, y: y1 },
})

/** Axis-aligned rectangle from corner (x0,y0), width w, height h (h positive → drawn toward −Y). */
function rect(x0: number, y0: number, w: number, h: number): FurnitureLineSeg[] {
  return [
    L(x0, y0, x0 + w, y0),
    L(x0 + w, y0, x0 + w, y0 - h),
    L(x0 + w, y0 - h, x0, y0 - h),
    L(x0, y0 - h, x0, y0),
  ]
}

/**
 * All symbols are pure LINE entities (no blocks) so they round-trip to DXF as LINE.
 */
export const FURNITURE_DXF_TEMPLATES: FurnitureDxfTemplate[] = [
  /* ── Kitchen ── */
  {
    id: 'kitchen-stove',
    label: 'Stove',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: rect(0, 0, 0.6, 0.6),
  },
  {
    id: 'kitchen-sink',
    label: 'Sink',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: [...rect(0, 0, 0.55, 0.5), L(0.1, -0.25, 0.2, -0.35)],
  },
  {
    id: 'kitchen-fridge',
    label: 'Fridge',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: rect(0, 0, 0.65, 0.7),
  },
  {
    id: 'kitchen-island',
    label: 'Island',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: rect(0, 0, 1.4, 0.95),
  },
  {
    id: 'kitchen-wall-oven',
    label: 'Wall oven',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: rect(0, 0, 0.6, 0.45),
  },
  {
    id: 'kitchen-dishwasher',
    label: 'Dishwasher',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: rect(0, 0, 0.55, 0.55),
  },
  {
    id: 'kitchen-range-hood',
    label: 'Range hood',
    category: 'Kitchen',
    layer: 'Furniture',
    lines: [...rect(0, -0.2, 0.9, 0.2), L(0.45, 0, 0.45, -0.35)],
  },

  /* ── Bedroom ── */
  {
    id: 'bedroom-bed-double',
    label: 'Bed (double)',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 1.6, 2.0),
      L(0.25, 0, 0.25, -0.45),
      L(1.35, 0, 1.35, -0.45),
    ],
  },
  {
    id: 'bedroom-bed-single',
    label: 'Bed (single)',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: [...rect(0, 0, 1.0, 2.0), L(0.2, 0, 0.2, -0.4)],
  },
  {
    id: 'bedroom-wardrobe',
    label: 'Wardrobe',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: rect(0, 0, 2.0, 0.65),
  },
  {
    id: 'bedroom-nightstand',
    label: 'Nightstand',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: rect(0, 0, 0.45, 0.4),
  },
  {
    id: 'bedroom-dresser',
    label: 'Dresser',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: rect(0, 0, 1.2, 0.5),
  },

  /* ── Living Room ── */
  {
    id: 'living-sofa-3',
    label: 'Sofa (3-seat)',
    category: 'Living Room',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 2.1, 0.95),
      L(0.2, 0, 0.2, 0.12),
      L(1.9, 0, 1.9, 0.12),
    ],
  },
  {
    id: 'living-armchair',
    label: 'Armchair',
    category: 'Living Room',
    layer: 'Furniture',
    lines: [...rect(0, 0, 0.85, 0.85), L(0.425, 0, 0.425, 0.1)],
  },
  {
    id: 'living-coffee-table',
    label: 'Coffee table',
    category: 'Living Room',
    layer: 'Furniture',
    lines: rect(0, 0, 1.0, 0.55),
  },
  {
    id: 'living-tv-unit',
    label: 'TV unit',
    category: 'Living Room',
    layer: 'Furniture',
    lines: rect(0, 0, 1.8, 0.45),
  },
  {
    id: 'living-side-table',
    label: 'Side table',
    category: 'Living Room',
    layer: 'Furniture',
    lines: rect(0, 0, 0.45, 0.45),
  },

  /* ── Dining Room ── */
  {
    id: 'dining-table-6',
    label: 'Dining table (6)',
    category: 'Dining Room',
    layer: 'Furniture',
    lines: rect(0, 0, 1.6, 0.95),
  },
  {
    id: 'dining-chair',
    label: 'Dining chair',
    category: 'Dining Room',
    layer: 'Furniture',
    lines: [
      L(0, 0, 0, -0.4),
      L(0, -0.4, 0.45, -0.4),
      L(0.45, -0.4, 0.45, 0),
      L(0.225, 0, 0.225, 0.08),
    ],
  },
  {
    id: 'dining-sideboard',
    label: 'Sideboard',
    category: 'Dining Room',
    layer: 'Furniture',
    lines: rect(0, 0, 1.6, 0.45),
  },

  /* ── Bathroom ── */
  {
    id: 'bath-wc',
    label: 'WC',
    category: 'Bathroom',
    layer: 'Furniture',
    lines: rect(0, 0, 0.45, 0.65),
  },
  {
    id: 'bath-basin',
    label: 'Basin',
    category: 'Bathroom',
    layer: 'Furniture',
    lines: [...rect(0, 0, 0.55, 0.45), L(0.15, -0.2, 0.4, -0.2)],
  },
  {
    id: 'bath-shower',
    label: 'Shower',
    category: 'Bathroom',
    layer: 'Furniture',
    lines: rect(0, 0, 0.9, 0.9),
  },
  {
    id: 'bath-bath',
    label: 'Bathtub',
    category: 'Bathroom',
    layer: 'Furniture',
    lines: rect(0, 0, 1.7, 0.75),
  },

  /* ── Office ── */
  {
    id: 'office-desk',
    label: 'Desk',
    category: 'Office',
    layer: 'Furniture',
    lines: rect(0, 0, 1.4, 0.75),
  },
  {
    id: 'office-chair',
    label: 'Office chair',
    category: 'Office',
    layer: 'Furniture',
    lines: [
      L(0, 0, 0, -0.38),
      L(0, -0.38, 0.4, -0.38),
      L(0.4, -0.38, 0.4, 0),
      L(0.2, 0, 0.2, 0.08),
    ],
  },
  {
    id: 'office-bookshelf',
    label: 'Bookshelf',
    category: 'Office',
    layer: 'Furniture',
    lines: [...rect(0, 0, 0.9, 2.0), L(0, -0.66, 0.9, -0.66), L(0, -1.33, 0.9, -1.33)],
  },
  {
    id: 'office-filing',
    label: 'Filing cabinet',
    category: 'Office',
    layer: 'Furniture',
    lines: rect(0, 0, 0.45, 1.2),
  },

  /* ── Conference ── */
  {
    id: 'conf-table',
    label: 'Conference table',
    category: 'Conference',
    layer: 'Furniture',
    lines: rect(0, 0, 3.2, 1.2),
  },
  {
    id: 'conf-chair',
    label: 'Conference chair',
    category: 'Conference',
    layer: 'Furniture',
    lines: [
      L(0, 0, 0, -0.42),
      L(0, -0.42, 0.48, -0.42),
      L(0.48, -0.42, 0.48, 0),
      L(0.24, 0, 0.24, 0.1),
    ],
  },
  {
    id: 'conf-screen',
    label: 'Screen / credenza',
    category: 'Conference',
    layer: 'Furniture',
    lines: rect(0, 0, 2.4, 0.5),
  },

  /* ── Break Room ── */
  {
    id: 'break-counter',
    label: 'Counter',
    category: 'Break Room',
    layer: 'Furniture',
    lines: rect(0, 0, 2.2, 0.65),
  },
  {
    id: 'break-fridge',
    label: 'Fridge',
    category: 'Break Room',
    layer: 'Furniture',
    lines: rect(0, 0, 0.65, 0.7),
  },
  {
    id: 'break-table',
    label: 'Break table',
    category: 'Break Room',
    layer: 'Furniture',
    lines: rect(0, 0, 1.2, 0.75),
  },
  {
    id: 'break-chair',
    label: 'Break chair',
    category: 'Break Room',
    layer: 'Furniture',
    lines: [
      L(0, 0, 0, -0.35),
      L(0, -0.35, 0.38, -0.35),
      L(0.38, -0.35, 0.38, 0),
      L(0.19, 0, 0.19, 0.06),
    ],
  },

  /* ── Reception ── */
  {
    id: 'recep-desk',
    label: 'Reception desk',
    category: 'Reception',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 2.4, 0.75),
      L(0.8, -0.75, 0.8, -1.35),
      L(0.8, -1.35, 2.4, -1.35),
      L(2.4, -1.35, 2.4, -0.75),
    ],
  },
  {
    id: 'recep-chair',
    label: 'Visitor chair',
    category: 'Reception',
    layer: 'Furniture',
    lines: [
      L(0, 0, 0, -0.38),
      L(0, -0.38, 0.4, -0.38),
      L(0.4, -0.38, 0.4, 0),
      L(0.2, 0, 0.2, 0.08),
    ],
  },
  {
    id: 'recep-bench',
    label: 'Waiting bench',
    category: 'Reception',
    layer: 'Furniture',
    lines: rect(0, 0, 2.0, 0.55),
  },

  /* ── Corridor ── */
  {
    id: 'corr-bench',
    label: 'Corridor bench',
    category: 'Corridor',
    layer: 'Furniture',
    lines: rect(0, 0, 1.5, 0.45),
  },
  {
    id: 'corr-console',
    label: 'Console',
    category: 'Corridor',
    layer: 'Furniture',
    lines: rect(0, 0, 1.2, 0.35),
  },

  /* ── DXF block-name aliases (matched by furniture_inserts.block_name) ── */
  {
    id: 'bed-queen',
    label: 'Bed - Queen',
    category: 'Bedroom',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 1.6, 1.4),
      L(0.32, 0, 0.32, -0.58),   // left pillow divider
      L(1.28, 0, 1.28, -0.58),   // right pillow divider
    ],
  },
  {
    id: 'chair-rocking',
    label: 'Chair - Rocking',
    category: 'Living Room',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 0.35, 0.35),
      L(0.175, 0, 0.175, 0.05),  // back-rail stub
    ],
  },
  {
    id: 'copy-machine',
    label: 'Copy Machine',
    category: 'Office',
    layer: 'Furniture',
    lines: [
      ...rect(0, 0, 0.4, 0.4),
      L(0.15, -0.15, 0.25, -0.15),  // detail line
    ],
  },
]

const byId = new Map(FURNITURE_DXF_TEMPLATES.map(t => [t.id, t]))

export function getFurnitureDxfTemplate(id: string): FurnitureDxfTemplate | undefined {
  return byId.get(id)
}

/**
 * Maps DXF `block_name` values (as they arrive in `furniture_inserts`) to
 * the corresponding template id in FURNITURE_DXF_TEMPLATES.
 * Extend this map whenever a new block type appears in backend data.
 */
export const BLOCK_NAME_TO_TEMPLATE_ID: Record<string, string> = {
  'Bed - Queen':     'bed-queen',
  'Bed - Double':    'bedroom-bed-double',
  'Bed - Single':    'bedroom-bed-single',
  'Chair - Rocking': 'chair-rocking',
  'Copy Machine':    'copy-machine',
  'Sofa':            'living-sofa-3',
  'Desk':            'office-desk',
  'Wardrobe':        'bedroom-wardrobe',
  'Dining Table':    'dining-table-6',
  'WC':              'bath-wc',
  'Bathtub':         'bath-bath',
}

/**
 * Build DxfLine geometry for one insert using a specific template.
 * Handles follow `furn-{insertHandle}-{idx}` so all lines of the same insert
 * share the same group key when passed through `furnitureGroupKeyFromHandle`.
 */
export function buildFurnitureLinesFromInsertData(
  insertHandle: string,
  templateId: string,
  worldX: number,
  worldY: number,
): DxfLine[] {
  const tpl = byId.get(templateId)
  if (!tpl) return []
  return tpl.lines.map((line, idx) => ({
    entity_type: 'LINE' as const,
    handle: `furn-${insertHandle}-${idx}`,
    layer: tpl.layer,
    start: { x: worldX + line.start.x, y: worldY + line.start.y, z: 0 },
    end:   { x: worldX + line.end.x,   y: worldY + line.end.y,   z: 0 },
  }))
}

/**
 * Derive furniture_lines from a furniture_inserts array.
 * Called once in the component's useState initializer when the backend
 * response does not include pre-computed furniture_lines.
 */
export function deriveFurnitureLinesFromInserts(inserts: DxfInsert[]): DxfLine[] {
  const lines: DxfLine[] = []
  for (const ins of inserts) {
    if (ins.category !== 'furniture') continue
    const templateId = BLOCK_NAME_TO_TEMPLATE_ID[ins.block_name]
    if (!templateId) continue
    lines.push(...buildFurnitureLinesFromInsertData(
      ins.handle,
      templateId,
      ins.position.x,
      ins.position.y,
    ))
  }
  return lines
}

/**
 * Build furniture lines from a library template id for drag-and-drop placement.
 * Handles use a timestamp-based group id so each drop forms its own group.
 */
export function buildFurnitureLinesFromLibraryId(id: string, worldX: number, worldY: number, scale = 1): DxfLine[] {
  const tpl = byId.get(id)
  if (!tpl) return []
  const groupId = Date.now()
  return tpl.lines.map((line, idx) => ({
    entity_type: 'LINE' as const,
    handle: `furn-${groupId}-${idx}`,
    layer: tpl.layer,
    start: { x: worldX + line.start.x * scale, y: worldY + line.start.y * scale, z: 0 },
    end:   { x: worldX + line.end.x * scale,   y: worldY + line.end.y * scale,   z: 0 },
  }))
}

export function templatesForCategory(category: FurnitureDxfCategory): FurnitureDxfTemplate[] {
  return FURNITURE_DXF_TEMPLATES.filter(t => t.category === category)
}

export function searchFurnitureTemplates(query: string): FurnitureDxfTemplate[] {
  const q = query.trim().toLowerCase()
  if (!q) return FURNITURE_DXF_TEMPLATES
  return FURNITURE_DXF_TEMPLATES.filter(
    t =>
      t.label.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
  )
}
