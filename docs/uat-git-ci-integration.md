# Etapa 5A — integração Git local e bloqueio de publicação

> **Registro histórico de etapa.** Estados, limites, bloqueios e próximas ações
> abaixo valem na data do checkpoint, não como backlog atual. A separação foi
> concluída posteriormente: [estado atual](development_roadmap.md#estado-atual).
> Operação vigente: [environments.md](environments.md).

## Atualização — Etapa 5B.1, 23–24/10/2026, rulesets remotos ativos

Protect Staging `25768317` e Protect Production `25768402` foram criados nessa
ordem, com validação de staging antes da segunda escrita. Cada um corresponde
exclusivamente à respectiva refs/heads/staging ou refs/heads/production; target
branch, active, somente deletion e non_fast_forward. Dashboard autenticado
confirma bypass vazio em ambos; API confirma escopo e regras efetivas. Nenhuma
regra adicional foi habilitada. Fast-forward por atores com escrita continua
permitido, sem autorização implícita para promoção ou publicação.

SHAs remotos preservados: desenvolvimento 82450ab, staging 5ca164f, production
b5995cf; também foram reconferidas as demais oito branches. Environment Pages
staging-only, seus reviewers/wait/bypass, Source Actions e Vercel production /
Preview desligado permaneceram inalterados. CI 40043031879 e deployment Pages
7028282932 continuam os últimos; nenhum deployment Vercel novo foi observado.

Os dois commits locais anteriores, incluindo os gates Pages, continuam sem push;
este registro acrescenta somente um commit documental local. Nenhuma alteração
de código/workflow ou publicação foi executada na Etapa 5B.1. Publicar o SHA final
de desenvolvimento e obter CI exige autorização 5B.2; promover staging exige
autorização posterior 5C. Required checks e PR/revisores exigem avaliação separada
para não bloquear o mantenedor único ou criar dependência circular com Pages.
[Validação completa e administração dos rulesets](github-pages-uat-preparation.md).
As descrições anteriores de branches desprotegidas são checkpoints históricos.

## Atualização — Etapas 5A.2, 5A.3 e preparação 5B, 23/10/2026

O bloqueio remoto Preview Branch Tracking foi salvo e confirmado na Vercel.
O push exclusivo de desenvolvimento publicou 82450ab9727b932a7c5e04fe52ae0f3b38c57065;
CI 40043031879 aprovado (342 Node, 150 Deno), sem novos deployments observados.
Staging e production não foram promovidas. O gate do primeiro push descrito na
seção 5A.1 abaixo foi resolvido por essas etapas, não permanece um bloqueio atual.

Etapa 5B: variáveis públicas UAT configuradas em github-pages; Pages e proteções
Git auditados, gates de publicação corrigidos somente localmente. Novo commit
773fd598b604c85082b84f04e06a9b40184487ce e documentação subsequente não possuem
CI remoto aprovado. Build local rastreável validado, sem publicação. Staging e
production continuam sem proteção remota; as propostas exigem autorização.
[Resultado completo e plano de promoção](github-pages-uat-preparation.md).

## Atualização — Etapa 5A.1, 23/10/2026

**PREPARADA COM RESSALVAS.** A configuração Git Vercel foi preparada e validada
somente localmente. O gate do próximo push continua bloqueado pelo risco ainda
não comprovado do primeiro evento que introduz o arquivo. Nenhum push, merge,
deployment, Preview, redeploy ou alteração remota foi executado nesta etapa.

### Auditoria remota somente leitura

A consulta API com escopo explícito retornou 403; não foram feitas tentativas
indiscriminadas. Depois que o usuário autenticou a janela Vercel do Codex, a
leitura das páginas General, Git, Environments e Build and Deployment confirmou:

| Campo | Valor observado no Dashboard |
| --- | --- |
| Projeto | wedding-invitation-project |
| Project ID | prj_ddkuhQTns4qqaGCXtBoq5ilWoteb |
| Conta | Pessoal, Hobby; slug d7-af27 |
| Repositório conectado | bispoID/wedding-invitation-project |
| Production Branch | production |
| Root Directory | raiz do repositório; campo sem subdiretório, exibindo ./ |
| Framework | Other |
| Build Command | node scripts/prepare-static-site.mjs; Override ligado |
| Output Directory | _site; Override ligado |
| Install/Development Command | Overrides desligados |
| Ignored Build Step | Only build production |
| Preview Branch Tracking | habilitado, All unassigned branches |

O comando de ignore observado foi
`if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi`.
Ele filtra o ambiente Vercel, não é o nome da branch nem comprova ausência de
criação de deployment. Não foi alterado. O projeto não apresentou Deploy Hooks
nem integrações Marketplace instaladas; eventos deployment_status e
repository_dispatch estavam habilitados na integração Git, também preservados.

O Dashboard mostrava produção Ready, domínio bruna-e-diego.vercel.app, commit
`b5995cf53be3085f9b1d418b8cddf08154afd303` e deployment
`F8r3e6u28EY2NimfGtZLSUmP1Bvf`. O histórico também confirmou Preview Ready da
feature, como `2JNctYnkXVswqUvgKroaYYkmhR8P`, e de staging. Nenhuma URL do
frontend ou serviço Supabase foi aberta para teste funcional. Somente páginas
de settings/metadados foram consultadas; nenhum botão Save foi acionado.

### Política local e regressões

Não havia arquivo Vercel anterior. `vercel.json` fica na raiz do repositório,
compatível com o Root Directory confirmado; não dentro de invite-app. Ele contém
apenas o schema oficial e git.deploymentEnabled com os nomes exatos
feature/landing-page=false e staging=false. Não há bloqueio global, globs ou
regra true sobreposta. Production e outras branches não são declaradas, mantendo
o default true documentado. Build, saída, domínios e roteamento não recebem overrides.

`scripts/vercel-deployment-policy.mjs` é um gate local estrito desta política,
não uma implementação geral de minimatch ou de todo o schema Vercel. Recusa
propriedades não revisadas e qualquer regra extra; valida Production Branch
contra os bloqueios. Mudanças futuras na branch produtiva, Root Directory ou
regras exigem nova auditoria e atualização explícita dos testes.

Foram acrescentadas 30 regressões à seleção canônica em package.json:
**342 Node aprovados**, 150 Deno com deny-net e 48 JS/MJS com sintaxe válida.
Os testes não consultam Vercel, Supabase ou credenciais. Cobrem nomes exatos,
produção e outras branches, configuração inválida, conflitos true/glob,
propriedades privadas e overrides, configuração única na raiz e exclusão da
allowlist do frontend. Quatro builds sintéticos UAT/PRD root/subpath e contratos
DEV continuam aprovados; DEV serve source e não tem build publicado.

O schema público https://openapi.vercel.sh/vercel.json foi consultado. O dialeto
integral Draft 4 não foi aceito pelo Test-Json disponível; validou-se uma projeção
equivalente dos únicos nós aplicáveis ao arquivo: objeto raiz sem propriedades
extras, $schema string, git object e deploymentEnabled com oneOf boolean/object
e valores booleanos. Esses constraints mantêm a semântica nos dialetos usados.
O arquivo passou e uma string no lugar de boolean foi rejeitada. O gate Node
adiciona as restrições específicas mais fortes deste projeto. Nenhum pacote foi
instalado; não foi executado Vercel build/deploy como ferramenta de validação.

### Primeiro push e condição para retomar a Etapa 5A

A documentação oficial descreve bloqueio por commits nas branches e prioridade
de qualquer correspondência true. Não se obteve garantia explícita suficiente
da sequência de leitura do arquivo no próprio primeiro evento que o adiciona,
antes da criação de qualquer registro de Preview. A validação local não prova
esse comportamento remoto; não se fez push experimental para investigá-lo.

Esta política está somente no histórico local de feature/landing-page. Não é
um setting global aplicado à Vercel nem uma alteração das árvores remotas de
staging/production. Um futuro push de staging precisa conter a configuração
correta no commit avaliado e passar pela mesma revisão de efeitos automáticos.

Antes de publicar: obter confirmação técnica oficial sobre o primeiro evento,
ou aprovar separadamente uma proteção prévia específica que impeça deployments
da branch sem afetar produção. Qualquer mudança remota precisa de autorização
própria; não desconectar a integração, trocar Production Branch, desabilitar
globalmente deployments ou alterar o ignore como atalho.

Após resolver esse gate e receber autorização separada: novo fetch, comparação
dos HEADs, ancestralidade e worktree, testes do HEAD final, push exclusivo da
feature/landing-page e acompanhamento do Test baseline pelo mesmo SHA. Não
disparar workflow Pages como CI. As branches de publicação permanecem intactas.

Referências oficiais consultadas:

- [Git Configuration](https://vercel.com/docs/project-configuration/git-configuration)
- [Static Configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [Production Branch](https://vercel.com/docs/git#customizing-the-production-branch)
- [Ignored Build Step](https://vercel.com/docs/monorepos#ignoring-the-build-step)

Os registros seguintes são o checkpoint histórico da Etapa 5A, anterior à
auditoria autenticada e à preparação local descritas acima.

## Resultado original da Etapa 5A — 23/10/2026

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
