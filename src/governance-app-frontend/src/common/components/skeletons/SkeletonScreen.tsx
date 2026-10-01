import { useTranslation } from 'react-i18next';

type Props = React.ComponentProps<'div'>;

/**
 * Announces one loading region.
 *
 * The bars inside are `aria-hidden`, so without this wrapper a screen reader
 * hears nothing at all while a page loads.
 */
export const SkeletonScreen = ({ className, children, ...props }: Props) => {
  const { t } = useTranslation();

  return (
    <div role="status" aria-label={t(($) => $.common.loading)} className={className} {...props}>
      {children}
    </div>
  );
};
