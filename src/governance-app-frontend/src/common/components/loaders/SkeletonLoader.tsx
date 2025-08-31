import Skeleton, { SkeletonProps } from 'react-loading-skeleton';

import { Theme } from '@contexts/themeContext';
import { useTheme } from '@hooks/useTheme';

export const SkeletonLoader = (props: SkeletonProps) => {
  const { theme } = useTheme();
  return <Skeleton baseColor={theme === Theme.Dark ? '#333' : '#ddd'} {...props} />;
};
