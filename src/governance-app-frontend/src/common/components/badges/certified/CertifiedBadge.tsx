import { useTranslation } from 'react-i18next';

import { Tag, TagGroup, TagList } from '@untitledui/components';

export const CertifiedBadge = () => {
  const { t } = useTranslation();

  return (
    <TagGroup label="Tags" size="md">
      <TagList className="flex gap-4">
        <Tag dot className="text-xs">
          {t(($) => $.common.certified)}
        </Tag>
      </TagList>
    </TagGroup>
  );
};
