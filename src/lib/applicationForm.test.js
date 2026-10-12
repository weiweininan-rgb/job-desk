import test from 'node:test';
import assert from 'node:assert/strict';
import { createNewApplicationFormData } from './applicationForm.js';

test('new application form uses the date at the time it opens', () => {
  const previousDay = createNewApplicationFormData(new Date(2026, 8, 13, 23, 59));
  const currentDay = createNewApplicationFormData(new Date(2026, 8, 14, 0, 1));

  assert.equal(previousDay.application_date.getDate(), 13);
  assert.equal(currentDay.application_date.getDate(), 14);
  assert.equal(previousDay.application_date.getTime(), new Date(2026, 8, 13, 23, 59).getTime());
  assert.equal(currentDay.application_date.getTime(), new Date(2026, 8, 14, 0, 1).getTime());
  assert.notEqual(previousDay.application_date, currentDay.application_date);
});
