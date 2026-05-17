import { memo, type CSSProperties } from 'react';
import './Skeleton.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
}

export const Skeleton = memo(({ width, height, radius, circle, className = '', style }: SkeletonProps) => {
  const inline: CSSProperties = { ...style };
  if (width !== undefined) inline.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) inline.height = typeof height === 'number' ? `${height}px` : height;
  if (radius !== undefined) inline.borderRadius = typeof radius === 'number' ? `${radius}px` : radius;

  return (
    <div
      className={`sk ui-skeleton${circle ? ' ui-skeleton--circle' : ''} ${className}`.trim()}
      style={inline}
    />
  );
});
Skeleton.displayName = 'Skeleton';

export const SkeletonText = memo(({ width = '100%', height = 14, ...props }: Omit<SkeletonProps, 'circle'>) => (
  <Skeleton width={width} height={height} radius={4} {...props} />
));
SkeletonText.displayName = 'SkeletonText';

export const SkeletonCircle = memo(({ size = 40, ...props }: Omit<SkeletonProps, 'circle' | 'width' | 'height'> & { size?: number }) => (
  <Skeleton width={size} height={size} circle {...props} />
));
SkeletonCircle.displayName = 'SkeletonCircle';
