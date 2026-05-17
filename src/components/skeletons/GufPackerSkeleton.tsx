import { Skeleton, SkeletonText, SkeletonCircle, Island } from '../../ui';

export function GufPackerSkeleton() {
  return (
    <div className="tool-page anim-fade-in">
      <div className="tool-page__content tool-page__content--auto">
        <Island
          flex={false}
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            minHeight: 140,
          }}
        >
          <SkeletonCircle size={40} />
          <SkeletonText width={180} />
          <SkeletonText width={120} height={12} />
        </Island>

        <div className="guf-packer__config">
          <Island flex={false} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonText width="40%" />
            <Skeleton width="100%" height={60} radius={8} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Skeleton width={80} height={28} radius={8} />
              <Skeleton width={80} height={28} radius={8} />
            </div>
          </Island>
          <Island flex={false} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <SkeletonText width="35%" />
            {[0, 1].map((i) => (
              <div key={i} style={{ display: 'flex', gap: 8 }}>
                <SkeletonText width="25%" />
                <SkeletonText width="50%" />
              </div>
            ))}
          </Island>
        </div>

        <Island flex={false} style={{ padding: 0 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              }}
            >
              <Skeleton width={20} height={20} radius={4} />
              <SkeletonText width="30%" />
              <SkeletonText width="20%" />
              <Skeleton width={24} height={24} radius={6} />
            </div>
          ))}
        </Island>

        <Island flex={false} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonText width="25%" />
          <Skeleton width="100%" height={48} radius={8} />
        </Island>

        <Island
          flex={false}
          style={{
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Skeleton width={120} height={32} radius={8} />
          <Skeleton width={160} height={32} radius={8} />
        </Island>
      </div>
    </div>
  );
}
