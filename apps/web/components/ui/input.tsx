import type { ComponentProps } from 'react';

export function Input({ className = '', ...props }: Readonly<ComponentProps<'input'>>) {
  return <input className={`input ${className}`} {...props} />;
}

