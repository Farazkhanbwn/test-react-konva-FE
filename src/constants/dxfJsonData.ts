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
  };
  lines: DxfLine[];
  arcs: unknown[];
  polylines: DxfPolyline[];
  texts: DxfText[];
}

// export const DXF_JSON_DATA: DxfJsonDocument = {
//   source_file: 'AUTOCAD-FLOOR-PLAN.dxf',
//   meta: {
//     acad_version: 'AC1032',
//     extmin: [20.70000015784895, 21.81555533002226, 0.0],
//     extmax: [33.70000015784894, 35.11555533002226, 0.0],
//   },
//   stats: {
//     entity_counts: { LINE: 64, LWPOLYLINE: 2, MTEXT: 10 },
//     polyline_count: 2,
//     line_count: 64,
//     arc_count: 0,
//     text_count: 10,
//     total_vertex_count: 16,
//   },
//   lines: [
//     { entity_type: 'LINE', handle: '26D', layer: '0', start: { x: 25.00000015784895, y: 22.81555533002226, z: 0 }, end: { x: 21.00000015784894, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '26E', layer: '0', start: { x: 21.00000015784894, y: 22.81555533002226, z: 0 }, end: { x: 21.00000015784894, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '26F', layer: '0', start: { x: 21.00000015784894, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '270', layer: '0', start: { x: 25.00000015784895, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '275', layer: '0', start: { x: 21.00000015784894, y: 25.81555533002227, z: 0 }, end: { x: 21.00000015784894, y: 30.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '276', layer: '0', start: { x: 21.00000015784894, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 30.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '277', layer: '0', start: { x: 25.00000015784895, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '27C', layer: '0', start: { x: 21.00000015784894, y: 30.81555533002227, z: 0 }, end: { x: 21.00000015784894, y: 34.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '27D', layer: '0', start: { x: 21.00000015784894, y: 34.81555533002226, z: 0 }, end: { x: 26.00000015784895, y: 34.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '27E', layer: '0', start: { x: 26.00000015784895, y: 34.81555533002226, z: 0 }, end: { x: 26.00000015784895, y: 30.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '27F', layer: '0', start: { x: 26.00000015784895, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 30.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '280', layer: '0', start: { x: 26.00000015784895, y: 34.81555533002226, z: 0 }, end: { x: 27.20000015784894, y: 34.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '281', layer: '0', start: { x: 27.20000015784894, y: 34.81555533002226, z: 0 }, end: { x: 27.20000015784894, y: 32.71555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '282', layer: '0', start: { x: 27.20000015784894, y: 32.71555533002227, z: 0 }, end: { x: 26.00000015784895, y: 32.71555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '283', layer: '0', start: { x: 27.20000015784894, y: 34.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 34.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '284', layer: '0', start: { x: 28.40000015784895, y: 34.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 33.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '285', layer: '0', start: { x: 28.40000015784895, y: 33.61555533002226, z: 0 }, end: { x: 27.20000015784894, y: 33.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '286', layer: '0', start: { x: 28.40000015784895, y: 34.81555533002226, z: 0 }, end: { x: 32.40000015784894, y: 34.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '287', layer: '0', start: { x: 32.40000015784894, y: 34.81555533002226, z: 0 }, end: { x: 32.40000015784894, y: 29.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '288', layer: '0', start: { x: 32.40000015784894, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 29.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '289', layer: '0', start: { x: 28.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 33.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '28A', layer: '0', start: { x: 28.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '28B', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 33.40000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '28C', layer: '0', start: { x: 33.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 33.40000015784895, y: 29.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '28D', layer: '0', start: { x: 33.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 32.40000015784894, y: 29.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '28F', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '291', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '292', layer: '0', start: { x: 28.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 25.00000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '299', layer: '0', start: { x: 28.40000015784895, y: 25.51555533002226, z: 0 }, end: { x: 26.79000015784894, y: 25.51555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29A', layer: '0', start: { x: 28.40000015784895, y: 25.21555533002227, z: 0 }, end: { x: 26.79000015784894, y: 25.21555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29B', layer: '0', start: { x: 28.40000015784895, y: 24.91555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.91555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29C', layer: '0', start: { x: 28.40000015784895, y: 24.61555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29D', layer: '0', start: { x: 28.40000015784895, y: 24.31555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.31555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29E', layer: '0', start: { x: 28.40000015784895, y: 24.01555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.01555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '29F', layer: '0', start: { x: 28.40000015784895, y: 23.71555533002226, z: 0 }, end: { x: 26.79000015784894, y: 23.71555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A0', layer: '0', start: { x: 28.40000015784895, y: 23.41555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.41555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A1', layer: '0', start: { x: 28.40000015784895, y: 23.11555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.11555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A4', layer: '0', start: { x: 26.80000015784895, y: 25.81555533002227, z: 0 }, end: { x: 26.80000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A7', layer: '0', start: { x: 26.79000015784894, y: 25.81555533002227, z: 0 }, end: { x: 26.79000015784894, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A8', layer: '0', start: { x: 26.59000015784894, y: 25.81555533002227, z: 0 }, end: { x: 26.59000015784894, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2A9', layer: '0', start: { x: 26.59000015784894, y: 25.51555533002226, z: 0 }, end: { x: 25.00000015784895, y: 25.51555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2AA', layer: '0', start: { x: 26.59000015784894, y: 25.21555533002226, z: 0 }, end: { x: 25.00000015784895, y: 25.21555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '2AB', layer: '0', start: { x: 26.59000015784894, y: 24.91555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.91555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2AC', layer: '0', start: { x: 26.59000015784894, y: 24.31555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.31555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2AD', layer: '0', start: { x: 26.59000015784894, y: 24.61555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2AE', layer: '0', start: { x: 26.59000015784894, y: 24.01555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.01555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2AF', layer: '0', start: { x: 26.59000015784894, y: 23.71555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.71555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B0', layer: '0', start: { x: 25.00000015784895, y: 22.81555533002226, z: 0 }, end: { x: 25.00000015784895, y: 21.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B1', layer: '0', start: { x: 25.00000015784895, y: 21.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 21.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B2', layer: '0', start: { x: 28.40000015784895, y: 21.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B3', layer: '0', start: { x: 28.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 33.40000015784895, y: 22.81555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B4', layer: '0', start: { x: 33.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 33.40000015784895, y: 25.81555533002227, z: 0 } },
//     { entity_type: 'LINE', handle: '2B5', layer: '0', start: { x: 28.40000015784895, y: 24.61555533002226, z: 0 }, end: { x: 30.50000015784894, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B6', layer: '0', start: { x: 29.60000015784894, y: 25.81555533002227, z: 0 }, end: { x: 29.60000015784894, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B7', layer: '0', start: { x: 29.90000015784895, y: 25.81555533002227, z: 0 }, end: { x: 29.90000015784894, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B8', layer: '0', start: { x: 30.20000015784895, y: 25.81555533002227, z: 0 }, end: { x: 30.20000015784894, y: 24.61555533002226, z: 0 } },
//     { entity_type: 'LINE', handle: '2B9', layer: '0', start: { x: 30.50000015784894, y: 25.81555533002227, z: 0 }, end: { x: 30.50000015784894, y: 24.61555533002226, z: 0 } },
//   ],
//   arcs: [],
//   polylines: [
//     {
//       entity_type: 'LWPOLYLINE',
//       handle: '2BD',
//       layer: '0',
//       closed: false,
//       vertex_count: 8,
//       vertices: [
//         { x: 25.00000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
//         { x: 21.00000015784894, y: 22.81555533002226, z: 0, bulge: 0 },
//         { x: 21.00000015784894, y: 34.81555533002226, z: 0, bulge: 0 },
//         { x: 32.40000015784894, y: 34.81555533002226, z: 0, bulge: 0 },
//         { x: 32.40000015784894, y: 29.81555533002227, z: 0, bulge: 0 },
//         { x: 33.40000015784895, y: 29.81555533002227, z: 0, bulge: 0 },
//         { x: 33.40000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
//         { x: 28.40000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
//       ],
//     },
//     {
//       entity_type: 'LWPOLYLINE',
//       handle: '2BE',
//       layer: '0',
//       closed: false,
//       vertex_count: 8,
//       vertices: [
//         { x: 25.00000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
//         { x: 20.70000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
//         { x: 20.70000015784895, y: 35.11555533002226, z: 0, bulge: 0 },
//         { x: 32.70000015784894, y: 35.11555533002226, z: 0, bulge: 0 },
//         { x: 32.70000015784894, y: 30.11555533002227, z: 0, bulge: 0 },
//         { x: 33.70000015784894, y: 30.11555533002226, z: 0, bulge: 0 },
//         { x: 33.70000015784894, y: 22.51555533002226, z: 0, bulge: 0 },
//         { x: 28.40000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
//       ],
//     },
//   ],
//   texts: [
//     { entity_type: 'MTEXT', handle: '2C4', layer: '0', text: 'KITCHEN\n5 X 4 M', position: { x: 22.647, y: 33.376, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2CF', layer: '0', text: 'LIVING ROOM\n4 X 5 M', position: { x: 21.953, y: 28.470, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2D7', layer: '0', text: 'OFFICE\n4 X M', position: { x: 21.842, y: 24.632, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2DF', layer: '0', text: 'BEDROOM\n4 X 5 M', position: { x: 29.453, y: 32.603, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2E7', layer: '0', text: 'BEDROOM\n5 X 4 M', position: { x: 30.118, y: 28.175, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2EF', layer: '0', text: 'PARKING\n5 X 3 M', position: { x: 30.488, y: 24.448, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '2F7', layer: '0', text: 'LOBBY', position: { x: 25.869, y: 28.839, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '300', layer: '0', text: 'LANDING\n1M WIDE', position: { x: 25.699, y: 22.589, z: 0 }, height: 0.2 },
//     { entity_type: 'MTEXT', handle: '308', layer: '0', text: 'BATH\n1.2 X 2.1 M', position: { x: 25.662, y: 34.387, z: 0 }, height: 0.14 },
//     { entity_type: 'MTEXT', handle: '310', layer: '0', text: 'WC\n1.2 X 1.2 M', position: { x: 27.139, y: 34.663, z: 0 }, height: 0.14 },
//   ],
// }

// export const DXF_JSON_DATA: DxfJsonDocument = {
//   source_file: "update-autocad-file.dxf",
//   meta: {
//     acad_version: "AC1032",
//     extmin: [-0.6949059034284347, -3.716204318229131, 0.0],
//     extmax: [20.17745305040325, 7.295196564956299, 0.0],
//   },
//   stats: {
//     entity_counts: {
//       LINE: 37,
//       MTEXT: 8,
//       INSERT: 2,
//     },
//     polyline_count: 0,
//     line_count: 37,
//     arc_count: 0,
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
//         x: 0.6108066156627175,
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
//         x: 6.610806615662717,
//         y: 4.795196564956299,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "292",
//       layer: "0",
//       start: {
//         x: 7.941414477020998,
//         y: 3.945196564956299,
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
//         x: 13.30632917594676,
//         y: 3.945196564956299,
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
//         y: -2.745149250328729,
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
//   ],
//   arcs: [],
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
// };

// export const DXF_JSON_DATA: DxfJsonDocument = {
//   source_file: "floor_plan_2bed.dxf",
//   meta: {
//     acad_version: "AC1009",
//     extmin: [0.0, 0.0, 0.0],
//     extmax: [0.0, 0.0, 0.0],
//   },
//   stats: {
//     entity_counts: {
//       LINE: 103,
//       ARC: 4,
//       TEXT: 23,
//       CIRCLE: 5,
//     },
//     polyline_count: 0,
//     line_count: 103,
//     arc_count: 4,
//     text_count: 23,
//     total_vertex_count: 0,
//   },
//   lines: [
//     {
//       entity_type: "LINE",
//       handle: "A",
//       layer: "Walls_Thick",
//       start: {
//         x: 0.0,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: 0.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "B",
//       layer: "Walls_Thick",
//       start: {
//         x: 14.0,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "C",
//       layer: "Walls_Thick",
//       start: {
//         x: 14.0,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 0.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "D",
//       layer: "Walls_Thick",
//       start: {
//         x: 0.0,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 0.0,
//         y: 0.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "E",
//       layer: "Walls_Thick",
//       start: {
//         x: 0.2,
//         y: 0.2,
//         z: 0.0,
//       },
//       end: {
//         x: 13.8,
//         y: 0.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "F",
//       layer: "Walls_Thick",
//       start: {
//         x: 13.8,
//         y: 0.2,
//         z: 0.0,
//       },
//       end: {
//         x: 13.8,
//         y: 9.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "10",
//       layer: "Walls_Thick",
//       start: {
//         x: 13.8,
//         y: 9.8,
//         z: 0.0,
//       },
//       end: {
//         x: 0.2,
//         y: 9.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "11",
//       layer: "Walls_Thick",
//       start: {
//         x: 0.2,
//         y: 9.8,
//         z: 0.0,
//       },
//       end: {
//         x: 0.2,
//         y: 0.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "12",
//       layer: "Walls",
//       start: {
//         x: 0.0,
//         y: 6.0,
//         z: 0.0,
//       },
//       end: {
//         x: 2.3,
//         y: 6.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "13",
//       layer: "Walls",
//       start: {
//         x: 0.0,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 2.3,
//         y: 6.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "14",
//       layer: "Walls",
//       start: {
//         x: 3.2,
//         y: 6.0,
//         z: 0.0,
//       },
//       end: {
//         x: 9.0,
//         y: 6.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "15",
//       layer: "Walls",
//       start: {
//         x: 3.2,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 9.0,
//         y: 6.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "16",
//       layer: "Walls",
//       start: {
//         x: 9.9,
//         y: 6.0,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: 6.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "17",
//       layer: "Walls",
//       start: {
//         x: 9.9,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: 6.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "18",
//       layer: "Walls",
//       start: {
//         x: 7.0,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 7.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "19",
//       layer: "Walls",
//       start: {
//         x: 7.2,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 7.2,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "1A",
//       layer: "Walls",
//       start: {
//         x: 4.0,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 4.0,
//         y: 2.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "1B",
//       layer: "Walls",
//       start: {
//         x: 4.2,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 4.2,
//         y: 2.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "1C",
//       layer: "Walls",
//       start: {
//         x: 4.0,
//         y: 3.7,
//         z: 0.0,
//       },
//       end: {
//         x: 4.0,
//         y: 6.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "1D",
//       layer: "Walls",
//       start: {
//         x: 4.2,
//         y: 3.7,
//         z: 0.0,
//       },
//       end: {
//         x: 4.2,
//         y: 6.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "1F",
//       layer: "Doors",
//       start: {
//         x: 2.3,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 3.2,
//         y: 6.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "21",
//       layer: "Doors",
//       start: {
//         x: 9.0,
//         y: 6.2,
//         z: 0.0,
//       },
//       end: {
//         x: 9.9,
//         y: 6.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "23",
//       layer: "Doors",
//       start: {
//         x: 4.2,
//         y: 3.7,
//         z: 0.0,
//       },
//       end: {
//         x: 4.2,
//         y: 2.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "25",
//       layer: "Doors",
//       start: {
//         x: 9.0,
//         y: 0.2,
//         z: 0.0,
//       },
//       end: {
//         x: 10.0,
//         y: 0.2,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "26",
//       layer: "Windows",
//       start: {
//         x: 2.0,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "27",
//       layer: "Windows",
//       start: {
//         x: 2.0,
//         y: 10.15,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "28",
//       layer: "Windows",
//       start: {
//         x: 2.75,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 2.75,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "29",
//       layer: "Windows",
//       start: {
//         x: 3.5,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 3.5,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2A",
//       layer: "Windows",
//       start: {
//         x: 4.25,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 4.25,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2B",
//       layer: "Windows",
//       start: {
//         x: 9.0,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 12.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2C",
//       layer: "Windows",
//       start: {
//         x: 9.0,
//         y: 10.15,
//         z: 0.0,
//       },
//       end: {
//         x: 12.0,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2D",
//       layer: "Windows",
//       start: {
//         x: 9.75,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 9.75,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2E",
//       layer: "Windows",
//       start: {
//         x: 10.5,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 10.5,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "2F",
//       layer: "Windows",
//       start: {
//         x: 11.25,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: 11.25,
//         y: 10.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "30",
//       layer: "Windows",
//       start: {
//         x: 0.0,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: 0.0,
//         y: 4.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "31",
//       layer: "Windows",
//       start: {
//         x: -0.15,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: -0.15,
//         y: 4.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "32",
//       layer: "Windows",
//       start: {
//         x: 0.0,
//         y: 2.625,
//         z: 0.0,
//       },
//       end: {
//         x: -0.15,
//         y: 2.625,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "33",
//       layer: "Windows",
//       start: {
//         x: 0.0,
//         y: 3.25,
//         z: 0.0,
//       },
//       end: {
//         x: -0.15,
//         y: 3.25,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "34",
//       layer: "Windows",
//       start: {
//         x: 0.0,
//         y: 3.875,
//         z: 0.0,
//       },
//       end: {
//         x: -0.15,
//         y: 3.875,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "35",
//       layer: "Windows",
//       start: {
//         x: 14.0,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: 5.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "36",
//       layer: "Windows",
//       start: {
//         x: 13.85,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: 13.85,
//         y: 5.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "37",
//       layer: "Windows",
//       start: {
//         x: 14.0,
//         y: 2.75,
//         z: 0.0,
//       },
//       end: {
//         x: 13.85,
//         y: 2.75,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "38",
//       layer: "Windows",
//       start: {
//         x: 14.0,
//         y: 3.5,
//         z: 0.0,
//       },
//       end: {
//         x: 13.85,
//         y: 3.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "39",
//       layer: "Windows",
//       start: {
//         x: 14.0,
//         y: 4.25,
//         z: 0.0,
//       },
//       end: {
//         x: 13.85,
//         y: 4.25,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "3A",
//       layer: "Windows",
//       start: {
//         x: 5.5,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 0.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "3B",
//       layer: "Windows",
//       start: {
//         x: 5.5,
//         y: 0.15,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 0.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "3C",
//       layer: "Windows",
//       start: {
//         x: 6.125,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 6.125,
//         y: 0.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "3D",
//       layer: "Windows",
//       start: {
//         x: 6.75,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 6.75,
//         y: 0.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "3E",
//       layer: "Windows",
//       start: {
//         x: 7.375,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: 7.375,
//         y: 0.15,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "47",
//       layer: "Furniture",
//       start: {
//         x: 1.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 3.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "48",
//       layer: "Furniture",
//       start: {
//         x: 3.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 3.0,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "49",
//       layer: "Furniture",
//       start: {
//         x: 3.0,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.0,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "4A",
//       layer: "Furniture",
//       start: {
//         x: 1.0,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "4B",
//       layer: "Furniture",
//       start: {
//         x: 1.2,
//         y: 9.0,
//         z: 0.0,
//       },
//       end: {
//         x: 2.8,
//         y: 9.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "4C",
//       layer: "Furniture",
//       start: {
//         x: 2.8,
//         y: 9.0,
//         z: 0.0,
//       },
//       end: {
//         x: 2.8,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "4D",
//       layer: "Furniture",
//       start: {
//         x: 2.8,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.2,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "4E",
//       layer: "Furniture",
//       start: {
//         x: 1.2,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.2,
//         y: 9.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "50",
//       layer: "Furniture",
//       start: {
//         x: 5.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 6.5,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "51",
//       layer: "Furniture",
//       start: {
//         x: 6.5,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 6.5,
//         y: 7.6,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "52",
//       layer: "Furniture",
//       start: {
//         x: 6.5,
//         y: 7.6,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 7.6,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "53",
//       layer: "Furniture",
//       start: {
//         x: 5.0,
//         y: 7.6,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "55",
//       layer: "Furniture",
//       start: {
//         x: 8.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 10.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "56",
//       layer: "Furniture",
//       start: {
//         x: 10.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 10.0,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "57",
//       layer: "Furniture",
//       start: {
//         x: 10.0,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "58",
//       layer: "Furniture",
//       start: {
//         x: 8.0,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "59",
//       layer: "Furniture",
//       start: {
//         x: 8.2,
//         y: 9.0,
//         z: 0.0,
//       },
//       end: {
//         x: 9.8,
//         y: 9.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "5A",
//       layer: "Furniture",
//       start: {
//         x: 9.8,
//         y: 9.0,
//         z: 0.0,
//       },
//       end: {
//         x: 9.8,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "5B",
//       layer: "Furniture",
//       start: {
//         x: 9.8,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 8.2,
//         y: 9.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "5C",
//       layer: "Furniture",
//       start: {
//         x: 8.2,
//         y: 9.5,
//         z: 0.0,
//       },
//       end: {
//         x: 8.2,
//         y: 9.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "5E",
//       layer: "Furniture",
//       start: {
//         x: 12.0,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 13.5,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "5F",
//       layer: "Furniture",
//       start: {
//         x: 13.5,
//         y: 7.0,
//         z: 0.0,
//       },
//       end: {
//         x: 13.5,
//         y: 7.6,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "60",
//       layer: "Furniture",
//       start: {
//         x: 13.5,
//         y: 7.6,
//         z: 0.0,
//       },
//       end: {
//         x: 12.0,
//         y: 7.6,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "61",
//       layer: "Furniture",
//       start: {
//         x: 12.0,
//         y: 7.6,
//         z: 0.0,
//       },
//       end: {
//         x: 12.0,
//         y: 7.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "63",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 0.3,
//         z: 0.0,
//       },
//       end: {
//         x: 3.7,
//         y: 0.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "64",
//       layer: "Furniture",
//       start: {
//         x: 3.7,
//         y: 0.3,
//         z: 0.0,
//       },
//       end: {
//         x: 3.7,
//         y: 1.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "65",
//       layer: "Furniture",
//       start: {
//         x: 3.7,
//         y: 1.3,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 1.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "66",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 1.3,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 0.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "68",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 4.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.5,
//         y: 4.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "69",
//       layer: "Furniture",
//       start: {
//         x: 1.5,
//         y: 4.5,
//         z: 0.0,
//       },
//       end: {
//         x: 1.5,
//         y: 5.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "6A",
//       layer: "Furniture",
//       start: {
//         x: 1.5,
//         y: 5.5,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 5.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "6B",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 5.5,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 4.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "6E",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 1.8,
//         z: 0.0,
//       },
//       end: {
//         x: 1.5,
//         y: 1.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "6F",
//       layer: "Furniture",
//       start: {
//         x: 1.5,
//         y: 1.8,
//         z: 0.0,
//       },
//       end: {
//         x: 1.5,
//         y: 2.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "70",
//       layer: "Furniture",
//       start: {
//         x: 1.5,
//         y: 2.8,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 2.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "71",
//       layer: "Furniture",
//       start: {
//         x: 0.3,
//         y: 2.8,
//         z: 0.0,
//       },
//       end: {
//         x: 0.3,
//         y: 1.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "77",
//       layer: "Furniture",
//       start: {
//         x: 8.0,
//         y: 0.8,
//         z: 0.0,
//       },
//       end: {
//         x: 12.5,
//         y: 0.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "78",
//       layer: "Furniture",
//       start: {
//         x: 12.5,
//         y: 0.8,
//         z: 0.0,
//       },
//       end: {
//         x: 12.5,
//         y: 2.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "79",
//       layer: "Furniture",
//       start: {
//         x: 12.5,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 2.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "7A",
//       layer: "Furniture",
//       start: {
//         x: 8.0,
//         y: 2.0,
//         z: 0.0,
//       },
//       end: {
//         x: 8.0,
//         y: 0.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "7C",
//       layer: "Furniture",
//       start: {
//         x: 9.0,
//         y: 2.5,
//         z: 0.0,
//       },
//       end: {
//         x: 11.0,
//         y: 2.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "7D",
//       layer: "Furniture",
//       start: {
//         x: 11.0,
//         y: 2.5,
//         z: 0.0,
//       },
//       end: {
//         x: 11.0,
//         y: 3.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "7E",
//       layer: "Furniture",
//       start: {
//         x: 11.0,
//         y: 3.5,
//         z: 0.0,
//       },
//       end: {
//         x: 9.0,
//         y: 3.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "7F",
//       layer: "Furniture",
//       start: {
//         x: 9.0,
//         y: 3.5,
//         z: 0.0,
//       },
//       end: {
//         x: 9.0,
//         y: 2.5,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "81",
//       layer: "Furniture",
//       start: {
//         x: 5.0,
//         y: 0.3,
//         z: 0.0,
//       },
//       end: {
//         x: 7.5,
//         y: 0.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "82",
//       layer: "Furniture",
//       start: {
//         x: 7.5,
//         y: 0.3,
//         z: 0.0,
//       },
//       end: {
//         x: 7.5,
//         y: 0.7,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "83",
//       layer: "Furniture",
//       start: {
//         x: 7.5,
//         y: 0.7,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 0.7,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "84",
//       layer: "Furniture",
//       start: {
//         x: 5.0,
//         y: 0.7,
//         z: 0.0,
//       },
//       end: {
//         x: 5.0,
//         y: 0.3,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "89",
//       layer: "Dimensions",
//       start: {
//         x: 0.0,
//         y: -0.8,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: -0.8,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "8A",
//       layer: "Dimensions",
//       start: {
//         x: 0.0,
//         y: -0.6,
//         z: 0.0,
//       },
//       end: {
//         x: 0.0,
//         y: -1.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "8B",
//       layer: "Dimensions",
//       start: {
//         x: 14.0,
//         y: -0.6,
//         z: 0.0,
//       },
//       end: {
//         x: 14.0,
//         y: -1.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "8D",
//       layer: "Dimensions",
//       start: {
//         x: -0.8,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: -0.8,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "8E",
//       layer: "Dimensions",
//       start: {
//         x: -0.6,
//         y: 0.0,
//         z: 0.0,
//       },
//       end: {
//         x: -1.0,
//         y: 0.0,
//         z: 0.0,
//       },
//     },
//     {
//       entity_type: "LINE",
//       handle: "8F",
//       layer: "Dimensions",
//       start: {
//         x: -0.6,
//         y: 10.0,
//         z: 0.0,
//       },
//       end: {
//         x: -1.0,
//         y: 10.0,
//         z: 0.0,
//       },
//     },
//   ],
//   arcs: [
//     {
//       entity_type: "ARC",
//       handle: "1E",
//       layer: "Doors",
//       center: {
//         x: 2.3,
//         y: 6.2,
//         z: 0.0,
//       },
//       radius: 0.9,
//       start_angle: 0.0,
//       end_angle: 90.0,
//     },
//     {
//       entity_type: "ARC",
//       handle: "20",
//       layer: "Doors",
//       center: {
//         x: 9.0,
//         y: 6.2,
//         z: 0.0,
//       },
//       radius: 0.9,
//       start_angle: 0.0,
//       end_angle: 90.0,
//     },
//     {
//       entity_type: "ARC",
//       handle: "22",
//       layer: "Doors",
//       center: {
//         x: 4.2,
//         y: 3.7,
//         z: 0.0,
//       },
//       radius: 0.9,
//       start_angle: 180.0,
//       end_angle: 270.0,
//     },
//     {
//       entity_type: "ARC",
//       handle: "24",
//       layer: "Doors",
//       center: {
//         x: 9.0,
//         y: 0.2,
//         z: 0.0,
//       },
//       radius: 1.0,
//       start_angle: 0.0,
//       end_angle: 90.0,
//     },
//   ],
//   polylines: [],
//   texts: [
//     {
//       entity_type: "MTEXT",
//       handle: "3F",
//       layer: "Text",
//       text: "BEDROOM 1",
//       position: {
//         x: 1.8,
//         y: 8.2,
//         z: 0.0,
//       },
//       height: 0.35,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "40",
//       layer: "Dimensions",
//       text: "7.0m x 4.0m",
//       position: {
//         x: 2.0,
//         y: 7.5,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "41",
//       layer: "Text",
//       text: "BEDROOM 2",
//       position: {
//         x: 8.8,
//         y: 8.2,
//         z: 0.0,
//       },
//       height: 0.35,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "42",
//       layer: "Dimensions",
//       text: "7.0m x 4.0m",
//       position: {
//         x: 9.0,
//         y: 7.5,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "43",
//       layer: "Text",
//       text: "KITCHEN",
//       position: {
//         x: 0.8,
//         y: 3.5,
//         z: 0.0,
//       },
//       height: 0.35,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "44",
//       layer: "Dimensions",
//       text: "4.0m x 6.0m",
//       position: {
//         x: 0.6,
//         y: 2.8,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "45",
//       layer: "Text",
//       text: "LIVING ROOM",
//       position: {
//         x: 7.0,
//         y: 3.5,
//         z: 0.0,
//       },
//       height: 0.35,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "46",
//       layer: "Dimensions",
//       text: "10.0m x 6.0m",
//       position: {
//         x: 7.2,
//         y: 2.8,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "4F",
//       layer: "Furniture",
//       text: "BED",
//       position: {
//         x: 1.6,
//         y: 8.0,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "54",
//       layer: "Furniture",
//       text: "WARDROBE",
//       position: {
//         x: 5.1,
//         y: 7.1,
//         z: 0.0,
//       },
//       height: 0.15,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "5D",
//       layer: "Furniture",
//       text: "BED",
//       position: {
//         x: 8.6,
//         y: 8.0,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "62",
//       layer: "Furniture",
//       text: "WARDROBE",
//       position: {
//         x: 12.1,
//         y: 7.1,
//         z: 0.0,
//       },
//       height: 0.15,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "67",
//       layer: "Furniture",
//       text: "COUNTER",
//       position: {
//         x: 1.0,
//         y: 0.6,
//         z: 0.0,
//       },
//       height: 0.2,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "6D",
//       layer: "Furniture",
//       text: "SINK",
//       position: {
//         x: 0.5,
//         y: 4.1,
//         z: 0.0,
//       },
//       height: 0.18,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "76",
//       layer: "Furniture",
//       text: "STOVE",
//       position: {
//         x: 0.4,
//         y: 1.5,
//         z: 0.0,
//       },
//       height: 0.18,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "7B",
//       layer: "Furniture",
//       text: "SOFA",
//       position: {
//         x: 9.5,
//         y: 1.2,
//         z: 0.0,
//       },
//       height: 0.22,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "80",
//       layer: "Furniture",
//       text: "TABLE",
//       position: {
//         x: 9.3,
//         y: 2.8,
//         z: 0.0,
//       },
//       height: 0.18,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "85",
//       layer: "Furniture",
//       text: "TV",
//       position: {
//         x: 5.9,
//         y: 0.35,
//         z: 0.0,
//       },
//       height: 0.18,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "86",
//       layer: "Text",
//       text: "2-BEDROOM FLOOR PLAN",
//       position: {
//         x: 3.5,
//         y: -1.5,
//         z: 0.0,
//       },
//       height: 0.5,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "87",
//       layer: "Dimensions",
//       text: "Total Area: 14m x 10m = 140 sq.m",
//       position: {
//         x: 3.5,
//         y: -2.3,
//         z: 0.0,
//       },
//       height: 0.3,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "88",
//       layer: "Dimensions",
//       text: "Scale: 1 unit = 1 meter",
//       position: {
//         x: 3.5,
//         y: -2.9,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "8C",
//       layer: "Dimensions",
//       text: "14.0 m",
//       position: {
//         x: 6.2,
//         y: -0.7,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//     {
//       entity_type: "MTEXT",
//       handle: "90",
//       layer: "Dimensions",
//       text: "10.0 m",
//       position: {
//         x: -1.5,
//         y: 4.8,
//         z: 0.0,
//       },
//       height: 0.25,
//     },
//   ],
// };

export const DXF_JSON_DATA: DxfJsonDocument = {
  source_file: "update-autocad-file-1.dxf",
  meta: {
    acad_version: "AC1032",
    extmin: [-3.226776043334007, -3.716204318229131, 0.0],
    extmax: [20.17745305040325, 7.947965026977579, 0.0],
  },
  stats: {
    entity_counts: {
      LINE: 40,
      MTEXT: 8,
      INSERT: 7,
    },
    polyline_count: 0,
    line_count: 40,
    arc_count: 0,
    text_count: 8,
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
        x: 3.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "273",
      layer: "0",
      start: {
        x: 3.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662716,
        y: 4.795196564956298,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "274",
      layer: "0",
      start: {
        x: 2.110806615662717,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 1.680900782392768,
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
        x: 3.610806615662717,
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
        y: 4.795196564956298,
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
        x: 15.92798613906804,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "27C",
      layer: "0",
      start: {
        x: 15.92798613906804,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 15.92798613906804,
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
        x: 3.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662717,
        y: 4.795196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28D",
      layer: "0",
      start: {
        x: 3.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 4.133346733624051,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28E",
      layer: "0",
      start: {
        x: 4.133346733624051,
        y: 7.295196564956299,
        z: 0.0,
      },
      end: {
        x: 3.610806615662717,
        y: 7.295196564956299,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "28F",
      layer: "0",
      start: {
        x: 3.610806615662717,
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
        x: 3.610806615662717,
        y: 4.795196564956299,
        z: 0.0,
      },
      end: {
        x: 4.668873803766473,
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
        x: 15.92798613906804,
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
        x: 7.837662520394189,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AE",
      layer: "0",
      start: {
        x: 15.92798613906804,
        y: 3.945196564956299,
        z: 0.0,
      },
      end: {
        x: 15.92798613906804,
        y: -2.745149250328729,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2AF",
      layer: "0",
      start: {
        x: 15.92798613906804,
        y: -2.745149250328729,
        z: 0.0,
      },
      end: {
        x: 9.116909095798803,
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
        x: 4.224234568028453,
        y: -2.704803435043701,
        z: 0.0,
      },
      end: {
        x: 4.224234568028453,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2CF",
      layer: "0",
      start: {
        x: 15.92798613906804,
        y: -2.745149250328729,
        z: 0.0,
      },
      end: {
        x: 15.92798613906804,
        y: 0.2548507496712702,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "2D0",
      layer: "0",
      start: {
        x: 15.92798613906804,
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
        x: 3.610806615662717,
        y: -1.359953888159623,
        z: 0.0,
      },
      end: {
        x: 3.610806615662717,
        y: -2.704803435043701,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "15E1",
      layer: "0",
      start: {
        x: 3.610806615662717,
        y: 4.795196564956298,
        z: 0.0,
      },
      end: {
        x: 2.110806615662717,
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
        x: 7.941414477020998,
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
        x: 3.610806615662717,
        y: 0.202466429484332,
        z: 0.0,
      },
      end: {
        x: 3.610806615662717,
        y: -0.7503538881596232,
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
        x: 3.610806615662717,
        y: 0.202466429484332,
        z: 0.0,
      },
    },
    {
      entity_type: "LINE",
      handle: "25C8",
      layer: "0",
      start: {
        x: 5.278473803766473,
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
  arcs: [],
  polylines: [],
  texts: [
    {
      entity_type: "MTEXT",
      handle: "286",
      layer: "0",
      text: "Kitchen\n3.0 X 3.35",
      position: {
        x: 1.229801813707155,
        y: 5.960516156780833,
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
        x: 5.021054678442993,
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
        y: 5.978988852146535,
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
        y: 6.1691173445058,
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
        y: -0.6129244931801799,
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
};
