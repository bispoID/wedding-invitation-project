# Estratégia de testes

Resultados e aceites são checkpoints por data e SHA em
[qa-final-evidence.md](history/qa-final-evidence.md). Este documento define seleção,
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
`npm run test` é um alias para `npm run test:node`, sem uma segunda seleção.

## Descoberta e contagem Node

A seleção explícita de `package.json` inclui `app-config`, `prepare-static-site`,
`admin-block3`, `guest-list-controller`, `event-config`, `environment-isolation`,
`vercel-deployment`, `pages-uat` e `password-recovery`.
O agregador `admin-block3.test.mjs` já importa `envelope-motion`,
`welcome-typography`, `welcome-wallpaper` e `invitation-names`: todos os arquivos
de teste em `scripts/` estão cobertos, sem executá-los novamente como entradas.

O glob `node --test scripts/*.test.mjs` serve para conferir a descoberta, mas
repete as quatro suítes importadas. A diferença de 75 execuções na auditoria
não é cobertura adicional. Os resultados históricos e as contagens datadas da
validação estão em [qa-final-evidence.md](history/qa-final-evidence.md).

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

`password-recovery.test.mjs` cobre solicitação neutra, falhas/rate limit,
concorrência, retorno validado por evento, sessão anterior, acesso direto/reload,
erros de link, limpeza da URL, confirmação/política de senha, rejeições do Auth,
atualização só da senha, logout local e retry separado. Fixtures do DOM verificam
o formulário bloqueado/liberado e a confirmação persistente com link ao login; isso não equivale ao
aceite visual. Root/subpath são cobertos também pelo preparador da allowlist.
Validação funcional DEV concluída e distinção do último ajuste visual automatizado:
[validação DEV de senha](history/password-recovery-dev-validation.md).
A regressão de 25/10 cobre `SIGNED_IN` reemitido pelo SDK para a mesma sessão,
troca efetiva de `session_id`, renovação do token, perda da resposta de update,
confirmação antes de logout demorado e sucesso que eventos tardios não substituem.

Pages exige CI completo do mesmo SHA por workflow_call, depois o gate portátil,
o build UAT e a auditoria do artefato. Production exige o check homologado antes
da promoção e executa CI novamente no push. [Publicação](environments.md#proteções-e-promoção).

## Etapa 1 UAT — cobertura local

Os resultados de 16–17/10/2026 foram preservados no
[histórico das fases](history/development-phases.md#etapa-1-uat--cobertura-local).
A cobertura implementada permanece descrita acima; o checkpoint não representa
backlog atual nem nova execução de testes.
