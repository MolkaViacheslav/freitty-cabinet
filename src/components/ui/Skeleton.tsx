type SkeletonProps = {
  className?: string;
};

/** Pulsing placeholder block for loading states — size/shape controlled entirely via className. */
export function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return <div className={`animate-pulse rounded-md bg-[#E5E7EB] ${className}`} />;
}
