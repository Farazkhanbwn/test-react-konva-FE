/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONTEXTS INDEX
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Central export point for all context providers and hooks.
 * 
 * USAGE:
 * ```tsx
 * import { 
 *   EditorStateProvider, 
 *   useEditorState,
 *   ToolStateProvider,
 *   useToolState 
 * } from './contexts'
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export {
  EditorStateProvider,
  useEditorState,
} from './EditorStateContext'

export {
  ToolStateProvider,
  useToolState,
} from './ToolStateContext'

export {
  SelectionStateProvider,
  useSelection,
} from './SelectionStateContext'

// Export types from separate file
export type { EditorSnapshot, Tool, Units } from './types'
