interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function StationCardSkeleton() {
  return (
    <div className="p-4 border rounded-xl bg-card">
      <div className="flex items-start gap-3">
        <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function StationListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <StationCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-4 border rounded-xl bg-card">
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-4 border rounded-xl bg-card">
      <Skeleton className="h-5 w-40 mb-4" />
      <div className="flex items-end gap-2 h-[200px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-sm" 
            style={{ height: `${30 + Math.random() * 60}%` }} 
          />
        ))}
      </div>
    </div>
  );
}
