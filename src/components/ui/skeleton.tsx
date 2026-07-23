export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[6px] bg-muted ${className || ''}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[10px] border bg-card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-[10px] border bg-card p-4 flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-8 w-8 rounded-[6px]" />
        </div>
      ))}
    </div>
  );
}
