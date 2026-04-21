/**
 * DxfCanvas Layer Components
 * 
 * These are example layer components demonstrating how to use Phase 2 contexts
 * and Phase 3 hooks to build modular, reusable canvas layers.
 * 
 * Usage:
 * ```tsx
 * import { FurnitureLayer, WallsLayer, RoomsLayer } from '@/components/DxfCanvas'
 * 
 * function MyEditor() {
 *   return (
 *     <EditorStateProvider initialDoc={doc} initialWalls={walls}>
 *       <ToolStateProvider>
 *         <SelectionStateProvider>
 *           <Stage>
 *             <RoomsLayer {...props} />
 *             <WallsLayer {...props} />
 *             <FurnitureLayer {...props} />
 *           </Stage>
 *         </SelectionStateProvider>
 *       </ToolStateProvider>
 *     </EditorStateProvider>
 *   )
 * }
 * ```
 */

export { FurnitureLayer } from './FurnitureLayer'
export { WallsLayer } from './WallsLayer'
export { RoomsLayer } from './RoomsLayer'
