import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';

const ICONS = { error: CircleAlert, success: CircleCheck, note: Info };

type AlertProps = HTMLAttributes<HTMLParagraphElement> & { tone: keyof typeof ICONS };

/** Mensaje de estado: los errores se anuncian de inmediato (`alert`); el resto, sin interrumpir (`status`). */
export function Alert({ tone, className = '', children, ...props }: AlertProps) {
  const Icon = ICONS[tone];
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`alert alert--${tone} ${className}`}
      {...props}
    >
      <Icon aria-hidden />
      <span>{children}</span>
    </p>
  );
}
