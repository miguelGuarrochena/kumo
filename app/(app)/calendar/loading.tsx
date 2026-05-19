import { Skeleton } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-28 rounded-xl" />
    </div>
    <Skeleton className="h-12 rounded-xl" />
    <div className="kumo-card p-4 sm:p-5 space-y-3">
      <Skeleton className="h-6 w-32 mx-auto" />
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-3 mx-auto w-4" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 42 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square sm:min-h-[6rem]" />
        ))}
      </div>
    </div>
  </div>
);

export default Loading;
