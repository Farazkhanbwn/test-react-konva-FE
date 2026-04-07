import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Stage, Layer, Rect, Line, Text, Group, Arc, Circle } from 'react-konva'
import Konva from 'konva'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  MousePointer,
  Move,
  Undo2,
  Redo2,
  Plus,
  DoorOpen,
  SquareIcon,
  ArrowUpDown,
  Trash2,
  PanelLeft,
  RotateCw,
  Armchair,
  Download,
} from 'lucide-react'
import {
  useDesignCanvasState,
  SCALE,
  PLAN_OFFSET_X,
  PLAN_OFFSET_Y,
  GRID_SIZE,
  type RoomData,
  type CanvasTool,
} from '@/hooks/useDesignCanvasState'
import FurniturePanel from '@/FurniturePanel'
import FurnitureRenderer from '@/FurnitureRenderer'
import type { FurnitureDefinition } from '@/data/furnitureLibrary'

const m = (v: number) => v * SCALE
const HANDLE_SIZE = 6

interface DesignCanvasSectionProps {
  canvasState?: ReturnType<typeof useDesignCanvasState>
  stageRef?: React.MutableRefObject<Konva.Stage | null>
}

export default function DesignCanvasSection({
  canvasState,
  stageRef: externalStageRef,
}: DesignCanvasSectionProps) {
  const internalCanvas = useDesignCanvasState()
  const canvas = canvasState || internalCanvas

  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [wallDrawStart, setWallDrawStart] = useState<{ x: number; y: number } | null>(null)

  const internalStageRef = useRef<Konva.Stage>(null)
  const stageRef = externalStageRef || internalStageRef

  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasDims, setCanvasDims] = useState({ w: 760, h: 620 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect
      setCanvasDims({ w: Math.max(width, 300), h: 620 })
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const canvasW = canvasDims.w
  const canvasH = canvasDims.h

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.3))
  const handleFit = () => {
    setScale(1)
    setStagePos({ x: 0, y: 0 })
  }

  const getMetersFromPointer = useCallback(
    (pointer: { x: number; y: number }) => ({
      x: (pointer.x - stagePos.x) / scale / SCALE - PLAN_OFFSET_X / SCALE,
      y: (pointer.y - stagePos.y) / scale / SCALE - PLAN_OFFSET_Y / SCALE,
    }),
    [scale, stagePos],
  )

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const pos = getMetersFromPointer(pointer)
    setCursorPos({ x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10 })
    void e
  }

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return

    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const pos = getMetersFromPointer(pointer)

    switch (canvas.tool) {
      case 'addRoom':
        canvas.addRoom(pos.x, pos.y)
        canvas.setTool('select')
        break
      case 'addDoor':
        canvas.addDoor(pos.x, pos.y)
        canvas.setTool('select')
        break
      case 'addWindow':
        canvas.addWindow(pos.x, pos.y)
        canvas.setTool('select')
        break
      case 'addStairs':
        canvas.addStairsElement(pos.x, pos.y)
        canvas.setTool('select')
        break
      case 'addWall':
        if (!wallDrawStart) {
          setWallDrawStart({ x: Math.round(pos.x * 2) / 2, y: Math.round(pos.y * 2) / 2 })
        } else {
          const endX = Math.round(pos.x * 2) / 2
          const endY = Math.round(pos.y * 2) / 2
          const dx = Math.abs(endX - wallDrawStart.x)
          const dy = Math.abs(endY - wallDrawStart.y)
          if (dx > dy) {
            canvas.addWallSegment(wallDrawStart.x, wallDrawStart.y, endX, wallDrawStart.y)
          } else {
            canvas.addWallSegment(wallDrawStart.x, wallDrawStart.y, wallDrawStart.x, endY)
          }
          setWallDrawStart(null)
          canvas.setTool('select')
        }
        break
      default:
        canvas.selectElement(null, null)
        break
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas.selectedId && !(e.target instanceof HTMLInputElement)) {
          canvas.deleteSelected()
        }
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        canvas.undo()
      }
      if (
        (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === 'y' && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault()
        canvas.redo()
      }
      if (e.key === 'Escape') {
        canvas.selectElement(null, null)
        canvas.setTool('select')
        setWallDrawStart(null)
      }
      if ((e.key === 'r' || e.key === 'R') && !(e.target instanceof HTMLInputElement) && !(e.metaKey || e.ctrlKey)) {
        if (canvas.selectedId && canvas.selectedType === 'door') canvas.rotateDoor(canvas.selectedId)
        if (canvas.selectedId && canvas.selectedType === 'window') canvas.rotateWindow(canvas.selectedId)
        if (canvas.selectedId && canvas.selectedType === 'furniture') canvas.rotateFurniture(canvas.selectedId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canvas])

  const gridLines = useMemo(() => {
    const lines = []
    for (let i = 0; i <= canvasW; i += GRID_SIZE) {
      lines.push(<Line key={`v${i}`} points={[i, 0, i, canvasH]} stroke="#e5e7eb" strokeWidth={0.3} />)
    }
    for (let j = 0; j <= canvasH; j += GRID_SIZE) {
      lines.push(<Line key={`h${j}`} points={[0, j, canvasW, j,]} stroke="#e5e7eb" strokeWidth={0.3} />)
    }
    return lines
  }, [canvasH, canvasW])

  const selectedRoom = canvas.getSelectedRoom()

  const toolButtons: { icon: React.ElementType; t: CanvasTool; label: string }[] = [
    { icon: MousePointer, t: 'select', label: 'Select' },
    { icon: SquareIcon, t: 'addRoom', label: 'Add Room' },
    { icon: PanelLeft, t: 'addWall', label: 'Draw Wall' },
    { icon: DoorOpen, t: 'addDoor', label: 'Door' },
    { icon: Plus, t: 'addWindow', label: 'Window' },
    { icon: ArrowUpDown, t: 'addStairs', label: 'Stairs' },
    { icon: Armchair, t: 'addFurniture', label: 'Furniture' },
    { icon: Move, t: 'move', label: 'Pan' },
    { icon: Trash2, t: 'delete', label: 'Delete' },
  ]

  const getCursor = () => {
    switch (canvas.tool) {
      case 'move':
        return 'grab'
      case 'addRoom':
      case 'addDoor':
      case 'addWindow':
      case 'addStairs':
      case 'addWall':
      case 'addFurniture':
        return 'crosshair'
      case 'delete':
        return 'not-allowed'
      default:
        return 'default'
    }
  }

  const renderResizeHandles = (room: RoomData) => {
    const rx = PLAN_OFFSET_X + m(room.x)
    const ry = PLAN_OFFSET_Y + m(room.y)
    const rw = m(room.width)
    const rh = m(room.height)

    const handles = [
      { id: 'tl', x: rx, y: ry },
      { id: 'tr', x: rx + rw, y: ry },
      { id: 'bl', x: rx, y: ry + rh },
      { id: 'br', x: rx + rw, y: ry + rh },
      { id: 'tm', x: rx + rw / 2, y: ry },
      { id: 'bm', x: rx + rw / 2, y: ry + rh },
      { id: 'ml', x: rx, y: ry + rh / 2 },
      { id: 'mr', x: rx + rw, y: ry + rh / 2 },
    ]

    return handles.map((h) => (
      <Rect
        key={h.id}
        x={h.x - HANDLE_SIZE / 2}
        y={h.y - HANDLE_SIZE / 2}
        width={HANDLE_SIZE}
        height={HANDLE_SIZE}
        fill="#1a73e8"
        stroke="#ffffff"
        strokeWidth={1}
        draggable
        onDragMove={(e) => {
          const node = e.target
          const rawNx = (node.x() + HANDLE_SIZE / 2 - PLAN_OFFSET_X) / SCALE
          const rawNy = (node.y() + HANDLE_SIZE / 2 - PLAN_OFFSET_Y) / SCALE
          const nx = snapEnabled ? Math.round(rawNx * 2) / 2 : rawNx
          const ny = snapEnabled ? Math.round(rawNy * 2) / 2 : rawNy

          // Important: use the latest room from state during drag.
          // Otherwise, corner handles can behave inconsistently because React closures may lag behind Konva drag updates.
          const liveRoom = canvas.state.rooms.find((r) => r.id === room.id)
          if (!liveRoom) return

          const left = liveRoom.x
          const top = liveRoom.y
          const right = liveRoom.x + liveRoom.width
          const bottom = liveRoom.y + liveRoom.height

          let newX = left
          let newY = top
          let newW = liveRoom.width
          let newH = liveRoom.height

          switch (h.id) {
            case 'tl':
              newX = nx
              newY = ny
              newW = right - nx
              newH = bottom - ny
              break
            case 'tr':
              newY = ny
              newW = nx - left
              newH = bottom - ny
              break
            case 'bl':
              newX = nx
              newW = right - nx
              newH = ny - top
              break
            case 'br':
              newW = nx - left
              newH = ny - top
              break
            case 'tm':
              newY = ny
              newH = bottom - ny
              break
            case 'bm':
              newH = ny - top
              break
            case 'ml':
              newX = nx
              newW = right - nx
              break
            case 'mr':
              newW = nx - left
              break
            default:
              break
          }

          if (newW < 0.5 || newH < 0.5) return
          canvas.resizeRoom(room.id, newW, newH, newX, newY)
        }}
        onDragEnd={() => canvas.finalizeRoomResize(room.id)}
      />
    ))
  }

  return (
    <div className="designer-layout">
      <Card>
        <CardContent className="ui-card-content designer-left">
          <div>
            <h3 className="designer-section-title">Editing Tools</h3>
            <div className="designer-tools-grid">
              {toolButtons.map(({ icon: Icon, t, label }) => (
                <Button
                  key={t}
                  variant={canvas.tool === t ? 'default' : 'outline'}
                  size="sm"
                  className="designer-tool-btn"
                  onClick={() => {
                    canvas.setTool(t)
                    setWallDrawStart(null)
                  }}
                  type="button"
                >
                  <Icon size={14} />
                  {label}
                </Button>
              ))}
            </div>
            {canvas.tool === 'addWall' && (
              <p className="designer-hint">
                {wallDrawStart ? 'Click to set wall end point' : 'Click to set wall start point'}
              </p>
            )}
          </div>

          {selectedRoom && (
            <div>
              <h3 className="designer-section-title">Room Dimensions</h3>
              <div className="designer-form">
                <label className="designer-label">Label</label>
                <Input
                  value={selectedRoom.label}
                  onChange={(e) => canvas.updateRoomLabel(selectedRoom.id, e.target.value)}
                />
                <div className="designer-two-col">
                  <div>
                    <label className="designer-label">Width (m)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={selectedRoom.width}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!Number.isNaN(val) && val >= 0.5) canvas.updateRoomDimensions(selectedRoom.id, val, selectedRoom.height)
                      }}
                    />
                  </div>
                  <div>
                    <label className="designer-label">Length (m)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={selectedRoom.height}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!Number.isNaN(val) && val >= 0.5) canvas.updateRoomDimensions(selectedRoom.id, selectedRoom.width, val)
                      }}
                    />
                  </div>
                </div>
                <div className="designer-muted">
                  Area: {(selectedRoom.width * selectedRoom.height).toFixed(1)} m²
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="designer-section-title">Smart Constraints</h3>
            <div className="designer-checkbox-row">
              <Checkbox checked={snapEnabled} onCheckedChange={(v) => setSnapEnabled(!!v)} id="snap" />
              <label htmlFor="snap" className="designer-checkbox-label">Auto-snap to grid</label>
            </div>
          </div>

          <div>
            <h3 className="designer-section-title">Quick Actions</h3>
            <div className="designer-actions-grid">
              <Button variant="outline" size="sm" onClick={canvas.undo} disabled={!canvas.canUndo} type="button">
                <Undo2 size={14} /> Undo
              </Button>
              <Button variant="outline" size="sm" onClick={canvas.redo} disabled={!canvas.canRedo} type="button">
                <Redo2 size={14} /> Redo
              </Button>
              {canvas.selectedId && (canvas.selectedType === 'door' || canvas.selectedType === 'window') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (canvas.selectedType === 'door') canvas.rotateDoor(canvas.selectedId!)
                    if (canvas.selectedType === 'window') canvas.rotateWindow(canvas.selectedId!)
                  }}
                  type="button"
                >
                  <RotateCw size={14} /> Rotate
                </Button>
              )}
              {canvas.selectedId && (
                <Button variant="outline" size="sm" onClick={canvas.deleteSelected} type="button">
                  <Trash2 size={14} /> Delete
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const json = JSON.stringify(canvas.state, null, 2)
                  const blob = new Blob([json], { type: 'application/json' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${canvas.state.meta?.projectName || 'floor-plan'}.json`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                type="button"
              >
                <Download size={14} /> Export JSON
              </Button>
            </div>
          </div>

          <FurniturePanel
            onAddFurniture={(def: FurnitureDefinition) => {
              const cx = (-stagePos.x / scale + canvasW / 2 / scale - PLAN_OFFSET_X) / SCALE
              const cy = (-stagePos.y / scale + canvasH / 2 / scale - PLAN_OFFSET_Y) / SCALE
              canvas.addFurniture(def.type, def.label, cx, cy, def.width, def.depth, def.height3d, def.color3d)
              canvas.setTool('select')
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="ui-card-content designer-center">
          <div className="designer-toolbar">
            <div className="designer-toolbar-left">
              <h3 className="designer-toolbar-title">Design Canvas</h3>
              <Badge variant="secondary">Ground Floor — Scale 1:50</Badge>
            </div>
            <div className="designer-toolbar-right">
              <span className="designer-muted">Zoom: {Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} type="button">
                <ZoomOut size={16} />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleZoomIn} type="button">
                <ZoomIn size={16} />
              </Button>
              <Button variant="outline" size="sm" onClick={handleFit} type="button">
                <Maximize size={14} /> Fit
              </Button>
            </div>
          </div>

          <div className="designer-hintbar">
            <span className="designer-muted">
              {canvas.tool === 'select' && 'Click elements to select. Drag to move. Use handles to resize rooms.'}
              {canvas.tool === 'addRoom' && 'Click on canvas to place a new room.'}
              {canvas.tool === 'addWall' && (wallDrawStart ? 'Click to set the wall endpoint.' : 'Click to set the wall start point.')}
              {canvas.tool === 'addDoor' && 'Click on canvas to place a door.'}
              {canvas.tool === 'addWindow' && 'Click on canvas to place a window.'}
              {canvas.tool === 'addStairs' && 'Click on canvas to place stairs.'}
              {canvas.tool === 'addFurniture' && 'Use the furniture panel to add an item.'}
              {canvas.tool === 'move' && 'Click and drag to pan the canvas.'}
              {canvas.tool === 'delete' && 'Click an element to delete it.'}
            </span>
            <span className="designer-muted">
              Rooms: {canvas.state.rooms.length} | Walls: {canvas.state.walls.length} | Furniture: {canvas.state.furniture.length}
            </span>
          </div>

          <div ref={containerRef} className="designer-stage-wrap">
            <Stage
              ref={stageRef}
              // width={canvasW}
              // height={canvasH}
              width={2000}
              height={2000}
              scaleX={scale}
              scaleY={scale}
              x={stagePos.x}
              y={stagePos.y}
              draggable={canvas.tool === 'move'}
              onDragEnd={(e) => {
                if (e.target === stageRef.current) setStagePos({ x: e.target.x(), y: e.target.y() })
              }}
              onMouseMove={handleStageMouseMove}
              onClick={handleStageClick}
              style={{ cursor: getCursor() }}
            >
              <Layer>
                {gridLines}

                <Rect x={PLAN_OFFSET_X} y={PLAN_OFFSET_Y} width={m(12)} height={m(8)} fill="#ffffff" />

                {canvas.state.rooms.map((room) => {
                  const isSelected = canvas.selectedId === room.id && canvas.selectedType === 'room'
                  const innerWallThicknessM = canvas.state.meta?.defaultInnerWallThickness ?? 0.1
                  const roomStrokePx = m(innerWallThicknessM)
                  return (
                    <Group key={`room-${room.id}`}>
                      <Rect
                        x={PLAN_OFFSET_X + m(room.x)}
                        y={PLAN_OFFSET_Y + m(room.y)}
                        width={m(room.width)}
                        height={m(room.height)}
                        fill={isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent'}
                        stroke={isSelected ? '#3b82f6' : '#111827'}
                        strokeWidth={roomStrokePx}
                        draggable={canvas.tool === 'select'}
                        onClick={(ev) => {
                          ev.cancelBubble = true
                          if (canvas.tool === 'delete') {
                            canvas.selectElement(room.id, 'room')
                            setTimeout(() => canvas.deleteSelected(), 0)
                          } else {
                            canvas.selectElement(room.id, 'room')
                          }
                        }}
                        onDragMove={(ev) => {
                          const node = ev.target
                          const newX = (node.x() - PLAN_OFFSET_X) / SCALE
                          const newY = (node.y() - PLAN_OFFSET_Y) / SCALE
                          canvas.moveRoom(room.id, newX, newY)
                        }}
                        onDragEnd={(ev) => {
                          const node = ev.target
                          const newX = (node.x() - PLAN_OFFSET_X) / SCALE
                          const newY = (node.y() - PLAN_OFFSET_Y) / SCALE
                          canvas.moveRoom(room.id, newX, newY)
                          canvas.finalizeRoomMove(room.id)
                        }}
                      />

                      <Text
                        x={PLAN_OFFSET_X + m(room.x)}
                        y={PLAN_OFFSET_Y + m(room.y) + m(room.height) / 2 - 12}
                        width={m(room.width)}
                        text={room.label}
                        fontSize={11}
                        fontFamily="Arial"
                        fill="#1a1a1a"
                        fontStyle={isSelected ? 'bold' : 'normal'}
                        align="center"
                        listening={false}
                      />
                      <Text
                        x={PLAN_OFFSET_X + m(room.x)}
                        y={PLAN_OFFSET_Y + m(room.y) + m(room.height) / 2 + 2}
                        width={m(room.width)}
                        text={`${room.width.toFixed(1)} × ${room.height.toFixed(1)} m`}
                        fontSize={9}
                        fontFamily="Arial"
                        fill="#888888"
                        align="center"
                        listening={false}
                      />
                    </Group>
                  )
                })}

                {/* Hide default inner walls; rely on room outlines for interior partitions */}
                {canvas.state.walls.filter((wall) => wall.isOuter !== false).map((wall) => {
                  const isHorizontal = wall.y1 === wall.y2
                  const px1 = PLAN_OFFSET_X + m(wall.x1)
                  const py1 = PLAN_OFFSET_Y + m(wall.y1)
                  const px2 = PLAN_OFFSET_X + m(wall.x2)
                  const py2 = PLAN_OFFSET_Y + m(wall.y2)
                  const isSelected = canvas.selectedId === wall.id

                  const metaOuter = canvas.state.meta?.defaultWallThickness ?? 0.2
                  const metaInner = canvas.state.meta?.defaultInnerWallThickness ?? 0.1
                  let thicknessM = wall.wallThickness3d ?? (wall.isOuter ? metaOuter : metaInner)
                  // Some older data stores thickness in pixels; clamp anything > 1m back to meta defaults.
                  if (thicknessM > 1) thicknessM = wall.isOuter ? metaOuter : metaInner
                  const renderThickness = m(thicknessM)

                  const wallRect = isHorizontal
                    ? { x: Math.min(px1, px2), y: py1 - renderThickness / 2, w: Math.abs(px2 - px1), h: renderThickness }
                    : { x: px1 - renderThickness / 2, y: Math.min(py1, py2), w: renderThickness, h: Math.abs(py2 - py1) }

                  return (
                    <Group key={`wall-${wall.id}`}>
                      <Rect
                        x={wallRect.x}
                        y={wallRect.y}
                        width={wallRect.w}
                        height={wallRect.h}
                        fill={isSelected ? '#3b82f6' : '#1a1a1a'}
                        draggable={canvas.tool === 'select'}
                        onDragEnd={(ev) => {
                          const node = ev.target
                          let newX1: number
                          let newY1: number
                          if (isHorizontal) {
                            newX1 = (node.x() - PLAN_OFFSET_X) / SCALE
                            newY1 = (node.y() + renderThickness / 2 - PLAN_OFFSET_Y) / SCALE
                          } else {
                            newX1 = (node.x() + renderThickness / 2 - PLAN_OFFSET_X) / SCALE
                            newY1 = (node.y() - PLAN_OFFSET_Y) / SCALE
                          }
                          canvas.moveWallTo(wall.id, newX1, newY1)
                          canvas.finalizeWallMove()
                        }}
                        onClick={(ev) => {
                          ev.cancelBubble = true
                          if (canvas.tool === 'delete') {
                            canvas.selectElement(wall.id, 'wall')
                            setTimeout(() => canvas.deleteSelected(), 0)
                          } else {
                            canvas.selectElement(wall.id, 'wall')
                          }
                        }}
                      />
                    </Group>
                  )
                })}

                {canvas.state.windows.map((win) => {
                  const px1 = PLAN_OFFSET_X + m(win.x1)
                  const py1 = PLAN_OFFSET_Y + m(win.y1)
                  const px2 = PLAN_OFFSET_X + m(win.x2)
                  const py2 = PLAN_OFFSET_Y + m(win.y2)
                  const isHorizontal = win.y1 === win.y2
                  const isSelected = canvas.selectedId === win.id

                  if (isHorizontal) {
                    const y = py1
                    return (
                      <Group
                        key={`win-${win.id}`}
                        draggable={canvas.tool === 'select'}
                        onDragEnd={(ev) => {
                          const node = ev.target
                          const absPos = node.getAbsolutePosition()
                          const newX = (absPos.x / scale - stagePos.x / scale - PLAN_OFFSET_X) / SCALE
                          const newY = (absPos.y / scale - stagePos.y / scale - PLAN_OFFSET_Y) / SCALE
                          canvas.moveWindow(win.id, newX, newY)
                          canvas.finalizeWindowMove()
                        }}
                      >
                        <Rect x={Math.min(px1, px2)} y={y - 5} width={Math.abs(px2 - px1)} height={10} fill="#ffffff" />
                        <Line points={[px1, y - 3, px2, y - 3]} stroke={isSelected ? '#3b82f6' : '#1a1a1a'} strokeWidth={1.5} />
                        <Line points={[px1, y + 3, px2, y + 3]} stroke={isSelected ? '#3b82f6' : '#1a1a1a'} strokeWidth={1.5} />
                        <Rect
                          x={Math.min(px1, px2)}
                          y={y - 8}
                          width={Math.abs(px2 - px1)}
                          height={16}
                          fill="transparent"
                          onClick={(ev) => {
                            ev.cancelBubble = true
                            if (canvas.tool === 'delete') {
                              canvas.selectElement(win.id, 'window')
                              setTimeout(() => canvas.deleteSelected(), 0)
                            } else {
                              canvas.selectElement(win.id, 'window')
                            }
                          }}
                        />
                      </Group>
                    )
                  }
                  const x = px1
                  return (
                    <Group
                      key={`win-${win.id}`}
                      draggable={canvas.tool === 'select'}
                      onDragEnd={(ev) => {
                        const node = ev.target
                        const absPos = node.getAbsolutePosition()
                        const newX = (absPos.x / scale - stagePos.x / scale - PLAN_OFFSET_X) / SCALE
                        const newY = (absPos.y / scale - stagePos.y / scale - PLAN_OFFSET_Y) / SCALE
                        canvas.moveWindow(win.id, newX, newY)
                        canvas.finalizeWindowMove()
                      }}
                    >
                      <Rect x={x - 5} y={Math.min(py1, py2)} width={10} height={Math.abs(py2 - py1)} fill="#ffffff" />
                      <Line points={[x - 3, py1, x - 3, py2]} stroke={isSelected ? '#3b82f6' : '#1a1a1a'} strokeWidth={1.5} />
                      <Line points={[x + 3, py1, x + 3, py2]} stroke={isSelected ? '#3b82f6' : '#1a1a1a'} strokeWidth={1.5} />
                      <Rect
                        x={x - 8}
                        y={Math.min(py1, py2)}
                        width={16}
                        height={Math.abs(py2 - py1)}
                        fill="transparent"
                        onClick={(ev) => {
                          ev.cancelBubble = true
                          if (canvas.tool === 'delete') {
                            canvas.selectElement(win.id, 'window')
                            setTimeout(() => canvas.deleteSelected(), 0)
                          } else {
                            canvas.selectElement(win.id, 'window')
                          }
                        }}
                      />
                    </Group>
                  )
                })}

                {canvas.state.doors.map((door) => {
                  const px = PLAN_OFFSET_X + m(door.x)
                  const py = PLAN_OFFSET_Y + m(door.y)
                  const doorW = m(door.width)
                  const isSelected = canvas.selectedId === door.id
                  const doorLabel = door.label ?? door.purpose ?? ''
                  const metaWallThicknessM = canvas.state.meta?.defaultWallThickness ?? 0.2
                  const wallPx = m(metaWallThicknessM)
                  return (
                    <Group
                      key={`door-${door.id}`}
                      x={px}
                      y={py}
                      rotation={door.rotation}
                      draggable={canvas.tool === 'select'}
                      onDragEnd={(ev) => {
                        const node = ev.target
                        const absPos = node.getAbsolutePosition()
                        const newX = (absPos.x / scale - stagePos.x / scale - PLAN_OFFSET_X) / SCALE
                        const newY = (absPos.y / scale - stagePos.y / scale - PLAN_OFFSET_Y) / SCALE
                        canvas.moveDoor(door.id, newX, newY)
                        canvas.finalizeDoorMove()
                      }}
                      onClick={(ev) => {
                        ev.cancelBubble = true
                        if (canvas.tool === 'delete') {
                          canvas.selectElement(door.id, 'door')
                          setTimeout(() => canvas.deleteSelected(), 0)
                        } else {
                          canvas.selectElement(door.id, 'door')
                        }
                      }}
                    >
                      {/* "Cut" the wall behind the door opening */}
                      <Line points={[0, 0, doorW, 0]} stroke="#ffffff" strokeWidth={wallPx + 4} />
                      {/* Door panel line */}
                      <Line points={[0, 0, 0, doorW]} stroke={isSelected ? '#3b82f6' : '#1a1a1a'} strokeWidth={1.5} />
                      <Arc
                        x={0}
                        y={0}
                        innerRadius={doorW}
                        outerRadius={doorW}
                        angle={90}
                        rotation={0}
                        stroke={isSelected ? '#3b82f6' : '#1a1a1a'}
                        strokeWidth={1}
                      />
                      {doorLabel ? (
                        <Text
                          x={0}
                          y={8}
                          width={doorW}
                          text={String(doorLabel)}
                          fontSize={9}
                          fill={isSelected ? '#3b82f6' : '#334155'}
                          align="center"
                          listening={false}
                        />
                      ) : null}
                      <Rect x={-4} y={-doorW} width={doorW + 8} height={doorW + 8} fill="transparent" />
                    </Group>
                  )
                })}

                {canvas.state.stairs.map((stair) => {
                  const sx = PLAN_OFFSET_X + m(stair.x)
                  const sy = PLAN_OFFSET_Y + m(stair.y)
                  const sw = m(stair.width)
                  const sh = m(stair.height)
                  const isSelected = canvas.selectedId === stair.id
                  const numSteps = 8
                  return (
                    <Group
                      key={`stair-${stair.id}`}
                      x={sx}
                      y={sy}
                      draggable={canvas.tool === 'select'}
                      onDragEnd={(ev) => {
                        const node = ev.target
                        const newX = (node.x() - PLAN_OFFSET_X) / SCALE
                        const newY = (node.y() - PLAN_OFFSET_Y) / SCALE
                        canvas.moveStairs(stair.id, newX, newY)
                        canvas.finalizeStairsMove()
                      }}
                      onClick={(ev) => {
                        ev.cancelBubble = true
                        if (canvas.tool === 'delete') {
                          canvas.selectElement(stair.id, 'stairs')
                          setTimeout(() => canvas.deleteSelected(), 0)
                        } else {
                          canvas.selectElement(stair.id, 'stairs')
                        }
                      }}
                    >
                      {Array.from({ length: numSteps }).map((_, i) => (
                        <Line
                          key={`step-${i}`}
                          points={[4, 4 + i * ((sh - 8) / numSteps), sw - 4, 4 + i * ((sh - 8) / numSteps)]}
                          stroke={isSelected ? '#3b82f6' : '#666666'}
                          strokeWidth={0.8}
                        />
                      ))}
                      <Rect x={0} y={0} width={sw} height={sh} fill="transparent" />
                    </Group>
                  )
                })}

                {canvas.state.furniture.map((item) => (
                  <FurnitureRenderer
                    key={`furn-${item.id}`}
                    item={item}
                    isSelected={canvas.selectedId === item.id}
                    tool={canvas.tool}
                    onSelect={() => canvas.selectElement(item.id, 'furniture')}
                    onDelete={() => {
                      canvas.selectElement(item.id, 'furniture')
                      setTimeout(() => canvas.deleteSelected(), 0)
                    }}
                    onDragMove={(x, y) => canvas.moveFurniture(item.id, x, y)}
                    onDragEnd={(x, y) => {
                      canvas.moveFurniture(item.id, x, y)
                      canvas.finalizeFurnitureMove()
                    }}
                    scale={scale}
                    stagePos={stagePos}
                  />
                ))}

                {selectedRoom && canvas.tool === 'select' && renderResizeHandles(selectedRoom)}

                {canvas.tool === 'addWall' && wallDrawStart && (
                  <Circle
                    x={PLAN_OFFSET_X + m(wallDrawStart.x)}
                    y={PLAN_OFFSET_Y + m(wallDrawStart.y)}
                    radius={4}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                )}
              </Layer>
            </Stage>

            <div className="designer-coords">
              X: {cursorPos.x.toFixed(1)}m, Y: {cursorPos.y.toFixed(1)}m
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

