import { Skeleton, SkeletonCard } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-60" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
    <SkeletonCard className="h-40" />
  </div>
);

export default Loading;
