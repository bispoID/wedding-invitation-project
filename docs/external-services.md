# Ferramentas e serviços externos

Este documento registra as ferramentas e os serviços externos utilizados no
estado atual do projeto, sua finalidade e as referências oficiais para
manutenção futura.

## Supabase

**Finalidade:** backend da aplicação, PostgreSQL, Supabase Auth e Edge
Functions.

**Uso no projeto:**

- banco principal do RSVP;
- autenticação e autorização administrativa;
- Edge Function `rsvp`;
- Edge Functions administrativas;
- Edge Function pública `health`;
- logs operacionais e administrativos.

**Referências oficiais:**

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions)

## Supabase CLI

**Finalidade:** gerenciamento do projeto Supabase, migrations, consulta do
estado remoto e publicação das Edge Functions.

**Uso no projeto:**

- aplicação e verificação de migrations;
- deploy da Edge Function `health`;
- listagem das funções publicadas;
- desenvolvimento local quando necessário.

**Referência oficial:**

- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## UptimeRobot

**Finalidade:** monitoramento externo e alertas de indisponibilidade.

**Uso no projeto:**

- monitor `Supabase — Health Check RSVP`;
- consulta do endpoint remoto de Health Check por `HEAD`;
- intervalo de 5 minutos;
- alerta por e-mail em caso de falha;
- monitoramento independente do computador local e do painel administrativo.

A configuração atual do monitor está detalhada em
[health-check.md](health-check.md).

**Referência oficial:**

- [UptimeRobot](https://uptimerobot.com/)
- [UptimeRobot — criação de monitor](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide)

## GitHub Pages

**Finalidade:** hospedagem atual do frontend estático publicado.

**Uso no projeto:**

- publicação do conteúdo de `invite-app`;
- URL atualmente monitorada:
  `https://bispoid.github.io/wedding-invitation-project`.

O monitor do frontend verifica a disponibilidade da página. Ele é independente
do monitor do Supabase, que verifica os pré-requisitos operacionais do RSVP.

**Referência oficial:**

- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## Node.js e npm

**Finalidade:** runtime e ecossistema utilizados pelas ferramentas e comandos do
projeto.

**Uso no projeto:**

- dependências de desenvolvimento;
- execução de ferramentas JavaScript quando necessário;
- gerenciamento do `package.json` e `package-lock.json`.

**Referências oficiais:**

- [Node.js](https://nodejs.org/)
- [Node.js Learn](https://nodejs.org/learn)
- [npm Documentation](https://docs.npmjs.com/)

## Deno

**Finalidade:** runtime TypeScript compatível com as Supabase Edge Functions e
execução dos testes unitários do Health Check.

**Uso no projeto:**

- runtime das Edge Functions no ambiente Supabase;
- testes em `supabase/functions/health/health_test.ts`;
- checagem TypeScript dos módulos da função.

A validação remota da função foi concluída. A execução completa da suíte no
Windows ficou temporariamente bloqueada por um panic interno conhecido do runner
do Deno 2.9.7, antes da execução das asserções. A checagem com
`deno test --no-run` passou.

**Referências oficiais:**

- [Deno Documentation](https://docs.deno.com/runtime/)
- [Deno CLI Reference](https://docs.deno.com/runtime/reference/cli/)
- [Deno Testing](https://docs.deno.com/runtime/reference/cli/test/)

## Serviços não considerados atuais

A Vercel permanece prevista no roadmap para uma fase posterior. O projeto não
deve tratar a Vercel como infraestrutura atualmente em produção neste documento.
