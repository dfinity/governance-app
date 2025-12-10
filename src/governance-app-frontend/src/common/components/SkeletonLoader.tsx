import { Skeleton } from '@components/skeleton';

type Props = {
  count?: number;
  width?: number | string;
  height?: number | string;
};

// TODO: To be removed
export const SkeletonLoader = (props: Props) => {
  const { width = '100%', height = 16 } = props;

  return <Skeleton style={{ width, height }} />;
};
