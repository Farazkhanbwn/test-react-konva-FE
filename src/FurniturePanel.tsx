import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { FurnitureDefinition } from '@/data/furnitureLibrary'
import { furnitureLibrary } from '@/data/furnitureLibrary'

type Props = {
  onAddFurniture: (def: FurnitureDefinition) => void
}

export default function FurniturePanel({ onAddFurniture }: Props) {
  const [query, setQuery] = useState('')

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return furnitureLibrary
    return furnitureLibrary.filter(
      (x) => x.label.toLowerCase().includes(q) || x.type.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div>
      <h3 className="font-semibold text-sm text-foreground mb-2">Furniture</h3>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search furniture…"
        className="text-xs h-8"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        {items.map((def) => (
          <Button
            key={def.type}
            variant="outline"
            size="sm"
            className="text-[11px] h-7 px-2 justify-start"
            onClick={() => onAddFurniture(def)}
            type="button"
          >
            {def.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

