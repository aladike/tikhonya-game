import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookDelta } from '../src/engine/look.ts';
test('touch rotation scales with screen size and sensitivity without coupling mouse settings', () => {
 const phone = lookDelta(100, 50, true, 1, 400);
 const tablet = lookDelta(200, 100, true, 1, 800);
 assert.deepEqual(phone, tablet);
 assert.equal(lookDelta(100, 50, true, .5, 400).yaw, phone.yaw * .5);
 assert.deepEqual(lookDelta(100, 50, false, 1, 400), lookDelta(100, 50, false, 1, 800));
});
