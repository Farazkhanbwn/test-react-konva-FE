# 🎯 Editor Contexts

## Purpose

This directory contains **React Context providers** that manage the editor's state. Contexts make state management cleaner and allow multiple components to share state without prop drilling.

---

## 📁 Files

```
contexts/
├── EditorStateContext.tsx      # Document, walls, undo/redo
├── ToolStateContext.tsx         # Active tool, snap, ortho, display settings
├── SelectionStateContext.tsx    # What's currently selected
├── index.ts                     # Central export point
└── README.md                    # This file
```

---

## 🎯 Context Overview

### 1. **EditorStateContext** - Core Data

**What it manages:**
- `planDoc` - DXF document (lines, arcs, polylines, texts)
- `walls` - Wall segments for rendering
- `history` - Undo stack (last 20 snapshots)

**Actions:**
- `setPlanDoc()` - Update document
- `setWalls()` - Update walls
- `snapshot()` - Save current state for undo
- `undo()` - Restore previous state

**When to use:**
- Adding/removing entities
- Modifying document
- Implementing undo/redo

**Example:**
```tsx
function DrawLineTool() {
  const { planDoc, setPlanDoc, snapshot } = useEditorState()
  
  const addLine = (start, end) => {
    snapshot() // Save for undo
    const { next } = appendUserLine(planDoc, start, end)
    setPlanDoc(next)
  }
  
  return <button onClick={() => addLine({x:0,y:0}, {x:5,y:0})}>Draw</button>
}
```

---

### 2. **ToolStateContext** - UI Settings

**What it manages:**
- `activeTool` - Current tool (select, drawLine, etc.)
- `snapEnabled` - Snap to endpoints/midpoints
- `orthoEnabled` - Orthogonal mode
- `showDetail` - Show detail lines
- `showLabels` - Show room labels
- `showFurnitureLabels` - Show furniture labels
- `units` - Measurement units (m, cm, mm)
- `strokeHex` - Wall color
- `strokeScale` - Wall thickness

**When to use:**
- Toolbar buttons
- Settings panel
- Display toggles

**Example:**
```tsx
function Toolbar() {
  const { activeTool, setActiveTool } = useToolState()
  
  return (
    <div>
      <button 
        className={activeTool === 'select' ? 'active' : ''}
        onClick={() => setActiveTool('select')}
      >
        Select
      </button>
      <button 
        className={activeTool === 'drawLine' ? 'active' : ''}
        onClick={() => setActiveTool('drawLine')}
      >
        Line
      </button>
    </div>
  )
}
```

---

### 3. **SelectionStateContext** - What's Selected

**What it manages:**
- `selectedIds` - Set of selected wall/text/arc IDs
- `selectedRoomIndex` - Selected room
- `selectedTextHandle` - Selected text label
- `selectedArcHandle` - Selected arc
- `selectedWinKey` - Selected window group
- `selectedFurnKey` - Selected furniture group

**Actions:**
- `selectOne(id)` - Add to selection
- `deselectOne(id)` - Remove from selection
- `toggleSelection(id)` - Toggle selection
- `clearSelection()` - Clear all
- `selectMultiple(ids)` - Select multiple at once

**When to use:**
- Click handlers
- Multi-select logic
- Highlighting selected items

**Example:**
```tsx
function Wall({ id }) {
  const { selectedIds, toggleSelection } = useSelection()
  const isSelected = selectedIds.has(id)
  
  return (
    <Line
      stroke={isSelected ? '#f59e0b' : '#474747'}
      onClick={() => toggleSelection(id)}
    />
  )
}
```

---

## 🚀 How to Use

### Step 1: Wrap Your App

```tsx
// App.tsx or main component
import { 
  EditorStateProvider, 
  ToolStateProvider, 
  SelectionStateProvider 
} from './contexts'
import { DXF_JSON_DATA } from './constants/dxfJsonData'
import { wallsFromDxfJson } from './utils/wallsFromDxfJson'

function App() {
  const initialWalls = wallsFromDxfJson(DXF_JSON_DATA)
  
  return (
    <EditorStateProvider 
      initialDoc={DXF_JSON_DATA} 
      initialWalls={initialWalls}
    >
      <ToolStateProvider>
        <SelectionStateProvider>
          <DxfJsonViewPage />
        </SelectionStateProvider>
      </ToolStateProvider>
    </EditorStateProvider>
  )
}
```

---

### Step 2: Use Hooks in Components

```tsx
// In any child component
import { useEditorState, useToolState, useSelection } from './contexts'

function MyComponent() {
  // Access editor state
  const { planDoc, walls, snapshot, undo } = useEditorState()
  
  // Access tool state
  const { activeTool, setActiveTool, snapEnabled } = useToolState()
  
  // Access selection state
  const { selectedIds, toggleSelection, clearSelection } = useSelection()
  
  return (
    <div>
      <button onClick={undo}>Undo</button>
      <button onClick={() => setActiveTool('drawLine')}>Line Tool</button>
      <button onClick={clearSelection}>Clear Selection</button>
    </div>
  )
}
```

---

## 📊 State Flow Diagram

```
User Action (click, drag, key press)
        ↓
Component Event Handler
        ↓
Context Action (snapshot, setPlanDoc, toggleSelection)
        ↓
Context State Updates
        ↓
React Re-renders Components
        ↓
UI Updates
```

---

## ✅ Benefits of Using Contexts

### Before (without contexts):
```tsx
function DxfJsonViewPage() {
  const [planDoc, setPlanDoc] = useState(...)
  const [walls, setWalls] = useState(...)
  const [history, setHistory] = useState(...)
  const [activeTool, setActiveTool] = useState(...)
  const [snapEnabled, setSnapEnabled] = useState(...)
  const [selectedIds, setSelectedIds] = useState(...)
  // ... 20+ more useState calls
  
  // Pass everything as props
  return (
    <Toolbar 
      activeTool={activeTool} 
      setActiveTool={setActiveTool}
      snapEnabled={snapEnabled}
      setSnapEnabled={setSnapEnabled}
      // ... 20+ more props
    />
  )
}
```

### After (with contexts):
```tsx
function DxfJsonViewPage() {
  // Clean! No state management here
  return <Toolbar />
}

function Toolbar() {
  // Get only what you need
  const { activeTool, setActiveTool } = useToolState()
  return <button onClick={() => setActiveTool('select')}>Select</button>
}
```

**Benefits:**
- ✅ No prop drilling
- ✅ Cleaner component code
- ✅ Easier to add new features
- ✅ State can be shared across any component
- ✅ Easier to test

---

## 🔧 Advanced Usage

### Combining Multiple Contexts

```tsx
function DeleteButton() {
  const { planDoc, setPlanDoc, snapshot } = useEditorState()
  const { selectedIds, clearSelection } = useSelection()
  
  const handleDelete = () => {
    if (selectedIds.size === 0) return
    
    snapshot() // Save for undo
    
    // Remove selected entities
    let next = planDoc
    for (const id of selectedIds) {
      if (id.startsWith('ln-')) {
        next = removeLineFromDocByWallId(next, id)
      }
    }
    
    setPlanDoc(next)
    clearSelection()
  }
  
  return (
    <button 
      onClick={handleDelete}
      disabled={selectedIds.size === 0}
    >
      Delete ({selectedIds.size})
    </button>
  )
}
```

---

### Persisting State to localStorage

```tsx
// In ToolStateContext.tsx
export function ToolStateProvider({ children }: ToolStateProviderProps) {
  // Load from localStorage
  const [snapEnabled, setSnapEnabled] = useState(() => {
    const saved = localStorage.getItem('snapEnabled')
    return saved ? JSON.parse(saved) : true
  })
  
  // Save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('snapEnabled', JSON.stringify(snapEnabled))
  }, [snapEnabled])
  
  // ... rest of provider
}
```

---

## 🧪 Testing Contexts

```tsx
// Test helper
function renderWithContexts(component) {
  const initialWalls = wallsFromDxfJson(DXF_JSON_DATA)
  
  return render(
    <EditorStateProvider initialDoc={DXF_JSON_DATA} initialWalls={initialWalls}>
      <ToolStateProvider>
        <SelectionStateProvider>
          {component}
        </SelectionStateProvider>
      </ToolStateProvider>
    </EditorStateProvider>
  )
}

// Test
test('can select a wall', () => {
  const { getByText } = renderWithContexts(<MyComponent />)
  // ... test logic
})
```

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Using hook outside provider
```tsx
function MyComponent() {
  const { planDoc } = useEditorState() // ❌ Error if no provider
}
```

**Fix:** Wrap with provider
```tsx
<EditorStateProvider>
  <MyComponent />
</EditorStateProvider>
```

---

### ❌ Mistake 2: Creating new Set on every render
```tsx
const { selectedIds } = useSelection()
const newSet = new Set(selectedIds) // ❌ Creates new Set every render
```

**Fix:** Use useMemo
```tsx
const { selectedIds } = useSelection()
const sortedIds = useMemo(() => [...selectedIds].sort(), [selectedIds])
```

---

### ❌ Mistake 3: Mutating state directly
```tsx
const { selectedIds } = useSelection()
selectedIds.add('new-id') // ❌ Mutates state directly
```

**Fix:** Use provided actions
```tsx
const { selectOne } = useSelection()
selectOne('new-id') // ✅ Correct
```

---

## 📚 Next Steps

After implementing contexts:

1. **Phase 3**: Extract custom hooks (useWallDragging, useRoomDetection)
2. **Phase 4**: Split component into smaller pieces (Toolbar, Canvas, PropertiesPanel)
3. **Add features**: Redo, auto-save, keyboard shortcuts

---

## 🆘 Troubleshooting

### Error: "useEditorState must be used within EditorStateProvider"

**Cause:** Component using hook is not wrapped in provider

**Fix:** Check your component tree, ensure provider is ancestor

---

### Performance: Too many re-renders

**Cause:** Context value changes too often

**Fix:** Split into smaller contexts, use useMemo for context value

```tsx
const value = useMemo(() => ({
  planDoc,
  walls,
  setPlanDoc,
  setWalls,
}), [planDoc, walls])
```

---

## 📖 Further Reading

- [React Context API](https://react.dev/reference/react/useContext)
- [Context Best Practices](https://kentcdodds.com/blog/how-to-use-react-context-effectively)
- [State Management Patterns](https://react.dev/learn/managing-state)
