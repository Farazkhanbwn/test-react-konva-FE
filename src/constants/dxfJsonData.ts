/**
 * Hardcoded parsed-DXF JSON — AUTOCAD-FLOOR-PLAN.dxf
 *
 * Edit this file while UI is in development. At runtime, the viewer loads it via
 * `getFloorPlanDocument()` in `src/services/floorPlanSource.ts` until you set
 * `VITE_FLOOR_PLAN_API_URL` to point at your backend (same JSON shape).
 */

export interface DxfPoint {
  x: number
  y: number
  z: number
}

export interface DxfLine {
  entity_type: 'LINE'
  handle: string
  layer: string
  start: DxfPoint
  end: DxfPoint
}

export interface DxfPolylineVertex {
  x: number
  y: number
  z: number
  bulge: number
}

export interface DxfPolyline {
  entity_type: 'LWPOLYLINE'
  handle: string
  layer: string
  closed: boolean
  vertex_count: number
  vertices: DxfPolylineVertex[]
}

export interface DxfText {
  entity_type: 'MTEXT'
  handle: string
  layer: string
  text: string
  position: DxfPoint
  height: number
}

export interface DxfJsonDocument {
  source_file: string
  meta: {
    acad_version: string
    extmin: [number, number, number]
    extmax: [number, number, number]
  }
  stats: {
    entity_counts: Record<string, number>
    polyline_count: number
    line_count: number
    arc_count: number
    text_count: number
    total_vertex_count: number
  }
  lines: DxfLine[]
  arcs: unknown[]
  polylines: DxfPolyline[]
  texts: DxfText[]
}

export const DXF_JSON_DATA: DxfJsonDocument = {
  source_file: 'AUTOCAD-FLOOR-PLAN.dxf',
  meta: {
    acad_version: 'AC1032',
    extmin: [20.70000015784895, 21.81555533002226, 0.0],
    extmax: [33.70000015784894, 35.11555533002226, 0.0],
  },
  stats: {
    entity_counts: { LINE: 64, LWPOLYLINE: 2, MTEXT: 10 },
    polyline_count: 2,
    line_count: 64,
    arc_count: 0,
    text_count: 10,
    total_vertex_count: 16,
  },
  lines: [
    { entity_type: 'LINE', handle: '26D', layer: '0', start: { x: 25.00000015784895, y: 22.81555533002226, z: 0 }, end: { x: 21.00000015784894, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '26E', layer: '0', start: { x: 21.00000015784894, y: 22.81555533002226, z: 0 }, end: { x: 21.00000015784894, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '26F', layer: '0', start: { x: 21.00000015784894, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '270', layer: '0', start: { x: 25.00000015784895, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '275', layer: '0', start: { x: 21.00000015784894, y: 25.81555533002227, z: 0 }, end: { x: 21.00000015784894, y: 30.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '276', layer: '0', start: { x: 21.00000015784894, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 30.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '277', layer: '0', start: { x: 25.00000015784895, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '27C', layer: '0', start: { x: 21.00000015784894, y: 30.81555533002227, z: 0 }, end: { x: 21.00000015784894, y: 34.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '27D', layer: '0', start: { x: 21.00000015784894, y: 34.81555533002226, z: 0 }, end: { x: 26.00000015784895, y: 34.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '27E', layer: '0', start: { x: 26.00000015784895, y: 34.81555533002226, z: 0 }, end: { x: 26.00000015784895, y: 30.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '27F', layer: '0', start: { x: 26.00000015784895, y: 30.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 30.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '280', layer: '0', start: { x: 26.00000015784895, y: 34.81555533002226, z: 0 }, end: { x: 27.20000015784894, y: 34.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '281', layer: '0', start: { x: 27.20000015784894, y: 34.81555533002226, z: 0 }, end: { x: 27.20000015784894, y: 32.71555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '282', layer: '0', start: { x: 27.20000015784894, y: 32.71555533002227, z: 0 }, end: { x: 26.00000015784895, y: 32.71555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '283', layer: '0', start: { x: 27.20000015784894, y: 34.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 34.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '284', layer: '0', start: { x: 28.40000015784895, y: 34.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 33.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '285', layer: '0', start: { x: 28.40000015784895, y: 33.61555533002226, z: 0 }, end: { x: 27.20000015784894, y: 33.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '286', layer: '0', start: { x: 28.40000015784895, y: 34.81555533002226, z: 0 }, end: { x: 32.40000015784894, y: 34.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '287', layer: '0', start: { x: 32.40000015784894, y: 34.81555533002226, z: 0 }, end: { x: 32.40000015784894, y: 29.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '288', layer: '0', start: { x: 32.40000015784894, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 29.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '289', layer: '0', start: { x: 28.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 33.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '28A', layer: '0', start: { x: 28.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '28B', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 33.40000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '28C', layer: '0', start: { x: 33.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 33.40000015784895, y: 29.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '28D', layer: '0', start: { x: 33.40000015784895, y: 29.81555533002227, z: 0 }, end: { x: 32.40000015784894, y: 29.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '28F', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 25.00000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '291', layer: '0', start: { x: 28.40000015784895, y: 25.81555533002227, z: 0 }, end: { x: 28.40000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '292', layer: '0', start: { x: 28.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 25.00000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '299', layer: '0', start: { x: 28.40000015784895, y: 25.51555533002226, z: 0 }, end: { x: 26.79000015784894, y: 25.51555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29A', layer: '0', start: { x: 28.40000015784895, y: 25.21555533002227, z: 0 }, end: { x: 26.79000015784894, y: 25.21555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29B', layer: '0', start: { x: 28.40000015784895, y: 24.91555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.91555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29C', layer: '0', start: { x: 28.40000015784895, y: 24.61555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29D', layer: '0', start: { x: 28.40000015784895, y: 24.31555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.31555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29E', layer: '0', start: { x: 28.40000015784895, y: 24.01555533002226, z: 0 }, end: { x: 26.79000015784894, y: 24.01555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '29F', layer: '0', start: { x: 28.40000015784895, y: 23.71555533002226, z: 0 }, end: { x: 26.79000015784894, y: 23.71555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A0', layer: '0', start: { x: 28.40000015784895, y: 23.41555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.41555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A1', layer: '0', start: { x: 28.40000015784895, y: 23.11555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.11555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A4', layer: '0', start: { x: 26.80000015784895, y: 25.81555533002227, z: 0 }, end: { x: 26.80000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A7', layer: '0', start: { x: 26.79000015784894, y: 25.81555533002227, z: 0 }, end: { x: 26.79000015784894, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A8', layer: '0', start: { x: 26.59000015784894, y: 25.81555533002227, z: 0 }, end: { x: 26.59000015784894, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2A9', layer: '0', start: { x: 26.59000015784894, y: 25.51555533002226, z: 0 }, end: { x: 25.00000015784895, y: 25.51555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2AA', layer: '0', start: { x: 26.59000015784894, y: 25.21555533002226, z: 0 }, end: { x: 25.00000015784895, y: 25.21555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '2AB', layer: '0', start: { x: 26.59000015784894, y: 24.91555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.91555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2AC', layer: '0', start: { x: 26.59000015784894, y: 24.31555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.31555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2AD', layer: '0', start: { x: 26.59000015784894, y: 24.61555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2AE', layer: '0', start: { x: 26.59000015784894, y: 24.01555533002226, z: 0 }, end: { x: 25.00000015784895, y: 24.01555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2AF', layer: '0', start: { x: 26.59000015784894, y: 23.71555533002226, z: 0 }, end: { x: 25.00000015784895, y: 23.71555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B0', layer: '0', start: { x: 25.00000015784895, y: 22.81555533002226, z: 0 }, end: { x: 25.00000015784895, y: 21.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B1', layer: '0', start: { x: 25.00000015784895, y: 21.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 21.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B2', layer: '0', start: { x: 28.40000015784895, y: 21.81555533002226, z: 0 }, end: { x: 28.40000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B3', layer: '0', start: { x: 28.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 33.40000015784895, y: 22.81555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B4', layer: '0', start: { x: 33.40000015784895, y: 22.81555533002226, z: 0 }, end: { x: 33.40000015784895, y: 25.81555533002227, z: 0 } },
    { entity_type: 'LINE', handle: '2B5', layer: '0', start: { x: 28.40000015784895, y: 24.61555533002226, z: 0 }, end: { x: 30.50000015784894, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B6', layer: '0', start: { x: 29.60000015784894, y: 25.81555533002227, z: 0 }, end: { x: 29.60000015784894, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B7', layer: '0', start: { x: 29.90000015784895, y: 25.81555533002227, z: 0 }, end: { x: 29.90000015784894, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B8', layer: '0', start: { x: 30.20000015784895, y: 25.81555533002227, z: 0 }, end: { x: 30.20000015784894, y: 24.61555533002226, z: 0 } },
    { entity_type: 'LINE', handle: '2B9', layer: '0', start: { x: 30.50000015784894, y: 25.81555533002227, z: 0 }, end: { x: 30.50000015784894, y: 24.61555533002226, z: 0 } },
  ],
  arcs: [],
  polylines: [
    {
      entity_type: 'LWPOLYLINE',
      handle: '2BD',
      layer: '0',
      closed: false,
      vertex_count: 8,
      vertices: [
        { x: 25.00000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
        { x: 21.00000015784894, y: 22.81555533002226, z: 0, bulge: 0 },
        { x: 21.00000015784894, y: 34.81555533002226, z: 0, bulge: 0 },
        { x: 32.40000015784894, y: 34.81555533002226, z: 0, bulge: 0 },
        { x: 32.40000015784894, y: 29.81555533002227, z: 0, bulge: 0 },
        { x: 33.40000015784895, y: 29.81555533002227, z: 0, bulge: 0 },
        { x: 33.40000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
        { x: 28.40000015784895, y: 22.81555533002226, z: 0, bulge: 0 },
      ],
    },
    {
      entity_type: 'LWPOLYLINE',
      handle: '2BE',
      layer: '0',
      closed: false,
      vertex_count: 8,
      vertices: [
        { x: 25.00000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
        { x: 20.70000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
        { x: 20.70000015784895, y: 35.11555533002226, z: 0, bulge: 0 },
        { x: 32.70000015784894, y: 35.11555533002226, z: 0, bulge: 0 },
        { x: 32.70000015784894, y: 30.11555533002227, z: 0, bulge: 0 },
        { x: 33.70000015784894, y: 30.11555533002226, z: 0, bulge: 0 },
        { x: 33.70000015784894, y: 22.51555533002226, z: 0, bulge: 0 },
        { x: 28.40000015784895, y: 22.51555533002226, z: 0, bulge: 0 },
      ],
    },
  ],
  texts: [
    { entity_type: 'MTEXT', handle: '2C4', layer: '0', text: 'KITCHEN\n5 X 4 M', position: { x: 22.647, y: 33.376, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2CF', layer: '0', text: 'LIVING ROOM\n4 X 5 M', position: { x: 21.953, y: 28.470, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2D7', layer: '0', text: 'OFFICE\n4 X M', position: { x: 21.842, y: 24.632, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2DF', layer: '0', text: 'BEDROOM\n4 X 5 M', position: { x: 29.453, y: 32.603, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2E7', layer: '0', text: 'BEDROOM\n5 X 4 M', position: { x: 30.118, y: 28.175, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2EF', layer: '0', text: 'PARKING\n5 X 3 M', position: { x: 30.488, y: 24.448, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '2F7', layer: '0', text: 'LOBBY', position: { x: 25.869, y: 28.839, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '300', layer: '0', text: 'LANDING\n1M WIDE', position: { x: 25.699, y: 22.589, z: 0 }, height: 0.2 },
    { entity_type: 'MTEXT', handle: '308', layer: '0', text: 'BATH\n1.2 X 2.1 M', position: { x: 25.662, y: 34.387, z: 0 }, height: 0.14 },
    { entity_type: 'MTEXT', handle: '310', layer: '0', text: 'WC\n1.2 X 1.2 M', position: { x: 27.139, y: 34.663, z: 0 }, height: 0.14 },
  ],
}
