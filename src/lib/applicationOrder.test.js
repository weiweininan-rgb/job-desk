import test from 'node:test';
import assert from 'node:assert/strict';
import { compareApplications } from './applicationOrder.js';

test('abandoned applications stay last even when pinned or sorted by company/date', () => {
  const rows = [
    { id: 1, company_name: 'A', application_date: '2026-10-09', is_abandoned: true, is_pinned: true },
    { id: 2, company_name: 'C', application_date: '2026-10-08' },
    { id: 3, company_name: 'B', application_date: '2026-10-07', is_pinned: true },
  ];
  for (const sort of ['company', 'application_asc', 'application_desc']) {
    assert.deepEqual([...rows].sort((a, b) => compareApplications(a, b, sort)).map(row => row.id), [3, 2, 1]);
  }
  const restored = rows.map(row => ({ ...row, is_abandoned: false }));
  assert.equal(restored.sort(compareApplications)[0].id, 1);
});
