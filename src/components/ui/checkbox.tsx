import type { InputHTMLAttributes } from 'react'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> & {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export function Checkbox({ checked, onCheckedChange, ...props }: Props) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  )
}

