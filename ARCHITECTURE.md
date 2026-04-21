# 🏗️ DXF Editor Architecture

## Visual Guide to Understanding the Codebase

---

## 📊 Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│                     (What user sees/clicks)                     │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT COMPONENT LAYER                        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  DxfJsonViewPage.tsx (Main Component)                     │ │
│  │  - Renders canvas, toolbar, panels                        │ │
│  │  - Handles user interactions                              │ │
│  │  - Coordinates between layers                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  FurnitureLibraryPanel.tsx                                │ │
│  │  - Furniture drag-drop UI                                 │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                       │
│                      (Phase 2 - Contexts)                       │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ EditorState      │  │ ToolState        │  │ Selection    │ │
│  │ Context          │  │ Context          │  │ Context      │ │
│  │                  │  │                  │  │              │ │
│  │ • planDoc        │  │ • activeTool     │  │ • selectedIds│ │
│  │ • walls          │  │ • snapEnabled    │  │ • selected   │ │
│  │ • history        │  │ • orthoEnabled   │  │   Room       │ │
│  │ • snapshot()     │  │ • showLabels     │  │ • select()   │ │
│  │ • undo()         │  │ • units          │  │ • deselect() │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                       │
│                      (Phase 1 - Utilities)                      │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ dxfGeometry  │  │ dxfRoom      │  │ dxfDocument        │   │
│  │              │  │ Detection    │  │ Utils              │   │
│  │ • toC()      │  │              │  │                    │   │
│  │ • toW()      │  │ • detectRooms│  │ • appendUserLine() │   │
│  │ • rotate()   │  │ • wallIds    │  │ • removeArc()      │   │
│  │ • polyArea() │  │   OnBoundary │  │ • cloneDoc()       │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ dxfSelection │  │ dxfSnapping  │  │ wallsFromDxfJson   │   │
│  │              │  │              │  │                    │   │
│  │ • getGroup   │  │ • calculate  │  │ • convert DXF to   │   │
│  │   WallIds()  │  │   Snap()     │  │   wall segments    │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
│                    (Constants & Templates)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  dxfJsonData.ts                                          │  │
│  │  • Type definitions (DxfJsonDocument, DxfLine, etc.)     │  │
│  │  • Sample DXF data (DXF_JSON_DATA)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  furnitureLibraryDxf.ts                                  │  │
│  │  • Furniture templates (bed, sofa, table, etc.)          │  │
│  │  • buildFurnitureLinesFromLibraryId()                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DEPENDENCIES                        │
│                                                                 │
│  • react-konva (Canvas rendering)                              │
│  • konva (2D graphics)                                         │
│  • polygon-clipping (Room validation)                          │
│  • react-router-dom (Navigation)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### User Draws a Line:

```
1. User clicks "Line" tool
   ↓
2. ToolStateContext.setActiveTool('drawLine')
   ↓
3. User clicks canvas (start point)
   ↓
4. DxfJsonViewPage handles click
   ↓
5. toW() converts canvas → world coordinates
   ↓
6. User clicks canvas (end point)
   ↓
7. EditorStateContext.snapshot() (save for undo)
   ↓
8. appendUserLine() creates new LINE entity
   ↓
9. EditorStateContext.setPlanDoc(newDoc)
   ↓
10. wallsFromDxfJson() converts to wall segments
    ↓
11. EditorStateContext.setWalls(newWalls)
    ↓
12. React re-renders
    ↓
13. toC() converts world → canvas coordinates
    ↓
14. Konva draws line on canvas
    ↓
15. User sees new line ✅
```

---

## 🎯 Component Interaction

```
┌─────────────────────────────────────────────────────────────┐
│                    DxfJsonViewPage                          │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  Toolbar   │  │   Canvas   │  │  Properties Panel  │   │
│  │            │  │            │  │                    │   │
│  │ • Select   │  │ • Stage    │  │ • Add walls        │   │
│  │ • Hand     │  │ • Layers   │  │ • Style            │   │
│  │ • Line     │  │ • Walls    │  │ • Editing          │   │
│  │ • Polyline │  │ • Rooms    │  │ • Grouping         │   │
│  │ • Arc      │  │ • Furniture│  │ • Export           │   │
│  │ • Circle   │  │ • Labels   │  │ • Layers           │   │
│  │ • Text     │  │            │  │ • Rooms            │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
│         │              │                    │              │
│         └──────────────┼────────────────────┘              │
│                        │                                   │
│                        ▼                                   │
│              ┌──────────────────┐                          │
│              │  Context Hooks   │                          │
│              │                  │                          │
│              │ • useEditorState │                          │
│              │ • useToolState   │                          │
│              │ • useSelection   │                          │
│              └──────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 File Dependencies (Simplified)

```
DxfJsonViewPage.tsx
    │
    ├─→ Contexts (Phase 2)
    │   ├─→ EditorStateContext
    │   ├─→ ToolStateContext
    │   └─→ SelectionStateContext
    │
    ├─→ Utilities (Phase 1)
    │   ├─→ dxfGeometry
    │   ├─→ dxfRoomDetection
    │   ├─→ dxfSelection
    │   ├─→ dxfDocumentUtils
    │   ├─→ dxfSnapping
    │   ├─→ wallsFromDxfJson
    │   ├─→ konvaDropToWorld
    │   └─→ exportToDxf
    │
    ├─→ Components
    │   └─→ FurnitureLibraryPanel
    │
    ├─→ Data
    │   ├─→ dxfJsonData
    │   └─→ furnitureLibraryDxf
    │
    └─→ External Libraries
        ├─→ react-konva
        ├─→ konva
        └─→ polygon-clipping
```

---

## 🔑 Key Concepts

### 1. Coordinate Systems

```
World Coordinates (meters)          Canvas Coordinates (pixels)
        ↕                                    ↕
    (5.0, 3.0)                           (400, 300)
        ↕                                    ↕
   Real-world                          Screen position
   measurements                        on canvas
        ↕                                    ↕
    toW() ←──────────────────────────────→ toC()
          Transform (buildTransform)
```

### 2. Entity Types

```
DXF Document
    │
    ├─→ LINE (straight walls)
    │   └─→ Wall segments for rendering
    │
    ├─→ ARC (doors, circles)
    │   └─→ Chord segments for rendering
    │
    ├─→ LWPOLYLINE (room boundaries)
    │   └─→ Multiple wall segments
    │
    └─→ MTEXT (room labels)
        └─→ Text entities for rendering
```

### 3. State Management

```
User Action
    ↓
Event Handler
    ↓
Context Action (snapshot, setPlanDoc, etc.)
    ↓
Context State Updates
    ↓
React Re-renders
    ↓
UI Updates
```

---

## 🎨 Rendering Pipeline

```
1. DXF Document (data)
   ↓
2. wallsFromDxfJson() → Wall segments
   ↓
3. detectRooms() → Room polygons
   ↓
4. toC() → Canvas coordinates
   ↓
5. Konva renders:
   - Background grid
   - Room fills
   - Walls (lines)
   - Doors/windows (arcs + lines)
   - Furniture (lines)
   - Labels (text)
   - Selection handles
   ↓
6. User sees floor plan
```

---

## 🧩 How Pieces Fit Together

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION PERSPECTIVE                    │
└─────────────────────────────────────────────────────────────┘

Layer 1: Data (Copy First)
    ├─→ dxfJsonData.ts
    └─→ furnitureLibraryDxf.ts

Layer 2: Utilities (Copy Second)
    ├─→ dxfGeometry.ts
    ├─→ wallsFromDxfJson.ts
    ├─→ dxfRoomDetection.ts
    ├─→ dxfSelection.ts
    ├─→ dxfDocumentUtils.ts
    ├─→ dxfSnapping.ts
    ├─→ konvaDropToWorld.ts
    └─→ exportToDxf.ts

Layer 3: Contexts (Copy Third - Optional)
    ├─→ EditorStateContext.tsx
    ├─→ ToolStateContext.tsx
    └─→ SelectionStateContext.tsx

Layer 4: Components (Copy Last)
    ├─→ FurnitureLibraryPanel.tsx
    └─→ DxfJsonViewPage.tsx

✅ Each layer depends only on previous layers
✅ Copy in order = no errors
```

---

## 📚 Documentation Map

```
Start Here:
    └─→ QUICK_START.md (30 min integration)

Understand Structure:
    ├─→ DEPENDENCY_MAP.md (file relationships)
    └─→ REFACTORING_SUMMARY.md (overview)

Deep Dive:
    ├─→ utils/README.md (utility functions)
    ├─→ contexts/README.md (state management)
    └─→ MIGRATION_GUIDE.md (complete guide)

Reference:
    ├─→ PHASE_2_COMPLETE.md (Phase 2 details)
    └─→ REFACTORING_GUIDE.md (original plan)
```

---

## 🎯 Mental Model

Think of the editor as a **layered cake**:

```
┌─────────────────────────────────┐
│  UI Layer (React Components)    │  ← What user sees
├─────────────────────────────────┤
│  State Layer (Contexts)          │  ← What's happening
├─────────────────────────────────┤
│  Logic Layer (Utilities)         │  ← How it works
├─────────────────────────────────┤
│  Data Layer (Constants)          │  ← What it knows
└─────────────────────────────────┘
```

Each layer:
- Has clear responsibility
- Only depends on layers below
- Can be tested independently
- Can be copied separately

---

## ✅ Success Checklist

You understand the architecture when you can answer:

- [ ] What does each layer do?
- [ ] How does data flow from user click to screen update?
- [ ] Which files depend on which other files?
- [ ] What order should I copy files when migrating?
- [ ] Where is state managed?
- [ ] Where is business logic?
- [ ] Where is data stored?

If you can answer all these → You're ready to migrate! 🚀

---

## 🎉 Summary

**The editor is organized into 4 clear layers:**

1. **Data** - Constants and templates
2. **Logic** - Pure utility functions
3. **State** - Context providers
4. **UI** - React components

**Each layer is:**
- Well documented
- Easy to understand
- Easy to copy
- Easy to test

**You can now confidently migrate this to your new project!**

---

For detailed migration steps, see `QUICK_START.md` or `MIGRATION_GUIDE.md`.

Good luck! 🚀
