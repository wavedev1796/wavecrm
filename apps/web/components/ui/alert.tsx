import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';

const ICONS = { error: CircleAlert, success: CircleCheck, note: Info };

type AlertProps = HTMLAttributes<HTMLElement> & { tone: keyof typeof ICONS };

/**
 * Mensaje de estado: los errores se anuncian de inmediato (`alert`); el resto usa `<output>`,
 * que ya trae el rol `status` y avisa sin interrumpir lo que la persona esté haciendo.
 */
export function Alert({ tone, className = '', children, ...props }: Readonly<AlertProps>) {
  const Icon = ICONS[tone];
  const Tag = tone === 'error' ? 'p' : 'output';
  return (
    <Tag
      role={tone === 'error' ? 'alert' : undefined}
      className={`alert alert--${tone} ${className}`}
      {...props}
    >
      <Icon aria-hidden />
      <span>{children}</span>
    </Tag>
  );
}
