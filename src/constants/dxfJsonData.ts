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
