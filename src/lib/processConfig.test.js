import test from 'node:test';
import assert from 'node:assert/strict';
import { getProcessUrgency, shouldTriggerReminder } from './processConfig.js';

test('only reminds once for an unfinished process due within three days', () => {
  const nearDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  assert.equal(shouldTriggerReminder({ deadline: nearDeadline, reminder_triggered: false, status: '待完成' }), true);
  assert.equal(shouldTriggerReminder({ deadline: nearDeadline, reminder_triggered: true, status: '待完成' }), false);
  assert.equal(shouldTriggerReminder({ deadline: nearDeadline, reminder_triggered: false, status: '已完成' }), false);
});

test('completed and cancelled processes never display urgency', () => {
  const nearDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  assert.equal(getProcessUrgency({ deadline: nearDeadline, status: '已完成' }).isUrgent, false);
  assert.equal(getProcessUrgency({ deadline: nearDeadline, status: '已取消' }).isUrgent, false);
});
