import { Skeleton, SkeletonText } from '../../ui';

export function TaskHistorySkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <SkeletonText width={180 - i * 30} />
              <SkeletonText width={120} height={11} />
            </div>
            <Skeleton width={70} height={20} radius={100} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <SkeletonText width="80%" height={12} />
            <SkeletonText width="60%" height={12} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Skeleton width={110} height={28} radius={8} />
            <Skeleton width={140} height={28} radius={8} />
          </div>
        </div>
      ))}
    </div>
  );
}
