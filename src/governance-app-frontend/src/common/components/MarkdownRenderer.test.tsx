import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('marks each link as user content that search engines do not follow', () => {
    render(<MarkdownRenderer content="[forum](https://forum.example.com/t/1)" />);

    expect(screen.getByRole('link', { name: 'forum' }).getAttribute('rel')).toBe(
      'nofollow ugc noopener noreferrer',
    );
  });
});
