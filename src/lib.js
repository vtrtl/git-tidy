'use strict';

const { execFileSync } = require('node:child_process');

const PROTECTED = ['main', 'master', 'develop', 'dev'];
const DAY_MS = 24 * 60 * 60 * 1000;

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseArgs(argv) {
  const opts = { days: 30, dryRun: false, yes: false, base: null, help: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '--dry-run':
      case '-n':
        opts.dryRun = true;
        break;
      case '--yes':
      case '-y':
        opts.yes = true;
        break;
      case '--help':
      case '-h':
        opts.help = true;
        break;
      case '--days':
      case '-d': {
        const value = Number(argv[++i]);
        if (!Number.isInteger(value) || value < 0) {
          throw new Error('--days needs a non-negative whole number');
        }
        opts.days = value;
        break;
      }
      case '--base':
      case '-b': {
        const value = argv[++i];
        if (!value) throw new Error('--base needs a branch name');
        opts.base = value;
        break;
      }
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }
  return opts;
}

function currentBranch() {
  try {
    return git(['symbolic-ref', '--short', 'HEAD']);
  } catch {
    return null; 
  }
}

function branchExists(name) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]);
    return true;
  } catch {
    return false;
  }
}

function detectBase(preferred) {
  if (preferred) {
    if (!branchExists(preferred)) throw new Error(`Base branch "${preferred}" not found`);
    return preferred;
  }
  for (const name of ['main', 'master']) {
    if (branchExists(name)) return name;
  }
  const current = currentBranch();
  if (current) return current;
  throw new Error('Could not determine a base branch. Use --base <branch>.');
}

function listBranches() {
  const out = git([
    'for-each-ref',
    'refs/heads',
    '--format=%(refname:short)\t%(committerdate:unix)\t%(committerdate:relative)',
  ]);
  if (!out) return [];
  return out.split('\n').map((line) => {
    const [name, unix, relative] = line.split('\t');
    return { name, timestamp: Number(unix) * 1000, relative };
  });
}

function listMerged(base) {
  const out = git(['branch', '--merged', base, '--format=%(refname:short)']);
  return new Set(out ? out.split('\n') : []);
}

function findCandidates(branches, { merged, days, now = Date.now(), skip = [] }) {
  const skipSet = new Set([...PROTECTED, ...skip]);

  return branches
    .filter((b) => !skipSet.has(b.name))
    .map((b) => ({
      ...b,
      ageDays: Math.floor((now - b.timestamp) / DAY_MS),
      merged: merged.has(b.name),
    }))
    .filter((b) => b.merged || b.ageDays >= days)
    .sort((a, b) => b.ageDays - a.ageDays);
}

/** Turn "1,3,5-7" or "all" into a sorted list of zero-based indexes. */
function parseSelection(input, max) {
  const text = input.trim().toLowerCase();
  if (!text) return [];
  if (text === 'all' || text === 'a') return Array.from({ length: max }, (_, i) => i);

  const picked = new Set();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    const single = part.match(/^\d+$/);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      for (let n = Math.min(from, to); n <= Math.max(from, to); n++) picked.add(n);
    } else if (single) {
      picked.add(Number(part));
    } else {
      throw new Error(`Can't understand "${part}"`);
    }
  }

  for (const n of picked) {
    if (n < 1 || n > max) throw new Error(`${n} is out of range (1-${max})`);
  }
  return [...picked].sort((a, b) => a - b).map((n) => n - 1);
}

/** Merged branches use safe `-d`; unmerged stale ones need `-D`. */
function deleteBranch(branch) {
  git(['branch', branch.merged ? '-d' : '-D', branch.name]);
}

module.exports = {
  PROTECTED,
  parseArgs,
  currentBranch,
  detectBase,
  listBranches,
  listMerged,
  findCandidates,
  parseSelection,
  deleteBranch,
};
