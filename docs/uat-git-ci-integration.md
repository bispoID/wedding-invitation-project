# Etapa 5A — integração Git local e bloqueio de publicação

## Resultado — 23/10/2026

**INTEGRAÇÃO LOCAL CONCLUÍDA — PUSH/CI PENDENTES.**

Os oito commits de `feature/uat-environment-isolation` foram incorporados em
`feature/landing-page` por fast-forward, sem conflitos ou merge commit.
Nenhum push, deploy, workflow_dispatch ou alteração de configuração remota foi
executado. O risco de Preview da Vercel impede publicar a branch nesta etapa.
Este checkpoint documental complementa a integração; não modifica a aplicação.

## Estado inicial e histórico preservado

Repositório: `https://github.com/bispoID/wedding-invitation-project.git`.
Origem local limpa: `8796727f3d701f451ff9f11099cc463af4eaa609`.
Após `git fetch origin`, destino local e `origin/feature/landing-page` em
`6b51bf898089b699e7b48fe8f4bda3d9f0b48ec7`; comparação destino/origem `0 8`.
`git merge-base --is-ancestor` confirmou a ancestralidade.

Histórico incorporado, na ordem original:

1. `afc8476` — contrato explícito, bootstrap, sessões e builds isolados.
2. `7f84fc9` — documentação de ambientes e limites de validação.
3. `70f06b0` — regressões de recuperação administrativa após HTTP 503 local.
4. `b3e4397` — evidência de revalidação dinâmica DEV.
5. `c0903a4` — aprovação do ref UAT e metadados de homologação.
6. `ed04d5c` — checkpoint do frontend UAT local.
7. `bf0f44b` — trava de reenvio RSVP após HTTP 201.
8. `8796727` — evidência e limpeza dos testes E2E no Edge.

Comandos de integração: `git switch feature/landing-page` e
`git merge --ff-only feature/uat-environment-isolation`.
HEAD imediatamente após o fast-forward:
`8796727f3d701f451ff9f11099cc463af4eaa609`; árvore idêntica à origem.
A branch de origem foi preservada. Não houve squash, rebase, reset ou tags.

## Revisão e testes locais

Revisados 37 arquivos no diff agregado e 61 versões alteradas nos oito commits.
A inspeção de caminhos e padrões de credenciais não encontrou chave privada,
Service Account JSON, secret Supabase ou arquivo operacional versionado.
Valores deliberadamente sintéticos nos testes não são credenciais reais.
UUIDs sintéticos removidos e caminhos locais nos documentos são evidências
históricas, não seeds, snapshots ou configurações operacionais publicáveis.
A inspeção não é garantia universal contra qualquer formato de segredo.

Antes e depois do fast-forward, na respectiva branch:

- `npm run test:node`: 312 aprovados; zero falhas, cancelamentos ou skips.
- Deno 2.9.7: 150 aprovados com `--no-prompt --deny-net` e somente
  `--allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID`.
- Sintaxe válida dos 46 arquivos JS/MJS versionados, com Node 22.14.0.
- `git diff --check` do worktree, último commit e intervalo integrado aprovado.
- Quatro builds sintéticos UAT/PRD × raiz/subdiretório incluídos na suíte Node.
  Fetch é simulado: nenhum build real PRD, GET Supabase ou novo E2E remoto.
- Contratos, bootstrap fail-closed, ausência de fallback, namespaces de sessão,
  redirects recusados, allowlist/bytes dos assets e trava RSVP aprovados.

Nenhuma correção funcional adicional foi necessária. O código de aplicação,
configuração e workflows integrado permaneceu idêntico ao da feature aprovada.

## Auditoria de publicação automática

Existem dois workflows na árvore integrada:

- `test.yml`, Test baseline: push em qualquer branch, pull_request e execução
  manual. Um job JavaScript and Deno tests; sem deploy, secrets ou Docker.
- `deploy-pages.yml`: push somente em `staging`; a execução manual também tem
  guard `github.ref == 'refs/heads/staging'`, checkout staging e environment
  github-pages. Só este workflow tem permissões pages:write/id-token:write,
  upload-pages-artifact e deploy-pages. A feature acrescenta apenas cinco
  variáveis públicas de seleção UAT; os filtros/guard não foram ampliados.

Metadados remotos Pages: `build_type=workflow`, HTTPS obrigatório. A API também
retorna `source.branch=main`; isso não substitui a origem por workflow nem é
prova de publicação por branch. O environment github-pages permite somente
`staging`, sem reviewer obrigatório informado e com bypass de admins permitido.
O Pages publicado não foi atualizado nem utilizado para testes funcionais.

Vercel: projeto `prj_ddkuhQTns4qqaGCXtBoq5ilWoteb`,
`wedding-invitation-project`, conta `team_fTI9LQxhX6q7r3XC5gxy8jxl`.
A leitura resumida funcionou; a consulta com escopo explícito retornou HTTP 403.
Production Branch, política atual de Preview e conteúdo do Ignored Build Step
não foram expostos pelas respostas acessíveis.

A consulta atual confirmou deployment Git da própria feature/landing-page no
SHA remoto `6b51bf8`: `dpl_6dnQ3zxPtW7UGyw7vNHE9Ln8CcWv`, CANCELED, target null,
com errorLink para Ignored Build Step. Há também deployments antigos da mesma
branch em READY, por exemplo `dpl_2JNctYnkXVswqUvgKroaYYkmhR8P`.
Cancelamento anterior não comprova que um novo push não criará outro Preview.
Por isso o push foi bloqueado; não se alterou a Vercel para contornar o gate.

## CI remoto e isolamento

O SHA integrado não foi publicado. A consulta Actions por
`8796727f3d701f451ff9f11099cc463af4eaa609` retornou zero execuções.
Não há run ID ou aprovação de CI remoto a declarar. Não se disparou workflow
de deploy como substituto e não se iniciou CI de outro SHA.

`origin/feature/landing-page` permaneceu em `6b51bf8`. Branches locais e remotas
preservadas: staging `5ca164fc4b0842378355a5eab350b540d061f068` e production
`b5995cf53be3085f9b1d418b8cddf08154afd303`. A API informou protected=false
nessas branches e rulesets vazio; não confundir o filtro Pages com proteção Git.

Nenhum Supabase, Auth, migration, secret, Edge Function, Google Cloud/Sheets,
Docker ou frontend publicado foi modificado. A árvore supabase não mudou no
intervalo integrado. Arquivos ignorados DEV e o vínculo CLI principal foram
preservados; não se carregaram suas credenciais para os testes.

## Pendências e plano da Etapa 5B — não executado

Antes de qualquer push, obter acesso de leitura suficiente às configurações
Vercel e comprovar uma política que impeça deployments desta branch. Se exigir
mudança, apresentar a proposta para autorização separada; não basta confiar em
um Ignored Build Step antigo ou na proteção de acesso ao Preview.

Só após esse gate: novo fetch, revisão de concorrência/ancestralidade, regressão
do HEAD final e push exclusivo da branch de desenvolvimento; acompanhar Test
baseline pelo mesmo SHA e confirmar ausência de qualquer deployment.

Em etapa separadamente autorizada, preparar Pages UAT: revisar o workflow e os
gates completos de teste/aprovação, conferir as variáveis públicas
UAT_SUPABASE_PROJECT_REF, UAT_SUPABASE_URL e UAT_SUPABASE_PUBLIC_KEY, a base de
configure-pages, BUILD_ID e o artefato permitido. Planejar proteção efetiva de
staging/production e reviewers do environment, sem alterar unilateralmente
essas configurações. Não promover staging antes de autorização explícita.
Homologação real e aceite visual humano permanecem distintos das fixtures e
do E2E Edge anterior. PRD/Vercel não integram a publicação UAT planejada.
