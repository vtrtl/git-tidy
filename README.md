# git-tidy

Clean up merged and stale local git branches in seconds.

```
$ git-tidy

Branches to review (base: main, stale after 30 days):

  1. feature/old-experiment   unmerged  10 months ago
  2. fix/login-bug            merged    3 weeks ago
  3. feature/search           merged    2 days ago

Delete which? (e.g. 1,3,5-7 / "all" / Enter to cancel): 2-3
deleted fix/login-bug
deleted feature/search

Done. Deleted 2 of 2 selected branch(es).
```

<!-- Replace the block above with a demo GIF (try https://github.com/charmbracelet/vhs or asciinema). -->

## Install

```bash
npm install -g git-tidy
```

Or run it without installing:

```bash
npx git-tidy
```

Requires Node 18+ and git. No other dependencies.

## Usage

Run `git-tidy` inside any git repository.

| Option | Description |
| --- | --- |
| `-d, --days <n>` | Treat branches untouched for `n`+ days as stale (default `30`) |
| `-b, --base <name>` | Branch to check merges against (default `main`, then `master`) |
| `-n, --dry-run` | Show what would be deleted, change nothing |
| `-y, --yes` | Skip the prompt and delete **merged** branches only |
| `-h, --help` | Show help |

Because it installs as `git-tidy`, git also lets you call it as `git tidy`.

## Safety

- `main`, `master`, `develop`, `dev`, your base branch, and the branch you're on are never listed.
- Merged branches are removed with `git branch -d`, which git itself considers safe.
- Unmerged stale branches are clearly labeled and only force-deleted (`-D`) if you explicitly pick them.
- `--yes` never touches unmerged branches.
- Use `--dry-run` first if you're nervous.

## Development

```bash
git clone https://github.com/vtrtl/git-tidy
cd git-tidy
npm test
node bin/git-tidy.js --dry-run
```

## License

MIT
