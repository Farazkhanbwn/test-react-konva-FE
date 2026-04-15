/**
 * Hardcoded parsed-DXF JSON — AUTOCAD-FLOOR-PLAN.dxf
 *
 * Edit this file while UI is in development. At runtime, the viewer loads it via
 * `getFloorPlanDocument()` in `src/services/floorPlanSource.ts` until you set
 * `VITE_FLOOR_PLAN_API_URL` to point at your backend (same JSON shape).
 */

export interface DxfPoint {
  x: number;
  y: number;
  z: number;
}

export interface DxfLine {
  entity_type: "LINE";
  handle: string;
  layer: string;
  start: DxfPoint;
  end: DxfPoint;
}

export interface DxfPolylineVertex {
  x: number;
  y: number;
  z: number;
  bulge: number;
}

export interface DxfPolyline {
  entity_type: "LWPOLYLINE";
  handle: string;
  layer: string;
  closed: boolean;
  vertex_count: number;
  vertices: DxfPolylineVertex[];
}

export interface DxfText {
  entity_type: "MTEXT";
  handle: string;
  layer: string;
  text: string;
  position: DxfPoint;
  height: number;
}

export interface DxfArc {
  entity_type: "ARC";
  handle: string;
  layer: string;
  center: DxfPoint;
  radius: number;
  start_angle: number;
  end_angle: number;
}

export interface DxfInsertScale {
  x: number;
  y: number;
  z: number;
}

export interface DxfInsert {
  entity_type: "INSERT";
  handle: string;
  layer: string;
  block_name: string;
  category: string;
  is_anonymous_block: boolean;
  position: DxfPoint;
  rotation: number;
  scale: DxfInsertScale;
  block_entity_types: string[];
  block_entity_count: number;
  attributes: unknown[];
}

export interface DxfJsonDocument {
  source_file: string;
  meta: {
    acad_version: string;
    extmin: [number, number, number];
    extmax: [number, number, number];
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
  };
  inserts: DxfInsert[];
  door_inserts: DxfInsert[];
  window_inserts: DxfInsert[];
  furniture_inserts: DxfInsert[];
  window_lines?: DxfLine[];
  door_lines?: DxfLine[];
  stair_inserts: DxfInsert[];
  lines: DxfLine[];
  arcs: DxfArc[];
  polylines: DxfPolyline[];
  texts: DxfText[];
  furniture_lines?: DxfLine[];
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

// Previous View
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

// New Data
export const DXF_JSON_DATA: DxfJsonDocument =  {
  "source_file": "Floor-plan-client-sample.dxf",
  "meta": {
    "acad_version": "AC1032",
    "extmin": [
      -1.175956776144261,
      -3.063922757453823,
      0.0
    ],
    "extmax": [
      24.33123753487394,
      6.970593080037822,
      0.0
    ]
  },
  "stats": {
    "entity_counts": {
      "LINE": 61,
      "INSERT": 27,
      "MTEXT": 7
    },
    "polyline_count": 0,
    "line_count": 61,
    "arc_count": 0,
    "text_count": 7,
    "insert_count": 27,
    "door_insert_count": 15,
    "window_insert_count": 2,
    "furniture_insert_count": 9,
    "stair_insert_count": 0,
    "total_vertex_count": 0
  },
  "lines": [
    {
      "entity_type": "LINE",
      "handle": "27B",
      "layer": "0",
      "start": {
        "x": -1.032797151696165,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 23.80720284830383,
        "y": 6.970593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "27D",
      "layer": "0",
      "start": {
        "x": -1.040723763906285,
        "y": 0.0155592780898246,
        "z": 0.0
      },
      "end": {
        "x": -1.032797151696165,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "27F",
      "layer": "0",
      "start": {
        "x": -1.032797151696165,
        "y": -3.059406919962174,
        "z": 0.0
      },
      "end": {
        "x": 2.767202848303835,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "280",
      "layer": "0",
      "start": {
        "x": 2.767202848303835,
        "y": -3.059406919962174,
        "z": 0.0
      },
      "end": {
        "x": 5.567202848303836,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "281",
      "layer": "0",
      "start": {
        "x": 5.585580115505436,
        "y": -0.6096535744505669,
        "z": 0.0
      },
      "end": {
        "x": 5.585580115505436,
        "y": 5.740346425549432,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "282",
      "layer": "0",
      "start": {
        "x": 5.585580115505436,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 10.19558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "283",
      "layer": "0",
      "start": {
        "x": 10.19558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 10.19558011550543,
        "y": 1.555300264099905,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "284",
      "layer": "0",
      "start": {
        "x": 10.19558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 13.89558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "285",
      "layer": "0",
      "start": {
        "x": 13.89558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 13.89558011550543,
        "y": 1.447248272882781,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "286",
      "layer": "0",
      "start": {
        "x": 13.89558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 15.29558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "28A",
      "layer": "0",
      "start": {
        "x": 16.28123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 20.83123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "28B",
      "layer": "0",
      "start": {
        "x": 20.83123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 20.83123753487394,
        "y": 1.490593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "28C",
      "layer": "0",
      "start": {
        "x": 20.83123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 22.33123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "28D",
      "layer": "0",
      "start": {
        "x": 22.33123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 22.33123753487395,
        "y": -3.059406919962177,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "28E",
      "layer": "0",
      "start": {
        "x": 22.33123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 24.33123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "290",
      "layer": "0",
      "start": {
        "x": -1.032797151696165,
        "y": -3.059406919962174,
        "z": 0.0
      },
      "end": {
        "x": 1.187202848303833,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "292",
      "layer": "0",
      "start": {
        "x": 1.187202848303833,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "end": {
        "x": -0.0378569325584977,
        "y": -0.6094069199621757,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "293",
      "layer": "0",
      "start": {
        "x": 1.187202848303833,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "end": {
        "x": 2.387202848303832,
        "y": -0.6094069199621757,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "294",
      "layer": "0",
      "start": {
        "x": 2.387202848303832,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "end": {
        "x": 2.387202848303832,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "297",
      "layer": "0",
      "start": {
        "x": 24.33123753487394,
        "y": 6.970593080037822,
        "z": 0.0
      },
      "end": {
        "x": 24.33123753487393,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "298",
      "layer": "0",
      "start": {
        "x": 24.33123753487393,
        "y": -3.059406919962176,
        "z": 0.0
      },
      "end": {
        "x": 5.590532741214701,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "299",
      "layer": "0",
      "start": {
        "x": 13.89558011550543,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 6.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "29B",
      "layer": "0",
      "start": {
        "x": 6.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 6.995580115505433,
        "y": -1.371572869054034,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "29C",
      "layer": "0",
      "start": {
        "x": 6.995580115505433,
        "y": -1.371572869054034,
        "z": 0.0
      },
      "end": {
        "x": 6.995580115505434,
        "y": -3.059406919962177,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "29E",
      "layer": "0",
      "start": {
        "x": 6.995580115505433,
        "y": -3.059406919962176,
        "z": 0.0
      },
      "end": {
        "x": 7.995580115505433,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A1",
      "layer": "0",
      "start": {
        "x": 6.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 9.395580115505432,
        "y": -0.6522395413718183,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A2",
      "layer": "0",
      "start": {
        "x": 9.395580115505432,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 9.395580115505428,
        "y": -3.059406919962177,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A3",
      "layer": "0",
      "start": {
        "x": 6.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 7.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A4",
      "layer": "0",
      "start": {
        "x": 7.995580115505433,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 7.995580115505432,
        "y": -2.442623760312759,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A5",
      "layer": "0",
      "start": {
        "x": 9.395580115505432,
        "y": -0.6522395413718183,
        "z": 0.0
      },
      "end": {
        "x": 10.59558011550543,
        "y": -0.6522395413718183,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A6",
      "layer": "0",
      "start": {
        "x": 9.395580115505432,
        "y": -3.059406919962176,
        "z": 0.0
      },
      "end": {
        "x": 10.59558011550543,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A7",
      "layer": "0",
      "start": {
        "x": 10.59558011550543,
        "y": -3.059406919962176,
        "z": 0.0
      },
      "end": {
        "x": 10.59558011550543,
        "y": -1.407059896082825,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A8",
      "layer": "0",
      "start": {
        "x": 22.33123753487395,
        "y": -3.059406919962176,
        "z": 0.0
      },
      "end": {
        "x": 22.33123753487395,
        "y": -0.5594069199621768,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2A9",
      "layer": "0",
      "start": {
        "x": 22.33123753487395,
        "y": -0.5594069199621768,
        "z": 0.0
      },
      "end": {
        "x": 20.92112137984364,
        "y": -0.5594069199621768,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AA",
      "layer": "0",
      "start": {
        "x": 20.00153665788298,
        "y": -0.6492412447267171,
        "z": 0.0
      },
      "end": {
        "x": 17.73905956749149,
        "y": -0.6492412447267171,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AB",
      "layer": "0",
      "start": {
        "x": 17.73905956749149,
        "y": -0.5952152491181552,
        "z": 0.0
      },
      "end": {
        "x": 17.7390595674915,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AC",
      "layer": "0",
      "start": {
        "x": 17.73905956749149,
        "y": -0.5952152491181552,
        "z": 0.0
      },
      "end": {
        "x": 15.93905956749149,
        "y": -0.5952152491181552,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AD",
      "layer": "0",
      "start": {
        "x": 15.93905956749149,
        "y": -0.5952152491181552,
        "z": 0.0
      },
      "end": {
        "x": 15.93905956749149,
        "y": -3.059406919962176,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AE",
      "layer": "0",
      "start": {
        "x": 20.83123753487394,
        "y": 1.490593080037822,
        "z": 0.0
      },
      "end": {
        "x": 21.33921689238923,
        "y": 1.490593080037822,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2AF",
      "layer": "0",
      "start": {
        "x": 15.29558011550543,
        "y": 5.740346425549432,
        "z": 0.0
      },
      "end": {
        "x": 15.29558011550543,
        "y": 6.297942524693098,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2FDC",
      "layer": "0",
      "start": {
        "x": 2.387202848303832,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "end": {
        "x": 2.989220665853494,
        "y": -0.6094069199621757,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "2FDD",
      "layer": "0",
      "start": {
        "x": 5.585580115505436,
        "y": -0.6096535744505669,
        "z": 0.0
      },
      "end": {
        "x": 4.82839002450963,
        "y": -0.6096535744505687,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3A2E",
      "layer": "0",
      "start": {
        "x": 1.285568171344415,
        "y": -1.240669024184326,
        "z": 0.0
      },
      "end": {
        "x": 1.285417179555911,
        "y": -3.059406919962174,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3CBE",
      "layer": "0",
      "start": {
        "x": -1.067770383406909,
        "y": 6.903874305773555,
        "z": 0.0
      },
      "end": {
        "x": -1.067770383406909,
        "y": 6.903874305773555,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3CBF",
      "layer": "0",
      "start": {
        "x": -1.067770383406909,
        "y": 6.903874305773555,
        "z": 0.0
      },
      "end": {
        "x": -1.067770383406909,
        "y": 6.390627299849619,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EB7",
      "layer": "Offset",
      "start": {
        "x": 10.91387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 10.91387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EB8",
      "layer": "Offset",
      "start": {
        "x": 11.21387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 11.21387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBA",
      "layer": "Offset",
      "start": {
        "x": 11.51387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 11.51387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBB",
      "layer": "Offset",
      "start": {
        "x": 11.81387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 11.81387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBC",
      "layer": "Offset",
      "start": {
        "x": 12.11387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 12.11387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBD",
      "layer": "Offset",
      "start": {
        "x": 12.41387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 12.41387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBE",
      "layer": "Offset",
      "start": {
        "x": 12.71387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 12.71387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EBF",
      "layer": "Offset",
      "start": {
        "x": 13.01387668366542,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 13.01387668366542,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EC0",
      "layer": "Offset",
      "start": {
        "x": 13.31387668366543,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 13.31387668366543,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EC1",
      "layer": "Offset",
      "start": {
        "x": 13.61387668366543,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 13.61387668366543,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EC2",
      "layer": "Offset",
      "start": {
        "x": 13.31387668366543,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 13.31387668366543,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3EC3",
      "layer": "Offset",
      "start": {
        "x": 13.91387668366543,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "end": {
        "x": 13.91387668366543,
        "y": -3.063922757453823,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "3FA6",
      "layer": "0",
      "start": {
        "x": -1.040723763906299,
        "y": 1.123092267469672,
        "z": 0.0
      },
      "end": {
        "x": -1.032797151696179,
        "y": 0.0695852736983795,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "4415",
      "layer": "0",
      "start": {
        "x": -1.094817002907532,
        "y": 3.122054295556878,
        "z": 0.0
      },
      "end": {
        "x": -1.094817002907532,
        "y": 4.013483302502486,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "4D7A",
      "layer": "0",
      "start": {
        "x": 10.183618212944,
        "y": -0.5517137393235494,
        "z": 0.0
      },
      "end": {
        "x": 10.183618212944,
        "y": 0.4207542769157762,
        "z": 0.0
      }
    },
    {
      "entity_type": "LINE",
      "handle": "4D7B",
      "layer": "0",
      "start": {
        "x": 13.91605008399237,
        "y": -0.6462592395789635,
        "z": 0.0
      },
      "end": {
        "x": 13.91605008399237,
        "y": 0.5152997771711904,
        "z": 0.0
      }
    }
  ],
  "arcs": [
    // Door arcs generated from door_inserts
    // Door *U2 at position (1.285568, -1.240669) rotation=90°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u2-1",
      "layer": "Doors",
      "center": { "x": 1.285568171344415, "y": -1.240669024184325, "z": 0.0 },
      "radius": 0.6096,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U3 at position (-0.0823069, -0.6094069) rotation=180°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u3-1",
      "layer": "Doors",
      "center": { "x": -0.0823069325584975, "y": -0.6094069199621757, "z": 0.0 },
      "radius": 0.9144,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U9 at position (2.989221, -0.8528987) rotation=180°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u9-1",
      "layer": "Doors",
      "center": { "x": 2.989220665853494, "y": -0.8528987358013927, "z": 0.0 },
      "radius": 0.9144,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U13 at position (4.82839, -0.9028827) rotation=180°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u13-1",
      "layer": "Doors",
      "center": { "x": 4.82839002450963, "y": -0.9028827107791954, "z": 0.0 },
      "radius": 0.9144,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U23 at position (10.59558, -1.407060) rotation=90°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u23-1",
      "layer": "Doors",
      "center": { "x": 10.59558011550543, "y": -1.407059896082825, "z": 0.0 },
      "radius": 0.6096,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U2 at position (8.064103, -3.0098968) rotation=90°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u2-2",
      "layer": "Doors",
      "center": { "x": 8.064103198073312, "y": -3.0098967618453, "z": 0.0 },
      "radius": 0.6096,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U28 at position (21.33922, 1.490593) rotation=180°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u28-1",
      "layer": "Doors",
      "center": { "x": 21.33921689238923, "y": 1.490593080037822, "z": 0.0 },
      "radius": 0.9144,
      "start_angle": 180.0,
      "end_angle": 270.0
    },
    // Door *U3 at position (21.00226, -0.6327527) rotation=180°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u3-2",
      "layer": "Doors",
      "center": { "x": 21.00226115308036, "y": -0.6327527327363925, "z": 0.0 },
      "radius": 0.9144,
      "start_angle": 0.0,
      "end_angle": 90.0
    },
    // Door *U35 at position (-0.9764672, 1.096079) rotation=90°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u35-1",
      "layer": "Doors",
      "center": { "x": -0.9764672117876712, "y": 1.096079285546267, "z": 0.0 },
      "radius": 1.016,
      "start_angle": 270.0,
      "end_angle": 0.0
    },
    // Door *U38 at position (-1.023557, 3.084547) rotation=90°
    {
      "entity_type": "ARC",
      "handle": "arc-door-u38-1",
      "layer": "Doors",
      "center": { "x": -1.02355677614426, "y": 3.084547270023842, "z": 0.0 },
      "radius": 1.016,
      "start_angle": 180.0,
      "end_angle": 270.0
    }
  ],
  "polylines": [],
  "texts": [
    {
      "entity_type": "MTEXT",
      "handle": "3A35",
      "layer": "Text",
      "text": "MEN'S SEATiNG",
      "position": {
        "x": 6.829838929639223,
        "y": 3.068028299948316,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A4C",
      "layer": "Text",
      "text": "DINNING",
      "position": {
        "x": 11.31957580564452,
        "y": 2.49160899226894,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A53",
      "layer": "Text",
      "text": "DRIVER ROOM",
      "position": {
        "x": -0.8705175199575663,
        "y": -2.069072196184574,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A5B",
      "layer": "Text",
      "text": "FAMILY SEATiNG",
      "position": {
        "x": 16.45843112333898,
        "y": 2.554781294024373,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A63",
      "layer": "Text",
      "text": "STORE",
      "position": {
        "x": 21.1645408700841,
        "y": 3.599141981648795,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A6A",
      "layer": "Text",
      "text": "KITCHEN",
      "position": {
        "x": 18.62215974547233,
        "y": -1.830471037556826,
        "z": 0.0
      },
      "height": 0.2
    },
    {
      "entity_type": "MTEXT",
      "handle": "3A71",
      "layer": "Text",
      "text": "ELEV",
      "position": {
        "x": 16.2961514916004,
        "y": -1.749432028263111,
        "z": 0.0
      },
      "height": 0.2
    }
  ],
  "inserts": [
    {
      "entity_type": "INSERT",
      "handle": "6BF",
      "layer": "Doors",
      "block_name": "*U2",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 1.285568171344415,
        "y": -1.240669024184325,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "886",
      "layer": "Doors",
      "block_name": "*U3",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.0823069325584975,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "1521",
      "layer": "Doors",
      "block_name": "*U5",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.3281920416423034,
        "y": 4.909068955165572,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.001,
        "y": 0.001,
        "z": 0.001
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "ELLIPSE",
        "LINE",
        "LWPOLYLINE",
        "SOLID",
        "SPLINE"
      ],
      "block_entity_count": 1048,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "2CBA",
      "layer": "Doors",
      "block_name": "*U9",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 2.989220665853494,
        "y": -0.8528987358013927,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "2F29",
      "layer": "Doors",
      "block_name": "*U13",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 4.82839002450963,
        "y": -0.9028827107791954,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "30FD",
      "layer": "Window",
      "block_name": "*U15",
      "category": "window",
      "is_anonymous_block": true,
      "position": {
        "x": 5.585580115505436,
        "y": 4.958938305056653,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3160",
      "layer": "Window",
      "block_name": "*U17",
      "category": "window",
      "is_anonymous_block": true,
      "position": {
        "x": 5.585580115505436,
        "y": 0.2586762742092219,
        "z": 0.0
      },
      "rotation": 90.00000000000003,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "387C",
      "layer": "Doors",
      "block_name": "*U23",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 10.59558011550543,
        "y": -1.407059896082825,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39D9",
      "layer": "Doors",
      "block_name": "*U2",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 8.064103198073312,
        "y": -3.0098967618453,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3C42",
      "layer": "Doors",
      "block_name": "*U28",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 21.33921689238923,
        "y": 1.490593080037822,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3E99",
      "layer": "Doors",
      "block_name": "*U3",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 21.00226115308036,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3FA7",
      "layer": "Doors",
      "block_name": "*U35",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.9764672117876712,
        "y": 1.096079285546267,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "439A",
      "layer": "Doors",
      "block_name": "*U38",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -1.02355677614426,
        "y": 3.084547270023842,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "5B94",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.20596448726056,
        "y": 6.012445298827948,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6044",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.15591078618396,
        "y": 3.653671589404144,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "64F0",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.26409726418647,
        "y": 0.2500335802091307,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "699C",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.31819041792256,
        "y": -2.046071439606027,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A09",
      "layer": "FURNITURE",
      "block_name": "Chair - Desk",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 6.315953414922802,
        "y": 4.985951286980068,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 20,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A1C",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 9.967245342204151,
        "y": 2.932963295046043,
        "z": 0.0
      },
      "rotation": 269.1037123768329,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A5A",
      "layer": "FURNITURE",
      "block_name": "Dining Set - 36 x 72 in.",
      "category": "insert",
      "is_anonymous_block": false,
      "position": {
        "x": 12.07688072533622,
        "y": 3.878418297600212,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 53,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A62",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 7.992843056575182,
        "y": 5.283094310469763,
        "z": 0.0
      },
      "rotation": 0.95362049667097,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A6A",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 5.883207673443109,
        "y": 2.932963295046043,
        "z": 0.0
      },
      "rotation": 89.36050099055328,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A72",
      "layer": "FURNITURE",
      "block_name": "Chair - Desk",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 9.638920054251003,
        "y": 4.958530308426428,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 20,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A8B",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 17.40506237953511,
        "y": 5.553224288512566,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6AB0",
      "layer": "FURNITURE",
      "block_name": "Table - Square Woodgrain 42 x 42 in.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 16.81003700631682,
        "y": 4.148548307404759,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
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
      "handle": "6AED",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 19.51469776266719,
        "y": 3.635301301480822,
        "z": 0.0
      },
      "rotation": 269.1059379791044,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6AF5",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 15.02496097192709,
        "y": 3.743353292697939,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    }
  ],
  "door_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "6BF",
      "layer": "Doors",
      "block_name": "*U2",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 1.285568171344415,
        "y": -1.240669024184325,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "886",
      "layer": "Doors",
      "block_name": "*U3",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.0823069325584975,
        "y": -0.6094069199621757,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "1521",
      "layer": "Doors",
      "block_name": "*U5",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.3281920416423034,
        "y": 4.909068955165572,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.001,
        "y": 0.001,
        "z": 0.001
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "ELLIPSE",
        "LINE",
        "LWPOLYLINE",
        "SOLID",
        "SPLINE"
      ],
      "block_entity_count": 1048,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "2CBA",
      "layer": "Doors",
      "block_name": "*U9",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 2.989220665853494,
        "y": -0.8528987358013927,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "2F29",
      "layer": "Doors",
      "block_name": "*U13",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 4.82839002450963,
        "y": -0.9028827107791954,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "387C",
      "layer": "Doors",
      "block_name": "*U23",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 10.59558011550543,
        "y": -1.407059896082825,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "39D9",
      "layer": "Doors",
      "block_name": "*U2",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 8.064103198073312,
        "y": -3.0098967618453,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3C42",
      "layer": "Doors",
      "block_name": "*U28",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 21.33921689238923,
        "y": 1.490593080037822,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3E99",
      "layer": "Doors",
      "block_name": "*U3",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 21.00226115308036,
        "y": -0.6327527327363925,
        "z": 0.0
      },
      "rotation": 180.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3FA7",
      "layer": "Doors",
      "block_name": "*U35",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -0.9764672117876712,
        "y": 1.096079285546267,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "439A",
      "layer": "Doors",
      "block_name": "*U38",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": -1.02355677614426,
        "y": 3.084547270023842,
        "z": 0.0
      },
      "rotation": 89.99999999999999,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 11,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "5B94",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.20596448726056,
        "y": 6.012445298827948,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6044",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.15591078618396,
        "y": 3.653671589404144,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "64F0",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.26409726418647,
        "y": 0.2500335802091307,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "699C",
      "layer": "GRASS LAYER",
      "block_name": "*U48",
      "category": "door",
      "is_anonymous_block": true,
      "position": {
        "x": 23.31819041792256,
        "y": -2.046071439606027,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "CIRCLE",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 582,
      "attributes": []
    }
  ],
  "window_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "30FD",
      "layer": "Window",
      "block_name": "*U15",
      "category": "window",
      "is_anonymous_block": true,
      "position": {
        "x": 5.585580115505436,
        "y": 4.958938305056653,
        "z": 0.0
      },
      "rotation": 270.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "3160",
      "layer": "Window",
      "block_name": "*U17",
      "category": "window",
      "is_anonymous_block": true,
      "position": {
        "x": 5.585580115505436,
        "y": 0.2586762742092219,
        "z": 0.0
      },
      "rotation": 90.00000000000003,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "LINE"
      ],
      "block_entity_count": 3,
      "attributes": []
    }
  ],
  "furniture_inserts": [
    {
      "entity_type": "INSERT",
      "handle": "6A09",
      "layer": "FURNITURE",
      "block_name": "Chair - Desk",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 6.315953414922802,
        "y": 4.985951286980068,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 20,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A1C",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 9.967245342204151,
        "y": 2.932963295046043,
        "z": 0.0
      },
      "rotation": 269.1037123768329,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A62",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 7.992843056575182,
        "y": 5.283094310469763,
        "z": 0.0
      },
      "rotation": 0.95362049667097,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A6A",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback 7 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 5.883207673443109,
        "y": 2.932963295046043,
        "z": 0.0
      },
      "rotation": 89.36050099055328,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 10,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A72",
      "layer": "FURNITURE",
      "block_name": "Chair - Desk",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 9.638920054251003,
        "y": 4.958530308426428,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE"
      ],
      "block_entity_count": 20,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6A8B",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 17.40506237953511,
        "y": 5.553224288512566,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6AB0",
      "layer": "FURNITURE",
      "block_name": "Table - Square Woodgrain 42 x 42 in.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 16.81003700631682,
        "y": 4.148548307404759,
        "z": 0.0
      },
      "rotation": 0.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
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
      "handle": "6AED",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 19.51469776266719,
        "y": 3.635301301480822,
        "z": 0.0
      },
      "rotation": 269.1059379791044,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    },
    {
      "entity_type": "INSERT",
      "handle": "6AF5",
      "layer": "FURNITURE",
      "block_name": "Sofa - Roundback Loveseat 5 ft.",
      "category": "furniture",
      "is_anonymous_block": false,
      "position": {
        "x": 15.02496097192709,
        "y": 3.743353292697939,
        "z": 0.0
      },
      "rotation": 90.0,
      "scale": {
        "x": 0.0254,
        "y": 0.0254,
        "z": 0.0254
      },
      "block_entity_types": [
        "ARC",
        "LINE",
        "LWPOLYLINE"
      ],
      "block_entity_count": 9,
      "attributes": []
    }
  ],
  // ============ DOOR LINES from block *U2 ============
  "door_lines": [
    // From block *U2 (24" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U2",
      handle: "638",
      vertices: [
        { x: -0.0000000000000001, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 24.0, y: 0.0000000000000041, z: 0.0, bulge: 0 },
        { x: 24.0, y: 1.750000000000002, z: 0.0, bulge: 0 },
        { x: -0.0000000000000005, y: 1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U2",
      handle: "639",
      vertices: [
        { x: -0.0000000000000001, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 20.78460969082653, y: -11.99999999999998, z: 0.0, bulge: 0 },
        { x: 21.65960969082654, y: -10.48445554337722, z: 0.0, bulge: 0 },
        { x: 0.8749999999999985, y: 1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U2",
      handle: "63A",
      vertices: [
        { x: -0.0000000000000001, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 16.97056274847714, y: -16.97056274847713, z: 0.0, bulge: 0 },
        { x: 18.2079996155536, y: -15.73312588140067, z: 0.0, bulge: 0 },
        { x: 1.237436867076456, y: 1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U2",
      handle: "63B",
      vertices: [
        { x: -0.0000000000000001, y: 0.0, z: 0.0, bulge: 0 },
        { x: 12.0, y: -20.78460969082652, z: 0.0, bulge: 0 },
        { x: 13.51554445662278, y: -19.90960969082652, z: 0.0, bulge: 0 },
        { x: 1.515544456622765, y: 0.875, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U2",
      handle: "63C",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000118, y: -24.0, z: 0.0, bulge: 0 },
        { x: 1.750000000000013, y: -24.0, z: 0.0, bulge: 0 },
        { x: 1.749999999999998, y: 0.0000000000000009, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U2",
      handle: "63D",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 270.0,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U2",
      handle: "63E",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 299.9999999999998,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U2",
      handle: "63F",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 315.0000000000001,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U2",
      handle: "640",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 329.9999999999999,
      end_angle: 0.0
    },
    {
      entity_type: "LINE",
      block_name: "*U2",
      handle: "641",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: -0.0000000000000012, y: 5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U2",
      handle: "642",
      start: { x: 24.0, y: 0.0000000000000041, z: 0.0 },
      end: { x: 24.0, y: 6.000000000000003, z: 0.0 }
    },
  
    // From block *U3 (36" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U3",
      handle: "8A3",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 36.0, y: -0.0000000000000022, z: 0.0, bulge: 0 },
        { x: 36.0, y: -1.75, z: 0.0, bulge: 0 },
        { x: 0.0, y: -1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U3",
      handle: "8A4",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 31.1769145362398, y: 17.99999999999998, z: 0.0, bulge: 0 },
        { x: 32.0519145362398, y: 16.48445554337722, z: 0.0, bulge: 0 },
        { x: 0.875, y: -1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U3",
      handle: "8A5",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 25.45584412271571, y: 25.4558441227157, z: 0.0, bulge: 0 },
        { x: 26.69328098979217, y: 24.21840725563925, z: 0.0, bulge: 0 },
        { x: 1.237436867076457, y: -1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U3",
      handle: "8A6",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 18.0, y: 31.17691453623979, z: 0.0, bulge: 0 },
        { x: 19.51554445662278, y: 30.30191453623979, z: 0.0, bulge: 0 },
        { x: 1.515544456622766, y: -0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U3",
      handle: "8A7",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000092, y: 36.0, z: 0.0, bulge: 0 },
        { x: 1.750000000000012, y: 36.0, z: 0.0, bulge: 0 },
        { x: 1.75, y: 0.0, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U3",
      handle: "8A8",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.0,
      end_angle: 90.0
    },
    {
      entity_type: "ARC",
      block_name: "*U3",
      handle: "8A9",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.0,
      end_angle: 60.00000000000026
    },
    {
      entity_type: "ARC",
      block_name: "*U3",
      handle: "8AA",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.0,
      end_angle: 44.99999999999983
    },
    {
      entity_type: "ARC",
      block_name: "*U3",
      handle: "8AB",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.0,
      end_angle: 30.00000000000012
    },
    {
      entity_type: "LINE",
      block_name: "*U3",
      handle: "8AC",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0, y: -5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U3",
      handle: "8AD",
      start: { x: 36.0, y: -0.0000000000000022, z: 0.0 },
      end: { x: 36.0, y: -6.000000000000001, z: 0.0 }
    },
  
    // From block *U9 (flipped 36" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U9",
      handle: "2D0F",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -36.0, y: -0.0000000000000022, z: 0.0, bulge: 0 },
        { x: -36.0, y: -1.75, z: 0.0, bulge: 0 },
        { x: 0.0, y: -1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U9",
      handle: "2D10",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -31.1769145362398, y: 17.99999999999998, z: 0.0, bulge: 0 },
        { x: -32.0519145362398, y: 16.48445554337722, z: 0.0, bulge: 0 },
        { x: -0.875, y: -1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U9",
      handle: "2D11",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -25.45584412271571, y: 25.4558441227157, z: 0.0, bulge: 0 },
        { x: -26.69328098979217, y: 24.21840725563925, z: 0.0, bulge: 0 },
        { x: -1.237436867076453, y: -1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U9",
      handle: "2D12",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: -18.0, y: 31.17691453623979, z: 0.0, bulge: 0 },
        { x: -19.51554445662278, y: 30.30191453623979, z: 0.0, bulge: 0 },
        { x: -1.515544456622762, y: -0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U9",
      handle: "2D13",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: -0.0000000000000071, y: 36.0, z: 0.0, bulge: 0 },
        { x: -1.750000000000014, y: 36.0, z: 0.0, bulge: 0 },
        { x: -1.75, y: 0.0, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U9",
      handle: "2D14",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 90.0,
      end_angle: 180.0
    },
    {
      entity_type: "ARC",
      block_name: "*U9",
      handle: "2D15",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 119.9999999999995,
      end_angle: 180.0
    },
    {
      entity_type: "ARC",
      block_name: "*U9",
      handle: "2D16",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 135.0000000000004,
      end_angle: 180.0
    },
    {
      entity_type: "ARC",
      block_name: "*U9",
      handle: "2D17",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 150.0,
      end_angle: 180.0
    },
    {
      entity_type: "LINE",
      block_name: "*U9",
      handle: "2D18",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0, y: -5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U9",
      handle: "2D19",
      start: { x: -36.0, y: -0.0000000000000022, z: 0.0 },
      end: { x: -36.0, y: -6.000000000000001, z: 0.0 }
    },
  
    // From block *U13 (mirrored 36" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U13",
      handle: "2F7E",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 36.0, y: -0.0000000000000022, z: 0.0, bulge: 0 },
        { x: 36.0, y: -1.75, z: 0.0, bulge: 0 },
        { x: 0.0, y: -1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U13",
      handle: "2F7F",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 31.1769145362398, y: 17.99999999999998, z: 0.0, bulge: 0 },
        { x: 32.0519145362398, y: 16.48445554337722, z: 0.0, bulge: 0 },
        { x: 0.875, y: -1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U13",
      handle: "2F80",
      vertices: [
        { x: 0.0, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 25.45584412271571, y: 25.4558441227157, z: 0.0, bulge: 0 },
        { x: 26.69328098979217, y: 24.21840725563925, z: 0.0, bulge: 0 },
        { x: 1.237436867076453, y: -1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U13",
      handle: "2F81",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 18.0, y: 31.17691453623979, z: 0.0, bulge: 0 },
        { x: 19.51554445662278, y: 30.30191453623979, z: 0.0, bulge: 0 },
        { x: 1.515544456622762, y: -0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U13",
      handle: "2F82",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000071, y: 36.0, z: 0.0, bulge: 0 },
        { x: 1.750000000000014, y: 36.0, z: 0.0, bulge: 0 },
        { x: 1.75, y: 0.0, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U13",
      handle: "2F83",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.000000000000007,
      end_angle: 90.0
    },
    {
      entity_type: "ARC",
      block_name: "*U13",
      handle: "2F84",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.000000000000007,
      end_angle: 60.00000000000047
    },
    {
      entity_type: "ARC",
      block_name: "*U13",
      handle: "2F85",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.000000000000007,
      end_angle: 44.99999999999955
    },
    {
      entity_type: "ARC",
      block_name: "*U13",
      handle: "2F86",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 0.000000000000007,
      end_angle: 29.99999999999985
    },
    {
      entity_type: "LINE",
      block_name: "*U13",
      handle: "2F87",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0, y: -5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U13",
      handle: "2F88",
      start: { x: 36.0, y: -0.0000000000000022, z: 0.0 },
      end: { x: 36.0, y: -6.000000000000001, z: 0.0 }
    },
  
    // From block *U23 (24" door variation)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U23",
      handle: "3899",
      vertices: [
        { x: -0.0000000000000001, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 24.0, y: 0.0000000000000062, z: 0.0, bulge: 0 },
        { x: 24.0, y: -1.749999999999992, z: 0.0, bulge: 0 },
        { x: 0.0000000000000003, y: -1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U23",
      handle: "389A",
      vertices: [
        { x: -0.0000000000000001, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 20.78460969082653, y: 11.99999999999999, z: 0.0, bulge: 0 },
        { x: 21.65960969082653, y: 10.48445554337722, z: 0.0, bulge: 0 },
        { x: 0.8749999999999992, y: -1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U23",
      handle: "389B",
      vertices: [
        { x: -0.0000000000000001, y: -0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 16.97056274847713, y: 16.97056274847714, z: 0.0, bulge: 0 },
        { x: 18.2079996155536, y: 15.73312588140068, z: 0.0, bulge: 0 },
        { x: 1.237436867076456, y: -1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U23",
      handle: "389C",
      vertices: [
        { x: -0.0000000000000001, y: 0.0, z: 0.0, bulge: 0 },
        { x: 11.99999999999999, y: 20.78460969082652, z: 0.0, bulge: 0 },
        { x: 13.51554445662277, y: 19.90960969082653, z: 0.0, bulge: 0 },
        { x: 1.515544456622766, y: -0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U23",
      handle: "389D",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000016, y: 24.0, z: 0.0, bulge: 0 },
        { x: 1.750000000000003, y: 24.0, z: 0.0, bulge: 0 },
        { x: 1.749999999999998, y: 0.0, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U23",
      handle: "389E",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 0.0,
      end_angle: 90.00000000000005
    },
    {
      entity_type: "ARC",
      block_name: "*U23",
      handle: "389F",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 0.0,
      end_angle: 60.0000000000002
    },
    {
      entity_type: "ARC",
      block_name: "*U23",
      handle: "38A0",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 0.0,
      end_angle: 44.99999999999996
    },
    {
      entity_type: "ARC",
      block_name: "*U23",
      handle: "38A1",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 24.0,
      start_angle: 0.0,
      end_angle: 30.00000000000012
    },
    {
      entity_type: "LINE",
      block_name: "*U23",
      handle: "38A2",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0000000000000013, y: -5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U23",
      handle: "38A3",
      start: { x: 24.0, y: 0.0000000000000062, z: 0.0 },
      end: { x: 24.0, y: -5.999999999999993, z: 0.0 }
    },
  
    // From block *U28 (flipped 36" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U28",
      handle: "3C5F",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -36.0, y: -0.0000000000000018, z: 0.0, bulge: 0 },
        { x: -36.0, y: 1.749999999999996, z: 0.0, bulge: 0 },
        { x: 0.0, y: 1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U28",
      handle: "3C60",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -31.1769145362398, y: -17.99999999999999, z: 0.0, bulge: 0 },
        { x: -32.0519145362398, y: -16.48445554337722, z: 0.0, bulge: 0 },
        { x: -0.875, y: 1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U28",
      handle: "3C61",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -25.45584412271571, y: -25.45584412271571, z: 0.0, bulge: 0 },
        { x: -26.69328098979217, y: -24.21840725563925, z: 0.0, bulge: 0 },
        { x: -1.237436867076461, y: 1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U28",
      handle: "3C62",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: -18.0, y: -31.17691453623979, z: 0.0, bulge: 0 },
        { x: -19.51554445662278, y: -30.3019145362398, z: 0.0, bulge: 0 },
        { x: -1.515544456622762, y: 0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U28",
      handle: "3C63",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: -0.0000000000000071, y: -36.0, z: 0.0, bulge: 0 },
        { x: -1.750000000000007, y: -36.0, z: 0.0, bulge: 0 },
        { x: -1.75, y: 0.0, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U28",
      handle: "3C64",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 180.0,
      end_angle: 270.0
    },
    {
      entity_type: "ARC",
      block_name: "*U28",
      handle: "3C65",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 180.0,
      end_angle: 240.0000000000004
    },
    {
      entity_type: "ARC",
      block_name: "*U28",
      handle: "3C66",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 180.0,
      end_angle: 225.0
    },
    {
      entity_type: "ARC",
      block_name: "*U28",
      handle: "3C67",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 36.0,
      start_angle: 180.0,
      end_angle: 210.0000000000003
    },
    {
      entity_type: "LINE",
      block_name: "*U28",
      handle: "3C68",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0, y: 5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U28",
      handle: "3C69",
      start: { x: -36.0, y: -0.0000000000000018, z: 0.0 },
      end: { x: -36.0, y: 5.999999999999998, z: 0.0 }
    },
  
    // From block *U35 (40" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U35",
      handle: "4035",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 40.0, y: 0.0000000000000071, z: 0.0, bulge: 0 },
        { x: 40.0, y: 1.750000000000006, z: 0.0, bulge: 0 },
        { x: -0.0000000000000007, y: 1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U35",
      handle: "4036",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 34.64101615137755, y: -19.99999999999998, z: 0.0, bulge: 0 },
        { x: 35.51601615137755, y: -18.48445554337721, z: 0.0, bulge: 0 },
        { x: 0.8749999999999992, y: 1.515544456622767, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U35",
      handle: "4037",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: 28.2842712474619, y: -28.2842712474619, z: 0.0, bulge: 0 },
        { x: 29.52170811453836, y: -27.04683438038544, z: 0.0, bulge: 0 },
        { x: 1.237436867076457, y: 1.237436867076458, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U35",
      handle: "4038",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 20.00000000000001, y: -34.64101615137753, z: 0.0, bulge: 0 },
        { x: 21.51554445662279, y: -33.76601615137754, z: 0.0, bulge: 0 },
        { x: 1.515544456622766, y: 0.875, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U35",
      handle: "4039",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000108, y: -40.0, z: 0.0, bulge: 0 },
        { x: 1.750000000000014, y: -40.0, z: 0.0, bulge: 0 },
        { x: 1.75, y: 0.0000000000000009, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U35",
      handle: "403A",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 270.0,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U35",
      handle: "403B",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 299.9999999999998,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U35",
      handle: "403C",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 315.0000000000002,
      end_angle: 0.0
    },
    {
      entity_type: "ARC",
      block_name: "*U35",
      handle: "403D",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 329.9999999999998,
      end_angle: 0.0
    },
    {
      entity_type: "LINE",
      block_name: "*U35",
      handle: "403E",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: -0.0000000000000025, y: 5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U35",
      handle: "403F",
      start: { x: 40.0, y: 0.0000000000000071, z: 0.0 },
      end: { x: 40.0, y: 6.000000000000007, z: 0.0 }
    },
  
    // From block *U38 (flipped 40" door)
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U38",
      handle: "43B7",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -40.0, y: -0.0000000000000156, z: 0.0, bulge: 0 },
        { x: -40.0, y: 1.749999999999983, z: 0.0, bulge: 0 },
        { x: 0.0, y: 1.749999999999999, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U38",
      handle: "43B8",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -34.64101615137753, y: -20.0, z: 0.0, bulge: 0 },
        { x: -35.51601615137754, y: -18.48445554337724, z: 0.0, bulge: 0 },
        { x: -0.875, y: 1.515544456622766, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U38",
      handle: "43B9",
      vertices: [
        { x: 0.0, y: 0.0000000000000009, z: 0.0, bulge: 0 },
        { x: -28.28427124746188, y: -28.28427124746191, z: 0.0, bulge: 0 },
        { x: -29.52170811453835, y: -27.04683438038546, z: 0.0, bulge: 0 },
        { x: -1.237436867076461, y: 1.237436867076457, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U38",
      handle: "43BA",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: -19.99999999999999, y: -34.64101615137756, z: 0.0, bulge: 0 },
        { x: -21.51554445662277, y: -33.76601615137756, z: 0.0, bulge: 0 },
        { x: -1.515544456622762, y: 0.8749999999999991, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "LWPOLYLINE",
      block_name: "*U38",
      handle: "43BB",
      vertices: [
        { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
        { x: 0.0000000000000142, y: -40.0, z: 0.0, bulge: 0 },
        { x: -1.749999999999992, y: -40.0, z: 0.0, bulge: 0 },
        { x: -1.75, y: -0.0000000000000001, z: 0.0, bulge: 0 }
      ],
      closed: true
    },
    {
      entity_type: "ARC",
      block_name: "*U38",
      handle: "43BC",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 180.0,
      end_angle: 270.0
    },
    {
      entity_type: "ARC",
      block_name: "*U38",
      handle: "43BD",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 180.0,
      end_angle: 240.0
    },
    {
      entity_type: "ARC",
      block_name: "*U38",
      handle: "43BE",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 180.0,
      end_angle: 225.0
    },
    {
      entity_type: "ARC",
      block_name: "*U38",
      handle: "43BF",
      center: { x: 0.0, y: 0.0, z: 0.0 },
      radius: 40.0,
      start_angle: 180.0,
      end_angle: 210.0000000000004
    },
    {
      entity_type: "LINE",
      block_name: "*U38",
      handle: "43C0",
      start: { x: 0.0, y: 0.0, z: 0.0 },
      end: { x: 0.0, y: 5.999999999999999, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U38",
      handle: "43C1",
      start: { x: -40.0, y: -0.0000000000000156, z: 0.0 },
      end: { x: -40.0, y: 5.999999999999984, z: 0.0 }
    },
  
    // Window blocks
    {
      entity_type: "LINE",
      block_name: "*U15",
      handle: "30DF",
      start: { x: 0.0, y: 4.0, z: 0.0 },
      end: { x: 0.0000000000000007, y: 0.0, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U15",
      handle: "30E0",
      start: { x: 36.0, y: 3.999999999999999, z: 0.0 },
      end: { x: 36.0, y: -0.0000000000000004, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U15",
      handle: "30E1",
      start: { x: 0.0000000000000007, y: 2.0, z: 0.0 },
      end: { x: 36.0, y: 2.0, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U17",
      handle: "3139",
      start: { x: 0.0, y: 4.0, z: 0.0 },
      end: { x: 0.0000000000000007, y: 0.0, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U17",
      handle: "313A",
      start: { x: 36.0, y: 3.999999999999999, z: 0.0 },
      end: { x: 36.0, y: -0.0000000000000004, z: 0.0 }
    },
    {
      entity_type: "LINE",
      block_name: "*U17",
      handle: "313B",
      start: { x: 0.0000000000000007, y: 2.0, z: 0.0 },
      end: { x: 36.0, y: 2.0, z: 0.0 }
    }
  ],
// ============ FURNITURE LINES ============
"furniture_lines": [
  // From block "Chair - Desk"
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69EF",
    start: { x: 8.5, y: -3.0, z: 0.0 },
    end: { x: 8.5, y: -4.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F0",
    start: { x: 8.5, y: -15.0, z: 0.0 },
    end: { x: 8.5, y: -16.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F1",
    start: { x: 10.5, y: -14.0, z: 0.0 },
    end: { x: 10.5, y: -5.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F2",
    start: { x: 2.0, y: -1.957599999999985, z: 0.0 },
    end: { x: 2.0, y: -3.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F3",
    start: { x: 6.5, y: -5.0, z: 0.0 },
    end: { x: 6.5, y: -14.0, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "69F4",
    center: { x: 8.5, y: -12.5, z: 0.0 },
    radius: 2.500000000004117,
    start_angle: 216.8699000000571,
    end_angle: 323.1300999999414
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "69F5",
    center: { x: 8.5, y: -6.5, z: 0.0 },
    radius: 2.500000000004026,
    start_angle: 36.86990000005867,
    end_angle: 143.1300999999429
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F6",
    start: { x: 8.5, y: 0.0, z: 0.0 },
    end: { x: 8.5, y: -1.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F7",
    start: { x: -2.0, y: -3.0, z: 0.0 },
    end: { x: -2.0, y: -1.93549999999999, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F8",
    start: { x: -6.5, y: -14.0, z: 0.0 },
    end: { x: -6.5, y: -5.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69F9",
    start: { x: -8.5, y: -3.0, z: 0.0 },
    end: { x: -8.5, y: -4.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69FA",
    start: { x: -8.5, y: -15.0, z: 0.0 },
    end: { x: -8.5, y: -16.0, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69FB",
    start: { x: -10.5, y: -5.0, z: 0.0 },
    end: { x: -10.5, y: -14.0, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "69FC",
    center: { x: -8.5, y: -12.5, z: 0.0 },
    radius: 2.500000000004117,
    start_angle: 216.8699000000571,
    end_angle: 323.1300999999414
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "69FD",
    center: { x: -8.5, y: -6.5, z: 0.0 },
    radius: 2.500000000004026,
    start_angle: 36.86990000005867,
    end_angle: 143.1300999999429
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "69FE",
    start: { x: -8.5, y: 0.0, z: 0.0 },
    end: { x: -8.5, y: -1.0, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "69FF",
    center: { x: 0.0, y: 19.625, z: 0.0 },
    radius: 36.62500000000001,
    start_angle: 256.5803000000073,
    end_angle: 283.4196999999925
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "6A00",
    start: { x: -8.5, y: -3.0, z: 0.0 },
    end: { x: 8.5, y: -3.0, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Chair - Desk",
    handle: "6A01",
    center: { x: 0.0, y: 34.625, z: 0.0 },
    radius: 36.62500000000001,
    start_angle: 256.5803000000073,
    end_angle: 283.4196999999925
  },
  {
    entity_type: "LINE",
    block_name: "Chair - Desk",
    handle: "6A02",
    start: { x: -8.5, y: 0.0, z: 0.0 },
    end: { x: 8.5, y: 0.0, z: 0.0 }
  },

  // From block "Sofa - Roundback 7 ft."
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A0C",
    start: { x: 11.99996999999999, y: -32.44210000000393, z: 0.0 },
    end: { x: 11.99997999999999, y: -6.597100000003898, z: 0.0 }
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A0D",
    vertices: [
      { x: 41.99997999999999, y: -8.000000000003943, z: 0.0, bulge: 0 },
      { x: 41.99997999999999, y: -34.00000000000395, z: 0.0, bulge: 0 },
      { x: 35.99997999999999, y: -34.00000000000395, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A0E",
    start: { x: 35.99997999999999, y: -34.00000000000395, z: 0.0 },
    end: { x: 35.99997999999999, y: -11.46960000000396, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A0F",
    start: { x: -12.00002, y: -32.44210000000393, z: 0.0 },
    end: { x: -12.00003, y: -6.597100000003898, z: 0.0 }
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A10",
    vertices: [
      { x: -36.000027, y: -34.00000000000395, z: 0.0, bulge: 0 },
      { x: -42.000027, y: -34.00000000000395, z: 0.0, bulge: 0 },
      { x: -42.000027, y: -8.000000000003943, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A11",
    start: { x: -36.000027, y: -34.00000000000395, z: 0.0 },
    end: { x: -36.000027, y: -11.46960000000396, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A12",
    start: { x: -36.000027, y: -32.44210000000393, z: 0.0 },
    end: { x: 35.99997999999999, y: -32.44210000000393, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A13",
    start: { x: -35.999844, y: -13.38190000000397, z: 0.0 },
    end: { x: 35.99979999999999, y: -13.38190000000397, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A14",
    center: { x: -0.0000100000000032, y: -127.1968000000039, z: 0.0 },
    radius: 121.1967999999973,
    start_angle: 72.72032999999948,
    end_angle: 107.2797000000005
  },
  {
    entity_type: "ARC",
    block_name: "Sofa - Roundback 7 ft.",
    handle: "6A15",
    center: { x: 0.0, y: -114.2500000000039, z: 0.0 },
    radius: 114.2500000000039,
    start_angle: 68.43141000000073,
    end_angle: 111.5686000000006
  },

  // From block "Sofa - Roundback Loveseat 5 ft."
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A7C",
    start: { x: 0.0, y: -32.44198000000246, z: 0.0 },
    end: { x: 0.0, y: -5.999980000002448, z: 0.0 }
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A7D",
    vertices: [
      { x: -23.99999999999999, y: -33.99998000000245, z: 0.0, bulge: 0 },
      { x: -29.99999999999999, y: -33.99998000000245, z: 0.0, bulge: 0 },
      { x: -29.99999999999999, y: -7.999980000002448, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A7E",
    start: { x: -23.99999999999999, y: -33.99998000000245, z: 0.0 },
    end: { x: -23.99999999999999, y: -11.46958000000243, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A7F",
    start: { x: -23.99999999999999, y: -32.44198000000246, z: 0.0 },
    end: { x: 24.00004000000001, y: -32.44198000000246, z: 0.0 }
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A80",
    start: { x: -23.99979999999998, y: -13.38178000000245, z: 0.0 },
    end: { x: 23.99986, y: -13.38178000000245, z: 0.0 }
  },
  {
    entity_type: "ARC",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A81",
    center: { x: 0.0, y: -61.38438000000245, z: 0.0 },
    radius: 55.38444000000723,
    start_angle: 64.32083000000305,
    end_angle: 115.6791999999996
  },
  {
    entity_type: "ARC",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A82",
    center: { x: 0.0, y: -60.24998000000245, z: 0.0 },
    radius: 60.24998000000245,
    start_angle: 60.13715000000122,
    end_angle: 119.862800000004
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A83",
    vertices: [
      { x: 30.00004000000001, y: -7.999980000002448, z: 0.0, bulge: 0 },
      { x: 30.00004000000001, y: -33.99998000000245, z: 0.0, bulge: 0 },
      { x: 24.00004000000001, y: -33.99998000000245, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LINE",
    block_name: "Sofa - Roundback Loveseat 5 ft.",
    handle: "6A84",
    start: { x: 24.00004000000001, y: -33.99998000000245, z: 0.0 },
    end: { x: 24.00004000000001, y: -11.46958000000243, z: 0.0 }
  },

  // From block "Table - Square Woodgrain 42 x 42 in."
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA0",
    vertices: [
      { x: 0.0, y: -42.0, z: 0.0, bulge: 0 },
      { x: 0.0, y: 0.0, z: 0.0, bulge: 0 },
      { x: 42.0, y: 0.0, z: 0.0, bulge: 0 },
      { x: 42.0, y: -42.0, z: 0.0, bulge: 0 }
    ],
    closed: true
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA1",
    vertices: [
      { x: 0.0, y: -8.0, z: 0.0, bulge: 0 },
      { x: 1.820300000000031, y: -8.100099999999997, z: 0.0, bulge: 0 },
      { x: 3.674100000000009, y: -8.2149, z: 0.0, bulge: 0 },
      { x: 5.541100000010032, y: -8.340800000000001, z: 0.0, bulge: 0 },
      { x: 7.401100000010046, y: -8.474099999999964, z: 0.0, bulge: 0 },
      { x: 9.233900000000005, y: -8.611199999999996, z: 0.0, bulge: 0 },
      { x: 11.01930000001005, y: -8.748400000000003, z: 0.0, bulge: 0 },
      { x: 12.7371, y: -8.882099999999979, z: 0.0, bulge: 0 },
      { x: 14.36710000001005, y: -9.008600000000001, z: 0.0, bulge: 0 },
      { x: 15.89539999999999, y: -9.124599999999986, z: 0.0, bulge: 0 },
      { x: 17.33370000001002, y: -9.227800000000002, z: 0.0, bulge: 0 },
      { x: 18.69970000000001, y: -9.315899999999999, z: 0.0, bulge: 0 },
      { x: 20.01160000001005, y: -9.387, z: 0.0, bulge: 0 },
      { x: 21.28710000000001, y: -9.438899999999989, z: 0.0, bulge: 0 },
      { x: 22.54420000001005, y: -9.469599999999957, z: 0.0, bulge: 0 },
      { x: 23.80080000000004, y: -9.476999999999975, z: 0.0, bulge: 0 },
      { x: 25.07490000000001, y: -9.459000000000003, z: 0.0, bulge: 0 },
      { x: 26.3791, y: -9.413700000000005, z: 0.0, bulge: 0 },
      { x: 27.70490000000001, y: -9.340299999999956, z: 0.0, bulge: 0 },
      { x: 29.03830000001006, y: -9.238200000000006, z: 0.0, bulge: 0 },
      { x: 30.3655, y: -9.106799999999964, z: 0.0, bulge: 0 },
      { x: 31.6728, y: -8.945499999999981, z: 0.0, bulge: 0 },
      { x: 32.9461, y: -8.753499999999974, z: 0.0, bulge: 0 },
      { x: 34.17170000000004, y: -8.530399999999985, z: 0.0, bulge: 0 },
      { x: 35.33580000000001, y: -8.275599999999997, z: 0.0, bulge: 0 },
      { x: 36.42680000000002, y: -7.986299999999971, z: 0.0, bulge: 0 },
      { x: 37.44300000000004, y: -7.652099999999961, z: 0.0, bulge: 0 },
      { x: 38.38490000000002, y: -7.260299999999972, z: 0.0, bulge: 0 },
      { x: 39.25300000000004, y: -6.798599999999964, z: 0.0, bulge: 0 },
      { x: 40.048, y: -6.254199999999968, z: 0.0, bulge: 0 },
      { x: 40.77050000000002, y: -5.61469999999997, z: 0.0, bulge: 0 },
      { x: 41.42100000001, y: -4.867399999999975, z: 0.0, bulge: 0 },
      { x: 42.0, y: -4.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA2",
    vertices: [
      { x: 42.0, y: -12.0, z: 0.0, bulge: 0 },
      { x: 39.17840000000001, y: -12.8621, z: 0.0, bulge: 0 },
      { x: 36.45190000001003, y: -13.56540000000001, z: 0.0, bulge: 0 },
      { x: 33.82460000001004, y: -14.12939999999997, z: 0.0, bulge: 0 },
      { x: 31.30040000000003, y: -14.57310000000001, z: 0.0, bulge: 0 },
      { x: 28.88320000000005, y: -14.91609999999997, z: 0.0, bulge: 0 },
      { x: 26.577, y: -15.17750000000001, z: 0.0, bulge: 0 },
      { x: 24.38580000000002, y: -15.3768, z: 0.0, bulge: 0 },
      { x: 22.31360000000001, y: -15.53319999999996, z: 0.0, bulge: 0 },
      { x: 20.36220000001003, y: -15.66319999999996, z: 0.0, bulge: 0 },
      { x: 18.52539999999999, y: -15.77179999999998, z: 0.0, bulge: 0 },
      { x: 16.79470000001004, y: -15.8612, z: 0.0, bulge: 0 },
      { x: 15.16180000000003, y: -15.93379999999996, z: 0.0, bulge: 0 },
      { x: 13.61830000000003, y: -15.9916, z: 0.0, bulge: 0 },
      { x: 12.1558, y: -16.0369, z: 0.0, bulge: 0 },
      { x: 10.76590000000004, y: -16.07179999999999, z: 0.0, bulge: 0 },
      { x: 9.440300000000036, y: -16.0987, z: 0.0, bulge: 0 },
      { x: 8.170299999999997, y: -16.1191, z: 0.0, bulge: 0 },
      { x: 6.946100000000001, y: -16.13249999999999, z: 0.0, bulge: 0 },
      { x: 5.757699999999999, y: -16.13769999999999, z: 0.0, bulge: 0 },
      { x: 4.595000000010031, y: -16.13349999999997, z: 0.0, bulge: 0 },
      { x: 3.447900000000004, y: -16.11879999999996, z: 0.0, bulge: 0 },
      { x: 2.306399999999996, y: -16.09239999999999, z: 0.0, bulge: 0 },
      { x: 1.160400000000038, y: -16.0532, z: 0.0, bulge: 0 },
      { x: 0.0, y: -16.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA3",
    vertices: [
      { x: 0.0, y: -32.0, z: 0.0, bulge: 0 },
      { x: 5.402600000000006, y: -32.53579999999999, z: 0.0, bulge: 0 },
      { x: 9.949400000000025, y: -33.01900000000001, z: 0.0, bulge: 0 },
      { x: 13.74240000000003, y: -33.45529999999997, z: 0.0, bulge: 0 },
      { x: 16.88339999999999, y: -33.85050000000001, z: 0.0, bulge: 0 },
      { x: 19.47430000000003, y: -34.2106, z: 0.0, bulge: 0 },
      { x: 21.61710000001006, y: -34.54129999999998, z: 0.0, bulge: 0 },
      { x: 23.41360000000003, y: -34.84859999999998, z: 0.0, bulge: 0 },
      { x: 24.96570000000003, y: -35.13819999999999, z: 0.0, bulge: 0 },
      { x: 26.36140000000001, y: -35.41559999999999, z: 0.0, bulge: 0 },
      { x: 27.63320000000005, y: -35.6841, z: 0.0, bulge: 0 },
      { x: 28.79950000000003, y: -35.94669999999997, z: 0.0, bulge: 0 },
      { x: 29.87880000000001, y: -36.20639999999998, z: 0.0, bulge: 0 },
      { x: 30.88970000000001, y: -36.46609999999999, z: 0.0, bulge: 0 },
      { x: 31.85070000000002, y: -36.72879999999998, z: 0.0, bulge: 0 },
      { x: 32.78020000000998, y: -36.9973, z: 0.0, bulge: 0 },
      { x: 33.6968, y: -37.2747, z: 0.0, bulge: 0 },
      { x: 34.61750000000001, y: -37.56349999999998, z: 0.0, bulge: 0 },
      { x: 35.55310000000003, y: -37.86509999999998, z: 0.0, bulge: 0 },
      { x: 36.51280000000003, y: -38.18049999999999, z: 0.0, bulge: 0 },
      { x: 37.50600000000003, y: -38.51079999999996, z: 0.0, bulge: 0 },
      { x: 38.54210000000001, y: -38.85679999999997, z: 0.0, bulge: 0 },
      { x: 39.6302, y: -39.21969999999999, z: 0.0, bulge: 0 },
      { x: 40.77970000000999, y: -39.60039999999998, z: 0.0, bulge: 0 },
      { x: 42.0, y: -40.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA4",
    vertices: [
      { x: 42.0, y: -32.0, z: 0.0, bulge: 0 },
      { x: 37.392, y: -31.017, z: 0.0, bulge: 0 },
      { x: 33.45850000000002, y: -30.22309999999999, z: 0.0, bulge: 0 },
      { x: 30.1291, y: -29.5949, z: 0.0, bulge: 0 },
      { x: 27.33340000000004, y: -29.10899999999998, z: 0.0, bulge: 0 },
      { x: 25.0009, y: -28.74199999999996, z: 0.0, bulge: 0 },
      { x: 23.06120000000004, y: -28.47069999999997, z: 0.0, bulge: 0 },
      { x: 21.44390000000004, y: -28.27159999999998, z: 0.0, bulge: 0 },
      { x: 20.07860000001006, y: -28.12149999999997, z: 0.0, bulge: 0 },
      { x: 18.89980000001003, y: -28.00020000000001, z: 0.0, bulge: 0 },
      { x: 17.86090000000001, y: -27.90139999999997, z: 0.0, bulge: 0 },
      { x: 16.92060000001004, y: -27.82189999999997, z: 0.0, bulge: 0 },
      { x: 16.03710000000001, y: -27.75880000000001, z: 0.0, bulge: 0 },
      { x: 15.16910000000001, y: -27.70900000000001, z: 0.0, bulge: 0 },
      { x: 14.27480000001003, y: -27.66929999999997, z: 0.0, bulge: 0 },
      { x: 13.31280000001004, y: -27.63679999999999, z: 0.0, bulge: 0 },
      { x: 12.24150000000003, y: -27.60829999999999, z: 0.0, bulge: 0 },
      { x: 11.02950000000004, y: -27.58240000000001, z: 0.0, bulge: 0 },
      { x: 9.68670000000003, y: -27.5643, z: 0.0, bulge: 0 },
      { x: 8.233000000000004, y: -27.56079999999997, z: 0.0, bulge: 0 },
      { x: 6.688400000000001, y: -27.57869999999997, z: 0.0, bulge: 0 },
      { x: 5.072800000010033, y: -27.6248, z: 0.0, bulge: 0 },
      { x: 3.406200000000012, y: -27.70580000000001, z: 0.0, bulge: 0 },
      { x: 1.708599999999989, y: -27.82859999999999, z: 0.0, bulge: 0 },
      { x: 0.0, y: -28.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA5",
    vertices: [
      { x: 0.0, y: -24.0, z: 0.0, bulge: 0 },
      { x: 3.924300000000016, y: -23.6805, z: 0.0, bulge: 0 },
      { x: 7.476600000000019, y: -23.41379999999998, z: 0.0, bulge: 0 },
      { x: 10.68909999999999, y: -23.19540000000001, z: 0.0, bulge: 0 },
      { x: 13.59430000000003, y: -23.02049999999997, z: 0.0, bulge: 0 },
      { x: 16.22470000000004, y: -22.88470000000001, z: 0.0, bulge: 0 },
      { x: 18.61250000000001, y: -22.78319999999997, z: 0.0, bulge: 0 },
      { x: 20.7903, y: -22.71159999999998, z: 0.0, bulge: 0 },
      { x: 22.7903, y: -22.6651, z: 0.0, bulge: 0 },
      { x: 24.65630000000004, y: -22.642, z: 0.0, bulge: 0 },
      { x: 26.47640000000001, y: -22.65069999999997, z: 0.0, bulge: 0 },
      { x: 28.35000000001003, y: -22.70240000000001, z: 0.0, bulge: 0 },
      { x: 30.3766, y: -22.80840000000001, z: 0.0, bulge: 0 },
      { x: 32.65550000000002, y: -22.97999999999996, z: 0.0, bulge: 0 },
      { x: 35.28610000001004, y: -23.22829999999999, z: 0.0, bulge: 0 },
      { x: 38.36780000000004, y: -23.56450000000001, z: 0.0, bulge: 0 },
      { x: 42.0, y: -24.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA6",
    vertices: [
      { x: 42.0, y: -16.0, z: 0.0, bulge: 0 },
      { x: 37.65290000000999, y: -16.73649999999998, z: 0.0, bulge: 0 },
      { x: 33.8802, y: -17.329, z: 0.0, bulge: 0 },
      { x: 30.61790000000002, y: -17.79609999999997, z: 0.0, bulge: 0 },
      { x: 27.80150000001004, y: -18.15609999999998, z: 0.0, bulge: 0 },
      { x: 25.36680000000001, y: -18.42750000000001, z: 0.0, bulge: 0 },
      { x: 23.24970000000002, y: -18.62879999999995, z: 0.0, bulge: 0 },
      { x: 21.38589999999999, y: -18.77850000000001, z: 0.0, bulge: 0 },
      { x: 19.71110000000004, y: -18.89490000000001, z: 0.0, bulge: 0 },
      { x: 18.16930000001002, y: -18.9939, z: 0.0, bulge: 0 },
      { x: 16.73750000000001, y: -19.07949999999999, z: 0.0, bulge: 0 },
      { x: 15.40100000000001, y: -19.15339999999997, z: 0.0, bulge: 0 },
      { x: 14.1449, y: -19.21699999999998, z: 0.0, bulge: 0 },
      { x: 12.95440000000002, y: -19.27170000000001, z: 0.0, bulge: 0 },
      { x: 11.81479999999999, y: -19.31909999999999, z: 0.0, bulge: 0 },
      { x: 10.71130000001005, y: -19.36059999999997, z: 0.0, bulge: 0 },
      { x: 9.629099999999993, y: -19.39760000000001, z: 0.0, bulge: 0 },
      { x: 8.55340000000001, y: -19.43229999999999, z: 0.0, bulge: 0 },
      { x: 7.470000000010031, y: -19.46889999999996, z: 0.0, bulge: 0 },
      { x: 6.364300000000014, y: -19.51220000000001, z: 0.0, bulge: 0 },
      { x: 5.222000000000036, y: -19.56719999999996, z: 0.0, bulge: 0 },
      { x: 4.028800000010051, y: -19.6386, z: 0.0, bulge: 0 },
      { x: 2.770300000010024, y: -19.73129999999997, z: 0.0, bulge: 0 },
      { x: 1.432099999999991, y: -19.8501, z: 0.0, bulge: 0 },
      { x: 0.0, y: -20.0, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA7",
    vertices: [
      { x: 0.0, y: -36.0, z: 0.0, bulge: 0 },
      { x: 3.009800000010045, y: -36.28569999999996, z: 0.0, bulge: 0 },
      { x: 5.535400000000038, y: -36.5643, z: 0.0, bulge: 0 },
      { x: 7.636799999999993, y: -36.83589999999998, z: 0.0, bulge: 0 },
      { x: 9.374000000010028, y: -37.10089999999997, z: 0.0, bulge: 0 },
      { x: 10.80700000000001, y: -37.35969999999998, z: 0.0, bulge: 0 },
      { x: 11.9957, y: -37.61259999999999, z: 0.0, bulge: 0 },
      { x: 13.00020000000001, y: -37.85989999999998, z: 0.0, bulge: 0 },
      { x: 13.88040000000001, y: -38.10199999999998, z: 0.0, bulge: 0 },
      { x: 14.68740000001003, y: -38.33929999999998, z: 0.0, bulge: 0 },
      { x: 15.43650000001003, y: -38.57290000000001, z: 0.0, bulge: 0 },
      { x: 16.13380000000001, y: -38.80410000000001, z: 0.0, bulge: 0 },
      { x: 16.78579999999999, y: -39.03409999999997, z: 0.0, bulge: 0 },
      { x: 17.39870000000002, y: -39.26400000000001, z: 0.0, bulge: 0 },
      { x: 17.9787, y: -39.49520000000001, z: 0.0, bulge: 0 },
      { x: 18.53220000000004, y: -39.72879999999998, z: 0.0, bulge: 0 },
      { x: 19.06550000001004, y: -39.96619999999996, z: 0.0, bulge: 0 },
      { x: 19.58320000001004, y: -40.20809999999999, z: 0.0, bulge: 0 },
      { x: 20.08420000000001, y: -40.45439999999996, z: 0.0, bulge: 0 },
      { x: 20.56569999999999, y: -40.70459999999997, z: 0.0, bulge: 0 },
      { x: 21.0249, y: -40.9581, z: 0.0, bulge: 0 },
      { x: 21.45900000001006, y: -41.21440000000001, z: 0.0, bulge: 0 },
      { x: 21.86530000001005, y: -41.47309999999999, z: 0.0, bulge: 0 },
      { x: 22.24090000000001, y: -41.73349999999999, z: 0.0, bulge: 0 },
      { x: 22.5831, y: -41.99509999999998, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LWPOLYLINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA8",
    vertices: [
      { x: 0.0, y: -4.0, z: 0.0, bulge: 0 },
      { x: 1.704000000000007, y: -4.217199999999991, z: 0.0, bulge: 0 },
      { x: 3.235800000010044, y: -4.418799999999976, z: 0.0, bulge: 0 },
      { x: 4.615000000000009, y: -4.603999999999984, z: 0.0, bulge: 0 },
      { x: 5.861500000000035, y: -4.772099999999966, z: 0.0, bulge: 0 },
      { x: 6.995100000000036, y: -4.922399999999981, z: 0.0, bulge: 0 },
      { x: 8.035700000010024, y: -5.054100000000005, z: 0.0, bulge: 0 },
      { x: 9.003100000010022, y: -5.166699999999991, z: 0.0, bulge: 0 },
      { x: 9.917100000000004, y: -5.25939999999997, z: 0.0, bulge: 0 },
      { x: 10.79510000001005, y: -5.33159999999998, z: 0.0, bulge: 0 },
      { x: 11.64449999999999, y: -5.383600000000001, z: 0.0, bulge: 0 },
      { x: 12.47020000000003, y: -5.415699999999958, z: 0.0, bulge: 0 },
      { x: 13.27700000000004, y: -5.428299999999978, z: 0.0, bulge: 0 },
      { x: 14.06980000000004, y: -5.421699999999987, z: 0.0, bulge: 0 },
      { x: 14.85349999999999, y: -5.396399999999971, z: 0.0, bulge: 0 },
      { x: 15.63310000000001, y: -5.352599999999995, z: 0.0, bulge: 0 },
      { x: 16.41330000001005, y: -5.29079999999999, z: 0.0, bulge: 0 },
      { x: 17.1986, y: -5.210299999999961, z: 0.0, bulge: 0 },
      { x: 17.99130000001003, y: -5.106200000000001, z: 0.0, bulge: 0 },
      { x: 18.793, y: -4.972699999999974, z: 0.0, bulge: 0 },
      { x: 19.60560000000004, y: -4.803799999999966, z: 0.0, bulge: 0 },
      { x: 20.4307, y: -4.593699999999955, z: 0.0, bulge: 0 },
      { x: 21.27010000000002, y: -4.3365, z: 0.0, bulge: 0 },
      { x: 22.12560000000002, y: -4.02619999999996, z: 0.0, bulge: 0 },
      { x: 22.99890000001005, y: -3.657099999999957, z: 0.0, bulge: 0 },
      { x: 23.88800000000003, y: -3.227199999999982, z: 0.0, bulge: 0 },
      { x: 24.7756, y: -2.751599999999996, z: 0.0, bulge: 0 },
      { x: 25.64080000000001, y: -2.249099999999998, z: 0.0, bulge: 0 },
      { x: 26.46240000000001, y: -1.738699999999994, z: 0.0, bulge: 0 },
      { x: 27.21950000001005, y: -1.239499999999964, z: 0.0, bulge: 0 },
      { x: 27.89100000000002, y: -0.7702999999999634, z: 0.0, bulge: 0 },
      { x: 28.45600000000002, y: -0.3500999999999976, z: 0.0, bulge: 0 },
      { x: 28.89340000001005, y: 0.0020000000000096, z: 0.0, bulge: 0 }
    ],
    closed: false
  },
  {
    entity_type: "LINE",
    block_name: "Table - Square Woodgrain 42 x 42 in.",
    handle: "6AA9",
    start: { x: 0.0, y: -42.0, z: 0.0 },
    end: { x: 42.0, y: -42.0, z: 0.0 }
  }
]
}
