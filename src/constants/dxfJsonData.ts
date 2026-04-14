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
  source_file: "update-autocad-file-with-furniture (1).dxf",
  meta: {
    acad_version: "AC1032",
    extmin: [-4.3460686332761, -2.745149250328729, 0.0],
    extmax: [20.67626993391718, 7.387459516490105, 0.0],
  },
  stats: {
    entity_counts: {
      LINE: 40,
      MTEXT: 8,
      INSERT: 10,
    },
    polyline_count: 0,
    line_count: 40,
    arc_count: 0,
    text_count: 8,
    insert_count: 10,
    door_insert_count: 6,
    window_insert_count: 0,
    furniture_insert_count: 3,
    stair_insert_count: 0,
    total_vertex_count: 0,
  },
  lines: [
    {
      entity_type: "LINE",
      handle: "272",
      layer: "0",
      start: {
        x: 0.6108066156627175,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "273",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 4.795196564956297,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "274",
      layer: "0",
      start: {
        x: 2.110806615662716,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 1.680900782392767,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "275",
      layer: "0",
      start: {
        x: 0.6108066156627175,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 0.6108066156627175,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "276",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 6.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "277",
      layer: "0",
      start: {
        x: 6.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 6.610806615662717,
        y: 4.795196564956297,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "278",
      layer: "0",
      start: {
        x: 6.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 10.31080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "279",
      layer: "0",
      start: {
        x: 10.31080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 10.31080661566271,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "27A",
      layer: "0",
      start: {
        x: 10.31080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 11.42530188863939,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "27B",
      layer: "0",
      start: {
        x: 11.42530188863939,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 15.92798613906803,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "27C",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 15.92798613906803,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "280",
      layer: "0",
      start: {
        x: 10.31080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 11.81080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "281",
      layer: "0",
      start: {
        x: 11.81080661566271,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 11.81080661566271,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "282",
      layer: "0",
      start: {
        x: 11.81080661566271,
        y: 4.795196564956299,
        z: 0.0,
      },
      end: {
        x: 10.31080661566271,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28C",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28D",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 4.13334673362405,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28E",
      layer: "0",
      start: {
        x: 4.13334673362405,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28F",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 4.963522484637849,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "291",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 4.795196564956299,
        z: 0.0,
      },
      end: {
        x: 4.668873803766472,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "292",
      layer: "0",
      start: {
        x: 8.551014477020999,
        y: 3.945196564956298,
        z: 0.0,
      },
      end: {
        x: 12.56657259849683,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "293",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 13.14993700878509,
        y: 3.932085732014996,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AC",
      layer: "0",
      start: {
        x: 0.6108066156627175,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 0.6108066156627175,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AD",
      layer: "0",
      start: {
        x: 0.6108066156627175,
        y: -2.704803435043701,
        z: 0.0,
      },
      end: {
        x: 7.837662520394188,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AE",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 15.92798613906803,
        y: -2.745149250328729,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AF",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: -2.745149250328729,
        z: 0.0,
      },
      end: {
        x: 9.116909095798805,
        y: -2.745149250328729,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2B9",
      layer: "0",
      start: {
        x: 0.6108066156627165,
        y: -2.704803435043701,
        z: 0.0,
      },
      end: {
        x: 0.6108066156627165,
        y: 0.645196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2BA",
      layer: "0",
      start: {
        x: 0.6108066156627165,
        y: 0.645196564956299,
        z: 0.0,
      },
      end: {
        x: 2.961460380407515,
        y: 0.645196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2C7",
      layer: "0",
      start: {
        x: 4.224234568028452,
        y: -2.704803435043701,
        z: 0.0,
      },
      end: {
        x: 4.224234568028452,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2CF",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: -2.745149250328729,
        z: 0.0,
      },
      end: {
        x: 15.92798613906803,
        y: 0.2548507496712702,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2D0",
      layer: "0",
      start: {
        x: 15.92798613906803,
        y: 0.2548507496712702,
        z: 0.0,
      },
      end: {
        x: 12.16251774591546,
        y: 0.2548507496712702,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15A5",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: -1.359953888159623,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E1",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 4.795196564956297,
        z: 0.0,
      },
      end: {
        x: 2.110806615662716,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E2",
      layer: "0",
      start: {
        x: 6.610806615662717,
        y: 4.795196564956299,
        z: 0.0,
      },
      end: {
        x: 7.941414477020996,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E3",
      layer: "0",
      start: {
        x: 11.42798613906804,
        y: -0.3897045409896123,
        z: 0.0,
      },
      end: {
        x: 11.42798613906805,
        y: -0.7213204897056472,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E4",
      layer: "0",
      start: {
        x: 12.16251774591546,
        y: 0.2548507496712702,
        z: 0.0,
      },
      end: {
        x: 11.42798613906804,
        y: -0.3897045409896123,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E5",
      layer: "0",
      start: {
        x: 3.610806615662716,
        y: 0.202466429484332,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: -0.7503538881596233,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E6",
      layer: "0",
      start: {
        x: 2.961460380407515,
        y: 0.645196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 0.202466429484332,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "25C8",
      layer: "0",
      start: {
        x: 5.278473803766472,
        y: 4.795196564956299,
        z: 0.0,
      },
      end: {
        x: 6.610806615662717,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "25CA",
      layer: "0",
      start: {
        x: 11.42798613906805,
        y: -1.330920489705647,
        z: 0.0,
      },
      end: {
        x: 11.42798613906805,
        y: -2.745149250328729,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "25CC",
      layer: "0",
      start: {
        x: 1.162244020022889,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 0.6108066156627175,
        y: 3.945196564956299,
        z: 0.0,
      },
    },
  ],
  // arcs: [],
  polylines: [],
  texts: [
    {
      entity_type: "MTEXT",
      handle: "286",
      layer: "0",
      text: "Kitchen\n3.0 X 3.35",
      position: {
        x: 1.229801813707154,
        y: 5.960516156780832,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "287",
      layer: "0",
      text: "WC + Bath\n3.0m X 3.35",
      position: {
        x: 5.021054678442992,
        y: 6.052879579090877,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "294",
      layer: "0",
      text: "Store\n3.7m X 3.35",
      position: {
        x: 7.591709183901571,
        y: 5.978988852146534,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "2A4",
      layer: "0",
      text: "Store\n1.5m X 2.5",
      position: {
        x: 10.03290603215367,
        y: 6.520098392898682,
        z: 0.0,
      },
      height: 0.16,
    },
    {
      entity_type: "MTEXT",
      handle: "2AB",
      layer: "0",
      text: "BED Room\n4.5m X 3.35",
      position: {
        x: 12.75151177528369,
        y: 6.169117344505799,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "2CE",
      layer: "0",
      text: "Room\n3.0m X 3.35",
      position: {
        x: 1.230241099470788,
        y: -0.61292449318018,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "2DB",
      layer: "0",
      text: "Drawing Dinning",
      position: {
        x: 6.115583552940847,
        y: 2.262510909754944,
        z: 0.0,
      },
      height: 0.2,
    },
    {
      entity_type: "MTEXT",
      handle: "2E2",
      layer: "0",
      text: "Room\n4.5m X 3.35",
      position: {
        x: 12.97510712638473,
        y: -0.8274489592508933,
        z: 0.0,
      },
      height: 0.2,
    },
  ],
  inserts: [
    {
      entity_type: "INSERT",
      handle: "12A0",
      layer: "0",
      block_name: "*U8",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 3.451493532527251,
        y: -0.7503538881596234,
        z: 0.0,
      },
      rotation: 270.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "1B40",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 13.14993700878509,
        y: 4.033685732014995,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "1FDC",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 1.771844020022889,
        y: 4.070483277467122,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "21DB",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 5.278473803766472,
        y: 4.896796564956297,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "23DA",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 8.551014477020999,
        y: 4.046796564956299,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2575",
      layer: "0",
      block_name: "*U23",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 11.56933367305038,
        y: -0.7213204897056473,
        z: 0.0,
      },
      rotation: 270.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2682",
      layer: "0",
      block_name: "*U27",
      category: "insert",
      is_anonymous_block: true,
      position: {
        x: 1.56233022318554,
        y: 7.237459516490105,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.001,
        y: 0.001,
        z: 0.001,
      },
      block_entity_types: ["LINE"],
      block_entity_count: 3,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2955",
      layer: "0",
      block_name: "Bed - Queen",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 2.372132069842834,
        y: 3.479264313995376,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["LINE"],
      block_entity_count: 16,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2986",
      layer: "0",
      block_name: "Chair - Rocking",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 1.481668176941881,
        y: 2.363800714190402,
        z: 0.0,
      },
      rotation: 90.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE"],
      block_entity_count: 40,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "29F9",
      layer: "0",
      block_name: "Copy Machine",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 13.81459250254958,
        y: 2.278631800417986,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["LINE"],
      block_entity_count: 40,
      attributes: [],
    },
  ],
  door_inserts: [
    {
      entity_type: "INSERT",
      handle: "12A0",
      layer: "0",
      block_name: "*U8",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 3.451493532527251,
        y: -0.7503538881596234,
        z: 0.0,
      },
      rotation: 270.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "1B40",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 13.14993700878509,
        y: 4.033685732014995,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "1FDC",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 1.771844020022889,
        y: 4.070483277467122,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "21DB",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 5.278473803766472,
        y: 4.896796564956297,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "23DA",
      layer: "0",
      block_name: "*U14",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 8.551014477020999,
        y: 4.046796564956299,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2575",
      layer: "0",
      block_name: "*U23",
      category: "door",
      is_anonymous_block: true,
      position: {
        x: 11.56933367305038,
        y: -0.7213204897056473,
        z: 0.0,
      },
      rotation: 270.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
      block_entity_count: 11,
      attributes: [],
    },
  ],
  window_inserts: [],
  furniture_inserts: [
    {
      entity_type: "INSERT",
      handle: "2955",
      layer: "0",
      block_name: "Bed - Queen",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 2.372132069842834,
        y: 3.479264313995376,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["LINE"],
      block_entity_count: 16,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "2986",
      layer: "0",
      block_name: "Chair - Rocking",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 1.481668176941881,
        y: 2.363800714190402,
        z: 0.0,
      },
      rotation: 90.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["ARC", "LINE"],
      block_entity_count: 40,
      attributes: [],
    },
    {
      entity_type: "INSERT",
      handle: "29F9",
      layer: "0",
      block_name: "Copy Machine",
      category: "furniture",
      is_anonymous_block: false,
      position: {
        x: 13.81459250254958,
        y: 2.278631800417986,
        z: 0.0,
      },
      rotation: 0.0,
      scale: {
        x: 0.0254,
        y: 0.0254,
        z: 0.0254,
      },
      block_entity_types: ["LINE"],
      block_entity_count: 40,
      attributes: [],
    },
  ],
  stair_inserts: [],
  arcs: [
    {
      entity_type: "ARC",
      handle: "arc-door-1",
      layer: "0",
      center: { x: 3.451493532527251, y: -0.7503538881596234, z: 0 },
      radius: 0.6096,
      start_angle: 180,
      end_angle: 270,
    },
    {
      entity_type: "ARC",
      handle: "arc-door-2",
      layer: "0",
      center: { x: 13.14993700878509, y: 4.033685732014995, z: 0 },
      radius: 0.6096,
      start_angle: 90,
      end_angle: 180,
    },
    {
      entity_type: "ARC",
      handle: "arc-door-3",
      layer: "0",
      center: { x: 1.771844020022889, y: 4.070483277467122, z: 0 },
      radius: 0.6096,
      start_angle: 90,
      end_angle: 180,
    },
    {
      entity_type: "ARC",
      handle: "arc-door-4",
      layer: "0",
      center: { x: 5.278473803766472, y: 4.896796564956297, z: 0 },
      radius: 0.6096,
      start_angle: 90,
      end_angle: 180,
    },
    {
      entity_type: "ARC",
      handle: "arc-door-5",
      layer: "0",
      center: { x: 8.551014477020999, y: 4.046796564956299, z: 0 },
      radius: 0.6096,
      start_angle: 90,
      end_angle: 180,
    },
    {
      entity_type: "ARC",
      handle: "arc-door-6",
      layer: "0",
      center: { x: 11.56933367305038, y: -0.7213204897056473, z: 0 },
      radius: 0.6096,
      start_angle: 270,
      end_angle: 360,
    },
  ],
  window_lines: [
    {
      entity_type: "LINE",
      handle: "win-u27-1",
      layer: "0",
      start: { x: 1.56233022318554, y: 7.387459516490105, z: 0 },
      end: { x: 1.56233022318554, y: 7.237459516490105, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "win-u27-2",
      layer: "0",
      start: { x: 2.46233022318554, y: 7.387459516490105, z: 0 },
      end: { x: 2.46233022318554, y: 7.237459516490105, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "win-u27-3",
      layer: "0",
      start: { x: 1.56233022318554, y: 7.312459516490105, z: 0 },
      end: { x: 2.46233022318554, y: 7.312459516490105, z: 0 },
    },
  ],
  door_lines: [
    // Door 1 — arc-door-1, INSERT "12A0" (rot=270°) — horizontal jambs
    { entity_type: "LINE", handle: "dfl-door-1-1", layer: "0", start: { x: 3.451493532527252, y: -0.750353888159623, z: 0 }, end: { x: 3.603893532527252, y: -0.750353888159623, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-1-2", layer: "0", start: { x: 3.451493532527252, y: -1.360153888159623, z: 0 }, end: { x: 3.603893532527252, y: -1.360153888159623, z: 0 } },
    // Door 2 — arc-door-2, INSERT "1B40" (rot=0°) — vertical jambs
    { entity_type: "LINE", handle: "dfl-door-2-1", layer: "0", start: { x: 13.1499370087851, y: 4.033685732015, z: 0 }, end: { x: 13.1499370087851, y: 3.932085732015, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-2-2", layer: "0", start: { x: 12.5403370087851, y: 4.033685732015, z: 0 }, end: { x: 12.5403370087851, y: 3.932085732015, z: 0 } },
    // Door 3 — arc-door-3, INSERT "1FDC" (rot=0°) — vertical jambs
    { entity_type: "LINE", handle: "dfl-door-3-1", layer: "0", start: { x: 1.77184402002289, y: 4.07048327746712, z: 0 }, end: { x: 1.77184402002289, y: 3.96888327746712, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-3-2", layer: "0", start: { x: 1.16224402002289, y: 4.07048327746712, z: 0 }, end: { x: 1.16224402002289, y: 3.96888327746712, z: 0 } },
    // Door 4 — arc-door-4 — vertical jambs
    { entity_type: "LINE", handle: "dfl-door-4-1", layer: "0", start: { x: 5.27847380376647, y: 4.8967965649563, z: 0 }, end: { x: 5.27847380376647, y: 4.7951965649563, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-4-2", layer: "0", start: { x: 4.66887380376647, y: 4.8967965649563, z: 0 }, end: { x: 4.66887380376647, y: 4.7951965649563, z: 0 } },
    // Door 5 — arc-door-5 — vertical jambs
    { entity_type: "LINE", handle: "dfl-door-5-1", layer: "0", start: { x: 8.551014477021, y: 4.0467965649563, z: 0 }, end: { x: 8.551014477021, y: 3.9451965649563, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-5-2", layer: "0", start: { x: 7.941414477021, y: 4.0467965649563, z: 0 }, end: { x: 7.941414477021, y: 3.9451965649563, z: 0 } },
    // Door 6 — arc-door-6, INSERT "2700" (rot=270°) — horizontal jambs
    { entity_type: "LINE", handle: "dfl-door-6-1", layer: "0", start: { x: 11.5693336730504, y: -0.721320489705647, z: 0 }, end: { x: 11.4169336730504, y: -0.721320489705647, z: 0 } },
    { entity_type: "LINE", handle: "dfl-door-6-2", layer: "0", start: { x: 11.5693336730504, y: -1.330920489705647, z: 0 }, end: { x: 11.4169336730504, y: -1.330920489705647, z: 0 } },
  ],
  furniture_lines: [
    // Bed - Queen (6 lines)
    {
      entity_type: "LINE",
      handle: "furn-bed-1",
      layer: "0",
      start: { x: 2.372132069842834, y: 3.479264313995376, z: 0 },
      end: { x: 2.372132069842834, y: 2.079264313995376, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-bed-2",
      layer: "0",
      start: { x: 2.372132069842834, y: 2.079264313995376, z: 0 },
      end: { x: 3.972132069842834, y: 2.079264313995376, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-bed-3",
      layer: "0",
      start: { x: 3.972132069842834, y: 2.079264313995376, z: 0 },
      end: { x: 3.972132069842834, y: 3.479264313995376, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-bed-4",
      layer: "0",
      start: { x: 3.972132069842834, y: 3.479264313995376, z: 0 },
      end: { x: 2.372132069842834, y: 3.479264313995376, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-bed-pillow-1",
      layer: "0",
      start: { x: 2.692132069842834, y: 3.479264313995376, z: 0 },
      end: { x: 2.692132069842834, y: 2.899264313995376, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-bed-pillow-2",
      layer: "0",
      start: { x: 3.652132069842834, y: 3.479264313995376, z: 0 },
      end: { x: 3.652132069842834, y: 2.899264313995376, z: 0 },
    },

    // Chair - Rocking (4 lines, with rotation applied)
    {
      entity_type: "LINE",
      handle: "furn-chair-1",
      layer: "0",
      start: { x: 1.481668176941881, y: 2.363800714190402, z: 0 },
      end: { x: 1.481668176941881, y: 2.013800714190402, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-chair-2",
      layer: "0",
      start: { x: 1.481668176941881, y: 2.013800714190402, z: 0 },
      end: { x: 1.831668176941881, y: 2.013800714190402, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-chair-3",
      layer: "0",
      start: { x: 1.831668176941881, y: 2.013800714190402, z: 0 },
      end: { x: 1.831668176941881, y: 2.363800714190402, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-chair-back",
      layer: "0",
      start: { x: 1.656668176941881, y: 2.363800714190402, z: 0 },
      end: { x: 1.656668176941881, y: 2.413800714190402, z: 0 },
    },

    // Copy Machine (5 lines)
    {
      entity_type: "LINE",
      handle: "furn-copier-1",
      layer: "0",
      start: { x: 13.81459250254958, y: 2.278631800417986, z: 0 },
      end: { x: 13.81459250254958, y: 1.878631800417986, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-copier-2",
      layer: "0",
      start: { x: 13.81459250254958, y: 1.878631800417986, z: 0 },
      end: { x: 14.21459250254958, y: 1.878631800417986, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-copier-3",
      layer: "0",
      start: { x: 14.21459250254958, y: 1.878631800417986, z: 0 },
      end: { x: 14.21459250254958, y: 2.278631800417986, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-copier-4",
      layer: "0",
      start: { x: 14.21459250254958, y: 2.278631800417986, z: 0 },
      end: { x: 13.81459250254958, y: 2.278631800417986, z: 0 },
    },
    {
      entity_type: "LINE",
      handle: "furn-copier-detail",
      layer: "0",
      start: { x: 13.96459250254958, y: 2.128631800417986, z: 0 },
      end: { x: 14.06459250254958, y: 2.128631800417986, z: 0 },
    },
  ],
};
