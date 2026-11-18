import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deepMerge} from '../admin/merge.js';
import {enquiryDocument} from '../src/integrations.js';

test('partial updates merge nested objects and replace arrays', () => {
  const batch = {code: 'B1', attendance: {'2026-11-10': ['a', 'b']}, days: ['Mon']};
  const next = deepMerge(batch, {attendance: {'2026-11-12': ['a']}, days: ['Tue', 'Thu']});
  assert.deepEqual(next, {code: 'B1', attendance: {'2026-11-10': ['a', 'b'], '2026-11-12': ['a']}, days: ['Tue', 'Thu']});
});

test('a website enquiry becomes a New console enquiry the console API will accept', () => {
  const form = new FormData();
  form.set('name', ' Asha Rao '); form.set('email', 'asha@example.com'); form.set('phone', '98200 11122');
  form.set('organisation', 'Kaveri Finance'); form.set('service', 'corporate-training'); form.set('message', 'Leadership workshop for 20 managers.');
  const d = enquiryDocument(form);
  assert.equal(d.name, 'Asha Rao');
  assert.equal(d.source, 'Website');
  assert.equal(d.stage, 'New');
  assert.equal(d.kind, 'Corporate training');
  assert.match(d.notes, /Organisation: Kaveri Finance/);
  assert.ok(!('sample' in d));
});
