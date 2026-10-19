'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, findCandidates, parseSelection } = require('../src/lib');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 31);
const daysAgo = (n) => now - n * DAY;

test('parseArgs: defaults', () => {
  assert.deepEqual(parseArgs([]), {
    days: 30, dryRun: false, yes: false, base: null, help: false,
  });
});

test('parseArgs: flags and values', () => {
  const opts = parseArgs(['--dry-run', '-d', '14', '--base', 'trunk', '-y']);
  assert.equal(opts.dryRun, true);
  assert.equal(opts.days, 14);
  assert.equal(opts.base, 'trunk');
  assert.equal(opts.yes, true);
});

test('parseArgs: rejects bad input', () => {
  assert.throws(() => parseArgs(['--days', 'abc']), /--days/);
  assert.throws(() => parseArgs(['--nope']), /Unknown option/);
  assert.throws(() => parseArgs(['--base']), /--base/);
});

test('findCandidates: picks merged or stale, skips protected and current', () => {
  const branches = [
    { name: 'main', timestamp: daysAgo(100), relative: '' },
    { name: 'feature/old', timestamp: daysAgo(60), relative: '' },
    { name: 'feature/merged-new', timestamp: daysAgo(1), relative: '' },
    { name: 'feature/active', timestamp: daysAgo(2), relative: '' },
    { name: 'wip', timestamp: daysAgo(90), relative: '' },
  ];
  const result = findCandidates(branches, {
    merged: new Set(['main', 'feature/merged-new']),
    days: 30,
    now,
    skip: ['wip'],
  });

  assert.deepEqual(result.map((b) => b.name), ['feature/old', 'feature/merged-new']);
  assert.equal(result[0].merged, false);
  assert.equal(result[1].merged, true);
});

test('parseSelection: numbers, ranges, all', () => {
  assert.deepEqual(parseSelection('1,3', 5), [0, 2]);
  assert.deepEqual(parseSelection('2-4', 5), [1, 2, 3]);
  assert.deepEqual(parseSelection('all', 3), [0, 1, 2]);
  assert.deepEqual(parseSelection('', 3), []);
});

test('parseSelection: rejects bad input', () => {
  assert.throws(() => parseSelection('9', 3), /out of range/);
  assert.throws(() => parseSelection('foo', 3), /understand/);
});
