import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { configFromEnvironment } from './prepare-static-site.mjs';
import { preparePagesUatSite } from './pages-uat.mjs';

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--output' || !args[1])) throw new Error('Usage: prepare-pages-uat.mjs [--output NEW_DIRECTORY]');
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (process.env.GITHUB_ACTIONS === 'true' && process.env.GITHUB_SHA !== head) throw new Error('Checkout does not match the workflow SHA.');
    const result = await preparePagesUatSite({
      config: configFromEnvironment(process.env), outputDir: resolve(args[1] ?? '_site'),
      expectedSha: head, githubRef: process.env.GITHUB_REF, githubActions: process.env.GITHUB_ACTIONS === 'true',
    });
    // Somente evidência sanitizada; nunca imprimir a chave pública ou respostas Auth.
    console.log(JSON.stringify({ buildId: result.buildId, projectRef: result.projectRef,
      publicSiteUrl: result.publicSiteUrl, fileCount: result.fileCount, manifestSha256: result.manifestSha256 }));
  } catch (error) {
    console.error(`Pages UAT preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
