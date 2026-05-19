import { Skeleton, SkeletonCard } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-80" />
    </div>
    {Array.from({ length: 5 }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default Loading;
