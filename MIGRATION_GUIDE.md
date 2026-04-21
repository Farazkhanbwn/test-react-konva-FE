# 🚀 DXF Editor Migration Guide

## Goal
Move the DXF floor plan editor from this project to another project **WITHOUT BREAKING ANYTHING**.

---

## 📦 What You Need to Move

### **Core Files (Must Move)**
```
src/
├── DxfJsonViewPage.tsx          # Main editor component (2800 lines)
├── constants/
│   └── dxfJsonData.ts            # DXF data structure + sample data
├── utils/
│   ├── dxfGeometry.ts            # Math & coordinate transformations
│   ├── dxfRoomDetection.ts       # Room detection algorithm
│   ├── dxfSelection.ts           # Selection logic
│   ├── dxfDocumentUtils.ts       # CRUD operations
│   ├── dxfSnapping.ts            # Snap calculations
│   ├── wallsFromDxfJson.ts       # Convert DXF → wall segments
│   ├── konvaDropToWorld.ts       # Drag-drop coordinate conversion
│   └── exportToDxf.ts            # Export to DXF file
├── components/
│   └── FurnitureLibraryPanel.tsx # Furniture drag-drop panel
├── data/
│   └── furnitureLibraryDxf.ts    # Furniture templates
└── DxfJsonViewPage.css           # Styles (if exists)
```

### **Dependencies (Must Install)**
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-konva": "^18.x",
    "konva": "^9.x",
    "polygon-clipping": "^0.15.x",
    "react-router-dom": "^6.x"  // Only if you use routing
  }
}
```

---

## 🔢 Migration Steps (In Order)

### **Step 1: Copy Dependencies First**
```bash
# In your new project
npm install react-konva konva polygon-clipping
```

### **Step 2: Copy Data Layer (No Dependencies)**
Copy these files first because they have NO dependencies on other files:

```
✅ constants/dxfJsonData.ts
✅ data/furnitureLibraryDxf.ts
```

**Test:** Can you import them?
```typescript
import { DXF_JSON_DATA } from './constants/dxfJsonData'
console.log(DXF_JSON_DATA.stats.line_count) // Should work
```

---

### **Step 3: Copy Utility Layer (Pure Functions)**
Copy these in order (each depends on previous):

#### 3.1 Copy `dxfGeometry.ts` (No dependencies)
```
✅ utils/dxfGeometry.ts
```

**Test:**
```typescript
import { toC, buildTransform } from './utils/dxfGeometry'
const t = buildTransform([0, 0], [10, 8], 800, 600)
const [cx, cy] = toC(5, 4, t)
console.log(cx, cy) // Should print numbers
```

#### 3.2 Copy `wallsFromDxfJson.ts` (Depends on dxfGeometry)
```
✅ utils/wallsFromDxfJson.ts
```

**Test:**
```typescript
import { wallsFromDxfJson } from './utils/wallsFromDxfJson'
import { DXF_JSON_DATA } from './constants/dxfJsonData'
const walls = wallsFromDxfJson(DXF_JSON_DATA)
console.log(walls.length) // Should print number of walls
```

#### 3.3 Copy remaining utilities
```
✅ utils/dxfRoomDetection.ts    (depends on dxfGeometry, wallsFromDxfJson)
✅ utils/dxfSelection.ts         (depends on wallsFromDxfJson)
✅ utils/dxfDocumentUtils.ts     (depends on dxfGeometry, dxfJsonData)
✅ utils/dxfSnapping.ts          (depends on dxfGeometry, wallsFromDxfJson)
✅ utils/konvaDropToWorld.ts     (depends on dxfGeometry)
✅ utils/exportToDxf.ts          (depends on wallsFromDxfJson)
```

---

### **Step 4: Copy Component Layer**

#### 4.1 Copy `FurnitureLibraryPanel.tsx`
```
✅ components/FurnitureLibraryPanel.tsx
```

**Test:**
```typescript
import { FurnitureLibraryPanel } from './components/FurnitureLibraryPanel'
// Should compile without errors
```

#### 4.2 Copy `DxfJsonViewPage.tsx` (Main Component)
```
✅ DxfJsonViewPage.tsx
```

**Fix imports:** Make sure all imports point to correct paths in your new project.

---

### **Step 5: Copy Styles**
```
✅ DxfJsonViewPage.css (or styles in your CSS-in-JS solution)
```

---

## 🔍 Dependency Graph (Visual)

```
DxfJsonViewPage.tsx
    ├─→ dxfJsonData.ts
    ├─→ dxfGeometry.ts
    ├─→ wallsFromDxfJson.ts
    │       └─→ dxfGeometry.ts
    ├─→ dxfRoomDetection.ts
    │       ├─→ dxfGeometry.ts
    │       └─→ wallsFromDxfJson.ts
    ├─→ dxfSelection.ts
    │       └─→ wallsFromDxfJson.ts
    ├─→ dxfDocumentUtils.ts
    │       ├─→ dxfGeometry.ts
    │       └─→ dxfJsonData.ts
    ├─→ dxfSnapping.ts
    │       ├─→ dxfGeometry.ts
    │       └─→ wallsFromDxfJson.ts
    ├─→ konvaDropToWorld.ts
    │       └─→ dxfGeometry.ts
    ├─→ exportToDxf.ts
    │       └─→ wallsFromDxfJson.ts
    ├─→ FurnitureLibraryPanel.tsx
    │       └─→ furnitureLibraryDxf.ts
    └─→ furnitureLibraryDxf.ts
```

**Rule:** Always copy dependencies BEFORE the files that use them.

---

## ⚠️ Common Issues & Fixes

### Issue 1: Import Path Errors
**Problem:**
```typescript
import { toC } from '@/utils/dxfGeometry'  // ❌ @ alias doesn't exist
```

**Fix:**
```typescript
import { toC } from './utils/dxfGeometry'  // ✅ Relative path
// OR configure @ alias in your new project's tsconfig.json
```

---

### Issue 2: Missing Types
**Problem:**
```typescript
import type { DxfJsonDocument } from '@/constants/dxfJsonData'  // ❌ Not found
```

**Fix:**
Make sure you copied `constants/dxfJsonData.ts` first!

---

### Issue 3: CSS Not Loading
**Problem:**
Styles don't apply in new project.

**Fix:**
- If using CSS modules: `import styles from './DxfJsonViewPage.module.css'`
- If using global CSS: Import in your main `App.tsx` or `index.tsx`
- If using Tailwind: Copy the Tailwind classes to your new project's config

---

### Issue 4: React Router Dependency
**Problem:**
```typescript
import { Link } from 'react-router-dom'  // ❌ Not installed
```

**Fix Option 1:** Install react-router-dom
```bash
npm install react-router-dom
```

**Fix Option 2:** Replace with your routing solution
```typescript
// Replace this:
<Link to="/">Home</Link>

// With this (Next.js):
<a href="/">Home</a>

// Or this (your custom router):
<YourLink to="/">Home</YourLink>
```

---

## ✅ Testing Checklist

After migration, test these features:

### Basic Functionality
- [ ] Page loads without errors
- [ ] Floor plan renders correctly
- [ ] Can zoom in/out with mouse wheel
- [ ] Can pan with hand tool or space+drag

### Drawing Tools
- [ ] Can draw lines (Line tool)
- [ ] Can draw polylines (Polyline tool)
- [ ] Can draw arcs (Arc tool)
- [ ] Can draw circles (Circle tool)
- [ ] Can add text labels (Text tool)

### Selection & Editing
- [ ] Can select walls by clicking
- [ ] Can multi-select with Ctrl+click
- [ ] Can drag walls to move them
- [ ] Can drag endpoints to resize walls
- [ ] Can delete selected walls (Delete key)
- [ ] Can undo (Ctrl+Z)

### Room Features
- [ ] Rooms are detected automatically
- [ ] Room areas are calculated correctly
- [ ] Can drag room templates from library
- [ ] Room labels appear

### Furniture Features
- [ ] Can drag furniture from library
- [ ] Furniture snaps to grid (if snap enabled)
- [ ] Can select and move furniture
- [ ] Can rotate furniture
- [ ] Can delete furniture

### Export
- [ ] Can export to PNG
- [ ] Can export to DXF
- [ ] Exported files are valid

---

## 🎯 Integration with Your New Project

### Option 1: Standalone Page
```typescript
// In your new project's router
import { DxfJsonViewPage } from './pages/DxfJsonViewPage'

<Route path="/floor-plan-editor" element={<DxfJsonViewPage />} />
```

### Option 2: Embedded Component
```typescript
// Wrap in a container
import { DxfJsonViewPage } from './components/DxfJsonViewPage'

function MyPage() {
  return (
    <div className="my-page">
      <h1>Floor Plan Editor</h1>
      <div style={{ width: '100%', height: '800px' }}>
        <DxfJsonViewPage />
      </div>
    </div>
  )
}
```

### Option 3: With Custom Data
```typescript
// Pass your own DXF data
import { DxfJsonViewPage } from './components/DxfJsonViewPage'
import myFloorPlan from './data/myFloorPlan.json'

function MyPage() {
  return <DxfJsonViewPage initialData={myFloorPlan} />
}
```

**Note:** You'll need to modify `DxfJsonViewPage.tsx` to accept props:
```typescript
interface Props {
  initialData?: DxfJsonDocument
}

export function DxfJsonViewPage({ initialData }: Props) {
  const [planDoc, setPlanDoc] = useState(() => initialData ?? DXF_JSON_DATA)
  // ... rest of component
}
```

---

## 📝 File Checklist (Copy This)

Use this checklist when migrating:

```
Data Layer:
[ ] constants/dxfJsonData.ts
[ ] data/furnitureLibraryDxf.ts

Utility Layer (in order):
[ ] utils/dxfGeometry.ts
[ ] utils/wallsFromDxfJson.ts
[ ] utils/dxfRoomDetection.ts
[ ] utils/dxfSelection.ts
[ ] utils/dxfDocumentUtils.ts
[ ] utils/dxfSnapping.ts
[ ] utils/konvaDropToWorld.ts
[ ] utils/exportToDxf.ts

Component Layer:
[ ] components/FurnitureLibraryPanel.tsx
[ ] DxfJsonViewPage.tsx

Styles:
[ ] DxfJsonViewPage.css (or equivalent)

Dependencies:
[ ] npm install react-konva konva polygon-clipping
[ ] npm install react-router-dom (if needed)

Testing:
[ ] Page loads
[ ] Can draw walls
[ ] Can select/move walls
[ ] Can detect rooms
[ ] Can export DXF
```

---

## 🚨 Critical Files (Don't Skip!)

These files are **REQUIRED** - the editor won't work without them:

1. ✅ `dxfJsonData.ts` - Contains data structure definitions
2. ✅ `dxfGeometry.ts` - Core math functions
3. ✅ `wallsFromDxfJson.ts` - Converts DXF to renderable walls
4. ✅ `DxfJsonViewPage.tsx` - Main component

Everything else is optional (but recommended).

---

## 💡 Pro Tips

### Tip 1: Test Incrementally
Don't copy everything at once. Copy one layer at a time and test.

### Tip 2: Use Git
Create a branch in your new project before migrating:
```bash
git checkout -b feature/dxf-editor
```

### Tip 3: Keep Original Project
Don't delete the original project until migration is 100% working.

### Tip 4: Document Changes
If you modify any files during migration, document what you changed and why.

### Tip 5: Create a Wrapper
Create a wrapper component in your new project:
```typescript
// MyFloorPlanEditor.tsx (in new project)
import { DxfJsonViewPage } from './migrated/DxfJsonViewPage'

export function MyFloorPlanEditor() {
  // Add your project-specific logic here
  return <DxfJsonViewPage />
}
```

---

## 🆘 Need Help?

If something breaks during migration:

1. **Check the dependency graph** - Did you copy dependencies first?
2. **Check import paths** - Are they correct for your new project?
3. **Check the console** - What's the exact error message?
4. **Test utilities individually** - Use the test examples in `utils/README.md`
5. **Compare with original** - Is the file exactly the same?

---

## ✅ Success Criteria

Migration is successful when:
- ✅ No TypeScript errors
- ✅ No runtime errors in console
- ✅ All features work (see Testing Checklist)
- ✅ Can export valid DXF files
- ✅ Performance is good (no lag when drawing)

---

## 📚 Additional Resources

- [utils/README.md](./src/utils/README.md) - Detailed utility documentation
- [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) - Phase 2, 3, 4 plans
- [React Konva Docs](https://konvajs.org/docs/react/)
- [DXF Format Spec](https://help.autodesk.com/view/OARX/2023/ENU/)

---

Good luck with your migration! 🚀
