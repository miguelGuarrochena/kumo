import { Skeleton, SkeletonCard } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72" />
    </div>
    <Skeleton className="h-12 rounded-xl" />
    <SkeletonCard className="h-72" />
    <SkeletonCard className="h-72" />
  </div>
);

export default Loading;
