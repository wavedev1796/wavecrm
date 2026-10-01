import type { ComponentProps } from "react";

export function Select({
  className = "",
  ...props
}: Readonly<ComponentProps<"select">>) {
  return <select className={`select-control ${className}`} {...props} />;
}
