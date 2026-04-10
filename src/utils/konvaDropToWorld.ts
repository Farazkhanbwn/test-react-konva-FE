import Konva from 'konva'

/** Same shape as `buildT()` in the DXF viewer — canvas fit transform (world ↔ stage inner px). */
export type DxfFitTransform = {
  sc: number
  oX: number
  oY: number
  emin: number[]
  wH: number
}

/** Stage inner canvas coordinates → world metres (DXF Y up). */
export function canvasXYToWorldXY(cx: number, cy: number, t: DxfFitTransform): [number, number] {
  return [
    (cx - t.oX) / t.sc + t.emin[0],
    t.emin[1] + t.wH - (cy - t.oY) / t.sc,
  ]
}

/** Browser client coordinates (e.clientX/Y) → stage inner coordinates. */
export function clientXYToStageCanvas(
  stage: InstanceType<typeof Konva.Stage>,
  clientX: number,
  clientY: number,
): Konva.Vector2d {
  const rect = stage.container().getBoundingClientRect()
  const x = clientX - rect.left
  const y = clientY - rect.top
  return stage.getAbsoluteTransform().copy().invert().point({ x, y })
}

export function clientXYToWorldXY(
  stage: InstanceType<typeof Konva.Stage>,
  clientX: number,
  clientY: number,
  t: DxfFitTransform,
): [number, number] {
  const p = clientXYToStageCanvas(stage, clientX, clientY)
  return canvasXYToWorldXY(p.x, p.y, t)
}
