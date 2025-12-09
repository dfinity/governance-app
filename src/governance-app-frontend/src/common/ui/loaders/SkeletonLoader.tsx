import Skeleton, { SkeletonProps } from 'react-loading-skeleton';

import { useTheme } from '@hooks/useTheme';

export const SkeletonLoader = (props: SkeletonProps) => {
  const { theme } = useTheme();
  return <Skeleton baseColor={theme === 'dark' ? '#333' : '#ddd'} {...props} />;
};
