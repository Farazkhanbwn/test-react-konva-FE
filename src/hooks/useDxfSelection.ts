/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SELECTION HOOK (Phase 3.1)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * Provides high-level selection operations combining EditorState and SelectionState.
 * 
 * WHAT IT PROVIDES:
 * - selectWalls: Select multiple walls by IDs
 * - selectFurniture: Select a furniture group
 * - selectWindow: Select a window group
 * - selectArc: Select an arc
 * - selectText: Select a text label
 * - selectRoom: Select a room by index
 * - toggleWallSelection: Toggle wall selection with Ctrl support
 * - clearAll: Clear all selections
 * 
 * WHY SEPARATE:
 * - Encapsulates complex selection logic
 * - Combines multiple context states
 * - Easier to add features (select similar, select all, etc.)
 * - Testable selection behavior
 * 
 * USAGE:
 * ```tsx
 * function Wall({ id }) {
 *   const { toggleWallSelection, isWallSelected } = useDxfSelection()
 *   return <Line onClick={(e) => toggleWallSelection(id, e.evt.ctrlKey)} />
 * }
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react'
import { useEditorState } from '@/contexts/EditorStateContext'
import { useSelection } from '@/contexts/SelectionStateContext'
import { getGroupWallIds } from '@/utils/dxfSelection'
import { roomLabelHandle } from '@/utils/dxfDocumentUtils'

export function useDxfSelection() {
  const { walls, planDoc } = useEditorState()
  const {
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
    clearSelection,
  } = useSelection()

  /**
   * Select multiple walls by IDs
   */
  const selectWalls = useCallback((wallIds: string[], additive = false) => {
    setSelectedIds(prev => {
      if (additive) {
        const next = new Set(prev)
        wallIds.forEach(id => next.add(id))
        return next
      }
      return new Set(wallIds)
    })
    setSelectedRoomIndex(null)
    setSelectedTextHandle(null)
    setSelectedArcHandle(null)
    setSelectedWinKey(null)
    setSelectedFurnKey(null)
  }, [setSelectedIds, setSelectedRoomIndex, setSelectedTextHandle, setSelectedArcHandle, setSelectedWinKey, setSelectedFurnKey])

  /**
   * Select a wall with group expansion and Ctrl support
   */
  const toggleWallSelection = useCallback((wallId: string, isCtrl: boolean) => {
    const groupIds = getGroupWallIds(wallId, walls)
    
    // If this polyline has a linked room label, include it
    const wall = walls.find(w => w.id === wallId)
    if (wall?.groupId?.startsWith('pl-')) {
      const lbl = roomLabelHandle(wall.groupId.slice(3))
      if (planDoc.texts.some(tx => tx.handle === lbl)) {
        groupIds.push(lbl)
      }
    }

    setSelectedIds(prev => {
      if (isCtrl) {
        const next = new Set(prev)
        // If any ID in the group is selected, deselect all
        if (groupIds.some(id => prev.has(id))) {
          groupIds.forEach(id => next.delete(id))
        } else {
          groupIds.forEach(id => next.add(id))
        }
        return next
      }
      return new Set(groupIds)
    })

    setSelectedRoomIndex(null)
    setSelectedTextHandle(null)
    setSelectedArcHandle(null)
    setSelectedWinKey(null)
    setSelectedFurnKey(null)
  }, [walls, planDoc.texts, setSelectedIds, setSelectedRoomIndex, setSelectedTextHandle, setSelectedArcHandle, setSelectedWinKey, setSelectedFurnKey])

  /**
   * Select a furniture group
   */
  const selectFurniture = useCallback((furnKey: string) => {
    setSelectedFurnKey(furnKey)
    setSelectedIds(new Set())
    setSelectedWinKey(null)
    setSelectedArcHandle(null)
    setSelectedTextHandle(null)
    setSelectedRoomIndex(null)
  }, [setSelectedFurnKey, setSelectedIds, setSelectedWinKey, setSelectedArcHandle, setSelectedTextHandle, setSelectedRoomIndex])

  /**
   * Select a window group
   */
  const selectWindow = useCallback((winKey: string) => {
    setSelectedWinKey(winKey)
    setSelectedIds(new Set())
    setSelectedFurnKey(null)
    setSelectedArcHandle(null)
    setSelectedTextHandle(null)
    setSelectedRoomIndex(null)
  }, [setSelectedWinKey, setSelectedIds, setSelectedFurnKey, setSelectedArcHandle, setSelectedTextHandle, setSelectedRoomIndex])

  /**
   * Select an arc
   */
  const selectArc = useCallback((arcHandle: string, isCtrl: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(isCtrl ? prev : [])
      if (prev.has(arcHandle) && isCtrl) {
        next.delete(arcHandle)
      } else {
        next.add(arcHandle)
      }
      return next
    })
    setSelectedRoomIndex(null)
    setSelectedTextHandle(null)
  }, [setSelectedIds, setSelectedRoomIndex, setSelectedTextHandle])

  /**
   * Select a text label
   */
  const selectText = useCallback((textHandle: string, isCtrl: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(isCtrl ? prev : [])
      if (prev.has(textHandle) && isCtrl) {
        next.delete(textHandle)
      } else {
        next.add(textHandle)
      }
      return next
    })
    setSelectedTextHandle(prev => (prev === textHandle && !isCtrl ? null : textHandle))
    setSelectedRoomIndex(null)
  }, [setSelectedIds, setSelectedTextHandle, setSelectedRoomIndex])

  /**
   * Select a room by index
   */
  const selectRoom = useCallback((roomIndex: number | null) => {
    setSelectedRoomIndex(roomIndex)
    setSelectedIds(new Set())
    setSelectedTextHandle(null)
    setSelectedArcHandle(null)
    setSelectedWinKey(null)
    setSelectedFurnKey(null)
  }, [setSelectedRoomIndex, setSelectedIds, setSelectedTextHandle, setSelectedArcHandle, setSelectedWinKey, setSelectedFurnKey])

  /**
   * Check if a wall is selected
   */
  const isWallSelected = useCallback((wallId: string) => {
    return selectedIds.has(wallId)
  }, [selectedIds])

  /**
   * Check if any selection exists
   */
  const hasAnySelection = selectedIds.size > 0 || 
    selectedRoomIndex !== null || 
    selectedTextHandle !== null || 
    selectedArcHandle !== null || 
    selectedWinKey !== null || 
    selectedFurnKey !== null

  return {
    // State
    selectedIds,
    selectedRoomIndex,
    selectedTextHandle,
    selectedArcHandle,
    selectedWinKey,
    selectedFurnKey,
    hasAnySelection,
    
    // Actions
    selectWalls,
    toggleWallSelection,
    selectFurniture,
    selectWindow,
    selectArc,
    selectText,
    selectRoom,
    clearAll: clearSelection,
    isWallSelected,
  }
}
