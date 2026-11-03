import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pages,services} from '../src/content.js';
test('15 unique pages with a destination for every service',()=>{assert.equal(pages.length,15);assert.equal(new Set(pages.map(p=>p[0])).size,15);for(const s of services)assert.ok(pages.some(([p])=>p===s.slug));});
