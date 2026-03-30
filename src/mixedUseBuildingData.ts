import type { CanvasState, Door, RoomData, Stairs, WallSegment, WindowSeg, FurnitureItem } from '@/hooks/useDesignCanvasState'
import { DEFAULT_META } from '@/hooks/useDesignCanvasState'

type Zone = 'public' | 'private' | 'restricted'

type FloorElement = {
  id: string
  type: 'room' | 'wall' | 'door' | 'window' | 'stairs' | 'parking-slot' | 'column' | 'corridor' | 'ramp' | 'lobby' | 'elevator-core'
  position: { x: number; y: number }
  dimensions: { width: number; height: number }
  metadata: {
    zone: Zone
    usage: string
    layer?: string
    rotation?: number
    isOuter?: boolean
  }
}

type BuildingFloor = {
  id: string
  name: string
  level: number
  usage: 'parking' | 'commercial' | 'residential'
  elements: FloorElement[]
}

export const MIXED_USE_BUILDING = {
  building: {
    id: 'mixed-use-6f',
    name: 'Mixed Use Building - Dummy Demo',
    type: 'mixed-use',
    totalFloors: 6,
  },
  floors: [
    {
      id: 'floor-b1',
      name: 'Basement - Parking',
      level: -1,
      usage: 'parking',
      elements: [
        { id: 'b1-shell', type: 'room', position: { x: 0, y: 0 }, dimensions: { width: 24, height: 16 }, metadata: { zone: 'restricted', usage: 'parking-floor', layer: 'ROOM' } },
        { id: 'b1-ramp', type: 'ramp', position: { x: 20, y: 10 }, dimensions: { width: 3.5, height: 5 }, metadata: { zone: 'restricted', usage: 'entry-exit-ramp', layer: 'RAMP' } },
        { id: 'b1-drive-1', type: 'corridor', position: { x: 2, y: 7 }, dimensions: { width: 20, height: 3 }, metadata: { zone: 'restricted', usage: 'driveway', layer: 'CIRCULATION' } },
        { id: 'b1-core', type: 'elevator-core', position: { x: 10.5, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'restricted', usage: 'core', layer: 'CORE' } },
        { id: 'b1-stairs', type: 'stairs', position: { x: 14, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'restricted', usage: 'stairs-up', layer: 'STAIRS' } },
        ...Array.from({ length: 12 }).map((_, i) => ({
          id: `b1-park-${i + 1}`,
          type: 'parking-slot' as const,
          position: { x: 1 + (i % 6) * 3.6, y: i < 6 ? 1 : 11.5 },
          dimensions: { width: 2.5, height: 5 },
          metadata: { zone: 'restricted' as Zone, usage: 'car-slot', layer: 'PARKING' },
        })),
        ...Array.from({ length: 8 }).map((_, i) => ({
          id: `b1-col-${i + 1}`,
          type: 'column' as const,
          position: { x: 3 + (i % 4) * 5.5, y: i < 4 ? 5 : 10 },
          dimensions: { width: 0.4, height: 0.4 },
          metadata: { zone: 'restricted' as Zone, usage: 'structural-column', layer: 'COLUMN' },
        })),
      ],
    },
    {
      id: 'floor-0',
      name: 'Ground - Commercial',
      level: 0,
      usage: 'commercial',
      elements: [
        { id: 'g-shell', type: 'room', position: { x: 0, y: 0 }, dimensions: { width: 24, height: 16 }, metadata: { zone: 'public', usage: 'ground-shell', layer: 'ROOM' } },
        { id: 'g-shop-1', type: 'room', position: { x: 1, y: 1 }, dimensions: { width: 5, height: 5 }, metadata: { zone: 'public', usage: 'shop', layer: 'ROOM' } },
        { id: 'g-shop-2', type: 'room', position: { x: 7, y: 1 }, dimensions: { width: 5, height: 5 }, metadata: { zone: 'public', usage: 'shop', layer: 'ROOM' } },
        { id: 'g-shop-3', type: 'room', position: { x: 13, y: 1 }, dimensions: { width: 5, height: 5 }, metadata: { zone: 'public', usage: 'shop', layer: 'ROOM' } },
        { id: 'g-shop-4', type: 'room', position: { x: 19, y: 1 }, dimensions: { width: 4, height: 5 }, metadata: { zone: 'public', usage: 'shop', layer: 'ROOM' } },
        { id: 'g-corridor', type: 'corridor', position: { x: 1, y: 7 }, dimensions: { width: 22, height: 4 }, metadata: { zone: 'public', usage: 'main-corridor', layer: 'CIRCULATION' } },
        { id: 'g-lobby', type: 'lobby', position: { x: 9.5, y: 11.5 }, dimensions: { width: 5, height: 3.5 }, metadata: { zone: 'public', usage: 'reception-lobby', layer: 'LOBBY' } },
        { id: 'g-core', type: 'elevator-core', position: { x: 10.5, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'public', usage: 'elevator-core', layer: 'CORE' } },
        { id: 'g-stairs', type: 'stairs', position: { x: 14, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'public', usage: 'stairs', layer: 'STAIRS' } },
      ],
    },
    ...[1, 2, 3, 4].map((level) => ({
      id: `floor-${level}`,
      name: `Floor ${level} - Residential`,
      level,
      usage: 'residential' as const,
      elements: [
        { id: `r${level}-shell`, type: 'room' as const, position: { x: 0, y: 0 }, dimensions: { width: 24, height: 16 }, metadata: { zone: 'private', usage: 'residential-shell', layer: 'ROOM' } },
        { id: `r${level}-corridor`, type: 'corridor' as const, position: { x: 9, y: 0.8 }, dimensions: { width: 6, height: 14.4 }, metadata: { zone: 'public', usage: 'shared-corridor', layer: 'CIRCULATION' } },
        { id: `r${level}-core`, type: 'elevator-core' as const, position: { x: 10.5, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'public', usage: 'elevator-core', layer: 'CORE' } },
        { id: `r${level}-stairs`, type: 'stairs' as const, position: { x: 14, y: 6.5 }, dimensions: { width: 3, height: 3 }, metadata: { zone: 'public', usage: 'stairs', layer: 'STAIRS' } },
        // Apartments
        { id: `r${level}-apt-a`, type: 'room' as const, position: { x: 1, y: 1 }, dimensions: { width: 7.5, height: 6.5 }, metadata: { zone: 'private', usage: 'apartment-A', layer: 'ROOM' } },
        { id: `r${level}-apt-b`, type: 'room' as const, position: { x: 15.5, y: 1 }, dimensions: { width: 7.5, height: 6.5 }, metadata: { zone: 'private', usage: 'apartment-B', layer: 'ROOM' } },
        { id: `r${level}-apt-c`, type: 'room' as const, position: { x: 1, y: 8.5 }, dimensions: { width: 7.5, height: 6.5 }, metadata: { zone: 'private', usage: 'apartment-C', layer: 'ROOM' } },
        { id: `r${level}-apt-d`, type: 'room' as const, position: { x: 15.5, y: 8.5 }, dimensions: { width: 7.5, height: 6.5 }, metadata: { zone: 'private', usage: 'apartment-D', layer: 'ROOM' } },
      ],
    })),
  ] as BuildingFloor[],
}

export function floorToCanvasState(floorId: string): CanvasState {
  const floor = MIXED_USE_BUILDING.floors.find((f) => f.id === floorId) ?? MIXED_USE_BUILDING.floors[0]

  const rooms: RoomData[] = floor.elements
    .filter((e) => ['room', 'corridor', 'lobby', 'elevator-core', 'ramp'].includes(e.type))
    .map((e) => ({
      id: e.id,
      label: e.metadata.usage,
      x: e.position.x,
      y: e.position.y,
      width: e.dimensions.width,
      height: e.dimensions.height,
      floor: { color: e.type === 'corridor' ? '#f1f5f9' : '#e5e7eb', material: 'tile' },
    }))

  const outerWalls: WallSegment[] = [
    { id: `${floor.id}-ow-t`, x1: 0, y1: 0, x2: 24, y2: 0, thickness: 0.2, isOuter: true },
    { id: `${floor.id}-ow-r`, x1: 24, y1: 0, x2: 24, y2: 16, thickness: 0.2, isOuter: true },
    { id: `${floor.id}-ow-b`, x1: 0, y1: 16, x2: 24, y2: 16, thickness: 0.2, isOuter: true },
    { id: `${floor.id}-ow-l`, x1: 0, y1: 0, x2: 0, y2: 16, thickness: 0.2, isOuter: true },
  ]

  const walls: WallSegment[] = [
    ...outerWalls,
    ...floor.elements
      .filter((e) => e.type === 'room')
      .flatMap((e) => {
        const x = e.position.x
        const y = e.position.y
        const w = e.dimensions.width
        const h = e.dimensions.height
        return [
          { id: `${e.id}-w1`, x1: x, y1: y, x2: x + w, y2: y, thickness: 0.1 },
          { id: `${e.id}-w2`, x1: x + w, y1: y, x2: x + w, y2: y + h, thickness: 0.1 },
          { id: `${e.id}-w3`, x1: x, y1: y + h, x2: x + w, y2: y + h, thickness: 0.1 },
          { id: `${e.id}-w4`, x1: x, y1: y, x2: x, y2: y + h, thickness: 0.1 },
        ] as WallSegment[]
      }),
  ]

  const doors: Door[] = floor.elements
    .filter((e) => ['room', 'corridor', 'lobby', 'parking-slot'].includes(e.type))
    .slice(0, 12)
    .map((e) => ({
      id: `${e.id}-d`,
      x: e.position.x + Math.min(e.dimensions.width * 0.5, 1.2),
      y: e.position.y + e.dimensions.height,
      width: 0.9,
      rotation: -90,
      wallId: `${e.id}-w3`,
      height: 2.1,
      type: 'hinged',
      openDirection: 'left',
      swingAngle: 90,
    }))

  const windows: WindowSeg[] = floor.elements
    .filter((e) => e.type === 'room')
    .slice(0, 12)
    .map((e) => ({
      id: `${e.id}-win`,
      x1: e.position.x + 0.8,
      y1: e.position.y,
      x2: e.position.x + Math.max(e.dimensions.width - 0.8, 1.6),
      y2: e.position.y,
      height: 1.2,
      sillHeight: 0.9,
      wallId: `${e.id}-w1`,
    }))

  const stairs: Stairs[] = floor.elements
    .filter((e) => e.type === 'stairs')
    .map((e) => ({
      id: e.id,
      x: e.position.x,
      y: e.position.y,
      width: e.dimensions.width,
      height: e.dimensions.height,
      direction: 'up',
    }))

  const furniture: FurnitureItem[] = floor.elements
    .filter((e) => ['parking-slot', 'column'].includes(e.type))
    .map((e, idx) => ({
      id: `${e.id}-f`,
      furnitureType: e.type === 'column' ? 'generic' : 'car-slot',
      label: e.type === 'column' ? 'Column' : `Parking ${idx + 1}`,
      x: e.position.x,
      y: e.position.y,
      width: e.dimensions.width,
      depth: e.dimensions.height,
      rotation: e.metadata.rotation ?? 0,
    }))

  return {
    meta: {
      ...DEFAULT_META,
      projectName: `${MIXED_USE_BUILDING.building.name} - ${floor.name}`,
    },
    rooms,
    walls,
    doors,
    windows,
    stairs,
    furniture,
  }
}

