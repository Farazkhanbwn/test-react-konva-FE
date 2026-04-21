# DxfJsonViewPage Refactoring Guide

## Current Issues
- 3000+ lines in single file
- Hard to maintain and debug
- State management scattered
- Difficult to test individual features

## Refactoring Strategy

### Phase 1: Extract Utilities (No Breaking Changes)

#### 1.1 Geometry Utils
**File:** `src/utils/dxfGeometry.ts`

```typescript
export function toC(wx: number, wy: number, t: Transform): [number, number] {
  return [
    (wx - t.emin[0]) * t.sc + t.oX,
    t.oY + (t.wH - (wy - t.emin[1])) * t.sc,
  ]
}

export function toW(cx: number, cy: number, t: Transform): [number, number] {
  return [
    (cx - t.oX) / t.sc + t.emin[0],
    t.emin[1] + t.wH - (cy - t.oY) / t.sc,
  ]
}

export function rotatePoint(
  px: number, py: number, 
  cx: number, cy: number, 
  angle: number
): [number, number] {
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const dx = px - cx, dy = py - cy
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
}

export function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
) {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-12) return { pt: { x: ax, y: ay }, t: 0, dist: Math.hypot(px - ax, py - ay) }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + t * dx, cy = ay + t * dy
  return { pt: { x: cx, y: cy }, t, dist: Math.hypot(px - cx, py - cy) }
}

export function polyArea(pts: Pt[]): number {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return a / 2
}
```

#### 1.2 Snapping Utils
**File:** `src/utils/dxfSnapping.ts`

```typescript
export interface SnapResult {
  point: Pt
  type: 'endpoint' | 'midpoint' | 'arcCenter' | 'arcQuadrant' | null
  alignGuides: Array<{ type: 'h' | 'v'; coord: number }>
}

export function calculateSnap(
  x: number, 
  y: number,
  walls: WallSeg[],
  arcs: DxfArc[],
  excludeIds: string[],
  snapEnabled: boolean,
  snapThreshold: number = 0.15
): SnapResult {
  // Move getSnap logic here
}
```

#### 1.3 Room Detection Utils
**File:** `src/utils/dxfRoomDetection.ts`

```typescript
export function detectRooms(walls: WallSeg[]): Pt[][] {
  // Move detectRooms logic here
}

export function detectRoomsWithWalls(walls: WallSeg[]): Array<{ polygon: Pt[]; wallIds: string[] }> {
  // Move detectRoomsWithWalls logic here
}

export function wallIdsOnRoomBoundary(room: Pt[], segs: WallSeg[]): string[] {
  // Move wallIdsOnRoomBoundary logic here
}
```

---

### Phase 2: Create Context for State Management

#### 2.1 DxfEditorContext
**File:** `src/contexts/DxfEditorContext.tsx`

```typescript
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import type { WallSeg } from '@/utils/wallsFromDxfJson'

interface DxfEditorState {
  // Document & Walls
  planDoc: DxfJsonDocument
  walls: WallSeg[]
  
  // Selection
  selectedIds: Set<string>
  selectedId: string | null
  selectedRoomIndex: number | null
  selectedTextHandle: string | null
  selectedArcHandle: string | null
  selectedWinKey: string | null
  selectedFurnKey: string | null
  
  // Tools
  activeTool: 'select' | 'hand' | 'frame' | 'drawLine' | 'drawPolyline' | 'text' | 'drawArc' | 'drawCircle'
  
  // View
  zoom: number
  pos: { x: number; y: number }
  
  // Settings
  snapEnabled: boolean
  orthoEnabled: boolean
  showDetail: boolean
  showLabels: boolean
  showFurnitureLabels: boolean
  units: 'm' | 'cm' | 'mm'
  strokeHex: string
  strokeScale: number
}

interface DxfEditorActions {
  // Document mutations
  setPlanDoc: (doc: DxfJsonDocument | ((prev: DxfJsonDocument) => DxfJsonDocument)) => void
  setWalls: (walls: WallSeg[] | ((prev: WallSeg[]) => WallSeg[])) => void
  
  // Selection
  setSelectedIds: (ids: Set<string>) => void
  setSelectedFurnKey: (key: string | null) => void
  clearSelection: () => void
  
  // Tools
  setActiveTool: (tool: DxfEditorState['activeTool']) => void
  
  // View
  setZoom: (zoom: number) => void
  setPos: (pos: { x: number; y: number }) => void
  
  // History
  snapshot: () => void
  undo: () => void
  
  // Settings
  toggleSnap: () => void
  toggleOrtho: () => void
  setUnits: (units: 'm' | 'cm' | 'mm') => void
}

const DxfEditorContext = createContext<(DxfEditorState & DxfEditorActions) | null>(null)

export function DxfEditorProvider({ children, initialDoc }: { children: ReactNode; initialDoc: DxfJsonDocument }) {
  const [planDoc, setPlanDoc] = useState(initialDoc)
  const [walls, setWalls] = useState<WallSeg[]>(() => wallsFromDxfJson(initialDoc))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedFurnKey, setSelectedFurnKey] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<DxfEditorState['activeTool']>('select')
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [history, setHistory] = useState<Array<{ walls: WallSeg[]; planDoc: DxfJsonDocument }>>([])
  
  const snapshot = useCallback(() => {
    setHistory(h => [...h.slice(-20), { walls: [...walls], planDoc: JSON.parse(JSON.stringify(planDoc)) }])
  }, [walls, planDoc])
  
  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h
      const snap = h[h.length - 1]
      setWalls([...snap.walls])
      setPlanDoc(JSON.parse(JSON.stringify(snap.planDoc)))
      return h.slice(0, -1)
    })
  }, [])
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedFurnKey(null)
  }, [])
  
  const value = {
    // State
    planDoc, walls, selectedIds, selectedFurnKey, activeTool, zoom, pos, snapEnabled,
    // Actions
    setPlanDoc, setWalls, setSelectedIds, setSelectedFurnKey, clearSelection,
    setActiveTool, setZoom, setPos, snapshot, undo,
    toggleSnap: () => setSnapEnabled(v => !v),
    toggleOrtho: () => {},
    setUnits: () => {},
  }
  
  return <DxfEditorContext.Provider value={value}>{children}</DxfEditorContext.Provider>
}

export function useDxfEditor() {
  const context = useContext(DxfEditorContext)
  if (!context) throw new Error('useDxfEditor must be used within DxfEditorProvider')
  return context
}
```

---

### Phase 3: Extract Custom Hooks

#### 3.1 Selection Hook
**File:** `src/hooks/useDxfSelection.ts`

```typescript
import { useCallback } from 'react'
import { useDxfEditor } from '@/contexts/DxfEditorContext'

export function useDxfSelection() {
  const { selectedIds, setSelectedIds, selectedFurnKey, setSelectedFurnKey, walls } = useDxfEditor()
  
  const selectWalls = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [setSelectedIds])
  
  const selectFurniture = useCallback((key: string) => {
    setSelectedFurnKey(key)
    setSelectedIds(new Set())
  }, [setSelectedFurnKey, setSelectedIds])
  
  const toggleSelection = useCallback((id: string, isCtrl: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(isCtrl ? prev : [])
      if (prev.has(id) && isCtrl) next.delete(id)
      else next.add(id)
      return next
    })
  }, [setSelectedIds])
  
  return {
    selectedIds,
    selectedFurnKey,
    selectWalls,
    selectFurniture,
    toggleSelection,
  }
}
```

#### 3.2 Drag Hook
**File:** `src/hooks/useDxfDrag.ts`

```typescript
import { useCallback, useRef, useState } from 'react'
import { useDxfEditor } from '@/contexts/DxfEditorContext'

export function useDxfDrag() {
  const { walls, setWalls, setPlanDoc, snapshot } = useDxfEditor()
  const [activeDrag, setActiveDrag] = useState<ActiveDrag | null>(null)
  const [dragDelta, setDragDelta] = useState({ dx: 0, dy: 0 })
  
  const startDrag = useCallback((wallId: string, initWX: number, initWY: number) => {
    snapshot()
    const drag: ActiveDrag = {
      wallId,
      toMoveWallIds: [wallId],
      toMoveTextIds: [],
      toMoveArcHandles: [],
      initWX,
      initWY,
    }
    setActiveDrag(drag)
  }, [snapshot])
  
  const updateDrag = useCallback((wx: number, wy: number) => {
    if (!activeDrag) return
    const dx = wx - activeDrag.initWX
    const dy = wy - activeDrag.initWY
    setDragDelta({ dx, dy })
  }, [activeDrag])
  
  const endDrag = useCallback(() => {
    if (!activeDrag) return
    // Apply drag to document
    setActiveDrag(null)
    setDragDelta({ dx: 0, dy: 0 })
  }, [activeDrag, dragDelta])
  
  return {
    activeDrag,
    dragDelta,
    startDrag,
    updateDrag,
    endDrag,
  }
}
```

#### 3.3 Furniture Hook
**File:** `src/hooks/useDxfFurniture.ts`

```typescript
import { useMemo, useCallback } from 'react'
import { useDxfEditor } from '@/contexts/DxfEditorContext'

export function useDxfFurniture() {
  const { planDoc, setPlanDoc, selectedFurnKey } = useDxfEditor()
  
  const furnitureGroups = useMemo(() => {
    const lines = planDoc.furniture_lines ?? []
    // Spatial clustering logic here
    return []
  }, [planDoc.furniture_lines])
  
  const moveFurniture = useCallback((key: string, dx: number, dy: number) => {
    setPlanDoc(prev => ({
      ...prev,
      furniture_lines: (prev.furniture_lines ?? []).map(ln => {
        // Move logic
        return ln
      })
    }))
  }, [setPlanDoc])
  
  return {
    furnitureGroups,
    selectedFurnKey,
    moveFurniture,
  }
}
```

---

### Phase 4: Split into Layer Components

#### 4.1 Furniture Layer
**File:** `src/components/DxfCanvas/FurnitureLayer.tsx`

```typescript
import { Layer, Group, Rect, Text } from 'react-konva'
import { useDxfFurniture } from '@/hooks/useDxfFurniture'
import { useDxfEditor } from '@/contexts/DxfEditorContext'

export function FurnitureLayer() {
  const { furnitureGroups, selectedFurnKey, moveFurniture } = useDxfFurniture()
  const { snapshot, zoom } = useDxfEditor()
  
  return (
    <Layer>
      {furnitureGroups.map(({ key, lines }) => (
        <Group key={key}>
          <Rect
            // ... rendering logic
            onClick={() => {
              console.log('Furniture clicked:', key, lines)
            }}
          />
        </Group>
      ))}
    </Layer>
  )
}
```

---

## Migration Steps

### Step 1: Extract Utils (Safe, No Breaking Changes)
1. Create `utils/dxfGeometry.ts` - copy geometry functions
2. Create `utils/dxfSnapping.ts` - copy snap logic
3. Create `utils/dxfRoomDetection.ts` - copy room detection
4. Import and use in main file
5. Test - everything should work the same

### Step 2: Create Context
1. Create `contexts/DxfEditorContext.tsx`
2. Wrap `DxfJsonViewPage` with provider
3. Gradually replace `useState` with context
4. Test after each state migration

### Step 3: Extract Hooks
1. Create `hooks/useDxfSelection.ts`
2. Create `hooks/useDxfDrag.ts`
3. Create `hooks/useDxfFurniture.ts`
4. Replace inline logic with hooks
5. Test each hook independently

### Step 4: Split Components
1. Create `components/DxfCanvas/FurnitureLayer.tsx`
2. Create `components/DxfCanvas/WallsLayer.tsx`
3. Create `components/DxfCanvas/RoomsLayer.tsx`
4. Replace inline JSX with components
5. Test rendering

---

## Benefits After Refactoring

✅ **Maintainability**: Each file < 300 lines
✅ **Testability**: Utils and hooks can be unit tested
✅ **Debugging**: Console.log in specific hooks/components
✅ **Reusability**: Hooks can be used in other components
✅ **Performance**: Easier to optimize with React.memo
✅ **Collaboration**: Multiple developers can work on different files

---

## Example: Debugging Furniture Selection

**Before (3000 line file):**
```typescript
// Hard to find where furniture is selected
// Scattered across multiple callbacks
```

**After:**
```typescript
// src/hooks/useDxfFurniture.ts
export function useDxfFurniture() {
  const selectFurniture = useCallback((key: string, lines: DxfLine[]) => {
    console.log('=== FURNITURE SELECTED ===')
    console.log('Key:', key)
    console.log('Lines:', lines.map(l => l.handle))
    setSelectedFurnKey(key)
  }, [])
  
  return { selectFurniture }
}
```

---

## Quick Win: Add Logging Now

**Without refactoring**, add this to your current file:

```typescript
// At the top of DxfJsonViewPage
const DEBUG = true

const log = {
  furniture: (...args: any[]) => DEBUG && console.log('[FURNITURE]', ...args),
  selection: (...args: any[]) => DEBUG && console.log('[SELECTION]', ...args),
  drag: (...args: any[]) => DEBUG && console.log('[DRAG]', ...args),
}

// Then use:
onClick={e => {
  log.furniture('Clicked', key, lines.map(l => l.handle))
  setSelectedFurnKey(key)
}}
```

This gives you immediate debugging without refactoring!
