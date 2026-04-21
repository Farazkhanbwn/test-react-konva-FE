/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TOOL STATE CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Manages editor tool settings and UI state.
 * 
 * WHAT IT PROVIDES:
 * - activeTool: Current tool (select, hand, drawLine, etc.)
 * - snapEnabled: Snap to endpoints/midpoints
 * - orthoEnabled: Orthogonal mode (horizontal/vertical only)
 * - showDetail: Show detail lines (stairs, etc.)
 * - showLabels: Show room labels
 * - showFurnitureLabels: Show furniture labels
 * - units: Measurement units (m, cm, mm)
 * - strokeHex: Wall stroke color
 * - strokeScale: Wall thickness multiplier
 * 
 * WHY SEPARATE:
 * - Tool state is independent of document state
 * - Can be persisted to localStorage
 * - Easier to add new tools
 * - Cleaner component code
 * 
 * USAGE:
 * ```tsx
 * function Toolbar() {
 *   const { activeTool, setActiveTool } = useToolState()
 *   return <button onClick={() => setActiveTool('drawLine')}>Line</button>
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, ReactNode } from 'react'
import type { Tool, Units } from './types'

/**
 * Tool state context value
 */
interface ToolStateContextValue {
  // Tool selection
  activeTool: Tool
  setActiveTool: (tool: Tool) => void
  
  // Snap & ortho
  snapEnabled: boolean
  setSnapEnabled: (enabled: boolean) => void
  orthoEnabled: boolean
  setOrthoEnabled: (enabled: boolean) => void
  
  // Visibility toggles
  showDetail: boolean
  setShowDetail: (show: boolean) => void
  showLabels: boolean
  setShowLabels: (show: boolean) => void
  showFurnitureLabels: boolean
  setShowFurnitureLabels: (show: boolean) => void
  
  // Display settings
  units: Units
  setUnits: (units: Units) => void
  strokeHex: string
  setStrokeHex: (hex: string) => void
  strokeScale: number
  setStrokeScale: (scale: number) => void
}

const ToolStateContext = createContext<ToolStateContextValue | null>(null)

/**
 * Hook to access tool state
 * 
 * @throws Error if used outside ToolStateProvider
 * 
 * @example
 * const { activeTool, setActiveTool, snapEnabled } = useToolState()
 */
export function useToolState() {
  const context = useContext(ToolStateContext)
  if (!context) {
    throw new Error('useToolState must be used within ToolStateProvider')
  }
  return context
}

/**
 * Provider props
 */
interface ToolStateProviderProps {
  children: ReactNode
}

/**
 * Tool State Provider
 * 
 * Wraps the editor to provide tool state management.
 * 
 * @example
 * <ToolStateProvider>
 *   <DxfJsonViewPage />
 * </ToolStateProvider>
 */
export function ToolStateProvider({ children }: ToolStateProviderProps) {
  const [activeTool, setActiveTool] = useState<Tool>('select')
  const [snapEnabled, setSnapEnabled] = useState(true)
  const [orthoEnabled, setOrthoEnabled] = useState(false)
  const [showDetail, setShowDetail] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showFurnitureLabels, setShowFurnitureLabels] = useState(true)
  const [units, setUnits] = useState<Units>('m')
  const [strokeHex, setStrokeHex] = useState('#474747')
  const [strokeScale, setStrokeScale] = useState(1)

  const value: ToolStateContextValue = {
    activeTool,
    setActiveTool,
    snapEnabled,
    setSnapEnabled,
    orthoEnabled,
    setOrthoEnabled,
    showDetail,
    setShowDetail,
    showLabels,
    setShowLabels,
    showFurnitureLabels,
    setShowFurnitureLabels,
    units,
    setUnits,
    strokeHex,
    setStrokeHex,
    strokeScale,
    setStrokeScale,
  }

  return (
    <ToolStateContext.Provider value={value}>
      {children}
    </ToolStateContext.Provider>
  )
}
