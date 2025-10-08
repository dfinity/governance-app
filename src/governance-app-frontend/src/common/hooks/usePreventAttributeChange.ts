import { useEffect } from 'react';

type Props = {
  selector: string;
  attribute: string;
};

export const usePreventAttributeChange = ({ selector, attribute }: Props) => {
  useEffect(() => {
    const element = document.querySelector(selector);
    if (!(element instanceof HTMLElement)) return;
    const initialValue = element.getAttribute(attribute);

    const observer = new MutationObserver(() => {
      if (element.getAttribute(attribute) !== initialValue) {
        if (initialValue === null) {
          element.removeAttribute(attribute);
        } else {
          element.setAttribute(attribute, initialValue);
        }
      }
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: [attribute],
    });

    return () => observer.disconnect();
  }, [attribute, selector]);
};
