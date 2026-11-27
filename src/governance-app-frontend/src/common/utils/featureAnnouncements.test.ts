import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY } from '@constants/extra';
import { PAGE_ANNOUNCEMENTS } from '@constants/pageAnnouncements';
import { ADVANCED_FEATURES_DEFAULTS, AdvancedFeature } from '@typings/advancedFeatures';
import { PageAnnouncement } from '@typings/featureAnnouncements';

import {
  getUnseenAnnouncements,
  isAnnouncedFeature,
  markAllAnnouncementsSeen,
  markAnnouncementsSeen,
  splitUnseenAnnouncements,
} from './featureAnnouncements';

/** Keeps the Reports page out of the tests of the features. */
const setReportsAvailable = (available: boolean) =>
  vi
    .spyOn(PAGE_ANNOUNCEMENTS.find(({ key }) => key === PageAnnouncement.Reports)!, 'isEnabled')
    .mockReturnValue(available);

const webHid = vi.hoisted(() => ({ isWebHidSupported: vi.fn() }));
vi.mock('@common/ledger/webhid', () => webHid);

/** An in-memory `localStorage`: the one of the test environment has no `setItem`. */
const createStorage = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => items.set(key, value),
    removeItem: (key: string) => items.delete(key),
    items,
  };
};

describe('featureAnnouncements', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
    webHid.isWebHidSupported.mockReturnValue(true);
    setReportsAvailable(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lists the Ledger device feature until the user sees it', () => {
    expect(getUnseenAnnouncements()).toEqual([AdvancedFeature.LedgerDevice]);

    markAnnouncementsSeen([AdvancedFeature.LedgerDevice]);

    expect(getUnseenAnnouncements()).toEqual([]);
  });

  it('keeps the earlier seen features when it marks a new one', () => {
    storage.items.set(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY, '["subaccounts"]');

    markAnnouncementsSeen([AdvancedFeature.LedgerDevice]);

    expect(JSON.parse(storage.items.get(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY)!)).toEqual([
      AdvancedFeature.Subaccounts,
      AdvancedFeature.LedgerDevice,
    ]);
  });

  it('treats an unreadable record as nothing seen', () => {
    storage.items.set(SEEN_FEATURE_ANNOUNCEMENTS_STORAGE_KEY, '{not json');

    expect(getUnseenAnnouncements()).toEqual([AdvancedFeature.LedgerDevice]);
  });

  it('announces no feature that the browser cannot run', () => {
    webHid.isWebHidSupported.mockReturnValue(false);

    expect(getUnseenAnnouncements()).toEqual([]);
    expect(isAnnouncedFeature(AdvancedFeature.LedgerDevice)).toBe(false);
  });

  it('announces only the features with the flag', () => {
    expect(isAnnouncedFeature(AdvancedFeature.LedgerDevice)).toBe(true);
    expect(isAnnouncedFeature(AdvancedFeature.TransactionMemo)).toBe(false);
  });

  it('marks every announced feature as seen, also one the browser cannot run', () => {
    webHid.isWebHidSupported.mockReturnValue(false);

    markAllAnnouncementsSeen();
    webHid.isWebHidSupported.mockReturnValue(true);

    expect(getUnseenAnnouncements()).toEqual([]);
  });

  it('separates the unseen features that are already on', () => {
    const features = { ...ADVANCED_FEATURES_DEFAULTS, [AdvancedFeature.LedgerDevice]: true };

    expect(splitUnseenAnnouncements(features)).toEqual({
      toShow: [],
      alreadyOn: [AdvancedFeature.LedgerDevice],
    });
    expect(splitUnseenAnnouncements(ADVANCED_FEATURES_DEFAULTS)).toEqual({
      toShow: [AdvancedFeature.LedgerDevice],
      alreadyOn: [],
    });
  });

  describe('pages', () => {
    const enableReports = () => setReportsAvailable(true);

    it('lists the Reports page after the features, only while it is available', () => {
      expect(getUnseenAnnouncements()).toEqual([AdvancedFeature.LedgerDevice]);

      enableReports();

      expect(getUnseenAnnouncements()).toEqual([
        AdvancedFeature.LedgerDevice,
        PageAnnouncement.Reports,
      ]);
    });

    it('keeps a seen page in the record', () => {
      enableReports();

      markAnnouncementsSeen([PageAnnouncement.Reports]);

      expect(getUnseenAnnouncements()).toEqual([AdvancedFeature.LedgerDevice]);
    });

    it('leaves a page that is not available unseen after the welcome', () => {
      markAllAnnouncementsSeen();
      enableReports();

      expect(getUnseenAnnouncements()).toEqual([PageAnnouncement.Reports]);
    });

    it('marks an available page as seen after the welcome', () => {
      enableReports();

      markAllAnnouncementsSeen();

      expect(getUnseenAnnouncements()).toEqual([]);
    });

    it('shows a page whatever the features are', () => {
      enableReports();
      const features = { ...ADVANCED_FEATURES_DEFAULTS, [AdvancedFeature.LedgerDevice]: true };

      expect(splitUnseenAnnouncements(features)).toEqual({
        toShow: [PageAnnouncement.Reports],
        alreadyOn: [AdvancedFeature.LedgerDevice],
      });
    });
  });
});
