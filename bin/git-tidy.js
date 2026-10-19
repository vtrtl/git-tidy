#!/usr/bin/env node
'use strict';

const readline = require('node:readline/promises');
const lib = require('../src/lib');

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (text) => (useColor ? `\x1b[${code}m${text}\x1b[0m` : text);
const c = { dim: paint(2), red: paint(31), green: paint(32), yellow: paint(33), bold: paint(1) };

const HELP = `
git-tidy - clean up merged and stale local git branches

Usage:
  git-tidy [options]

Options:
  -d, --days <n>     Treat branches untouched for n+ days as stale (default: 30)
  -b, --base <name>  Branch to check merges against (default: main or master)
  -n, --dry-run      Show what would be deleted without deleting anything
  -y, --yes          Skip the prompt and delete merged branches only
  -h, --help         Show this help
`;

async function main() {
  const opts = lib.parseArgs(process.argv.slice(2));
  if (opts.help) {
    console.log(HELP);
    return;
  }

  const base = lib.detectBase(opts.base);
  const current = lib.currentBranch();
  const candidates = lib.findCandidates(lib.listBranches(), {
    merged: lib.listMerged(base),
    days: opts.days,
    skip: [base, current].filter(Boolean),
  });

  if (candidates.length === 0) {
    console.log(c.green('Nothing to tidy. Your branches look clean.'));
    return;
  }

  console.log(c.bold(`\nBranches to review (base: ${base}, stale after ${opts.days} days):\n`));
  const width = String(candidates.length).length;
  const nameWidth = Math.max(...candidates.map((b) => b.name.length));

  candidates.forEach((b, i) => {
    const num = String(i + 1).padStart(width);
    const tag = b.merged ? c.green('merged  ') : c.yellow('unmerged');
    console.log(`  ${num}. ${b.name.padEnd(nameWidth)}  ${tag}  ${c.dim(b.relative)}`);
  });

  const hasUnmerged = candidates.some((b) => !b.merged);
  if (hasUnmerged) {
    console.log(c.yellow('\n  "unmerged" branches have commits not in the base and need force-delete.'));
  }

  let chosen;
  if (opts.dryRun) {
    console.log(c.dim('\nDry run: nothing was deleted.'));
    return;
  }

  if (opts.yes) {
    chosen = candidates.filter((b) => b.merged);
    console.log(c.dim(`\n--yes: deleting ${chosen.length} merged branch(es); skipping unmerged.`));
  } else {
    if (!process.stdin.isTTY) {
      console.error(c.red('\nNo interactive terminal. Use --dry-run or --yes.'));
      process.exitCode = 1;
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = await rl.question('\nDelete which? (e.g. 1,3,5-7 / "all" / Enter to cancel): ');
      chosen = lib.parseSelection(answer, candidates.length).map((i) => candidates[i]);
    } finally {
      rl.close();
    }
  }

  if (chosen.length === 0) {
    console.log('Nothing deleted.');
    return;
  }

  let deleted = 0;
  for (const branch of chosen) {
    try {
      lib.deleteBranch(branch);
      console.log(`${c.red('deleted')} ${branch.name}`);
      deleted++;
    } catch (err) {
      const reason = (err.stderr || err.message).toString().trim().split('\n')[0];
      console.error(`${c.yellow('skipped')} ${branch.name}: ${reason}`);
    }
  }
  console.log(c.bold(`\nDone. Deleted ${deleted} of ${chosen.length} selected branch(es).`));
}

main().catch((err) => {
  console.error(c.red(`Error: ${err.message}`));
  process.exit(1);
});
