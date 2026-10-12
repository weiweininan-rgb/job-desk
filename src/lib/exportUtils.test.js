import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCSV } from './exportUtils.js';

test('escapes commas, quotes, and line breaks in CSV fields', () => {
  const csv = buildCSV([
    {
      id: 'application-1',
      company_name: '示例, 公司',
      position: '嵌入式"软件"工程师',
      notes: '第一行\n第二行',
      application_date: '2026-07-14',
    },
  ]);

  assert.match(csv, /"示例, 公司"/);
  assert.match(csv, /"嵌入式""软件""工程师"/);
  assert.match(csv, /"第一行\n第二行"/);
});
