import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MainLayout } from './MainLayout';

vi.mock('@features/onboarding/WelcomeModal', () => ({ WelcomeModal: () => <p>welcome</p> }));
vi.mock('@features/onboarding/NewFeatureModal', () => ({
  NewFeatureModal: () => <p>new feature</p>,
}));
vi.mock('@components/navigation/Sidebar', () => ({
  Sidebar: ({ variant }: { variant: string }) => <p>sidebar {variant}</p>,
}));
vi.mock('@components/navigation/BottomNav', () => ({ BottomNav: () => <p>bottom nav</p> }));
vi.mock('@components/navigation/MobileHeader', () => ({
  MobileHeader: () => <p>mobile header</p>,
}));

describe('MainLayout', () => {
  it('shows the app frame and the onboarding dialogs to a signed-in user', () => {
    render(<MainLayout>page</MainLayout>);

    expect(screen.getByText('sidebar app')).toBeTruthy();
    expect(screen.getByText('bottom nav')).toBeTruthy();
    expect(screen.getByText('mobile header')).toBeTruthy();
    expect(screen.getByText('welcome')).toBeTruthy();
    expect(screen.getByText('new feature')).toBeTruthy();
  });

  it('shows the reader sidebar, and no navigation or onboarding, to a reader', () => {
    render(<MainLayout variant="reader">page</MainLayout>);

    expect(screen.getByText('page')).toBeTruthy();
    expect(screen.getByText('sidebar reader')).toBeTruthy();
    expect(screen.queryByText('bottom nav')).toBeNull();
    expect(screen.queryByText('mobile header')).toBeNull();
    expect(screen.queryByText('welcome')).toBeNull();
    expect(screen.queryByText('new feature')).toBeNull();
  });
});
