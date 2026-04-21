# 📊 DXF Editor Dependency Map

## Visual Guide: What Depends on What

This document shows you **exactly** which files depend on which other files, so you know the correct order to copy them.

---

## 🎯 The Golden Rule

**Always copy dependencies BEFORE the files that use them.**

If File A imports File B, copy File B first!

---

## 📦 Layer 1: Data (No Dependencies)

These files have **ZERO dependencies** on other project files. Copy these first!

```
┌─────────────────────────────────────┐
│  constants/dxfJsonData.ts           │  ← START HERE
│  - Type definitions                 │
│  - Sample DXF data                  │
│  - No imports from project          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  data/furnitureLibraryDxf.ts        │  ← START HERE
│  - Furniture templates              │
│  - No imports from project          │
└─────────────────────────────────────┘
```

**Test after copying:**
```typescript
import { DXF_JSON_DATA } from './constants/dxfJsonData'
console.log(DXF_JSON_DATA.stats.line_count) // Should work
```

---

## 📦 Layer 2: Core Utilities (Minimal Dependencies)

### 2.1 `dxfGeometry.ts` (Only imports from Layer 1)

```
┌─────────────────────────────────────┐
│  utils/dxfGeometry.ts               │
│  ↓ imports                          │
│  constants/dxfJsonData.ts (types)   │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfJsonData.ts` (for `DxfArc` type)

**Test after copying:**
```typescript
import { toC, buildTransform } from './utils/dxfGeometry'
const t = buildTransform([0, 0], [10, 8], 800, 600)
console.log(t.sc) // Should print scale factor
```

---

### 2.2 `wallsFromDxfJson.ts` (Imports from Layer 1 + 2.1)

```
┌─────────────────────────────────────┐
│  utils/wallsFromDxfJson.ts          │
│  ↓ imports                          │
│  constants/dxfJsonData.ts (types)   │
│  utils/dxfGeometry.ts (polyArea)    │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfJsonData.ts` (for types)
- ✅ `dxfGeometry.ts` (for `polyArea` function)

**Test after copying:**
```typescript
import { wallsFromDxfJson } from './utils/wallsFromDxfJson'
import { DXF_JSON_DATA } from './constants/dxfJsonData'
const walls = wallsFromDxfJson(DXF_JSON_DATA)
console.log(walls.length) // Should print number
```

---

## 📦 Layer 3: Advanced Utilities (Depend on Layer 2)

### 3.1 `dxfRoomDetection.ts`

```
┌─────────────────────────────────────┐
│  utils/dxfRoomDetection.ts          │
│  ↓ imports                          │
│  utils/dxfGeometry.ts               │
│  utils/wallsFromDxfJson.ts          │
│  polygon-clipping (npm package)     │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfGeometry.ts` (for `Pt`, `polyArea`, `nearSamePt`)
- ✅ `wallsFromDxfJson.ts` (for `WallSeg` type)
- ✅ `polygon-clipping` npm package

---

### 3.2 `dxfSelection.ts`

```
┌─────────────────────────────────────┐
│  utils/dxfSelection.ts              │
│  ↓ imports                          │
│  utils/wallsFromDxfJson.ts          │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `wallsFromDxfJson.ts` (for `WallSeg` type)

---

### 3.3 `dxfDocumentUtils.ts`

```
┌─────────────────────────────────────┐
│  utils/dxfDocumentUtils.ts          │
│  ↓ imports                          │
│  constants/dxfJsonData.ts (types)   │
│  utils/dxfGeometry.ts (Pt type)     │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfJsonData.ts` (for all DXF types)
- ✅ `dxfGeometry.ts` (for `Pt` type)

---

### 3.4 `dxfSnapping.ts`

```
┌─────────────────────────────────────┐
│  utils/dxfSnapping.ts               │
│  ↓ imports                          │
│  utils/dxfGeometry.ts               │
│  utils/wallsFromDxfJson.ts          │
│  constants/dxfJsonData.ts (types)   │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfGeometry.ts` (for `Pt`, `closestPointOnSegment`)
- ✅ `wallsFromDxfJson.ts` (for `WallSeg` type)
- ✅ `dxfJsonData.ts` (for `DxfArc` type)

---

### 3.5 `konvaDropToWorld.ts`

```
┌─────────────────────────────────────┐
│  utils/konvaDropToWorld.ts          │
│  ↓ imports                          │
│  utils/dxfGeometry.ts               │
│  konva (npm package)                │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `dxfGeometry.ts` (for `Transform`, `toW`)
- ✅ `konva` npm package

---

### 3.6 `exportToDxf.ts`

```
┌─────────────────────────────────────┐
│  utils/exportToDxf.ts               │
│  ↓ imports                          │
│  utils/wallsFromDxfJson.ts          │
│  constants/dxfJsonData.ts (types)   │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `wallsFromDxfJson.ts` (for `WallSeg` type)
- ✅ `dxfJsonData.ts` (for all DXF types)

---

## 📦 Layer 4: Components (Depend on Everything)

### 4.1 `FurnitureLibraryPanel.tsx`

```
┌─────────────────────────────────────┐
│  components/                        │
│  FurnitureLibraryPanel.tsx          │
│  ↓ imports                          │
│  data/furnitureLibraryDxf.ts        │
│  react (npm package)                │
└─────────────────────────────────────┘
```

**Dependencies:**
- ✅ `furnitureLibraryDxf.ts`
- ✅ React

---

### 4.2 `DxfJsonViewPage.tsx` (Main Component)

```
┌─────────────────────────────────────────────────────────┐
│  DxfJsonViewPage.tsx                                    │
│  ↓ imports EVERYTHING                                   │
│  ├─ constants/dxfJsonData.ts                            │
│  ├─ utils/dxfGeometry.ts                                │
│  ├─ utils/wallsFromDxfJson.ts                           │
│  ├─ utils/dxfRoomDetection.ts                           │
│  ├─ utils/dxfSelection.ts                               │
│  ├─ utils/dxfDocumentUtils.ts                           │
│  ├─ utils/dxfSnapping.ts                                │
│  ├─ utils/konvaDropToWorld.ts                           │
│  ├─ utils/exportToDxf.ts                                │
│  ├─ components/FurnitureLibraryPanel.tsx                │
│  ├─ data/furnitureLibraryDxf.ts                         │
│  ├─ react, react-konva, konva (npm packages)            │
│  └─ polygon-clipping (npm package)                      │
└─────────────────────────────────────────────────────────┘
```

**Dependencies:**
- ✅ ALL files from Layer 1, 2, 3, 4.1
- ✅ ALL npm packages

**Copy this LAST!**

---

## 🔢 Copy Order (Step by Step)

### Phase 1: Data Layer (No dependencies)
```
1. ✅ constants/dxfJsonData.ts
2. ✅ data/furnitureLibraryDxf.ts
```

### Phase 2: Core Utilities
```
3. ✅ utils/dxfGeometry.ts
4. ✅ utils/wallsFromDxfJson.ts
```

### Phase 3: Advanced Utilities (any order within this phase)
```
5. ✅ utils/dxfRoomDetection.ts
6. ✅ utils/dxfSelection.ts
7. ✅ utils/dxfDocumentUtils.ts
8. ✅ utils/dxfSnapping.ts
9. ✅ utils/konvaDropToWorld.ts
10. ✅ utils/exportToDxf.ts
```

### Phase 4: Components
```
11. ✅ components/FurnitureLibraryPanel.tsx
12. ✅ DxfJsonViewPage.tsx (LAST!)
```

---

## 🧪 Test After Each Phase

### After Phase 1:
```typescript
import { DXF_JSON_DATA } from './constants/dxfJsonData'
console.log('✅ Data layer works:', DXF_JSON_DATA.stats.line_count)
```

### After Phase 2:
```typescript
import { wallsFromDxfJson } from './utils/wallsFromDxfJson'
import { DXF_JSON_DATA } from './constants/dxfJsonData'
const walls = wallsFromDxfJson(DXF_JSON_DATA)
console.log('✅ Core utilities work:', walls.length)
```

### After Phase 3:
```typescript
import { detectRooms } from './utils/dxfRoomDetection'
const rooms = detectRooms(walls)
console.log('✅ Advanced utilities work:', rooms.length)
```

### After Phase 4:
```typescript
// Start dev server and navigate to the page
// Should render without errors
console.log('✅ Component works!')
```

---

## 📊 Dependency Graph (Visual)

```
                    DxfJsonViewPage.tsx (MAIN COMPONENT)
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
FurnitureLibraryPanel    dxfGeometry.ts      dxfJsonData.ts
        │                     │                     │
        │                     ├─────────────────────┤
        │                     │                     │
        ▼                     ▼                     ▼
furnitureLibraryDxf   wallsFromDxfJson.ts   (types only)
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
        dxfRoomDetection  dxfSelection  dxfDocumentUtils
                │             │             │
                └─────────────┴─────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
          dxfSnapping  konvaDropToWorld  exportToDxf
```

**Read from bottom to top:**
- Bottom = No dependencies (copy first)
- Top = Many dependencies (copy last)

---

## ⚠️ Common Mistakes

### ❌ Mistake 1: Copying in wrong order
```
Copy DxfJsonViewPage.tsx first
→ Error: Cannot find module 'dxfGeometry'
```

**Fix:** Copy dependencies first (follow the order above)

---

### ❌ Mistake 2: Forgetting npm packages
```
Copy all files
→ Error: Cannot find module 'react-konva'
```

**Fix:** Install npm packages first
```bash
npm install react-konva konva polygon-clipping
```

---

### ❌ Mistake 3: Wrong import paths
```
import { toC } from '@/utils/dxfGeometry'
→ Error: Cannot resolve '@/utils/dxfGeometry'
```

**Fix:** Update import paths for your new project structure

---

## 🎯 Quick Reference: What Imports What

| File | Imports From |
|------|--------------|
| `dxfJsonData.ts` | Nothing ✅ |
| `furnitureLibraryDxf.ts` | Nothing ✅ |
| `dxfGeometry.ts` | `dxfJsonData.ts` |
| `wallsFromDxfJson.ts` | `dxfJsonData.ts`, `dxfGeometry.ts` |
| `dxfRoomDetection.ts` | `dxfGeometry.ts`, `wallsFromDxfJson.ts` |
| `dxfSelection.ts` | `wallsFromDxfJson.ts` |
| `dxfDocumentUtils.ts` | `dxfJsonData.ts`, `dxfGeometry.ts` |
| `dxfSnapping.ts` | `dxfGeometry.ts`, `wallsFromDxfJson.ts`, `dxfJsonData.ts` |
| `konvaDropToWorld.ts` | `dxfGeometry.ts` |
| `exportToDxf.ts` | `wallsFromDxfJson.ts`, `dxfJsonData.ts` |
| `FurnitureLibraryPanel.tsx` | `furnitureLibraryDxf.ts` |
| `DxfJsonViewPage.tsx` | **ALL OF THE ABOVE** |

---

## ✅ Checklist for Migration

Use this when copying files:

```
Phase 1: Data Layer
[ ] Copy constants/dxfJsonData.ts
[ ] Copy data/furnitureLibraryDxf.ts
[ ] Test: Can import DXF_JSON_DATA

Phase 2: Core Utilities
[ ] Copy utils/dxfGeometry.ts
[ ] Copy utils/wallsFromDxfJson.ts
[ ] Test: Can convert DXF to walls

Phase 3: Advanced Utilities
[ ] Copy utils/dxfRoomDetection.ts
[ ] Copy utils/dxfSelection.ts
[ ] Copy utils/dxfDocumentUtils.ts
[ ] Copy utils/dxfSnapping.ts
[ ] Copy utils/konvaDropToWorld.ts
[ ] Copy utils/exportToDxf.ts
[ ] Test: Can detect rooms

Phase 4: Components
[ ] Copy components/FurnitureLibraryPanel.tsx
[ ] Copy DxfJsonViewPage.tsx
[ ] Fix all import paths
[ ] Test: Page loads without errors

Phase 5: Final Testing
[ ] Can draw lines
[ ] Can select walls
[ ] Can detect rooms
[ ] Can export DXF
```

---

## 💡 Pro Tip: Use This Command

To see what a file imports:
```bash
# In old project
grep -n "^import" src/DxfJsonViewPage.tsx

# Shows all imports with line numbers
```

---

**Remember:** Copy from bottom to top of the dependency tree! 🌳

Good luck with your migration! 🚀
