import { useCallback, useMemo, useRef, useState } from 'react'

export const SCALE = 40 // px per meter
export const PLAN_OFFSET_X = 30
export const PLAN_OFFSET_Y = 30
export const GRID_SIZE = 20
export const WALL_THICKNESS = 10
export const INNER_WALL = 8

export type CanvasMeta = {
  version: number
  unit: 'm'
  defaultWallHeight: number
  defaultWallThickness: number
  defaultInnerWallThickness: number
  slabThickness: number
  floorLevel: number
  projectName: string
}

export const DEFAULT_META: CanvasMeta = {
  version: 1,
  unit: 'm',
  defaultWallHeight: 2.8,
  defaultWallThickness: 0.2,
  defaultInnerWallThickness: 0.1,
  slabThickness: 0.15,
  floorLevel: 0.01,
  projectName: 'Untitled Project',
}

export type CanvasTool =
  | 'select'
  | 'addRoom'
  | 'addWall'
  | 'addDoor'
  | 'addWindow'
  | 'addStairs'
  | 'addFurniture'
  | 'move'
  | 'delete'

export type RoomData = {
  id: string
  x: number
  y: number
  width: number
  height: number
  label: string
  // Optional 3D/meta fields (supported by demo JSON)
  floorColor?: string
  floor?: {
    color?: string
    material?: string
  }
}

export type WallSegment = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  thickness: number
  isOuter?: boolean
  wallHeight?: number
  wallThickness3d?: number
}

export type Door = {
  id: string
  x: number
  y: number
  width: number
  rotation: number
  height?: number
  wallId?: string
  type?: string
  openDirection?: string
  swingAngle?: number
  label?: string
  purpose?: string
}
export type WindowSeg = {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  height?: number
  sillHeight?: number
  wallId?: string
}
export type Stairs = { id: string; x: number; y: number; width: number; height: number; direction?: 'up' | 'down' }

/** Vertex from DXF/CAD (e.g. furniture as LINE/LWPOLYLINE) */
export type Vertex = { x: number; y: number; z?: number }

/** Raw DXF-style entity: no semantic type (chair/table), just geometry. */
export type RawFurnitureGeometry = {
  type: 'LINE' | 'LWPOLYLINE' | 'POLYLINE' | string
  vertices: Vertex[]
  handle?: string
  ownerHandle?: string
  layer?: string
}

export type FurnitureItem = {
  id: string
  /** Semantic type for 2D/3D icon (e.g. 'chair', 'sofa', 'table'). If missing we render a generic box. */
  furnitureType: string
  label: string
  x: number
  y: number
  width: number
  depth: number
  rotation: number
  height3d?: number
  color3d?: string
  /** When present, this item came from DXF/CAD with no furnitureType – we use bounds from vertices and render generically. */
  raw?: RawFurnitureGeometry
}

export type SelectedType = 'room' | 'wall' | 'door' | 'window' | 'stairs' | 'furniture'

export type CanvasSnapshot = {
  meta: CanvasMeta
  rooms: RoomData[]
  walls: WallSegment[]
  doors: Door[]
  windows: WindowSeg[]
  stairs: Stairs[]
  furniture: FurnitureItem[]
}

export type CanvasState = CanvasSnapshot

const clone = (s: CanvasSnapshot): CanvasSnapshot => JSON.parse(JSON.stringify(s)) as CanvasSnapshot

const makeId = (prefix: string) => {
  const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${id}`
}

export function useDesignCanvasState(initial?: CanvasState) {
  const [tool, setTool] = useState<CanvasTool>('select')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState<SelectedType | null>(null)

  const [state, setState] = useState<CanvasSnapshot>(() => {
    if (initial) {
      return {
        meta: { ...DEFAULT_META, ...initial.meta },
        rooms: initial.rooms ?? [],
        walls: initial.walls ?? [],
        doors: initial.doors ?? [],
        windows: initial.windows ?? [],
        stairs: initial.stairs ?? [],
        furniture: initial.furniture ?? [],
      }
    }
    return {
      meta: DEFAULT_META,
      rooms: [
        { id: makeId('room'), x: 0.8, y: 0.8, width: 3.0, height: 2.2, label: 'Bedroom' },
        { id: makeId('room'), x: 4.2, y: 0.8, width: 3.0, height: 2.2, label: 'Bedroom' },
        { id: makeId('room'), x: 0.8, y: 3.3, width: 3.0, height: 2.4, label: 'Living' },
      ],
      walls: [],
      doors: [],
      windows: [],
      stairs: [],
      furniture: [],
    }
  })

  const pastRef = useRef<CanvasSnapshot[]>([])
  const futureRef = useRef<CanvasSnapshot[]>([])

  const pushHistory = useCallback((prev: CanvasSnapshot) => {
    pastRef.current.push(clone(prev))
    if (pastRef.current.length > 50) pastRef.current.shift()
    futureRef.current = []
  }, [])

  const canUndo = pastRef.current.length > 0
  const canRedo = futureRef.current.length > 0

  const undo = useCallback(() => {
    setState((cur) => {
      const past = pastRef.current
      if (past.length === 0) return cur
      futureRef.current.push(clone(cur))
      const prev = past.pop()!
      return prev
    })
  }, [])

  const redo = useCallback(() => {
    setState((cur) => {
      const future = futureRef.current
      if (future.length === 0) return cur
      pastRef.current.push(clone(cur))
      const next = future.pop()!
      return next
    })
  }, [])

  const selectElement = useCallback((id: string | null, type: SelectedType | null) => {
    setSelectedId(id)
    setSelectedType(type)
  }, [])

  const deleteSelected = useCallback(() => {
    setState((cur) => {
      if (!selectedId || !selectedType) return cur
      pushHistory(cur)

      const next = clone(cur)
      if (selectedType === 'room') next.rooms = next.rooms.filter((r) => r.id !== selectedId)
      if (selectedType === 'wall') next.walls = next.walls.filter((w) => w.id !== selectedId)
      if (selectedType === 'door') next.doors = next.doors.filter((d) => d.id !== selectedId)
      if (selectedType === 'window') next.windows = next.windows.filter((w) => w.id !== selectedId)
      if (selectedType === 'stairs') next.stairs = next.stairs.filter((s) => s.id !== selectedId)
      if (selectedType === 'furniture') next.furniture = next.furniture.filter((f) => f.id !== selectedId)

      setSelectedId(null)
      setSelectedType(null)
      return next
    })
  }, [pushHistory, selectedId, selectedType])

  const addRoom = useCallback(
    (x: number, y: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.rooms.push({
          id: makeId('room'),
          x,
          y,
          width: 2.5,
          height: 2.0,
          label: 'Room',
        })
        return next
      })
    },
    [pushHistory],
  )

  const updateRoomLabel = useCallback(
    (id: string, label: string) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        const room = next.rooms.find((r) => r.id === id)
        if (room) room.label = label
        return next
      })
    },
    [pushHistory],
  )

  const updateRoomDimensions = useCallback(
    (id: string, width: number, height: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        const room = next.rooms.find((r) => r.id === id)
        if (room) {
          room.width = width
          room.height = height
        }
        return next
      })
    },
    [pushHistory],
  )

  const moveRoom = useCallback((id: string, x: number, y: number) => {
    setState((cur) => {
      const next = clone(cur)
      const room = next.rooms.find((r) => r.id === id)
      if (room) {
        room.x = x
        room.y = y
      }
      return next
    })
  }, [])

  const finalizeRoomMove = useCallback(
    (id: string) => {
      setState((cur) => {
        pushHistory(cur)
        return cur
      })
      void id
    },
    [pushHistory],
  )

  const resizeRoom = useCallback((id: string, w: number, h: number, x?: number, y?: number) => {
    setState((cur) => {
      const next = clone(cur)
      const room = next.rooms.find((r) => r.id === id)
      if (!room) return cur
      room.width = w
      room.height = h
      if (typeof x === 'number') room.x = x
      if (typeof y === 'number') room.y = y
      return next
    })
  }, [])

  const finalizeRoomResize = useCallback(
    (id: string) => {
      setState((cur) => {
        pushHistory(cur)
        return cur
      })
      void id
    },
    [pushHistory],
  )

  const addWallSegment = useCallback(
    (x1: number, y1: number, x2: number, y2: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.walls.push({ id: makeId('wall'), x1, y1, x2, y2, thickness: WALL_THICKNESS })
        return next
      })
    },
    [pushHistory],
  )

  const moveWallTo = useCallback((id: string, x1: number, y1: number) => {
    setState((cur) => {
      const next = clone(cur)
      const wall = next.walls.find((w) => w.id === id)
      if (!wall) return cur
      const dx = wall.x2 - wall.x1
      const dy = wall.y2 - wall.y1
      wall.x1 = x1
      wall.y1 = y1
      wall.x2 = x1 + dx
      wall.y2 = y1 + dy
      return next
    })
  }, [])

  const resizeWallEnd = useCallback((id: string, end: 1 | 2, x: number, y: number) => {
    setState((cur) => {
      pushHistory(cur)
      const next = clone(cur)
      const wall = next.walls.find((w) => w.id === id)
      if (!wall) return cur
      if (end === 1) {
        wall.x1 = x
        wall.y1 = y
      } else {
        wall.x2 = x
        wall.y2 = y
      }
      return next
    })
  }, [pushHistory])

  const finalizeWallMove = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const addDoor = useCallback(
    (x: number, y: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.doors.push({ id: makeId('door'), x, y, width: 0.9, rotation: 0 })
        return next
      })
    },
    [pushHistory],
  )

  const moveDoor = useCallback((id: string, x: number, y: number) => {
    setState((cur) => {
      const next = clone(cur)
      const d = next.doors.find((dd) => dd.id === id)
      if (d) {
        d.x = x
        d.y = y
      }
      return next
    })
  }, [])

  const finalizeDoorMove = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const rotateDoor = useCallback(
    (id: string) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        const d = next.doors.find((dd) => dd.id === id)
        if (d) d.rotation = (d.rotation + 90) % 360
        return next
      })
    },
    [pushHistory],
  )

  const addWindow = useCallback(
    (x: number, y: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.windows.push({ id: makeId('window'), x1: x, y1: y, x2: x + 1.0, y2: y })
        return next
      })
    },
    [pushHistory],
  )

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setState((cur) => {
      const next = clone(cur)
      const w = next.windows.find((ww) => ww.id === id)
      if (!w) return cur
      const dx = w.x2 - w.x1
      const dy = w.y2 - w.y1
      w.x1 = x
      w.y1 = y
      w.x2 = x + dx
      w.y2 = y + dy
      return next
    })
  }, [])

  const finalizeWindowMove = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const rotateWindow = useCallback(
    (id: string) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        const w = next.windows.find((ww) => ww.id === id)
        if (!w) return cur
        const dx = w.x2 - w.x1
        const dy = w.y2 - w.y1
        // toggle orientation: if horizontal -> vertical
        if (Math.abs(dy) < 1e-6) {
          w.x2 = w.x1
          w.y2 = w.y1 + Math.max(Math.abs(dx), 1)
        } else {
          w.x2 = w.x1 + Math.max(Math.abs(dy), 1)
          w.y2 = w.y1
        }
        return next
      })
    },
    [pushHistory],
  )

  const addStairsElement = useCallback(
    (x: number, y: number) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.stairs.push({ id: makeId('stairs'), x, y, width: 1.2, height: 2.2 })
        return next
      })
    },
    [pushHistory],
  )

  const moveStairs = useCallback((id: string, x: number, y: number) => {
    setState((cur) => {
      const next = clone(cur)
      const s = next.stairs.find((ss) => ss.id === id)
      if (s) {
        s.x = x
        s.y = y
      }
      return next
    })
  }, [])

  const finalizeStairsMove = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const addFurniture = useCallback(
    (
      furnitureType: string,
      label: string,
      x: number,
      y: number,
      width: number,
      depth: number,
      height3d?: number,
      color3d?: string,
    ) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        next.furniture.push({
          id: makeId('furn'),
          furnitureType,
          label,
          x,
          y,
          width,
          depth,
          rotation: 0,
          height3d,
          color3d,
        })
        return next
      })
    },
    [pushHistory],
  )

  const moveFurniture = useCallback((id: string, x: number, y: number) => {
    setState((cur) => {
      const next = clone(cur)
      const f = next.furniture.find((ff) => ff.id === id)
      if (f) {
        f.x = x
        f.y = y
      }
      return next
    })
  }, [])

  const finalizeFurnitureMove = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const resizeFurniture = useCallback((id: string, width: number, depth: number) => {
    setState((cur) => {
      const next = clone(cur)
      const f = next.furniture.find((ff) => ff.id === id)
      if (f) {
        f.width = width
        f.depth = depth
      }
      return next
    })
  }, [])

  const finalizeFurnitureResize = useCallback(() => {
    setState((cur) => {
      pushHistory(cur)
      return cur
    })
  }, [pushHistory])

  const rotateFurniture = useCallback(
    (id: string) => {
      setState((cur) => {
        pushHistory(cur)
        const next = clone(cur)
        const f = next.furniture.find((ff) => ff.id === id)
        if (f) f.rotation = (f.rotation + 90) % 360
        return next
      })
    },
    [pushHistory],
  )

  const getSelectedRoom = useCallback(() => {
    if (!selectedId || selectedType !== 'room') return null
    return state.rooms.find((r) => r.id === selectedId) ?? null
  }, [selectedId, selectedType, state.rooms])

  const api = useMemo(
    () => ({
      tool,
      setTool,
      selectedId,
      selectedType,
      state,
      canUndo,
      canRedo,
      undo,
      redo,
      selectElement,
      deleteSelected,
      addRoom,
      updateRoomLabel,
      updateRoomDimensions,
      moveRoom,
      finalizeRoomMove,
      resizeRoom,
      finalizeRoomResize,
      addWallSegment,
      moveWallTo,
      resizeWallEnd,
      finalizeWallMove,
      addDoor,
      moveDoor,
      finalizeDoorMove,
      rotateDoor,
      addWindow,
      moveWindow,
      finalizeWindowMove,
      rotateWindow,
      addStairsElement,
      moveStairs,
      finalizeStairsMove,
      addFurniture,
      moveFurniture,
      finalizeFurnitureMove,
      resizeFurniture,
      finalizeFurnitureResize,
      rotateFurniture,
      getSelectedRoom,
    }),
    [
      tool,
      setTool,
      selectedId,
      selectedType,
      state,
      canUndo,
      canRedo,
      undo,
      redo,
      selectElement,
      deleteSelected,
      addRoom,
      updateRoomLabel,
      updateRoomDimensions,
      moveRoom,
      finalizeRoomMove,
      resizeRoom,
      finalizeRoomResize,
      addWallSegment,
      moveWallTo,
      resizeWallEnd,
      finalizeWallMove,
      addDoor,
      moveDoor,
      finalizeDoorMove,
      rotateDoor,
      addWindow,
      moveWindow,
      finalizeWindowMove,
      rotateWindow,
      addStairsElement,
      moveStairs,
      finalizeStairsMove,
      addFurniture,
      moveFurniture,
      finalizeFurnitureMove,
      resizeFurniture,
      finalizeFurnitureResize,
      rotateFurniture,
      getSelectedRoom,
    ],
  )

  return api
}

