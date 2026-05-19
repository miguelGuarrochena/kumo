// Componentes de placeholder con shimmer para usar mientras se carga data.
// Estilo Linear / Vercel: bg gris con animación pulse sutil.

type SkeletonProps = {
  className?: string;
};

export const Skeleton = ({ className = '' }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-slate-200 dark:bg-slate-700/60 rounded-md ${className}`}
    aria-hidden="true"
  />
);

export const SkeletonText = ({ lines = 1, className = '' }: { lines?: number; className?: string }) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3 ${i === lines - 1 && lines > 1 ? 'w-4/5' : 'w-full'}`}
      />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
  <div className={`kumo-card p-5 space-y-3 ${className}`} aria-hidden="true">
    <Skeleton className="h-5 w-1/3" />
    <SkeletonText lines={2} />
  </div>
);

export const SkeletonList = ({ rows = 4 }: { rows?: number }) => (
  <div className="kumo-card divide-y divide-slate-100 dark:divide-slate-700/50 overflow-hidden">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3.5">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="w-16 h-4 shrink-0" />
      </div>
    ))}
  </div>
);
