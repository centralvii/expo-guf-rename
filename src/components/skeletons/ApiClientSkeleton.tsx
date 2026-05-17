import { Skeleton, SkeletonText, Island, Toolbar } from '../../ui';

export function ApiClientSkeleton() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content">
        <Toolbar>
          <Toolbar.Left>
            <Skeleton width={100} height={20} radius={6} />
          </Toolbar.Left>
          <Toolbar.Right>
            <Skeleton width={110} height={32} radius={8} />
          </Toolbar.Right>
        </Toolbar>
        <div className="api-workspace">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 8,
              border: '1px solid var(--border)',
              borderRadius: 10,
              background: 'var(--bg-card)',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={36} radius={8} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: 4,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            >
              <Skeleton width={120} height={30} radius={8} />
              <Skeleton width={100} height={30} radius={8} />
            </div>
            <Island flex={false} style={{ display: 'flex', gap: 8, padding: '8px 12px', alignItems: 'center' }}>
              <Skeleton width={80} height={32} radius={8} />
              <Skeleton width={70} height={32} radius={8} />
              <Skeleton height={32} radius={8} style={{ flex: 1 }} />
              <Skeleton width={100} height={32} radius={8} />
            </Island>
            <Island flex={false} style={{ padding: 0 }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {[80, 70, 90, 50].map((w, i) => (
                  <Skeleton key={i} width={w} height={36} radius={0} />
                ))}
              </div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <SkeletonText width="30%" />
                    <SkeletonText width="50%" />
                  </div>
                ))}
              </div>
            </Island>
            <Island flex={false} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SkeletonText width="20%" height={12} />
              <SkeletonText width="80%" />
              <SkeletonText width="60%" />
              <SkeletonText width="70%" />
            </Island>
          </div>
        </div>
      </div>
    </div>
  );
}
