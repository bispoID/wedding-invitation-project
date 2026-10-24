# Estratégia de testes

Resultados e aceites são checkpoints por data e SHA em
[qa-final-evidence.md](qa-final-evidence.md). Este documento define seleção,
permissões e limites dos testes, não disponibilidade atual dos serviços.

## Camadas

- **Node unit/static:** `npm run test:node` verifica módulos de frontend,
  paginação, configuração, build portátil e contratos CSS/HTML selecionados.
  DOM, fontes, timers e WAAPI são substituídos por doubles pequenos; por isso
  esses testes não provam renderização real.
- **Deno unit:** `supabase/functions/**/*_test.ts` exercita validação,
  autenticação, CORS, handlers e contingência com dependências injetadas.
  Fixtures usam UUIDs e valores `example.invalid`, sem dados do evento.
- **SQL local:** `supabase/tests/block3.sql` e `supabase/tests/dev-rpc.sql`
  rodam depois das migrations, cada uma em transação local com rollback.
  Verificam RLS, grants, singleton, constraints, trigger, permissões de RPC,
  rate limiting, paginação, busca literal e métricas globais.
- **DEV integration:** `npm run dev:integration` exige um API URL local,
  autentica o administrador sintético, percorre Event Config, RSVP, CRUD,
  paginação, contingência e limpeza. Os registros têm e-mails sintéticos e são
  removidos ao final.

## O que cada camada não afirma

Sintaxe e testes estáticos não substituem navegador real. O smoke de integração
não substitui auditoria de produção nem autoriza escrita remota. A execução de
testes locais também não constitui evidência de deploy, GitHub Pages, Vercel ou
Google Sheets.

## Comandos recomendados

```text
npm run test:node
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
npm run dev:health
npm run dev:integration
```

`npm run dev:test` chama a mesma seleção Node de `test:node`, sem exigir Docker,
credenciais ou serviços. O CI usa esse comando canônico; SQL e integração são
etapas locais separadas, com os comandos em [local-development.md](local-development.md).

## Descoberta e contagem Node

A seleção explícita de `package.json` inclui `app-config`, `prepare-static-site`,
`admin-block3`, `guest-list-controller`, `event-config`, `environment-isolation`,
`vercel-deployment` e `pages-uat`.
O agregador `admin-block3.test.mjs` já importa `envelope-motion`,
`welcome-typography`, `welcome-wallpaper` e `invitation-names`: todos os arquivos
de teste em `scripts/` estão cobertos, sem executá-los novamente como entradas.

O glob `node --test scripts/*.test.mjs` serve para conferir a descoberta, mas
repete as quatro suítes importadas. A diferença de 75 execuções na auditoria
não é cobertura adicional. Os resultados históricos e as contagens datadas da
validação estão em [qa-final-evidence.md](qa-final-evidence.md).

`environment-isolation.test.mjs` cobre os contratos estáticos de configuração
local fail-closed, contingência sem Google Sheets, comandos/arquivos locais e
a classificação de processos antes de encerrar PIDs persistidos. Os testes do
preparador agora cobrem a allowlist completa, contratos explícitos UAT/PRD,
bloqueio de manifestos não provisionados/sintéticos e destinos não aprovados,
ausência de fetch em falhas,
redirects recusados e artefatos root/subpath com mocks. Não há fallback PRD.

Para mudanças só em Markdown, conferir diff/whitespace, links, âncoras e
veracidade das afirmações contra os consumidores versionados; não repetir a
suíte da aplicação sem dependência técnica demonstrada. Para código, selecionar
as camadas afetadas e usar fixtures; novo E2E remoto exige escopo autorizado.

Pages exige CI completo do mesmo SHA por workflow_call, depois o gate portátil,
o build UAT e a auditoria do artefato. Production exige o check homologado antes
da promoção e executa CI novamente no push. [Publicação](environments.md#proteções-e-promoção).

## Etapa 1 UAT — cobertura local

Registro histórico de 16–17/10/2026; não representa backlog atual.

App Config exercita validação v1 DEV/UAT/PRD, chaves legadas/publishable,
destinos cruzados, hosts desconhecidos, compatibilidade do DEV legado, namespace
do cliente Supabase e bootstrap ordenado com erro acessível. Os testes de build
comparam todos os assets permitidos byte a byte, verificam o manifesto gerado,
metadados, exclusão de arquivos internos e bloqueio de credenciais privilegiadas.

Fixtures e políticas sintéticas vivem somente em scripts/environment-fixtures.mjs;
não são configuração real de UAT e não integram o artefato. Nenhum teste do CI
precisa consultar Supabase. Deno e a seleção canônica do package.json permanecem
inalterados. As novas verificações estão nas suítes já selecionadas, sem duplicação.
Naquele primeiro checkpoint, DEV integrado estava pendente de infraestrutura;
a retomada abaixo resolveu a indisponibilidade. Doubles não equivalem a
navegação, autenticação ou submissão real no Docker.

Resultado local em 16/10/2026 nesta etapa: **308 testes Node aprovados, 150 Deno
aprovados**, sem falhas, cancelamentos ou skips na seleção canônica. Sintaxe
aprovada em 46 arquivos JS/MJS (incluindo os novos) e git diff --check limpo.
Quatro artefatos sintéticos (UAT/PRD × root/subpath) foram gerados, inspecionados
nos testes e removidos pelo teardown. Nenhum artefato real PRD foi preparado.
A configuração DEV ignorada existente foi validada sem imprimir valores;
portas locais consultadas indisponíveis e dev:health sem conclusão, interrompido.
Não houve execução remota de CI, deploy ou GET Event Config PRD.

Retomada em 17/10/2026: **310 testes Node aprovados**, incluindo duas regressões
de recuperação explícita após HTTP 503. Health e integração DEV passaram, e os
fluxos administrativos foram verificados no navegador com backend local.
Detalhes, captura sanitizada e limites de aceite:
[uat-dynamic-revalidation.md](uat-dynamic-revalidation.md).
