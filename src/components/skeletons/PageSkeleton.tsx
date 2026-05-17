import { Skeleton, SkeletonText, Island, Toolbar } from '../../ui';

export function PageSkeleton() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <Toolbar>
          <Toolbar.Left>
            <Skeleton width={140} height={20} radius={6} />
          </Toolbar.Left>
          <Toolbar.Right style={{ gap: 8 }}>
            <Skeleton width={90} height={32} radius={8} />
            <Skeleton width={110} height={32} radius={8} />
          </Toolbar.Right>
        </Toolbar>
        <Island flex={false} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SkeletonText width="60%" height={16} />
          <SkeletonText width="40%" height={12} />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Skeleton width={60} height={22} radius={100} />
            <Skeleton width={80} height={22} radius={100} />
          </div>
        </Island>
        <Island flex={false} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 0',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}
            >
              <Skeleton width={12} height={12} circle />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <SkeletonText width={`${55 - i * 10}%`} />
                <SkeletonText width={`${35 - i * 5}%`} height={11} />
              </div>
              <Skeleton width={52} height={12} radius={4} />
            </div>
          ))}
        </Island>
      </div>
    </div>
  );
}
