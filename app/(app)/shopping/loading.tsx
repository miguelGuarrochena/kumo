import { Skeleton, SkeletonList } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="flex gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-28 rounded-full" />
      ))}
    </div>
    <Skeleton className="h-24 rounded-2xl" />
    <SkeletonList rows={5} />
  </div>
);

export default Loading;
