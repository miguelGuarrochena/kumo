import { Skeleton, SkeletonList } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-28 rounded-xl" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-24" />
    </div>
    <SkeletonList rows={6} />
  </div>
);

export default Loading;
