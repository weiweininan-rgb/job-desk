import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewApplicationFormData } from './applicationForm.js';

test('new application form uses the date at the time it opens', () => {
  const previousDay = createNewApplicationFormData(new Date('2026-09-13T23:59:00+08:00'));
  const currentDay = createNewApplicationFormData(new Date('2026-09-14T00:01:00+08:00'));

  assert.equal(previousDay.application_date.getDate(), 13);
  assert.equal(currentDay.application_date.getDate(), 14);
  assert.notEqual(previousDay.application_date, currentDay.application_date);
});
