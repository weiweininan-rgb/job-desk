import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCSV } from './exportUtils.js';

test('neutralizes formula-like untrusted text without modifying stored records', () => {
  for (const text of ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(1)', '  =1', '\t=1', '\r=1', '\n=1', '＝1+1', '＋1', '－1', '＠SUM(1)']) {
    const app = { id: 1, company_name: text, notes: text };
    const csv = buildCSV([app], [{ application_id: 1, notes: text }]);
    const escaped = text.replace(/"/g, '""');
    assert.equal(csv.split(`"\t${escaped}"`).length - 1, 3, JSON.stringify(text));
    assert.equal(app.company_name, text);
  }
  assert.match(buildCSV([{ id: -1, company_name: '普通公司', notes: '正文含 = 符号' }]), /"-1","普通公司"/);
  assert.match(buildCSV([{ id: 1, company_name: '=HYPERLINK("https://example.com","test")' }]), /"\t=HYPERLINK\(""https:\/\/example.com"",""test""\)"/);
});

test('invalid dates do not prevent exporting application and process rows', () => {
  const csv = buildCSV([{ id: 1, company_name: '坏日期', created_at: 'invalid-date' }], [
    { application_id: 1, scheduled_time: 'not-a-date', deadline: 'invalid-date', notes: '仍然导出' },
  ]);
  assert.match(csv, /"坏日期"/);
  assert.match(csv, /"仍然导出"/);
  assert.doesNotMatch(csv, /Invalid Date|invalid-date|not-a-date/);
});

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
