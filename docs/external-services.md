# Ferramentas e serviços externos

Este documento registra as ferramentas e os serviços externos utilizados no
estado atual do projeto, sua finalidade e as referências oficiais para
manutenção futura.

## Supabase

**Finalidade:** backend da aplicação, PostgreSQL, Supabase Auth e Edge
Functions.

**Uso no projeto:**

- banco principal do RSVP;
- singleton `event_config` com os dados públicos do evento;
- autenticação e autorização administrativa;
- Edge Function `rsvp`;
- Edge Functions administrativas;
- leitura pública por `event-config` e edição por `admin-manage-event-config`;
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
- publicação das Edge Functions em checkpoints autorizados;
- listagem das funções publicadas;
- ambiente Supabase local descartável para validação SQL.

A versão utilizada no Bloco 7 é `2.120.0`, instalada como dependência de
desenvolvimento na raiz. Use `npx --no-install supabase` para executar a versão
do lockfile. Operações remotas exigem autorização própria; a suíte SQL nunca
deve ser executada contra produção.

**Referência oficial:**

- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)

## Docker Desktop e WSL2

**Finalidade:** executar o Supabase local em containers Linux descartáveis.

No Bloco 7, PostgreSQL 17.6 recebeu as 15 migrations por reset local sem seed.
`supabase/tests/block3.sql` passou integralmente duas vezes, com ROLLBACK e dados
sintéticos; os serviços iniciados para o teste foram encerrados. Detalhes:
[event-config.md](event-config.md#validação-local).

A falha do coletor local Vector ao consultar a API Docker por TCP não impediu
a validação do banco. Não é necessário expor a API Docker sem autenticação nem
alterar produção para executar essa suíte.

## UptimeRobot

**Finalidade:** monitoramento externo e alertas de indisponibilidade.

**Uso no projeto:**

- monitor `Supabase — Health Check RSVP`;
- consulta do endpoint remoto de Health Check por `HEAD`;
- intervalo de 15 minutos;
- alerta por e-mail em caso de falha;
- monitoramento independente do computador local e do painel administrativo.

A configuração atual do monitor está detalhada em
[health-check.md](health-check.md).

**Referência oficial:**

- [UptimeRobot](https://uptimerobot.com/)
- [UptimeRobot — criação de monitor](https://help.uptimerobot.com/en/articles/11358364-how-to-create-your-first-monitor-on-uptimerobot-quick-setup-guide)

## GitHub Pages

**Finalidade:** implementação operacional da hospedagem estática inicialmente
adotada para o frontend.

**Uso no projeto:**

- preparação de `invite-app` em `_site`, com `PUBLIC_SITE_URL` operacional;
- publicação do artefato pelo workflow `deploy-pages` em `feature/landing-page`;
- URL atualmente monitorada:
  `https://bispoid.github.io/wedding-invitation-project`.

O monitor do frontend verifica a disponibilidade da página. Ele é independente
do monitor do Supabase, que verifica os pré-requisitos operacionais do RSVP.

GitHub Pages não é uma dependência da arquitetura. A preparação e os testes
cobrem URLs root/subpath; a publicação em subpath foi validada nos checkpoints.
Um novo provedor exigirá validar suas URLs e origins efetivamente utilizados,
mantendo as regras de negócio nas Supabase Edge Functions.

**Referência oficial:**

- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## Node.js e npm

**Finalidade:** runtime e ecossistema utilizados pelas ferramentas e comandos do
projeto.

**Uso no projeto:**

- dependências de desenvolvimento;
- execução de ferramentas JavaScript quando necessário;
- testes de App Config, preparação portátil, Admin e Event Config;
- preparação do artefato estático e execução do Supabase CLI;
- gerenciamento do `package.json` e `package-lock.json`.

**Referências oficiais:**

- [Node.js](https://nodejs.org/)
- [Node.js Learn](https://nodejs.org/learn)
- [npm Documentation](https://docs.npmjs.com/)

## Deno

**Finalidade:** runtime TypeScript compatível com as Supabase Edge Functions e
execução dos testes unitários das Functions e das métricas administrativas.

**Uso no projeto:**

- runtime das Edge Functions no ambiente Supabase;
- testes das Functions em `supabase/functions`;
- teste adicional em `invite-app/admin/scripts/guest-metrics.test.ts`;
- checagem TypeScript dos módulos de teste.

A validação remota do health foi concluída anteriormente. Na auditoria e no
Lote 1, o runner Deno `2.9.7` apresentou panic de named pipe no Windows dentro
do isolamento local, antes de executar as asserções. A checagem com
`deno test --no-run` passou para os oito arquivos daquela baseline. Em **08/10/2026**, o mesmo
comando completo, com rede negada e as duas permissões de ambiente abaixo,
executou fora desse isolamento no mesmo Windows: **57 testes aprovados, zero
falhas**. Não há evidência para atribuir a falha a todo ambiente Windows ou
às asserções do projeto.

### Baseline Linux / CI

O workflow `../.github/workflows/test.yml` utiliza `ubuntu-24.04`, Node.js
`22.14.0` e Deno `2.9.7`, mantendo a versão Deno observada localmente para
separar limitações do ambiente local de falhas nas asserções. É acionado por push,
pull request ou execução manual, sem realizar deploy e sem alterar o workflow
de GitHub Pages.

A validação sintática descobre os arquivos `.js` versionados pelo Git e exclui
diretórios gerados ou de dependências. A execução Deno descobre os testes em
`supabase/functions` e inclui o arquivo de métricas explicitamente. A baseline
atual contém treze arquivos Deno:

```text
supabase/functions/_shared/admin-auth_test.ts
supabase/functions/_shared/event-validation_test.ts
supabase/functions/_shared/google-sheets_test.ts
supabase/functions/_shared/guest-validation_test.ts
supabase/functions/admin-list-contingency/list_test.ts
supabase/functions/admin-list-guests/handler_test.ts
supabase/functions/admin-manage-event-config/handler_test.ts
supabase/functions/admin-manage-guests/handler_test.ts
supabase/functions/admin-recover-contingency/recovery_test.ts
supabase/functions/event-config/handler_test.ts
supabase/functions/health/health_test.ts
supabase/functions/rsvp/handler_test.ts
invite-app/admin/scripts/guest-metrics.test.ts
```

Comando equivalente, executado a partir da raiz do projeto:

```text
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
```

As duas permissões de ambiente são necessárias porque `google-sheets_test.ts`
cria e restaura valores sintéticos nessas variáveis. Os testes substituem
`fetch`; o acesso real à rede é explicitamente negado. Não há `--allow-all`,
permissão de escrita, execução de subprocessos, leitura runtime de arquivos
ou acesso a secrets de produção. O runner permite somente `contents: read`
no GitHub, sem persistir credenciais no checkout. As actions de setup precisam
baixar os runtimes, mas os testes não acessam serviços externos.

O CI também executa `git diff --check HEAD^ HEAD`, para verificar a diferença
do commit obtido pelo checkout, e `git diff --check`, para o working tree. A
baseline do Lote 1 passou no GitHub Actions em 08/10/2026 (execução 37852513840).
As extensões de App Config, preparação portátil, Admin e Event Config também
estão publicadas e integram o CI. A baseline de **144 Deno e 119 Node (263)**
passou localmente e em Linux no Bloco 7, execução
[37934156785](https://github.com/bispoID/wedding-invitation-project/actions/runs/37934156785),
em 09/10/2026. Comandos: [invite-app/README.md](../invite-app/README.md#configuração-pública-e-publicação-portátil).

`--no-run` valida os módulos sem executar asserções. Um panic do runner deve ser
registrado como bloqueio de runtime/ambiente, não como teste aprovado nem como
assertion failure. A execução completa Windows fora do isolamento já passou;
Linux/CI teve a regressão completa confirmada; novas alterações exigem
nova validação. Testes individuais ou WSL, quando disponível,
podem auxiliar o diagnóstico.

### Regressão e validação SQL

O backend de Event Config, a criação manual de convidados e o frontend dinâmico
foram implantados nos checkpoints autorizados. A suíte Node cobre também os
estados de interface e o collapsible com DOM simulado; não substitui toda a
matriz manual de acessibilidade/navegadores do roadmap.

O CI não executa SQL, deploy de Supabase ou conexão a produção. A suíte SQL
separada foi aprovada integralmente no Bloco 7, exclusivamente em banco local
descartável. Contratos e evidências: [event-config.md](event-config.md).

Comando Node atualizado:

```text
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/event-config.test.mjs
```

**Referências oficiais:**

- [Deno Documentation](https://docs.deno.com/runtime/)
- [Deno CLI Reference](https://docs.deno.com/runtime/reference/cli/)
- [Deno Testing](https://docs.deno.com/runtime/reference/cli/test/)

## Portabilidade e alternativas consideradas

O frontend é estático e independente do provedor. GitHub Pages foi a escolha
inicial; Vercel também foi considerada durante o desenvolvimento. Vercel,
Cloudflare Pages e Netlify são exemplos de provedores compatíveis, sem posição
preferencial. Adotar outro serviço ou domínio é uma escolha operacional futura,
não uma pendência da arquitetura nem requisito para concluir o escopo vigente.
