export type FurnitureDefinition = {
  type: string
  label: string
  width: number
  depth: number
  height3d?: number
  color3d?: string
}

export const furnitureLibrary: FurnitureDefinition[] = [
  { type: 'sofa', label: 'Sofa', width: 1.8, depth: 0.9, height3d: 0.8, color3d: '#cbd5e1' },
  { type: 'coffee-table', label: 'Coffee Table', width: 1.0, depth: 0.5, height3d: 0.45, color3d: '#94a3b8' },
  { type: 'bed-double', label: 'Double Bed', width: 2.0, depth: 1.6, height3d: 0.6, color3d: '#e2e8f0' },
  { type: 'dining-table', label: 'Dining Table', width: 1.6, depth: 0.9, height3d: 0.75, color3d: '#a3a3a3' },
  { type: 'toilet', label: 'Toilet', width: 0.7, depth: 0.7, height3d: 0.8, color3d: '#f1f5f9' },
]

