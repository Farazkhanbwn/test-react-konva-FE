# 🚀 Quick Start: Integrate DXF Editor

## For Developers Moving This to Another Project

This is a **step-by-step guide** to get the DXF editor working in your new project in **30 minutes**.

---

## 📋 Prerequisites

- Node.js 16+ installed
- React 18+ project set up
- Basic understanding of React components

---

## ⚡ Quick Migration (30 Minutes)

### **Step 1: Install Dependencies (2 min)**

```bash
cd your-new-project
npm install react-konva konva polygon-clipping
```

---

### **Step 2: Copy Files (5 min)**

Create this folder structure in your new project:

```
your-new-project/
└── src/
    ├── pages/
    │   └── DxfJsonViewPage.tsx          # Copy from old project
    ├── constants/
    │   └── dxfJsonData.ts                # Copy from old project
    ├── utils/
    │   ├── dxfGeometry.ts                # Copy from old project
    │   ├── dxfRoomDetection.ts           # Copy from old project
    │   ├── dxfSelection.ts               # Copy from old project
    │   ├── dxfDocumentUtils.ts           # Copy from old project
    │   ├── dxfSnapping.ts                # Copy from old project
    │   ├── wallsFromDxfJson.ts           # Copy from old project
    │   ├── konvaDropToWorld.ts           # Copy from old project
    │   └── exportToDxf.ts                # Copy from old project
    ├── components/
    │   └── FurnitureLibraryPanel.tsx     # Copy from old project
    └── data/
        └── furnitureLibraryDxf.ts        # Copy from old project
```

**Copy command (if using same structure):**
```bash
# From old project root
cp -r src/constants your-new-project/src/
cp -r src/utils your-new-project/src/
cp -r src/components your-new-project/src/
cp -r src/data your-new-project/src/
cp src/DxfJsonViewPage.tsx your-new-project/src/pages/
```

---

### **Step 3: Fix Import Paths (10 min)**

Open `DxfJsonViewPage.tsx` and update imports:

**Before (old project):**
```typescript
import { DXF_JSON_DATA } from '@/constants/dxfJsonData'
import { toC, toW } from '@/utils/dxfGeometry'
```

**After (new project - option 1: relative paths):**
```typescript
import { DXF_JSON_DATA } from '../constants/dxfJsonData'
import { toC, toW } from '../utils/dxfGeometry'
```

**After (new project - option 2: configure @ alias):**

Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

Then imports stay the same:
```typescript
import { DXF_JSON_DATA } from '@/constants/dxfJsonData'
import { toC, toW } from '@/utils/dxfGeometry'
```

---

### **Step 4: Add to Router (3 min)**

**If using React Router:**
```typescript
// App.tsx or routes.tsx
import { DxfJsonViewPage } from './pages/DxfJsonViewPage'

<Routes>
  <Route path="/floor-plan" element={<DxfJsonViewPage />} />
</Routes>
```

**If using Next.js:**
```typescript
// pages/floor-plan.tsx
import { DxfJsonViewPage } from '../components/DxfJsonViewPage'

export default function FloorPlanPage() {
  return <DxfJsonViewPage />
}
```

**If no router (standalone):**
```typescript
// App.tsx
import { DxfJsonViewPage } from './pages/DxfJsonViewPage'

function App() {
  return (
    <div className="App">
      <DxfJsonViewPage />
    </div>
  )
}
```

---

### **Step 5: Copy Styles (5 min)**

**Option 1: Global CSS**
```typescript
// In DxfJsonViewPage.tsx, add at top:
import './DxfJsonViewPage.css'
```

Then copy the CSS file to same directory.

**Option 2: CSS Modules**
```typescript
// Rename to DxfJsonViewPage.module.css
import styles from './DxfJsonViewPage.module.css'

// Update className usage:
<div className={styles.dxfEditor}>
```

**Option 3: Styled Components / Emotion**
Convert CSS to your preferred CSS-in-JS solution.

---

### **Step 6: Test (5 min)**

Start your dev server:
```bash
npm run dev
# or
npm start
```

Navigate to `/floor-plan` (or wherever you mounted it).

**Quick test checklist:**
- [ ] Page loads without errors
- [ ] Floor plan is visible
- [ ] Can zoom with mouse wheel
- [ ] Can click "Select" tool
- [ ] Can click "Line" tool

If all 5 work, **you're done!** ✅

---

## 🔧 Troubleshooting

### Error: "Cannot find module '@/constants/dxfJsonData'"

**Fix:** Update import paths (see Step 3)

---

### Error: "Module not found: Can't resolve 'react-konva'"

**Fix:** Install dependencies
```bash
npm install react-konva konva
```

---

### Error: "Module not found: Can't resolve 'polygon-clipping'"

**Fix:** Install dependency
```bash
npm install polygon-clipping
```

---

### Error: Styles not applying

**Fix:** Make sure you imported the CSS file (see Step 5)

---

### Error: TypeScript errors about types

**Fix:** Make sure you copied `constants/dxfJsonData.ts` which contains all type definitions

---

## 🎨 Customization

### Change Initial Floor Plan

```typescript
// In DxfJsonViewPage.tsx, find this line:
const [planDoc, setPlanDoc] = useState<DxfJsonDocument>(() => ({ ...DXF_JSON_DATA }))

// Replace with your own data:
import MY_FLOOR_PLAN from './data/myFloorPlan.json'
const [planDoc, setPlanDoc] = useState<DxfJsonDocument>(() => MY_FLOOR_PLAN)
```

---

### Change Canvas Size

```typescript
// In DxfJsonViewPage.tsx, find:
const STAGE_MIN_W = 320
const STAGE_MIN_H = 280

// Change to your preferred size:
const STAGE_MIN_W = 800
const STAGE_MIN_H = 600
```

---

### Change Colors

```typescript
// In DxfJsonViewPage.tsx, find:
const ROOM_COLORS = [
  'rgba(59,130,246,0.15)',  // Blue
  'rgba(16,185,129,0.15)',  // Green
  // ... more colors
]

// Change to your brand colors:
const ROOM_COLORS = [
  'rgba(255,0,0,0.15)',     // Red
  'rgba(0,255,0,0.15)',     // Green
  // ... your colors
]
```

---

### Add Custom Furniture

```typescript
// In data/furnitureLibraryDxf.ts, add to FURNITURE_DXF_TEMPLATES:
{
  id: 'my-custom-furniture',
  label: 'My Furniture',
  category: 'Custom',
  lines: [
    { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
    { start: { x: 1, y: 0 }, end: { x: 1, y: 1 } },
    // ... more lines
  ]
}
```

---

## 📦 What Each File Does (Quick Reference)

| File | Purpose | Can Skip? |
|------|---------|-----------|
| `DxfJsonViewPage.tsx` | Main editor component | ❌ Required |
| `dxfJsonData.ts` | Data structure + sample data | ❌ Required |
| `dxfGeometry.ts` | Math functions | ❌ Required |
| `wallsFromDxfJson.ts` | Convert DXF → walls | ❌ Required |
| `dxfRoomDetection.ts` | Detect rooms | ✅ Optional* |
| `dxfSelection.ts` | Selection logic | ✅ Optional* |
| `dxfDocumentUtils.ts` | Add/remove entities | ✅ Optional* |
| `dxfSnapping.ts` | Snap to points | ✅ Optional* |
| `konvaDropToWorld.ts` | Drag-drop conversion | ✅ Optional* |
| `exportToDxf.ts` | Export to DXF | ✅ Optional* |
| `FurnitureLibraryPanel.tsx` | Furniture panel | ✅ Optional* |
| `furnitureLibraryDxf.ts` | Furniture templates | ✅ Optional* |

*Optional = Editor will work but some features won't (e.g., no room detection, no furniture, no export)

---

## 🚀 Next Steps

After basic integration works:

1. **Read** `MIGRATION_GUIDE.md` for detailed explanation
2. **Read** `utils/README.md` to understand utility functions
3. **Customize** colors, sizes, furniture to match your brand
4. **Test** all features (see Testing Checklist in MIGRATION_GUIDE.md)
5. **Deploy** to production

---

## 💡 Pro Tips

### Tip 1: Start Simple
Get it working first, customize later.

### Tip 2: Test Incrementally
After copying each file, check if it compiles.

### Tip 3: Use Version Control
```bash
git checkout -b feature/dxf-editor
git add .
git commit -m "Add DXF floor plan editor"
```

### Tip 4: Keep Original
Don't delete the old project until new one is 100% working.

---

## ✅ Success!

If you can:
- ✅ Load the page
- ✅ See the floor plan
- ✅ Draw a line
- ✅ Select a wall

**You're done!** The editor is working. 🎉

Everything else (rooms, furniture, export) will work automatically if you copied all files.

---

## 🆘 Still Stuck?

1. Check console for errors
2. Check browser DevTools Network tab
3. Compare your files with original project
4. Read `MIGRATION_GUIDE.md` for detailed troubleshooting

---

**Estimated time:** 30 minutes for basic integration, 2 hours for full customization.

Good luck! 🚀
