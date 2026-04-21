/* eslint-disable react-refresh/only-export-components */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SELECTION STATE CONTEXT
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Manages what's currently selected in the editor.
 * 
 * WHAT IT PROVIDES:
 * - selectedIds: Set of selected wall/text/arc IDs
 * - selectedRoomIndex: Currently selected room
 * - selectedTextHandle: Currently selected text label
 * - selectedArcHandle: Currently selected arc
 * - selectedWinKey: Currently selected window group
 * - selectedFurnKey: Currently selected furniture group
 * - Actions: select, deselect, toggle, clear
 * 
 * WHY SEPARATE:
 * - Selection logic is complex
 * - Multiple components need selection state
 * - Easier to implement multi-select, group select
 * - Can add selection history (select previous)
 * 
 * USAGE:
 * ```tsx
 * function Wall({ id }) {
 *   const { selectedIds, toggleSelection } = useSelection()
 *   const isSelected = selectedIds.has(id)
 *   return <Line onClick={() => toggleSelection(id)} />
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

/**
 * Selection state context value
 */
interface SelectionStateContextValue {
  // Multi-select (walls, texts, arcs)
  selectedIds: Set<string>
  setSelectedIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void
  
  // Single selections
  selectedRoomIndex: number | null
  setSelectedRoomIndex: (index: number | null) => void
  selectedTextHandle: string | null
  setSelectedTextHandle: (handle: string | null) => void
  selectedArcHandle: string | null
  setSelectedArcHandle: (handle: string | null) => void
  selectedWinKey: string | null
  setSelectedWinKey: (key: string | null) => void
  selectedFurnKey: string | null
  setSelectedFurnKey: (key: string | null) => void
  
  // Helper actions
  selectOne: (id: string) => void
  deselectOne: (id: string) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  selectMultiple: (ids: string[]) => void
  
  // Computed
  hasSelection: boolean
  selectionCount: number
}

const SelectionStateContext = createContext<SelectionStateContextValue | null>(null)

/**
 * Hook to access selection state
 * 
 * @throws Error if used outside SelectionStateProvider
 * 
 * @example
 * const { selectedIds, toggleSelection, clearSelection } = useSelection()
 */
export function useSelection() {
  const context = useContext(SelectionStateContext)
  if (!context) {
    throw new Error('useSelection must be used within SelectionStateProvider')
  }
  return context
}

/**
 * Provider props
 */
interface SelectionStateProviderProps {
  children: ReactNode
}

/**
 * Selection State Provider
 * 
 * Wraps the editor to provide selection state management.
 * 
 * @example
 * <SelectionStateProvider>
 *   <DxfJsonViewPage />
 * </SelectionStateProvider>
 */
export function SelectionStateProvider({ children }: SelectionStateProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedRoomIndex, setSelectedRoomIndex] = useState<number | null>(null)
  const [selectedTextHandle, setSelectedTextHandle] = useState<string | null>(null)
  const [selectedArcHandle, setSelectedArcHandle] = useState<string | null>(null)
  const [selectedWinKey, setSelectedWinKey] = useState<string | null>(null)
  const [selectedFurnKey, setSelectedFurnKey] = useState<string | null>(null)

  /**
   * Select a single ID (adds to selection)
   */
  const selectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  /**
   * Deselect a single ID (removes from selection)
   */
  const deselectOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  /**
   * Toggle selection of a single ID
   */
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setSelectedRoomIndex(null)
    setSelectedTextHandle(null)
    setSelectedArcHandle(null)
    setSelectedWinKey(null)
    setSelectedFurnKey(null)
  }, [])

  /**
   * Select multiple IDs at once
   */
  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids))
  }, [])

  const value: SelectionStateContextValue = {
    selectedIds,
    setSelectedIds,
    selectedRoomIndex,
    setSelectedRoomIndex,
    selectedTextHandle,
    setSelectedTextHandle,
    selectedArcHandle,
    setSelectedArcHandle,
    selectedWinKey,
    setSelectedWinKey,
    selectedFurnKey,
    setSelectedFurnKey,
    selectOne,
    deselectOne,
    toggleSelection,
    clearSelection,
    selectMultiple,
    hasSelection: selectedIds.size > 0 || selectedRoomIndex !== null || selectedTextHandle !== null || selectedArcHandle !== null || selectedWinKey !== null || selectedFurnKey !== null,
    selectionCount: selectedIds.size,
  }

  return (
    <SelectionStateContext.Provider value={value}>
      {children}
    </SelectionStateContext.Provider>
  )
}
