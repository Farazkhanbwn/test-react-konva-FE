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

// Old Content
// export const DXF_JSON_DATA: DxfJsonDocument = {
//   source_file: "update-autocad-file-with-furniture (1).dxf",
//   meta: {
//     acad_version: "AC1032",
//     extmin: [-4.3460686332761, -2.745149250328729, 0.0],
//     extmax: [20.67626993391718, 7.387459516490105, 0.0],
//   },
//   stats: {
//     entity_counts: {
//       LINE: 40,
//       MTEXT: 8,
//       INSERT: 10,
//     },
//     polyline_count: 0,
//     line_count: 40,
//     arc_count: 0,
//     text_count: 8,
//     insert_count: 10,
//     door_insert_count: 6,
//     window_insert_count: 0,
//     furniture_insert_count: 3,
//     stair_insert_count: 0,
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
//         x: 3.610806615662716,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "273",
//       layer: "0",
//       start: {
//         x: 3.610806615662716,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: 4.795196564956297,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "274",
//       layer: "0",
//       start: {
//         x: 2.110806615662716,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 1.680900782392767,
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
//         x: 3.610806615662716,
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
//         y: 4.795196564956297,
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
//         x: 15.92798613906803,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "27C",
//       layer: "0",
//       start: {
//         x: 15.92798613906803,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906803,
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
//         x: 3.610806615662716,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28D",
//       layer: "0",
//       start: {
//         x: 3.610806615662716,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 4.13334673362405,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28E",
//       layer: "0",
//       start: {
//         x: 4.13334673362405,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: 7.295196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28F",
//       layer: "0",
//       start: {
//         x: 3.610806615662716,
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
//         x: 3.610806615662716,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 4.668873803766472,
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
//         x: 15.92798613906803,
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
//         x: 7.837662520394188,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AE",
//       layer: "0",
//       start: {
//         x: 15.92798613906803,
//         y: 3.945196564956299,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906803,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2AF",
//       layer: "0",
//       start: {
//         x: 15.92798613906803,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//       end: {
//         x: 9.116909095798805,
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
//         x: 4.224234568028452,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//       end: {
//         x: 4.224234568028452,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2CF",
//       layer: "0",
//       start: {
//         x: 15.92798613906803,
//         y: -2.745149250328729,
//         z: 0.0,
//       },
//       end: {
//         x: 15.92798613906803,
//         y: 0.2548507496712702,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2D0",
//       layer: "0",
//       start: {
//         x: 15.92798613906803,
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
//         x: 3.610806615662716,
//         y: -1.359953888159623,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: -2.704803435043701,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15E1",
//       layer: "0",
//       start: {
//         x: 3.610806615662716,
//         y: 4.795196564956297,
//         z: 0.0,
//       },
//       end: {
//         x: 2.110806615662716,
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
//         x: 7.941414477020996,
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
//         x: 3.610806615662716,
//         y: 0.202466429484332,
//         z: 0.0,
//       },
//       end: {
//         x: 3.610806615662716,
//         y: -0.7503538881596233,
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
//         x: 3.610806615662716,
//         y: 0.202466429484332,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "25C8",
//       layer: "0",
//       start: {
//         x: 5.278473803766472,
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
//   ],
//   // arcs: [],
//   polylines: [],
//   texts: [
//     {
//       entity_type: "MTEXT",
//       handle: "286",
//       layer: "0",
//       text: "Kitchen\n3.0 X 3.35",
//       position: {
//         x: 1.229801813707154,
//         y: 5.960516156780832,
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
//         x: 5.021054678442992,
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
//         y: 5.978988852146534,
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
//         y: 6.169117344505799,
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
//         y: -0.61292449318018,
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
//   inserts: [
//     {
//       entity_type: "INSERT",
//       handle: "12A0",
//       layer: "0",
//       block_name: "*U8",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 3.451493532527251,
//         y: -0.7503538881596234,
//         z: 0.0,
//       },
//       rotation: 270.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "1B40",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 13.14993700878509,
//         y: 4.033685732014995,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "1FDC",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 1.771844020022889,
//         y: 4.070483277467122,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "21DB",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 5.278473803766472,
//         y: 4.896796564956297,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "23DA",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 8.551014477020999,
//         y: 4.046796564956299,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2575",
//       layer: "0",
//       block_name: "*U23",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 11.56933367305038,
//         y: -0.7213204897056473,
//         z: 0.0,
//       },
//       rotation: 270.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2682",
//       layer: "0",
//       block_name: "*U27",
//       category: "insert",
//       is_anonymous_block: true,
//       position: {
//         x: 1.56233022318554,
//         y: 7.237459516490105,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.001,
//         y: 0.001,
//         z: 0.001,
//       },
//       block_entity_types: ["LINE"],
//       block_entity_count: 3,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2955",
//       layer: "0",
//       block_name: "Bed - Queen",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 2.372132069842834,
//         y: 3.479264313995376,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["LINE"],
//       block_entity_count: 16,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2986",
//       layer: "0",
//       block_name: "Chair - Rocking",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 1.481668176941881,
//         y: 2.363800714190402,
//         z: 0.0,
//       },
//       rotation: 90.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE"],
//       block_entity_count: 40,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "29F9",
//       layer: "0",
//       block_name: "Copy Machine",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 13.81459250254958,
//         y: 2.278631800417986,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["LINE"],
//       block_entity_count: 40,
//       attributes: [],
//     },
//   ],
//   door_inserts: [
//     {
//       entity_type: "INSERT",
//       handle: "12A0",
//       layer: "0",
//       block_name: "*U8",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 3.451493532527251,
//         y: -0.7503538881596234,
//         z: 0.0,
//       },
//       rotation: 270.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "1B40",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 13.14993700878509,
//         y: 4.033685732014995,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "1FDC",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 1.771844020022889,
//         y: 4.070483277467122,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "21DB",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 5.278473803766472,
//         y: 4.896796564956297,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "23DA",
//       layer: "0",
//       block_name: "*U14",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 8.551014477020999,
//         y: 4.046796564956299,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2575",
//       layer: "0",
//       block_name: "*U23",
//       category: "door",
//       is_anonymous_block: true,
//       position: {
//         x: 11.56933367305038,
//         y: -0.7213204897056473,
//         z: 0.0,
//       },
//       rotation: 270.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE", "LWPOLYLINE"],
//       block_entity_count: 11,
//       attributes: [],
//     },
//   ],
//   window_inserts: [],
//   furniture_inserts: [
//     {
//       entity_type: "INSERT",
//       handle: "2955",
//       layer: "0",
//       block_name: "Bed - Queen",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 2.372132069842834,
//         y: 3.479264313995376,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["LINE"],
//       block_entity_count: 16,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "2986",
//       layer: "0",
//       block_name: "Chair - Rocking",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 1.481668176941881,
//         y: 2.363800714190402,
//         z: 0.0,
//       },
//       rotation: 90.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["ARC", "LINE"],
//       block_entity_count: 40,
//       attributes: [],
//     },
//     {
//       entity_type: "INSERT",
//       handle: "29F9",
//       layer: "0",
//       block_name: "Copy Machine",
//       category: "furniture",
//       is_anonymous_block: false,
//       position: {
//         x: 13.81459250254958,
//         y: 2.278631800417986,
//         z: 0.0,
//       },
//       rotation: 0.0,
//       scale: {
//         x: 0.0254,
//         y: 0.0254,
//         z: 0.0254,
//       },
//       block_entity_types: ["LINE"],
//       block_entity_count: 40,
//       attributes: [],
//     },
//   ],
//   stair_inserts: [],
//   arcs: [
//     {
//       entity_type: "ARC",
//       handle: "arc-door-1",
//       layer: "0",
//       center: { x: 3.451493532527251, y: -0.7503538881596234, z: 0 },
//       radius: 0.6096,
//       start_angle: 180,
//       end_angle: 270,
//     },
//     {
//       entity_type: "ARC",
//       handle: "arc-door-2",
//       layer: "0",
//       center: { x: 13.14993700878509, y: 4.033685732014995, z: 0 },
//       radius: 0.6096,
//       start_angle: 90,
//       end_angle: 180,
//     },
//     {
//       entity_type: "ARC",
//       handle: "arc-door-3",
//       layer: "0",
//       center: { x: 1.771844020022889, y: 4.070483277467122, z: 0 },
//       radius: 0.6096,
//       start_angle: 90,
//       end_angle: 180,
//     },
//     {
//       entity_type: "ARC",
//       handle: "arc-door-4",
//       layer: "0",
//       center: { x: 5.278473803766472, y: 4.896796564956297, z: 0 },
//       radius: 0.6096,
//       start_angle: 90,
//       end_angle: 180,
//     },
//     {
//       entity_type: "ARC",
//       handle: "arc-door-5",
//       layer: "0",
//       center: { x: 8.551014477020999, y: 4.046796564956299, z: 0 },
//       radius: 0.6096,
//       start_angle: 90,
//       end_angle: 180,
//     },
//     {
//       entity_type: "ARC",
//       handle: "arc-door-6",
//       layer: "0",
//       center: { x: 11.56933367305038, y: -0.7213204897056473, z: 0 },
//       radius: 0.6096,
//       start_angle: 270,
//       end_angle: 360,
//     },
//   ],
//   window_lines: [
//     {
//       entity_type: "LINE",
//       handle: "win-u27-1",
//       layer: "0",
//       start: { x: 1.56233022318554, y: 7.387459516490105, z: 0 },
//       end: { x: 1.56233022318554, y: 7.237459516490105, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "win-u27-2",
//       layer: "0",
//       start: { x: 2.46233022318554, y: 7.387459516490105, z: 0 },
//       end: { x: 2.46233022318554, y: 7.237459516490105, z: 0 },
//     },
//     {
//       entity_type: "LINE",
//       handle: "win-u27-3",
//       layer: "0",
//       start: { x: 1.56233022318554, y: 7.312459516490105, z: 0 },
//       end: { x: 2.46233022318554, y: 7.312459516490105, z: 0 },
//     },
//   ],
//   door_lines: [
//     // Door 1 — arc-door-1, INSERT "12A0" (rot=270°) — horizontal jambs
//     { entity_type: "LINE", handle: "dfl-door-1-1", layer: "0", start: { x: 3.451493532527252, y: -0.750353888159623, z: 0 }, end: { x: 3.603893532527252, y: -0.750353888159623, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-1-2", layer: "0", start: { x: 3.451493532527252, y: -1.360153888159623, z: 0 }, end: { x: 3.603893532527252, y: -1.360153888159623, z: 0 } },
//     // Door 2 — arc-door-2, INSERT "1B40" (rot=0°) — vertical jambs
//     { entity_type: "LINE", handle: "dfl-door-2-1", layer: "0", start: { x: 13.1499370087851, y: 4.033685732015, z: 0 }, end: { x: 13.1499370087851, y: 3.932085732015, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-2-2", layer: "0", start: { x: 12.5403370087851, y: 4.033685732015, z: 0 }, end: { x: 12.5403370087851, y: 3.932085732015, z: 0 } },
//     // Door 3 — arc-door-3, INSERT "1FDC" (rot=0°) — vertical jambs
//     { entity_type: "LINE", handle: "dfl-door-3-1", layer: "0", start: { x: 1.77184402002289, y: 4.07048327746712, z: 0 }, end: { x: 1.77184402002289, y: 3.96888327746712, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-3-2", layer: "0", start: { x: 1.16224402002289, y: 4.07048327746712, z: 0 }, end: { x: 1.16224402002289, y: 3.96888327746712, z: 0 } },
//     // Door 4 — arc-door-4 — vertical jambs
//     { entity_type: "LINE", handle: "dfl-door-4-1", layer: "0", start: { x: 5.27847380376647, y: 4.8967965649563, z: 0 }, end: { x: 5.27847380376647, y: 4.7951965649563, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-4-2", layer: "0", start: { x: 4.66887380376647, y: 4.8967965649563, z: 0 }, end: { x: 4.66887380376647, y: 4.7951965649563, z: 0 } },
//     // Door 5 — arc-door-5 — vertical jambs
//     { entity_type: "LINE", handle: "dfl-door-5-1", layer: "0", start: { x: 8.551014477021, y: 4.0467965649563, z: 0 }, end: { x: 8.551014477021, y: 3.9451965649563, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-5-2", layer: "0", start: { x: 7.941414477021, y: 4.0467965649563, z: 0 }, end: { x: 7.941414477021, y: 3.9451965649563, z: 0 } },
//     // Door 6 — arc-door-6, INSERT "2700" (rot=270°) — horizontal jambs
//     { entity_type: "LINE", handle: "dfl-door-6-1", layer: "0", start: { x: 11.5693336730504, y: -0.721320489705647, z: 0 }, end: { x: 11.4169336730504, y: -0.721320489705647, z: 0 } },
//     { entity_type: "LINE", handle: "dfl-door-6-2", layer: "0", start: { x: 11.5693336730504, y: -1.330920489705647, z: 0 }, end: { x: 11.4169336730504, y: -1.330920489705647, z: 0 } },
//   ],
//   furniture_lines: [
//     // Bed - Queen (6 lines)
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

//     // Chair - Rocking (4 lines, with rotation applied)
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

//     // Copy Machine (5 lines)
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

export const DXF_JSON_DATA : DxfJsonDocument = {
  "source_file": "Villa Project Sample.dxf",
  "meta": {
    "acad_version": "AC1018",
    "extmin": [
      0.0,
      -90.89198866466592,
      0.0
    ],
    "extmax": [
      9258.06970838667,
      968.0178894266468,
      0.0
    ]
  },
  "stats": {
    "total_entities": 449,
    "entity_type_counts": {
      "INSERT": 60,
      "HATCH": 6,
      "MTEXT": 14,
      "LINE": 312,
      "LWPOLYLINE": 24,
      "CIRCLE": 3,
      "TEXT": 2,
      "LEADER": 2,
      "DIMENSION": 26
    },
    "polyline_count": 24,
    "line_count": 312,
    "arc_count": 0,
    "circle_count": 3,
    "ellipse_count": 0,
    "spline_count": 0,
    "text_count": 16,
    "insert_count": 60,
    "dimension_count": 26,
    "hatch_count": 6,
    "door_insert_count": 13,
    "window_insert_count": 17,
    "furniture_insert_count": 19,
    "stair_insert_count": 0,
    "total_vertex_count": 62
  },
  "all_entities": {
    "INSERT": [
      {
        "entity_type": "INSERT",
        "handle": "EC15",
        "layer": "0",
        "block_name": "door",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [],
        "block_entity_count": 0,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F1",
        "layer": "A-Glaz",
        "block_name": "window 11",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8497.497489687234,
          "y": 357.7788511355709,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F2",
        "layer": "A-Glaz",
        "block_name": "window 9",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8383.37257227921,
          "y": 177.7379963641808,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F3",
        "layer": "A-Glaz",
        "block_name": "window 9",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8497.443016658723,
          "y": 177.7379963641831,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F4",
        "layer": "A-Glaz",
        "block_name": "window 5ft",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8695.491815413068,
          "y": 257.2601260320155,
          "z": 0.0
        },
        "rotation": 90.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F5",
        "layer": "A-Glaz",
        "block_name": "win dow jjj",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8596.50202910629,
          "y": 861.7788511355677,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 10,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F6",
        "layer": "A-Glaz",
        "block_name": "window 5st",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8581.502029106281,
          "y": 357.7788511355709,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F7",
        "layer": "A-Glaz",
        "block_name": "window 11",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8383.500326824149,
          "y": 357.7788511355709,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F8",
        "layer": "A-Glaz",
        "block_name": "window block",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8326.50032682416,
          "y": 308.3930722969142,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371F9",
        "layer": "A-Glaz",
        "block_name": "win dow wo",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8566.499475683064,
          "y": 195.7320383766871,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 12,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FA",
        "layer": "A-Glaz",
        "block_name": "window 9",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8683.502029106277,
          "y": 229.2358896150706,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FB",
        "layer": "A-Glaz",
        "block_name": "window",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8674.500326824136,
          "y": 164.2311872356195,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 12,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FC",
        "layer": "A-Glaz",
        "block_name": "Win 5FT",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8674.502029106314,
          "y": 450.7714745794385,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 9,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FD",
        "layer": "A-Glaz",
        "block_name": "w i n d ow",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8581.39493393982,
          "y": 474.7788511355695,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 10,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FE",
        "layer": "A-Glaz",
        "block_name": "Win 5FT",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8977.502029106276,
          "y": 450.7788511359292,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 9,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "371FF",
        "layer": "A-Glaz",
        "block_name": "window 25",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8800.490361791399,
          "y": 861.7788511355677,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37200",
        "layer": "A-Glaz",
        "block_name": "window ee e e",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8941.5037598479,
          "y": 852.7788511355686,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 12,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37202",
        "layer": "A-Glaz",
        "block_name": "wi n d o w",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8873.098460519948,
          "y": 804.7788511355691,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37208",
        "layer": "A-Glaz",
        "block_name": "door r f m radio mirchi",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8623.500326824145,
          "y": 195.7320383766864,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37209",
        "layer": "A-Door",
        "block_name": "d ii ro",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8901.002880247346,
          "y": 594.760977173087,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 4,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3720A",
        "layer": "A-Door",
        "block_name": "d ii ro",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8566.502029106283,
          "y": 246.7538843308319,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 4,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3720B",
        "layer": "A-Door",
        "block_name": "d ii ro",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8815.502029106296,
          "y": 483.7788511355641,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 4,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3720C",
        "layer": "A-Door",
        "block_name": "dgdgd",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8845.976622486189,
          "y": 801.7261108165314,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.055776221759004,
          "y": 1.055776221759004,
          "z": 1.055776221759004
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3720D",
        "layer": "A-Door",
        "block_name": "dgdgd",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8597.60456685125,
          "y": 195.7819924464543,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3720E",
        "layer": "A-Door",
        "block_name": "gdfdrd",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8710.498624541999,
          "y": 672.7788511355691,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37220",
        "layer": "A-Flor-Spcl",
        "block_name": "BATH 2",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8776.502029106294,
          "y": 852.7788511355682,
          "z": 0.0
        },
        "rotation": 90.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "INSERT",
          "LWPOLYLINE"
        ],
        "block_entity_count": 4,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3722D",
        "layer": "A-Door",
        "block_name": "d ii ro",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8557.502029106285,
          "y": 318.7788511355704,
          "z": 0.0
        },
        "rotation": 90.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 4,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37234",
        "layer": "A-Door",
        "block_name": "Sliding Door - 4 Panel _AUS_ - 9_ x 7_-6_-313029-Level 2",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8562.0037313884,
          "y": 570.3777456508117,
          "z": 0.0
        },
        "rotation": 90.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 160,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37235",
        "layer": "A-Door",
        "block_name": "SLD 8 ft",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8515.502029106272,
          "y": 714.77885113557,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 160,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37236",
        "layer": "A-Glaz",
        "block_name": "window ee e e",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8941.5037598479,
          "y": 801.7788511355691,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 12,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "37237",
        "layer": "A-Glaz",
        "block_name": "window ee e e",
        "category": "window",
        "is_anonymous_block": false,
        "position": {
          "x": 8941.5037598479,
          "y": 672.778851137384,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 12,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "376C3",
        "layer": "A-Door",
        "block_name": "door 2 6",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8809.502029106297,
          "y": 728.2901996831677,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "376C4",
        "layer": "A-Door",
        "block_name": "door 2 6",
        "category": "door",
        "is_anonymous_block": false,
        "position": {
          "x": 8809.502029106297,
          "y": 663.7788511355691,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "376E4",
        "layer": "A-Flor-Spcl",
        "block_name": "wc 1",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8887.847997411456,
          "y": 672.7788511362326,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "376E5",
        "layer": "A-Flor-Spcl",
        "block_name": "sink 2",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8594.145893371075,
          "y": 229.0100852925027,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "CIRCLE",
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "376E6",
        "layer": "A-Flor-Spcl",
        "block_name": "wc 1",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8650.500326824138,
          "y": 146.2311872355933,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39234",
        "layer": "A-Furn",
        "block_name": "2 seater sofa",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8556.018729760872,
          "y": 851.2673342125157,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE"
        ],
        "block_entity_count": 15,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39247",
        "layer": "A-Furn",
        "block_name": "single seater sofa",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8550.28245876477,
          "y": 807.5173342125239,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "CIRCLE",
          "LINE"
        ],
        "block_entity_count": 15,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39296",
        "layer": "A-Furn",
        "block_name": "double bed",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8746.400783656689,
          "y": 782.7901996831782,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 75,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "392F1",
        "layer": "A-Furn",
        "block_name": "carpet",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8642.400783656682,
          "y": 743.7901996831782,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE"
        ],
        "block_entity_count": 5,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39372",
        "layer": "A-Furn",
        "block_name": "Chair 1",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8554.071988650378,
          "y": 701.6868019002869,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "ELLIPSE",
          "LINE",
          "SPLINE"
        ],
        "block_entity_count": 11,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "393E5",
        "layer": "A-Furn",
        "block_name": "tv",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8625.696988650387,
          "y": 681.0270780877794,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 3,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39459",
        "layer": "A-Flor-Spcl",
        "block_name": "Tap set",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8889.752029106294,
          "y": 846.7788511355701,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "CIRCLE",
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 74,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "394D7",
        "layer": "A-Flor-Spcl",
        "block_name": "Basin",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8941.503759847901,
          "y": 737.2788511364762,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "INSERT",
          "LINE"
        ],
        "block_entity_count": 8,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3956D",
        "layer": "A-Furn",
        "block_name": "3 seater sofa 2",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8688.560137655251,
          "y": 628.9706331620295,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 17,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "395F8",
        "layer": "A-Furn",
        "block_name": "3 seater sofa 2",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8688.560137655251,
          "y": 518.6370804576603,
          "z": 0.0
        },
        "rotation": 180.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 17,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3967B",
        "layer": "A-Furn",
        "block_name": "1 seater sofa 3",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8603.059148104141,
          "y": 535.4359276172621,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "396A7",
        "layer": "A-Furn",
        "block_name": "1 seater sofa 3",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8603.059148104156,
          "y": 612.1717860024277,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 13,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3971A",
        "layer": "A-Furn",
        "block_name": "tv",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8761.622419288644,
          "y": 599.5087625597388,
          "z": 0.0
        },
        "rotation": 90.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 3,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39796",
        "layer": "A-Furn",
        "block_name": "dressing stool",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8856.431969145071,
          "y": 637.3432003016477,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "CIRCLE"
        ],
        "block_entity_count": 6,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39813",
        "layer": "A-Furn",
        "block_name": "dressing table",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8812.502029106286,
          "y": 648.7788511355456,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE"
        ],
        "block_entity_count": 6,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "3986C",
        "layer": "A-Flor-Appl",
        "block_name": "walk in closet",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 9040.559339271747,
          "y": 663.7788511381631,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 72,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39A0F",
        "layer": "A-Furn",
        "block_name": "double bedd",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8359.502029106281,
          "y": 357.7788511355702,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE",
          "SPLINE"
        ],
        "block_entity_count": 222,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39B67",
        "layer": "A-Furn",
        "block_name": "Chair 1",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8525.657872216972,
          "y": 206.6459471289015,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "ELLIPSE",
          "LINE",
          "SPLINE"
        ],
        "block_entity_count": 11,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39B76",
        "layer": "A-Furn",
        "block_name": "chairr",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8454.0484771462,
          "y": 220.6072508571269,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE"
        ],
        "block_entity_count": 11,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39B89",
        "layer": "A-Furn",
        "block_name": "chairr",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8404.320013436023,
          "y": 220.6072508571269,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE"
        ],
        "block_entity_count": 11,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39C06",
        "layer": "A-Furn",
        "block_name": "TV cabin",
        "category": "furniture",
        "is_anonymous_block": false,
        "position": {
          "x": 8400.15346459921,
          "y": 179.4941948009007,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 7,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39CF9",
        "layer": "A-Flor-Spcl",
        "block_name": "Tap set",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8570.953750251298,
          "y": 167.2311872356186,
          "z": 0.0
        },
        "rotation": 270.0,
        "scale": {
          "x": -1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "CIRCLE",
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 74,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39CFA",
        "layer": "A-Furn",
        "block_name": "dressing stool",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8658.128128677787,
          "y": 253.8781584247328,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "ARC",
          "CIRCLE"
        ],
        "block_entity_count": 6,
        "attributes": []
      },
      {
        "entity_type": "INSERT",
        "handle": "39D80",
        "layer": "A-Flor-Appl",
        "block_name": "Storage",
        "category": "insert",
        "is_anonymous_block": false,
        "position": {
          "x": 8566.502029106286,
          "y": 311.2788511355703,
          "z": 0.0
        },
        "rotation": 0.0,
        "scale": {
          "x": 1.0,
          "y": 1.0,
          "z": 1.0
        },
        "block_entity_types": [
          "LINE",
          "LWPOLYLINE"
        ],
        "block_entity_count": 16,
        "attributes": []
      }
    ],
    "HATCH": [
      {
        "entity_type": "HATCH",
        "handle": "36D30",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 45.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 8326.500326824154,
                "y": 348.77885113556
              },
              {
                "x": 8326.500326824149,
                "y": 366.7788511355706
              },
              {
                "x": 8335.500326824149,
                "y": 366.7788511355706
              },
              {
                "x": 8350.50032682415,
                "y": 366.7788511355706
              },
              {
                "x": 8383.500326824149,
                "y": 366.7788511355706
              },
              {
                "x": 8419.504866243191,
                "y": 366.7788511355703
              },
              {
                "x": 8497.497489687234,
                "y": 366.7788511355706
              },
              {
                "x": 8533.502029106274,
                "y": 366.7788511355706
              },
              {
                "x": 8566.502029106281,
                "y": 366.7788511355706
              },
              {
                "x": 8659.502029106281,
                "y": 366.7788511355705
              },
              {
                "x": 8674.50202910629,
                "y": 366.7788511355707
              },
              {
                "x": 8674.502029106292,
                "y": 366.7978623687927
              },
              {
                "x": 8674.502029106314,
                "y": 390.7448054927477
              },
              {
                "x": 8302.500326824145,
                "y": 390.7448054927477
              },
              {
                "x": 8224.502029106283,
                "y": 390.7788511355706
              },
              {
                "x": 8224.502029106283,
                "y": 267.7584237498764
              },
              {
                "x": 8326.50032682415,
                "y": 267.758423749873
              }
            ]
          }
        ]
      },
      {
        "entity_type": "HATCH",
        "handle": "36D31",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 45.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 8326.50032682415,
                "y": 267.7379963641836
              },
              {
                "x": 8302.500326824147,
                "y": 267.7379963641836
              },
              {
                "x": 8224.502029106283,
                "y": 267.7584237498764
              },
              {
                "x": 8224.502029106285,
                "y": 144.7379963641824
              },
              {
                "x": 8533.508836303548,
                "y": 144.7379963641823
              },
              {
                "x": 8557.502029106281,
                "y": 168.7379963641824
              },
              {
                "x": 8533.502029106274,
                "y": 168.7379963641819
              },
              {
                "x": 8497.497489687234,
                "y": 168.7379963641828
              },
              {
                "x": 8419.50486624319,
                "y": 168.7379963641808
              },
              {
                "x": 8383.50032682415,
                "y": 168.7379963641827
              },
              {
                "x": 8350.500326824153,
                "y": 168.7379963641824
              },
              {
                "x": 8335.500326824149,
                "y": 168.7379963641824
              },
              {
                "x": 8326.50032682415,
                "y": 168.7379963641819
              },
              {
                "x": 8326.50032682415,
                "y": 186.7379963641786
              }
            ]
          }
        ]
      },
      {
        "entity_type": "HATCH",
        "handle": "36D32",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 135.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 9073.559339271675,
                "y": 663.7788511355687
              },
              {
                "x": 9049.559339271706,
                "y": 663.7788511355687
              },
              {
                "x": 9049.55933927167,
                "y": 474.7788511355693
              },
              {
                "x": 9073.55933927167,
                "y": 450.7788511346148
              }
            ]
          }
        ]
      },
      {
        "entity_type": "HATCH",
        "handle": "36D33",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 45.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 9049.55933927167,
                "y": 474.7788511355693
              },
              {
                "x": 8986.502029106276,
                "y": 474.7788511355697
              },
              {
                "x": 8986.502029106286,
                "y": 450.7788511346152
              },
              {
                "x": 9073.55933927167,
                "y": 450.7788511346148
              }
            ]
          }
        ]
      },
      {
        "entity_type": "HATCH",
        "handle": "36D52",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 135.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 9073.538437173018,
                "y": 366.7856602632932
              },
              {
                "x": 8986.50202910627,
                "y": 366.7856602632536
              },
              {
                "x": 8986.50202910628,
                "y": 348.7788511339054
              },
              {
                "x": 8925.02448884499,
                "y": 348.7788511339054
              },
              {
                "x": 8925.024488844989,
                "y": 87.72948495347278
              },
              {
                "x": 9073.538437173018,
                "y": 87.72948495347276
              }
            ]
          },
          {
            "type": "1",
            "vertices": [
              {
                "x": 8925.024488844992,
                "y": 348.7788511339054
              },
              {
                "x": 8851.502029106281,
                "y": 348.7788511339054
              },
              {
                "x": 8851.502029106281,
                "y": 357.7788511355687
              },
              {
                "x": 8809.506568525325,
                "y": 357.7788511355687
              },
              {
                "x": 8809.50656852532,
                "y": 257.260126032017
              },
              {
                "x": 8776.510540516963,
                "y": 257.260126032017
              },
              {
                "x": 8776.510540516963,
                "y": 87.72948495347279
              },
              {
                "x": 8925.024488844989,
                "y": 87.72948495347278
              }
            ]
          }
        ]
      },
      {
        "entity_type": "HATCH",
        "handle": "36D68",
        "layer": "A-Roof_Pat",
        "pattern_name": "ANSI31",
        "solid_fill": false,
        "pattern_scale": 50.0,
        "pattern_angle": 45.0,
        "elevation": 0.0,
        "boundaries": [
          {
            "type": "1",
            "vertices": [
              {
                "x": 8707.50202910628,
                "y": 233.2499123391699
              },
              {
                "x": 8776.510540516963,
                "y": 233.24991233917
              },
              {
                "x": 8776.510540516963,
                "y": 257.260126032017
              },
              {
                "x": 8755.506568525321,
                "y": 257.2601260320171
              },
              {
                "x": 8695.491815413068,
                "y": 257.2601260320153
              },
              {
                "x": 8683.50202910628,
                "y": 257.2601260320166
              },
              {
                "x": 8683.502029106277,
                "y": 228.7320383766852
              },
              {
                "x": 8683.502029106277,
                "y": 193.2313501960311
              },
              {
                "x": 8683.502029106281,
                "y": 164.2311872356192
              },
              {
                "x": 8683.500326824134,
                "y": 164.2311872356192
              },
              {
                "x": 8683.500326824134,
                "y": 146.2311872356192
              },
              {
                "x": 8683.50202910628,
                "y": 146.2311872356192
              },
              {
                "x": 8683.50202910628,
                "y": 132.7311872356192
              },
              {
                "x": 8664.470117212677,
                "y": 132.731187235619
              },
              {
                "x": 8664.470117212677,
                "y": 129.7311872356194
              },
              {
                "x": 8665.470117212675,
                "y": 129.7311872356194
              },
              {
                "x": 8665.470117212675,
                "y": 128.7311872356194
              },
              {
                "x": 8641.470117212686,
                "y": 128.7311872356194
              },
              {
                "x": 8641.470117212686,
                "y": 129.7311872356194
              },
              {
                "x": 8642.470117212684,
                "y": 129.7311872356194
              },
              {
                "x": 8642.470117212684,
                "y": 132.731187235619
              },
              {
                "x": 8631.502029106266,
                "y": 132.731187235619
              },
              {
                "x": 8631.502029106266,
                "y": 129.7311872356194
              },
              {
                "x": 8632.502029106265,
                "y": 129.7311872356194
              },
              {
                "x": 8632.502029106265,
                "y": 128.7311872356194
              },
              {
                "x": 8620.50202910628,
                "y": 128.7311872356194
              },
              {
                "x": 8620.50202910628,
                "y": 108.7311872356194
              },
              {
                "x": 8707.50202910628,
                "y": 108.7311872356192
              }
            ]
          },
          {
            "type": "1",
            "vertices": [
              {
                "x": 8620.50202910628,
                "y": 128.7311872356194
              },
              {
                "x": 8608.502029106276,
                "y": 128.7311872356194
              },
              {
                "x": 8608.502029106276,
                "y": 129.7311872356194
              },
              {
                "x": 8609.502029106276,
                "y": 129.7311872356194
              },
              {
                "x": 8609.502029106276,
                "y": 132.7311872356189
              },
              {
                "x": 8598.16394099986,
                "y": 132.731187235619
              },
              {
                "x": 8598.16394099986,
                "y": 129.7311872356194
              },
              {
                "x": 8599.163940999859,
                "y": 129.7311872356194
              },
              {
                "x": 8599.163940999859,
                "y": 128.7311872356194
              },
              {
                "x": 8575.53394099987,
                "y": 128.7311872356194
              },
              {
                "x": 8575.53394099987,
                "y": 129.7311872356194
              },
              {
                "x": 8576.533940999867,
                "y": 129.7311872356194
              },
              {
                "x": 8576.533940999869,
                "y": 132.7311872356198
              },
              {
                "x": 8557.502029106281,
                "y": 132.7311872356195
              },
              {
                "x": 8557.502029106281,
                "y": 168.7379963641824
              },
              {
                "x": 8533.502029106281,
                "y": 144.7311872356201
              },
              {
                "x": 8533.50202910628,
                "y": 108.7311872356195
              },
              {
                "x": 8620.50202910628,
                "y": 108.7311872356194
              }
            ]
          }
        ]
      }
    ],
    "MTEXT": [
      {
        "entity_type": "MTEXT",
        "handle": "36D36",
        "layer": "A-Anno-Text",
        "text": "BALCONY\n8'3\"X10'6\"",
        "position": {
          "x": 8509.121722400669,
          "y": 574.5739659233524,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36D41",
        "layer": "A-Anno-Text",
        "text": "MASTER BEDROOM\n21'0\"x15'0\"",
        "position": {
          "x": 8582.843054028142,
          "y": 766.8137577507606,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36D98",
        "layer": "A-Anno-Text",
        "text": "BED ROOM\n16'6\"x15'0\"",
        "position": {
          "x": 8506.43663537649,
          "y": 262.4437729092011,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36DBB",
        "layer": "A-Anno-Text",
        "text": "BATH\n9'0\"x9'6\"",
        "position": {
          "x": 8618.380412919301,
          "y": 264.006232602553,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36DBF",
        "layer": "A-Anno-Text",
        "text": "LINNEN\nSTORE\n10'0\"x6'9\"",
        "position": {
          "x": 8833.292796663754,
          "y": 528.7084830670706,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36EEF",
        "layer": "A-Anno-Text",
        "text": "\nFOYER\n7'9\"x9'0\"",
        "position": {
          "x": 8721.551525370025,
          "y": 436.4040878864575,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36EFD",
        "layer": "A-Anno-Text",
        "text": "SHOWER\n7'3\"X4'0\"",
        "position": {
          "x": 8898.907210511032,
          "y": 827.5428077164873,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 89.33487765480713
      },
      {
        "entity_type": "MTEXT",
        "handle": "36F2F",
        "layer": "A-Anno-Text",
        "text": "MASTER BATH ROOM\n13'0\"x10'9\"",
        "position": {
          "x": 8847.41613322666,
          "y": 761.5012838602019,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 112.80881343527
      },
      {
        "entity_type": "MTEXT",
        "handle": "36F80",
        "layer": "A-Anno-Text",
        "text": "DRESS\n10'0\"x8'0\"",
        "position": {
          "x": 8836.448115195883,
          "y": 615.6237155475015,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "36F82",
        "layer": "A-Anno-Text",
        "text": "WALK IN CLOSET\n11'6\"x15'0\"",
        "position": {
          "x": 8971.70601987785,
          "y": 573.1267783791394,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "370F9",
        "layer": "A-Anno-Text",
        "text": "SHOWER\n4'6\"X4'3\"",
        "position": {
          "x": 8598.040476972648,
          "y": 158.3866755121946,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 89.33487765480713
      },
      {
        "entity_type": "MTEXT",
        "handle": "37100",
        "layer": "A-Anno-Text",
        "text": "SITTING ROOM\n16'9\"x15'0\"",
        "position": {
          "x": 8650.586837114031,
          "y": 571.7420921942124,
          "z": 0.0
        },
        "height": 5.999999999999998,
        "rotation": 0.0,
        "width": 79.95945208427729
      },
      {
        "entity_type": "MTEXT",
        "handle": "37239",
        "layer": "A-Flor-Iden",
        "text": "FIRST FLOOR PLAN",
        "position": {
          "x": 8457.208784401293,
          "y": -58.89198866466592,
          "z": 0.0
        },
        "height": 18.0,
        "rotation": 0.0,
        "width": 1042.239162247895
      },
      {
        "entity_type": "MTEXT",
        "handle": "3723B",
        "layer": "A-Flor-Iden",
        "text": "SCALE: 1/4\" = 1'-0\"",
        "position": {
          "x": 8457.208784401293,
          "y": -90.89198866466592,
          "z": 0.0
        },
        "height": 12.0,
        "rotation": 0.0,
        "width": 1042.239162247895
      }
    ],
    "LINE": [
      {
        "entity_type": "LINE",
        "handle": "36D37",
        "layer": "A-ROOF",
        "start": {
          "x": 8707.50202910628,
          "y": 233.2499123391699,
          "z": 0.0
        },
        "end": {
          "x": 8776.510540516963,
          "y": 233.24991233917,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D3A",
        "layer": "A-Wall",
        "start": {
          "x": 8527.49521997771,
          "y": 483.7788511355667,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106265,
          "y": 483.7788511355694,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D3B",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106292,
          "y": 357.7788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106292,
          "y": 354.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D3C",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106286,
          "y": 318.7788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106286,
          "y": 315.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D3D",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106286,
          "y": 311.2788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106283,
          "y": 282.7538843308326,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D3F",
        "layer": "A-Wall",
        "start": {
          "x": 8566.5037313884,
          "y": 483.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8566.5037313884,
          "y": 519.7788511355673,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D40",
        "layer": "A-Wall",
        "start": {
          "x": 8674.500326824143,
          "y": 311.2788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106286,
          "y": 311.2788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D42",
        "layer": "A-Wall",
        "start": {
          "x": 8557.50202910626,
          "y": 519.7788511355673,
          "z": 0.0
        },
        "end": {
          "x": 8566.5037313884,
          "y": 519.7788511355673,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D43",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.001461678881,
          "y": 514.0445331276004,
          "z": 0.0
        },
        "end": {
          "x": 8555.001461678881,
          "y": 516.5451005549808,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D44",
        "layer": "A-Wall",
        "start": {
          "x": 8752.498624541995,
          "y": 663.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8752.498624542,
          "y": 672.7788511355678,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D45",
        "layer": "A-Wall",
        "start": {
          "x": 8800.506568525323,
          "y": 357.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8800.506568525325,
          "y": 266.2601260320174,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D46",
        "layer": "A-Wall",
        "start": {
          "x": 8767.5020291063,
          "y": 852.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8767.502029106285,
          "y": 723.7901996831782,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D47",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106281,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106286,
          "y": 141.7311872356195,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D48",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106294,
          "y": 852.7788511355683,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106283,
          "y": 728.2901996831679,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D49",
        "layer": "A-Wall",
        "start": {
          "x": 8767.502029106277,
          "y": 663.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8767.502029106303,
          "y": 474.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D4A",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106276,
          "y": 663.7788511355686,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106292,
          "y": 567.778851135569,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D4B",
        "layer": "A-Wall",
        "start": {
          "x": 8896.502029106277,
          "y": 663.7788511355676,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106283,
          "y": 630.7609771730866,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D4D",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247333,
          "y": 663.7788511355676,
          "z": 0.0
        },
        "end": {
          "x": 8901.002880247343,
          "y": 630.7609771730866,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D4E",
        "layer": "A-Wall",
        "start": {
          "x": 8817.002029106312,
          "y": 728.2901996831653,
          "z": 0.0
        },
        "end": {
          "x": 8817.00202910628,
          "y": 672.7788511355681,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D4F",
        "layer": "A-Wall",
        "start": {
          "x": 8812.502029106308,
          "y": 723.7901996831566,
          "z": 0.0
        },
        "end": {
          "x": 8812.50202910628,
          "y": 672.7788511355674,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D50",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106294,
          "y": 563.2779999944984,
          "z": 0.0
        },
        "end": {
          "x": 8776.50202910629,
          "y": 483.7788511355639,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D51",
        "layer": "A-Wall",
        "start": {
          "x": 8815.502029106294,
          "y": 483.7788511355637,
          "z": 0.0
        },
        "end": {
          "x": 8815.502029106294,
          "y": 474.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D53",
        "layer": "A-Wall",
        "start": {
          "x": 8809.506568525325,
          "y": 357.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D54",
        "layer": "A-Wall",
        "start": {
          "x": 8683.502029106276,
          "y": 483.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8683.502029106276,
          "y": 450.7862276916956,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D55",
        "layer": "A-Wall",
        "start": {
          "x": 8674.502029106276,
          "y": 474.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 8674.502029106276,
          "y": 450.7862276916956,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D56",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106294,
          "y": 852.7788511355683,
          "z": 0.0
        },
        "end": {
          "x": 8800.508305861067,
          "y": 852.778851135566,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D57",
        "layer": "A-Wall",
        "start": {
          "x": 8824.512845280115,
          "y": 852.7788511355665,
          "z": 0.0
        },
        "end": {
          "x": 8932.502029106283,
          "y": 852.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D58",
        "layer": "A-Wall",
        "start": {
          "x": 8683.502029106314,
          "y": 390.771474579439,
          "z": 0.0
        },
        "end": {
          "x": 8683.502029106281,
          "y": 357.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D59",
        "layer": "A-Wall",
        "start": {
          "x": 8674.502029106314,
          "y": 390.771474579448,
          "z": 0.0
        },
        "end": {
          "x": 8674.50202910629,
          "y": 366.7788511355707,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5A",
        "layer": "A-Wall",
        "start": {
          "x": 8817.00202910628,
          "y": 672.7788511355681,
          "z": 0.0
        },
        "end": {
          "x": 9049.559339271707,
          "y": 672.7788511381698,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5B",
        "layer": "A-Wall",
        "start": {
          "x": 8674.500326824143,
          "y": 311.2788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8674.500326824127,
          "y": 228.7320383766852,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5C",
        "layer": "A-Wall",
        "start": {
          "x": 8515.502029106272,
          "y": 714.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8515.50202910627,
          "y": 672.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5D",
        "layer": "A-Wall",
        "start": {
          "x": 8506.50202910629,
          "y": 714.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106283,
          "y": 663.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5E",
        "layer": "A-Wall",
        "start": {
          "x": 8515.502029106285,
          "y": 852.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8515.502029106281,
          "y": 810.7788511355698,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D5F",
        "layer": "A-Wall",
        "start": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106281,
          "y": 810.7788511355698,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D60",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106285,
          "y": 357.7788511355702,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106285,
          "y": 354.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D61",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106283,
          "y": 318.7788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 282.7538843308326,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D62",
        "layer": "A-Wall",
        "start": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "end": {
          "x": 8551.502029106286,
          "y": 861.778851135568,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D63",
        "layer": "A-Wall",
        "start": {
          "x": 8560.493233981866,
          "y": 861.778851135568,
          "z": 0.0
        },
        "end": {
          "x": 8572.563193525966,
          "y": 861.7788511355682,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D64",
        "layer": "A-Wall",
        "start": {
          "x": 8710.565864686607,
          "y": 861.7788552083617,
          "z": 0.0
        },
        "end": {
          "x": 8722.502029106285,
          "y": 861.7720420057924,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D65",
        "layer": "A-Wall",
        "start": {
          "x": 8731.502029106281,
          "y": 861.7720420057921,
          "z": 0.0
        },
        "end": {
          "x": 8800.490361791399,
          "y": 861.7788511355651,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D66",
        "layer": "A-Wall",
        "start": {
          "x": 8824.512845280115,
          "y": 861.7788511355656,
          "z": 0.0
        },
        "end": {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D67",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 177.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D69",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 168.7379963641824,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 132.7311872356195,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6A",
        "layer": "A-ROOF",
        "start": {
          "x": 8533.502029106281,
          "y": 144.7311872356193,
          "z": 0.0
        },
        "end": {
          "x": 8533.502029106281,
          "y": 108.7311872356195,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6B",
        "layer": "A-Wall",
        "start": {
          "x": 8686.50202910629,
          "y": 852.7788511355669,
          "z": 0.0
        },
        "end": {
          "x": 8767.5020291063,
          "y": 852.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6C",
        "layer": "A-Wall",
        "start": {
          "x": 8686.50202910629,
          "y": 861.7788511355669,
          "z": 0.0
        },
        "end": {
          "x": 8701.502029106285,
          "y": 861.7788552083625,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6D",
        "layer": "A-Wall",
        "start": {
          "x": 8515.502029106285,
          "y": 852.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8596.50202910629,
          "y": 852.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6E",
        "layer": "A-Wall",
        "start": {
          "x": 8581.502029106285,
          "y": 861.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8596.50202910629,
          "y": 861.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D6F",
        "layer": "A-Wall",
        "start": {
          "x": 8419.50486624318,
          "y": 357.7788511355691,
          "z": 0.0
        },
        "end": {
          "x": 8497.497489687225,
          "y": 357.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D70",
        "layer": "A-Wall",
        "start": {
          "x": 8533.502029106265,
          "y": 357.7788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106285,
          "y": 357.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D71",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106294,
          "y": 357.7788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8581.50202910627,
          "y": 357.7788511355704,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D72",
        "layer": "A-Wall",
        "start": {
          "x": 8515.50202910627,
          "y": 672.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8566.503731388404,
          "y": 672.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D73",
        "layer": "A-Wall",
        "start": {
          "x": 8350.500326824153,
          "y": 168.7379963641824,
          "z": 0.0
        },
        "end": {
          "x": 8383.500326824149,
          "y": 168.7379963641816,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D74",
        "layer": "A-Wall",
        "start": {
          "x": 8419.50486624319,
          "y": 168.7379963641808,
          "z": 0.0
        },
        "end": {
          "x": 8497.497489687234,
          "y": 168.7379963641767,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D75",
        "layer": "A-Wall",
        "start": {
          "x": 8533.502029106276,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8581.502029106281,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D78",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247333,
          "y": 663.7788511355676,
          "z": 0.0
        },
        "end": {
          "x": 9040.559339271747,
          "y": 663.7788511381631,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D79",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247352,
          "y": 483.7788511355617,
          "z": 0.0
        },
        "end": {
          "x": 9040.559339271727,
          "y": 483.7788511355695,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D7B",
        "layer": "A-Wall",
        "start": {
          "x": 8815.502029106296,
          "y": 483.7788511355637,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106283,
          "y": 483.7788511355619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D7C",
        "layer": "A-Wall",
        "start": {
          "x": 8659.502029106276,
          "y": 483.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8683.502029106274,
          "y": 483.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D7D",
        "layer": "A-Wall",
        "start": {
          "x": 8506.502029106283,
          "y": 663.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106254,
          "y": 663.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D7E",
        "layer": "A-Wall",
        "start": {
          "x": 8815.502029106294,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8977.502029106296,
          "y": 474.7788511355701,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D80",
        "layer": "A-Wall",
        "start": {
          "x": 8986.502029106276,
          "y": 474.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D81",
        "layer": "A-Wall",
        "start": {
          "x": 8767.502029106303,
          "y": 474.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 474.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D82",
        "layer": "A-Wall",
        "start": {
          "x": 8659.502029106276,
          "y": 474.7788511355692,
          "z": 0.0
        },
        "end": {
          "x": 8674.502029106276,
          "y": 474.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D83",
        "layer": "A-Wall",
        "start": {
          "x": 8527.49521997771,
          "y": 474.7788511355666,
          "z": 0.0
        },
        "end": {
          "x": 8581.502029106281,
          "y": 474.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D84",
        "layer": "A-Wall",
        "start": {
          "x": 8335.502029106283,
          "y": 357.7788511355702,
          "z": 0.0
        },
        "end": {
          "x": 8383.50032682414,
          "y": 357.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D85",
        "layer": "A-Wall",
        "start": {
          "x": 8350.50032682415,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8383.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D86",
        "layer": "A-Wall",
        "start": {
          "x": 8659.502029106281,
          "y": 366.7788511355705,
          "z": 0.0
        },
        "end": {
          "x": 8674.50202910629,
          "y": 366.7788511355707,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D87",
        "layer": "A-Wall",
        "start": {
          "x": 8800.506568525325,
          "y": 366.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8977.502029106305,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D88",
        "layer": "A-Wall",
        "start": {
          "x": 8659.502029106272,
          "y": 357.7788511355702,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 357.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D89",
        "layer": "A-Wall",
        "start": {
          "x": 8335.502029106294,
          "y": 177.7379963641828,
          "z": 0.0
        },
        "end": {
          "x": 8383.500326824149,
          "y": 177.737996364182,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8A",
        "layer": "A-Wall",
        "start": {
          "x": 8419.504866243191,
          "y": 177.737996364181,
          "z": 0.0
        },
        "end": {
          "x": 8497.44301665872,
          "y": 177.7379963641768,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8B",
        "layer": "A-Wall",
        "start": {
          "x": 8533.502029106274,
          "y": 168.7379963641819,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 168.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8C",
        "layer": "A-Wall",
        "start": {
          "x": 8533.502029106276,
          "y": 177.7379963641819,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 177.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8D",
        "layer": "A-Wall",
        "start": {
          "x": 8755.506568525321,
          "y": 266.2601260320175,
          "z": 0.0
        },
        "end": {
          "x": 8800.506568525325,
          "y": 266.2601260320174,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8E",
        "layer": "A-Wall",
        "start": {
          "x": 8755.506568525321,
          "y": 257.2601260320171,
          "z": 0.0
        },
        "end": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D8F",
        "layer": "A-Wall",
        "start": {
          "x": 8710.498624541993,
          "y": 663.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 8710.498624541999,
          "y": 672.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D91",
        "layer": "A-Wall",
        "start": {
          "x": 8335.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8350.50032682415,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D92",
        "layer": "A-ROOF",
        "start": {
          "x": 8224.502029106283,
          "y": 390.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8674.502029106316,
          "y": 390.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D94",
        "layer": "A-ROOF",
        "start": {
          "x": 8224.502029106285,
          "y": 144.7379963641824,
          "z": 0.0
        },
        "end": {
          "x": 8224.502029106283,
          "y": 390.7788511355705,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D95",
        "layer": "A-Wall",
        "start": {
          "x": 8350.500326824153,
          "y": 168.7379963641824,
          "z": 0.0
        },
        "end": {
          "x": 8335.500326824149,
          "y": 168.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D96",
        "layer": "A-ROOF",
        "start": {
          "x": 8533.502029106276,
          "y": 144.7379963641824,
          "z": 0.0
        },
        "end": {
          "x": 8224.502029106285,
          "y": 144.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D97",
        "layer": "A-Wall",
        "start": {
          "x": 8683.502029106281,
          "y": 315.7788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106286,
          "y": 315.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D99",
        "layer": "A-Wall",
        "start": {
          "x": 9049.559339271707,
          "y": 672.7788511381698,
          "z": 0.0
        },
        "end": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9A",
        "layer": "A-Wall",
        "start": {
          "x": 8710.498624541999,
          "y": 672.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8566.503731388404,
          "y": 672.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9B",
        "layer": "A-Wall",
        "start": {
          "x": 8710.498624541993,
          "y": 663.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 8566.503731388399,
          "y": 663.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9C",
        "layer": "A-Wall",
        "start": {
          "x": 8701.502029106285,
          "y": 861.7788552083625,
          "z": 0.0
        },
        "end": {
          "x": 8701.502029106285,
          "y": 885.7788511355786,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9D",
        "layer": "A-Wall",
        "start": {
          "x": 8506.502029106292,
          "y": 714.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8515.502029106272,
          "y": 714.7788511355698,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9E",
        "layer": "A-Wall",
        "start": {
          "x": 8506.502029106281,
          "y": 810.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8515.502029106281,
          "y": 810.7788511355698,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36D9F",
        "layer": "A-Wall",
        "start": {
          "x": 8851.502029106281,
          "y": 357.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8809.506568525327,
          "y": 357.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA0",
        "layer": "A-Wall",
        "start": {
          "x": 8566.503731388415,
          "y": 627.7788511355709,
          "z": 0.0
        },
        "end": {
          "x": 8566.503731388395,
          "y": 663.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA2",
        "layer": "A-Wall",
        "start": {
          "x": 8557.50202910626,
          "y": 483.7788511355694,
          "z": 0.0
        },
        "end": {
          "x": 8557.50202910626,
          "y": 519.7788511355673,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA4",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106274,
          "y": 627.7788511355709,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106254,
          "y": 663.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA5",
        "layer": "A-Flor",
        "start": {
          "x": 8458.483304002726,
          "y": 510.7788511355671,
          "z": 0.0
        },
        "end": {
          "x": 8458.483304002735,
          "y": 636.7788511355689,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA6",
        "layer": "A-Wall",
        "start": {
          "x": 8335.502029106283,
          "y": 357.7788511355711,
          "z": 0.0
        },
        "end": {
          "x": 8335.502029106294,
          "y": 321.758423749881,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA7",
        "layer": "A-Wall",
        "start": {
          "x": 8326.500326824153,
          "y": 366.7788511355714,
          "z": 0.0
        },
        "end": {
          "x": 8326.500326824153,
          "y": 321.758423749881,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA8",
        "layer": "A-Wall",
        "start": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 146.2311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DA9",
        "layer": "A-ROOF",
        "start": {
          "x": 8707.50202910628,
          "y": 108.7311872356192,
          "z": 0.0
        },
        "end": {
          "x": 8707.50202910628,
          "y": 233.2499123391699,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAA",
        "layer": "A-Wall",
        "start": {
          "x": 8683.502029106281,
          "y": 164.2311872356192,
          "z": 0.0
        },
        "end": {
          "x": 8683.502029106286,
          "y": 195.7320383766852,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAB",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 132.7311872356195,
          "z": 0.0
        },
        "end": {
          "x": 8578.533940999872,
          "y": 132.7311872356199,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAC",
        "layer": "A-Wall",
        "start": {
          "x": 8596.16394099986,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8611.50202910628,
          "y": 132.7311872356189,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAD",
        "layer": "A-Wall",
        "start": {
          "x": 8629.502029106266,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8644.470117212684,
          "y": 132.731187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAE",
        "layer": "A-Wall",
        "start": {
          "x": 8662.470117212677,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DAF",
        "layer": "A-Glaz",
        "start": {
          "x": 8578.53394099987,
          "y": 137.2311872356199,
          "z": 0.0
        },
        "end": {
          "x": 8596.163940999859,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB0",
        "layer": "A-Glaz",
        "start": {
          "x": 8611.50202910628,
          "y": 137.231187235619,
          "z": 0.0
        },
        "end": {
          "x": 8629.502029106268,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB1",
        "layer": "A-Glaz",
        "start": {
          "x": 8644.470117212684,
          "y": 137.231187235619,
          "z": 0.0
        },
        "end": {
          "x": 8662.470117212673,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB2",
        "layer": "A-Wall",
        "start": {
          "x": 8683.502029106277,
          "y": 228.7320383766852,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 257.2601260320166,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB3",
        "layer": "A-Wall",
        "start": {
          "x": 8683.50202910628,
          "y": 266.2601260320174,
          "z": 0.0
        },
        "end": {
          "x": 8683.502029106281,
          "y": 315.7788511355701,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB4",
        "layer": "A-Wall",
        "start": {
          "x": 8326.50032682416,
          "y": 213.7584237498811,
          "z": 0.0
        },
        "end": {
          "x": 8326.500326824153,
          "y": 168.7379963641832,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB5",
        "layer": "A-Wall",
        "start": {
          "x": 8335.502029106301,
          "y": 213.7584237498811,
          "z": 0.0
        },
        "end": {
          "x": 8335.502029106294,
          "y": 177.7379963641832,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB6",
        "layer": "A-Wall",
        "start": {
          "x": 8674.500326824136,
          "y": 195.7320383766852,
          "z": 0.0
        },
        "end": {
          "x": 8674.500326824136,
          "y": 164.2311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB7",
        "layer": "A-Wall",
        "start": {
          "x": 8674.500326824143,
          "y": 146.2311872356119,
          "z": 0.0
        },
        "end": {
          "x": 8674.500326824142,
          "y": 141.7311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB8",
        "layer": "A-Wall",
        "start": {
          "x": 8566.502029106286,
          "y": 141.7311872356195,
          "z": 0.0
        },
        "end": {
          "x": 8674.500326824142,
          "y": 141.7311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DB9",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106281,
          "y": 246.7538843308326,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DBA",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 282.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106283,
          "y": 282.7538843308326,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DBC",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.001461678892,
          "y": 631.0285674218787,
          "z": 0.0
        },
        "end": {
          "x": 8555.001461678892,
          "y": 633.529134849259,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DBD",
        "layer": "A-Hand rail",
        "start": {
          "x": 8464.233587716417,
          "y": 516.5451005549808,
          "z": 0.0
        },
        "end": {
          "x": 8464.233587716428,
          "y": 631.0285674218787,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DBE",
        "layer": "A-Hand rail",
        "start": {
          "x": 8461.733020289037,
          "y": 514.0445331276004,
          "z": 0.0
        },
        "end": {
          "x": 8461.733020289048,
          "y": 633.529134849259,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC2",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.00146167889,
          "y": 631.0285674218787,
          "z": 0.0
        },
        "end": {
          "x": 8464.233587716428,
          "y": 631.0285674218787,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC3",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.00146167888,
          "y": 516.5451005549808,
          "z": 0.0
        },
        "end": {
          "x": 8464.233587716417,
          "y": 516.5451005549808,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC4",
        "layer": "A-Flor",
        "start": {
          "x": 8557.502029106272,
          "y": 636.7788511355689,
          "z": 0.0
        },
        "end": {
          "x": 8458.483304002735,
          "y": 636.7788511355689,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC5",
        "layer": "A-Flor",
        "start": {
          "x": 8557.502029106272,
          "y": 510.7788511355671,
          "z": 0.0
        },
        "end": {
          "x": 8458.483304002726,
          "y": 510.7788511355671,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC6",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.001461678892,
          "y": 633.529134849259,
          "z": 0.0
        },
        "end": {
          "x": 8461.733020289048,
          "y": 633.529134849259,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DC7",
        "layer": "A-Wall",
        "start": {
          "x": 8566.503731388415,
          "y": 627.7788511355709,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106274,
          "y": 627.7788511355709,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCA",
        "layer": "A-Wall",
        "start": {
          "x": 8752.498624541995,
          "y": 663.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8767.50202910628,
          "y": 663.7788511355689,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCB",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106276,
          "y": 663.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 663.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCC",
        "layer": "A-Wall",
        "start": {
          "x": 8809.502029106296,
          "y": 663.7788511355689,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106277,
          "y": 663.7788511355689,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCD",
        "layer": "A-Wall",
        "start": {
          "x": 8752.498624542,
          "y": 672.7788511355678,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 672.7788511355676,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCE",
        "layer": "A-Wall",
        "start": {
          "x": 8809.502029106296,
          "y": 672.7788511355673,
          "z": 0.0
        },
        "end": {
          "x": 8812.50202910628,
          "y": 672.7788511355673,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DCF",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247344,
          "y": 594.7609771730866,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106285,
          "y": 594.7609771730866,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD0",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247344,
          "y": 630.7609771730866,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106285,
          "y": 630.7609771730866,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD1",
        "layer": "A-Wall",
        "start": {
          "x": 8896.502029106288,
          "y": 567.7788511355674,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106292,
          "y": 567.778851135569,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD2",
        "layer": "A-Hand rail",
        "start": {
          "x": 8555.001461678881,
          "y": 514.0445331276004,
          "z": 0.0
        },
        "end": {
          "x": 8461.733020289037,
          "y": 514.0445331276004,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD5",
        "layer": "A-Wall",
        "start": {
          "x": 9040.559339271747,
          "y": 663.7788511381631,
          "z": 0.0
        },
        "end": {
          "x": 9040.559339271727,
          "y": 483.7788511355695,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD8",
        "layer": "A-Wall",
        "start": {
          "x": 8776.502029106281,
          "y": 728.2901996831679,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 728.2901996831677,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DD9",
        "layer": "A-Wall",
        "start": {
          "x": 8809.502029106296,
          "y": 728.2901996831657,
          "z": 0.0
        },
        "end": {
          "x": 8817.002029106312,
          "y": 728.2901996831653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DDA",
        "layer": "A-Wall",
        "start": {
          "x": 8527.49521997771,
          "y": 474.7788511355682,
          "z": 0.0
        },
        "end": {
          "x": 8527.49521997771,
          "y": 483.7788511355697,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DDB",
        "layer": "A-Wall",
        "start": {
          "x": 8896.502029106285,
          "y": 563.2779999944968,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106294,
          "y": 563.2779999944984,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DDD",
        "layer": "A-Wall",
        "start": {
          "x": 8458.476494874163,
          "y": 483.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8446.476494874163,
          "y": 483.7788511355704,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE0",
        "layer": "A-Wall",
        "start": {
          "x": 8437.476494874163,
          "y": 498.778851135571,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874163,
          "y": 474.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE1",
        "layer": "A-Wall",
        "start": {
          "x": 8458.476494874163,
          "y": 483.7788511355698,
          "z": 0.0
        },
        "end": {
          "x": 8458.476494874163,
          "y": 474.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE2",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874163,
          "y": 498.778851135571,
          "z": 0.0
        },
        "end": {
          "x": 8446.476494874163,
          "y": 483.7788511355704,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE3",
        "layer": "A-Wall",
        "start": {
          "x": 8437.476494874163,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8458.476494874163,
          "y": 474.7788511355682,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE4",
        "layer": "A-Wall",
        "start": {
          "x": 8458.476494874161,
          "y": 672.77885113557,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE6",
        "layer": "A-Wall",
        "start": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874161,
          "y": 648.7788511355709,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE7",
        "layer": "A-Wall",
        "start": {
          "x": 8458.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "end": {
          "x": 8458.47649487416,
          "y": 663.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE8",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874161,
          "y": 663.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8446.476494874161,
          "y": 648.7788511355709,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DE9",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874161,
          "y": 663.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8458.476494874158,
          "y": 663.7788511355702,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DEA",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874163,
          "y": 498.7788511355711,
          "z": 0.0
        },
        "end": {
          "x": 8446.476494874161,
          "y": 648.778851135571,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DEC",
        "layer": "A-Flor",
        "start": {
          "x": 8458.47649487416,
          "y": 672.778851135569,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106288,
          "y": 672.7788511355678,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36DED",
        "layer": "A-Wall",
        "start": {
          "x": 8767.502029106285,
          "y": 723.7901996831782,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 723.7901996831773,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36EBA",
        "layer": "A-Furn",
        "start": {
          "x": 8592.696988650387,
          "y": 672.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8592.696988650387,
          "y": 702.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36EF2",
        "layer": "A-Furn",
        "start": {
          "x": 8752.498624541995,
          "y": 663.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8752.498624542002,
          "y": 553.5859523388157,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36EF6",
        "layer": "A-Furn",
        "start": {
          "x": 8767.502029106296,
          "y": 553.5859523388157,
          "z": 0.0
        },
        "end": {
          "x": 8752.498624542002,
          "y": 553.5859523388157,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F0D",
        "layer": "A-Furn",
        "start": {
          "x": 8515.44698865037,
          "y": 702.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8592.696988650385,
          "y": 702.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F15",
        "layer": "A-Furn",
        "start": {
          "x": 8497.443016658723,
          "y": 207.7379963641831,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 207.7379963641831,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F1A",
        "layer": "A-Furn",
        "start": {
          "x": 8497.443016658723,
          "y": 177.7379963641831,
          "z": 0.0
        },
        "end": {
          "x": 8497.443016658723,
          "y": 207.7379963641831,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F2B",
        "layer": "A-Wall",
        "start": {
          "x": 8901.002880247346,
          "y": 594.7609771730869,
          "z": 0.0
        },
        "end": {
          "x": 8901.002880247352,
          "y": 483.7788511355617,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F2C",
        "layer": "A-Wall",
        "start": {
          "x": 8896.502029106285,
          "y": 594.7609771730866,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106288,
          "y": 567.7788511355674,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F2D",
        "layer": "A-Wall",
        "start": {
          "x": 8896.502029106285,
          "y": 563.2779999944968,
          "z": 0.0
        },
        "end": {
          "x": 8896.502029106283,
          "y": 483.7788511355619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F30",
        "layer": "A-Glaz",
        "start": {
          "x": 8844.001177965223,
          "y": 852.7788511355681,
          "z": 0.0
        },
        "end": {
          "x": 8844.001177965218,
          "y": 801.7788511355769,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F31",
        "layer": "A-Glaz",
        "start": {
          "x": 8842.501177965223,
          "y": 852.7788511355678,
          "z": 0.0
        },
        "end": {
          "x": 8842.501177965218,
          "y": 801.7788511355772,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F32",
        "layer": "A-Glaz",
        "start": {
          "x": 8845.501177965223,
          "y": 852.7788511355674,
          "z": 0.0
        },
        "end": {
          "x": 8845.501177965218,
          "y": 801.7788511355769,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F33",
        "layer": "A-Wall",
        "start": {
          "x": 8941.503759847898,
          "y": 801.7788511355712,
          "z": 0.0
        },
        "end": {
          "x": 8932.50202910629,
          "y": 801.7788511355715,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F34",
        "layer": "A-Glaz",
        "start": {
          "x": 8845.501177965218,
          "y": 801.7788511355719,
          "z": 0.0
        },
        "end": {
          "x": 8842.501177965218,
          "y": 801.7788511355719,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F94",
        "layer": "A-Wall",
        "start": {
          "x": 8941.503759847898,
          "y": 804.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8941.503759847898,
          "y": 801.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F95",
        "layer": "A-Wall",
        "start": {
          "x": 8941.503759847898,
          "y": 804.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8932.502029106283,
          "y": 804.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F96",
        "layer": "A-Wall",
        "start": {
          "x": 8950.5037598479,
          "y": 852.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8932.502029106283,
          "y": 852.7788511355685,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36F97",
        "layer": "A-Wall",
        "start": {
          "x": 8932.502029106283,
          "y": 804.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8932.502029106292,
          "y": 801.7788511355715,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FE2",
        "layer": "A-Furn",
        "start": {
          "x": 8592.696988650387,
          "y": 687.104044023757,
          "z": 0.0
        },
        "end": {
          "x": 8592.696988650387,
          "y": 675.1040440237497,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FF9",
        "layer": "A-Furn",
        "start": {
          "x": 8658.696988650387,
          "y": 687.104044023757,
          "z": 0.0
        },
        "end": {
          "x": 8592.696988650387,
          "y": 687.104044023757,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FFB",
        "layer": "A-Furn",
        "start": {
          "x": 8658.696988650387,
          "y": 687.104044023757,
          "z": 0.0
        },
        "end": {
          "x": 8658.696988650387,
          "y": 675.1040440237497,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FFC",
        "layer": "A-Furn",
        "start": {
          "x": 8658.696988650387,
          "y": 675.1040440237497,
          "z": 0.0
        },
        "end": {
          "x": 8592.696988650387,
          "y": 675.1040440237497,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FFE",
        "layer": "A-Wall",
        "start": {
          "x": 8977.502029106292,
          "y": 390.7788511355536,
          "z": 0.0
        },
        "end": {
          "x": 8977.502029106305,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "36FFF",
        "layer": "A-Wall",
        "start": {
          "x": 8986.502029106276,
          "y": 474.7788511355697,
          "z": 0.0
        },
        "end": {
          "x": 8986.502029106286,
          "y": 450.7788511355549,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37000",
        "layer": "A-Wall",
        "start": {
          "x": 8977.502029106296,
          "y": 474.7788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8977.502029106307,
          "y": 450.7788511355536,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37001",
        "layer": "A-Wall",
        "start": {
          "x": 8986.502029106261,
          "y": 390.7788511355549,
          "z": 0.0
        },
        "end": {
          "x": 8986.50202910628,
          "y": 348.7788511355577,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37002",
        "layer": "A-Hand rail",
        "start": {
          "x": 8925.002029106283,
          "y": 474.7942433662775,
          "z": 0.0
        },
        "end": {
          "x": 8925.00202910629,
          "y": 366.7942433662782,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37003",
        "layer": "A-Hand rail",
        "start": {
          "x": 8928.002029106276,
          "y": 474.7788511355695,
          "z": 0.0
        },
        "end": {
          "x": 8928.002029106283,
          "y": 366.7788511355702,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37004",
        "layer": "A-Hand rail",
        "start": {
          "x": 8926.502029106276,
          "y": 474.7788511355694,
          "z": 0.0
        },
        "end": {
          "x": 8926.502029106283,
          "y": 366.7788511355701,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37005",
        "layer": "A-Hand rail",
        "start": {
          "x": 8929.502029106276,
          "y": 474.7788511355696,
          "z": 0.0
        },
        "end": {
          "x": 8929.502029106283,
          "y": 366.7788511355703,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37008",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8829.002029106283,
          "y": 474.7980914240477,
          "z": 0.0
        },
        "end": {
          "x": 8829.002029106285,
          "y": 422.2980914236734,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37009",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8839.502029106283,
          "y": 474.7980914240476,
          "z": 0.0
        },
        "end": {
          "x": 8839.502029106283,
          "y": 422.2980914236736,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3700A",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8850.002029106283,
          "y": 474.7980914240476,
          "z": 0.0
        },
        "end": {
          "x": 8850.002029106283,
          "y": 422.2980914236738,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3700C",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8860.502029106283,
          "y": 474.7980914240476,
          "z": 0.0
        },
        "end": {
          "x": 8860.502029106288,
          "y": 422.2980914236741,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3700D",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8860.502029106288,
          "y": 417.798091423674,
          "z": 0.0
        },
        "end": {
          "x": 8860.502029106288,
          "y": 406.7954386315032,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3700E",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8839.502029106286,
          "y": 366.7980914240488,
          "z": 0.0
        },
        "end": {
          "x": 8839.502029106283,
          "y": 417.7980914236736,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3700F",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8850.002029106286,
          "y": 366.7980914240488,
          "z": 0.0
        },
        "end": {
          "x": 8850.002029106283,
          "y": 417.7980914236737,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37010",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8860.502029106286,
          "y": 366.7980914240488,
          "z": 0.0
        },
        "end": {
          "x": 8860.502029106283,
          "y": 417.798091423674,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37011",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8860.502029106283,
          "y": 422.298091423674,
          "z": 0.0
        },
        "end": {
          "x": 8860.502029106285,
          "y": 422.8007442158453,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37012",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8829.002029106286,
          "y": 366.7980914240487,
          "z": 0.0
        },
        "end": {
          "x": 8829.002029106283,
          "y": 417.7980914236733,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37013",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8818.502029106286,
          "y": 366.7980914240485,
          "z": 0.0
        },
        "end": {
          "x": 8818.502029106283,
          "y": 417.7980914236731,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37015",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8808.002029106286,
          "y": 366.7980914240483,
          "z": 0.0
        },
        "end": {
          "x": 8808.002029106283,
          "y": 417.7980914236729,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37017",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8797.502029106286,
          "y": 366.798091424048,
          "z": 0.0
        },
        "end": {
          "x": 8797.502029106283,
          "y": 417.7980914236726,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37018",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8787.002029106286,
          "y": 366.7980914240478,
          "z": 0.0
        },
        "end": {
          "x": 8787.002029106283,
          "y": 417.7980914236724,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37019",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8871.002029106286,
          "y": 366.7163818812719,
          "z": 0.0
        },
        "end": {
          "x": 8871.002029106283,
          "y": 417.7980914236742,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3701B",
        "layer": "A-Anno-Text",
        "start": {
          "x": 8871.002029106285,
          "y": 393.7980914238611,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106285,
          "y": 393.7980914238608,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3701C",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8902.502029106286,
          "y": 366.7202299390424,
          "z": 0.0
        },
        "end": {
          "x": 8902.502029106283,
          "y": 417.7980914236749,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3701D",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8881.502029106286,
          "y": 366.7202299390424,
          "z": 0.0
        },
        "end": {
          "x": 8881.502029106283,
          "y": 417.7980914236745,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3701E",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8892.002029106286,
          "y": 366.7163818812713,
          "z": 0.0
        },
        "end": {
          "x": 8892.002029106283,
          "y": 417.7980914236747,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3701F",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8913.002029106286,
          "y": 366.7240779968134,
          "z": 0.0
        },
        "end": {
          "x": 8913.002029106283,
          "y": 417.7980914236751,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37023",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8818.502029106283,
          "y": 474.7980914240479,
          "z": 0.0
        },
        "end": {
          "x": 8818.502029106283,
          "y": 422.2980914236732,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37024",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8871.002029106285,
          "y": 474.7788511355696,
          "z": 0.0
        },
        "end": {
          "x": 8871.002029106283,
          "y": 422.2980914236743,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37025",
        "layer": "A-Flor-Strs",
        "start": {
          "x": 8776.502029106286,
          "y": 366.7980914240487,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106283,
          "y": 417.7980914236722,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37026",
        "layer": "A-Hand rail",
        "start": {
          "x": 8925.002029106286,
          "y": 419.2980914236754,
          "z": 0.0
        },
        "end": {
          "x": 8778.002029106283,
          "y": 419.2980914236722,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37027",
        "layer": "A-Hand rail",
        "start": {
          "x": 8925.002029106286,
          "y": 417.7980914236754,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106283,
          "y": 417.7980914236722,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37028",
        "layer": "A-Hand rail",
        "start": {
          "x": 8925.002029106286,
          "y": 422.2980914236754,
          "z": 0.0
        },
        "end": {
          "x": 8778.002029106283,
          "y": 422.2980914236722,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37029",
        "layer": "A-Hand rail",
        "start": {
          "x": 8925.002029106286,
          "y": 423.7980914236754,
          "z": 0.0
        },
        "end": {
          "x": 8776.502029106283,
          "y": 423.7980914236722,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3702A",
        "layer": "A-Wall",
        "start": {
          "x": 8557.502029106281,
          "y": 132.7311872356193,
          "z": 0.0
        },
        "end": {
          "x": 8566.50202910628,
          "y": 132.7311872356186,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3702B",
        "layer": "A-Wall",
        "start": {
          "x": 8800.506568525325,
          "y": 366.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8775.002029106283,
          "y": 366.7826991933408,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3702C",
        "layer": "A-Wall",
        "start": {
          "x": 8775.002029106283,
          "y": 366.7826991933408,
          "z": 0.0
        },
        "end": {
          "x": 8775.002029106283,
          "y": 357.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3702D",
        "layer": "A-Wall",
        "start": {
          "x": 8800.506568525323,
          "y": 357.7788511355687,
          "z": 0.0
        },
        "end": {
          "x": 8775.002029106283,
          "y": 357.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37042",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8941.5037598479,
          "y": 846.7788511355707,
          "z": 0.0
        },
        "end": {
          "x": 8845.501177965223,
          "y": 846.7788511355694,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37065",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8887.502029106301,
          "y": 846.7788511355701,
          "z": 0.0
        },
        "end": {
          "x": 8875.376603535757,
          "y": 846.7788511355699,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3709C",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8587.50202910628,
          "y": 208.0100852924756,
          "z": 0.0
        },
        "end": {
          "x": 8587.502029106277,
          "y": 195.7320383766871,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3709D",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8587.502029106283,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8587.502029106281,
          "y": 229.0100852924756,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3709F",
        "layer": "A-Furn",
        "start": {
          "x": 8669.210786857706,
          "y": 230.875054196015,
          "z": 0.0
        },
        "end": {
          "x": 8669.2107868577,
          "y": 283.7538843308332,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370A6",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8566.502029106283,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8566.502029106283,
          "y": 195.7320383766868,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370A7",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8566.502029106285,
          "y": 246.7538843308326,
          "z": 0.0
        },
        "end": {
          "x": 8587.502029106283,
          "y": 246.7538843308326,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370A8",
        "layer": "A-Furn",
        "start": {
          "x": 8674.500326824136,
          "y": 230.875054196015,
          "z": 0.0
        },
        "end": {
          "x": 8669.210786857706,
          "y": 230.875054196015,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370A9",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8674.500326824142,
          "y": 146.2311872356119,
          "z": 0.0
        },
        "end": {
          "x": 8626.50032682413,
          "y": 146.2311872355818,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370BE",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8570.953750251298,
          "y": 192.7311872356176,
          "z": 0.0
        },
        "end": {
          "x": 8570.953750251296,
          "y": 141.7311872356195,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370E0",
        "layer": "A-Flor-Spcl",
        "start": {
          "x": 8570.953750251298,
          "y": 164.9811872356258,
          "z": 0.0
        },
        "end": {
          "x": 8570.953750251298,
          "y": 150.2320383766955,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "370FF",
        "layer": "A-Wall",
        "start": {
          "x": 8419.504866243191,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8497.497489687234,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37119",
        "layer": "A-Flor",
        "start": {
          "x": 8458.554044580727,
          "y": 708.7788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8458.554044580727,
          "y": 816.7788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711A",
        "layer": "A-Flor",
        "start": {
          "x": 8458.554044580727,
          "y": 816.7788511353587,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 816.7788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711B",
        "layer": "A-Hand rail",
        "start": {
          "x": 8460.054044580727,
          "y": 710.2788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8460.054044580727,
          "y": 815.2788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711C",
        "layer": "A-Hand rail",
        "start": {
          "x": 8461.554044580727,
          "y": 711.7788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8461.554044580727,
          "y": 813.7788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711D",
        "layer": "A-Hand rail",
        "start": {
          "x": 8460.054044580727,
          "y": 815.2788511353587,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 815.2788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711E",
        "layer": "A-Hand rail",
        "start": {
          "x": 8461.554044580727,
          "y": 813.7788511353587,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 813.7788511353587,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3711F",
        "layer": "A-Flor",
        "start": {
          "x": 8458.554044580727,
          "y": 708.7788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 708.7788511353295,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37120",
        "layer": "A-Wall",
        "start": {
          "x": 8560.493233981868,
          "y": 881.2788511355653,
          "z": 0.0
        },
        "end": {
          "x": 8572.563193525966,
          "y": 881.2788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37121",
        "layer": "A-Hand rail",
        "start": {
          "x": 8460.054044580727,
          "y": 710.2788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 710.2788511353295,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37122",
        "layer": "A-Hand rail",
        "start": {
          "x": 8461.554044580727,
          "y": 711.7788511353295,
          "z": 0.0
        },
        "end": {
          "x": 8506.502029106285,
          "y": 711.7788511353295,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37123",
        "layer": "A-Wall",
        "start": {
          "x": 8581.502029106285,
          "y": 861.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8581.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37124",
        "layer": "A-Wall",
        "start": {
          "x": 8572.563193525966,
          "y": 861.7788511355682,
          "z": 0.0
        },
        "end": {
          "x": 8572.563193525966,
          "y": 881.2788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37125",
        "layer": "A-Wall",
        "start": {
          "x": 8710.565864686607,
          "y": 861.778855208362,
          "z": 0.0
        },
        "end": {
          "x": 8710.565864686607,
          "y": 881.278855208362,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37126",
        "layer": "A-Wall",
        "start": {
          "x": 8560.493233981866,
          "y": 861.7788511355676,
          "z": 0.0
        },
        "end": {
          "x": 8560.493233981868,
          "y": 881.2788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37127",
        "layer": "A-Wall",
        "start": {
          "x": 8551.502029106286,
          "y": 861.778851135568,
          "z": 0.0
        },
        "end": {
          "x": 8551.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37128",
        "layer": "A-Wall",
        "start": {
          "x": 8722.502029106285,
          "y": 861.7720420057929,
          "z": 0.0
        },
        "end": {
          "x": 8722.502029106285,
          "y": 881.2720420057927,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37129",
        "layer": "A-Wall",
        "start": {
          "x": 8731.502029106283,
          "y": 861.7720420057929,
          "z": 0.0
        },
        "end": {
          "x": 8731.502029106285,
          "y": 885.7720420057931,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3712A",
        "layer": "A-Wall",
        "start": {
          "x": 8551.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        },
        "end": {
          "x": 8581.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3712B",
        "layer": "A-Wall",
        "start": {
          "x": 8701.502029106285,
          "y": 885.7788511355786,
          "z": 0.0
        },
        "end": {
          "x": 8731.502029106285,
          "y": 885.7720420057927,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3712C",
        "layer": "A-Wall",
        "start": {
          "x": 8710.565864686607,
          "y": 881.278855208362,
          "z": 0.0
        },
        "end": {
          "x": 8722.502029106285,
          "y": 881.2720420057927,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3712D",
        "layer": "A-Wall",
        "start": {
          "x": 8581.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        },
        "end": {
          "x": 8701.484085036613,
          "y": 885.7788552083739,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3712E",
        "layer": "A-ROOF",
        "start": {
          "x": 8533.502029106281,
          "y": 108.7311872356195,
          "z": 0.0
        },
        "end": {
          "x": 8707.50202910628,
          "y": 108.7311872356192,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37136",
        "layer": "A-ROOF",
        "start": {
          "x": 8620.50202910628,
          "y": 108.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8620.50202910628,
          "y": 132.731187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37191",
        "layer": "A-Wall",
        "start": {
          "x": 8335.500326824149,
          "y": 168.7379963641819,
          "z": 0.0
        },
        "end": {
          "x": 8326.50032682415,
          "y": 168.7379963641819,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37192",
        "layer": "A-Wall",
        "start": {
          "x": 8326.50032682415,
          "y": 168.7379963641819,
          "z": 0.0
        },
        "end": {
          "x": 8326.50032682415,
          "y": 186.7379963641786,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37193",
        "layer": "A-Wall",
        "start": {
          "x": 8335.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8326.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37194",
        "layer": "A-Wall",
        "start": {
          "x": 8326.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8326.500326824149,
          "y": 348.77885113556,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37197",
        "layer": "A-Glaz",
        "start": {
          "x": 8578.53394099987,
          "y": 132.7311872356199,
          "z": 0.0
        },
        "end": {
          "x": 8578.533940999869,
          "y": 137.2311872356199,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37198",
        "layer": "A-Glaz",
        "start": {
          "x": 8596.16394099986,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8596.16394099986,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37199",
        "layer": "A-Glaz",
        "start": {
          "x": 8611.50202910628,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8611.50202910628,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719A",
        "layer": "A-Glaz",
        "start": {
          "x": 8629.502029106268,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8629.502029106268,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719B",
        "layer": "A-Glaz",
        "start": {
          "x": 8644.470117212684,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8644.470117212684,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719C",
        "layer": "A-Glaz",
        "start": {
          "x": 8662.470117212675,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8662.470117212673,
          "y": 137.231187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719D",
        "layer": "A-Glaz",
        "start": {
          "x": 8575.53394099987,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8599.163940999859,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719E",
        "layer": "A-Glaz",
        "start": {
          "x": 8575.53394099987,
          "y": 128.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8599.163940999859,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3719F",
        "layer": "A-Glaz",
        "start": {
          "x": 8599.163940999859,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8599.163940999859,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A0",
        "layer": "A-Glaz",
        "start": {
          "x": 8575.53394099987,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8575.53394099987,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A1",
        "layer": "A-Glaz",
        "start": {
          "x": 8597.16394099986,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8597.16394099986,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A2",
        "layer": "A-Glaz",
        "start": {
          "x": 8598.16394099986,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8598.16394099986,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A3",
        "layer": "A-Glaz",
        "start": {
          "x": 8577.533940999869,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8577.533940999869,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A4",
        "layer": "A-Glaz",
        "start": {
          "x": 8576.533940999869,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8576.533940999869,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A5",
        "layer": "A-Glaz",
        "start": {
          "x": 8608.502029106276,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8632.502029106265,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A6",
        "layer": "A-Glaz",
        "start": {
          "x": 8608.502029106276,
          "y": 128.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8632.502029106265,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A7",
        "layer": "A-Glaz",
        "start": {
          "x": 8632.502029106265,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8632.502029106265,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A8",
        "layer": "A-Glaz",
        "start": {
          "x": 8608.502029106276,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8608.502029106276,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371A9",
        "layer": "A-Glaz",
        "start": {
          "x": 8630.502029106266,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8630.502029106266,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AA",
        "layer": "A-Glaz",
        "start": {
          "x": 8631.502029106266,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8631.502029106266,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AB",
        "layer": "A-Glaz",
        "start": {
          "x": 8610.502029106274,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8610.502029106274,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AC",
        "layer": "A-Glaz",
        "start": {
          "x": 8609.502029106274,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8609.502029106274,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AD",
        "layer": "A-Glaz",
        "start": {
          "x": 8641.470117212686,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8665.470117212675,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AE",
        "layer": "A-Glaz",
        "start": {
          "x": 8641.470117212686,
          "y": 128.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8665.470117212675,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371AF",
        "layer": "A-Glaz",
        "start": {
          "x": 8665.470117212675,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8665.470117212675,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B0",
        "layer": "A-Glaz",
        "start": {
          "x": 8641.470117212686,
          "y": 129.7311872356194,
          "z": 0.0
        },
        "end": {
          "x": 8641.470117212686,
          "y": 128.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B1",
        "layer": "A-Glaz",
        "start": {
          "x": 8663.470117212677,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8663.470117212677,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B2",
        "layer": "A-Glaz",
        "start": {
          "x": 8664.470117212677,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8664.470117212677,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B3",
        "layer": "A-Glaz",
        "start": {
          "x": 8643.470117212684,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8643.470117212684,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B4",
        "layer": "A-Glaz",
        "start": {
          "x": 8642.470117212684,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8642.470117212684,
          "y": 129.7311872356194,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B5",
        "layer": "A-Glaz",
        "start": {
          "x": 8578.533940999872,
          "y": 132.7311872356199,
          "z": 0.0
        },
        "end": {
          "x": 8596.16394099986,
          "y": 132.7311872356199,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B6",
        "layer": "A-Glaz",
        "start": {
          "x": 8611.502029106281,
          "y": 132.7311872356199,
          "z": 0.0
        },
        "end": {
          "x": 8629.50202910627,
          "y": 132.7311872356199,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B7",
        "layer": "A-Glaz",
        "start": {
          "x": 8644.470117212686,
          "y": 132.731187235619,
          "z": 0.0
        },
        "end": {
          "x": 8662.470117212675,
          "y": 132.731187235619,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B8",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874161,
          "y": 648.7788511355709,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874161,
          "y": 648.7788511355709,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371B9",
        "layer": "A-Wall",
        "start": {
          "x": 8446.476494874163,
          "y": 498.778851135571,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874163,
          "y": 498.778851135571,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371BA",
        "layer": "A-ROOF",
        "start": {
          "x": 8533.502029106281,
          "y": 144.7311872356193,
          "z": 0.0
        },
        "end": {
          "x": 8557.502029106281,
          "y": 168.7379963641824,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371BB",
        "layer": "A-ROOF",
        "start": {
          "x": 8224.502029106283,
          "y": 267.7584237498764,
          "z": 0.0
        },
        "end": {
          "x": 8326.50032682415,
          "y": 267.758423749873,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371C0",
        "layer": "A-ROOF",
        "start": {
          "x": 9073.559339271675,
          "y": 663.7788511346149,
          "z": 0.0
        },
        "end": {
          "x": 9073.55933927167,
          "y": 450.7788511346148,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371C1",
        "layer": "A-ROOF",
        "start": {
          "x": 8986.50202910624,
          "y": 450.7788511346152,
          "z": 0.0
        },
        "end": {
          "x": 9073.55933927167,
          "y": 450.7788511346148,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371C2",
        "layer": "A-ROOF",
        "start": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 9073.55933927167,
          "y": 450.7788511346148,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371D1",
        "layer": "A-Flor",
        "start": {
          "x": 8458.476494874163,
          "y": 474.7788511355713,
          "z": 0.0
        },
        "end": {
          "x": 8527.4952199777,
          "y": 474.7788511355682,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371D2",
        "layer": "A-Flor",
        "start": {
          "x": 8437.476494874163,
          "y": 498.778851135571,
          "z": 0.0
        },
        "end": {
          "x": 8437.476494874161,
          "y": 648.7788511355709,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371D3",
        "layer": "A-Wall",
        "start": {
          "x": 8695.506568525321,
          "y": 266.2601260320174,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 266.2601260320174,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371D4",
        "layer": "A-Wall",
        "start": {
          "x": 8695.506568525321,
          "y": 257.2601260320166,
          "z": 0.0
        },
        "end": {
          "x": 8683.50202910628,
          "y": 257.2601260320166,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371DF",
        "layer": "A-Anno-Text",
        "start": {
          "x": 8869.98530478978,
          "y": 447.842794253019,
          "z": 0.0
        },
        "end": {
          "x": 8818.502029106283,
          "y": 447.842794253019,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371E5",
        "layer": "A-Wall",
        "start": {
          "x": 8581.502029106272,
          "y": 483.7788511355693,
          "z": 0.0
        },
        "end": {
          "x": 8566.5037313884,
          "y": 483.7788511355693,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371E6",
        "layer": "A-Anno-Iden",
        "start": {
          "x": 8977.502029106305,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "end": {
          "x": 8929.502029106276,
          "y": 474.7788511355696,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "371E7",
        "layer": "A-Anno-Iden",
        "start": {
          "x": 8929.502029106283,
          "y": 366.7788511355703,
          "z": 0.0
        },
        "end": {
          "x": 8977.502029106296,
          "y": 474.7788511355701,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37201",
        "layer": "A-Wall",
        "start": {
          "x": 8950.5037598479,
          "y": 804.7788511355685,
          "z": 0.0
        },
        "end": {
          "x": 8950.5037598479,
          "y": 801.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37203",
        "layer": "A-Glaz",
        "start": {
          "x": 8845.501177965218,
          "y": 801.7788511355765,
          "z": 0.0
        },
        "end": {
          "x": 8847.168222916805,
          "y": 801.7788511355717,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37204",
        "layer": "A-Glaz",
        "start": {
          "x": 8596.499475683066,
          "y": 195.7320383766868,
          "z": 0.0
        },
        "end": {
          "x": 8598.73321552325,
          "y": 195.7320383766868,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37205",
        "layer": "A-Glaz",
        "start": {
          "x": 8596.499475683062,
          "y": 192.7320383766868,
          "z": 0.0
        },
        "end": {
          "x": 8598.73321552325,
          "y": 192.7320383766868,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37206",
        "layer": "A-Glaz",
        "start": {
          "x": 8622.73321552325,
          "y": 192.7320383766868,
          "z": 0.0
        },
        "end": {
          "x": 8623.500326824134,
          "y": 192.7320383766869,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37207",
        "layer": "A-Glaz",
        "start": {
          "x": 8622.73321552325,
          "y": 195.7320383766868,
          "z": 0.0
        },
        "end": {
          "x": 8623.500326824134,
          "y": 195.7320383766862,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3720F",
        "layer": "A-ROOF",
        "start": {
          "x": 9073.538437173018,
          "y": 366.7856602632932,
          "z": 0.0
        },
        "end": {
          "x": 9073.538437173018,
          "y": 87.72948495347276,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37210",
        "layer": "A-ROOF",
        "start": {
          "x": 8776.510540516963,
          "y": 257.2601260320171,
          "z": 0.0
        },
        "end": {
          "x": 8776.510540516963,
          "y": 87.72948495347279,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37219",
        "layer": "A-Wall",
        "start": {
          "x": 8986.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        },
        "end": {
          "x": 8851.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37226",
        "layer": "A-Wall",
        "start": {
          "x": 8809.502029106296,
          "y": 672.7788511355673,
          "z": 0.0
        },
        "end": {
          "x": 8809.502029106296,
          "y": 663.7788511355689,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "37227",
        "layer": "A-Wall",
        "start": {
          "x": 8779.502029106296,
          "y": 672.7788511355676,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 663.7788511355687,
          "z": 0.0
        }
      },
      {
        "entity_type": "LINE",
        "handle": "3722E",
        "layer": "A-Wall",
        "start": {
          "x": 8779.502029106296,
          "y": 483.7788511355638,
          "z": 0.0
        },
        "end": {
          "x": 8779.502029106296,
          "y": 474.7788511355685,
          "z": 0.0
        }
      }
    ],
    "LWPOLYLINE": [
      {
        "entity_type": "LWPOLYLINE",
        "handle": "36EDA",
        "layer": "A-Furn",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8637.371949572189,
            "y": 529.8966190534942,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8664.378961762253,
            "y": 529.8966190534942,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8664.378961762253,
            "y": 554.3281180937068,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8637.371949572189,
            "y": 554.3281180937068,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "36EF0",
        "layer": "A-Furn",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8601.639359075489,
            "y": 487.9256609074749,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8571.905337427175,
            "y": 487.9256609074749,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8571.905337427175,
            "y": 516.8174614870317,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8601.639359075489,
            "y": 516.8174614870317,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "36F93",
        "layer": "A-Furn",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8549.282458764777,
            "y": 845.2673342125166,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8549.282458764777,
            "y": 815.2673342125166,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8519.282458764777,
            "y": 815.2673342125166,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8519.282458764777,
            "y": 845.2673342125166,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3700B",
        "layer": "A-Anno-Text",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8869.98530478978,
            "y": 447.842794253019,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8857.502029106281,
            "y": 447.842794253019,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3701A",
        "layer": "A-Anno-Text",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8876.252029106283,
            "y": 393.7942433660909,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8863.768753422784,
            "y": 393.7942433660909,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37082",
        "layer": "A-Furn",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8637.371949572189,
            "y": 617.7110945661956,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8664.378961762253,
            "y": 617.7110945661956,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8664.378961762253,
            "y": 593.2795955259829,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8637.371949572189,
            "y": 593.2795955259829,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37095",
        "layer": "A-Furn",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8601.639359075489,
            "y": 659.6820527122148,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8571.905337427175,
            "y": 659.6820527122148,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8571.905337427175,
            "y": 630.7902521326581,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8601.639359075489,
            "y": 630.7902521326581,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37211",
        "layer": "A-ROOF",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8776.510540516963,
            "y": 87.72948495347279,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 9073.538437173018,
            "y": 87.72948495347276,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37212",
        "layer": "A-ROOF",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 9073.538437173018,
            "y": 366.7856602632933,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8986.502029106261,
            "y": 366.7856602632537,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37213",
        "layer": "A-ROOF",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8925.02448884499,
            "y": 87.72948495347278,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8925.02448884499,
            "y": 348.7788511339054,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37214",
        "layer": "A-ROOF",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 9073.559339271675,
            "y": 663.7788511346149,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 9049.559339271706,
            "y": 663.7788511346196,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37215",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8950.5037598479,
            "y": 861.7788511355667,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8950.5037598479,
            "y": 852.7788511355685,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3721A",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8851.502029106281,
            "y": 348.7788511339054,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8851.502029106281,
            "y": 357.7788511355687,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37222",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8809.502029106296,
            "y": 723.7901996831584,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8812.502029106308,
            "y": 723.7901996831566,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37223",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8779.502029106296,
            "y": 723.7901996831673,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8779.502029106296,
            "y": 728.2901996831675,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37224",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8809.502029106296,
            "y": 723.7901996831673,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8809.502029106296,
            "y": 728.2901996831657,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37229",
        "layer": "A-Hand rail",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8776.502029106283,
            "y": 417.7980914236722,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8776.502029106283,
            "y": 423.7980914236722,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3722A",
        "layer": "A-Hand rail",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8778.002029106283,
            "y": 419.2980914236722,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8778.002029106283,
            "y": 422.2980914236722,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3722B",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8566.502029106286,
            "y": 318.7788511355703,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8557.502029106283,
            "y": 318.7788511355703,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3722C",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8566.502029106292,
            "y": 354.7788511355703,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8557.502029106285,
            "y": 354.7788511355703,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3722F",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8779.502029106296,
            "y": 483.7788511355638,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8776.50202910629,
            "y": 483.7788511355639,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "37238",
        "layer": "A-Wall",
        "closed": true,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8950.5037598479,
            "y": 753.7788511355687,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8950.5037598479,
            "y": 720.7788511373836,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8941.503759847901,
            "y": 720.7788511373836,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8941.503759847901,
            "y": 753.7788511355687,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3723A",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 2,
        "vertices": [
          {
            "x": 8457.208784401293,
            "y": -82.4314628192538,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8706.070381813384,
            "y": -82.4314628192538,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      },
      {
        "entity_type": "LWPOLYLINE",
        "handle": "3723F",
        "layer": "A-Wall",
        "closed": false,
        "vertex_count": 4,
        "vertices": [
          {
            "x": 8800.561608981223,
            "y": 257.260126032017,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 8800.561608981223,
            "y": 111.7226758237031,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 9049.532195471855,
            "y": 111.7226758237031,
            "z": 0.0,
            "bulge": 0.0
          },
          {
            "x": 9049.532195471857,
            "y": 366.7720420057973,
            "z": 0.0,
            "bulge": 0.0
          }
        ]
      }
    ],
    "CIRCLE": [
      {
        "entity_type": "CIRCLE",
        "handle": "36F25",
        "layer": "A-Furn",
        "center": {
          "x": 8429.184245291111,
          "y": 227.473212752273,
          "z": 0.0
        },
        "radius": 11.1975000384773,
        "thickness": 0.0,
        "extrusion": [
          0.0,
          0.0,
          1.0
        ]
      },
      {
        "entity_type": "CIRCLE",
        "handle": "37007",
        "layer": "A-Anno-Text",
        "center": {
          "x": 8818.502029106283,
          "y": 447.7980914238613,
          "z": 0.0
        },
        "radius": 2.500567427380393,
        "thickness": 0.0,
        "extrusion": [
          0.0,
          0.0,
          1.0
        ]
      },
      {
        "entity_type": "CIRCLE",
        "handle": "37016",
        "layer": "A-Anno-Text",
        "center": {
          "x": 8776.502029106285,
          "y": 393.7980914238606,
          "z": 0.0
        },
        "radius": 2.500567427380393,
        "thickness": 0.0,
        "extrusion": [
          0.0,
          0.0,
          1.0
        ]
      }
    ],
    "TEXT": [
      {
        "entity_type": "TEXT",
        "handle": "37006",
        "layer": "A-Anno-Text",
        "text": "UP",
        "position": {
          "x": 8804.33189437637,
          "y": 443.9750301640974,
          "z": 0.0
        },
        "height": 5.001134854760786,
        "rotation": 0.0,
        "width": 1.0
      },
      {
        "entity_type": "TEXT",
        "handle": "37014",
        "layer": "A-Anno-Text",
        "text": "DN",
        "position": {
          "x": 8763.950969015772,
          "y": 392.6200178288637,
          "z": 0.0
        },
        "height": 5.001134854760786,
        "rotation": 0.0,
        "width": 1.0
      }
    ],
    "LEADER": [
      {
        "entity_type": "LEADER",
        "handle": "371DD",
        "layer": "A-Anno-Text",
        "style": "",
        "arrow_head": true,
        "vertices": [
          [
            8260.261792895471,
            337.0671215546658,
            0.0
          ],
          [
            8260.261792895471,
            297.1369178770742,
            0.0
          ]
        ]
      },
      {
        "entity_type": "LEADER",
        "handle": "371DE",
        "layer": "A-Anno-Text",
        "style": "",
        "arrow_head": true,
        "vertices": [
          [
            8260.261792895471,
            198.408871173645,
            0.0
          ],
          [
            8260.261792895471,
            238.3390748512366,
            0.0
          ]
        ]
      }
    ],
    "DIMENSION": [
      {
        "entity_type": "DIMENSION",
        "handle": "37240",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8557.502029106281,
          "y": 56.93677978833551,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8326.50032682415,
          "y": 168.7379963641819,
          "z": 0.0
        },
        "def_point3": {
          "x": 8557.502029106281,
          "y": 132.7311872356193,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37241",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8683.50202910628,
          "y": 56.93677978833551,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8557.502029106281,
          "y": 132.7311872356193,
          "z": 0.0
        },
        "def_point3": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37242",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8809.506568525321,
          "y": 56.93677978833551,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        },
        "def_point3": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37243",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8986.502029106281,
          "y": 56.93677978833551,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        },
        "def_point3": {
          "x": 8986.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37244",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9049.55933927167,
          "y": 56.93677978833551,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8986.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        },
        "def_point3": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37245",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9049.55933927167,
          "y": 29.2266319983068,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8326.500326824153,
          "y": 168.7379963641832,
          "z": 0.0
        },
        "def_point3": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3724B",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8437.476494874161,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8326.500326824153,
          "y": 366.7788511355714,
          "z": 0.0
        },
        "def_point3": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3724C",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8506.502029106285,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "def_point3": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3724D",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8551.502029106285,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "def_point3": {
          "x": 8551.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3724E",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8731.502029106285,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8551.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        },
        "def_point3": {
          "x": 8731.502029106285,
          "y": 885.7788511355517,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3724F",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8950.5037598479,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8731.502029106285,
          "y": 885.7788511355517,
          "z": 0.0
        },
        "def_point3": {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37250",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9049.559339271707,
          "y": 968.0178894266468,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0
        },
        "def_point3": {
          "x": 9049.559339271707,
          "y": 672.7788511381698,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37254",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 132.7311872356196,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8800.561608981223,
          "y": 111.7226758237031,
          "z": 0.0
        },
        "def_point3": {
          "x": 8557.502029106281,
          "y": 132.7311872356195,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37255",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 168.7379963641832,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8557.502029106281,
          "y": 132.7311872356195,
          "z": 0.0
        },
        "def_point3": {
          "x": 8326.500326824153,
          "y": 168.7379963641832,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37256",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 366.7788511355707,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8326.500326824153,
          "y": 168.7379963641832,
          "z": 0.0
        },
        "def_point3": {
          "x": 8326.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37257",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 474.7788511355694,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8326.500326824149,
          "y": 366.7788511355706,
          "z": 0.0
        },
        "def_point3": {
          "x": 8437.476494874163,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37258",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8437.476494874163,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point3": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37259",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 861.7788511355681,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8437.476494874161,
          "y": 672.7788511355694,
          "z": 0.0
        },
        "def_point3": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725A",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 8173.027735973157,
          "y": 885.7788511355654,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8506.502029106285,
          "y": 861.778851135568,
          "z": 0.0
        },
        "def_point3": {
          "x": 8551.502029106285,
          "y": 885.7788511355653,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725B",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 257.2601260320169,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        },
        "def_point3": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725C",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 348.7788511339053,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8809.506568525321,
          "y": 257.260126032017,
          "z": 0.0
        },
        "def_point3": {
          "x": 8986.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725D",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8986.502029106281,
          "y": 348.7788511339054,
          "z": 0.0
        },
        "def_point3": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725E",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 672.7788511381698,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 9049.55933927167,
          "y": 474.7788511355693,
          "z": 0.0
        },
        "def_point3": {
          "x": 9049.559339271707,
          "y": 672.7788511381698,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "3725F",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 861.7788511355666,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 9049.559339271707,
          "y": 672.7788511381698,
          "z": 0.0
        },
        "def_point3": {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37260",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9228.697677267688,
          "y": 885.7788511355516,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0
        },
        "def_point3": {
          "x": 8731.502029106285,
          "y": 885.7788511355517,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      },
      {
        "entity_type": "DIMENSION",
        "handle": "37261",
        "layer": "A-Anno-Dims",
        "dim_type": 32,
        "def_point": {
          "x": 9258.06970838667,
          "y": 885.7720420057926,
          "z": 0.0
        },
        "text": "",
        "dim_style": "Standard 360",
        "text_mid_point": null,
        "insertion_point": null,
        "def_point2": {
          "x": 8683.50202910628,
          "y": 132.7311872356192,
          "z": 0.0
        },
        "def_point3": {
          "x": 8731.502029106285,
          "y": 885.7720420057927,
          "z": 0.0
        },
        "def_point4": {
          "x": 0.0,
          "y": 0.0,
          "z": 0.0
        }
      }
    ]
  },
  "unhandled_types": [],
  "lines": [
    {
      "entity_type": "LINE",
      "handle": "36D37",
      "layer": "A-ROOF",
      "start": {
        "x": 8707.50202910628,
        "y": 233.2499123391699,
        "z": 0.0
      },
      "end": {
        "x": 8776.510540516963,
        "y": 233.24991233917,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D3A",
      "layer": "A-Wall",
      "start": {
        "x": 8527.49521997771,
        "y": 483.7788511355667,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106265,
        "y": 483.7788511355694,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D3B",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106292,
        "y": 357.7788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106292,
        "y": 354.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D3C",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106286,
        "y": 318.7788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106286,
        "y": 315.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D3D",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106286,
        "y": 311.2788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106283,
        "y": 282.7538843308326,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D3F",
      "layer": "A-Wall",
      "start": {
        "x": 8566.5037313884,
        "y": 483.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8566.5037313884,
        "y": 519.7788511355673,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D40",
      "layer": "A-Wall",
      "start": {
        "x": 8674.500326824143,
        "y": 311.2788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106286,
        "y": 311.2788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D42",
      "layer": "A-Wall",
      "start": {
        "x": 8557.50202910626,
        "y": 519.7788511355673,
        "z": 0.0
      },
      "end": {
        "x": 8566.5037313884,
        "y": 519.7788511355673,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D43",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.001461678881,
        "y": 514.0445331276004,
        "z": 0.0
      },
      "end": {
        "x": 8555.001461678881,
        "y": 516.5451005549808,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D44",
      "layer": "A-Wall",
      "start": {
        "x": 8752.498624541995,
        "y": 663.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8752.498624542,
        "y": 672.7788511355678,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D45",
      "layer": "A-Wall",
      "start": {
        "x": 8800.506568525323,
        "y": 357.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8800.506568525325,
        "y": 266.2601260320174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D46",
      "layer": "A-Wall",
      "start": {
        "x": 8767.5020291063,
        "y": 852.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8767.502029106285,
        "y": 723.7901996831782,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D47",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106281,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106286,
        "y": 141.7311872356195,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D48",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106294,
        "y": 852.7788511355683,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106283,
        "y": 728.2901996831679,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D49",
      "layer": "A-Wall",
      "start": {
        "x": 8767.502029106277,
        "y": 663.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8767.502029106303,
        "y": 474.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D4A",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106276,
        "y": 663.7788511355686,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106292,
        "y": 567.778851135569,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D4B",
      "layer": "A-Wall",
      "start": {
        "x": 8896.502029106277,
        "y": 663.7788511355676,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106283,
        "y": 630.7609771730866,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D4D",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247333,
        "y": 663.7788511355676,
        "z": 0.0
      },
      "end": {
        "x": 8901.002880247343,
        "y": 630.7609771730866,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D4E",
      "layer": "A-Wall",
      "start": {
        "x": 8817.002029106312,
        "y": 728.2901996831653,
        "z": 0.0
      },
      "end": {
        "x": 8817.00202910628,
        "y": 672.7788511355681,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D4F",
      "layer": "A-Wall",
      "start": {
        "x": 8812.502029106308,
        "y": 723.7901996831566,
        "z": 0.0
      },
      "end": {
        "x": 8812.50202910628,
        "y": 672.7788511355674,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D50",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106294,
        "y": 563.2779999944984,
        "z": 0.0
      },
      "end": {
        "x": 8776.50202910629,
        "y": 483.7788511355639,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D51",
      "layer": "A-Wall",
      "start": {
        "x": 8815.502029106294,
        "y": 483.7788511355637,
        "z": 0.0
      },
      "end": {
        "x": 8815.502029106294,
        "y": 474.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D53",
      "layer": "A-Wall",
      "start": {
        "x": 8809.506568525325,
        "y": 357.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D54",
      "layer": "A-Wall",
      "start": {
        "x": 8683.502029106276,
        "y": 483.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8683.502029106276,
        "y": 450.7862276916956,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D55",
      "layer": "A-Wall",
      "start": {
        "x": 8674.502029106276,
        "y": 474.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 8674.502029106276,
        "y": 450.7862276916956,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D56",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106294,
        "y": 852.7788511355683,
        "z": 0.0
      },
      "end": {
        "x": 8800.508305861067,
        "y": 852.778851135566,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D57",
      "layer": "A-Wall",
      "start": {
        "x": 8824.512845280115,
        "y": 852.7788511355665,
        "z": 0.0
      },
      "end": {
        "x": 8932.502029106283,
        "y": 852.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D58",
      "layer": "A-Wall",
      "start": {
        "x": 8683.502029106314,
        "y": 390.771474579439,
        "z": 0.0
      },
      "end": {
        "x": 8683.502029106281,
        "y": 357.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D59",
      "layer": "A-Wall",
      "start": {
        "x": 8674.502029106314,
        "y": 390.771474579448,
        "z": 0.0
      },
      "end": {
        "x": 8674.50202910629,
        "y": 366.7788511355707,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5A",
      "layer": "A-Wall",
      "start": {
        "x": 8817.00202910628,
        "y": 672.7788511355681,
        "z": 0.0
      },
      "end": {
        "x": 9049.559339271707,
        "y": 672.7788511381698,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5B",
      "layer": "A-Wall",
      "start": {
        "x": 8674.500326824143,
        "y": 311.2788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8674.500326824127,
        "y": 228.7320383766852,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5C",
      "layer": "A-Wall",
      "start": {
        "x": 8515.502029106272,
        "y": 714.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8515.50202910627,
        "y": 672.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5D",
      "layer": "A-Wall",
      "start": {
        "x": 8506.50202910629,
        "y": 714.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106283,
        "y": 663.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5E",
      "layer": "A-Wall",
      "start": {
        "x": 8515.502029106285,
        "y": 852.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8515.502029106281,
        "y": 810.7788511355698,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D5F",
      "layer": "A-Wall",
      "start": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106281,
        "y": 810.7788511355698,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D60",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106285,
        "y": 357.7788511355702,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106285,
        "y": 354.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D61",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106283,
        "y": 318.7788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 282.7538843308326,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D62",
      "layer": "A-Wall",
      "start": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "end": {
        "x": 8551.502029106286,
        "y": 861.778851135568,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D63",
      "layer": "A-Wall",
      "start": {
        "x": 8560.493233981866,
        "y": 861.778851135568,
        "z": 0.0
      },
      "end": {
        "x": 8572.563193525966,
        "y": 861.7788511355682,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D64",
      "layer": "A-Wall",
      "start": {
        "x": 8710.565864686607,
        "y": 861.7788552083617,
        "z": 0.0
      },
      "end": {
        "x": 8722.502029106285,
        "y": 861.7720420057924,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D65",
      "layer": "A-Wall",
      "start": {
        "x": 8731.502029106281,
        "y": 861.7720420057921,
        "z": 0.0
      },
      "end": {
        "x": 8800.490361791399,
        "y": 861.7788511355651,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D66",
      "layer": "A-Wall",
      "start": {
        "x": 8824.512845280115,
        "y": 861.7788511355656,
        "z": 0.0
      },
      "end": {
        "x": 8950.5037598479,
        "y": 861.7788511355667,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D67",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 177.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D69",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 168.7379963641824,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 132.7311872356195,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6A",
      "layer": "A-ROOF",
      "start": {
        "x": 8533.502029106281,
        "y": 144.7311872356193,
        "z": 0.0
      },
      "end": {
        "x": 8533.502029106281,
        "y": 108.7311872356195,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6B",
      "layer": "A-Wall",
      "start": {
        "x": 8686.50202910629,
        "y": 852.7788511355669,
        "z": 0.0
      },
      "end": {
        "x": 8767.5020291063,
        "y": 852.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6C",
      "layer": "A-Wall",
      "start": {
        "x": 8686.50202910629,
        "y": 861.7788511355669,
        "z": 0.0
      },
      "end": {
        "x": 8701.502029106285,
        "y": 861.7788552083625,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6D",
      "layer": "A-Wall",
      "start": {
        "x": 8515.502029106285,
        "y": 852.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8596.50202910629,
        "y": 852.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6E",
      "layer": "A-Wall",
      "start": {
        "x": 8581.502029106285,
        "y": 861.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8596.50202910629,
        "y": 861.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D6F",
      "layer": "A-Wall",
      "start": {
        "x": 8419.50486624318,
        "y": 357.7788511355691,
        "z": 0.0
      },
      "end": {
        "x": 8497.497489687225,
        "y": 357.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D70",
      "layer": "A-Wall",
      "start": {
        "x": 8533.502029106265,
        "y": 357.7788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106285,
        "y": 357.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D71",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106294,
        "y": 357.7788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8581.50202910627,
        "y": 357.7788511355704,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D72",
      "layer": "A-Wall",
      "start": {
        "x": 8515.50202910627,
        "y": 672.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8566.503731388404,
        "y": 672.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D73",
      "layer": "A-Wall",
      "start": {
        "x": 8350.500326824153,
        "y": 168.7379963641824,
        "z": 0.0
      },
      "end": {
        "x": 8383.500326824149,
        "y": 168.7379963641816,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D74",
      "layer": "A-Wall",
      "start": {
        "x": 8419.50486624319,
        "y": 168.7379963641808,
        "z": 0.0
      },
      "end": {
        "x": 8497.497489687234,
        "y": 168.7379963641767,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D75",
      "layer": "A-Wall",
      "start": {
        "x": 8533.502029106276,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8581.502029106281,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D78",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247333,
        "y": 663.7788511355676,
        "z": 0.0
      },
      "end": {
        "x": 9040.559339271747,
        "y": 663.7788511381631,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D79",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247352,
        "y": 483.7788511355617,
        "z": 0.0
      },
      "end": {
        "x": 9040.559339271727,
        "y": 483.7788511355695,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D7B",
      "layer": "A-Wall",
      "start": {
        "x": 8815.502029106296,
        "y": 483.7788511355637,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106283,
        "y": 483.7788511355619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D7C",
      "layer": "A-Wall",
      "start": {
        "x": 8659.502029106276,
        "y": 483.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8683.502029106274,
        "y": 483.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D7D",
      "layer": "A-Wall",
      "start": {
        "x": 8506.502029106283,
        "y": 663.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106254,
        "y": 663.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D7E",
      "layer": "A-Wall",
      "start": {
        "x": 8815.502029106294,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8977.502029106296,
        "y": 474.7788511355701,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D80",
      "layer": "A-Wall",
      "start": {
        "x": 8986.502029106276,
        "y": 474.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D81",
      "layer": "A-Wall",
      "start": {
        "x": 8767.502029106303,
        "y": 474.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 474.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D82",
      "layer": "A-Wall",
      "start": {
        "x": 8659.502029106276,
        "y": 474.7788511355692,
        "z": 0.0
      },
      "end": {
        "x": 8674.502029106276,
        "y": 474.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D83",
      "layer": "A-Wall",
      "start": {
        "x": 8527.49521997771,
        "y": 474.7788511355666,
        "z": 0.0
      },
      "end": {
        "x": 8581.502029106281,
        "y": 474.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D84",
      "layer": "A-Wall",
      "start": {
        "x": 8335.502029106283,
        "y": 357.7788511355702,
        "z": 0.0
      },
      "end": {
        "x": 8383.50032682414,
        "y": 357.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D85",
      "layer": "A-Wall",
      "start": {
        "x": 8350.50032682415,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8383.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D86",
      "layer": "A-Wall",
      "start": {
        "x": 8659.502029106281,
        "y": 366.7788511355705,
        "z": 0.0
      },
      "end": {
        "x": 8674.50202910629,
        "y": 366.7788511355707,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D87",
      "layer": "A-Wall",
      "start": {
        "x": 8800.506568525325,
        "y": 366.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8977.502029106305,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D88",
      "layer": "A-Wall",
      "start": {
        "x": 8659.502029106272,
        "y": 357.7788511355702,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 357.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D89",
      "layer": "A-Wall",
      "start": {
        "x": 8335.502029106294,
        "y": 177.7379963641828,
        "z": 0.0
      },
      "end": {
        "x": 8383.500326824149,
        "y": 177.737996364182,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8A",
      "layer": "A-Wall",
      "start": {
        "x": 8419.504866243191,
        "y": 177.737996364181,
        "z": 0.0
      },
      "end": {
        "x": 8497.44301665872,
        "y": 177.7379963641768,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8B",
      "layer": "A-Wall",
      "start": {
        "x": 8533.502029106274,
        "y": 168.7379963641819,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 168.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8C",
      "layer": "A-Wall",
      "start": {
        "x": 8533.502029106276,
        "y": 177.7379963641819,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 177.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8D",
      "layer": "A-Wall",
      "start": {
        "x": 8755.506568525321,
        "y": 266.2601260320175,
        "z": 0.0
      },
      "end": {
        "x": 8800.506568525325,
        "y": 266.2601260320174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8E",
      "layer": "A-Wall",
      "start": {
        "x": 8755.506568525321,
        "y": 257.2601260320171,
        "z": 0.0
      },
      "end": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D8F",
      "layer": "A-Wall",
      "start": {
        "x": 8710.498624541993,
        "y": 663.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 8710.498624541999,
        "y": 672.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D91",
      "layer": "A-Wall",
      "start": {
        "x": 8335.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8350.50032682415,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D92",
      "layer": "A-ROOF",
      "start": {
        "x": 8224.502029106283,
        "y": 390.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8674.502029106316,
        "y": 390.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D94",
      "layer": "A-ROOF",
      "start": {
        "x": 8224.502029106285,
        "y": 144.7379963641824,
        "z": 0.0
      },
      "end": {
        "x": 8224.502029106283,
        "y": 390.7788511355705,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D95",
      "layer": "A-Wall",
      "start": {
        "x": 8350.500326824153,
        "y": 168.7379963641824,
        "z": 0.0
      },
      "end": {
        "x": 8335.500326824149,
        "y": 168.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D96",
      "layer": "A-ROOF",
      "start": {
        "x": 8533.502029106276,
        "y": 144.7379963641824,
        "z": 0.0
      },
      "end": {
        "x": 8224.502029106285,
        "y": 144.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D97",
      "layer": "A-Wall",
      "start": {
        "x": 8683.502029106281,
        "y": 315.7788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106286,
        "y": 315.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D99",
      "layer": "A-Wall",
      "start": {
        "x": 9049.559339271707,
        "y": 672.7788511381698,
        "z": 0.0
      },
      "end": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9A",
      "layer": "A-Wall",
      "start": {
        "x": 8710.498624541999,
        "y": 672.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8566.503731388404,
        "y": 672.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9B",
      "layer": "A-Wall",
      "start": {
        "x": 8710.498624541993,
        "y": 663.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 8566.503731388399,
        "y": 663.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9C",
      "layer": "A-Wall",
      "start": {
        "x": 8701.502029106285,
        "y": 861.7788552083625,
        "z": 0.0
      },
      "end": {
        "x": 8701.502029106285,
        "y": 885.7788511355786,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9D",
      "layer": "A-Wall",
      "start": {
        "x": 8506.502029106292,
        "y": 714.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8515.502029106272,
        "y": 714.7788511355698,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9E",
      "layer": "A-Wall",
      "start": {
        "x": 8506.502029106281,
        "y": 810.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8515.502029106281,
        "y": 810.7788511355698,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36D9F",
      "layer": "A-Wall",
      "start": {
        "x": 8851.502029106281,
        "y": 357.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8809.506568525327,
        "y": 357.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA0",
      "layer": "A-Wall",
      "start": {
        "x": 8566.503731388415,
        "y": 627.7788511355709,
        "z": 0.0
      },
      "end": {
        "x": 8566.503731388395,
        "y": 663.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA2",
      "layer": "A-Wall",
      "start": {
        "x": 8557.50202910626,
        "y": 483.7788511355694,
        "z": 0.0
      },
      "end": {
        "x": 8557.50202910626,
        "y": 519.7788511355673,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA4",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106274,
        "y": 627.7788511355709,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106254,
        "y": 663.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA5",
      "layer": "A-Flor",
      "start": {
        "x": 8458.483304002726,
        "y": 510.7788511355671,
        "z": 0.0
      },
      "end": {
        "x": 8458.483304002735,
        "y": 636.7788511355689,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA6",
      "layer": "A-Wall",
      "start": {
        "x": 8335.502029106283,
        "y": 357.7788511355711,
        "z": 0.0
      },
      "end": {
        "x": 8335.502029106294,
        "y": 321.758423749881,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA7",
      "layer": "A-Wall",
      "start": {
        "x": 8326.500326824153,
        "y": 366.7788511355714,
        "z": 0.0
      },
      "end": {
        "x": 8326.500326824153,
        "y": 321.758423749881,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA8",
      "layer": "A-Wall",
      "start": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 146.2311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DA9",
      "layer": "A-ROOF",
      "start": {
        "x": 8707.50202910628,
        "y": 108.7311872356192,
        "z": 0.0
      },
      "end": {
        "x": 8707.50202910628,
        "y": 233.2499123391699,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAA",
      "layer": "A-Wall",
      "start": {
        "x": 8683.502029106281,
        "y": 164.2311872356192,
        "z": 0.0
      },
      "end": {
        "x": 8683.502029106286,
        "y": 195.7320383766852,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAB",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 132.7311872356195,
        "z": 0.0
      },
      "end": {
        "x": 8578.533940999872,
        "y": 132.7311872356199,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAC",
      "layer": "A-Wall",
      "start": {
        "x": 8596.16394099986,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8611.50202910628,
        "y": 132.7311872356189,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAD",
      "layer": "A-Wall",
      "start": {
        "x": 8629.502029106266,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8644.470117212684,
        "y": 132.731187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAE",
      "layer": "A-Wall",
      "start": {
        "x": 8662.470117212677,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DAF",
      "layer": "A-Glaz",
      "start": {
        "x": 8578.53394099987,
        "y": 137.2311872356199,
        "z": 0.0
      },
      "end": {
        "x": 8596.163940999859,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB0",
      "layer": "A-Glaz",
      "start": {
        "x": 8611.50202910628,
        "y": 137.231187235619,
        "z": 0.0
      },
      "end": {
        "x": 8629.502029106268,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB1",
      "layer": "A-Glaz",
      "start": {
        "x": 8644.470117212684,
        "y": 137.231187235619,
        "z": 0.0
      },
      "end": {
        "x": 8662.470117212673,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB2",
      "layer": "A-Wall",
      "start": {
        "x": 8683.502029106277,
        "y": 228.7320383766852,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 257.2601260320166,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB3",
      "layer": "A-Wall",
      "start": {
        "x": 8683.50202910628,
        "y": 266.2601260320174,
        "z": 0.0
      },
      "end": {
        "x": 8683.502029106281,
        "y": 315.7788511355701,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB4",
      "layer": "A-Wall",
      "start": {
        "x": 8326.50032682416,
        "y": 213.7584237498811,
        "z": 0.0
      },
      "end": {
        "x": 8326.500326824153,
        "y": 168.7379963641832,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB5",
      "layer": "A-Wall",
      "start": {
        "x": 8335.502029106301,
        "y": 213.7584237498811,
        "z": 0.0
      },
      "end": {
        "x": 8335.502029106294,
        "y": 177.7379963641832,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB6",
      "layer": "A-Wall",
      "start": {
        "x": 8674.500326824136,
        "y": 195.7320383766852,
        "z": 0.0
      },
      "end": {
        "x": 8674.500326824136,
        "y": 164.2311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB7",
      "layer": "A-Wall",
      "start": {
        "x": 8674.500326824143,
        "y": 146.2311872356119,
        "z": 0.0
      },
      "end": {
        "x": 8674.500326824142,
        "y": 141.7311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB8",
      "layer": "A-Wall",
      "start": {
        "x": 8566.502029106286,
        "y": 141.7311872356195,
        "z": 0.0
      },
      "end": {
        "x": 8674.500326824142,
        "y": 141.7311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DB9",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106281,
        "y": 246.7538843308326,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DBA",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 282.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106283,
        "y": 282.7538843308326,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DBC",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.001461678892,
        "y": 631.0285674218787,
        "z": 0.0
      },
      "end": {
        "x": 8555.001461678892,
        "y": 633.529134849259,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DBD",
      "layer": "A-Hand rail",
      "start": {
        "x": 8464.233587716417,
        "y": 516.5451005549808,
        "z": 0.0
      },
      "end": {
        "x": 8464.233587716428,
        "y": 631.0285674218787,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DBE",
      "layer": "A-Hand rail",
      "start": {
        "x": 8461.733020289037,
        "y": 514.0445331276004,
        "z": 0.0
      },
      "end": {
        "x": 8461.733020289048,
        "y": 633.529134849259,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC2",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.00146167889,
        "y": 631.0285674218787,
        "z": 0.0
      },
      "end": {
        "x": 8464.233587716428,
        "y": 631.0285674218787,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC3",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.00146167888,
        "y": 516.5451005549808,
        "z": 0.0
      },
      "end": {
        "x": 8464.233587716417,
        "y": 516.5451005549808,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC4",
      "layer": "A-Flor",
      "start": {
        "x": 8557.502029106272,
        "y": 636.7788511355689,
        "z": 0.0
      },
      "end": {
        "x": 8458.483304002735,
        "y": 636.7788511355689,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC5",
      "layer": "A-Flor",
      "start": {
        "x": 8557.502029106272,
        "y": 510.7788511355671,
        "z": 0.0
      },
      "end": {
        "x": 8458.483304002726,
        "y": 510.7788511355671,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC6",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.001461678892,
        "y": 633.529134849259,
        "z": 0.0
      },
      "end": {
        "x": 8461.733020289048,
        "y": 633.529134849259,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DC7",
      "layer": "A-Wall",
      "start": {
        "x": 8566.503731388415,
        "y": 627.7788511355709,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106274,
        "y": 627.7788511355709,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCA",
      "layer": "A-Wall",
      "start": {
        "x": 8752.498624541995,
        "y": 663.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8767.50202910628,
        "y": 663.7788511355689,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCB",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106276,
        "y": 663.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 663.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCC",
      "layer": "A-Wall",
      "start": {
        "x": 8809.502029106296,
        "y": 663.7788511355689,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106277,
        "y": 663.7788511355689,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCD",
      "layer": "A-Wall",
      "start": {
        "x": 8752.498624542,
        "y": 672.7788511355678,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 672.7788511355676,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCE",
      "layer": "A-Wall",
      "start": {
        "x": 8809.502029106296,
        "y": 672.7788511355673,
        "z": 0.0
      },
      "end": {
        "x": 8812.50202910628,
        "y": 672.7788511355673,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DCF",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247344,
        "y": 594.7609771730866,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106285,
        "y": 594.7609771730866,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD0",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247344,
        "y": 630.7609771730866,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106285,
        "y": 630.7609771730866,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD1",
      "layer": "A-Wall",
      "start": {
        "x": 8896.502029106288,
        "y": 567.7788511355674,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106292,
        "y": 567.778851135569,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD2",
      "layer": "A-Hand rail",
      "start": {
        "x": 8555.001461678881,
        "y": 514.0445331276004,
        "z": 0.0
      },
      "end": {
        "x": 8461.733020289037,
        "y": 514.0445331276004,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD5",
      "layer": "A-Wall",
      "start": {
        "x": 9040.559339271747,
        "y": 663.7788511381631,
        "z": 0.0
      },
      "end": {
        "x": 9040.559339271727,
        "y": 483.7788511355695,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD8",
      "layer": "A-Wall",
      "start": {
        "x": 8776.502029106281,
        "y": 728.2901996831679,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 728.2901996831677,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DD9",
      "layer": "A-Wall",
      "start": {
        "x": 8809.502029106296,
        "y": 728.2901996831657,
        "z": 0.0
      },
      "end": {
        "x": 8817.002029106312,
        "y": 728.2901996831653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DDA",
      "layer": "A-Wall",
      "start": {
        "x": 8527.49521997771,
        "y": 474.7788511355682,
        "z": 0.0
      },
      "end": {
        "x": 8527.49521997771,
        "y": 483.7788511355697,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DDB",
      "layer": "A-Wall",
      "start": {
        "x": 8896.502029106285,
        "y": 563.2779999944968,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106294,
        "y": 563.2779999944984,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DDD",
      "layer": "A-Wall",
      "start": {
        "x": 8458.476494874163,
        "y": 483.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8446.476494874163,
        "y": 483.7788511355704,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE0",
      "layer": "A-Wall",
      "start": {
        "x": 8437.476494874163,
        "y": 498.778851135571,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874163,
        "y": 474.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE1",
      "layer": "A-Wall",
      "start": {
        "x": 8458.476494874163,
        "y": 483.7788511355698,
        "z": 0.0
      },
      "end": {
        "x": 8458.476494874163,
        "y": 474.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE2",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874163,
        "y": 498.778851135571,
        "z": 0.0
      },
      "end": {
        "x": 8446.476494874163,
        "y": 483.7788511355704,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE3",
      "layer": "A-Wall",
      "start": {
        "x": 8437.476494874163,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8458.476494874163,
        "y": 474.7788511355682,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE4",
      "layer": "A-Wall",
      "start": {
        "x": 8458.476494874161,
        "y": 672.77885113557,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE6",
      "layer": "A-Wall",
      "start": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874161,
        "y": 648.7788511355709,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE7",
      "layer": "A-Wall",
      "start": {
        "x": 8458.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "end": {
        "x": 8458.47649487416,
        "y": 663.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE8",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874161,
        "y": 663.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8446.476494874161,
        "y": 648.7788511355709,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DE9",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874161,
        "y": 663.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8458.476494874158,
        "y": 663.7788511355702,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DEA",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874163,
        "y": 498.7788511355711,
        "z": 0.0
      },
      "end": {
        "x": 8446.476494874161,
        "y": 648.778851135571,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DEC",
      "layer": "A-Flor",
      "start": {
        "x": 8458.47649487416,
        "y": 672.778851135569,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106288,
        "y": 672.7788511355678,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36DED",
      "layer": "A-Wall",
      "start": {
        "x": 8767.502029106285,
        "y": 723.7901996831782,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 723.7901996831773,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36EBA",
      "layer": "A-Furn",
      "start": {
        "x": 8592.696988650387,
        "y": 672.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8592.696988650387,
        "y": 702.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36EF2",
      "layer": "A-Furn",
      "start": {
        "x": 8752.498624541995,
        "y": 663.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8752.498624542002,
        "y": 553.5859523388157,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36EF6",
      "layer": "A-Furn",
      "start": {
        "x": 8767.502029106296,
        "y": 553.5859523388157,
        "z": 0.0
      },
      "end": {
        "x": 8752.498624542002,
        "y": 553.5859523388157,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F0D",
      "layer": "A-Furn",
      "start": {
        "x": 8515.44698865037,
        "y": 702.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8592.696988650385,
        "y": 702.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F15",
      "layer": "A-Furn",
      "start": {
        "x": 8497.443016658723,
        "y": 207.7379963641831,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 207.7379963641831,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F1A",
      "layer": "A-Furn",
      "start": {
        "x": 8497.443016658723,
        "y": 177.7379963641831,
        "z": 0.0
      },
      "end": {
        "x": 8497.443016658723,
        "y": 207.7379963641831,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F2B",
      "layer": "A-Wall",
      "start": {
        "x": 8901.002880247346,
        "y": 594.7609771730869,
        "z": 0.0
      },
      "end": {
        "x": 8901.002880247352,
        "y": 483.7788511355617,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F2C",
      "layer": "A-Wall",
      "start": {
        "x": 8896.502029106285,
        "y": 594.7609771730866,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106288,
        "y": 567.7788511355674,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F2D",
      "layer": "A-Wall",
      "start": {
        "x": 8896.502029106285,
        "y": 563.2779999944968,
        "z": 0.0
      },
      "end": {
        "x": 8896.502029106283,
        "y": 483.7788511355619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F30",
      "layer": "A-Glaz",
      "start": {
        "x": 8844.001177965223,
        "y": 852.7788511355681,
        "z": 0.0
      },
      "end": {
        "x": 8844.001177965218,
        "y": 801.7788511355769,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F31",
      "layer": "A-Glaz",
      "start": {
        "x": 8842.501177965223,
        "y": 852.7788511355678,
        "z": 0.0
      },
      "end": {
        "x": 8842.501177965218,
        "y": 801.7788511355772,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F32",
      "layer": "A-Glaz",
      "start": {
        "x": 8845.501177965223,
        "y": 852.7788511355674,
        "z": 0.0
      },
      "end": {
        "x": 8845.501177965218,
        "y": 801.7788511355769,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F33",
      "layer": "A-Wall",
      "start": {
        "x": 8941.503759847898,
        "y": 801.7788511355712,
        "z": 0.0
      },
      "end": {
        "x": 8932.50202910629,
        "y": 801.7788511355715,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F34",
      "layer": "A-Glaz",
      "start": {
        "x": 8845.501177965218,
        "y": 801.7788511355719,
        "z": 0.0
      },
      "end": {
        "x": 8842.501177965218,
        "y": 801.7788511355719,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F94",
      "layer": "A-Wall",
      "start": {
        "x": 8941.503759847898,
        "y": 804.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8941.503759847898,
        "y": 801.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F95",
      "layer": "A-Wall",
      "start": {
        "x": 8941.503759847898,
        "y": 804.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8932.502029106283,
        "y": 804.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F96",
      "layer": "A-Wall",
      "start": {
        "x": 8950.5037598479,
        "y": 852.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8932.502029106283,
        "y": 852.7788511355685,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36F97",
      "layer": "A-Wall",
      "start": {
        "x": 8932.502029106283,
        "y": 804.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8932.502029106292,
        "y": 801.7788511355715,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FE2",
      "layer": "A-Furn",
      "start": {
        "x": 8592.696988650387,
        "y": 687.104044023757,
        "z": 0.0
      },
      "end": {
        "x": 8592.696988650387,
        "y": 675.1040440237497,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FF9",
      "layer": "A-Furn",
      "start": {
        "x": 8658.696988650387,
        "y": 687.104044023757,
        "z": 0.0
      },
      "end": {
        "x": 8592.696988650387,
        "y": 687.104044023757,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FFB",
      "layer": "A-Furn",
      "start": {
        "x": 8658.696988650387,
        "y": 687.104044023757,
        "z": 0.0
      },
      "end": {
        "x": 8658.696988650387,
        "y": 675.1040440237497,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FFC",
      "layer": "A-Furn",
      "start": {
        "x": 8658.696988650387,
        "y": 675.1040440237497,
        "z": 0.0
      },
      "end": {
        "x": 8592.696988650387,
        "y": 675.1040440237497,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FFE",
      "layer": "A-Wall",
      "start": {
        "x": 8977.502029106292,
        "y": 390.7788511355536,
        "z": 0.0
      },
      "end": {
        "x": 8977.502029106305,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "36FFF",
      "layer": "A-Wall",
      "start": {
        "x": 8986.502029106276,
        "y": 474.7788511355697,
        "z": 0.0
      },
      "end": {
        "x": 8986.502029106286,
        "y": 450.7788511355549,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37000",
      "layer": "A-Wall",
      "start": {
        "x": 8977.502029106296,
        "y": 474.7788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8977.502029106307,
        "y": 450.7788511355536,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37001",
      "layer": "A-Wall",
      "start": {
        "x": 8986.502029106261,
        "y": 390.7788511355549,
        "z": 0.0
      },
      "end": {
        "x": 8986.50202910628,
        "y": 348.7788511355577,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37002",
      "layer": "A-Hand rail",
      "start": {
        "x": 8925.002029106283,
        "y": 474.7942433662775,
        "z": 0.0
      },
      "end": {
        "x": 8925.00202910629,
        "y": 366.7942433662782,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37003",
      "layer": "A-Hand rail",
      "start": {
        "x": 8928.002029106276,
        "y": 474.7788511355695,
        "z": 0.0
      },
      "end": {
        "x": 8928.002029106283,
        "y": 366.7788511355702,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37004",
      "layer": "A-Hand rail",
      "start": {
        "x": 8926.502029106276,
        "y": 474.7788511355694,
        "z": 0.0
      },
      "end": {
        "x": 8926.502029106283,
        "y": 366.7788511355701,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37005",
      "layer": "A-Hand rail",
      "start": {
        "x": 8929.502029106276,
        "y": 474.7788511355696,
        "z": 0.0
      },
      "end": {
        "x": 8929.502029106283,
        "y": 366.7788511355703,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37008",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8829.002029106283,
        "y": 474.7980914240477,
        "z": 0.0
      },
      "end": {
        "x": 8829.002029106285,
        "y": 422.2980914236734,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37009",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8839.502029106283,
        "y": 474.7980914240476,
        "z": 0.0
      },
      "end": {
        "x": 8839.502029106283,
        "y": 422.2980914236736,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3700A",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8850.002029106283,
        "y": 474.7980914240476,
        "z": 0.0
      },
      "end": {
        "x": 8850.002029106283,
        "y": 422.2980914236738,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3700C",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8860.502029106283,
        "y": 474.7980914240476,
        "z": 0.0
      },
      "end": {
        "x": 8860.502029106288,
        "y": 422.2980914236741,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3700D",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8860.502029106288,
        "y": 417.798091423674,
        "z": 0.0
      },
      "end": {
        "x": 8860.502029106288,
        "y": 406.7954386315032,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3700E",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8839.502029106286,
        "y": 366.7980914240488,
        "z": 0.0
      },
      "end": {
        "x": 8839.502029106283,
        "y": 417.7980914236736,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3700F",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8850.002029106286,
        "y": 366.7980914240488,
        "z": 0.0
      },
      "end": {
        "x": 8850.002029106283,
        "y": 417.7980914236737,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37010",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8860.502029106286,
        "y": 366.7980914240488,
        "z": 0.0
      },
      "end": {
        "x": 8860.502029106283,
        "y": 417.798091423674,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37011",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8860.502029106283,
        "y": 422.298091423674,
        "z": 0.0
      },
      "end": {
        "x": 8860.502029106285,
        "y": 422.8007442158453,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37012",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8829.002029106286,
        "y": 366.7980914240487,
        "z": 0.0
      },
      "end": {
        "x": 8829.002029106283,
        "y": 417.7980914236733,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37013",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8818.502029106286,
        "y": 366.7980914240485,
        "z": 0.0
      },
      "end": {
        "x": 8818.502029106283,
        "y": 417.7980914236731,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37015",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8808.002029106286,
        "y": 366.7980914240483,
        "z": 0.0
      },
      "end": {
        "x": 8808.002029106283,
        "y": 417.7980914236729,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37017",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8797.502029106286,
        "y": 366.798091424048,
        "z": 0.0
      },
      "end": {
        "x": 8797.502029106283,
        "y": 417.7980914236726,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37018",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8787.002029106286,
        "y": 366.7980914240478,
        "z": 0.0
      },
      "end": {
        "x": 8787.002029106283,
        "y": 417.7980914236724,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37019",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8871.002029106286,
        "y": 366.7163818812719,
        "z": 0.0
      },
      "end": {
        "x": 8871.002029106283,
        "y": 417.7980914236742,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3701B",
      "layer": "A-Anno-Text",
      "start": {
        "x": 8871.002029106285,
        "y": 393.7980914238611,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106285,
        "y": 393.7980914238608,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3701C",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8902.502029106286,
        "y": 366.7202299390424,
        "z": 0.0
      },
      "end": {
        "x": 8902.502029106283,
        "y": 417.7980914236749,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3701D",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8881.502029106286,
        "y": 366.7202299390424,
        "z": 0.0
      },
      "end": {
        "x": 8881.502029106283,
        "y": 417.7980914236745,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3701E",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8892.002029106286,
        "y": 366.7163818812713,
        "z": 0.0
      },
      "end": {
        "x": 8892.002029106283,
        "y": 417.7980914236747,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3701F",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8913.002029106286,
        "y": 366.7240779968134,
        "z": 0.0
      },
      "end": {
        "x": 8913.002029106283,
        "y": 417.7980914236751,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37023",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8818.502029106283,
        "y": 474.7980914240479,
        "z": 0.0
      },
      "end": {
        "x": 8818.502029106283,
        "y": 422.2980914236732,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37024",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8871.002029106285,
        "y": 474.7788511355696,
        "z": 0.0
      },
      "end": {
        "x": 8871.002029106283,
        "y": 422.2980914236743,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37025",
      "layer": "A-Flor-Strs",
      "start": {
        "x": 8776.502029106286,
        "y": 366.7980914240487,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106283,
        "y": 417.7980914236722,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37026",
      "layer": "A-Hand rail",
      "start": {
        "x": 8925.002029106286,
        "y": 419.2980914236754,
        "z": 0.0
      },
      "end": {
        "x": 8778.002029106283,
        "y": 419.2980914236722,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37027",
      "layer": "A-Hand rail",
      "start": {
        "x": 8925.002029106286,
        "y": 417.7980914236754,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106283,
        "y": 417.7980914236722,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37028",
      "layer": "A-Hand rail",
      "start": {
        "x": 8925.002029106286,
        "y": 422.2980914236754,
        "z": 0.0
      },
      "end": {
        "x": 8778.002029106283,
        "y": 422.2980914236722,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37029",
      "layer": "A-Hand rail",
      "start": {
        "x": 8925.002029106286,
        "y": 423.7980914236754,
        "z": 0.0
      },
      "end": {
        "x": 8776.502029106283,
        "y": 423.7980914236722,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3702A",
      "layer": "A-Wall",
      "start": {
        "x": 8557.502029106281,
        "y": 132.7311872356193,
        "z": 0.0
      },
      "end": {
        "x": 8566.50202910628,
        "y": 132.7311872356186,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3702B",
      "layer": "A-Wall",
      "start": {
        "x": 8800.506568525325,
        "y": 366.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8775.002029106283,
        "y": 366.7826991933408,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3702C",
      "layer": "A-Wall",
      "start": {
        "x": 8775.002029106283,
        "y": 366.7826991933408,
        "z": 0.0
      },
      "end": {
        "x": 8775.002029106283,
        "y": 357.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3702D",
      "layer": "A-Wall",
      "start": {
        "x": 8800.506568525323,
        "y": 357.7788511355687,
        "z": 0.0
      },
      "end": {
        "x": 8775.002029106283,
        "y": 357.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37042",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8941.5037598479,
        "y": 846.7788511355707,
        "z": 0.0
      },
      "end": {
        "x": 8845.501177965223,
        "y": 846.7788511355694,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37065",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8887.502029106301,
        "y": 846.7788511355701,
        "z": 0.0
      },
      "end": {
        "x": 8875.376603535757,
        "y": 846.7788511355699,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3709C",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8587.50202910628,
        "y": 208.0100852924756,
        "z": 0.0
      },
      "end": {
        "x": 8587.502029106277,
        "y": 195.7320383766871,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3709D",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8587.502029106283,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8587.502029106281,
        "y": 229.0100852924756,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3709F",
      "layer": "A-Furn",
      "start": {
        "x": 8669.210786857706,
        "y": 230.875054196015,
        "z": 0.0
      },
      "end": {
        "x": 8669.2107868577,
        "y": 283.7538843308332,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370A6",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8566.502029106283,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8566.502029106283,
        "y": 195.7320383766868,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370A7",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8566.502029106285,
        "y": 246.7538843308326,
        "z": 0.0
      },
      "end": {
        "x": 8587.502029106283,
        "y": 246.7538843308326,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370A8",
      "layer": "A-Furn",
      "start": {
        "x": 8674.500326824136,
        "y": 230.875054196015,
        "z": 0.0
      },
      "end": {
        "x": 8669.210786857706,
        "y": 230.875054196015,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370A9",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8674.500326824142,
        "y": 146.2311872356119,
        "z": 0.0
      },
      "end": {
        "x": 8626.50032682413,
        "y": 146.2311872355818,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370BE",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8570.953750251298,
        "y": 192.7311872356176,
        "z": 0.0
      },
      "end": {
        "x": 8570.953750251296,
        "y": 141.7311872356195,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370E0",
      "layer": "A-Flor-Spcl",
      "start": {
        "x": 8570.953750251298,
        "y": 164.9811872356258,
        "z": 0.0
      },
      "end": {
        "x": 8570.953750251298,
        "y": 150.2320383766955,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "370FF",
      "layer": "A-Wall",
      "start": {
        "x": 8419.504866243191,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8497.497489687234,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37119",
      "layer": "A-Flor",
      "start": {
        "x": 8458.554044580727,
        "y": 708.7788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8458.554044580727,
        "y": 816.7788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711A",
      "layer": "A-Flor",
      "start": {
        "x": 8458.554044580727,
        "y": 816.7788511353587,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 816.7788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711B",
      "layer": "A-Hand rail",
      "start": {
        "x": 8460.054044580727,
        "y": 710.2788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8460.054044580727,
        "y": 815.2788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711C",
      "layer": "A-Hand rail",
      "start": {
        "x": 8461.554044580727,
        "y": 711.7788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8461.554044580727,
        "y": 813.7788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711D",
      "layer": "A-Hand rail",
      "start": {
        "x": 8460.054044580727,
        "y": 815.2788511353587,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 815.2788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711E",
      "layer": "A-Hand rail",
      "start": {
        "x": 8461.554044580727,
        "y": 813.7788511353587,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 813.7788511353587,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3711F",
      "layer": "A-Flor",
      "start": {
        "x": 8458.554044580727,
        "y": 708.7788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 708.7788511353295,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37120",
      "layer": "A-Wall",
      "start": {
        "x": 8560.493233981868,
        "y": 881.2788511355653,
        "z": 0.0
      },
      "end": {
        "x": 8572.563193525966,
        "y": 881.2788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37121",
      "layer": "A-Hand rail",
      "start": {
        "x": 8460.054044580727,
        "y": 710.2788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 710.2788511353295,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37122",
      "layer": "A-Hand rail",
      "start": {
        "x": 8461.554044580727,
        "y": 711.7788511353295,
        "z": 0.0
      },
      "end": {
        "x": 8506.502029106285,
        "y": 711.7788511353295,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37123",
      "layer": "A-Wall",
      "start": {
        "x": 8581.502029106285,
        "y": 861.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8581.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37124",
      "layer": "A-Wall",
      "start": {
        "x": 8572.563193525966,
        "y": 861.7788511355682,
        "z": 0.0
      },
      "end": {
        "x": 8572.563193525966,
        "y": 881.2788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37125",
      "layer": "A-Wall",
      "start": {
        "x": 8710.565864686607,
        "y": 861.778855208362,
        "z": 0.0
      },
      "end": {
        "x": 8710.565864686607,
        "y": 881.278855208362,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37126",
      "layer": "A-Wall",
      "start": {
        "x": 8560.493233981866,
        "y": 861.7788511355676,
        "z": 0.0
      },
      "end": {
        "x": 8560.493233981868,
        "y": 881.2788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37127",
      "layer": "A-Wall",
      "start": {
        "x": 8551.502029106286,
        "y": 861.778851135568,
        "z": 0.0
      },
      "end": {
        "x": 8551.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37128",
      "layer": "A-Wall",
      "start": {
        "x": 8722.502029106285,
        "y": 861.7720420057929,
        "z": 0.0
      },
      "end": {
        "x": 8722.502029106285,
        "y": 881.2720420057927,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37129",
      "layer": "A-Wall",
      "start": {
        "x": 8731.502029106283,
        "y": 861.7720420057929,
        "z": 0.0
      },
      "end": {
        "x": 8731.502029106285,
        "y": 885.7720420057931,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3712A",
      "layer": "A-Wall",
      "start": {
        "x": 8551.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      },
      "end": {
        "x": 8581.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3712B",
      "layer": "A-Wall",
      "start": {
        "x": 8701.502029106285,
        "y": 885.7788511355786,
        "z": 0.0
      },
      "end": {
        "x": 8731.502029106285,
        "y": 885.7720420057927,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3712C",
      "layer": "A-Wall",
      "start": {
        "x": 8710.565864686607,
        "y": 881.278855208362,
        "z": 0.0
      },
      "end": {
        "x": 8722.502029106285,
        "y": 881.2720420057927,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3712D",
      "layer": "A-Wall",
      "start": {
        "x": 8581.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      },
      "end": {
        "x": 8701.484085036613,
        "y": 885.7788552083739,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3712E",
      "layer": "A-ROOF",
      "start": {
        "x": 8533.502029106281,
        "y": 108.7311872356195,
        "z": 0.0
      },
      "end": {
        "x": 8707.50202910628,
        "y": 108.7311872356192,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37136",
      "layer": "A-ROOF",
      "start": {
        "x": 8620.50202910628,
        "y": 108.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8620.50202910628,
        "y": 132.731187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37191",
      "layer": "A-Wall",
      "start": {
        "x": 8335.500326824149,
        "y": 168.7379963641819,
        "z": 0.0
      },
      "end": {
        "x": 8326.50032682415,
        "y": 168.7379963641819,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37192",
      "layer": "A-Wall",
      "start": {
        "x": 8326.50032682415,
        "y": 168.7379963641819,
        "z": 0.0
      },
      "end": {
        "x": 8326.50032682415,
        "y": 186.7379963641786,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37193",
      "layer": "A-Wall",
      "start": {
        "x": 8335.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8326.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37194",
      "layer": "A-Wall",
      "start": {
        "x": 8326.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8326.500326824149,
        "y": 348.77885113556,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37197",
      "layer": "A-Glaz",
      "start": {
        "x": 8578.53394099987,
        "y": 132.7311872356199,
        "z": 0.0
      },
      "end": {
        "x": 8578.533940999869,
        "y": 137.2311872356199,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37198",
      "layer": "A-Glaz",
      "start": {
        "x": 8596.16394099986,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8596.16394099986,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37199",
      "layer": "A-Glaz",
      "start": {
        "x": 8611.50202910628,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8611.50202910628,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719A",
      "layer": "A-Glaz",
      "start": {
        "x": 8629.502029106268,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8629.502029106268,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719B",
      "layer": "A-Glaz",
      "start": {
        "x": 8644.470117212684,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8644.470117212684,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719C",
      "layer": "A-Glaz",
      "start": {
        "x": 8662.470117212675,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8662.470117212673,
        "y": 137.231187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719D",
      "layer": "A-Glaz",
      "start": {
        "x": 8575.53394099987,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8599.163940999859,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719E",
      "layer": "A-Glaz",
      "start": {
        "x": 8575.53394099987,
        "y": 128.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8599.163940999859,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3719F",
      "layer": "A-Glaz",
      "start": {
        "x": 8599.163940999859,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8599.163940999859,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A0",
      "layer": "A-Glaz",
      "start": {
        "x": 8575.53394099987,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8575.53394099987,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A1",
      "layer": "A-Glaz",
      "start": {
        "x": 8597.16394099986,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8597.16394099986,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A2",
      "layer": "A-Glaz",
      "start": {
        "x": 8598.16394099986,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8598.16394099986,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A3",
      "layer": "A-Glaz",
      "start": {
        "x": 8577.533940999869,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8577.533940999869,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A4",
      "layer": "A-Glaz",
      "start": {
        "x": 8576.533940999869,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8576.533940999869,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A5",
      "layer": "A-Glaz",
      "start": {
        "x": 8608.502029106276,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8632.502029106265,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A6",
      "layer": "A-Glaz",
      "start": {
        "x": 8608.502029106276,
        "y": 128.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8632.502029106265,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A7",
      "layer": "A-Glaz",
      "start": {
        "x": 8632.502029106265,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8632.502029106265,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A8",
      "layer": "A-Glaz",
      "start": {
        "x": 8608.502029106276,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8608.502029106276,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371A9",
      "layer": "A-Glaz",
      "start": {
        "x": 8630.502029106266,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8630.502029106266,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AA",
      "layer": "A-Glaz",
      "start": {
        "x": 8631.502029106266,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8631.502029106266,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AB",
      "layer": "A-Glaz",
      "start": {
        "x": 8610.502029106274,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8610.502029106274,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AC",
      "layer": "A-Glaz",
      "start": {
        "x": 8609.502029106274,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8609.502029106274,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AD",
      "layer": "A-Glaz",
      "start": {
        "x": 8641.470117212686,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8665.470117212675,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AE",
      "layer": "A-Glaz",
      "start": {
        "x": 8641.470117212686,
        "y": 128.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8665.470117212675,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371AF",
      "layer": "A-Glaz",
      "start": {
        "x": 8665.470117212675,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8665.470117212675,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B0",
      "layer": "A-Glaz",
      "start": {
        "x": 8641.470117212686,
        "y": 129.7311872356194,
        "z": 0.0
      },
      "end": {
        "x": 8641.470117212686,
        "y": 128.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B1",
      "layer": "A-Glaz",
      "start": {
        "x": 8663.470117212677,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8663.470117212677,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B2",
      "layer": "A-Glaz",
      "start": {
        "x": 8664.470117212677,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8664.470117212677,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B3",
      "layer": "A-Glaz",
      "start": {
        "x": 8643.470117212684,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8643.470117212684,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B4",
      "layer": "A-Glaz",
      "start": {
        "x": 8642.470117212684,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8642.470117212684,
        "y": 129.7311872356194,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B5",
      "layer": "A-Glaz",
      "start": {
        "x": 8578.533940999872,
        "y": 132.7311872356199,
        "z": 0.0
      },
      "end": {
        "x": 8596.16394099986,
        "y": 132.7311872356199,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B6",
      "layer": "A-Glaz",
      "start": {
        "x": 8611.502029106281,
        "y": 132.7311872356199,
        "z": 0.0
      },
      "end": {
        "x": 8629.50202910627,
        "y": 132.7311872356199,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B7",
      "layer": "A-Glaz",
      "start": {
        "x": 8644.470117212686,
        "y": 132.731187235619,
        "z": 0.0
      },
      "end": {
        "x": 8662.470117212675,
        "y": 132.731187235619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B8",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874161,
        "y": 648.7788511355709,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874161,
        "y": 648.7788511355709,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371B9",
      "layer": "A-Wall",
      "start": {
        "x": 8446.476494874163,
        "y": 498.778851135571,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874163,
        "y": 498.778851135571,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371BA",
      "layer": "A-ROOF",
      "start": {
        "x": 8533.502029106281,
        "y": 144.7311872356193,
        "z": 0.0
      },
      "end": {
        "x": 8557.502029106281,
        "y": 168.7379963641824,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371BB",
      "layer": "A-ROOF",
      "start": {
        "x": 8224.502029106283,
        "y": 267.7584237498764,
        "z": 0.0
      },
      "end": {
        "x": 8326.50032682415,
        "y": 267.758423749873,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371C0",
      "layer": "A-ROOF",
      "start": {
        "x": 9073.559339271675,
        "y": 663.7788511346149,
        "z": 0.0
      },
      "end": {
        "x": 9073.55933927167,
        "y": 450.7788511346148,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371C1",
      "layer": "A-ROOF",
      "start": {
        "x": 8986.50202910624,
        "y": 450.7788511346152,
        "z": 0.0
      },
      "end": {
        "x": 9073.55933927167,
        "y": 450.7788511346148,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371C2",
      "layer": "A-ROOF",
      "start": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 9073.55933927167,
        "y": 450.7788511346148,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371D1",
      "layer": "A-Flor",
      "start": {
        "x": 8458.476494874163,
        "y": 474.7788511355713,
        "z": 0.0
      },
      "end": {
        "x": 8527.4952199777,
        "y": 474.7788511355682,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371D2",
      "layer": "A-Flor",
      "start": {
        "x": 8437.476494874163,
        "y": 498.778851135571,
        "z": 0.0
      },
      "end": {
        "x": 8437.476494874161,
        "y": 648.7788511355709,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371D3",
      "layer": "A-Wall",
      "start": {
        "x": 8695.506568525321,
        "y": 266.2601260320174,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 266.2601260320174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371D4",
      "layer": "A-Wall",
      "start": {
        "x": 8695.506568525321,
        "y": 257.2601260320166,
        "z": 0.0
      },
      "end": {
        "x": 8683.50202910628,
        "y": 257.2601260320166,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371DF",
      "layer": "A-Anno-Text",
      "start": {
        "x": 8869.98530478978,
        "y": 447.842794253019,
        "z": 0.0
      },
      "end": {
        "x": 8818.502029106283,
        "y": 447.842794253019,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371E5",
      "layer": "A-Wall",
      "start": {
        "x": 8581.502029106272,
        "y": 483.7788511355693,
        "z": 0.0
      },
      "end": {
        "x": 8566.5037313884,
        "y": 483.7788511355693,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371E6",
      "layer": "A-Anno-Iden",
      "start": {
        "x": 8977.502029106305,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "end": {
        "x": 8929.502029106276,
        "y": 474.7788511355696,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "371E7",
      "layer": "A-Anno-Iden",
      "start": {
        "x": 8929.502029106283,
        "y": 366.7788511355703,
        "z": 0.0
      },
      "end": {
        "x": 8977.502029106296,
        "y": 474.7788511355701,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37201",
      "layer": "A-Wall",
      "start": {
        "x": 8950.5037598479,
        "y": 804.7788511355685,
        "z": 0.0
      },
      "end": {
        "x": 8950.5037598479,
        "y": 801.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37203",
      "layer": "A-Glaz",
      "start": {
        "x": 8845.501177965218,
        "y": 801.7788511355765,
        "z": 0.0
      },
      "end": {
        "x": 8847.168222916805,
        "y": 801.7788511355717,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37204",
      "layer": "A-Glaz",
      "start": {
        "x": 8596.499475683066,
        "y": 195.7320383766868,
        "z": 0.0
      },
      "end": {
        "x": 8598.73321552325,
        "y": 195.7320383766868,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37205",
      "layer": "A-Glaz",
      "start": {
        "x": 8596.499475683062,
        "y": 192.7320383766868,
        "z": 0.0
      },
      "end": {
        "x": 8598.73321552325,
        "y": 192.7320383766868,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37206",
      "layer": "A-Glaz",
      "start": {
        "x": 8622.73321552325,
        "y": 192.7320383766868,
        "z": 0.0
      },
      "end": {
        "x": 8623.500326824134,
        "y": 192.7320383766869,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37207",
      "layer": "A-Glaz",
      "start": {
        "x": 8622.73321552325,
        "y": 195.7320383766868,
        "z": 0.0
      },
      "end": {
        "x": 8623.500326824134,
        "y": 195.7320383766862,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3720F",
      "layer": "A-ROOF",
      "start": {
        "x": 9073.538437173018,
        "y": 366.7856602632932,
        "z": 0.0
      },
      "end": {
        "x": 9073.538437173018,
        "y": 87.72948495347276,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37210",
      "layer": "A-ROOF",
      "start": {
        "x": 8776.510540516963,
        "y": 257.2601260320171,
        "z": 0.0
      },
      "end": {
        "x": 8776.510540516963,
        "y": 87.72948495347279,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37219",
      "layer": "A-Wall",
      "start": {
        "x": 8986.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      },
      "end": {
        "x": 8851.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37226",
      "layer": "A-Wall",
      "start": {
        "x": 8809.502029106296,
        "y": 672.7788511355673,
        "z": 0.0
      },
      "end": {
        "x": 8809.502029106296,
        "y": 663.7788511355689,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "37227",
      "layer": "A-Wall",
      "start": {
        "x": 8779.502029106296,
        "y": 672.7788511355676,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 663.7788511355687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3722E",
      "layer": "A-Wall",
      "start": {
        "x": 8779.502029106296,
        "y": 483.7788511355638,
        "z": 0.0
      },
      "end": {
        "x": 8779.502029106296,
        "y": 474.7788511355685,
        "z": 0.0
      }
    }
  ],
  "polylines": [
    {
      "entity_type": "LWPOLYLINE",
      "handle": "36EDA",
      "layer": "A-Furn",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8637.371949572189,
          "y": 529.8966190534942,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8664.378961762253,
          "y": 529.8966190534942,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8664.378961762253,
          "y": 554.3281180937068,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8637.371949572189,
          "y": 554.3281180937068,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "36EF0",
      "layer": "A-Furn",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8601.639359075489,
          "y": 487.9256609074749,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8571.905337427175,
          "y": 487.9256609074749,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8571.905337427175,
          "y": 516.8174614870317,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8601.639359075489,
          "y": 516.8174614870317,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "36F93",
      "layer": "A-Furn",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8549.282458764777,
          "y": 845.2673342125166,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8549.282458764777,
          "y": 815.2673342125166,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8519.282458764777,
          "y": 815.2673342125166,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8519.282458764777,
          "y": 845.2673342125166,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3700B",
      "layer": "A-Anno-Text",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8869.98530478978,
          "y": 447.842794253019,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8857.502029106281,
          "y": 447.842794253019,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3701A",
      "layer": "A-Anno-Text",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8876.252029106283,
          "y": 393.7942433660909,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8863.768753422784,
          "y": 393.7942433660909,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37082",
      "layer": "A-Furn",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8637.371949572189,
          "y": 617.7110945661956,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8664.378961762253,
          "y": 617.7110945661956,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8664.378961762253,
          "y": 593.2795955259829,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8637.371949572189,
          "y": 593.2795955259829,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37095",
      "layer": "A-Furn",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8601.639359075489,
          "y": 659.6820527122148,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8571.905337427175,
          "y": 659.6820527122148,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8571.905337427175,
          "y": 630.7902521326581,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8601.639359075489,
          "y": 630.7902521326581,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37211",
      "layer": "A-ROOF",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8776.510540516963,
          "y": 87.72948495347279,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 9073.538437173018,
          "y": 87.72948495347276,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37212",
      "layer": "A-ROOF",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 9073.538437173018,
          "y": 366.7856602632933,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8986.502029106261,
          "y": 366.7856602632537,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37213",
      "layer": "A-ROOF",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8925.02448884499,
          "y": 87.72948495347278,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8925.02448884499,
          "y": 348.7788511339054,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37214",
      "layer": "A-ROOF",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 9073.559339271675,
          "y": 663.7788511346149,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 9049.559339271706,
          "y": 663.7788511346196,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37215",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8950.5037598479,
          "y": 861.7788511355667,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8950.5037598479,
          "y": 852.7788511355685,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3721A",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8851.502029106281,
          "y": 348.7788511339054,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8851.502029106281,
          "y": 357.7788511355687,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37222",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8809.502029106296,
          "y": 723.7901996831584,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8812.502029106308,
          "y": 723.7901996831566,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37223",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8779.502029106296,
          "y": 723.7901996831673,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8779.502029106296,
          "y": 728.2901996831675,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37224",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8809.502029106296,
          "y": 723.7901996831673,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8809.502029106296,
          "y": 728.2901996831657,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37229",
      "layer": "A-Hand rail",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8776.502029106283,
          "y": 417.7980914236722,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8776.502029106283,
          "y": 423.7980914236722,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3722A",
      "layer": "A-Hand rail",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8778.002029106283,
          "y": 419.2980914236722,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8778.002029106283,
          "y": 422.2980914236722,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3722B",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8566.502029106286,
          "y": 318.7788511355703,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8557.502029106283,
          "y": 318.7788511355703,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3722C",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8566.502029106292,
          "y": 354.7788511355703,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8557.502029106285,
          "y": 354.7788511355703,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3722F",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8779.502029106296,
          "y": 483.7788511355638,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8776.50202910629,
          "y": 483.7788511355639,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "37238",
      "layer": "A-Wall",
      "closed": true,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8950.5037598479,
          "y": 753.7788511355687,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8950.5037598479,
          "y": 720.7788511373836,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8941.503759847901,
          "y": 720.7788511373836,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8941.503759847901,
          "y": 753.7788511355687,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3723A",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 2,
      "vertices": [
        {
          "x": 8457.208784401293,
          "y": -82.4314628192538,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8706.070381813384,
          "y": -82.4314628192538,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    },
    {
      "entity_type": "LWPOLYLINE",
      "handle": "3723F",
      "layer": "A-Wall",
      "closed": false,
      "vertex_count": 4,
      "vertices": [
        {
          "x": 8800.561608981223,
          "y": 257.260126032017,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 8800.561608981223,
          "y": 111.7226758237031,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 9049.532195471855,
          "y": 111.7226758237031,
          "z": 0.0,
          "bulge": 0.0
        },
        {
          "x": 9049.532195471857,
          "y": 366.7720420057973,
          "z": 0.0,
          "bulge": 0.0
        }
      ]
    }
  ],
  "arcs": [],
  "circles": [
    {
      "entity_type": "CIRCLE",
      "handle": "36F25",
      "layer": "A-Furn",
      "center": {
        "x": 8429.184245291111,
        "y": 227.473212752273,
        "z": 0.0
      },
      "radius": 11.1975000384773,
      "thickness": 0.0,
      "extrusion": [
        0.0,
        0.0,
        1.0
      ]
    },
    {
      "entity_type": "CIRCLE",
      "handle": "37007",
      "layer": "A-Anno-Text",
      "center": {
        "x": 8818.502029106283,
        "y": 447.7980914238613,
        "z": 0.0
      },
      "radius": 2.500567427380393,
      "thickness": 0.0,
      "extrusion": [
        0.0,
        0.0,
        1.0
      ]
    },
    {
      "entity_type": "CIRCLE",
      "handle": "37016",
      "layer": "A-Anno-Text",
      "center": {
        "x": 8776.502029106285,
        "y": 393.7980914238606,
        "z": 0.0
      },
      "radius": 2.500567427380393,
      "thickness": 0.0,
      "extrusion": [
        0.0,
        0.0,
        1.0
      ]
    }
  ],
  "ellipses": [],
  "splines": [],
  "points": [],
  "texts": [
    {
      "entity_type": "TEXT",
      "handle": "37006",
      "layer": "A-Anno-Text",
      "text": "UP",
      "position": {
        "x": 8804.33189437637,
        "y": 443.9750301640974,
        "z": 0.0
      },
      "height": 5.001134854760786,
      "rotation": 0.0,
      "width": 1.0
    },
    {
      "entity_type": "TEXT",
      "handle": "37014",
      "layer": "A-Anno-Text",
      "text": "DN",
      "position": {
        "x": 8763.950969015772,
        "y": 392.6200178288637,
        "z": 0.0
      },
      "height": 5.001134854760786,
      "rotation": 0.0,
      "width": 1.0
    },
    {
      "entity_type": "MTEXT",
      "handle": "36D36",
      "layer": "A-Anno-Text",
      "text": "BALCONY\n8'3\"X10'6\"",
      "position": {
        "x": 8509.121722400669,
        "y": 574.5739659233524,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36D41",
      "layer": "A-Anno-Text",
      "text": "MASTER BEDROOM\n21'0\"x15'0\"",
      "position": {
        "x": 8582.843054028142,
        "y": 766.8137577507606,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36D98",
      "layer": "A-Anno-Text",
      "text": "BED ROOM\n16'6\"x15'0\"",
      "position": {
        "x": 8506.43663537649,
        "y": 262.4437729092011,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36DBB",
      "layer": "A-Anno-Text",
      "text": "BATH\n9'0\"x9'6\"",
      "position": {
        "x": 8618.380412919301,
        "y": 264.006232602553,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36DBF",
      "layer": "A-Anno-Text",
      "text": "LINNEN\nSTORE\n10'0\"x6'9\"",
      "position": {
        "x": 8833.292796663754,
        "y": 528.7084830670706,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36EEF",
      "layer": "A-Anno-Text",
      "text": "\nFOYER\n7'9\"x9'0\"",
      "position": {
        "x": 8721.551525370025,
        "y": 436.4040878864575,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36EFD",
      "layer": "A-Anno-Text",
      "text": "SHOWER\n7'3\"X4'0\"",
      "position": {
        "x": 8898.907210511032,
        "y": 827.5428077164873,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36F2F",
      "layer": "A-Anno-Text",
      "text": "MASTER BATH ROOM\n13'0\"x10'9\"",
      "position": {
        "x": 8847.41613322666,
        "y": 761.5012838602019,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36F80",
      "layer": "A-Anno-Text",
      "text": "DRESS\n10'0\"x8'0\"",
      "position": {
        "x": 8836.448115195883,
        "y": 615.6237155475015,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "36F82",
      "layer": "A-Anno-Text",
      "text": "WALK IN CLOSET\n11'6\"x15'0\"",
      "position": {
        "x": 8971.70601987785,
        "y": 573.1267783791394,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "370F9",
      "layer": "A-Anno-Text",
      "text": "SHOWER\n4'6\"X4'3\"",
      "position": {
        "x": 8598.040476972648,
        "y": 158.3866755121946,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "37100",
      "layer": "A-Anno-Text",
      "text": "SITTING ROOM\n16'9\"x15'0\"",
      "position": {
        "x": 8650.586837114031,
        "y": 571.7420921942124,
        "z": 0.0
      },
      "height": 5.999999999999998,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "37239",
      "layer": "A-Flor-Iden",
      "text": "FIRST FLOOR PLAN",
      "position": {
        "x": 8457.208784401293,
        "y": -58.89198866466592,
        "z": 0.0
      },
      "height": 18.0,
      "rotation": 0.0,
    },
    {
      "entity_type": "MTEXT",
      "handle": "3723B",
      "layer": "A-Flor-Iden",
      "text": "SCALE: 1/4\" = 1'-0\"",
      "position": {
        "x": 8457.208784401293,
        "y": -90.89198866466592,
        "z": 0.0
      },
      "height": 12.0,
      "rotation": 0.0,
      "width": 1042.239162247895
    }
  ],
  "inserts": [
    {
      "entity_type": "INSERT",
      "handle": "EC15",
      "layer": "0",
      "block_name": "door",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [],
      "block_entity_count": 0,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F1",
      "layer": "A-Glaz",
      "block_name": "window 11",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8497.497489687234,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F2",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8383.37257227921,
        "y": 177.7379963641808,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F3",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8497.443016658723,
        "y": 177.7379963641831,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F4",
      "layer": "A-Glaz",
      "block_name": "window 5ft",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8695.491815413068,
        "y": 257.2601260320155,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F5",
      "layer": "A-Glaz",
      "block_name": "win dow jjj",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8596.50202910629,
        "y": 861.7788511355677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F6",
      "layer": "A-Glaz",
      "block_name": "window 5st",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8581.502029106281,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F7",
      "layer": "A-Glaz",
      "block_name": "window 11",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8383.500326824149,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F8",
      "layer": "A-Glaz",
      "block_name": "window block",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8326.50032682416,
        "y": 308.3930722969142,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F9",
      "layer": "A-Glaz",
      "block_name": "win dow wo",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8566.499475683064,
        "y": 195.7320383766871,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FA",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8683.502029106277,
        "y": 229.2358896150706,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FB",
      "layer": "A-Glaz",
      "block_name": "window",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8674.500326824136,
        "y": 164.2311872356195,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FC",
      "layer": "A-Glaz",
      "block_name": "Win 5FT",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8674.502029106314,
        "y": 450.7714745794385,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FD",
      "layer": "A-Glaz",
      "block_name": "w i n d ow",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8581.39493393982,
        "y": 474.7788511355695,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FE",
      "layer": "A-Glaz",
      "block_name": "Win 5FT",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8977.502029106276,
        "y": 450.7788511359292,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FF",
      "layer": "A-Glaz",
      "block_name": "window 25",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8800.490361791399,
        "y": 861.7788511355677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37200",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 852.7788511355686,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37202",
      "layer": "A-Glaz",
      "block_name": "wi n d o w",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8873.098460519948,
        "y": 804.7788511355691,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37208",
      "layer": "A-Glaz",
      "block_name": "door r f m radio mirchi",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8623.500326824145,
        "y": 195.7320383766864,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37209",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8901.002880247346,
        "y": 594.760977173087,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720A",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8566.502029106283,
        "y": 246.7538843308319,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720B",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8815.502029106296,
        "y": 483.7788511355641,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720C",
      "layer": "A-Door",
      "block_name": "dgdgd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8845.976622486189,
        "y": 801.7261108165314,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.055776221759004,
        "y": 1.055776221759004,
        "z": 1.055776221759004
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720D",
      "layer": "A-Door",
      "block_name": "dgdgd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8597.60456685125,
        "y": 195.7819924464543,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720E",
      "layer": "A-Door",
      "block_name": "gdfdrd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8710.498624541999,
        "y": 672.7788511355691,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37220",
      "layer": "A-Flor-Spcl",
      "block_name": "BATH 2",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8776.502029106294,
        "y": 852.7788511355682,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "INSERT",
        "LWPOLYLINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3722D",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8557.502029106285,
        "y": 318.7788511355704,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37234",
      "layer": "A-Door",
      "block_name": "Sliding Door - 4 Panel _AUS_ - 9_ x 7_-6_-313029-Level 2",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8562.0037313884,
        "y": 570.3777456508117,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 160,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37235",
      "layer": "A-Door",
      "block_name": "SLD 8 ft",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8515.502029106272,
        "y": 714.77885113557,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 160,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37236",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 801.7788511355691,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37237",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 672.778851137384,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376C3",
      "layer": "A-Door",
      "block_name": "door 2 6",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8809.502029106297,
        "y": 728.2901996831677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376C4",
      "layer": "A-Door",
      "block_name": "door 2 6",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8809.502029106297,
        "y": 663.7788511355691,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376E4",
      "layer": "A-Flor-Spcl",
      "block_name": "wc 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8887.847997411456,
        "y": 672.7788511362326,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376E5",
      "layer": "A-Flor-Spcl",
      "block_name": "sink 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8594.145893371075,
        "y": 229.0100852925027,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376E6",
      "layer": "A-Flor-Spcl",
      "block_name": "wc 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8650.500326824138,
        "y": 146.2311872355933,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39234",
      "layer": "A-Furn",
      "block_name": "2 seater sofa",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8556.018729760872,
        "y": 851.2673342125157,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 15,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39247",
      "layer": "A-Furn",
      "block_name": "single seater sofa",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8550.28245876477,
        "y": 807.5173342125239,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "CIRCLE",
        "LINE"
      ],
      "block_entity_count": 15,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39296",
      "layer": "A-Furn",
      "block_name": "double bed",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8746.400783656689,
        "y": 782.7901996831782,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 75,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "392F1",
      "layer": "A-Furn",
      "block_name": "carpet",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8642.400783656682,
        "y": 743.7901996831782,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39372",
      "layer": "A-Furn",
      "block_name": "Chair 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8554.071988650378,
        "y": 701.6868019002869,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "ELLIPSE",
        "LINE",
        "SPLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "393E5",
      "layer": "A-Furn",
      "block_name": "tv",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8625.696988650387,
        "y": 681.0270780877794,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39459",
      "layer": "A-Flor-Spcl",
      "block_name": "Tap set",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8889.752029106294,
        "y": 846.7788511355701,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 74,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "394D7",
      "layer": "A-Flor-Spcl",
      "block_name": "Basin",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.503759847901,
        "y": 737.2788511364762,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "INSERT",
        "LINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3956D",
      "layer": "A-Furn",
      "block_name": "3 seater sofa 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8688.560137655251,
        "y": 628.9706331620295,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 17,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "395F8",
      "layer": "A-Furn",
      "block_name": "3 seater sofa 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8688.560137655251,
        "y": 518.6370804576603,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 17,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3967B",
      "layer": "A-Furn",
      "block_name": "1 seater sofa 3",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8603.059148104141,
        "y": 535.4359276172621,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "396A7",
      "layer": "A-Furn",
      "block_name": "1 seater sofa 3",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8603.059148104156,
        "y": 612.1717860024277,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3971A",
      "layer": "A-Furn",
      "block_name": "tv",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8761.622419288644,
        "y": 599.5087625597388,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39796",
      "layer": "A-Furn",
      "block_name": "dressing stool",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8856.431969145071,
        "y": 637.3432003016477,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE"
      ],
      "block_entity_count": 6,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39813",
      "layer": "A-Furn",
      "block_name": "dressing table",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8812.502029106286,
        "y": 648.7788511355456,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 6,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3986C",
      "layer": "A-Flor-Appl",
      "block_name": "walk in closet",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 9040.559339271747,
        "y": 663.7788511381631,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 72,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39A0F",
      "layer": "A-Furn",
      "block_name": "double bedd",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8359.502029106281,
        "y": 357.7788511355702,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE",
        "SPLINE"
      ],
      "block_entity_count": 222,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B67",
      "layer": "A-Furn",
      "block_name": "Chair 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8525.657872216972,
        "y": 206.6459471289015,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "ELLIPSE",
        "LINE",
        "SPLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B76",
      "layer": "A-Furn",
      "block_name": "chairr",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8454.0484771462,
        "y": 220.6072508571269,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B89",
      "layer": "A-Furn",
      "block_name": "chairr",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8404.320013436023,
        "y": 220.6072508571269,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39C06",
      "layer": "A-Furn",
      "block_name": "TV cabin",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8400.15346459921,
        "y": 179.4941948009007,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 7,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39CF9",
      "layer": "A-Flor-Spcl",
      "block_name": "Tap set",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8570.953750251298,
        "y": 167.2311872356186,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 74,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39CFA",
      "layer": "A-Furn",
      "block_name": "dressing stool",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8658.128128677787,
        "y": 253.8781584247328,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE"
      ],
      "block_entity_count": 6,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39D80",
      "layer": "A-Flor-Appl",
      "block_name": "Storage",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 8566.502029106286,
        "y": 311.2788511355703,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 16,
      "attributes": []
    }
  ],
  "minserts": [],
  "dimensions": [
    {
      "entity_type": "DIMENSION",
      "handle": "37240",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8557.502029106281,
        "y": 56.93677978833551,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8326.50032682415,
        "y": 168.7379963641819,
        "z": 0.0
      },
      "def_point3": {
        "x": 8557.502029106281,
        "y": 132.7311872356193,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37241",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8683.50202910628,
        "y": 56.93677978833551,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8557.502029106281,
        "y": 132.7311872356193,
        "z": 0.0
      },
      "def_point3": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37242",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8809.506568525321,
        "y": 56.93677978833551,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      },
      "def_point3": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37243",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8986.502029106281,
        "y": 56.93677978833551,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      },
      "def_point3": {
        "x": 8986.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37244",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 9049.55933927167,
        "y": 56.93677978833551,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8986.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      },
      "def_point3": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37245",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 9049.55933927167,
        "y": 29.2266319983068,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8326.500326824153,
        "y": 168.7379963641832,
        "z": 0.0
      },
      "def_point3": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3724B",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8437.476494874161,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8326.500326824153,
        "y": 366.7788511355714,
        "z": 0.0
      },
      "def_point3": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3724C",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8506.502029106285,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "def_point3": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3724D",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8551.502029106285,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "def_point3": {
        "x": 8551.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3724E",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8731.502029106285,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8551.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      },
      "def_point3": {
        "x": 8731.502029106285,
        "y": 885.7788511355517,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3724F",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8950.5037598479,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8731.502029106285,
        "y": 885.7788511355517,
        "z": 0.0
      },
      "def_point3": {
        "x": 8950.5037598479,
        "y": 861.7788511355667,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37250",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 9049.559339271707,
        "y": 968.0178894266468,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8950.5037598479,
        "y": 861.7788511355667,
        "z": 0.0
      },
      "def_point3": {
        "x": 9049.559339271707,
        "y": 672.7788511381698,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37254",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 132.7311872356196,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8800.561608981223,
        "y": 111.7226758237031,
        "z": 0.0
      },
      "def_point3": {
        "x": 8557.502029106281,
        "y": 132.7311872356195,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37255",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 168.7379963641832,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8557.502029106281,
        "y": 132.7311872356195,
        "z": 0.0
      },
      "def_point3": {
        "x": 8326.500326824153,
        "y": 168.7379963641832,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37256",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 366.7788511355707,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8326.500326824153,
        "y": 168.7379963641832,
        "z": 0.0
      },
      "def_point3": {
        "x": 8326.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37257",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 474.7788511355694,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8326.500326824149,
        "y": 366.7788511355706,
        "z": 0.0
      },
      "def_point3": {
        "x": 8437.476494874163,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37258",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8437.476494874163,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point3": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37259",
      "layer": "A-Anno-Dims",
      "def_point": {
        "x": 8173.027735973157,
        "y": 861.7788511355681,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8437.476494874161,
        "y": 672.7788511355694,
        "z": 0.0
      },
      "def_point3": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725A",
      "layer": "A-Anno-Dims",
      "text": "",
      "insertion_point": null,
      "def_point2": {
        "x": 8506.502029106285,
        "y": 861.778851135568,
        "z": 0.0
      },
      "def_point3": {
        "x": 8551.502029106285,
        "y": 885.7788511355653,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725B",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 257.2601260320169,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      },
      "def_point3": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725C",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 348.7788511339053,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8809.506568525321,
        "y": 257.260126032017,
        "z": 0.0
      },
      "def_point3": {
        "x": 8986.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725D",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8986.502029106281,
        "y": 348.7788511339054,
        "z": 0.0
      },
      "def_point3": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725E",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 672.7788511381698,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 9049.55933927167,
        "y": 474.7788511355693,
        "z": 0.0
      },
      "def_point3": {
        "x": 9049.559339271707,
        "y": 672.7788511381698,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "3725F",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 861.7788511355666,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 9049.559339271707,
        "y": 672.7788511381698,
        "z": 0.0
      },
      "def_point3": {
        "x": 8950.5037598479,
        "y": 861.7788511355667,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37260",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9228.697677267688,
        "y": 885.7788511355516,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8950.5037598479,
        "y": 861.7788511355667,
        "z": 0.0
      },
      "def_point3": {
        "x": 8731.502029106285,
        "y": 885.7788511355517,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    },
    {
      "entity_type": "DIMENSION",
      "handle": "37261",
      "layer": "A-Anno-Dims",
      "dim_type": 32,
      "def_point": {
        "x": 9258.06970838667,
        "y": 885.7720420057926,
        "z": 0.0
      },
      "text": "",
      "dim_style": "Standard 360",
      "text_mid_point": null,
      "insertion_point": null,
      "def_point2": {
        "x": 8683.50202910628,
        "y": 132.7311872356192,
        "z": 0.0
      },
      "def_point3": {
        "x": 8731.502029106285,
        "y": 885.7720420057927,
        "z": 0.0
      },
      "def_point4": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      }
    }
  ],
  "hatches": [
    {
      "entity_type": "HATCH",
      "handle": "36D30",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 45.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 8326.500326824154,
              "y": 348.77885113556
            },
            {
              "x": 8326.500326824149,
              "y": 366.7788511355706
            },
            {
              "x": 8335.500326824149,
              "y": 366.7788511355706
            },
            {
              "x": 8350.50032682415,
              "y": 366.7788511355706
            },
            {
              "x": 8383.500326824149,
              "y": 366.7788511355706
            },
            {
              "x": 8419.504866243191,
              "y": 366.7788511355703
            },
            {
              "x": 8497.497489687234,
              "y": 366.7788511355706
            },
            {
              "x": 8533.502029106274,
              "y": 366.7788511355706
            },
            {
              "x": 8566.502029106281,
              "y": 366.7788511355706
            },
            {
              "x": 8659.502029106281,
              "y": 366.7788511355705
            },
            {
              "x": 8674.50202910629,
              "y": 366.7788511355707
            },
            {
              "x": 8674.502029106292,
              "y": 366.7978623687927
            },
            {
              "x": 8674.502029106314,
              "y": 390.7448054927477
            },
            {
              "x": 8302.500326824145,
              "y": 390.7448054927477
            },
            {
              "x": 8224.502029106283,
              "y": 390.7788511355706
            },
            {
              "x": 8224.502029106283,
              "y": 267.7584237498764
            },
            {
              "x": 8326.50032682415,
              "y": 267.758423749873
            }
          ]
        }
      ]
    },
    {
      "entity_type": "HATCH",
      "handle": "36D31",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 45.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 8326.50032682415,
              "y": 267.7379963641836
            },
            {
              "x": 8302.500326824147,
              "y": 267.7379963641836
            },
            {
              "x": 8224.502029106283,
              "y": 267.7584237498764
            },
            {
              "x": 8224.502029106285,
              "y": 144.7379963641824
            },
            {
              "x": 8533.508836303548,
              "y": 144.7379963641823
            },
            {
              "x": 8557.502029106281,
              "y": 168.7379963641824
            },
            {
              "x": 8533.502029106274,
              "y": 168.7379963641819
            },
            {
              "x": 8497.497489687234,
              "y": 168.7379963641828
            },
            {
              "x": 8419.50486624319,
              "y": 168.7379963641808
            },
            {
              "x": 8383.50032682415,
              "y": 168.7379963641827
            },
            {
              "x": 8350.500326824153,
              "y": 168.7379963641824
            },
            {
              "x": 8335.500326824149,
              "y": 168.7379963641824
            },
            {
              "x": 8326.50032682415,
              "y": 168.7379963641819
            },
            {
              "x": 8326.50032682415,
              "y": 186.7379963641786
            }
          ]
        }
      ]
    },
    {
      "entity_type": "HATCH",
      "handle": "36D32",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 135.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 9073.559339271675,
              "y": 663.7788511355687
            },
            {
              "x": 9049.559339271706,
              "y": 663.7788511355687
            },
            {
              "x": 9049.55933927167,
              "y": 474.7788511355693
            },
            {
              "x": 9073.55933927167,
              "y": 450.7788511346148
            }
          ]
        }
      ]
    },
    {
      "entity_type": "HATCH",
      "handle": "36D33",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 45.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 9049.55933927167,
              "y": 474.7788511355693
            },
            {
              "x": 8986.502029106276,
              "y": 474.7788511355697
            },
            {
              "x": 8986.502029106286,
              "y": 450.7788511346152
            },
            {
              "x": 9073.55933927167,
              "y": 450.7788511346148
            }
          ]
        }
      ]
    },
    {
      "entity_type": "HATCH",
      "handle": "36D52",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 135.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 9073.538437173018,
              "y": 366.7856602632932
            },
            {
              "x": 8986.50202910627,
              "y": 366.7856602632536
            },
            {
              "x": 8986.50202910628,
              "y": 348.7788511339054
            },
            {
              "x": 8925.02448884499,
              "y": 348.7788511339054
            },
            {
              "x": 8925.024488844989,
              "y": 87.72948495347278
            },
            {
              "x": 9073.538437173018,
              "y": 87.72948495347276
            }
          ]
        },
        {
          "type": "1",
          "vertices": [
            {
              "x": 8925.024488844992,
              "y": 348.7788511339054
            },
            {
              "x": 8851.502029106281,
              "y": 348.7788511339054
            },
            {
              "x": 8851.502029106281,
              "y": 357.7788511355687
            },
            {
              "x": 8809.506568525325,
              "y": 357.7788511355687
            },
            {
              "x": 8809.50656852532,
              "y": 257.260126032017
            },
            {
              "x": 8776.510540516963,
              "y": 257.260126032017
            },
            {
              "x": 8776.510540516963,
              "y": 87.72948495347279
            },
            {
              "x": 8925.024488844989,
              "y": 87.72948495347278
            }
          ]
        }
      ]
    },
    {
      "entity_type": "HATCH",
      "handle": "36D68",
      "layer": "A-Roof_Pat",
      "pattern_name": "ANSI31",
      "solid_fill": false,
      "pattern_scale": 50.0,
      "pattern_angle": 45.0,
      "elevation": 0.0,
      "boundaries": [
        {
          "type": "1",
          "vertices": [
            {
              "x": 8707.50202910628,
              "y": 233.2499123391699
            },
            {
              "x": 8776.510540516963,
              "y": 233.24991233917
            },
            {
              "x": 8776.510540516963,
              "y": 257.260126032017
            },
            {
              "x": 8755.506568525321,
              "y": 257.2601260320171
            },
            {
              "x": 8695.491815413068,
              "y": 257.2601260320153
            },
            {
              "x": 8683.50202910628,
              "y": 257.2601260320166
            },
            {
              "x": 8683.502029106277,
              "y": 228.7320383766852
            },
            {
              "x": 8683.502029106277,
              "y": 193.2313501960311
            },
            {
              "x": 8683.502029106281,
              "y": 164.2311872356192
            },
            {
              "x": 8683.500326824134,
              "y": 164.2311872356192
            },
            {
              "x": 8683.500326824134,
              "y": 146.2311872356192
            },
            {
              "x": 8683.50202910628,
              "y": 146.2311872356192
            },
            {
              "x": 8683.50202910628,
              "y": 132.7311872356192
            },
            {
              "x": 8664.470117212677,
              "y": 132.731187235619
            },
            {
              "x": 8664.470117212677,
              "y": 129.7311872356194
            },
            {
              "x": 8665.470117212675,
              "y": 129.7311872356194
            },
            {
              "x": 8665.470117212675,
              "y": 128.7311872356194
            },
            {
              "x": 8641.470117212686,
              "y": 128.7311872356194
            },
            {
              "x": 8641.470117212686,
              "y": 129.7311872356194
            },
            {
              "x": 8642.470117212684,
              "y": 129.7311872356194
            },
            {
              "x": 8642.470117212684,
              "y": 132.731187235619
            },
            {
              "x": 8631.502029106266,
              "y": 132.731187235619
            },
            {
              "x": 8631.502029106266,
              "y": 129.7311872356194
            },
            {
              "x": 8632.502029106265,
              "y": 129.7311872356194
            },
            {
              "x": 8632.502029106265,
              "y": 128.7311872356194
            },
            {
              "x": 8620.50202910628,
              "y": 128.7311872356194
            },
            {
              "x": 8620.50202910628,
              "y": 108.7311872356194
            },
            {
              "x": 8707.50202910628,
              "y": 108.7311872356192
            }
          ]
        },
        {
          "type": "1",
          "vertices": [
            {
              "x": 8620.50202910628,
              "y": 128.7311872356194
            },
            {
              "x": 8608.502029106276,
              "y": 128.7311872356194
            },
            {
              "x": 8608.502029106276,
              "y": 129.7311872356194
            },
            {
              "x": 8609.502029106276,
              "y": 129.7311872356194
            },
            {
              "x": 8609.502029106276,
              "y": 132.7311872356189
            },
            {
              "x": 8598.16394099986,
              "y": 132.731187235619
            },
            {
              "x": 8598.16394099986,
              "y": 129.7311872356194
            },
            {
              "x": 8599.163940999859,
              "y": 129.7311872356194
            },
            {
              "x": 8599.163940999859,
              "y": 128.7311872356194
            },
            {
              "x": 8575.53394099987,
              "y": 128.7311872356194
            },
            {
              "x": 8575.53394099987,
              "y": 129.7311872356194
            },
            {
              "x": 8576.533940999867,
              "y": 129.7311872356194
            },
            {
              "x": 8576.533940999869,
              "y": 132.7311872356198
            },
            {
              "x": 8557.502029106281,
              "y": 132.7311872356195
            },
            {
              "x": 8557.502029106281,
              "y": 168.7379963641824
            },
            {
              "x": 8533.502029106281,
              "y": 144.7311872356201
            },
            {
              "x": 8533.50202910628,
              "y": 108.7311872356195
            },
            {
              "x": 8620.50202910628,
              "y": 108.7311872356194
            }
          ]
        }
      ]
    }
  ],
  "leaders": [
    {
      "entity_type": "LEADER",
      "handle": "371DD",
      "layer": "A-Anno-Text",
      "style": "",
      "arrow_head": true,
      "vertices": [
        [
          8260.261792895471,
          337.0671215546658,
          0.0
        ],
        [
          8260.261792895471,
          297.1369178770742,
          0.0
        ]
      ]
    },
    {
      "entity_type": "LEADER",
      "handle": "371DE",
      "layer": "A-Anno-Text",
      "style": "",
      "arrow_head": true,
      "vertices": [
        [
          8260.261792895471,
          198.408871173645,
          0.0
        ],
        [
          8260.261792895471,
          238.3390748512366,
          0.0
        ]
      ]
    }
  ],
  "tables": [],
  "images": [],
  "solids": [],
  "xlines": [],
  "mlines": [],
  "tolerances": [],
  "door_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "EC15",
      "layer": "0",
      "block_name": "door",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 0.0,
        "y": 0.0,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [],
      "block_entity_count": 0,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37208",
      "layer": "A-Glaz",
      "block_name": "door r f m radio mirchi",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8623.500326824145,
        "y": 195.7320383766864,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37209",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8901.002880247346,
        "y": 594.760977173087,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720A",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8566.502029106283,
        "y": 246.7538843308319,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720B",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8815.502029106296,
        "y": 483.7788511355641,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720C",
      "layer": "A-Door",
      "block_name": "dgdgd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8845.976622486189,
        "y": 801.7261108165314,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.055776221759004,
        "y": 1.055776221759004,
        "z": 1.055776221759004
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720D",
      "layer": "A-Door",
      "block_name": "dgdgd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8597.60456685125,
        "y": 195.7819924464543,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3720E",
      "layer": "A-Door",
      "block_name": "gdfdrd",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8710.498624541999,
        "y": 672.7788511355691,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3722D",
      "layer": "A-Door",
      "block_name": "d ii ro",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8557.502029106285,
        "y": 318.7788511355704,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 4,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37234",
      "layer": "A-Door",
      "block_name": "Sliding Door - 4 Panel _AUS_ - 9_ x 7_-6_-313029-Level 2",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8562.0037313884,
        "y": 570.3777456508117,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 160,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37235",
      "layer": "A-Door",
      "block_name": "SLD 8 ft",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8515.502029106272,
        "y": 714.77885113557,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 160,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376C3",
      "layer": "A-Door",
      "block_name": "door 2 6",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8809.502029106297,
        "y": 728.2901996831677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376C4",
      "layer": "A-Door",
      "block_name": "door 2 6",
      "category": "door",
      "is_anonymous_block": false,
      "position": {
        "x": 8809.502029106297,
        "y": 663.7788511355691,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 5,
      "attributes": []
    }
  ],
  "window_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "371F1",
      "layer": "A-Glaz",
      "block_name": "window 11",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8497.497489687234,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F2",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8383.37257227921,
        "y": 177.7379963641808,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F3",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8497.443016658723,
        "y": 177.7379963641831,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F4",
      "layer": "A-Glaz",
      "block_name": "window 5ft",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8695.491815413068,
        "y": 257.2601260320155,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F5",
      "layer": "A-Glaz",
      "block_name": "win dow jjj",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8596.50202910629,
        "y": 861.7788511355677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F6",
      "layer": "A-Glaz",
      "block_name": "window 5st",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8581.502029106281,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F7",
      "layer": "A-Glaz",
      "block_name": "window 11",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8383.500326824149,
        "y": 357.7788511355709,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F8",
      "layer": "A-Glaz",
      "block_name": "window block",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8326.50032682416,
        "y": 308.3930722969142,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371F9",
      "layer": "A-Glaz",
      "block_name": "win dow wo",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8566.499475683064,
        "y": 195.7320383766871,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FA",
      "layer": "A-Glaz",
      "block_name": "window 9",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8683.502029106277,
        "y": 229.2358896150706,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FB",
      "layer": "A-Glaz",
      "block_name": "window",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8674.500326824136,
        "y": 164.2311872356195,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FC",
      "layer": "A-Glaz",
      "block_name": "Win 5FT",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8674.502029106314,
        "y": 450.7714745794385,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FE",
      "layer": "A-Glaz",
      "block_name": "Win 5FT",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8977.502029106276,
        "y": 450.7788511359292,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "371FF",
      "layer": "A-Glaz",
      "block_name": "window 25",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8800.490361791399,
        "y": 861.7788511355677,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37200",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 852.7788511355686,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37236",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 801.7788511355691,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "37237",
      "layer": "A-Glaz",
      "block_name": "window ee e e",
      "category": "window",
      "is_anonymous_block": false,
      "position": {
        "x": 8941.5037598479,
        "y": 672.778851137384,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 12,
      "attributes": []
    }
  ],
  "furniture_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "376E4",
      "layer": "A-Flor-Spcl",
      "block_name": "wc 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8887.847997411456,
        "y": 672.7788511362326,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376E5",
      "layer": "A-Flor-Spcl",
      "block_name": "sink 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8594.145893371075,
        "y": 229.0100852925027,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 8,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "376E6",
      "layer": "A-Flor-Spcl",
      "block_name": "wc 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8650.500326824138,
        "y": 146.2311872355933,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39234",
      "layer": "A-Furn",
      "block_name": "2 seater sofa",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8556.018729760872,
        "y": 851.2673342125157,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 15,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39247",
      "layer": "A-Furn",
      "block_name": "single seater sofa",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8550.28245876477,
        "y": 807.5173342125239,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "CIRCLE",
        "LINE"
      ],
      "block_entity_count": 15,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39296",
      "layer": "A-Furn",
      "block_name": "double bed",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8746.400783656689,
        "y": 782.7901996831782,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 75,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39372",
      "layer": "A-Furn",
      "block_name": "Chair 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8554.071988650378,
        "y": 701.6868019002869,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "ELLIPSE",
        "LINE",
        "SPLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "393E5",
      "layer": "A-Furn",
      "block_name": "tv",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8625.696988650387,
        "y": 681.0270780877794,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3956D",
      "layer": "A-Furn",
      "block_name": "3 seater sofa 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8688.560137655251,
        "y": 628.9706331620295,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 17,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "395F8",
      "layer": "A-Furn",
      "block_name": "3 seater sofa 2",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8688.560137655251,
        "y": 518.6370804576603,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 17,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3967B",
      "layer": "A-Furn",
      "block_name": "1 seater sofa 3",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8603.059148104141,
        "y": 535.4359276172621,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "396A7",
      "layer": "A-Furn",
      "block_name": "1 seater sofa 3",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8603.059148104156,
        "y": 612.1717860024277,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 13,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3971A",
      "layer": "A-Furn",
      "block_name": "tv",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8761.622419288644,
        "y": 599.5087625597388,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39813",
      "layer": "A-Furn",
      "block_name": "dressing table",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8812.502029106286,
        "y": 648.7788511355456,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 6,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39A0F",
      "layer": "A-Furn",
      "block_name": "double bedd",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8359.502029106281,
        "y": 357.7788511355702,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE",
        "SPLINE"
      ],
      "block_entity_count": 222,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B67",
      "layer": "A-Furn",
      "block_name": "Chair 1",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8525.657872216972,
        "y": 206.6459471289015,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "ARC",
        "ELLIPSE",
        "LINE",
        "SPLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B76",
      "layer": "A-Furn",
      "block_name": "chairr",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8454.0484771462,
        "y": 220.6072508571269,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39B89",
      "layer": "A-Furn",
      "block_name": "chairr",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8404.320013436023,
        "y": 220.6072508571269,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": -1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39C06",
      "layer": "A-Furn",
      "block_name": "TV cabin",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 8400.15346459921,
        "y": 179.4941948009007,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 1.0,
        "y": 1.0,
        "z": 1.0
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 7,
      "attributes": []
    }
  ],
  "stair_inserts": []
}