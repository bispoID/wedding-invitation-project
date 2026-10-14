# Estratégia de testes

## Camadas

- **Node unit/static:** `scripts/*.test.mjs` verifica módulos de frontend,
  paginação, configuração, build portátil e contratos CSS/HTML selecionados.
  DOM, fontes, timers e WAAPI são substituídos por doubles pequenos; por isso
  esses testes não provam renderização real.
- **Deno unit:** `supabase/functions/**/*_test.ts` exercita validação,
  autenticação, CORS, handlers e contingência com dependências injetadas.
  Fixtures usam UUIDs e valores `example.invalid`, sem dados do evento.
- **SQL local:** `supabase/tests/block3.sql` roda depois das migrations em uma
  transação local e termina com rollback. Verifica RLS, grants, singleton,
  constraints e trigger.
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
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/guest-list-controller.test.mjs scripts/event-config.test.mjs
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
npm run dev:health
npm run dev:integration
```

Ao alterar comentários ou documentação, `git diff --check` e as suítes
relevantes confirmam que a manutenção não introduziu whitespace inválido nem
quebrou sintaxe. Evidência visual deve ser reportada separadamente quando um
navegador estiver disponível.
