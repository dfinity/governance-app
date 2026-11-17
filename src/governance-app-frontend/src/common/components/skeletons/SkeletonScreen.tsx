import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

type Props = React.ComponentProps<'div'>;

/** Matches `--skeleton-delay` in `main.css`. */
const ANNOUNCE_DELAY_MS = 120;

/**
 * Announces one loading region.
 *
 * The bars inside are `aria-hidden`, so without this wrapper a screen reader
 * hears nothing at all while a page loads. A live region reads out a change to
 * its text, not the text it mounts with, so the text arrives after the same
 * delay as the bars. A query that resolves first is never announced.
 */
export const SkeletonScreen = ({ className, children, ...props }: Props) => {
  const { t } = useTranslation();
  const [announce, setAnnounce] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnnounce(true), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div role="status" className={className} {...props}>
      <span className="sr-only">{announce && t(($) => $.common.loading)}</span>
      {children}
    </div>
  );
};
