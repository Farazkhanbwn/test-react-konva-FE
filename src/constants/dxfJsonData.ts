/**
 * DXF JSON Type Definitions — Full AutoCAD Entity Coverage
 *
 * This file defines TypeScript interfaces for every entity type that ezdxf can
 * extract from a DXF file.  Your backend Python code should output one JSON
 * document matching DxfJsonDocument.  The frontend canvas reads this document
 * and renders every entity the same way AutoCAD does.
 *
 * ─── Entity coverage ───────────────────────────────────────────────────────
 * Geometry    : LINE, CIRCLE, ARC, ELLIPSE, SPLINE, POINT
 * Polylines   : LWPOLYLINE (with bulge), POLYLINE/VERTEX (2D & 3D)
 * Text        : TEXT (single-line), MTEXT (multi-line)
 * Dimensions  : DIMENSION (all sub-types)
 * Hatching    : HATCH (solid, predefined, custom patterns + gradient)
 * Blocks      : INSERT (with nested entity geometry expanded by backend)
 * Leaders     : LEADER, MLEADER
 * Raster      : IMAGE (reference — rendered as placeholder rect on canvas)
 * Wipeout     : WIPEOUT (mask polygon)
 * Tolerance   : TOLERANCE (GD&T frame)
 * Solid fill  : SOLID, TRACE (filled quad)
 * 3D (view)   : 3DFACE (projected as lines), MESH (wireframe), HELIX (polyline approx)
 * ─── NOT rendered (complex ACIS / kernel objects) ──────────────────────────
 *   3DSOLID, SURFACE, REGION, BODY — ezdxf can extract basic bounding info only.
 *   These are included as `raw_entities` so the stats panel shows them.
 */
 
/* ─── Shared primitives ────────────────────────────────────────────────── */
 
export interface DxfPoint {
  x: number
  y: number
  z: number
}
 
/** RGBA colour from ezdxf — either ACI index (0-256) or true-color hex string "#RRGGBB". */
export type DxfColor = number | string | null
 
/** Common header every entity must have. */
export interface DxfEntityBase {
  entity_type: string
  handle: string
  layer: string
  /** ACI colour index (256 = BYLAYER, 0 = BYBLOCK). Optional — fall back to layer colour. */
  color?: DxfColor
  /** True-colour override as "#RRGGBB" if set. */
  true_color?: string | null
  /** Line-type name ("ByLayer", "Continuous", "DASHED", …). */
  linetype?: string | null
  /** Line-type scale multiplier. */
  ltscale?: number
  /** Line-weight in hundredths of a mm (-3 = ByLayer, -2 = ByBlock). */
  lineweight?: number
  /** Transparency 0–100 (0 = opaque). */
  transparency?: number
  /** True when entity is on a frozen or off layer. Canvas can skip or dim it. */
  is_visible?: boolean
}
 
/* ══════════════════════════════════════════════════════════════════════════
   1.  GEOMETRY — simple primitives
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfLine extends DxfEntityBase {
  entity_type: 'LINE'
  start: DxfPoint
  end: DxfPoint
  /** Extrusion direction (default [0,0,1]). For non-default the backend should
   *  project start/end into WCS before emitting. */
  extrusion?: DxfPoint
}
 
export interface DxfCircle extends DxfEntityBase {
  entity_type: 'CIRCLE'
  center: DxfPoint
  radius: number
  extrusion?: DxfPoint
}
 
export interface DxfArc extends DxfEntityBase {
  entity_type: 'ARC'
  center: DxfPoint
  radius: number
  /** Degrees, counter-clockwise from +X, DXF convention. */
  start_angle: number
  end_angle: number
  extrusion?: DxfPoint
}
 
export interface DxfEllipse extends DxfEntityBase {
  entity_type: 'ELLIPSE'
  center: DxfPoint
  /** WCS vector from center to end of major axis. */
  major_axis: DxfPoint
  /** ratio = minor / major  (0 < ratio ≤ 1). */
  ratio: number
  /** Parameter range 0–2π (not degrees!). */
  start_param: number
  end_param: number
  extrusion?: DxfPoint
}
 
export interface DxfPoint_Entity extends DxfEntityBase {
  entity_type: 'POINT'
  location: DxfPoint
  extrusion?: DxfPoint
}
 
/** ezdxf exposes fit points and/or control points — emit whichever exist. */
export interface DxfSpline extends DxfEntityBase {
  entity_type: 'SPLINE'
  degree: number
  closed: boolean
  /** Knot values. */
  knots: number[]
  /** Control points [x,y,z]. */
  control_points: DxfPoint[]
  /** Fit points [x,y,z] (may be empty). */
  fit_points: DxfPoint[]
  /** Rational weights, one per control point (may be empty → all 1). */
  weights: number[]
  /**
   * Backend SHOULD tessellate the spline and store the result here so the
   * canvas can draw it as a polyline without re-implementing NURBS maths.
   * Points are in WCS order.
   */
  tessellation?: DxfPoint[]
}
 
/* ══════════════════════════════════════════════════════════════════════════
   2.  POLYLINES
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfPolylineVertex {
  x: number
  y: number
  z: number
  /** Bulge value: tan(θ/4) where θ is the arc subtended.  0 = straight segment. */
  bulge: number
  /** Starting width override (-1 = use polyline default). */
  start_width?: number
  /** Ending width override (-1 = use polyline default). */
  end_width?: number
}
 
export interface DxfPolyline extends DxfEntityBase {
  entity_type: 'LWPOLYLINE' | 'POLYLINE'
  closed: boolean
  vertex_count: number
  vertices: DxfPolylineVertex[]
  /** Constant width for all segments (0 = hairline). */
  const_width?: number
  elevation?: number
  extrusion?: DxfPoint
}
 
/* ══════════════════════════════════════════════════════════════════════════
   3.  TEXT
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfText extends DxfEntityBase {
  entity_type: 'TEXT' | 'MTEXT'
  text: string
  position: DxfPoint
  height: number
  /** Rotation angle in degrees (0 = horizontal). */
  rotation?: number
  /** Text style name. */
  style?: string
  /**
   * Horizontal justification for TEXT:
   * 0=Left  1=Center  2=Right  3=Aligned  4=Middle  5=Fit
   */
  halign?: number
  /**
   * Vertical justification for TEXT:
   * 0=Baseline  1=Bottom  2=Middle  3=Top
   */
  valign?: number
  /** MTEXT attachment point 1-9. */
  attachment?: number
  /** MTEXT reference width (column wrap). */
  ref_width?: number
  /** MTEXT flow direction. */
  flow_direction?: number
  /** X-axis direction vector for MTEXT. */
  text_direction?: DxfPoint
  /** Line spacing factor for MTEXT. */
  line_spacing?: number
}
 
export interface DxfAttrib extends DxfEntityBase {
  entity_type: 'ATTRIB'
  tag: string
  text: string
  position: DxfPoint
  height: number
  rotation?: number
  style?: string
}
 
/* ══════════════════════════════════════════════════════════════════════════
   4.  DIMENSIONS
   ══════════════════════════════════════════════════════════════════════════ */
 
export type DxfDimSubtype =
  | 'LINEAR' | 'ALIGNED' | 'ANGULAR' | 'ANGULAR_3P'
  | 'DIAMETER' | 'RADIUS' | 'ORDINATE' | 'ARC_LENGTH'
 
export interface DxfDimension extends DxfEntityBase {
  entity_type: 'DIMENSION'
  subtype: DxfDimSubtype
  /** Override text (empty string = auto). */
  text: string
  /** Text mid-point. */
  text_midpoint: DxfPoint
  dimension_style: string
  /** Measurement value computed by AutoCAD / ezdxf. */
  actual_measurement: number | null
  /** Definition points used to reconstruct geometry (varies by subtype). */
  defpoints: DxfPoint[]
  /** The auto-generated BLOCK reference that holds rendered geometry.
   *  The backend should inline this block's lines/arcs into `dim_geometry`. */
  geometry_block?: string
  /**
   * Tessellated dimension geometry (lines + arcs) so the canvas can draw it
   * without resolving the block reference.  Backend should populate this.
   */
  dim_lines?: Array<{ start: DxfPoint; end: DxfPoint }>
  dim_arcs?: Array<{ center: DxfPoint; radius: number; start_angle: number; end_angle: number }>
  dim_texts?: Array<{ text: string; position: DxfPoint; height: number; rotation: number }>
}
 
/* ══════════════════════════════════════════════════════════════════════════
   5.  HATCH
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfHatchEdge {
  type: 'LINE' | 'ARC' | 'ELLIPSE' | 'SPLINE'
  /** LINE */ start?: DxfPoint; end?: DxfPoint
  /** ARC */  center?: DxfPoint; radius?: number; start_angle?: number; end_angle?: number; is_ccw?: boolean
  /** ELLIPSE */ major_axis_end?: DxfPoint; minor_to_major?: number; ellipse_start_angle?: number; ellipse_end_angle?: number
  /** SPLINE */ degree?: number; spline_knots?: number[]; spline_control_pts?: DxfPoint[]; spline_fit_pts?: DxfPoint[]
}
 
export interface DxfHatchBoundary {
  type: 'POLYLINE' | 'EDGE'
  is_outer: boolean
  vertices?: DxfPolylineVertex[]
  edges?: DxfHatchEdge[]
}
 
export interface DxfHatch extends DxfEntityBase {
  entity_type: 'HATCH'
  /** "SOLID" | predefined pattern name (e.g. "ANSI31") | "USER_DEFINED" */
  pattern_name: string
  solid_fill: boolean
  associative: boolean
  boundaries: DxfHatchBoundary[]
  pattern_angle?: number
  pattern_scale?: number
  pattern_double?: boolean
  /** For gradient fills (GRADIENT entity or ezdxf gradient hatch). */
  gradient?: {
    name: string           // "LINEAR", "CYLINDER", etc.
    color1: DxfColor
    color2: DxfColor
    angle: number
    centered: boolean
    tint: number
  } | null
  elevation?: number
  extrusion?: DxfPoint
}
 
/* ══════════════════════════════════════════════════════════════════════════
   6.  INSERTS (block references)
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfInsertScale {
  x: number
  y: number
  z: number
}
 
export interface DxfInsert extends DxfEntityBase {
  entity_type: 'INSERT'
  block_name: string
  /** Frontend category tag assigned by backend (furniture / door / window / stair / …). */
  category: string
  is_anonymous_block: boolean
  position: DxfPoint
  rotation: number
  scale: DxfInsertScale
  block_entity_types: string[]
  block_entity_count: number
  attributes: DxfAttrib[]
  /**
   * Inline expanded geometry of the referenced block, already transformed
   * (translated + rotated + scaled) into WCS by the backend.
   * This lets the canvas render the block without resolving block definitions.
   */
  geometry?: {
    lines?: Array<{ start: DxfPoint; end: DxfPoint; color?: DxfColor; layer?: string }>
    arcs?: Array<{ center: DxfPoint; radius: number; start_angle: number; end_angle: number; color?: DxfColor; layer?: string }>
    circles?: Array<{ center: DxfPoint; radius: number; color?: DxfColor; layer?: string }>
    polylines?: Array<{ vertices: DxfPolylineVertex[]; closed: boolean; color?: DxfColor; layer?: string }>
    texts?: Array<{ text: string; position: DxfPoint; height: number; rotation: number; color?: DxfColor; layer?: string }>
    splines?: Array<{ tessellation: DxfPoint[]; color?: DxfColor; layer?: string }>
  }
}
 
/* ══════════════════════════════════════════════════════════════════════════
   7.  LEADERS / MLEADER / TOLERANCE
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfLeader extends DxfEntityBase {
  entity_type: 'LEADER'
  vertices: DxfPoint[]
  has_arrowhead: boolean
  leader_style: number  // 0=lines, 1=spline
  /** If the leader has an annotation, it's stored here. */
  annotation?: { type: 'MTEXT' | 'TOLERANCE' | 'INSERT'; text?: string; position?: DxfPoint }
}
 
export interface DxfMLeaderLine {
  vertices: DxfPoint[]
  break_points?: DxfPoint[]
}
 
export interface DxfMLeader extends DxfEntityBase {
  entity_type: 'MLEADER'
  leader_lines: DxfMLeaderLine[]
  dogleg_length: number
  dogleg_vector: DxfPoint
  landing_point: DxfPoint
  /** Content type: 0=none, 1=block, 2=mtext */
  content_type: 0 | 1 | 2
  mtext?: {
    text: string
    position: DxfPoint
    height: number
    rotation: number
    style: string
    attachment: number
  }
  block_content?: {
    block_name: string
    position: DxfPoint
    scale: DxfInsertScale
    rotation: number
    color: DxfColor
  }
  style: string
  arrowhead_size: number
  has_dogleg: boolean
}
 
export interface DxfTolerance extends DxfEntityBase {
  entity_type: 'TOLERANCE'
  /** Raw GD&T string with AutoCAD formatting codes. */
  string: string
  insertion_point: DxfPoint
  x_direction: DxfPoint
  dimension_style: string
}
 
/* ══════════════════════════════════════════════════════════════════════════
   8.  SOLID, TRACE (filled 2D quads)
   ══════════════════════════════════════════════════════════════════════════ */
 
/** A filled quadrilateral (4 corners, or 3 if p3 === p4). */
export interface DxfSolid extends DxfEntityBase {
  entity_type: 'SOLID' | 'TRACE'
  /** 4 corners in DXF winding order (p1, p2, p4, p3 in DXF spec — backend should normalise). */
  points: [DxfPoint, DxfPoint, DxfPoint, DxfPoint]
  elevation?: number
  extrusion?: DxfPoint
}
 
/* ══════════════════════════════════════════════════════════════════════════
   9.  IMAGE reference
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfImage extends DxfEntityBase {
  entity_type: 'IMAGE'
  /** Absolute or relative path stored in the DXF file. */
  image_path: string
  /** WCS position of the lower-left corner. */
  insert: DxfPoint
  /** U vector (width direction × pixel size). */
  u_vector: DxfPoint
  /** V vector (height direction × pixel size). */
  v_vector: DxfPoint
  /** Image size in pixels. */
  pixel_size: { x: number; y: number }
  clipping: boolean
  /** Clipping boundary vertices (if clipping === true). */
  clip_boundary?: DxfPoint[]
}
 
/* ══════════════════════════════════════════════════════════════════════════
   10. WIPEOUT (mask polygon)
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfWipeout extends DxfEntityBase {
  entity_type: 'WIPEOUT'
  insert: DxfPoint
  u_vector: DxfPoint
  v_vector: DxfPoint
  pixel_size: { x: number; y: number }
  boundary: DxfPoint[]
  show_frame: boolean
}
 
/* ══════════════════════════════════════════════════════════════════════════
   11. 3D entities (rendered as wireframe / projected)
   ══════════════════════════════════════════════════════════════════════════ */
 
/** 3DFACE — three or four coplanar corners.  Render as projected polygon outline. */
export interface DxfFace3d extends DxfEntityBase {
  entity_type: '3DFACE'
  points: [DxfPoint, DxfPoint, DxfPoint, DxfPoint]
  /** Edge visibility flags (bit mask: bit0=first, bit1=second, bit2=third, bit3=fourth). */
  invisible_edges: number
}
 
/** MESH — subdivision mesh. Backend should tessellate to triangles. */
export interface DxfMesh extends DxfEntityBase {
  entity_type: 'MESH'
  subdivision_level: number
  vertices: DxfPoint[]
  faces: number[][] // each face is an index list into vertices
}
 
/** HELIX — rendered as a tessellated polyline by the backend. */
export interface DxfHelix extends DxfEntityBase {
  entity_type: 'HELIX'
  /** Backend tessellation of the helix as WCS points. */
  tessellation: DxfPoint[]
  axis_base_point: DxfPoint
  axis_vector: DxfPoint
  radius: number
  turns: number
  turn_height: number
  handedness: 0 | 1  // 0=left, 1=right
}
 
/** Catch-all for entity types the backend found but the frontend has no dedicated renderer for. */
export interface DxfRawEntity {
  entity_type: string
  handle: string
  layer: string
  /** Serialised JSON string of the raw ezdxf entity dict for debugging. */
  raw_data?: string
}
 
/* ══════════════════════════════════════════════════════════════════════════
   LAYER TABLE  (from $TABLES section)
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfLayerDef {
  name: string
  color: number          // ACI 1-255 (negative = layer is off)
  true_color?: string    // "#RRGGBB" if set
  linetype: string
  lineweight: number     // hundredths of mm; -3 = default
  plot: boolean
  is_frozen: boolean
  is_locked: boolean
  description?: string
}
 
/* ══════════════════════════════════════════════════════════════════════════
   BLOCK TABLE  (definitions, not references)
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfBlockDef {
  name: string
  base_point: DxfPoint
  /** Summarised list of entity types inside the block. */
  entity_types: string[]
  entity_count: number
}
 
/* ══════════════════════════════════════════════════════════════════════════
   ROOT DOCUMENT
   ══════════════════════════════════════════════════════════════════════════ */
 
export interface DxfJsonDocument {
  source_file: string
  meta: {
    acad_version: string
    /** [minX, minY, minZ] in WCS (from $EXTMIN). */
    extmin: [number, number, number]
    /** [maxX, maxY, maxZ] in WCS (from $EXTMAX). */
    extmax: [number, number, number]
    /** DXF insertion units (see $INSUNITS; 4=mm, 5=cm, 6=m, etc.). */
    insunits?: number
    /** Linear units description string, e.g. "Meters". */
    measurement?: string
  }
  stats: {
    entity_counts: Record<string, number>
    polyline_count: number
    line_count: number
    arc_count: number
    text_count: number
    total_vertex_count: number
    insert_count?: number
    door_insert_count?: number
    window_insert_count?: number
    furniture_insert_count?: number
    stair_insert_count?: number
    hatch_count?: number
    dimension_count?: number
    spline_count?: number
    image_count?: number
    leader_count?: number
  }
 
  /** Layer table entries. */
  layers?: DxfLayerDef[]
  /** Block definitions (not instances). */
  block_defs?: DxfBlockDef[]
 
  /* ── Geometry primitives ── */
  lines:      DxfLine[]
  arcs:       DxfArc[]
  circles?:   DxfCircle[]
  ellipses?:  DxfEllipse[]
  splines?:   DxfSpline[]
  points?:    DxfPoint_Entity[]
  polylines:  DxfPolyline[]
 
  /* ── Text ── */
  texts:      DxfText[]
 
  /* ── Structured annotations ── */
  dimensions?:  DxfDimension[]
  leaders?:     DxfLeader[]
  mleaders?:    DxfMLeader[]
  tolerances?:  DxfTolerance[]
 
  /* ── Fill / hatch ── */
  hatches?:   DxfHatch[]
  solids?:    DxfSolid[]
 
  /* ── Raster / mask ── */
  images?:    DxfImage[]
  wipeouts?:  DxfWipeout[]
 
  /* ── 3D entities ── */
  faces3d?:   DxfFace3d[]
  meshes?:    DxfMesh[]
  helices?:   DxfHelix[]
 
  /* ── Block references categorised by backend ── */
  inserts:            DxfInsert[]
  door_inserts:       DxfInsert[]
  window_inserts:     DxfInsert[]
  furniture_inserts:  DxfInsert[]
  stair_inserts:      DxfInsert[]
 
  /* ── Door / window decorators (synthetic — generated by backend) ── */
  window_lines?:  DxfLine[]
  door_lines?:    DxfLine[]
  furniture_lines?: DxfLine[]
 
  /** Any entity types the backend could not classify go here for debug. */
  raw_entities?: DxfRawEntity[]
}


// export const DXF_JSON_DATA: DxfJsonDocument = {
//   source_file: "update-autocad-file-1.dxf",
//   meta: {
//     acad_version: "AC1032",
//     extmin: [-3.226776043334007, -3.716204318229131, 0.0],
//     extmax: [20.17745305040325, 7.947965026977579, 0.0],
//   },
//   stats: {
//     entity_counts: {
//       LINE: 55,
//       MTEXT: 8,
//       ARC: 6,
//       INSERT: 7,
//     },
//     polyline_count: 0,
//     line_count: 55,
//     arc_count: 6,
//     text_count: 8,
//     total_vertex_count: 0,
//   },
//   lines: [
//     {
//       entity_type: "LINE",
//       handle: "272",
//       layer: "0",
//       start: {
//         x: 0.6108066156627175,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "273",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: 4.795196564956298,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "274",
//       layer: "0",
//       start: {
//         x: 2.110806615662717,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 1.680900782392768,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "275",
//       layer: "0",
//       start: {
//         x: 0.6108066156627175,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 0.6108066156627175,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "276",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 6.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "277",
//       layer: "0",
//       start: {
//         x: 6.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 6.610806615662717,
//         y: 4.795196564956298,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "278",
//       layer: "0",
//       start: {
//         x: 6.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 10.31080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "279",
//       layer: "0",
//       start: {
//         x: 10.31080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 10.31080661566271,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "27A",
//       layer: "0",
//       start: {
//         x: 10.31080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 11.42530188863939,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "27B",
//       layer: "0",
//       start: {
//         x: 11.42530188863939,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906804,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "27C",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906804,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "280",
//       layer: "0",
//       start: {
//         x: 10.31080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 11.81080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "281",
//       layer: "0",
//       start: {
//         x: 11.81080661566271,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 11.81080661566271,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "282",
//       layer: "0",
//       start: {
//         x: 11.81080661566271,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 10.31080661566271,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28C",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28D",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 4.133346733624051,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28E",
//       layer: "0",
//       start: {
//         x: 4.133346733624051,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28F",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: 4.963522484637849,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "291",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 4.668873803766473,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "292",
//       layer: "0",
//       start: {
//         x: 8.551014477020999,
//         y: 3.945196564956298,
//         z: 0.0,
//       },
//       end: {
//         x: 12.56657259849683,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "293",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 13.14993700878509,
//         y: 3.932085732014996,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AC",
//       layer: "0",
//       start: {
//         x: 0.6108066156627175,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 0.6108066156627175,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AD",
//       layer: "0",
//       start: {
//         x: 0.6108066156627175,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//       end: {
//         x: 7.837662520394189,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AE",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906804,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AF",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//       end: {
//         x: 9.116909095798803,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2B9",
//       layer: "0",
//       start: {
//         x: 0.6108066156627165,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//       end: {
//         x: 0.6108066156627165,
//         y: 0.645196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2BA",
//       layer: "0",
//       start: {
//         x: 0.6108066156627165,
//         y: 0.645196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 2.961460380407515,
//         y: 0.645196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2C7",
//       layer: "0",
//       start: {
//         x: 4.224234568028453,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//       end: {
//         x: 4.224234568028453,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2CF",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906804,
//         y: 0.2548507496712702,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2D0",
//       layer: "0",
//       start: {
//         x: 15.92798613906804,
//         y: 0.2548507496712702,
//         z: 0.0,
//       },
//       end: {
//         x: 12.16251774591546,
//         y: 0.2548507496712702,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15A5",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: -1.359953888159623,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E1",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 4.795196564956298,
//         z: 0.0,
//       },
//       end: {
//         x: 2.110806615662717,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E2",
//       layer: "0",
//       start: {
//         x: 6.610806615662717,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 7.941414477020998,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E3",
//       layer: "0",
//       start: {
//         x: 11.42798613906804,
//         y: -0.3897045409896123,
//         z: 0.0,
//       },
//       end: {
//         x: 11.42798613906805,
//         y: -0.7213204897056472,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E4",
//       layer: "0",
//       start: {
//         x: 12.16251774591546,
//         y: 0.2548507496712702,
//         z: 0.0,
//       },
//       end: {
//         x: 11.42798613906804,
//         y: -0.3897045409896123,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E5",
//       layer: "0",
//       start: {
//         x: 3.610806615662717,
//         y: 0.202466429484332,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: -0.7503538881596232,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E6",
//       layer: "0",
//       start: {
//         x: 2.961460380407515,
//         y: 0.645196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662717,
//         y: 0.202466429484332,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "25C8",
//       layer: "0",
//       start: {
//         x: 5.278473803766473,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 6.610806615662717,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "25CA",
//       layer: "0",
//       start: {
//         x: 11.42798613906805,
//         y: -1.330920489705647,
//         z: 0.0,
//       },
//       end: {
//         x: 11.42798613906805,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "25CC",
//       layer: "0",
//       start: {
//         x: 1.162244020022889,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 0.6108066156627175,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//     },
//     /* ── Door-frame lines resolved from INSERT+block (flattened to world space) ─ */
//     // Door *U19 (rot=270°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u19-1",
//       layer: "0",
//       start: { x: 3.451493532527252, y: -0.750353888159623, z: 0.0 },
//       end: { x: 3.603893532527252, y: -0.750353888159623, z: 0.0 },
//     },
//     // Door *U19 (rot=270°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u19-2",
//       layer: "0",
//       start: { x: 3.451493532527252, y: -1.360153888159623, z: 0.0 },
//       end: { x: 3.603893532527252, y: -1.360153888159623, z: 0.0 },
//     },

//     // Door *U27-A (rot=0°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27a-1",
//       layer: "0",
//       start: { x: 13.1499370087851, y: 4.033685732015, z: 0.0 },
//       end: { x: 13.1499370087851, y: 3.932085732015, z: 0.0 },
//     },
//     // Door *U27-A (rot=0°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27a-2",
//       layer: "0",
//       start: { x: 12.5403370087851, y: 4.033685732015, z: 0.0 },
//       end: { x: 12.5403370087851, y: 3.932085732015, z: 0.0 },
//     },

//     // Door *U27-B (rot=0°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27b-1",
//       layer: "0",
//       start: { x: 1.77184402002289, y: 4.07048327746712, z: 0.0 },
//       end: { x: 1.77184402002289, y: 3.96888327746712, z: 0.0 },
//     },
//     // Door *U27-B (rot=0°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27b-2",
//       layer: "0",
//       start: { x: 1.16224402002289, y: 4.07048327746712, z: 0.0 },
//       end: { x: 1.16224402002289, y: 3.96888327746712, z: 0.0 },
//     },

//     // Door *U27-C (rot=0°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27c-1",
//       layer: "0",
//       start: { x: 5.27847380376647, y: 4.8967965649563, z: 0.0 },
//       end: { x: 5.27847380376647, y: 4.7951965649563, z: 0.0 },
//     },
//     // Door *U27-C (rot=0°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27c-2",
//       layer: "0",
//       start: { x: 4.66887380376647, y: 4.8967965649563, z: 0.0 },
//       end: { x: 4.66887380376647, y: 4.7951965649563, z: 0.0 },
//     },

//     // Door *U27-D (rot=0°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27d-1",
//       layer: "0",
//       start: { x: 8.551014477021, y: 4.0467965649563, z: 0.0 },
//       end: { x: 8.551014477021, y: 3.9451965649563, z: 0.0 },
//     },
//     // Door *U27-D (rot=0°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u27d-2",
//       layer: "0",
//       start: { x: 7.941414477021, y: 4.0467965649563, z: 0.0 },
//       end: { x: 7.941414477021, y: 3.9451965649563, z: 0.0 },
//     },

//     // Door *U40 (rot=270°) – left jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u40-1",
//       layer: "0",
//       start: { x: 11.5693336730504, y: -0.721320489705647, z: 0.0 },
//       end: { x: 11.4169336730504, y: -0.721320489705647, z: 0.0 },
//     },
//     // Door *U40 (rot=270°) – right jamb
//     {
//       entity_type: "LINE",
//       handle: "dfl-u40-2",
//       layer: "0",
//       start: { x: 11.5693336730504, y: -1.330920489705647, z: 0.0 },
//       end: { x: 11.4169336730504, y: -1.330920489705647, z: 0.0 },
//     },

//     /* ── Window lines resolved from *U45 INSERT ────────────────────────────── */
//     // Window *U45 – INSERT at (1.562330, 7.237460) scale=0.001 rot=0°
//     // Left sill line
//     {
//       entity_type: "LINE",
//       handle: "win-u45-1",
//       layer: "0",
//       start: { x: 1.56233022318554, y: 7.38745951649011, z: 0.0 },
//       end: { x: 1.56233022318554, y: 7.23745951649011, z: 0.0 },
//     },
//     // Right sill line
//     {
//       entity_type: "LINE",
//       handle: "win-u45-2",
//       layer: "0",
//       start: { x: 2.46233022318554, y: 7.38745951649011, z: 0.0 },
//       end: { x: 2.46233022318554, y: 7.23745951649011, z: 0.0 },
//     },
//     // Middle sill line
//     {
//       entity_type: "LINE",
//       handle: "win-u45-3",
//       layer: "0",
//       start: { x: 1.56233022318554, y: 7.31245951649011, z: 0.0 },
//       end: { x: 2.46233022318554, y: 7.31245951649011, z: 0.0 },
//     },
//   ],
//   arcs: [
//     /* ── Doors – arcs resolved from INSERT+block geometry ──────────────────
//      * Each arc is computed by applying the INSERT's (position, scale, rotation)
//      * to the single visible ARC entity inside the referenced dynamic block.
//      * Block units are inches; scale = 0.0254 → metres.
//      * Angles are in degrees, CCW from positive X, matching AutoCAD convention.
//      * ─────────────────────────────────────────────────────────────────────── */

//     // Door *U19 – INSERT at (3.451, -0.750) rot=270°  → arc sweeps 180°→270°
//     {
//       entity_type: "ARC",
//       handle: "arc-u19",
//       layer: "0",
//       center: { x: 3.451493532527252, y: -0.750353888159623, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 180.0,
//       end_angle: 270.0,
//     },
//     // Door *U27 – INSERT at (13.150, 4.034) rot=0°  → arc sweeps 90°→180°
//     {
//       entity_type: "ARC",
//       handle: "arc-u27a",
//       layer: "0",
//       center: { x: 13.1499370087851, y: 4.033685732015, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 90.0,
//       end_angle: 180.0,
//     },
//     // Door *U27 – INSERT at (1.772, 4.070) rot=0°
//     {
//       entity_type: "ARC",
//       handle: "arc-u27b",
//       layer: "0",
//       center: { x: 1.77184402002289, y: 4.07048327746712, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 90.0,
//       end_angle: 180.0,
//     },
//     // Door *U27 – INSERT at (5.278, 4.897) rot=0°
//     {
//       entity_type: "ARC",
//       handle: "arc-u27c",
//       layer: "0",
//       center: { x: 5.27847380376647, y: 4.8967965649563, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 90.0,
//       end_angle: 180.0,
//     },
//     // Door *U27 – INSERT at (8.551, 4.047) rot=0°
//     {
//       entity_type: "ARC",
//       handle: "arc-u27d",
//       layer: "0",
//       center: { x: 8.551014477021, y: 4.0467965649563, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 90.0,
//       end_angle: 180.0,
//     },
//     // Door *U40 – INSERT at (11.569, -0.721) rot=270°  → arc sweeps 270°→0°
//     {
//       entity_type: "ARC",
//       handle: "arc-u40",
//       layer: "0",
//       center: { x: 11.5693336730504, y: -0.721320489705647, z: 0.0 },
//       radius: 0.6096,
//       start_angle: 270.0,
//       end_angle: 0.0,
//     },
//   ],
//   polylines: [],
//   texts: [
//     {
//       entity_type: "MTEXT",
//       handle: "286",
//       layer: "0",
//       text: "Kitchen\n3.0 X 3.35",
//       position: {
//         x: 1.229801813707155,
//         y: 5.960516156780833,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "287",
//       layer: "0",
//       text: "WC + Bath\n3.0m X 3.35",
//       position: {
//         x: 5.021054678442993,
//         y: 6.052879579090877,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "294",
//       layer: "0",
//       text: "Store\n3.7m X 3.35",
//       position: {
//         x: 7.591709183901571,
//         y: 5.978988852146535,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "2A4",
//       layer: "0",
//       text: "Store\n1.5m X 2.5",
//       position: {
//         x: 10.03290603215367,
//         y: 6.520098392898682,
//         z: 0.0,
//       },
//       height: 0.16,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "2AB",
//       layer: "0",
//       text: "BED Room\n4.5m X 3.35",
//       position: {
//         x: 12.75151177528369,
//         y: 6.1691173445058,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "2CE",
//       layer: "0",
//       text: "Room\n3.0m X 3.35",
//       position: {
//         x: 1.230241099470788,
//         y: -0.6129244931801799,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "2DB",
//       layer: "0",
//       text: "Drawing Dinning",
//       position: {
//         x: 6.115583552940847,
//         y: 2.262510909754944,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "2E2",
//       layer: "0",
//       text: "Room\n4.5m X 3.35",
//       position: {
//         x: 12.97510712638473,
//         y: -0.8274489592508933,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//   ],
//    : [
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-1",
//       layer: "0",
//       start: { x: 2.372132069842834, y: 3.479264313995376, z: 0 },
//       end: { x: 2.372132069842834, y: 2.079264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-2",
//       layer: "0",
//       start: { x: 2.372132069842834, y: 2.079264313995376, z: 0 },
//       end: { x: 3.972132069842834, y: 2.079264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-3",
//       layer: "0",
//       start: { x: 3.972132069842834, y: 2.079264313995376, z: 0 },
//       end: { x: 3.972132069842834, y: 3.479264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-4",
//       layer: "0",
//       start: { x: 3.972132069842834, y: 3.479264313995376, z: 0 },
//       end: { x: 2.372132069842834, y: 3.479264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-pillow-1",
//       layer: "0",
//       start: { x: 2.692132069842834, y: 3.479264313995376, z: 0 },
//       end: { x: 2.692132069842834, y: 2.899264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-bed-pillow-2",
//       layer: "0",
//       start: { x: 3.652132069842834, y: 3.479264313995376, z: 0 },
//       end: { x: 3.652132069842834, y: 2.899264313995376, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-chair-1",
//       layer: "0",
//       start: { x: 1.481668176941881, y: 2.363800714190402, z: 0 },
//       end: { x: 1.481668176941881, y: 2.013800714190402, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-chair-2",
//       layer: "0",
//       start: { x: 1.481668176941881, y: 2.013800714190402, z: 0 },
//       end: { x: 1.831668176941881, y: 2.013800714190402, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-chair-3",
//       layer: "0",
//       start: { x: 1.831668176941881, y: 2.013800714190402, z: 0 },
//       end: { x: 1.831668176941881, y: 2.363800714190402, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-chair-back",
//       layer: "0",
//       start: { x: 1.656668176941881, y: 2.363800714190402, z: 0 },
//       end: { x: 1.656668176941881, y: 2.413800714190402, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-copier-1",
//       layer: "0",
//       start: { x: 13.81459250254958, y: 2.278631800417986, z: 0 },
//       end: { x: 13.81459250254958, y: 1.878631800417986, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-copier-2",
//       layer: "0",
//       start: { x: 13.81459250254958, y: 1.878631800417986, z: 0 },
//       end: { x: 14.21459250254958, y: 1.878631800417986, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-copier-3",
//       layer: "0",
//       start: { x: 14.21459250254958, y: 1.878631800417986, z: 0 },
//       end: { x: 14.21459250254958, y: 2.278631800417986, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-copier-4",
//       layer: "0",
//       start: { x: 14.21459250254958, y: 2.278631800417986, z: 0 },
//       end: { x: 13.81459250254958, y: 2.278631800417986, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "furn-copier-detail",
//       layer: "0",
//       start: { x: 13.96459250254958, y: 2.128631800417986, z: 0 },
//       end: { x: 14.06459250254958, y: 2.128631800417986, z: 0 },
//     },
//   ],
// };

export const DXF_JSON_DATA: DxfJsonDocument = {
  source_file: "Dog_House_Plan_Sample.dxf",
  meta: {
    acad_version: "R2004",
    extmin: [
      -72.84099999907295,
      -44.26627823665541,
      -0.0015258207003583
    ],
    extmax: [
      182.2577886904063,
      88.31281825763233,
      3.49246037e-08
    ],
    insunits: 1,
    measurement: 0
  },
  layers: [
    {
      name: "0",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: true,
      description: ""
    },
    {
      name: "Lines & Shapes",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Text",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Content",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Leaders",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "-Dimensions",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Fills",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Pictures",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Defpoints",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: false,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "_Annotations",
      color: 1,
      true_color: null,
      linetype: "Continuous",
      lineweight: 25,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "-Dimensions @ 16",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    },
    {
      name: "Text @ 16",
      color: 7,
      true_color: null,
      linetype: "Continuous",
      lineweight: -3,
      plot: true,
      is_frozen: false,
      is_locked: false,
      description: ""
    }
  ],
  block_defs: [
    {
      name: "_DotSmall",
      base_point: {
        x: 0.0,
        y: 0.0,
        z: 0.0
      },
      entity_types: [
        "LWPOLYLINE"
      ],
      entity_count: 1
    },
    {
      name: "A$C32E16775",
      base_point: {
        x: 0.0,
        y: 0.0,
        z: 0.0
      },
      entity_types: [
        "MTEXT"
      ],
      entity_count: 1
    }
  ],
  lines: [],
  arcs: [
    {
      entity_type: "ARC",
      handle: "87F",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      center: {
        x: 50.25000357440138,
        y: 25.25000003379158,
        z: 0.0
      },
      radius: 12.0,
      start_angle: 6.36e-14,
      end_angle: 180.0
    },
    {
      entity_type: "ARC",
      handle: "3A9C",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      center: {
        x: 50.25000357440137,
        y: 25.25000003379159,
        z: 0.0
      },
      radius: 14.00000000000001,
      start_angle: 0.0,
      end_angle: 180.0
    }
  ],
  circles: [],
  ellipses: [],
  splines: [],
  points: [],
  polylines: [
    {
      entity_type: "LWPOLYLINE",
      handle: "2C5",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 6,
      vertices: [
        {
          x: -21.74999642559862,
          y: 1.250000033791606,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -9.749996425598624,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -9.749996425598624,
          y: 73.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -57.74999642559862,
          y: 73.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -57.74999642559862,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -45.74999642559862,
          y: 1.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "4D4",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: true,
      vertex_count: 4,
      vertices: [
        {
          x: -63.74999642559862,
          y: 79.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -3.749996425598653,
          y: 79.25000003379164,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -3.749996425598624,
          y: -4.749999966208378,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -63.74999642559862,
          y: -4.749999966208392,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "560",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: -33.74999642559862,
          y: 79.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -33.74999642559862,
          y: -4.749999966208392,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "79C",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 20.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 80.25000357440139,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "7AF",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 26.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 26.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "7C2",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 74.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 74.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "7D5",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 20.25000357440138,
          y: 25.2500000337916,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 50.25000357440138,
          y: 55.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "7E8",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 50.25000357440138,
          y: 55.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 80.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "7FB",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 80.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 80.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "80E",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 80.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 50.25000357440138,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "821",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 3,
      vertices: [
        {
          x: 20.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 20.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 50.25000357440138,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "83D",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 38.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 38.25000357440138,
          y: 25.25000003379158,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "850",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 62.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 62.25000357440138,
          y: 25.2500000337916,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "B84",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 3,
      vertices: [
        {
          x: 62.25000357440138,
          y: 53.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 74.25000357440138,
          y: 53.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 74.25000357440138,
          y: 41.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "B89",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 62.25000357440138,
          y: 53.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 74.25000357440138,
          y: 41.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1AEA",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 3,
      vertices: [
        {
          x: 20.25000357440138,
          y: 29.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 50.25000357440138,
          y: 59.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 80.25000357440138,
          y: 29.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B0A",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B1D",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 104.2500035744014,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 104.2500035744014,
          y: 27.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B30",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 176.2500035744014,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 176.2500035744013,
          y: 27.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B43",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 181.2500035744014,
          y: 25.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 25.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B56",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 31.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B69",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B7C",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 99.25000357440138,
          y: 27.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 181.2500035744014,
          y: 27.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1B8F",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 98.25000357440138,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1BA2",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 99.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 99.25000357440138,
          y: 31.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1BB5",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 182.2500035744014,
          y: 25.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 61.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1BC8",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 181.2500035744014,
          y: 25.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 181.2500035744014,
          y: 31.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1BF4",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 99.25000357440138,
          y: 25.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "1C0B",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 98.25000357440138,
          y: 59.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 182.2500035744014,
          y: 59.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "39C4",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 36.25000357440138,
          y: 1.250000033791608,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 36.25000357440138,
          y: 25.25000003379158,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "39D7",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 2,
      vertices: [
        {
          x: 64.25000357440138,
          y: 1.250000033791607,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: 64.25000357440138,
          y: 25.25000003379159,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "3B1D",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 3,
      vertices: [
        {
          x: -45.74999642559862,
          y: 1.25000003379161,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -45.74999642559863,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -55.74999642559862,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "3B39",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 3,
      vertices: [
        {
          x: -21.74999642559862,
          y: 1.250000033791606,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -21.74999642559862,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -11.74999642559862,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    },
    {
      entity_type: "LWPOLYLINE",
      handle: "3B55",
      layer: "Lines & Shapes",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      closed: false,
      vertex_count: 4,
      vertices: [
        {
          x: -55.74999642559862,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -55.74999642559862,
          y: 71.2500000337916,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -11.74999642559862,
          y: 71.2500000337916,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        },
        {
          x: -11.74999642559862,
          y: 3.250000033791594,
          z: 0.0,
          bulge: 0.0,
          start_width: 0.0,
          end_width: 0.0
        }
      ],
      const_width: 0.0,
      elevation: 0.0
    }
  ],
  texts: [
    {
      entity_type: "MTEXT",
      handle: "BA4",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "12",
      position: {
        x: 66.43820500000001,
        y: 57.62604512687585,
        z: 0.0
      },
      height: 2.4,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 3.237448840381992,
      flow_direction: 5,
      line_spacing: 1.0
    },
    {
      entity_type: "MTEXT",
      handle: "BBE",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "12",
      position: {
        x: 76.68966806843443,
        y: 48.42485899653889,
        z: 0.0
      },
      height: 2.4,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 3.237448840381992,
      flow_direction: 5,
      line_spacing: 1.0
    },
    {
      entity_type: "MTEXT",
      handle: "3467",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "FLOOR PLAN",
      position: {
        x: -57.72933,
        y: -22.62766087312415,
        z: 0.0
      },
      height: 2.4,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 20.73976807639836,
      flow_direction: 5,
      line_spacing: 1.0
    },
    {
      entity_type: "MTEXT",
      handle: "3481",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "FRONT ELEVATION",
      position: {
        x: 26.351746005132,
        y: -22.65065981740947,
        z: 0.0
      },
      height: 2.4,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 30.89825756926938,
      flow_direction: 5,
      line_spacing: 1.0
    },
    {
      entity_type: "MTEXT",
      handle: "3911",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "SIDE ELEVATION",
      position: {
        x: 104.3754612339275,
        y: -22.71004865992735,
        z: 0.0
      },
      height: 2.4,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 30.89825756926938,
      flow_direction: 5,
      line_spacing: 1.0
    },
    {
      entity_type: "MTEXT",
      handle: "3927",
      layer: "Text @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      text: "DOG HOUSE PLANS",
      position: {
        x: -57.74999642559862,
        y: -37.25541151691327,
        z: 0.0
      },
      height: 5.333333333333333,
      rotation: 0.0,
      style: "Annotative",
      attachment: 1,
      ref_width: 71.12594361073214,
      flow_direction: 5,
      line_spacing: 1.0
    }
  ],
  dimensions: [
    {
      entity_type: "DIMENSION",
      handle: "2DB",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -71.8435298498824,
        y: 37.2500000337916,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 72.0,
      defpoints: [
        {
          x: -69.74999642559862,
          y: 73.25000003379161,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -58.03799642559862,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: -70.62999642559863,
            y: 1.250000033791612,
            z: 0.0
          }
        },
        {
          start: {
            x: -58.03799642559862,
            y: 73.25000003379161,
            z: 0.0
          },
          end: {
            x: -70.62999642559862,
            y: 73.25000003379161,
            z: 0.0
          }
        },
        {
          start: {
            x: -69.74999642559864,
            y: 2.130000033791611,
            z: 0.0
          },
          end: {
            x: -69.74999642559862,
            y: 72.37000003379161,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6'",
          position: {
            x: -71.8435298498824,
            y: 37.2500000337916,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "2EE",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -33.74999642559862,
        y: 87.3300000337916,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 47.99999999999999,
      defpoints: [
        {
          x: -9.749996425598624,
          y: 85.25000003379161,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -57.74999642559862,
            y: 73.5380000337916,
            z: 0.0
          },
          end: {
            x: -57.74999642559862,
            y: 86.1300000337916,
            z: 0.0
          }
        },
        {
          start: {
            x: -9.749996425598624,
            y: 73.5380000337916,
            z: 0.0
          },
          end: {
            x: -9.749996425598624,
            y: 86.1300000337916,
            z: 0.0
          }
        },
        {
          start: {
            x: -56.86999642559862,
            y: 85.25000003379161,
            z: 0.0
          },
          end: {
            x: -10.62999642559863,
            y: 85.25000003379161,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;4'",
          position: {
            x: -33.74999642559862,
            y: 87.3300000337916,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "300",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -51.74999642559862,
        y: -12.83261933865041,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 12.0,
      defpoints: [
        {
          x: -45.74999642559862,
          y: -10.74999996620839,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -57.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -57.74999642559862,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -45.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -45.74999642559862,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -56.86999642559862,
            y: -10.74999996620839,
            z: 0.0
          },
          end: {
            x: -46.62999642559863,
            y: -10.74999996620839,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;1'",
          position: {
            x: -51.74999642559862,
            y: -12.83261933865041,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "312",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -33.74999642559862,
        y: -12.83261933865041,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 23.999999999999996,
      defpoints: [
        {
          x: -21.74999642559862,
          y: -10.74999996620839,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -45.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -45.74999642559862,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -21.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -21.74999642559862,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -44.86999642559862,
            y: -10.74999996620839,
            z: 0.0
          },
          end: {
            x: -22.62999642559862,
            y: -10.74999996620839,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;2'",
          position: {
            x: -33.74999642559862,
            y: -12.83261933865041,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "324",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -15.74999642559862,
        y: -12.83261933865041,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 11.999999999999996,
      defpoints: [
        {
          x: -9.749996425598624,
          y: -10.74999996620839,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -21.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -21.74999642559862,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -9.749996425598624,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -9.749996425598624,
            y: -11.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -20.86999642559863,
            y: -10.74999996620839,
            z: 0.0
          },
          end: {
            x: -10.62999642559863,
            y: -10.74999996620839,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;1'",
          position: {
            x: -15.74999642559862,
            y: -12.83261933865041,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "8E8",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 12.15647015011761,
        y: 16.25000003379161,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 30.0,
      defpoints: [
        {
          x: 14.25000357440139,
          y: 31.25000003379161,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 25.96200357440138,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: 13.37000357440138,
            y: 1.250000033791612,
            z: 0.0
          }
        },
        {
          start: {
            x: 25.96200357440138,
            y: 31.25000003379161,
            z: 0.0
          },
          end: {
            x: 13.37000357440139,
            y: 31.25000003379161,
            z: 0.0
          }
        },
        {
          start: {
            x: 14.25000357440138,
            y: 2.130000033791611,
            z: 0.0
          },
          end: {
            x: 14.25000357440139,
            y: 30.37000003379161,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;2'-6\"",
          position: {
            x: 12.15647015011761,
            y: 16.25000003379161,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "903",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 12.15647015011761,
        y: 46.25000003379162,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 29.999999999999996,
      defpoints: [
        {
          x: 14.25000357440138,
          y: 61.25000003379162,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 25.96200357440138,
            y: 31.25000003379161,
            z: 0.0
          },
          end: {
            x: 13.37000357440137,
            y: 31.25000003379161,
            z: 0.0
          }
        },
        {
          start: {
            x: 49.96200357440138,
            y: 61.25000003379161,
            z: 0.0
          },
          end: {
            x: 13.37000357440138,
            y: 61.25000003379162,
            z: 0.0
          }
        },
        {
          start: {
            x: 14.25000357440138,
            y: 32.13000003379162,
            z: 0.0
          },
          end: {
            x: 14.25000357440138,
            y: 60.37000003379162,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;2'-6\"",
          position: {
            x: 12.15647015011761,
            y: 46.25000003379162,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "939",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 31.16738420195935,
        y: 31.25000003379159,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 11.999999999999996,
      defpoints: [
        {
          x: 33.25000357440138,
          y: 37.25000003379159,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 37.96200357440138,
            y: 25.25000003379158,
            z: 0.0
          },
          end: {
            x: 32.37000357440137,
            y: 25.25000003379158,
            z: 0.0
          }
        },
        {
          start: {
            x: 49.96200357440137,
            y: 37.25000003379158,
            z: 0.0
          },
          end: {
            x: 32.37000357440137,
            y: 37.25000003379159,
            z: 0.0
          }
        },
        {
          start: {
            x: 33.25000357440138,
            y: 26.13000003379158,
            z: 0.0
          },
          end: {
            x: 33.25000357440138,
            y: 36.37000003379158,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;1'",
          position: {
            x: 31.16738420195935,
            y: 31.25000003379159,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "AC4",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: -33.74999642559862,
        y: -18.82999996620839,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 47.99999999999999,
      defpoints: [
        {
          x: -9.749996425598626,
          y: -16.74999996620839,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: -57.74999642559862,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -57.74999642559862,
            y: -17.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -9.749996425598624,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: -9.749996425598626,
            y: -17.62999996620839,
            z: 0.0
          }
        },
        {
          start: {
            x: -56.86999642559862,
            y: -16.74999996620839,
            z: 0.0
          },
          end: {
            x: -10.62999642559863,
            y: -16.74999996620839,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;4'",
          position: {
            x: -33.74999642559862,
            y: -18.82999996620839,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "DD7",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 7.159089522559624,
        y: 31.25000003379162,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 60.0,
      defpoints: [
        {
          x: 9.250003574401383,
          y: 61.25000003379162,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 25.96200357440138,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: 8.37000357440137,
            y: 1.250000033791613,
            z: 0.0
          }
        },
        {
          start: {
            x: 49.96200357440138,
            y: 61.25000003379161,
            z: 0.0
          },
          end: {
            x: 8.37000357440138,
            y: 61.25000003379162,
            z: 0.0
          }
        },
        {
          start: {
            x: 9.250003574401369,
            y: 2.130000033791613,
            z: 0.0
          },
          end: {
            x: 9.250003574401383,
            y: 60.37000003379162,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;5'",
          position: {
            x: 7.159089522559624,
            y: 31.25000003379162,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1186",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 32.25000357440138,
        y: -12.83261933865042,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 12.000000000000004,
      defpoints: [
        {
          x: 38.25000357440138,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 26.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 26.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 38.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 38.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 27.13000357440137,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 37.37000357440137,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;1'",
          position: {
            x: 32.25000357440138,
            y: -12.83261933865042,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1198",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 50.25000357440138,
        y: -12.83261933865042,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 24.0,
      defpoints: [
        {
          x: 62.25000357440138,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 38.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 38.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 62.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 62.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 39.13000357440138,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 61.37000357440137,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;2'",
          position: {
            x: 50.25000357440138,
            y: -12.83261933865042,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "11AA",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 68.25000357440138,
        y: -12.83261933865042,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 11.999999999999993,
      defpoints: [
        {
          x: 62.25000357440138,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 74.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 74.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 62.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 62.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 73.37000357440138,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 63.13000357440138,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;1'",
          position: {
            x: 68.25000357440138,
            y: -12.83261933865042,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "11BC",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 31.16738420195936,
        y: 13.2500000337916,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 23.99999999999997,
      defpoints: [
        {
          x: 33.25000357440138,
          y: 1.250000033791609,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 37.96200357440138,
            y: 25.25000003379158,
            z: 0.0
          },
          end: {
            x: 32.37000357440138,
            y: 25.25000003379158,
            z: 0.0
          }
        },
        {
          start: {
            x: 37.96200357440138,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: 32.37000357440137,
            y: 1.25000003379161,
            z: 0.0
          }
        },
        {
          start: {
            x: 33.25000357440138,
            y: 24.37000003379158,
            z: 0.0
          },
          end: {
            x: 33.25000357440138,
            y: 2.130000033791609,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;2'",
          position: {
            x: 31.16738420195936,
            y: 13.2500000337916,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "19DD",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 50.25000357440138,
        y: -18.8299999662084,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 48.0,
      defpoints: [
        {
          x: 74.25000357440138,
          y: -16.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 26.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 26.25000357440138,
            y: -17.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 74.25000357440138,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 74.25000357440138,
            y: -17.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 27.13000357440137,
            y: -16.74999996620841,
            z: 0.0
          },
          end: {
            x: 73.37000357440138,
            y: -16.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;4'",
          position: {
            x: 50.25000357440138,
            y: -18.8299999662084,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1AB4",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 69.34397356075881,
        y: 19.2500000337916,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 35.999999999999964,
      defpoints: [
        {
          x: 67.25000357440138,
          y: 1.250000033791606,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 50.53800357440137,
            y: 37.25000003379158,
            z: 0.0
          },
          end: {
            x: 68.13000357440139,
            y: 37.25000003379158,
            z: 0.0
          }
        },
        {
          start: {
            x: 62.53800357440137,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: 68.13000357440137,
            y: 1.250000033791606,
            z: 0.0
          }
        },
        {
          start: {
            x: 67.25000357440139,
            y: 36.37000003379158,
            z: 0.0
          },
          end: {
            x: 67.25000357440138,
            y: 2.130000033791606,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;3'",
          position: {
            x: 69.34397356075881,
            y: 19.2500000337916,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1C7F",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 77.25000357440138,
        y: 17.15646660950783,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 6.0,
      defpoints: [
        {
          x: 74.25000357440138,
          y: 19.25000003379159,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 80.25000357440138,
            y: 24.96200003379161,
            z: 0.0
          },
          end: {
            x: 80.25000357440138,
            y: 18.37000003379159,
            z: 0.0
          }
        },
        {
          start: {
            x: 74.25000357440138,
            y: 24.96200003379159,
            z: 0.0
          },
          end: {
            x: 74.25000357440138,
            y: 18.37000003379159,
            z: 0.0
          }
        },
        {
          start: {
            x: 79.37000357440138,
            y: 19.25000003379159,
            z: 0.0
          },
          end: {
            x: 75.13000357440137,
            y: 19.25000003379159,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6\"",
          position: {
            x: 77.25000357440138,
            y: 17.15646660950783,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1C9A",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 23.25000357440138,
        y: 17.15646660950783,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 6.0,
      defpoints: [
        {
          x: 26.25000357440138,
          y: 19.25000003379159,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 20.25000357440138,
            y: 24.96200003379161,
            z: 0.0
          },
          end: {
            x: 20.25000357440138,
            y: 18.37000003379159,
            z: 0.0
          }
        },
        {
          start: {
            x: 26.25000357440138,
            y: 24.96200003379158,
            z: 0.0
          },
          end: {
            x: 26.25000357440138,
            y: 18.37000003379159,
            z: 0.0
          }
        },
        {
          start: {
            x: 21.13000357440137,
            y: 19.25000003379159,
            z: 0.0
          },
          end: {
            x: 25.37000357440138,
            y: 19.25000003379159,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6\"",
          position: {
            x: 23.25000357440138,
            y: 17.15646660950783,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1CB5",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 92.15908952255963,
        y: 31.25000003379162,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 60.0,
      defpoints: [
        {
          x: 94.25000357440138,
          y: 1.250000033791609,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 97.96200357440138,
            y: 61.25000003379161,
            z: 0.0
          },
          end: {
            x: 93.3700035744014,
            y: 61.25000003379161,
            z: 0.0
          }
        },
        {
          start: {
            x: 97.96200357440138,
            y: 1.250000033791608,
            z: 0.0
          },
          end: {
            x: 93.37000357440138,
            y: 1.250000033791609,
            z: 0.0
          }
        },
        {
          start: {
            x: 94.25000357440139,
            y: 60.37000003379161,
            z: 0.0
          },
          end: {
            x: 94.25000357440138,
            y: 2.130000033791609,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;5'",
          position: {
            x: 92.15908952255963,
            y: 31.25000003379162,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "1CD0",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 140.2500035744014,
        y: -12.84353339049217,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 72.0,
      defpoints: [
        {
          x: 176.2500035744014,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 104.2500035744014,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 104.2500035744014,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 176.2500035744014,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 176.2500035744014,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 105.1300035744014,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 175.3700035744014,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6'",
          position: {
            x: 140.2500035744014,
            y: -12.84353339049217,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "3939",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 179.2500035744014,
        y: -12.84353339049217,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 6.0,
      defpoints: [
        {
          x: 182.2500035744014,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 176.2500035744014,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 176.2500035744014,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 182.2500035744014,
            y: 24.96200003379159,
            z: 0.0
          },
          end: {
            x: 182.2500035744014,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 177.1300035744014,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 181.3700035744014,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6\"",
          position: {
            x: 179.2500035744014,
            y: -12.84353339049217,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    },
    {
      entity_type: "DIMENSION",
      handle: "3980",
      layer: "-Dimensions @ 16",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      subtype: "LINEAR",
      text: "",
      text_midpoint: {
        x: 101.2500035744014,
        y: -12.84353339049217,
        z: 0.0
      },
      dimension_style: "Annotative",
      actual_measurement: 6.000000000000028,
      defpoints: [
        {
          x: 104.2500035744014,
          y: -10.74999996620841,
          z: 0.0
        }
      ],
      dim_lines: [
        {
          start: {
            x: 98.25000357440138,
            y: 24.96200003379161,
            z: 0.0
          },
          end: {
            x: 98.25000357440138,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 104.2500035744014,
            y: 0.9620000337916077,
            z: 0.0
          },
          end: {
            x: 104.2500035744014,
            y: -11.62999996620841,
            z: 0.0
          }
        },
        {
          start: {
            x: 99.13000357440137,
            y: -10.74999996620841,
            z: 0.0
          },
          end: {
            x: 103.3700035744014,
            y: -10.74999996620841,
            z: 0.0
          }
        }
      ],
      dim_arcs: [],
      dim_texts: [
        {
          text: "\\A1;6\"",
          position: {
            x: 101.2500035744014,
            y: -12.84353339049217,
            z: 0.0
          },
          height: 0.2,
          rotation: 0.0
        }
      ]
    }
  ],
  hatches: [
    {
      entity_type: "HATCH",
      handle: "1C3A",
      layer: "Fills",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      pattern_name: "ANSI38",
      solid_fill: false,
      associative: false,
      boundaries: [
        {
          type: "POLYLINE",
          is_outer: true,
          vertices: [
            {
              x: 182.2500035744014,
              y: 59.25000003379159,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 98.25000357440138,
              y: 59.25000003379159,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 98.25000357440138,
              y: 31.25000003379161,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 182.2500035744014,
              y: 31.25000003379159,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            }
          ]
        }
      ],
      pattern_angle: 315.0,
      pattern_scale: 12.0,
      pattern_double: false,
      gradient: null
    },
    {
      entity_type: "HATCH",
      handle: "3AB0",
      layer: "Fills",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      pattern_name: "SOLID",
      solid_fill: true,
      associative: false,
      boundaries: [
        {
          type: "POLYLINE",
          is_outer: true,
          vertices: [
            {
              x: 62.25000357440138,
              y: 25.25000003379158,
              z: 0.0,
              bulge: 1.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 38.25000357440138,
              y: 25.25000003379158,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 38.25000357440138,
              y: 1.250000033791611,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: 62.25000357440138,
              y: 1.250000033791608,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            }
          ]
        }
      ],
      pattern_angle: 0.0,
      pattern_scale: 1.0,
      pattern_double: false,
      gradient: null
    },
    {
      entity_type: "HATCH",
      handle: "3B96",
      layer: "Fills",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      pattern_name: "SOLID",
      solid_fill: true,
      associative: false,
      boundaries: [
        {
          type: "POLYLINE",
          is_outer: true,
          vertices: [
            {
              x: -33.74999642559862,
              y: 73.25000003379161,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -57.74999642559862,
              y: 73.25000003379161,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -57.74999642559862,
              y: 1.250000033791608,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -45.74999642559862,
              y: 1.250000033791608,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -45.74999642559862,
              y: 3.250000033791594,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -55.74999642559862,
              y: 3.250000033791594,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -55.74999642559862,
              y: 71.2500000337916,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -33.74999642559862,
              y: 71.2500000337916,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            }
          ]
        }
      ],
      pattern_angle: 0.0,
      pattern_scale: 1.0,
      pattern_double: false,
      gradient: null
    },
    {
      entity_type: "HATCH",
      handle: "3BA9",
      layer: "Fills",
      color: 256,
      linetype: "BYLAYER",
      ltscale: 1.0,
      lineweight: -1,
      transparency: 0,
      pattern_name: "SOLID",
      solid_fill: true,
      associative: false,
      boundaries: [
        {
          type: "POLYLINE",
          is_outer: true,
          vertices: [
            {
              x: -9.749996425598628,
              y: 73.25000003379161,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -33.74999642559862,
              y: 73.25000003379161,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -33.74999642559862,
              y: 71.2500000337916,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -11.74999642559862,
              y: 71.2500000337916,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -11.74999642559862,
              y: 3.250000033791594,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -21.74999642559862,
              y: 3.250000033791594,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -21.74999642559862,
              y: 1.250000033791608,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            },
            {
              x: -9.749996425598624,
              y: 1.250000033791608,
              z: 0.0,
              bulge: 0.0,
              start_width: 0.0,
              end_width: 0.0
            }
          ]
        }
      ],
      pattern_angle: 0.0,
      pattern_scale: 1.0,
      pattern_double: false,
      gradient: null
    }
  ],
  solids: [],
  leaders: [],
  mleaders: [],
  tolerances: [],
  images: [],
  wipeouts: [],
  faces3d: [],
  meshes: [],
  helices: [],
  inserts: [],
  door_inserts: [],
  window_inserts: [],
  furniture_inserts: [],
  stair_inserts: [],
  door_lines: [],
  window_lines: [],
  furniture_lines: [],
  raw_entities: [],
  stats: {
    entity_counts: {
      LWPOLYLINE: 34,
      DIMENSION: 22,
      ARC: 2,
      MTEXT: 6,
      HATCH: 4
    },
    line_count: 0,
    arc_count: 2,
    polyline_count: 34,
    text_count: 6,
    total_vertex_count: 81,
    insert_count: 0,
    door_insert_count: 0,
    window_insert_count: 0,
    furniture_insert_count: 0,
    stair_insert_count: 0,
    hatch_count: 4,
    dimension_count: 22,
    spline_count: 0,
    image_count: 0,
    leader_count: 0
  }
};


