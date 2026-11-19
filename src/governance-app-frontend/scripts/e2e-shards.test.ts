import { describe, expect, it } from 'vitest';

import {
  durationsFromReport,
  estimateShardSeconds,
  isSerialSource,
  mergeDurations,
  planShards,
  type Report,
  withDurations,
} from './e2e-shards';

describe('e2e-shards', () => {
  describe('planShards', () => {
    const files = [
      { file: 'a.spec.ts', seconds: 266, serial: false },
      { file: 'b.spec.ts', seconds: 160, serial: true },
      { file: 'c.spec.ts', seconds: 117, serial: false },
      { file: 'd.spec.ts', seconds: 101, serial: false },
      { file: 'e.spec.ts', seconds: 70, serial: true },
      { file: 'f.spec.ts', seconds: 28, serial: false },
      { file: 'g.spec.ts', seconds: 3, serial: false },
    ];

    it('puts each file in exactly one shard', () => {
      for (const total of [1, 2, 3, 10]) {
        const shards = planShards(files, total, 4);
        expect(shards).toHaveLength(total);
        expect(shards.flat().sort()).toEqual(files.map((f) => f.file));
      }
    });

    it('balances the shards by time', () => {
      const shards = planShards(files, 2, 4);
      const estimates = shards.map((shard) =>
        estimateShardSeconds(
          files.filter((f) => shard.includes(f.file)),
          4,
        ),
      );
      // The longest serial file sets the lower bound: 160 seconds.
      expect(Math.max(...estimates)).toBe(160);
    });

    it('gives the same plan for any input order', () => {
      expect(planShards([...files].reverse(), 2, 4)).toEqual(planShards(files, 2, 4));
    });

    it('leaves extra shards empty', () => {
      const shards = planShards(files.slice(0, 2), 3, 4);
      expect(shards.filter((shard) => shard.length === 0)).toHaveLength(1);
    });
  });

  describe('estimateShardSeconds', () => {
    it('uses the longest serial file when it takes longer than the shared time', () => {
      const files = [
        { file: 'a', seconds: 100, serial: true },
        { file: 'b', seconds: 40, serial: false },
      ];
      expect(estimateShardSeconds(files, 4)).toBe(100);
      expect(estimateShardSeconds(files, 1)).toBe(140);
    });
  });

  describe('isSerialSource', () => {
    it('finds serial describe blocks', () => {
      expect(isSerialSource("test.describe.serial('x', () => {})")).toBe(true);
      expect(isSerialSource("test.describe.configure({ mode: 'serial' })")).toBe(true);
      expect(isSerialSource("test.describe('x', () => {})")).toBe(false);
    });
  });

  describe('withDurations', () => {
    it('gives a new file the median recorded time', () => {
      const files = withDurations(
        [
          { file: 'a.spec.ts', serial: false },
          { file: 'new.spec.ts', serial: false },
        ],
        { 'a.spec.ts': 10, 'b.spec.ts': 30, 'c.spec.ts': 50 },
      );
      expect(files.map((f) => f.seconds)).toEqual([10, 30]);
    });

    it('uses a default when the project has no records', () => {
      expect(withDurations([{ file: 'a.spec.ts', serial: false }])[0].seconds).toBe(60);
    });
  });

  describe('durationsFromReport', () => {
    const result = (startTime: string, duration: number, retry = 0) => ({
      startTime,
      duration,
      retry,
    });
    const report: Report = {
      suites: [
        {
          file: 'parallel.spec.ts',
          suites: [
            {
              file: 'parallel.spec.ts',
              specs: [
                {
                  file: 'parallel.spec.ts',
                  tests: [
                    {
                      projectName: 'mobile',
                      results: [
                        result('2026-01-01T00:00:00.000Z', 10_000),
                        result('2026-01-01T00:01:00.000Z', 99_000, 1),
                      ],
                    },
                  ],
                },
                {
                  file: 'parallel.spec.ts',
                  tests: [
                    {
                      projectName: 'mobile',
                      results: [result('2026-01-01T00:00:00.000Z', 20_000)],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          file: 'serial.spec.ts',
          specs: [
            {
              file: 'serial.spec.ts',
              tests: [
                { projectName: 'mobile', results: [result('2026-01-01T00:00:00.000Z', 5_000)] },
              ],
            },
            {
              file: 'serial.spec.ts',
              tests: [
                { projectName: 'mobile', results: [result('2026-01-01T00:00:30.000Z', 5_000)] },
              ],
            },
          ],
        },
      ],
    };

    it('sums parallel files and spans serial files, without retries', () => {
      expect(durationsFromReport(report, (file) => file === 'serial.spec.ts')).toEqual({
        mobile: { 'parallel.spec.ts': 30, 'serial.spec.ts': 35 },
      });
    });
  });

  describe('mergeDurations', () => {
    it('keeps old records and replaces the ones in the new report', () => {
      expect(
        mergeDurations(
          { chromium: { 'a.spec.ts': 1 }, mobile: { 'a.spec.ts': 1, 'b.spec.ts': 2 } },
          { mobile: { 'b.spec.ts': 5 } },
        ),
      ).toEqual({ chromium: { 'a.spec.ts': 1 }, mobile: { 'a.spec.ts': 1, 'b.spec.ts': 5 } });
    });
  });
});
