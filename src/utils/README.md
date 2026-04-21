# DXF Editor Utility Functions

This directory contains **pure utility functions** extracted from the main `DxfJsonViewPage.tsx` component during Phase 1 refactoring.

## 📁 File Structure

```
utils/
├── dxfGeometry.ts          # Coordinate transformations & geometric calculations
├── dxfRoomDetection.ts     # DCEL algorithm for detecting enclosed rooms
├── dxfSelection.ts         # Selection logic (multi-select, groups)
├── dxfDocumentUtils.ts     # CRUD operations on DXF document
├── dxfSnapping.ts          # Snap-to-point calculations
└── README.md               # This file
```

---

## 🎯 Purpose of Each File

### 1. **dxfGeometry.ts** - Math & Coordinates
**What it does:**
- Converts between world coordinates (meters) and canvas coordinates (pixels)
- Performs geometric calculations (rotation, distance, area, intersection)
- Generates rendering points for arcs and curves

**Key functions:**
- `toC(wx, wy, t)` - World → Canvas coordinates
- `toW(cx, cy, t)` - Canvas → World coordinates
- `buildTransform(...)` - Create transformation matrix
- `rotatePoint(...)` - Rotate point around center
- `polyArea(pts)` - Calculate polygon area
- `arcPoints(arc, t)` - Generate arc rendering points

**When to use:**
- Converting mouse clicks to world positions
- Rendering entities on canvas
- Calculating distances and areas
- Rotating/transforming geometry

---

### 2. **dxfRoomDetection.ts** - Room Detection Algorithm
**What it does:**
- Uses DCEL (Doubly Connected Edge List) to find enclosed rooms
- Detects which walls form each room boundary
- Validates room polygons using polygon-clipping library

**Key functions:**
- `detectRooms(walls)` - Find all room polygons
- `detectRoomsWithWalls(walls)` - Find rooms + their wall IDs
- `wallIdsOnRoomBoundary(room, segs)` - Get walls forming a room
- `translateWallsByIds(walls, ids, dx, dy)` - Move specific walls

**When to use:**
- Detecting enclosed spaces after user draws walls
- Finding which walls to move when dragging a room
- Calculating room areas
- Validating floor plan topology

**Algorithm overview:**
```
1. Build planar graph from wall segments
2. Sort edges counterclockwise around each vertex
3. Trace minimal cycles (faces) using half-edge structure
4. Filter interior faces (positive area)
5. Validate with polygon-clipping library
```

---

### 3. **dxfSelection.ts** - Selection Logic
**What it does:**
- Handles grouped wall selection
- Manages multi-select operations
- Calculates selection boxes

**Key functions:**
- `getGroupWallIds(wallId, walls)` - Get all walls in same group

**When to use:**
- User clicks a wall that's part of a group
- Implementing "select all connected" behavior
- Managing selection state

---

### 4. **dxfDocumentUtils.ts** - Document CRUD
**What it does:**
- Adds new entities (LINE, ARC, LWPOLYLINE, MTEXT) to document
- Removes entities by handle or wall ID
- Updates document statistics
- Maintains immutability (never mutates input)

**Key functions:**
- `cloneDoc(doc)` - Deep clone document
- `appendUserLine(doc, start, end)` - Add LINE
- `appendUserArc(doc, center, radius, ...)` - Add ARC
- `appendUserPolyline(doc, vertices, closed)` - Add LWPOLYLINE
- `appendUserText(doc, position, text)` - Add MTEXT
- `removeLineFromDocByWallId(doc, wallId)` - Delete LINE
- `removeArcFromDocByHandle(doc, handle)` - Delete ARC
- `removePolylineFromDocByHandle(doc, handle)` - Delete LWPOLYLINE
- `removeTextFromDoc(doc, handle)` - Delete MTEXT
- `polylineHandleFromWallId(wallId)` - Extract polyline handle
- `roomLabelHandle(polyHandle)` - Generate room label handle

**When to use:**
- User draws a new wall/arc/polyline
- User deletes an entity
- Implementing undo/redo
- Exporting modified document

**Important concepts:**
- **Handle**: Unique ID for each entity (e.g., `user-1234567890`)
- **Wall ID**: Prefixed handle (e.g., `ln-user-123` for LINE, `pl-handle-0` for polyline segment)
- **Immutability**: All functions return NEW documents, never mutate input

---

### 5. **dxfSnapping.ts** - Snap Calculations
**What it does:**
- Finds nearest snap points (endpoints, midpoints, arc centers)
- Calculates alignment guides (horizontal/vertical)
- Handles snap-to-wall (on-segment snapping)

**Key functions:**
- `calculateSnap(x, y, walls, arcs, excludeIds, snapEnabled)` - Find snap point

**When to use:**
- User is drawing a new wall
- User is dragging an endpoint
- Implementing AutoCAD-style snapping behavior

---

## 🔑 Key Concepts

### Coordinate Systems
- **World Coordinates**: Real-world measurements in meters (e.g., 5.5m, 3.2m)
- **Canvas Coordinates**: Pixel positions on screen (e.g., 450px, 320px)
- **Transform**: Matrix that converts between the two systems

### Entity Types
- **LINE**: Straight wall segment
- **ARC**: Curved segment (doors, circles)
- **LWPOLYLINE**: Connected line segments (room boundaries)
- **MTEXT**: Text labels (room names, dimensions)

### Handles & IDs
- **Handle**: Unique identifier from DXF file (e.g., `1A3F`, `user-1234567890`)
- **Wall ID**: Prefixed handle for wall segments:
  - `ln-{handle}` for LINE entities
  - `pl-{handle}-{index}` for LWPOLYLINE segments
  - `arc-{handle}-{index}` for ARC chord segments

---

## ✅ Benefits of This Structure

1. **Testability**: Pure functions can be unit tested independently
2. **Reusability**: Functions can be imported by any component
3. **Maintainability**: Small, focused files are easier to understand
4. **Type Safety**: Explicit TypeScript interfaces
5. **No Side Effects**: All functions are pure (no mutations, no React hooks)

---

## 🚀 Usage Examples

### Example 1: Convert mouse click to world position
```typescript
import { toW, buildTransform } from './utils/dxfGeometry'

// Build transform once
const t = buildTransform([0, 0], [10, 8], 800, 600)

// Convert mouse click (400px, 300px) to world position
const [worldX, worldY] = toW(400, 300, t)
console.log(`Clicked at ${worldX}m, ${worldY}m`)
```

### Example 2: Add a new wall to document
```typescript
import { appendUserLine } from './utils/dxfDocumentUtils'

const { next, handle } = appendUserLine(
  currentDoc,
  { x: 0, y: 0 },
  { x: 5, y: 0 }
)
console.log(`Added wall with handle: ${handle}`)
setPlanDoc(next) // Update state
```

### Example 3: Detect rooms after drawing walls
```typescript
import { detectRooms } from './utils/dxfRoomDetection'
import { polyArea } from './utils/dxfGeometry'

const rooms = detectRooms(walls)
rooms.forEach((room, i) => {
  const area = Math.abs(polyArea(room))
  console.log(`Room ${i + 1}: ${area.toFixed(2)} m²`)
})
```

### Example 4: Rotate a wall around a point
```typescript
import { rotatePoint } from './utils/dxfGeometry'

const angle = Math.PI / 4 // 45 degrees
const [newX, newY] = rotatePoint(
  wall.start.x,
  wall.start.y,
  centerX,
  centerY,
  angle
)
```

---

## 📝 Next Steps (Future Phases)

**Phase 2**: Extract Context Providers
- `EditorStateContext` for walls, planDoc, selectedIds
- `ToolContext` for activeTool, snapEnabled, orthoEnabled

**Phase 3**: Extract Custom Hooks
- `useWallDragging()` - Handle wall drag logic
- `useRoomDetection()` - Memoized room detection
- `useSnapping()` - Snap calculation logic

**Phase 4**: Split Components
- `<Toolbar />` - Tool selection buttons
- `<PropertiesPanel />` - Right sidebar
- `<Canvas />` - Konva stage and layers

---

## 🧪 Testing

Each utility file can be tested independently:

```typescript
// Example test for dxfGeometry.ts
import { toC, toW, buildTransform } from './dxfGeometry'

test('coordinate conversion round-trip', () => {
  const t = buildTransform([0, 0], [10, 8], 800, 600)
  const [cx, cy] = toC(5, 4, t)
  const [wx, wy] = toW(cx, cy, t)
  expect(wx).toBeCloseTo(5)
  expect(wy).toBeCloseTo(4)
})
```

---

## 📚 Further Reading

- [DXF File Format Specification](https://help.autodesk.com/view/OARX/2023/ENU/?guid=GUID-235B22E0-A567-4CF6-92D3-38A2306D73F3)
- [DCEL Data Structure](https://en.wikipedia.org/wiki/Doubly_connected_edge_list)
- [Polygon Clipping Library](https://github.com/mfogel/polygon-clipping)
- [Konva.js Documentation](https://konvajs.org/docs/)
