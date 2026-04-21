# Custom Hooks (Phase 3)

This directory contains custom React hooks that encapsulate complex editor logic.

## 📁 Files

```
hooks/
├── useDxfSelection.ts    # Selection operations
├── useDxfDrag.ts         # Drag operations
├── useDxfFurniture.ts    # Furniture management
├── index.ts              # Central export
└── README.md             # This file
```

---

## 🎯 Purpose

Hooks extract complex logic from the main component into reusable, testable functions. They combine multiple contexts and provide high-level operations.

**Benefits:**
- ✅ Cleaner component code
- ✅ Reusable logic across components
- ✅ Easier to test
- ✅ Better separation of concerns

---

## 📚 Hooks

### 1. useDxfSelection

**Purpose:** High-level selection operations

**What it provides:**
- `selectWalls(wallIds, additive)` - Select multiple walls
- `toggleWallSelection(wallId, isCtrl)` - Toggle wall with group expansion
- `selectFurniture(furnKey)` - Select furniture group
- `selectWindow(winKey)` - Select window group
- `selectArc(arcHandle, isCtrl)` - Select arc
- `selectText(textHandle, isCtrl)` - Select text label
- `selectRoom(roomIndex)` - Select room
- `clearAll()` - Clear all selections
- `isWallSelected(wallId)` - Check if wall is selected
- `hasAnySelection` - Boolean flag

**Example:**
```tsx
function Wall({ id }) {
  const { toggleWallSelection, isWallSelected } = useDxfSelection()
  const isSelected = isWallSelected(id)
  
  return (
    <Line
      stroke={isSelected ? '#f59e0b' : '#474747'}
      onClick={(e) => toggleWallSelection(id, e.evt.ctrlKey)}
    />
  )
}
```

**Dependencies:**
- EditorStateContext (walls, planDoc)
- SelectionStateContext (all selection state)
- dxfSelection utils (getGroupWallIds)

---

### 2. useDxfDrag

**Purpose:** Manage drag operations for walls, rooms, furniture

**What it provides:**
- `startWallDrag(wallId, wx, wy, selection)` - Begin wall drag
- `startRoomDrag(wallIds, cx, cy)` - Begin room drag
- `updateDrag(wx, wy, orthoEnabled)` - Update drag position
- `updateRoomDrag(dx, dy)` - Update room drag
- `endDrag()` - Commit wall drag
- `endRoomDrag()` - Commit room drag
- `cancelDrag()` - Cancel without committing
- `getEffectiveWalls()` - Get walls with drag applied
- `isDragging` - Boolean flag
- `activeDrag`, `dragDelta` - Current drag state
- `roomDrag`, `roomDragDelta` - Room drag state

**Example:**
```tsx
function Wall({ id }) {
  const { startWallDrag, updateDrag, endDrag } = useDxfDrag()
  const { selectedIds } = useDxfSelection()
  
  return (
    <Line
      onMouseDown={(e) => {
        const [wx, wy] = toW(e.target.x(), e.target.y(), t)
        startWallDrag(id, wx, wy, selectedIds)
      }}
      onMouseMove={(e) => {
        const [wx, wy] = toW(e.target.x(), e.target.y(), t)
        updateDrag(wx, wy, orthoEnabled)
      }}
      onMouseUp={endDrag}
    />
  )
}
```

**Dependencies:**
- EditorStateContext (walls, planDoc, snapshot)
- SelectionStateContext (selectedIds)
- dxfDocumentUtils (cloneDoc)

---

### 3. useDxfFurniture

**Purpose:** Furniture grouping and operations

**What it provides:**
- `furnitureGroups` - Array of `{ key, lines }` groups
- `furnitureLabels` - Map of key → label
- `selectedFurnKey` - Currently selected furniture
- `moveFurniture(furnKey, dx, dy)` - Move furniture group
- `deleteFurniture(furnKey)` - Delete furniture group
- `getFurnitureCategory(furnKey)` - Get category
- `getFurnitureCentroid(furnKey)` - Get center point
- `furnitureGroupKeyFromHandle(handle)` - Utility function

**Example:**
```tsx
function FurnitureLayer() {
  const { furnitureGroups, moveFurniture, selectedFurnKey } = useDxfFurniture()
  
  return (
    <Layer>
      {furnitureGroups.map(({ key, lines }) => (
        <Group
          key={key}
          draggable
          onDragEnd={(e) => {
            const dx = e.target.x() / t.sc
            const dy = -e.target.y() / t.sc
            moveFurniture(key, dx, dy)
            e.target.position({ x: 0, y: 0 })
          }}
        >
          {lines.map(ln => (
            <Line
              key={ln.handle}
              points={[...toC(ln.start.x, ln.start.y, t), ...toC(ln.end.x, ln.end.y, t)]}
              stroke={selectedFurnKey === key ? '#f59e0b' : '#474747'}
            />
          ))}
        </Group>
      ))}
    </Layer>
  )
}
```

**Dependencies:**
- EditorStateContext (planDoc, snapshot)
- SelectionStateContext (selectedFurnKey)
- furnitureLibraryDxf (FURNITURE_DXF_TEMPLATES)

---

## 🔄 Hook Composition

Hooks can be composed together:

```tsx
function DxfEditor() {
  const selection = useDxfSelection()
  const drag = useDxfDrag()
  const furniture = useDxfFurniture()
  
  // Use all three together
  const handleWallClick = (wallId: string, isCtrl: boolean) => {
    selection.toggleWallSelection(wallId, isCtrl)
  }
  
  const handleWallDrag = (wallId: string, wx: number, wy: number) => {
    drag.startWallDrag(wallId, wx, wy, selection.selectedIds)
  }
  
  const handleFurnitureDrag = (furnKey: string, dx: number, dy: number) => {
    furniture.moveFurniture(furnKey, dx, dy)
  }
  
  return <Canvas />
}
```

---

## 🧪 Testing

Hooks are easier to test than inline logic:

```tsx
import { renderHook, act } from '@testing-library/react'
import { useDxfSelection } from './useDxfSelection'

test('toggleWallSelection adds wall to selection', () => {
  const { result } = renderHook(() => useDxfSelection())
  
  act(() => {
    result.current.toggleWallSelection('wall-1', false)
  })
  
  expect(result.current.selectedIds.has('wall-1')).toBe(true)
})
```

---

## 📊 Phase 3 Progress

### ✅ Completed
- useDxfSelection - Selection operations
- useDxfDrag - Drag operations
- useDxfFurniture - Furniture management

### 🎯 Benefits Achieved
- **Reduced component size:** Main component will be ~2000 lines (from 2500)
- **Better organization:** Logic grouped by feature
- **Easier testing:** Each hook can be tested independently
- **Reusability:** Hooks can be used in other components

---

## 🚀 Next Steps (Phase 4)

After Phase 3, the next step is to split the main component into smaller sub-components:

1. **FurnitureLayer.tsx** - Render furniture
2. **WallsLayer.tsx** - Render walls
3. **RoomsLayer.tsx** - Render rooms
4. **LabelsLayer.tsx** - Render text labels
5. **ToolsPanel.tsx** - Toolbar UI
6. **PropertiesPanel.tsx** - Right sidebar

This will reduce the main component to ~500 lines.

---

## 💡 Usage Tips

1. **Import from index:** Always import from `@/hooks` not individual files
2. **Combine hooks:** Use multiple hooks together for complex operations
3. **Keep hooks pure:** Don't add side effects, keep them focused
4. **Document changes:** Update this README when adding new hooks

---

## 📖 Related Documentation

- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Overall architecture
- [src/contexts/README.md](../contexts/README.md) - Context providers
- [src/utils/README.md](../utils/README.md) - Utility functions
- [REFACTORING_GUIDE.md](../../REFACTORING_GUIDE.md) - Original plan

---

**Phase 3 Complete!** ✅

The editor now has:
- ✅ Phase 1: Utility functions (800+ lines)
- ✅ Phase 2: Context providers (440 lines)
- ✅ Phase 3: Custom hooks (500+ lines)
- ⏳ Phase 4: Component splitting (next)
