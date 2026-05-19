import { Skeleton, SkeletonList } from '@/components/Skeleton';

const Loading = () => (
  <div className="space-y-5">
    <div className="space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-60" />
    </div>
    <SkeletonList rows={6} />
  </div>
);

export default Loading;
