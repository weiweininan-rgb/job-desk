import test from 'node:test';
import assert from 'node:assert/strict';
import { getApplicationStats } from './applicationStats.js';

test('does not count rejected applications as interview or offer conversions', () => {
  const stats = getApplicationStats([
    { status: '已投递', created_at: '2026-07-14T10:00:00Z' },
    { status: 'Offer', created_at: '2026-07-14T10:00:00Z' },
    { status: '已拒绝', created_at: '2026-07-14T10:00:00Z' },
  ]);

  assert.equal(stats.interviewRate, 33);
  assert.equal(stats.offerRate, 33);
  assert.deepEqual(
    stats.funnelData.map(({ name, count }) => ({ name, count })),
    [
      { name: '已投递', count: 3 },
      { name: '简历筛选', count: 1 },
      { name: '一面', count: 1 },
      { name: 'Offer', count: 1 },
    ],
  );
});
