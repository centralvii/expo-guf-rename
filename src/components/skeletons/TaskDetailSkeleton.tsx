import { Skeleton, SkeletonText, Island, Toolbar } from '../../ui';

export function TaskDetailSkeleton() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <Toolbar>
          <Toolbar.Left style={{ gap: 8 }}>
            <Skeleton width={32} height={32} radius={8} />
            <Skeleton width={200} height={20} radius={6} />
          </Toolbar.Left>
          <Toolbar.Right style={{ gap: 8 }}>
            <Skeleton width={90} height={32} radius={8} />
            <Skeleton width={100} height={32} radius={8} />
            <Skeleton width={90} height={32} radius={8} />
          </Toolbar.Right>
        </Toolbar>
        <Island flex={false} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton width={80} height={22} radius={100} />
            <Skeleton width={70} height={22} radius={100} />
          </div>
          <SkeletonText width="60%" height={22} />
          <SkeletonText width="80%" />
          <div style={{ display: 'flex', gap: 6 }}>
            <Skeleton width={55} height={20} radius={100} />
            <Skeleton width={70} height={20} radius={100} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            <SkeletonText width={160} height={12} />
            <SkeletonText width={140} height={12} />
          </div>
        </Island>
        {[0, 1].map((i) => (
          <Island
            key={i}
            flex={false}
            style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            <SkeletonText width={`${35 + i * 10}%`} height={16} />
            <SkeletonText width="90%" height={13} />
            <SkeletonText width="75%" height={13} />
            <SkeletonText width="60%" height={13} />
          </Island>
        ))}
      </div>
    </div>
  );
}
