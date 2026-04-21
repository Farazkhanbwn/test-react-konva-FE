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
  x: number;
  y: number;
  z: number;
}

/** RGBA colour from ezdxf — either ACI index (0-256) or true-color hex string "#RRGGBB". */
export type DxfColor = number | string | null;

/** Common header every entity must have. */
export interface DxfEntityBase {
  entity_type: string;
  handle: string;
  layer: string;
  /** ACI colour index (256 = BYLAYER, 0 = BYBLOCK). Optional — fall back to layer colour. */
  color?: DxfColor;
  /** True-colour override as "#RRGGBB" if set. */
  true_color?: string | null;
  /** Line-type name ("ByLayer", "Continuous", "DASHED", …). */
  linetype?: string | null;
  /** Line-type scale multiplier. */
  ltscale?: number;
  /** Line-weight in hundredths of a mm (-3 = ByLayer, -2 = ByBlock). */
  lineweight?: number;
  /** Transparency 0–100 (0 = opaque). */
  transparency?: number;
  /** True when entity is on a frozen or off layer. Canvas can skip or dim it. */
  is_visible?: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════
   1.  GEOMETRY — simple primitives
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfLine extends DxfEntityBase {
  entity_type: "LINE";
  start: DxfPoint;
  end: DxfPoint;
  extrusion?: DxfPoint;
}

export interface DxfCircle extends DxfEntityBase {
  entity_type: "CIRCLE";
  center: DxfPoint;
  radius: number;
  extrusion?: DxfPoint;
}

export interface DxfArc extends DxfEntityBase {
  entity_type: "ARC";
  center: DxfPoint;
  radius: number;
  start_angle: number;
  end_angle: number;
  extrusion?: DxfPoint;
}

export interface DxfEllipse extends DxfEntityBase {
  entity_type: "ELLIPSE";
  center: DxfPoint;
  major_axis: DxfPoint;
  ratio: number;
  start_param: number;
  end_param: number;
  extrusion?: DxfPoint;
}

export interface DxfPoint_Entity extends DxfEntityBase {
  entity_type: "POINT";
  location: DxfPoint;
  extrusion?: DxfPoint;
}

export interface DxfSpline extends DxfEntityBase {
  entity_type: "SPLINE";
  degree: number;
  closed: boolean;
  knots: number[];
  control_points: DxfPoint[];
  fit_points: DxfPoint[];
  weights: number[];
  tessellation?: DxfPoint[];
}

/* ══════════════════════════════════════════════════════════════════════════
   2.  POLYLINES
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfPolylineVertex {
  x: number;
  y: number;
  z: number;
  bulge: number;
  start_width?: number;
  end_width?: number;
}

export interface DxfPolyline extends DxfEntityBase {
  entity_type: "LWPOLYLINE" | "POLYLINE";
  closed: boolean;
  vertex_count: number;
  vertices: DxfPolylineVertex[];
  const_width?: number;
  elevation?: number;
  extrusion?: DxfPoint;
}

/* ══════════════════════════════════════════════════════════════════════════
   3.  TEXT
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfText extends DxfEntityBase {
  entity_type: "TEXT" | "MTEXT";
  text: string;
  position: DxfPoint;
  height: number;
  rotation?: number;
  style?: string;
  halign?: number;
  valign?: number;
  attachment?: number;
  ref_width?: number;
  flow_direction?: number;
  text_direction?: DxfPoint;
  line_spacing?: number;
}

export interface DxfAttrib extends DxfEntityBase {
  entity_type: "ATTRIB";
  tag: string;
  text: string;
  position: DxfPoint;
  height: number;
  rotation?: number;
  style?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   4.  DIMENSIONS
   ══════════════════════════════════════════════════════════════════════════ */

export type DxfDimSubtype =
  | "LINEAR"
  | "ALIGNED"
  | "ANGULAR"
  | "ANGULAR_3P"
  | "DIAMETER"
  | "RADIUS"
  | "ORDINATE"
  | "ARC_LENGTH";

export interface DxfDimension extends DxfEntityBase {
  entity_type: "DIMENSION";
  subtype: DxfDimSubtype;
  text: string;
  text_midpoint: DxfPoint;
  dimension_style: string;
  actual_measurement: number | null;
  defpoints: DxfPoint[];
  geometry_block?: string;
  dim_lines?: Array<{ start: DxfPoint; end: DxfPoint }>;
  dim_arcs?: Array<{
    center: DxfPoint;
    radius: number;
    start_angle: number;
    end_angle: number;
  }>;
  dim_texts?: Array<{
    text: string;
    position: DxfPoint;
    height: number;
    rotation: number;
  }>;
}

/* ══════════════════════════════════════════════════════════════════════════
   5.  HATCH
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfHatchEdge {
  type: "LINE" | "ARC" | "ELLIPSE" | "SPLINE";
  start?: DxfPoint;
  end?: DxfPoint;
  center?: DxfPoint;
  radius?: number;
  start_angle?: number;
  end_angle?: number;
  is_ccw?: boolean;
  major_axis_end?: DxfPoint;
  minor_to_major?: number;
  ellipse_start_angle?: number;
  ellipse_end_angle?: number;
  degree?: number;
  spline_knots?: number[];
  spline_control_pts?: DxfPoint[];
  spline_fit_pts?: DxfPoint[];
}

export interface DxfHatchBoundary {
  type: "POLYLINE" | "EDGE";
  is_outer: boolean;
  vertices?: DxfPolylineVertex[];
  edges?: DxfHatchEdge[];
}

export interface DxfHatch extends DxfEntityBase {
  entity_type: "HATCH";
  pattern_name: string;
  solid_fill: boolean;
  associative: boolean;
  boundaries: DxfHatchBoundary[];
  pattern_angle?: number;
  pattern_scale?: number;
  pattern_double?: boolean;
  gradient?: {
    name: string;
    color1: DxfColor;
    color2: DxfColor;
    angle: number;
    centered: boolean;
    tint: number;
  } | null;
  elevation?: number;
  extrusion?: DxfPoint;
}

/* ══════════════════════════════════════════════════════════════════════════
   6.  INSERTS (block references)
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfInsertScale {
  x: number;
  y: number;
  z: number;
}

export interface DxfInsert extends DxfEntityBase {
  entity_type: "INSERT";
  block_name: string;
  category: string;
  is_anonymous_block: boolean;
  position: DxfPoint;
  rotation: number;
  scale: DxfInsertScale;
  block_entity_types: string[];
  block_entity_count: number;
  attributes: DxfAttrib[];
  geometry?: {
    lines?: Array<{
      start: DxfPoint;
      end: DxfPoint;
      color?: DxfColor;
      layer?: string;
    }>;
    arcs?: Array<{
      center: DxfPoint;
      radius: number;
      start_angle: number;
      end_angle: number;
      color?: DxfColor;
      layer?: string;
    }>;
    circles?: Array<{
      center: DxfPoint;
      radius: number;
      color?: DxfColor;
      layer?: string;
    }>;
    polylines?: Array<{
      vertices: DxfPolylineVertex[];
      closed: boolean;
      color?: DxfColor;
      layer?: string;
    }>;
    texts?: Array<{
      text: string;
      position: DxfPoint;
      height: number;
      rotation: number;
      color?: DxfColor;
      layer?: string;
    }>;
    splines?: Array<{
      tessellation: DxfPoint[];
      color?: DxfColor;
      layer?: string;
    }>;
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   7.  LEADERS / MLEADER / TOLERANCE
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfLeader extends DxfEntityBase {
  entity_type: "LEADER";
  vertices: DxfPoint[];
  has_arrowhead: boolean;
  leader_style: number;
  annotation?: {
    type: "MTEXT" | "TOLERANCE" | "INSERT";
    text?: string;
    position?: DxfPoint;
  };
}

export interface DxfMLeaderLine {
  vertices: DxfPoint[];
  break_points?: DxfPoint[];
}

export interface DxfMLeader extends DxfEntityBase {
  entity_type: "MLEADER";
  leader_lines: DxfMLeaderLine[];
  dogleg_length: number;
  dogleg_vector: DxfPoint;
  landing_point: DxfPoint;
  content_type: 0 | 1 | 2;
  mtext?: {
    text: string;
    position: DxfPoint;
    height: number;
    rotation: number;
    style: string;
    attachment: number;
  };
  block_content?: {
    block_name: string;
    position: DxfPoint;
    scale: DxfInsertScale;
    rotation: number;
    color: DxfColor;
  };
  style: string;
  arrowhead_size: number;
  has_dogleg: boolean;
}

export interface DxfTolerance extends DxfEntityBase {
  entity_type: "TOLERANCE";
  string: string;
  insertion_point: DxfPoint;
  x_direction: DxfPoint;
  dimension_style: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   8.  SOLID, TRACE (filled 2D quads)
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfSolid extends DxfEntityBase {
  entity_type: "SOLID" | "TRACE";
  points: [DxfPoint, DxfPoint, DxfPoint, DxfPoint];
  elevation?: number;
  extrusion?: DxfPoint;
}

/* ══════════════════════════════════════════════════════════════════════════
   9.  IMAGE reference
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfImage extends DxfEntityBase {
  entity_type: "IMAGE";
  image_path: string;
  insert: DxfPoint;
  u_vector: DxfPoint;
  v_vector: DxfPoint;
  pixel_size: { x: number; y: number };
  clipping: boolean;
  clip_boundary?: DxfPoint[];
}

/* ══════════════════════════════════════════════════════════════════════════
   10. WIPEOUT (mask polygon)
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfWipeout extends DxfEntityBase {
  entity_type: "WIPEOUT";
  insert: DxfPoint;
  u_vector: DxfPoint;
  v_vector: DxfPoint;
  pixel_size: { x: number; y: number };
  boundary: DxfPoint[];
  show_frame: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════
   11. 3D entities (rendered as wireframe / projected)
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfFace3d extends DxfEntityBase {
  entity_type: "3DFACE";
  points: [DxfPoint, DxfPoint, DxfPoint, DxfPoint];
  invisible_edges: number;
}

export interface DxfMesh extends DxfEntityBase {
  entity_type: "MESH";
  subdivision_level: number;
  vertices: DxfPoint[];
  faces: number[][];
}

export interface DxfHelix extends DxfEntityBase {
  entity_type: "HELIX";
  tessellation: DxfPoint[];
  axis_base_point: DxfPoint;
  axis_vector: DxfPoint;
  radius: number;
  turns: number;
  turn_height: number;
  handedness: 0 | 1;
}

export interface DxfRawEntity {
  entity_type: string;
  handle: string;
  layer: string;
  raw_data?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   LAYER TABLE
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfLayerDef {
  name: string;
  color: number;
  true_color?: string;
  linetype: string;
  lineweight: number;
  plot: boolean;
  is_frozen: boolean;
  is_locked: boolean;
  description?: string;
}

/* ══════════════════════════════════════════════════════════════════════════
   BLOCK TABLE
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfBlockDef {
  name: string;
  base_point: DxfPoint;
  entity_types: string[];
  entity_count: number;
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT DOCUMENT
   ══════════════════════════════════════════════════════════════════════════ */

export interface DxfJsonDocument {
  source_file: string;
  meta: {
    acad_version: string;
    extmin: [number, number, number];
    extmax: [number, number, number];
    insunits?: number;
    measurement?: string;
  };
  stats: {
    entity_counts: Record<string, number>;
    polyline_count: number;
    line_count: number;
    arc_count: number;
    text_count: number;
    total_vertex_count: number;
    insert_count?: number;
    door_insert_count?: number;
    window_insert_count?: number;
    furniture_insert_count?: number;
    stair_insert_count?: number;
    hatch_count?: number;
    dimension_count?: number;
    spline_count?: number;
    image_count?: number;
    leader_count?: number;
  };

  layers?: DxfLayerDef[];
  block_defs?: DxfBlockDef[];

  lines: DxfLine[];
  arcs: DxfArc[];
  circles?: DxfCircle[];
  ellipses?: DxfEllipse[];
  splines?: DxfSpline[];
  points?: DxfPoint_Entity[];
  polylines: DxfPolyline[];

  texts: DxfText[];

  dimensions?: DxfDimension[];
  leaders?: DxfLeader[];
  mleaders?: DxfMLeader[];
  tolerances?: DxfTolerance[];

  hatches?: DxfHatch[];
  solids?: DxfSolid[];

  images?: DxfImage[];
  wipeouts?: DxfWipeout[];

  faces3d?: DxfFace3d[];
  meshes?: DxfMesh[];
  helices?: DxfHelix[];

  inserts: DxfInsert[];
  door_inserts: DxfInsert[];
  window_inserts: DxfInsert[];
  furniture_inserts: DxfInsert[];
  stair_inserts: DxfInsert[];

  window_lines?: DxfLine[];
  door_lines?: DxfLine[];
  furniture_lines?: DxfLine[];

  raw_entities?: DxfRawEntity[];
}

// ─── Raw compact data from dxf_converter_v5.py ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _VILLA_COMPACT: any = {
  "_stats": {
    "arcs": 7,
    "circles": 0,
    "dim_lines": 0,
    "ellipses": 0,
    "hatch_lines": 0,
    "hatches": 0,
    "lines": 12,
    "points": 0,
    "polylines": 35,
    "splines": 0,
    "texts": 7
  },
  "data": {
    "AR": [
      5,
      4884.0,
      3572.24,
      900.0,
      0.0,
      90.0,
      5,
      4634.0,
      8019.12,
      900.0,
      90.0,
      180.0,
      5,
      6034.0,
      5570.68,
      900.0,
      90.0,
      180.0,
      5,
      6034.0,
      10467.56,
      900.0,
      90.0,
      180.0,
      5,
      4884.0,
      1750.0,
      900.0,
      0.0,
      90.0,
      5,
      6330.8,
      2211.12,
      900.0,
      90.0,
      180.0,
      5,
      4861.5,
      350.0,
      945.0,
      0.0,
      90.0
    ],
    "CI": [],
    "EL": [],
    "LN": [
      4,
      350.0,
      2251.12,
      350.0,
      3071.12,
      "#00FF00",
      4,
      10318.0,
      2251.12,
      10318.0,
      3071.12,
      "#00FF00",
      4,
      350.0,
      7769.12,
      350.0,
      9169.12,
      "#00FF00",
      4,
      10318.0,
      5320.68,
      10318.0,
      6720.68,
      "#00FF00",
      4,
      10318.0,
      10217.56,
      10318.0,
      11617.56,
      "#00FF00",
      5,
      4884.0,
      3572.24,
      5784.0,
      3572.24,
      "#FFFF00",
      5,
      4634.0,
      8019.12,
      4634.0,
      8919.12,
      "#FFFF00",
      5,
      6034.0,
      5570.68,
      6034.0,
      6470.68,
      "#FFFF00",
      5,
      6034.0,
      10467.56,
      6034.0,
      11367.56,
      "#FFFF00",
      5,
      4884.0,
      1750.0,
      5784.0,
      1750.0,
      "#FFFF00",
      5,
      6330.8,
      2211.12,
      6330.8,
      3111.12,
      "#FFFF00",
      5,
      4861.5,
      350.0,
      5806.5,
      350.0,
      "#FFFF00"
    ],
    "LW": [
      [
        3,
        0,
        4389.0,
        240.0,
        0.0,
        4861.5,
        240.0,
        0.0,
        4861.5,
        460.0,
        0.0,
        4389.0,
        460.0,
        0.0,
        4389.0,
        240.0,
        0.0
      ],
      [
        3,
        0,
        5806.5,
        240.0,
        0.0,
        6279.0,
        240.0,
        0.0,
        6279.0,
        460.0,
        0.0,
        5806.5,
        460.0,
        0.0,
        5806.5,
        240.0,
        0.0
      ],
      [
        3,
        0,
        4389.0,
        1640.0,
        0.0,
        4884.0,
        1640.0,
        0.0,
        4884.0,
        1860.0,
        0.0,
        4389.0,
        1860.0,
        0.0,
        4389.0,
        1640.0,
        0.0
      ],
      [
        3,
        0,
        5784.0,
        1640.0,
        0.0,
        6279.0,
        1640.0,
        0.0,
        6279.0,
        1860.0,
        0.0,
        5784.0,
        1860.0,
        0.0,
        5784.0,
        1640.0,
        0.0
      ],
      [
        3,
        0,
        4279.0,
        350.0,
        0.0,
        4499.0,
        350.0,
        0.0,
        4499.0,
        1750.0,
        0.0,
        4279.0,
        1750.0,
        0.0,
        4279.0,
        350.0,
        0.0
      ],
      [
        3,
        0,
        6169.0,
        350.0,
        0.0,
        6389.0,
        350.0,
        0.0,
        6389.0,
        1750.0,
        0.0,
        6169.0,
        1750.0,
        0.0,
        6169.0,
        350.0,
        0.0
      ],
      [
        3,
        0,
        350.0,
        1640.0,
        0.0,
        4884.0,
        1640.0,
        0.0,
        4884.0,
        1860.0,
        0.0,
        350.0,
        1860.0,
        0.0,
        350.0,
        1640.0,
        0.0
      ],
      [
        3,
        0,
        5784.0,
        1640.0,
        0.0,
        6330.8,
        1640.0,
        0.0,
        6330.8,
        1860.0,
        0.0,
        5784.0,
        1860.0,
        0.0,
        5784.0,
        1640.0,
        0.0
      ],
      [
        3,
        0,
        350.0,
        3462.24,
        0.0,
        4884.0,
        3462.24,
        0.0,
        4884.0,
        3682.24,
        0.0,
        350.0,
        3682.24,
        0.0,
        350.0,
        3462.24,
        0.0
      ],
      [
        3,
        0,
        5784.0,
        3462.24,
        0.0,
        6330.8,
        3462.24,
        0.0,
        6330.8,
        3682.24,
        0.0,
        5784.0,
        3682.24,
        0.0,
        5784.0,
        3462.24,
        0.0
      ],
      [
        3,
        0,
        240.0,
        1750.0,
        0.0,
        460.0,
        1750.0,
        0.0,
        460.0,
        2251.12,
        0.0,
        240.0,
        2251.12,
        0.0,
        240.0,
        1750.0,
        0.0
      ],
      [
        3,
        0,
        240.0,
        3071.12,
        0.0,
        460.0,
        3071.12,
        0.0,
        460.0,
        3572.24,
        0.0,
        240.0,
        3572.24,
        0.0,
        240.0,
        3071.12,
        0.0
      ],
      [
        3,
        0,
        6220.8,
        1750.0,
        0.0,
        6440.8,
        1750.0,
        0.0,
        6440.8,
        2211.12,
        0.0,
        6220.8,
        2211.12,
        0.0,
        6220.8,
        1750.0,
        0.0
      ],
      [
        3,
        0,
        6220.8,
        3111.12,
        0.0,
        6440.8,
        3111.12,
        0.0,
        6440.8,
        3572.24,
        0.0,
        6220.8,
        3572.24,
        0.0,
        6220.8,
        3111.12,
        0.0
      ],
      [
        3,
        0,
        6330.8,
        1640.0,
        0.0,
        10318.0,
        1640.0,
        0.0,
        10318.0,
        1860.0,
        0.0,
        6330.8,
        1860.0,
        0.0,
        6330.8,
        1640.0,
        0.0
      ],
      [
        3,
        0,
        6330.8,
        3462.24,
        0.0,
        10318.0,
        3462.24,
        0.0,
        10318.0,
        3682.24,
        0.0,
        6330.8,
        3682.24,
        0.0,
        6330.8,
        3462.24,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        1750.0,
        0.0,
        10428.0,
        1750.0,
        0.0,
        10428.0,
        2251.12,
        0.0,
        10208.0,
        2251.12,
        0.0,
        10208.0,
        1750.0,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        3071.12,
        0.0,
        10428.0,
        3071.12,
        0.0,
        10428.0,
        3572.24,
        0.0,
        10208.0,
        3572.24,
        0.0,
        10208.0,
        3071.12,
        0.0
      ],
      [
        3,
        0,
        350.0,
        3462.24,
        0.0,
        4634.0,
        3462.24,
        0.0,
        4634.0,
        3682.24,
        0.0,
        350.0,
        3682.24,
        0.0,
        350.0,
        3462.24,
        0.0
      ],
      [
        3,
        0,
        350.0,
        13256.0,
        0.0,
        4634.0,
        13256.0,
        0.0,
        4634.0,
        13476.0,
        0.0,
        350.0,
        13476.0,
        0.0,
        350.0,
        13256.0,
        0.0
      ],
      [
        3,
        0,
        240.0,
        3572.24,
        0.0,
        460.0,
        3572.24,
        0.0,
        460.0,
        7769.12,
        0.0,
        240.0,
        7769.12,
        0.0,
        240.0,
        3572.24,
        0.0
      ],
      [
        3,
        0,
        240.0,
        9169.12,
        0.0,
        460.0,
        9169.12,
        0.0,
        460.0,
        13366.0,
        0.0,
        240.0,
        13366.0,
        0.0,
        240.0,
        9169.12,
        0.0
      ],
      [
        3,
        0,
        4524.0,
        3572.24,
        0.0,
        4744.0,
        3572.24,
        0.0,
        4744.0,
        8019.12,
        0.0,
        4524.0,
        8019.12,
        0.0,
        4524.0,
        3572.24,
        0.0
      ],
      [
        3,
        0,
        4524.0,
        8919.12,
        0.0,
        4744.0,
        8919.12,
        0.0,
        4744.0,
        13366.0,
        0.0,
        4524.0,
        13366.0,
        0.0,
        4524.0,
        8919.12,
        0.0
      ],
      [
        3,
        0,
        6034.0,
        3462.24,
        0.0,
        10318.0,
        3462.24,
        0.0,
        10318.0,
        3682.24,
        0.0,
        6034.0,
        3682.24,
        0.0,
        6034.0,
        3462.24,
        0.0
      ],
      [
        3,
        0,
        6034.0,
        8359.12,
        0.0,
        10318.0,
        8359.12,
        0.0,
        10318.0,
        8579.12,
        0.0,
        6034.0,
        8579.12,
        0.0,
        6034.0,
        8359.12,
        0.0
      ],
      [
        3,
        0,
        5924.0,
        3572.24,
        0.0,
        6144.0,
        3572.24,
        0.0,
        6144.0,
        5570.68,
        0.0,
        5924.0,
        5570.68,
        0.0,
        5924.0,
        3572.24,
        0.0
      ],
      [
        3,
        0,
        5924.0,
        6470.68,
        0.0,
        6144.0,
        6470.68,
        0.0,
        6144.0,
        8469.12,
        0.0,
        5924.0,
        8469.12,
        0.0,
        5924.0,
        6470.68,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        3572.24,
        0.0,
        10428.0,
        3572.24,
        0.0,
        10428.0,
        5320.68,
        0.0,
        10208.0,
        5320.68,
        0.0,
        10208.0,
        3572.24,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        6720.68,
        0.0,
        10428.0,
        6720.68,
        0.0,
        10428.0,
        8469.12,
        0.0,
        10208.0,
        8469.12,
        0.0,
        10208.0,
        6720.68,
        0.0
      ],
      [
        3,
        0,
        6034.0,
        13256.0,
        0.0,
        10318.0,
        13256.0,
        0.0,
        10318.0,
        13476.0,
        0.0,
        6034.0,
        13476.0,
        0.0,
        6034.0,
        13256.0,
        0.0
      ],
      [
        3,
        0,
        5924.0,
        8469.12,
        0.0,
        6144.0,
        8469.12,
        0.0,
        6144.0,
        10467.56,
        0.0,
        5924.0,
        10467.56,
        0.0,
        5924.0,
        8469.12,
        0.0
      ],
      [
        3,
        0,
        5924.0,
        11367.56,
        0.0,
        6144.0,
        11367.56,
        0.0,
        6144.0,
        13366.0,
        0.0,
        5924.0,
        13366.0,
        0.0,
        5924.0,
        11367.56,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        8469.12,
        0.0,
        10428.0,
        8469.12,
        0.0,
        10428.0,
        10217.56,
        0.0,
        10208.0,
        10217.56,
        0.0,
        10208.0,
        8469.12,
        0.0
      ],
      [
        3,
        0,
        10208.0,
        11617.56,
        0.0,
        10428.0,
        11617.56,
        0.0,
        10428.0,
        13366.0,
        0.0,
        10208.0,
        13366.0,
        0.0,
        10208.0,
        11617.56,
        0.0
      ]
    ],
    "TX": [
      [
        2,
        5334.0,
        1050.0,
        13.0,
        "ENTRY FOYER",
        "#1A1A2E"
      ],
      [
        2,
        3340.4,
        2661.12,
        13.0,
        "LIVING ROOM",
        "#1A1A2E"
      ],
      [
        2,
        8324.4,
        2661.12,
        13.0,
        "KITCHEN",
        "#1A1A2E"
      ],
      [
        2,
        5334.0,
        8469.12,
        13.0,
        "HALLWAY",
        "#1A1A2E"
      ],
      [
        2,
        2492.0,
        8469.12,
        13.0,
        "BEDROOM",
        "#1A1A2E"
      ],
      [
        2,
        8176.0,
        6020.68,
        13.0,
        "BATHROOM",
        "#1A1A2E"
      ],
      [
        2,
        8176.0,
        10917.56,
        13.0,
        "BEDROOM",
        "#1A1A2E"
      ]
    ]
  },
  "layers": [
    "0:#FFFFFF:Continuous:1",
    "TEFRIS:#FF00FF:Continuous:1",
    "mahal:#FF0000:Continuous:1",
    "duv:#2DB7E5:Continuous:1",
    "PENCERE:#00FF00:Continuous:1",
    "KAPI:#FFFF00:Continuous:1"
  ],
  "meta": {
    "acad": "R2000",
    "units": 4,
    "bbox": {
      "max": [
        -1e+20,
        -1e+20
      ],
      "min": [
        1e+20,
        1e+20
      ]
    }
  },
  "src": "generated_from_text.dxf",
  "v": "7.0"
};

// ─── Shared flat-array parsers ───────────────────────────────────────────────

/** Parse "LayerName:colorHex" → { name, color (as integer for compat) } */
function _parseLayers(
  arr: string[],
): Array<{
  name: string;
  color: number;
  _hex: string;
  _visible: boolean;
  _linetype: string;
}> {
  return arr.map((s) => {
    const parts = s.split(":");
    // parts: [name, colorHex, linetype, visible]
    // Note: layer name itself may contain colons (rare), so take first part as name
    // and last 3 as the fixed trailing fields
    const visible = parts[parts.length - 1];
    const linetype = parts[parts.length - 2];
    const hex = parts[parts.length - 3];
    const name = parts.slice(0, parts.length - 3).join(":") || parts[0];
    return {
      name,
      color: 7,
      _hex: hex?.startsWith("#") ? hex : "#FFFFFF",
      _visible: visible !== "0",
      _linetype: linetype ?? "CONTINUOUS",
    };
  });
}

/** Parse flat LN/DM array (stride 5: layerIdx x1 y1 x2 y2) */
function _parseLNFlat(
  ln: (number | string)[],
  layers: Array<{ name: string }>,
): Array<{
  layer: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
}> {
  const result: Array<{
    layer: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color?: string;
  }> = [];
  let i = 0;
  while (i < ln.length) {
    // Expect layerIdx (number) at position i
    if (typeof ln[i] !== "number") {
      i++;
      continue;
    }
    if (i + 4 >= ln.length) break;
    const layerIdx = ln[i] as number;
    const x1 = ln[i + 1] as number;
    const y1 = ln[i + 2] as number;
    const x2 = ln[i + 3] as number;
    const y2 = ln[i + 4] as number;
    i += 5;
    let color: string | undefined;
    // Optional trailing color token
    if (
      i < ln.length &&
      typeof ln[i] === "string" &&
      (ln[i] as string).startsWith("#")
    ) {
      color = ln[i] as string;
      i++;
    }
    result.push({
      layer: layers[layerIdx]?.name ?? "0",
      x1,
      y1,
      x2,
      y2,
      color,
    });
  }
  return result;
}

/** Parse flat CI array (stride 4: layerIdx cx cy r) */
function _parseCIFlat(
  ci: (number | string)[],
  layers: Array<{ name: string }>,
): Array<{ layer: string; cx: number; cy: number; r: number; color?: string }> {
  const result: Array<{
    layer: string;
    cx: number;
    cy: number;
    r: number;
    color?: string;
  }> = [];
  let i = 0;
  while (i < ci.length) {
    if (typeof ci[i] !== "number") {
      i++;
      continue;
    }
    if (i + 3 >= ci.length) break;
    const layerIdx = ci[i] as number;
    const cx = ci[i + 1] as number;
    const cy = ci[i + 2] as number;
    const r = ci[i + 3] as number;
    i += 4;
    let color: string | undefined;
    if (
      i < ci.length &&
      typeof ci[i] === "string" &&
      (ci[i] as string).startsWith("#")
    ) {
      color = ci[i] as string;
      i++;
    }
    result.push({ layer: layers[layerIdx]?.name ?? "0", cx, cy, r, color });
  }
  return result;
}
/** Parse flat AR array (stride 6: layerIdx cx cy r startAngle endAngle) */
function _parseARFlat(
  ar: (number | string)[],
  layers: Array<{ name: string }>,
): Array<{
  layer: string;
  cx: number;
  cy: number;
  r: number;
  sa: number;
  ea: number;
  color?: string;
}> {
  const result: Array<{
    layer: string;
    cx: number;
    cy: number;
    r: number;
    sa: number;
    ea: number;
    color?: string;
  }> = [];
  let i = 0;
  while (i < ar.length) {
    if (typeof ar[i] !== "number") {
      i++;
      continue;
    }
    if (i + 5 >= ar.length) break;
    const layerIdx = ar[i] as number;
    const cx = ar[i + 1] as number;
    const cy = ar[i + 2] as number;
    const r = ar[i + 3] as number;
    const sa = ar[i + 4] as number;
    const ea = ar[i + 5] as number;
    i += 6;
    let color: string | undefined;
    if (
      i < ar.length &&
      typeof ar[i] === "string" &&
      (ar[i] as string).startsWith("#")
    ) {
      color = ar[i] as string;
      i++;
    }
    result.push({
      layer: layers[layerIdx]?.name ?? "0",
      cx,
      cy,
      r,
      sa,
      ea,
      color,
    });
  }
  return result;
}

/**
 * Parse v5 LW entry with interleaved-bulge encoding.
 *
 * Layout: [layerIdx, closed, x1, y1, (bulge_if_nonzero_and_small), x2, y2, ...]
 *
 * Bulge values are always |bulge| ≤ 4.  Drawing coordinates in this file are
 * ~8000–9500, so any value whose absolute value is < 100 after a valid (x,y)
 * pair is treated as a bulge token.
 */
function _parseLWEntryV5(entry, layers) {
  const layer = layers[entry[0]]?.name ?? "0";
  const closed = entry[1] === 1;
  const verts = [];
  let i = 2;
  while (i + 2 < entry.length) {
    // stride 3: x, y, bulge
    verts.push({ x: entry[i], y: entry[i + 1], z: 0, bulge: entry[i + 2] });
    i += 3;
  }
  return { layer, closed, verts };
}

/** Parse v5 SP entry: [layerIdx, [x,y,x,y,...]] */
function _parseSPEntryV5(
  entry: any[],
  layers: Array<{ name: string }>,
): { layer: string; points: Array<{ x: number; y: number }> } {
  const layer = layers[entry[0] as number]?.name ?? "0";
  const flat = entry[1] as number[];
  const pts: Array<{ x: number; y: number }> = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i + 1 < flat.length; i += 2) {
      pts.push({ x: flat[i], y: flat[i + 1] });
    }
  }
  return { layer, points: pts };
}

/** Parse v5 EL entry: [layerIdx, cx, cy, majorX, majorY, ratio, startParam, endParam] */
function _parseELEntryV5(
  entry: number[],
  layers: Array<{ name: string; _hex?: string }>,
): DxfEllipse {
  const [li, cx, cy, mAx, mAy, ratio, sp, ep] = entry;
  return {
    entity_type: "ELLIPSE",
    handle: `el-${li}-${Math.round(cx)}-${Math.round(cy)}`,
    layer: layers[li]?.name ?? "0",
    center: { x: cx, y: cy, z: 0 },
    major_axis: { x: mAx, y: mAy, z: 0 },
    ratio: Math.abs(ratio),
    start_param: sp,
    end_param: ep,
  };
}

/**
 * Parse v5 HT entry:
 *   [layerIdx, patternName, solidFillInt, [ [path], ... ]]
 *
 * Path is ['pl', closed, x, y, (bulge?), ...] or ['ep', edge, ...]
 */
function _parseHTEntryV5(
  entry: any[],
  layers: Array<{ name: string }>,
  handleIdx: number,
): DxfHatch {
  const layer = layers[entry[0] as number]?.name ?? "0";
  const patternName = String(entry[1] ?? "SOLID");
  const solidFill = entry[2] === 1;
  const rawPaths = (entry[3] ?? []) as any[][];

  const boundaries: DxfHatchBoundary[] = rawPaths.map((path, pi) => {
    const ptype = path[0];

    if (ptype === "pl") {
      const closed2 = path[1] === 1;
      const verts: DxfPolylineVertex[] = [];
      let j = 2;
      while (j + 1 < path.length) {
        const x = path[j] as number;
        const y = path[j + 1] as number;
        j += 2;
        let bulge = 0;
        if (j < path.length && Math.abs(path[j] as number) < 100) {
          bulge = path[j] as number;
          j++;
        }
        verts.push({ x, y, z: 0, bulge });
      }
      return { type: "POLYLINE" as const, is_outer: pi === 0, vertices: verts };
    }

    // Edge path
    const edges: DxfHatchEdge[] = [];
    for (let ei = 1; ei < path.length; ei++) {
      const e = path[ei] as any[];
      if (!Array.isArray(e)) continue;
      const et2 = e[0];
      if (et2 === "L") {
        edges.push({
          type: "LINE",
          start: { x: e[1], y: e[2], z: 0 },
          end: { x: e[3], y: e[4], z: 0 },
        });
      } else if (et2 === "A") {
        edges.push({
          type: "ARC",
          center: { x: e[1], y: e[2], z: 0 },
          radius: e[3],
          start_angle: e[4],
          end_angle: e[5],
          is_ccw: e[6] === 1,
        });
      } else if (et2 === "E") {
        edges.push({
          type: "ELLIPSE",
          center: { x: e[1], y: e[2], z: 0 },
          major_axis_end: { x: e[3], y: e[4], z: 0 },
          minor_to_major: e[5],
          ellipse_start_angle: e[6],
          ellipse_end_angle: e[7],
        });
      } else if (et2 === "S") {
        edges.push({
          type: "SPLINE",
          spline_control_pts: (e[1] as number[][]).map((p) => ({
            x: p[0],
            y: p[1],
            z: 0,
          })),
          spline_knots: e[2] as number[],
        });
      }
    }
    return { type: "EDGE" as const, is_outer: pi === 0, edges };
  });

  return {
    entity_type: "HATCH",
    handle: `ht-${handleIdx}`,
    layer,
    pattern_name: patternName,
    solid_fill: solidFill,
    associative: false,
    boundaries,
    pattern_angle: 0,
    pattern_scale: 1,
    gradient: null,
  };
}

/** ACI index → rough hex colour for backward compat */
function _aciToHex(aci: number): string {
  const ACI: Record<number, string> = {
    1: "#FF0000",
    2: "#FFFF00",
    3: "#00FF00",
    4: "#00FFFF",
    5: "#0000FF",
    6: "#FF00FF",
    7: "#FFFFFF",
    8: "#808080",
    9: "#C0C0C0",
  };
  return ACI[aci] ?? "#CCCCCC";
}

// ─── Main converter (v5) ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function _convertCompact(raw: any): DxfJsonDocument {
  const parsedLayers = _parseLayers(raw.layers as string[]);
  const data = (raw.data ?? raw.msp ?? {}) as Record<string, any>;

  const _rawBbox = raw.meta?.bbox;
  const _rawMin = _rawBbox?.min ?? [0, 0];
  const _rawMax = _rawBbox?.max ?? [1, 1];

  // ── Detect & fix invalid sentinel bbox (1e20 / -1e20) ────────────────────
  const SENTINEL = 1e19;
  const bboxHeaderValid =
    Math.abs(_rawMin[0]) < SENTINEL &&
    Math.abs(_rawMin[1]) < SENTINEL &&
    Math.abs(_rawMax[0]) < SENTINEL &&
    Math.abs(_rawMax[1]) < SENTINEL &&
    (_rawMax[0] as number) > (_rawMin[0] as number) &&
    (_rawMax[1] as number) > (_rawMin[1] as number);

  // We'll compute the geometry-derived bbox below after parsing all arrays.
  // For now grab the header values (may be replaced later).
  let bboxMin: [number, number] = bboxHeaderValid
    ? [_rawMin[0] as number, _rawMin[1] as number]
    : [0, 0];
  let bboxMax: [number, number] = bboxHeaderValid
    ? [_rawMax[0] as number, _rawMax[1] as number]
    : [1, 1];

  // ── Lines ─────────────────────────────────────────────────────────────────
  const lines: DxfLine[] = [];
  if (Array.isArray(data.LN)) {
    _parseLNFlat(data.LN as (number | string)[], parsedLayers).forEach(
      (l, i) => {
        lines.push({
          entity_type: "LINE",
          handle: `L${i}`,
          layer: l.layer,
          color: l.color,
          start: { x: l.x1, y: l.y1, z: 0 },
          end: { x: l.x2, y: l.y2, z: 0 },
        });
      },
    );
  }

  // ── Dimension lines (DM) ──────────────────────────────────────────────────
  if (Array.isArray(data.DM)) {
    _parseLNFlat(data.DM as (number | string)[], parsedLayers).forEach(
      (l, i) => {
        lines.push({
          entity_type: "LINE",
          handle: `DM${i}`,
          layer: l.layer,
          color: l.color,
          start: { x: l.x1, y: l.y1, z: 0 },
          end: { x: l.x2, y: l.y2, z: 0 },
        });
      },
    );
  }

  // ── Hatch lines (HL) ──────────────────────────────────────────────────────
  if (Array.isArray(data.HL)) {
    _parseLNFlat(data.HL as (number | string)[], parsedLayers).forEach(
      (l, i) => {
        lines.push({
          entity_type: "LINE",
          handle: `HL${i}`,
          layer: l.layer,
          color: l.color,
          start: { x: l.x1, y: l.y1, z: 0 },
          end: { x: l.x2, y: l.y2, z: 0 },
        });
      },
    );
  }

  // ── Polylines (LW) ────────────────────────────────────────────────────────
  const polylines: DxfPolyline[] = [];
  if (Array.isArray(data.LW)) {
    (data.LW as any[][]).forEach((entry, i) => {
      const { layer, closed, verts, color } = _parseLWEntryV5(
        entry,
        parsedLayers,
      );
      polylines.push({
        entity_type: "LWPOLYLINE",
        handle: `P${i}`,
        layer,
        closed,
        color,
        vertex_count: verts.length,
        vertices: verts,
      });
    });
  }

  // ── Circles (CI) ──────────────────────────────────────────────────────────
  const circles: DxfCircle[] = [];
  if (Array.isArray(data.CI)) {
    _parseCIFlat(data.CI as (number | string)[], parsedLayers).forEach(
      (c, i) => {
        circles.push({
          entity_type: "CIRCLE",
          handle: `C${i}`,
          layer: c.layer,
          color: c.color,
          center: { x: c.cx, y: c.cy, z: 0 },
          radius: c.r,
        });
      },
    );
  }

  // ── Arcs (AR) ─────────────────────────────────────────────────────────────
  const arcs: DxfArc[] = [];
  if (Array.isArray(data.AR)) {
    _parseARFlat(data.AR as (number | string)[], parsedLayers).forEach(
      (a, i) => {
        arcs.push({
          entity_type: "ARC",
          handle: `A${i}`,
          layer: a.layer,
          color: a.color,
          center: { x: a.cx, y: a.cy, z: 0 },
          radius: a.r,
          start_angle: a.sa,
          end_angle: a.ea,
        });
      },
    );
  }

  // ── Ellipses (EL) ─────────────────────────────────────────────────────────
  const ellipses: DxfEllipse[] = [];
  if (Array.isArray(data.EL)) {
    (data.EL as any[][]).forEach((entry) => {
      const el = _parseELEntryV5(entry, parsedLayers);
      if (el) ellipses.push(el); // null = degenerate ellipse, skip
    });
  }

  // ── Splines (SP) ──────────────────────────────────────────────────────────
  const splines: DxfSpline[] = [];
  if (Array.isArray(data.SP)) {
    (data.SP as any[][]).forEach((entry, i) => {
      const { layer, points } = _parseSPEntryV5(entry, parsedLayers);
      if (points.length < 2) return;
      splines.push({
        entity_type: "SPLINE",
        handle: `SP${i}`,
        layer,
        degree: 3,
        closed: false,
        knots: [],
        control_points: [],
        fit_points: [],
        weights: [],
        tessellation: points.map((p) => ({ x: p.x, y: p.y, z: 0 })),
      });
    });
  }

  // ── Points (PT) ───────────────────────────────────────────────────────────
  const points_entities: DxfPoint_Entity[] = [];
  if (Array.isArray(data.PT)) {
    const pt = data.PT as (number | string)[];
    let i = 0;
    while (i < pt.length) {
      const layerIdx = pt[i];
      if (typeof layerIdx !== "number" || i + 2 >= pt.length) break;
      const x = pt[i + 1] as number;
      const y = pt[i + 2] as number;
      i += 3;
      let color: string | undefined;
      if (
        i < pt.length &&
        typeof pt[i] === "string" &&
        (pt[i] as string).startsWith("#")
      ) {
        color = pt[i] as string;
        i++;
      }
      points_entities.push({
        entity_type: "POINT",
        handle: `PT${points_entities.length}`,
        layer: parsedLayers[layerIdx as number]?.name ?? "0",
        color,
        location: { x, y, z: 0 },
      });
    }
  }

  // ── Texts (TX) ────────────────────────────────────────────────────────────
  // Collect raw TX entries first; normalise heights at the end.
  interface RawTX {
    layerIdx: number;
    x: number;
    y: number;
    rawHeight: number;
    text: string;
    rot: number;
    color?: string;
  }
  const rawTexts: RawTX[] = [];
  if (Array.isArray(data.TX)) {
    (data.TX as any[][]).forEach((entry) => {
      const [layerIdx, x, y, height, text] = entry as [
        number,
        number,
        number,
        number,
        string,
      ];
      let rot = 0;
      let color: string | undefined;
      if (entry.length > 5) {
        if (typeof entry[5] === "number") {
          rot = entry[5];
          if (
            entry.length > 6 &&
            typeof entry[6] === "string" &&
            entry[6].startsWith("#")
          )
            color = entry[6];
        } else if (typeof entry[5] === "string" && entry[5].startsWith("#")) {
          color = entry[5];
        }
      }
      const _text = String(text ?? "");
      // Skip machine-readable metadata markers (WALL_META, DOOR_META, SPARKIX_META, etc.)
      // and near-zero-height texts — these are invisible in AutoCAD by design.
      const _isMeta = /^[A-Z_]+_META:/i.test(_text) || /^SPARKIX_/i.test(_text);
      const _isInvisible = (height ?? 0) <= 0.01;
      if (_isMeta || _isInvisible) return;
      rawTexts.push({
        layerIdx,
        x,
        y,
        rawHeight: height ?? 5,
        text: _text,
        rot,
        color,
      });
    });
  }

  // ── Hatches (HT) ─────────────────────────────────────────────────────────
  const hatches: DxfHatch[] = [];
  if (Array.isArray(data.HT)) {
    (data.HT as any[][]).forEach((entry, i) => {
      hatches.push(_parseHTEntryV5(entry, parsedLayers, i));
    });
  }

  // ── Text heights ──────────────────────────────────────────────────────────
  // The v7 converter outputs text heights in the same model-space units as all
  // other geometry — NO normalisation factor is needed. The old bboxExt/60
  // factor was a legacy hack for a previous format where heights were in a
  // different unit space. Applying it here causes two bugs:
  //   1. All text is scaled up ~5x (room labels appear huge on canvas)
  //   2. Math.max(0.5, ...) inflates intentionally-invisible metadata texts
  //      (h=0.01 WALL_META/DOOR_META markers) to the same size as room labels.
  // The canvas renderer scales text proportionally via (pixelWidth / bboxWidth),
  // exactly like it does for line coordinates — no pre-scaling needed here.

  const texts: DxfText[] = rawTexts.map((rt, i) => ({
    entity_type: "MTEXT",
    handle: `TX${i}`,
    layer: parsedLayers[rt.layerIdx]?.name ?? "0",
    color: rt.color,
    text: rt.text,
    position: { x: rt.x, y: rt.y, z: 0 },
    height: rt.rawHeight,
    rotation: rt.rot,
  }));
  // ── Compute bbox from geometry if header bbox was invalid ─────────────────
  if (!bboxHeaderValid) {
    let mnX = Infinity,
      mnY = Infinity,
      mxX = -Infinity,
      mxY = -Infinity;
    const expandB = (x: number, y: number) => {
      if (!isFinite(x) || !isFinite(y)) return;
      if (x < mnX) mnX = x;
      if (x > mxX) mxX = x;
      if (y < mnY) mnY = y;
      if (y > mxY) mxY = y;
    };

    // Lines (already parsed)
    for (const l of lines) {
      expandB(l.start.x, l.start.y);
      expandB(l.end.x, l.end.y);
    }
    // Polylines
    for (const pl of polylines) {
      for (const v of pl.vertices) expandB(v.x, v.y);
    }
    // Circles & arcs (approximate with bbox of bounding box)
    for (const ci of circles) {
      expandB(ci.center.x - ci.radius, ci.center.y - ci.radius);
      expandB(ci.center.x + ci.radius, ci.center.y + ci.radius);
    }
    for (const a of arcs) {
      expandB(a.center.x - a.radius, a.center.y - a.radius);
      expandB(a.center.x + a.radius, a.center.y + a.radius);
    }

    if (isFinite(mnX) && mxX > mnX) {
      // The geometry may contain outlier blocks placed far from the main plan.
      // Use a clustering heuristic: keep only coords within 5× the IQR of the centroid.
      const allXs = lines.flatMap((l) => [l.start.x, l.end.x]);
      const allYs = lines.flatMap((l) => [l.start.y, l.end.y]);
      for (const pl of polylines)
        for (const v of pl.vertices) {
          allXs.push(v.x);
          allYs.push(v.y);
        }

      allXs.sort((a, b) => a - b);
      allYs.sort((a, b) => a - b);

      const q1x = allXs[Math.floor(allXs.length * 0.25)];
      const q3x = allXs[Math.floor(allXs.length * 0.75)];
      const q1y = allYs[Math.floor(allYs.length * 0.25)];
      const q3y = allYs[Math.floor(allYs.length * 0.75)];
      const iqrX = q3x - q1x || mxX - mnX;
      const iqrY = q3y - q1y || mxY - mnY;
      const FENCE = 5.0;

      let cx1 = q1x - iqrX * FENCE,
        cx2 = q3x + iqrX * FENCE;
      let cy1 = q1y - iqrY * FENCE,
        cy2 = q3y + iqrY * FENCE;

      // Re-expand using only inlier coordinates
      let rx1 = Infinity,
        ry1 = Infinity,
        rx2 = -Infinity,
        ry2 = -Infinity;
      for (const l of lines) {
        for (const p of [l.start, l.end]) {
          if (p.x >= cx1 && p.x <= cx2 && p.y >= cy1 && p.y <= cy2) {
            if (p.x < rx1) rx1 = p.x;
            if (p.x > rx2) rx2 = p.x;
            if (p.y < ry1) ry1 = p.y;
            if (p.y > ry2) ry2 = p.y;
          }
        }
      }
      for (const pl of polylines) {
        for (const v of pl.vertices) {
          if (v.x >= cx1 && v.x <= cx2 && v.y >= cy1 && v.y <= cy2) {
            if (v.x < rx1) rx1 = v.x;
            if (v.x > rx2) rx2 = v.x;
            if (v.y < ry1) ry1 = v.y;
            if (v.y > ry2) ry2 = v.y;
          }
        }
      }

      if (isFinite(rx1) && rx2 > rx1) {
        const padX = (rx2 - rx1) * 0.03;
        const padY = (ry2 - ry1) * 0.03;
        bboxMin = [rx1 - padX, ry1 - padY];
        bboxMax = [rx2 + padX, ry2 + padY];
      } else {
        const padX = (mxX - mnX) * 0.03;
        const padY = (mxY - mnY) * 0.03;
        bboxMin = [mnX - padX, mnY - padY];
        bboxMax = [mxX + padX, mxY + padY];
      }
    }
  }

  // ── Layer definitions ─────────────────────────────────────────────────────
  const layerDefs: DxfLayerDef[] = (parsedLayers as any[]).map((l: any) => ({
    name: l.name,
    color: 7,
    true_color: l._hex ?? _aciToHex(7),
    linetype: "Continuous",
    lineweight: -3,
    plot: true,
    is_frozen: l._visible === false,
    is_locked: false,
  }));

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalVerts = polylines.reduce((s, p) => s + p.vertices.length, 0);
  const stats: DxfJsonDocument["stats"] = {
    entity_counts: {
      LINE: lines.length,
      LWPOLYLINE: polylines.length,
      CIRCLE: circles.length,
      ARC: arcs.length,
      ELLIPSE: ellipses.length,
      SPLINE: splines.length,
      TEXT: texts.length,
      HATCH: hatches.length,
      POINT: points_entities.length,
    },
    line_count: lines.length,
    polyline_count: polylines.length,
    arc_count: arcs.length,
    text_count: texts.length,
    total_vertex_count: totalVerts,
    insert_count: 0,
    door_insert_count: 0,
    window_insert_count: 0,
    furniture_insert_count: 0,
    stair_insert_count: 0,
    hatch_count: hatches.length,
    spline_count: splines.length,
  };

  // ── Final extents ─────────────────────────────────────────────────────────
  const extmin: [number, number, number] = [bboxMin[0], bboxMin[1], 0];
  const extmax: [number, number, number] = [bboxMax[0], bboxMax[1], 0];

  return {
    source_file: raw.src ?? "unknown.dxf",
    meta: {
      acad_version: raw.meta?.acad ?? "AC1018",
      extmin,
      extmax,
      insunits: raw.meta?.units,
    },
    stats,
    layers: layerDefs,
    lines,
    arcs,
    circles,
    ellipses,
    splines,
    points: points_entities,
    polylines,
    texts,
    hatches,
    dimensions: [],
    leaders: [],
    inserts: [],
    door_inserts: [],
    window_inserts: [],
    furniture_inserts: [],
    stair_inserts: [],
  };
}

export const DXF_JSON_DATA: DxfJsonDocument = _convertCompact(_VILLA_COMPACT);
