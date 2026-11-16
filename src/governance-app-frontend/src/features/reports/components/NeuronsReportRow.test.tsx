import '@/i18n/config';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NeuronsReportRow } from './NeuronsReportRow';

const mocks = vi.hoisted(() => ({ useIcpPrice: vi.fn() }));

vi.mock('@hooks/tickers/useIcpPrice', () => ({ useIcpPrice: mocks.useIcpPrice }));
vi.mock('../hooks/useReportDownloads', () => ({
  useNeuronsReportDownload: () => ({ mutate: vi.fn(), isPending: false }),
}));

const button = () => screen.getByTestId('neurons-report-download-btn') as HTMLButtonElement;

describe('NeuronsReportRow', () => {
  it('waits for the ICP price before the download', () => {
    mocks.useIcpPrice.mockReturnValue({ isLoading: true });
    render(<NeuronsReportRow />);

    expect(button().disabled).toBe(true);
  });

  it('allows the download when the price is loaded or unavailable', () => {
    mocks.useIcpPrice.mockReturnValue({ isLoading: false });
    render(<NeuronsReportRow />);

    expect(button().disabled).toBe(false);
  });
});
