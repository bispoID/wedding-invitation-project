import { PRD_PROJECT_REF } from '../invite-app/scripts/shared/environment-config.js';
export const UAT_REF = 'abcdefghijklmnopqrst';
export const policy = { contractVersion: 1, uat: { projectRef: UAT_REF }, prd: { projectRef: PRD_PROJECT_REF } };
export const jwt = claims => ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'synthetic'].join('.');
export function fixture(appEnv = 'uat', overrides = {}) {
  const projectRef = appEnv === 'dev' ? 'local' : appEnv === 'prd' ? PRD_PROJECT_REF : UAT_REF;
  return { contractVersion: 1, appEnv, projectRef,
    supabaseUrl: appEnv === 'dev' ? 'http://127.0.0.1:54321' : `https://${projectRef}.supabase.co`,
    supabaseAnonKey: jwt({ role: 'anon', ref: projectRef }),
    publicSiteUrl: appEnv === 'dev' ? 'http://localhost:5500/invite-app/' : appEnv === 'uat' ? 'https://synthetic.github.io/invite/' : 'https://synthetic.example/',
    ...overrides };
}
