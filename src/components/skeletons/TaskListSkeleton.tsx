import { Skeleton, SkeletonText, Toolbar } from '../../ui';

const CARDS = [0, 1, 2, 3];

export function TaskListSkeleton() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <Toolbar>
          <Toolbar.Left style={{ flex: 1 }}>
            <Skeleton width="100%" height={36} radius={8} style={{ maxWidth: 500 }} />
          </Toolbar.Left>
          <Toolbar.Right style={{ gap: 8 }}>
            <Skeleton width={100} height={32} radius={8} />
            <Skeleton width={100} height={32} radius={8} />
          </Toolbar.Right>
        </Toolbar>
        <div style={{ display: 'flex', gap: 16 }}>
          <SkeletonText width={80} height={13} />
          <SkeletonText width={90} height={13} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CARDS.map((i) => (
            <div key={i} className="task-card" style={{ pointerEvents: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Skeleton width={70} height={20} radius={100} />
                  <Skeleton width={60} height={20} radius={100} />
                </div>
                <SkeletonText width={`${60 - i * 8}%`} height={15} />
                <SkeletonText width={`${40 - i * 5}%`} height={13} />
                {i < 2 && (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <Skeleton width={50} height={18} radius={100} />
                    <Skeleton width={65} height={18} radius={100} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 12 }}>
                  <Skeleton width={80} height={12} radius={4} />
                  <Skeleton width={50} height={12} radius={4} />
                </div>
              </div>
              <Skeleton width={20} height={20} radius={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
