type SkeletonProps = Readonly<{
  className?: string;
  width?: string;
}>;

export function Skeleton({ className = "", width }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={width ? { width } : undefined}
    />
  );
}
