export const VERCEL_SCHEMA_URL = 'https://openapi.vercel.sh/vercel.json';
// Branch Tracking conferido no Dashboard em 23/10/2026; mudanças exigem nova auditoria.
export const VERCEL_PRODUCTION_BRANCH = 'production';
export const BLOCKED_VERCEL_BRANCHES = Object.freeze(['feature/landing-page', 'staging']);

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasExactKeys = (value, keys) => isRecord(value) && Object.keys(value).length === keys.length &&
  keys.every(key => Object.hasOwn(value, key));

/**
 * Gate estrito desta política, não um validador genérico de toda configuração Vercel.
 * Os tipos usados correspondem ao schema oficial; propriedades extras, secrets,
 * overrides de build e novos padrões precisam de revisão explícita.
 * Nenhuma chamada remota ou criação de deployment é feita aqui.
 */
export function validateVercelDeploymentPolicy(config, {
  productionBranch = VERCEL_PRODUCTION_BRANCH,
} = {}) {
  if (typeof productionBranch !== 'string' || !productionBranch.trim() ||
      BLOCKED_VERCEL_BRANCHES.includes(productionBranch)) {
    throw new Error('Production branch conflicts with the deployment policy.');
  }
  if (!hasExactKeys(config, ['$schema', 'git']) || config.$schema !== VERCEL_SCHEMA_URL ||
      !hasExactKeys(config.git, ['deploymentEnabled'])) {
    throw new Error('Only the reviewed schema and Git deployment policy are allowed.');
  }
  const rules = config.git.deploymentEnabled;
  if (!hasExactKeys(rules, BLOCKED_VERCEL_BRANCHES)) {
    // Não simulamos minimatch: qualquer regra adicional, inclusive um true que
    // possa sobrepor os bloqueios, é recusada até uma nova revisão.
    throw new Error('Unexpected branch rules or global deployment override.');
  }
  if (Object.values(rules).some(value => value !== false)) {
    throw new Error('Both reviewed branches must use the boolean false.');
  }
  return config;
}

/** Sem globs nesta política, branches não declaradas mantêm o default true. */
export function isGitDeploymentEnabled(config, branch, options) {
  const { git: { deploymentEnabled } } = validateVercelDeploymentPolicy(config, options);
  if (typeof branch !== 'string' || !branch) throw new Error('A branch name is required.');
  return Object.hasOwn(deploymentEnabled, branch) ? deploymentEnabled[branch] : true;
}
