import { useTheme } from '@hooks/useTheme';
import Skeleton, { SkeletonProps } from 'react-loading-skeleton';

export const SkeletonLoader = (props: SkeletonProps) => {
  const { theme } = useTheme();
  return <Skeleton baseColor={theme === 'dark' ? '#333' : '#ddd'} {...props} />;
};
