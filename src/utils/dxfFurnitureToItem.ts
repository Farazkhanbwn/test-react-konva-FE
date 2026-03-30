import type { FurnitureItem, RawFurnitureGeometry, Vertex } from '@/hooks/useDesignCanvasState'

/**
 * Compute bounding box from vertices (works for LINE, LWPOLYLINE, etc.).
 * Returns { minX, minY, maxX, maxY, width, height, centerX, centerY }.
 */
function boundsFromVertices(vertices: Vertex[]) {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 }
  }
  const xs = vertices.map((v) => v.x)
  const ys = vertices.map((v) => v.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const width = Math.max(maxX - minX, 0.1)
  const height = Math.max(maxY - minY, 0.1)
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  }
}

/**
 * Convert a DXF-style furniture entity (LINE with vertices, no chair/table type)
 * into our FurnitureItem so it can be rendered.
 *
 * Use this when your source only has geometry (type, vertices, handle, layer)
 * and no semantic type like "chair" or "table". Output uses furnitureType "generic"
 * so the canvas draws a simple rectangle; you can later map handle/layer to a
 * specific type if you have a lookup table.
 */
export function dxfFurnitureToItem(
  raw: RawFurnitureGeometry,
  id?: string
): FurnitureItem {
  const { width, height, centerX, centerY } = boundsFromVertices(raw.vertices)
  const itemId = id ?? raw.handle ?? raw.ownerHandle ?? `furn-${Math.random().toString(36).slice(2)}`
  const label = raw.layer ? `Furniture (${raw.layer})` : 'Furniture'

  return {
    id: itemId,
    furnitureType: 'generic',
    label,
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    depth: height,
    rotation: 0,
    raw,
  }
}

/**
 * Convert an array of raw DXF furniture entities into FurnitureItem[].
 * Each item gets a stable id from handle, ownerHandle, or index.
 */
export function dxfFurnitureListToItems(rawList: RawFurnitureGeometry[]): FurnitureItem[] {
  return rawList.map((raw, i) =>
    dxfFurnitureToItem(raw, raw.handle ?? raw.ownerHandle ?? `furn-${i}`)
  )
}
