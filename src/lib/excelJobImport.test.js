import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { parseJobWorkbook } from './excelJobImport.js';

test('default import keeps all directions without city or company defaults', async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['更新日期', '公司', '职位', '批次', '地点'],
    ['', '岗位管理示例公司', '市场岗位;产品经理', '', '成都'],
  ]), '岗位模板');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const result = await parseJobWorkbook({ arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  assert.equal(result.sourceRowCount, 1);
  assert.equal(result.jobs.length, 2);
  assert.equal(result.jobs[0].is_chengdu, false);
  assert.equal(result.jobs[0].is_major_company, false);
});

test('parses the Feishu export columns and filters multi-line positions', async () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[
    '7.13更新', '华为', '嵌入式软件工程师\n产品经理', '27秋提前批', '成都', '7.13', '智能硬件团队', 'https://article.example', 'https://apply.example', '',
  ]]);
  XLSX.utils.book_append_sheet(workbook, sheet, '27届秋招');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };

  const result = await parseJobWorkbook(file, {
    profile_keywords: ['嵌入式'],
    major_companies: ['华为'],
    preferred_cities: ['成都'],
  });

  assert.equal(result.sheetName, '27届秋招');
  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].position, '嵌入式软件工程师');
  assert.equal(result.jobs[0].batch, '提前批');
  assert.equal(result.jobs[0].is_chengdu, true);
  assert.equal(result.jobs[0].is_major_company, true);
  assert.equal(result.sourceRowCount, 1);
  assert.equal(result.splitPositionCount, 2);
  assert.equal(result.filteredCount, 1);
});

test('uses notes and batch text as context when filtering Excel positions', async () => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([[
    '7.13更新', '大疆', '软件工程师', '27秋提前批', '深圳', '7.13', '智能硬件团队', 'https://article.example', 'https://apply.example', '',
  ]]);
  XLSX.utils.book_append_sheet(workbook, sheet, '27届秋招');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };

  const result = await parseJobWorkbook(file, {
    profile_keywords: ['智能硬件'],
    major_companies: ['大疆'],
  });

  assert.equal(result.jobs.length, 1);
  assert.equal(result.jobs[0].company_name, '大疆');
});

test('does not treat the shared salary reference as a job keyword', async () => {
  const workbook = XLSX.utils.book_new();
  const workbookLink = 'https://example.feishu.cn/wiki/salary-reference';
  const sheet = XLSX.utils.aoa_to_sheet([[
    '9.2更新', '示例企业', '产品经理', '27秋正式批', '上海', '9.2', '', 'https://article.example', 'https://apply.example', `[${workbookLink}](${workbookLink}) 嵌入式校招薪资统计表`,
  ]]);
  XLSX.utils.book_append_sheet(workbook, sheet, '27届秋招');
  const bytes = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };

  const result = await parseJobWorkbook(file, {
    profile_keywords: ['嵌入式'],
    major_companies: [],
  });

  assert.equal(result.jobs.length, 0);
  assert.equal(result.filteredCount, 1);
});
