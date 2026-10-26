import type { HTMLAttributes } from 'react';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'blue' | 'success' | 'warning' | 'danger' | 'neutral';
};

export function Badge({ className = '', tone = 'blue', ...props }: BadgeProps) {
  return <span className={`badge badge--${tone} ${className}`} {...props} />;
}

