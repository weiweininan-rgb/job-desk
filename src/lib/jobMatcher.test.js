import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBatch, createFingerprint, formatSourceDate, isChengdu, isMajorCompany, isRelevantJob, normalizeSourceDate, splitPositions, EMBEDDED_PROFILE_KEYWORDS, EXAMPLE_MAJOR_COMPANIES } from './jobMatcher.js';

test('splits multi-line positions and filters for the target direction', () => {
  const positions = splitPositions('嵌入式软件工程师\n产品经理\nLinux 驱动工程师');
  assert.deepEqual(positions, ['嵌入式软件工程师', '产品经理', 'Linux 驱动工程师']);
  assert.equal(isRelevantJob(positions[0], '', EMBEDDED_PROFILE_KEYWORDS), true);
  assert.equal(isRelevantJob(positions[1], '', EMBEDDED_PROFILE_KEYWORDS), false);
  assert.equal(isRelevantJob(positions[2], '', EMBEDDED_PROFILE_KEYWORDS), true);
  assert.equal(isRelevantJob(positions[1], '', []), true);
});

test('classifies priority properties and produces a stable fingerprint', () => {
  assert.equal(classifyBatch('27秋提前批'), '提前批');
  assert.equal(classifyBatch('27秋招正式批'), '秋招正式批');
  assert.equal(isChengdu('北京/成都'), true);
  assert.equal(isMajorCompany('华为海思', EXAMPLE_MAJOR_COMPANIES), true);
  assert.equal(createFingerprint({ company: '华为', position: '嵌入式软件工程师', applyUrl: 'https://example.com' }), createFingerprint({ company: ' 华为 ', position: '嵌入式软件工程师', applyUrl: 'https://example.com' }));
});

test('normalizes source dates to 2026 while rendering without the year', () => {
  assert.equal(normalizeSourceDate('7.13', 2026), '2026-07-13');
  assert.equal(normalizeSourceDate('2026/7/13'), '2026-07-13');
  assert.equal(normalizeSourceDate('7.13更新', 2026), '2026-07-13');
  assert.equal(normalizeSourceDate('13.40'), '13.40');
  assert.equal(formatSourceDate('2026-07-13'), '07/13');
});
