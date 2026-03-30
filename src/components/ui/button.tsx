import type { ButtonHTMLAttributes } from 'react'

type Variant = 'default' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'icon'

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

export function Button({ className, variant = 'default', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      className={cx(
        'ui-btn',
        variant === 'default' && 'ui-btn--default',
        variant === 'outline' && 'ui-btn--outline',
        variant === 'ghost' && 'ui-btn--ghost',
        size === 'sm' && 'ui-btn--sm',
        size === 'md' && 'ui-btn--md',
        size === 'icon' && 'ui-btn--icon',
        className,
      )}
      {...props}
    />
  )
}

