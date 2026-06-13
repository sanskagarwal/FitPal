#!/usr/bin/env node
// Release helper for FitPal.
//
// Usage:
//   npm run release -- <version>   e.g. npm run release -- 0.2.0
//   npm run release -- patch|minor|major
//
// What it does:
//   1. Computes the next version (explicit or by bump type).
//   2. Updates the version in package.json and server/package.json.
//   3. Moves the CHANGELOG "Unreleased" notes into a new version section and
//      refreshes the comparison links.
//   4. Creates a release commit and an annotated git tag (vX.Y.Z).
//
// It does NOT push. Review, then run: git push --follow-tags

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const REPO = 'sanskagarwal/FitPal';
const PKG_FILES = ['package.json', 'server/package.json'];
const CHANGELOG = 'CHANGELOG.md';

function fail(message) {
  console.error(`\u2717 ${message}`);
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
    .toString()
    .trim();
}

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), 'utf8'));
}

function parseVersion(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v);
  if (!m) fail(`Invalid semver version: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bump(current, kind) {
  const { major, minor, patch } = parseVersion(current);
  switch (kind) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      parseVersion(kind); // validate explicit version
      return kind;
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

const arg = process.argv[2];
if (!arg) {
  fail('Provide a version or bump type. Example: npm run release -- minor');
}

// Refuse to release with a dirty working tree.
const dirty = run('git status --porcelain');
if (dirty) {
  fail('Working tree is not clean. Commit or stash changes first.');
}

const current = readJson('package.json').version;
const next = bump(current, arg);
const tag = `v${next}`;

console.log(`Releasing ${current} \u2192 ${next} (${tag})`);

// 1. Update package versions.
for (const file of PKG_FILES) {
  const path = join(root, file);
  const raw = readFileSync(path, 'utf8');
  const updated = raw.replace(
    /("version":\s*")\d+\.\d+\.\d+(")/,
    `$1${next}$2`,
  );
  if (updated === raw) fail(`Could not update version in ${file}`);
  writeFileSync(path, updated);
  console.log(`  updated ${file}`);
}

// 2. Update the changelog.
const changelogPath = join(root, CHANGELOG);
let changelog = readFileSync(changelogPath, 'utf8');

if (!changelog.includes('## [Unreleased]')) {
  fail('CHANGELOG.md is missing an "## [Unreleased]" section.');
}

changelog = changelog.replace(
  '## [Unreleased]',
  `## [Unreleased]\n\n## [${next}] - ${today()}`,
);

// Refresh the link references at the bottom of the file.
changelog = changelog
  .replace(
    /\[Unreleased\]:.*$/m,
    `[Unreleased]: https://github.com/${REPO}/compare/${tag}...HEAD`,
  )
  .replace(
    /(\[Unreleased\]:.*\n)/,
    `$1[${next}]: https://github.com/${REPO}/compare/v${current}...${tag}\n`,
  );

writeFileSync(changelogPath, changelog);
console.log(`  updated ${CHANGELOG}`);

// 3. Commit and tag.
run(`git add ${PKG_FILES.join(' ')} ${CHANGELOG}`);
run(`git commit -m "chore(release): ${tag}"`);
run(`git tag -a ${tag} -m "Release ${tag}"`);

console.log(`\u2713 Committed and tagged ${tag}.`);
console.log('Next: review the changes, then run');
console.log('  git push --follow-tags');
