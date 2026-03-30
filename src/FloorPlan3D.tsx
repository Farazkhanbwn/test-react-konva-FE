import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import './App.css'
import { DEMO_FLOOR_PLAN } from '@/demoFloorPlanData'

const WALL_COLOR = '#cbd5e1'

function toWorld(x: number, y: number) {
  // in 2D we treat +y as "down"; in 3D we map it to -z
  return { x, z: -y }
}

function RoomSlab({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const center = toWorld(x + w / 2, y + h / 2)
  return (
    <mesh position={[center.x, 0.02, center.z]} receiveShadow>
      <boxGeometry args={[w, 0.04, h]} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

function WallBox({
  x1,
  y1,
  x2,
  y2,
  height,
  thickness,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  height: number
  thickness: number
}) {
  const isHorizontal = Math.abs(y2 - y1) < 1e-6
  const length = isHorizontal ? Math.abs(x2 - x1) : Math.abs(y2 - y1)
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const c = toWorld(cx, cy)
  const w = isHorizontal ? length : thickness
  const d = isHorizontal ? thickness : length
  return (
    <mesh position={[c.x, height / 2, c.z]} castShadow receiveShadow>
      <boxGeometry args={[w, height, d]} />
      <meshStandardMaterial color={WALL_COLOR} />
    </mesh>
  )
}

export function FloorPlan3D() {
  const meta = DEMO_FLOOR_PLAN.meta
  const wallHeight = meta.defaultWallHeight ?? 2.8

  // Compute ground plane bounds from rooms + walls
  const bounds = (() => {
    const xs: number[] = []
    const ys: number[] = []
    for (const r of DEMO_FLOOR_PLAN.rooms) {
      xs.push(r.x, r.x + r.width)
      ys.push(r.y, r.y + r.height)
    }
    for (const w of DEMO_FLOOR_PLAN.walls) {
      xs.push(w.x1, w.x2)
      ys.push(w.y1, w.y2)
    }
    const minX = Math.min(...xs, 0)
    const maxX = Math.max(...xs, 12)
    const minY = Math.min(...ys, 0)
    const maxY = Math.max(...ys, 8)
    return { minX, maxX, minY, maxY }
  })()

  const planeW = (bounds.maxX - bounds.minX) + 4
  const planeH = (bounds.maxY - bounds.minY) + 4
  const planeCenter = toWorld((bounds.minX + bounds.maxX) / 2, (bounds.minY + bounds.maxY) / 2)

  return (
    <div className="app">
      <header className="app-header">
        <h1>3D Floor Plan Preview</h1>
        <p>{meta.projectName}</p>
      </header>

      <div className="canvas-wrapper-3d">
        <Canvas camera={{ position: [8, 6, 8], fov: 45 }}>
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 4]} intensity={0.8} castShadow />

          <mesh position={[planeCenter.x, 0, planeCenter.z]} rotation-x={-Math.PI / 2} receiveShadow>
            <planeGeometry args={[planeW, planeH]} />
            <meshStandardMaterial color="#1e293b" />
          </mesh>

          {DEMO_FLOOR_PLAN.rooms.map((room) => (
            <RoomSlab
              key={room.id}
              x={room.x}
              y={room.y}
              w={room.width}
              h={room.height}
              color={room.floorColor ?? room.floor?.color ?? '#e2e8f0'}
            />
          ))}

          {DEMO_FLOOR_PLAN.walls.map((w) => (
            <WallBox
              key={w.id}
              x1={w.x1}
              y1={w.y1}
              x2={w.x2}
              y2={w.y2}
              height={w.wallHeight ?? wallHeight}
              thickness={w.wallThickness3d ?? w.thickness ?? meta.defaultWallThickness}
            />
          ))}

          <OrbitControls enableDamping />
        </Canvas>
      </div>
    </div>
  )
}

