import { useEffect, useRef } from 'react';

type Props = {
  callback: () => void;
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  retrigger?: unknown;
  children?: React.ReactNode;
};

export const InViewSentinel = ({
  callback,
  root = null,
  rootMargin = '300px',
  threshold = 0,
  retrigger,
  children,
}: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([element]) => element.isIntersecting && callback(),
      { root, rootMargin, threshold },
    );
    observer.observe(ref.current!);

    return () => observer.disconnect();
  }, [callback, root, rootMargin, threshold, retrigger]);

  return <div ref={ref}>{children}</div>;
};
