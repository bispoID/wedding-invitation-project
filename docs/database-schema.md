# Modelo de dados e fronteiras de segurança

Este documento explica o modelo PostgreSQL consolidado pelas migrations. As
migrations históricas continuam sendo a fonte de execução do schema e não são
alteradas por esta documentação.

## Entidades

- `public.guests` armazena uma confirmação por e-mail, com nome, presença,
  acompanhantes e timestamps. A unicidade do e-mail evita duplicidade no RSVP;
  os limites de texto e acompanhantes são reforçados no banco e também nas
  validações de frontend/Edge Functions.
- `public.event_config` é um singleton identificado por `id = 1`. Contém os
  campos públicos do evento, com locais da cerimônia e recepção. Endereços e
  links opcionais podem ser nulos; o endereço da recepção exige seu nome.
- `public.rsvp_rate_limits` mantém a janela de contagem por hash de IP. O
  endpoint calcula o hash antes da RPC, portanto o endereço bruto não é
  persistido.
- `public.contingency_recovery_locks` fornece um lock lógico para impedir duas
  recuperações simultâneas da mesma fila operacional.

## Acesso

As tabelas relacionadas ao RSVP não são uma API pública direta. O cliente
anonimizado chama as Edge Functions, que validam origem, payload e, no painel,
JWT mais allowlist de UUIDs administrativos. As funções usam `service_role`
somente no servidor; RLS e grants reduzem as operações disponíveis mesmo para
esse papel.

`event_config` não concede leitura direta a `anon` ou `authenticated`: a
função pública `event-config` lê com o cliente de serviço e devolve somente o
DTO validado. A administração usa GET/PUT autenticado e a função de banco de
lista de convidados retorna paginação e métricas como uma operação única.

## Integridade e operações especiais

- Triggers atualizam `updated_at` nas alterações permitidas.
- O rate limit é consumido por uma função SQL atômica antes da validação do
  RSVP, para que tentativas inválidas também sejam contabilizadas.
- O lock de recuperação tem proprietário e liberação; se a limpeza da
  contingência falhar depois da persistência, a resposta informa
  `CLEANUP_PENDING` e uma repetição verifica idempotência antes de inserir.
- A seed é sintética e exclusiva do banco DEV. O fluxo local obtém uma única
  fotografia da Event Config pública e a mantém em `.dev/`, ignorado pelo Git.

## Como verificar

`supabase/tests/block3.sql` é um teste destrutivo apenas para uma transação
local descartável: verifica RLS, grants, singleton, constraints, trigger e
independência dos campos opcionais; termina com `ROLLBACK`. Ele não deve ser
executado contra um projeto remoto.

`supabase/tests/dev-rpc.sql` complementa a validação com RLS das tabelas de
convidados/rate limit/locks, ausência de privilégios diretos do browser e grants
das RPCs para `service_role`. Exercita health, a janela de dez requisições,
bloqueio e expiração do rate limit, paginação sem sobreposição, busca literal,
`include_all`, métricas globais e rejeição de página inválida. Também termina
com `ROLLBACK`, usando somente fixtures sintéticas. Comandos e evidências em
[local-development.md](local-development.md#sql-local) e
[qa-final-evidence.md](history/qa-final-evidence.md#validação-final-do-dev--16102026).
