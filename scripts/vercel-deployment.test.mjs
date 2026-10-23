import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { isPublicPath } from './prepare-static-site.mjs';
import {
  BLOCKED_VERCEL_BRANCHES,
  VERCEL_PRODUCTION_BRANCH,
  VERCEL_SCHEMA_URL,
  isGitDeploymentEnabled,
  validateVercelDeploymentPolicy,
} from './vercel-deployment-policy.mjs';

const root = new URL('../', import.meta.url);
const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
const fixture = rules => ({ $schema: VERCEL_SCHEMA_URL, git: { deploymentEnabled: rules } });
const reviewedRules = () => ({ 'feature/landing-page': false, staging: false });

test('root Vercel configuration contains only the reviewed exact branch policy', () => {
  assert.equal(validateVercelDeploymentPolicy(config), config);
  assert.deepEqual(config, fixture(reviewedRules()));
  assert.equal(VERCEL_PRODUCTION_BRANCH, 'production');
  assert.deepEqual(BLOCKED_VERCEL_BRANCHES, ['feature/landing-page', 'staging']);
});

for (const branch of BLOCKED_VERCEL_BRANCHES) test(`Vercel automatic deployment is disabled for ${branch}`, () => {
  assert.equal(isGitDeploymentEnabled(config, branch), false);
});

test('confirmed production branch retains the unspecified true default', () => {
  assert.equal(Object.hasOwn(config.git.deploymentEnabled, VERCEL_PRODUCTION_BRANCH), false);
  assert.equal(isGitDeploymentEnabled(config, VERCEL_PRODUCTION_BRANCH), true);
});

test('other branches and exact-name near matches keep their existing default', () => {
  for (const branch of ['main', 'feature/another', 'feature/landing-page-next', 'staging-fix', 'Staging']) {
    assert.equal(isGitDeploymentEnabled(config, branch), true);
  }
});

for (const [name, candidate] of [
  ['missing object', undefined],
  ['null object', null],
  ['array instead of object', []],
  ['missing contract', {}],
  ['wrong schema URL', { ...fixture(reviewedRules()), $schema: 'https://example.invalid/schema' }],
  ['global false', fixture(false)],
  ['global true', fixture(true)],
  ['string boolean', fixture({ ...reviewedRules(), staging: 'false' })],
  ['enabled development', fixture({ ...reviewedRules(), 'feature/landing-page': true })],
  ['missing staging', fixture({ 'feature/landing-page': false })],
  ['wrong branch name', fixture({ 'feature/landing-page': false, Staging: false })],
  ['overlapping wildcard true', fixture({ ...reviewedRules(), '*': true })],
  ['overlapping feature glob true', fixture({ ...reviewedRules(), 'feature/*': true })],
  ['explicit production block', fixture({ ...reviewedRules(), production: false })],
  ['private environment configuration', { ...fixture(reviewedRules()), env: { SECRET: 'synthetic-only' } }],
  ['project identifier', { ...fixture(reviewedRules()), projectId: 'synthetic-only' }],
  ['build command override', { ...fixture(reviewedRules()), buildCommand: 'synthetic-only' }],
  ['output directory override', { ...fixture(reviewedRules()), outputDirectory: 'synthetic-only' }],
  ['redirect override', { ...fixture(reviewedRules()), redirects: [] }],
  ['rewrite override', { ...fixture(reviewedRules()), rewrites: [] }],
  ['unreviewed Git property', { ...fixture(reviewedRules()), git: { deploymentEnabled: reviewedRules(), other: true } }],
]) test(`deployment policy rejects ${name}`, () => {
  assert.throws(() => validateVercelDeploymentPolicy(candidate));
});

test('a future production branch matching either blocked branch requires a new decision', () => {
  for (const productionBranch of BLOCKED_VERCEL_BRANCHES) {
    assert.throws(() => validateVercelDeploymentPolicy(config, { productionBranch }), /Production branch conflicts/);
  }
});

test('invalid JSON is rejected before policy selection', () => {
  assert.throws(() => JSON.parse('{"git":'), SyntaxError);
});

test('the root policy has no competing app-local or programmatic configuration', async () => {
  const formats = ['json', 'ts', 'toml', 'js', 'mjs', 'cjs', 'mts'];
  const paths = [
    ...formats.filter(format => format !== 'json').map(format => `vercel.${format}`),
    ...formats.map(format => `invite-app/vercel.${format}`),
    '.vercelignore', 'invite-app/.vercelignore',
  ];
  for (const path of paths) await assert.rejects(access(new URL(path, root)), { code: 'ENOENT' });
});

test('Vercel policy and validation scripts never enter the portable frontend allowlist', () => {
  for (const path of ['vercel.json', 'scripts/vercel-deployment-policy.mjs', 'scripts/vercel-deployment.test.mjs']) {
    assert.equal(isPublicPath(path), false);
  }
});
