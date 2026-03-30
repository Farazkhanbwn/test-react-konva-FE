import type { InputHTMLAttributes } from 'react'

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(' ')
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'ui-input',
        className,
      )}
      {...props}
    />
  )
}

