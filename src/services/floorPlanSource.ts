/**
 * Floor plan document source: development uses `src/constants/dxfJsonData.ts`;
 * production will call your backend and return the same JSON shape.
 */

import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import { DXF_JSON_DATA } from '@/constants/dxfJsonData'

/** Re-export so imports stay stable when you swap implementations. */
export const DEV_FLOOR_PLAN_JSON: DxfJsonDocument = DXF_JSON_DATA

/**
 * Optional API base (e.g. `VITE_FLOOR_PLAN_API_URL=https://api.example.com`).
 * Leave unset to use bundled `DEV_FLOOR_PLAN_JSON` only.
 */
function apiBase(): string | undefined {
  const v = import.meta.env.VITE_FLOOR_PLAN_API_URL as string | undefined
  return v?.replace(/\/$/, '') || undefined
}

/**
 * Load the current floor plan document (page load / refresh).
 * Today: resolves to the bundled JSON from `dxfJsonData.ts` (edit that file while building UI).
 * Later: `GET ${VITE_FLOOR_PLAN_API_URL}/floor-plan` → `DxfJsonDocument` JSON.
 */
export async function getFloorPlanDocument(): Promise<DxfJsonDocument> {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/floor-plan`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Floor plan fetch failed: ${res.status}`)
    return res.json() as Promise<DxfJsonDocument>
  }
  return DEV_FLOOR_PLAN_JSON
}

/**
 * Text prompt → generated floor plan (Synaps-style).
 * Today: returns bundled dev JSON (prompt ignored). Wire your backend here.
 */
export async function generateFloorPlanFromPrompt(prompt: string): Promise<DxfJsonDocument> {
  const base = apiBase()
  if (base) {
    const res = await fetch(`${base}/floor-plan/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    if (!res.ok) throw new Error(`Generate failed: ${res.status}`)
    return res.json() as Promise<DxfJsonDocument>
  }
  // Dev: keep editing `dxfJsonData.ts`; optionally log prompt for debugging
  if (import.meta.env.DEV && prompt.trim()) console.info('[floorPlan] dev generate (ignored):', prompt.slice(0, 200))
  return DEV_FLOOR_PLAN_JSON
}
