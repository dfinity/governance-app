import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const useTitle = (title: string) => {
  const baseTitle = useTranslation().t(($) => $.common.baseTitle);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | ${baseTitle}` : baseTitle;
    return () => {
      document.title = prevTitle;
    };
  }, [title, baseTitle]);
};

export default useTitle;
