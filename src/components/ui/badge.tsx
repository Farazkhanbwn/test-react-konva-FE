import type { HTMLAttributes } from 'react'

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

type Variant = 'secondary'

export function Badge({
  className,
  variant = 'secondary',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cx('ui-badge', variant === 'secondary' && 'ui-badge--secondary', className)}
      {...props}
    />
  )
}

