import type { CanvasState } from '@/hooks/useDesignCanvasState'
import { DEFAULT_META } from '@/hooks/useDesignCanvasState'

/**
 * Sample hospital plan (dummy but structured/realistic) for engineers.
 * Units are meters (m). Intended for 2D editor + 3D preview.
 */
export const HOSPITAL_SAMPLE_PLAN: CanvasState = {
  meta: {
    ...DEFAULT_META,
    projectName: 'Sample Hospital Plan (Ground Floor)',
    version: 1,
  },
  // Overall footprint ~ 26m x 18m
  rooms: [
    // Public zone (front)
    { id: 'h-lobby', label: 'Main Entrance Lobby', x: 0.8, y: 0.8, width: 8.0, height: 5.0, floor: { color: '#f1f5f9', material: 'tile' } },
    { id: 'h-reception', label: 'Reception', x: 8.8, y: 0.8, width: 5.2, height: 3.0, floor: { color: '#e2e8f0', material: 'tile' } },
    { id: 'h-waiting', label: 'Waiting', x: 8.8, y: 3.8, width: 5.2, height: 2.0, floor: { color: '#f8fafc', material: 'tile' } },
    { id: 'h-public-toilet', label: 'Public Toilet', x: 14.6, y: 0.8, width: 3.0, height: 2.6, floor: { color: '#dbeafe', material: 'tile' } },

    // Core + main corridor
    { id: 'h-corridor', label: 'Main Corridor', x: 0.8, y: 6.2, width: 24.4, height: 2.4, floor: { color: '#f1f5f9', material: 'tile' } },
    { id: 'h-core', label: 'Elevator / Stairs Core', x: 20.2, y: 0.8, width: 5.0, height: 5.0, floor: { color: '#e5e7eb', material: 'tile' } },

    // Clinical zone (left/middle)
    { id: 'h-triage', label: 'Triage', x: 0.8, y: 9.2, width: 4.8, height: 3.6, floor: { color: '#fee2e2', material: 'vinyl' } },
    { id: 'h-consult-1', label: 'Consult Room 1', x: 5.8, y: 9.2, width: 4.0, height: 3.6, floor: { color: '#fee2e2', material: 'vinyl' } },
    { id: 'h-consult-2', label: 'Consult Room 2', x: 10.2, y: 9.2, width: 4.0, height: 3.6, floor: { color: '#fee2e2', material: 'vinyl' } },
    { id: 'h-nurse', label: 'Nurse Station', x: 14.6, y: 9.2, width: 5.6, height: 3.6, floor: { color: '#fff7ed', material: 'vinyl' } },

    // ICU + OT zone (right/back)
    { id: 'h-icu', label: 'ICU', x: 0.8, y: 13.2, width: 8.6, height: 4.0, floor: { color: '#dcfce7', material: 'vinyl' } },
    { id: 'h-ot', label: 'Operation Theater', x: 9.8, y: 13.2, width: 7.6, height: 4.0, floor: { color: '#dcfce7', material: 'vinyl' } },
    { id: 'h-sterile', label: 'Sterile Store', x: 17.8, y: 13.2, width: 3.2, height: 4.0, floor: { color: '#dcfce7', material: 'vinyl' } },
    { id: 'h-supply', label: 'Supply', x: 21.2, y: 13.2, width: 4.0, height: 4.0, floor: { color: '#e5e7eb', material: 'vinyl' } },
  ],
  walls: [
    // Outer perimeter
    { id: 'h-ow-t', x1: 0, y1: 0, x2: 26, y2: 0, thickness: 0.22, isOuter: true, wallHeight: 3.2, wallThickness3d: 0.22 },
    { id: 'h-ow-r', x1: 26, y1: 0, x2: 26, y2: 18, thickness: 0.22, isOuter: true, wallHeight: 3.2, wallThickness3d: 0.22 },
    { id: 'h-ow-b', x1: 0, y1: 18, x2: 26, y2: 18, thickness: 0.22, isOuter: true, wallHeight: 3.2, wallThickness3d: 0.22 },
    { id: 'h-ow-l', x1: 0, y1: 0, x2: 0, y2: 18, thickness: 0.22, isOuter: true, wallHeight: 3.2, wallThickness3d: 0.22 },

    // Inner separators (clean, non-intersecting)
    { id: 'h-iw-front-1', x1: 8.8, y1: 0.8, x2: 8.8, y2: 5.8, thickness: 0.12 },
    { id: 'h-iw-front-2', x1: 14.6, y1: 0.8, x2: 14.6, y2: 5.8, thickness: 0.12 },
    { id: 'h-iw-front-3', x1: 17.8, y1: 0.8, x2: 17.8, y2: 5.8, thickness: 0.12 },
    { id: 'h-iw-corridor', x1: 0.8, y1: 6.2, x2: 25.2, y2: 6.2, thickness: 0.12 },
    { id: 'h-iw-corridor-2', x1: 0.8, y1: 8.6, x2: 25.2, y2: 8.6, thickness: 0.12 },

    { id: 'h-iw-mid-1', x1: 5.8, y1: 9.2, x2: 5.8, y2: 12.8, thickness: 0.12 },
    { id: 'h-iw-mid-2', x1: 10.2, y1: 9.2, x2: 10.2, y2: 12.8, thickness: 0.12 },
    { id: 'h-iw-mid-3', x1: 14.6, y1: 9.2, x2: 14.6, y2: 12.8, thickness: 0.12 },

    { id: 'h-iw-back-1', x1: 9.8, y1: 13.2, x2: 9.8, y2: 17.2, thickness: 0.12 },
    { id: 'h-iw-back-2', x1: 17.8, y1: 13.2, x2: 17.8, y2: 17.2, thickness: 0.12 },
    { id: 'h-iw-back-3', x1: 21.2, y1: 13.2, x2: 21.2, y2: 17.2, thickness: 0.12 },
  ],
  doors: [
    // Entrance
    { id: 'h-door-main', x: 4.0, y: 0.2, width: 1.6, rotation: 90, height: 2.2, wallId: 'h-ow-t', label: 'Main Entrance' },

    // Lobby -> Corridor
    { id: 'h-door-lobby', x: 4.0, y: 6.2, width: 1.2, rotation: -90, height: 2.2, wallId: 'h-iw-corridor', label: 'To Main Corridor' },

    // Reception / toilet / core access
    { id: 'h-door-reception', x: 11.4, y: 6.2, width: 0.9, rotation: -90, height: 2.2, wallId: 'h-iw-corridor', label: 'Reception' },
    { id: 'h-door-toilet', x: 15.8, y: 3.4, width: 0.8, rotation: 180, height: 2.2, wallId: 'h-iw-front-2', label: 'Public Toilet' },
    { id: 'h-door-core', x: 22.6, y: 6.2, width: 0.9, rotation: -90, height: 2.2, wallId: 'h-iw-corridor', label: 'Core (Lift/Stairs)' },

    // Clinical rooms from corridor
    { id: 'h-door-triage', x: 2.8, y: 8.6, width: 0.9, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Triage' },
    { id: 'h-door-consult1', x: 7.8, y: 8.6, width: 0.9, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Consult 1' },
    { id: 'h-door-consult2', x: 12.2, y: 8.6, width: 0.9, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Consult 2' },
    { id: 'h-door-nurse', x: 17.2, y: 8.6, width: 1.0, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Nurse Station' },

    // Back clinical zone entries
    { id: 'h-door-icu', x: 4.0, y: 12.8, width: 1.2, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'ICU' },
    { id: 'h-door-ot', x: 13.0, y: 12.8, width: 1.2, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Operation Theater' },
    { id: 'h-door-sterile', x: 19.0, y: 12.8, width: 0.9, rotation: 90, height: 2.2, wallId: 'h-iw-corridor-2', label: 'Sterile Store' },
  ],
  windows: [
    // Daylight for public zone
    { id: 'h-win-front-1', x1: 1.5, y1: 0, x2: 7.0, y2: 0, height: 1.4, sillHeight: 0.9, wallId: 'h-ow-t' },
    { id: 'h-win-front-2', x1: 9.5, y1: 0, x2: 13.5, y2: 0, height: 1.4, sillHeight: 0.9, wallId: 'h-ow-t' },
    { id: 'h-win-front-3', x1: 15.2, y1: 0, x2: 17.2, y2: 0, height: 1.2, sillHeight: 1.0, wallId: 'h-ow-t' },
    // Back zone windows
    { id: 'h-win-back-1', x1: 1.5, y1: 18, x2: 8.0, y2: 18, height: 1.2, sillHeight: 1.0, wallId: 'h-ow-b' },
    { id: 'h-win-back-2', x1: 10.5, y1: 18, x2: 16.8, y2: 18, height: 1.2, sillHeight: 1.0, wallId: 'h-ow-b' },
  ],
  stairs: [
    { id: 'h-stairs', x: 23.6, y: 1.2, width: 1.4, height: 3.6, direction: 'up' },
  ],
  furniture: [
    // Simple reception desk + nurse station counter for readability
    { id: 'h-f-reception-desk', furnitureType: 'counter', label: 'Reception Desk', x: 9.2, y: 1.2, width: 3.6, depth: 0.7, rotation: 0, height3d: 1.0, color3d: '#94a3b8' },
    { id: 'h-f-nurse-counter', furnitureType: 'counter', label: 'Nurse Counter', x: 15.0, y: 10.0, width: 4.2, depth: 0.7, rotation: 0, height3d: 1.0, color3d: '#94a3b8' },
  ],
}

