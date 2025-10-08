import { useEffect } from 'react';

type Props = {
  selector: string;
  attribute: string;
};

export const usePreventAttributeChange = ({ selector, attribute }: Props) => {
  useEffect(() => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;

    // @ts-expect-error - dynamic attribute access
    const initialValue = element[attribute];

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === attribute) {
          // @ts-expect-error - dynamic attribute access
          element[attribute] = initialValue;
        }
      });
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: [attribute],
    });

    return () => observer.disconnect();
  }, [attribute, selector]);
};
