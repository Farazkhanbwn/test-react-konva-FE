import { useMemo, useState } from 'react'
import {
  FURNITURE_DXF_CATEGORIES,
  type FurnitureDxfCategory,
  searchFurnitureTemplates,
  templatesForCategory,
} from '@/data/furnitureLibraryDxf'

/** Drag payload — read in canvas `drop` handler. */
export const FURNITURE_DXF_DRAG_MIME = 'application/x-furniture-dxf-id'

export type FurnitureLibraryPanelProps = {
  className?: string
}

export function FurnitureLibraryPanel({ className }: FurnitureLibraryPanelProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Set<FurnitureDxfCategory>>(
    () => new Set([...FURNITURE_DXF_CATEGORIES]),
  )

  const filteredBySearch = useMemo(() => searchFurnitureTemplates(query), [query])

  const toggleCategory = (c: FurnitureDxfCategory) => {
    setOpen(prev => {
      const next = new Set(prev)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  return (
    <div className={['dxf-furniture-library', className].filter(Boolean).join(' ')}>
      <div className="dxf-furniture-library-header">Furniture Library</div>

      <div className="dxf-furniture-library-search-wrap">
        <span className="dxf-furniture-library-search-icon" aria-hidden>⌕</span>
        <input
          type="search"
          className="dxf-furniture-library-search"
          placeholder="Search furniture…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search furniture"
        />
      </div>

      <div className="dxf-furniture-library-accordion" role="navigation" aria-label="Furniture categories">
        {FURNITURE_DXF_CATEGORIES.map(category => {
          const items = query.trim()
            ? filteredBySearch.filter(t => t.category === category)
            : templatesForCategory(category)
          const expanded = open.has(category)
          if (query.trim() && items.length === 0) return null

          return (
            <div key={category} className="dxf-furniture-library-cat">
              <button
                type="button"
                className="dxf-furniture-library-cat-toggle"
                aria-expanded={expanded}
                onClick={() => toggleCategory(category)}
              >
                <span>{category}</span>
                <span className={`dxf-furniture-library-chevron${expanded ? ' open' : ''}`} aria-hidden>
                  ▼
                </span>
              </button>
              {expanded && (
                <ul className="dxf-furniture-library-items" role="list">
                  {items.map(item => (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        className="dxf-furniture-library-item"
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData(FURNITURE_DXF_DRAG_MIME, item.id)
                          e.dataTransfer.effectAllowed = 'copy'
                        }}
                        onKeyDown={ev => {
                          if (ev.key === 'Enter' || ev.key === ' ') {
                            ev.preventDefault()
                            /* optional: focus canvas hint only — primary interaction is drag */
                          }
                        }}
                      >
                        <span className="dxf-furniture-library-item-grip" aria-hidden>⋮⋮</span>
                        <span className="dxf-furniture-library-item-label">{item.label}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      <div className="dxf-furniture-library-layers">
        <div className="dxf-furniture-library-layers-title">Layers</div>
        <div className="dxf-furniture-library-layer-row">
          <span className="dxf-furniture-library-layer-dot" aria-hidden />
          <span>Floor Plan</span>
        </div>
      </div>
    </div>
  )
}
