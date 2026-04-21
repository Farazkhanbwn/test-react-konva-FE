# DxfCanvas Layer Components

## Overview

These are **example layer components** created in Phase 4 to demonstrate how to use Phase 2 contexts and Phase 3 hooks to build modular, reusable canvas layers.

## Purpose

These components serve as **templates** for building a new DXF editor from scratch using the refactored architecture. They are **NOT** currently used in the main `DxfJsonViewPage` component.

## Components

### 1. FurnitureLayer
**File:** `FurnitureLayer.tsx`

Renders furniture items with drag/selection support.

**Features:**
- Uses `useDxfFurniture` hook for furniture grouping
- Uses `useEditorState` for document access
- Uses `useSelectionState` for selection management
- Demonstrates category-based coloring
- Shows furniture labels

**Props:**
```typescript
interface FurnitureLayerProps {
  t: Transform                    // Coordinate transform
  zoom: number                    // Current zoom level
  strokeScale: number             // Stroke thickness multiplier
  showFurnitureLabels: boolean    // Toggle labels
}
```

**Usage:**
```tsx
<FurnitureLayer
  t={transform}
  zoom={zoom}
  strokeScale={1}
  showFurnitureLabels={true}
/>
```

### 2. WallsLayer
**File:** `WallsLayer.tsx`

Renders wall segments with endpoint handles and drag support.

**Features:**
- Uses `useDxfDrag` hook for drag operations
- Uses `useEditorState` for walls access
- Uses `useSelectionState` for selection
- Demonstrates endpoint dragging
- Shows group highlighting

**Props:**
```typescript
interface WallsLayerProps {
  t: Transform
  zoom: number
  strokeHex: string
  strokeScale: number
  hoveredGroupId: string | null
  setHoveredGroupId: (id: string | null) => void
  onEpDragMove: (e: KonvaEvent, wallId: string, ep: 'start' | 'end') => void
  onEpDragEnd: () => void
  setIsDraggingEp: (v: boolean) => void
  draggingEpInfo: React.MutableRefObject<{ wallId: string; ep: 'start' | 'end' } | null>
  getGroupWallIds: (wallId: string, walls: WallSeg[]) => string[]
}
```

### 3. RoomsLayer
**File:** `RoomsLayer.tsx`

Renders room fills with click/drag support.

**Features:**
- Uses `useDxfDrag` hook for room dragging
- Uses `useSelectionState` for selection
- Demonstrates room fill rendering
- Shows hover effects

**Props:**
```typescript
interface RoomsLayerProps {
  roomsWithWalls: Array<{ polygon: Pt[]; wallIds: string[] }>
  t: Transform
  zoom: number
  hoveredRoomIdx: number | null
  setHoveredRoomIdx: (idx: number | null) => void
  ROOM_COLORS: string[]
  ROOM_STROKES: string[]
}
```

## Architecture Pattern

All layer components follow this pattern:

```tsx
import { Layer, Line, Circle, Group } from 'react-konva'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useToolState } from '@/contexts/ToolStateContext'
import { useSelectionState } from '@/contexts/SelectionStateContext'
import { useDxfSelection, useDxfDrag, useDxfFurniture } from '@/hooks'

export function MyLayer(props: MyLayerProps) {
  // 1. Get state from contexts
  const { planDoc, walls } = useEditorState()
  const { activeTool } = useToolState()
  const { selectedIds } = useSelectionState()
  
  // 2. Get operations from hooks
  const { selectWalls } = useDxfSelection()
  const { startDrag, endDrag } = useDxfDrag()
  
  // 3. Render using Konva components
  return (
    <Layer>
      {/* Your rendering logic */}
    </Layer>
  )
}
```

## Why These Are Examples

### Current State
- Main component (`DxfJsonViewPage`) uses **local useState**
- Contexts are wrapped but **not used**
- Hooks exist but **not integrated**
- Everything works perfectly

### These Components Show
1. **How to use contexts** - Access shared state
2. **How to use hooks** - High-level operations
3. **How to structure layers** - Separation of concerns
4. **How to handle events** - Click, drag, hover

## Migration Strategy

### For New Project (Recommended)

1. **Copy the architecture:**
```
src/
├── contexts/           # Copy Phase 2
├── hooks/              # Copy Phase 3
├── utils/              # Copy Phase 1
└── components/
    └── DxfCanvas/      # Use these as templates
```

2. **Build your editor:**
```tsx
function NewDxfEditor() {
  return (
    <EditorStateProvider initialDoc={doc} initialWalls={walls}>
      <ToolStateProvider>
        <SelectionStateProvider>
          <Stage>
            <RoomsLayer {...props} />
            <WallsLayer {...props} />
            <FurnitureLayer {...props} />
          </Stage>
        </SelectionStateProvider>
      </ToolStateProvider>
    </EditorStateProvider>
  )
}
```

3. **Customize as needed:**
- Add more layers (DoorsLayer, WindowsLayer, etc.)
- Modify event handlers
- Add new features
- Adjust styling

### For Current Project (Optional)

If you want to integrate these into the current component:

1. **Replace useState with context hooks** (one at a time)
2. **Extract rendering logic** to layer components
3. **Test after each change**
4. **Keep git commits small**

## Benefits of Layer Components

### 1. Separation of Concerns ✅
Each layer handles one type of entity:
- `RoomsLayer` → Room fills
- `WallsLayer` → Wall segments
- `FurnitureLayer` → Furniture items

### 2. Reusability ✅
Layers can be:
- Used in multiple editors
- Composed differently
- Tested independently

### 3. Maintainability ✅
Each layer is:
- Small (~100-200 lines)
- Focused on one task
- Easy to understand

### 4. Testability ✅
Layers can be:
- Unit tested
- Mocked easily
- Tested in isolation

## Example: Building a Simple Editor

```tsx
import { Stage, Layer } from 'react-konva'
import { EditorStateProvider } from '@/contexts/EditorStateContext'
import { ToolStateProvider } from '@/contexts/ToolStateProvider'
import { SelectionStateProvider } from '@/contexts/SelectionStateContext'
import { WallsLayer, RoomsLayer, FurnitureLayer } from '@/components/DxfCanvas'
import { buildTransform } from '@/utils/dxfGeometry'

function SimpleEditor({ doc, walls }) {
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  
  const t = buildTransform(
    doc.meta.extmin,
    doc.meta.extmax,
    800,
    600
  )
  
  return (
    <EditorStateProvider initialDoc={doc} initialWalls={walls}>
      <ToolStateProvider>
        <SelectionStateProvider>
          <Stage
            width={800}
            height={600}
            scaleX={zoom}
            scaleY={zoom}
            x={pos.x}
            y={pos.y}
          >
            {/* Background */}
            <Layer>
              <Rect width={800} height={600} fill="#fff" />
            </Layer>
            
            {/* Rooms */}
            <RoomsLayer
              roomsWithWalls={detectRoomsWithWalls(walls)}
              t={t}
              zoom={zoom}
              hoveredRoomIdx={null}
              setHoveredRoomIdx={() => {}}
              ROOM_COLORS={['rgba(59,130,246,0.15)']}
              ROOM_STROKES={['rgba(59,130,246,0.55)']}
            />
            
            {/* Walls */}
            <WallsLayer
              t={t}
              zoom={zoom}
              strokeHex="#474747"
              strokeScale={1}
              hoveredGroupId={null}
              setHoveredGroupId={() => {}}
              onEpDragMove={() => {}}
              onEpDragEnd={() => {}}
              setIsDraggingEp={() => {}}
              draggingEpInfo={{ current: null }}
              getGroupWallIds={(id, walls) => [id]}
            />
            
            {/* Furniture */}
            <FurnitureLayer
              t={t}
              zoom={zoom}
              strokeScale={1}
              showFurnitureLabels={true}
            />
          </Stage>
        </SelectionStateProvider>
      </ToolStateProvider>
    </EditorStateProvider>
  )
}
```

## Customization Examples

### Adding a New Layer

```tsx
// DoorsLayer.tsx
import { Layer, Line, Group } from 'react-konva'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useSelectionState } from '@/contexts/SelectionStateContext'

export function DoorsLayer({ t, zoom }) {
  const { planDoc } = useEditorState()
  const { selectedIds, setSelectedIds } = useSelectionState()
  
  return (
    <Layer>
      {planDoc.arcs.filter(isDoorArc).map(arc => (
        <Group key={arc.handle}>
          {/* Render door arc */}
        </Group>
      ))}
    </Layer>
  )
}
```

### Modifying Event Handlers

```tsx
// Custom click handler
<Line
  points={points}
  onClick={e => {
    e.cancelBubble = true
    // Your custom logic
    console.log('Wall clicked:', wall.id)
    selectWalls([wall.id])
  }}
/>
```

### Adding New Features

```tsx
// Add tooltip on hover
const [tooltip, setTooltip] = useState<string | null>(null)

<Line
  points={points}
  onMouseEnter={() => setTooltip(`Wall ${wall.id}`)}
  onMouseLeave={() => setTooltip(null)}
/>

{tooltip && <Text text={tooltip} />}
```

## Testing

### Unit Test Example

```typescript
import { render } from '@testing-library/react'
import { WallsLayer } from './WallsLayer'
import { EditorStateProvider } from '@/contexts/EditorStateContext'

describe('WallsLayer', () => {
  it('renders walls correctly', () => {
    const walls = [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 1, y: 0 } }
    ]
    
    const { container } = render(
      <EditorStateProvider initialDoc={doc} initialWalls={walls}>
        <Stage>
          <WallsLayer {...props} />
        </Stage>
      </EditorStateProvider>
    )
    
    expect(container.querySelector('line')).toBeInTheDocument()
  })
})
```

## Performance Tips

### 1. Use React.memo for Layers
```tsx
export const WallsLayer = React.memo(WallsLayerComponent)
```

### 2. Optimize Event Handlers
```tsx
const handleClick = useCallback((e) => {
  // Handler logic
}, [dependencies])
```

### 3. Virtualize Large Datasets
```tsx
// Only render visible walls
const visibleWalls = walls.filter(w => isInViewport(w, viewport))
```

## Troubleshooting

### Issue: Props are too complex
**Solution:** Use contexts instead of props
```tsx
// Before
<WallsLayer walls={walls} selectedIds={selectedIds} ... />

// After
<WallsLayer t={t} zoom={zoom} />  // Minimal props
// Component uses contexts internally
```

### Issue: Too many re-renders
**Solution:** Use React.memo and useMemo
```tsx
const WallsLayer = React.memo(({ t, zoom }) => {
  const walls = useMemo(() => computeWalls(), [dependencies])
  return <Layer>...</Layer>
})
```

### Issue: Event handlers not working
**Solution:** Check event bubbling
```tsx
<Line
  onClick={e => {
    e.cancelBubble = true  // Stop propagation
    // Your logic
  }}
/>
```

## Next Steps

1. **Read the guides:**
   - [QUICK_START.md](../../QUICK_START.md) - Fast integration
   - [MIGRATION_GUIDE.md](../../MIGRATION_GUIDE.md) - Complete guide
   - [ARCHITECTURE.md](../../ARCHITECTURE.md) - System design

2. **Copy the architecture:**
   - Phase 1: Utils
   - Phase 2: Contexts
   - Phase 3: Hooks
   - Phase 4: Layer components (these)

3. **Build your editor:**
   - Use these as templates
   - Customize as needed
   - Add new features

## Conclusion

These layer components are **examples** that demonstrate:
- ✅ How to use contexts
- ✅ How to use hooks
- ✅ How to structure layers
- ✅ How to handle events

They are **ready to use** in a new project or as **templates** for building your own layers.

**Happy coding!** 🚀
