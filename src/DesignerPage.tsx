import { Link } from 'react-router-dom'
import DesignCanvasSection from './DesignCanvasSection'
import './App.css'
import { useState } from 'react'
import { useDesignCanvasState } from '@/hooks/useDesignCanvasState'
import { DEMO_FLOOR_PLAN } from '@/demoFloorPlanData'
import { MIXED_USE_BUILDING, floorToCanvasState } from '@/mixedUseBuildingData'
import { Button } from '@/components/ui/button'
import type { CanvasState } from '@/hooks/useDesignCanvasState'
import { HOSPITAL_SAMPLE_PLAN } from '@/hospitalSamplePlanData'

function FloorCanvas({ data }: { data: CanvasState }) {
  const canvas = useDesignCanvasState(data)
  return <DesignCanvasSection canvasState={canvas} />
}

export function DesignerPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'mixed'>('single')
  const [activeFloorId, setActiveFloorId] = useState('floor-b1')
  const [singlePlan, setSinglePlan] = useState<CanvasState>(DEMO_FLOOR_PLAN)
  const [singlePlanKey, setSinglePlanKey] = useState(0)

  const selectedState = activeTab === 'single' ? singlePlan : floorToCanvasState(activeFloorId)
  const stateKey = activeTab === 'single' ? `single-${singlePlanKey}` : activeFloorId

  return (
    <div>
      <div className="button-row" style={{ marginBottom: '12px', justifyContent: 'flex-start' }}>
        <Button type="button" variant={activeTab === 'single' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('single')}>
          Single Floor Demo
        </Button>
        <Button type="button" variant={activeTab === 'mixed' ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab('mixed')}>
          Mixed-Use (6 Floors)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveTab('single')
            setSinglePlan(HOSPITAL_SAMPLE_PLAN)
            setSinglePlanKey((k) => k + 1)
          }}
        >
          Load Sample Hospital Plan
        </Button>
      </div>

      {activeTab === 'mixed' && (
        <div className="button-row" style={{ marginBottom: '12px', justifyContent: 'flex-start' }}>
          {MIXED_USE_BUILDING.floors.map((f) => (
            <Button
              key={f.id}
              type="button"
              variant={activeFloorId === f.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFloorId(f.id)}
            >
              {f.name}
            </Button>
          ))}
        </div>
      )}

      <FloorCanvas key={stateKey} data={selectedState} />

      <p className="dxf-back">
        <Link to="/">← Back to home</Link>
      </p>
    </div>
  )
}

