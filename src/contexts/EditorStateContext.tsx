/* eslint-disable react-refresh/only-export-components */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EDITOR STATE CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Manages the core editor state: DXF document, walls, and undo history.
 * 
 * WHAT IT PROVIDES:
 * - planDoc: Current DXF document
 * - walls: Array of wall segments for rendering
 * - history: Undo stack (last 20 snapshots)
 * - Actions: setPlanDoc, setWalls, snapshot, undo
 * 
 * WHY SEPARATE:
 * - Cleaner component code
 * - State can be shared across multiple components
 * - Easier to test state logic
 * - Easier to add features (redo, auto-save, etc.)
 * 
 * USAGE:
 * ```tsx
 * function MyComponent() {
 *   const { planDoc, walls, snapshot, undo } = useEditorState()
 *   // Use state and actions
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { DxfJsonDocument } from '@/constants/dxfJsonData'
import type { WallSeg } from '@/utils/wallsFromDxfJson'
import { cloneDoc } from '@/utils/dxfDocumentUtils'
import type { EditorSnapshot } from './types'

/**
 * Editor state context value
 */
interface EditorStateContextValue {
  // Current state
  planDoc: DxfJsonDocument
  walls: WallSeg[]
  history: EditorSnapshot[]
  
  // Actions
  setPlanDoc: (doc: DxfJsonDocument | ((prev: DxfJsonDocument) => DxfJsonDocument)) => void
  setWalls: (walls: WallSeg[] | ((prev: WallSeg[]) => WallSeg[])) => void
  snapshot: () => void
  undo: () => void
  
  // Computed
  canUndo: boolean
}

const EditorStateContext = createContext<EditorStateContextValue | null>(null)

/**
 * Hook to access editor state
 * 
 * @throws Error if used outside EditorStateProvider
 * 
 * @example
 * const { planDoc, walls, snapshot, undo } = useEditorState()
 */
function useEditorState() {
  const context = useContext(EditorStateContext)
  if (!context) {
    throw new Error('useEditorState must be used within EditorStateProvider')
  }
  return context
}

/**
 * Provider props
 */
interface EditorStateProviderProps {
  children: ReactNode
  initialDoc: DxfJsonDocument
  initialWalls: WallSeg[]
}

/**
 * Editor State Provider
 * 
 * Wraps the editor component to provide state management.
 * 
 * @example
 * <EditorStateProvider initialDoc={DXF_JSON_DATA} initialWalls={walls}>
 *   <DxfJsonViewPage />
 * </EditorStateProvider>
 */
function EditorStateProvider({ 
  children, 
  initialDoc, 
  initialWalls 
}: EditorStateProviderProps) {
  const [planDoc, setPlanDoc] = useState<DxfJsonDocument>(() => ({ ...initialDoc }))
  const [walls, setWalls] = useState<WallSeg[]>(initialWalls)
  const [history, setHistory] = useState<EditorSnapshot[]>([])

  /**
   * Save current state to undo history
   * Keeps last 20 snapshots
   */
  const snapshot = useCallback(() => {
    setHistory(h => [
      ...h.slice(-19), // Keep last 19
      {
        walls: walls.map(w => ({ ...w, start: { ...w.start }, end: { ...w.end } })),
        planDoc: cloneDoc(planDoc),
      }
    ])
  }, [walls, planDoc])

  /**
   * Undo last action
   * Restores previous snapshot from history
   */
  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h
      
      const snap = h[h.length - 1]
      setWalls(snap.walls.map(w => ({ ...w, start: { ...w.start }, end: { ...w.end } })))
      setPlanDoc(cloneDoc(snap.planDoc))
      
      return h.slice(0, -1)
    })
  }, [])

  const value: EditorStateContextValue = {
    planDoc,
    walls,
    history,
    setPlanDoc,
    setWalls,
    snapshot,
    undo,
    canUndo: history.length > 0,
  }

  return (
    <EditorStateContext.Provider value={value}>
      {children}
    </EditorStateContext.Provider>
  )
}

export { EditorStateProvider, useEditorState }
