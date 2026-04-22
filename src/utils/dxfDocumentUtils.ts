/**
 * DXF Document Manipulation Utilities
 * Pure functions for adding/removing entities from DxfJsonDocument
 */

import type { DxfJsonDocument, DxfLine, DxfArc, DxfPolyline, DxfPolylineVertex, DxfText } from '@/constants/dxfJsonData'
import type { Pt } from './dxfGeometry'

/**
 * Deep clone a document
 */
export function cloneDoc(doc: DxfJsonDocument): DxfJsonDocument {
  return JSON.parse(JSON.stringify(doc)) as DxfJsonDocument
}

/**
 * Add a user-drawn line to the document
 */
export function appendUserLine(
  doc: DxfJsonDocument,
  start: Pt,
  end: Pt
): { next: DxfJsonDocument; handle: string } {
  const handle = `user-${Date.now()}`
  const line: DxfLine = {
    entity_type: 'LINE',
    handle,
    layer: '0',
    start: { x: start.x, y: start.y, z: 0 },
    end: { x: end.x, y: end.y, z: 0 },
  }
  
  const next = cloneDoc(doc)
  next.lines = [...next.lines, line]
  next.stats = {
    ...next.stats,
    line_count: next.stats.line_count + 1,
    entity_counts: {
      ...next.stats.entity_counts,
      LINE: (next.stats.entity_counts.LINE ?? 0) + 1,
    },
  }
  
  return { next, handle }
}

/**
 * Add a user-drawn arc to the document
 */
export function appendUserArc(
  doc: DxfJsonDocument,
  center: Pt,
  radius: number,
  startAngle: number,
  endAngle: number
): { next: DxfJsonDocument; arc: DxfArc } {
  const handle = `user-ar-${Date.now()}`
  const arc: DxfArc = {
    entity_type: 'ARC',
    handle,
    layer: '0',
    center: { x: center.x, y: center.y, z: 0 },
    radius,
    start_angle: startAngle,
    end_angle: endAngle,
  }
  
  const next = cloneDoc(doc)
  next.arcs = [...next.arcs, arc]
  next.stats = {
    ...next.stats,
    arc_count: (next.stats.arc_count ?? 0) + 1,
    entity_counts: {
      ...next.stats.entity_counts,
      ARC: (next.stats.entity_counts.ARC ?? 0) + 1,
    },
  }
  
  return { next, arc }
}

/**
 * Add a user-drawn polyline to the document
 */
export function appendUserPolyline(
  doc: DxfJsonDocument,
  vertices: Pt[],
  closed: boolean
): { next: DxfJsonDocument; poly: DxfPolyline } {
  const handle = `user-pl-${Date.now()}`
  const vertList: DxfPolylineVertex[] = vertices.map(v => ({
    x: v.x,
    y: v.y,
    z: 0,
    bulge: 0,
  }))
  
  const poly: DxfPolyline = {
    entity_type: 'LWPOLYLINE',
    handle,
    layer: '0',
    closed,
    vertex_count: vertList.length,
    vertices: vertList,
  }
  
  const next = cloneDoc(doc)
  next.polylines = [...next.polylines, poly]
  next.stats = {
    ...next.stats,
    polyline_count: next.stats.polyline_count + 1,
    total_vertex_count: next.stats.total_vertex_count + vertList.length,
    entity_counts: {
      ...next.stats.entity_counts,
      LWPOLYLINE: (next.stats.entity_counts.LWPOLYLINE ?? 0) + 1,
    },
  }
  
  return { next, poly }
}

/**
 * Add a text label to the document
 */
export function appendUserText(
  doc: DxfJsonDocument,
  position: Pt,
  text: string = 'Label',
  height: number = 0.2,
  overrideHandle?: string
): { next: DxfJsonDocument; handle: string } {
  const handle = overrideHandle ?? `user-t-${Date.now()}`
  const entity: DxfText = {
    entity_type: 'MTEXT',
    handle,
    layer: '0',
    text,
    position: { x: position.x, y: position.y, z: 0 },
    height,
  }
  
  const next = cloneDoc(doc)
  next.texts = [...next.texts, entity]
  next.stats = {
    ...next.stats,
    text_count: next.stats.text_count + 1,
    entity_counts: {
      ...next.stats.entity_counts,
      MTEXT: (next.stats.entity_counts.MTEXT ?? 0) + 1,
    },
  }
  
  return { next, handle }
}

/**
 * Remove a line by wall ID
 */
export function removeLineFromDocByWallId(doc: DxfJsonDocument, wallId: string): DxfJsonDocument {
  if (!wallId.startsWith('ln-')) return doc
  const handle = wallId.slice(3)
  const lines = doc.lines.filter(l => l.handle !== handle)
  if (lines.length === doc.lines.length) return doc
  
  const next = cloneDoc(doc)
  next.lines = lines
  next.stats = {
    ...next.stats,
    line_count: Math.max(0, next.stats.line_count - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      LINE: Math.max(0, (next.stats.entity_counts.LINE ?? 0) - 1),
    },
  }
  
  return next
}

/**
 * Remove an arc by handle
 */
export function removeArcFromDocByHandle(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const arcs = doc.arcs.filter(a => a.handle !== handle)
  if (arcs.length === doc.arcs.length) return doc
  
  const next = cloneDoc(doc)
  next.arcs = arcs
  next.stats = {
    ...next.stats,
    arc_count: Math.max(0, (next.stats.arc_count ?? 0) - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      ARC: Math.max(0, (next.stats.entity_counts.ARC ?? 0) - 1),
    },
  }
  
  return next
}

/**
 * Remove a polyline by handle
 */
export function removePolylineFromDocByHandle(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const polylines = doc.polylines.filter(p => p.handle !== handle)
  if (polylines.length === doc.polylines.length) return doc
  
  const removed = doc.polylines.find(p => p.handle === handle)!
  const next = cloneDoc(doc)
  next.polylines = polylines
  next.stats = {
    ...next.stats,
    polyline_count: Math.max(0, next.stats.polyline_count - 1),
    total_vertex_count: Math.max(0, next.stats.total_vertex_count - removed.vertex_count),
    entity_counts: {
      ...next.stats.entity_counts,
      LWPOLYLINE: Math.max(0, (next.stats.entity_counts.LWPOLYLINE ?? 0) - 1),
    },
  }
  
  return next
}

/**
 * Remove a text by handle
 */
export function removeTextFromDoc(doc: DxfJsonDocument, handle: string): DxfJsonDocument {
  const texts = doc.texts.filter(t => t.handle !== handle)
  if (texts.length === doc.texts.length) return doc
  
  const next = cloneDoc(doc)
  next.texts = texts
  next.stats = {
    ...next.stats,
    text_count: Math.max(0, next.stats.text_count - 1),
    entity_counts: {
      ...next.stats.entity_counts,
      MTEXT: Math.max(0, (next.stats.entity_counts.MTEXT ?? 0) - 1),
    },
  }
  
  return next
}

/**
 * Extract polyline handle from wall ID
 */
export function polylineHandleFromWallId(wallId: string): string | null {
  if (!wallId.startsWith('pl-')) return null
  const rest = wallId.slice(3)
  const dash = rest.lastIndexOf('-')
  if (dash <= 0) return null
  if (!/^\d+$/.test(rest.slice(dash + 1))) return null
  return rest.slice(0, dash)
}

/**
 * Generate room label handle from polyline handle
 */
export function roomLabelHandle(polyHandle: string): string {
  return `room-lbl-${polyHandle}`
}


