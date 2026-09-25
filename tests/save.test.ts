import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decode,fresh,LocalStore} from '../src/save.ts';
test('save round trip preserves an expedition and local settings',()=>{const s=fresh();s.carrying=true;s.inventory.wood=3;s.friends=[0,2];s.found=['z0-1'];s.music=0;assert.deepEqual(decode(JSON.stringify(s)),s);});
test('migration rejects future schemas and filters untrusted import fields',()=>{assert.throws(()=>decode('{"version":99}'));assert.throws(()=>decode('null'));assert.throws(()=>decode('x'.repeat(100001)));const s=decode(JSON.stringify({version:1,delivered:-4,zone:999,friends:[0,0,9,-1],helpers:['dog','unknown'],name:'<name>',inventory:{wood:3,stone:-8},found:['z0-1','<img>','z0-1']}));assert.equal(s.version,2);assert.equal(s.zone,4);assert.equal(s.inventory.stone,0);assert.deepEqual(s.found,['z0-1']);assert.deepEqual(s.friends,[0]);assert.equal(s.name,'name');});
test('unavailable storage does not crash or pretend the save succeeded',()=>{const store=new LocalStore();assert.equal(store.save(fresh()),false);assert.deepEqual(store.load(),fresh());});
