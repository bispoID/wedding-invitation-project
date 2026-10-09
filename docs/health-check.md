# Health check

## Objetivo

O health check verifica a saúde operacional dos pré-requisitos read-only do
fluxo público de RSVP. Ele não simula um RSVP real, não substitui o fluxo de
confirmação e não cria registros de convidados.

O endpoint é consultado manualmente por `GET` e por um monitor externo usando
`HEAD`. A função pública permite que o monitoramento seja independente de uma
sessão administrativa ou do computador do administrador.

## Arquitetura

```text
Internet
    ↓
GET ou HEAD /functions/v1/health
    ↓
Supabase Edge Function — health
    ↓
public.check_rsvp_health()
    ↓
PostgreSQL e pré-requisitos do RSVP
    ↓
HTTP 200 ou HTTP 503
```

A Edge Function é responsável por aceitar os métodos HTTP, chamar o RPC e
produzir uma resposta pública agregada. O RPC concentra as verificações
internas do PostgreSQL.

## Endpoint

Endpoint remoto:

```text
https://bkkienyemqlkueygknzl.supabase.co/functions/v1/health
```

Configuração:

```ini
[functions.health]
enabled = true
verify_jwt = false
entrypoint = "./functions/health/index.ts"
```

`verify_jwt = false` é intencional. O endpoint não expõe dados da aplicação e
precisa ser acessível por um serviço externo de monitoramento sem Authorization
ou JWT.

## Verificações realizadas

A Edge Function cria um cliente Supabase usando `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`, exclusivamente no backend, e chama somente o RPC
read-only `public.check_rsvp_health()`.

O RPC concentra no PostgreSQL as verificações de:

- existência de `public.guests`;
- existência de `public.rsvp_rate_limits`;
- acessibilidade das duas relações;
- existência de `public.consume_rsvp_rate_limit(text)`;
- privilégio `INSERT` do `service_role` em `public.guests`;
- privilégio `EXECUTE` do `service_role` em
  `public.consume_rsvp_rate_limit(text)`.

`public.check_rsvp_health()` não recebe parâmetros, não retorna dados de
convidados e não altera dados. Seu `EXECUTE` é concedido somente ao
`service_role`; `anon` e `authenticated` não possuem esse privilégio.

O RPC `public.consume_rsvp_rate_limit(text)` não é chamado. Ele altera o
contador persistido e, portanto, não é apropriado para uma verificação
periódica.

Também não são executados `INSERT`, `UPDATE`, `DELETE`, RPC administrativo ou
qualquer operação no Google Sheets.

## Respostas HTTP

Sucesso em `GET`:

```json
{"status":"healthy"}
```

Status: `200`.

Sucesso em `HEAD`:

```text
HTTP 200
sem corpo
```

O `HEAD` mantém os headers relevantes, especialmente `Cache-Control`, mas não
retorna corpo. Esse é o método utilizado pelo monitor externo atual.

Falha em qualquer dependência relevante:

```json
{"status":"unhealthy"}
```

Status: `503`. O corpo não revela a causa interna.

Método diferente de `GET` e `HEAD`:

```json
{"error":"METHOD_NOT_ALLOWED"}
```

Status: `405`.

Todas as respostas JSON usam:

```text
Content-Type: application/json
Cache-Control: no-store
```

## Segurança

A resposta pública não contém causa interna, SQL, stack trace, secrets, URLs
internas ou dados pessoais. As falhas são registradas somente com um rótulo
estável da dependência nos logs do backend.

O `service_role` permanece exclusivamente no backend, não é enviado ao
navegador e não é retornado pela função.

O endpoint não acessa Google Sheets, não executa funções administrativas e não
interfere no rate limiting real. O monitor externo apenas consulta o endpoint;
ele não executa o fluxo real de RSVP.

## Monitoramento externo

O monitoramento externo é realizado pelo UptimeRobot, independentemente da
aplicação e do painel administrativo.

Configuração atual:

```text
Monitor: Supabase — Health Check RSVP
URL: https://bkkienyemqlkueygknzl.supabase.co/functions/v1/health
Intervalo: 15 minutos
Método: HEAD
Autenticação: nenhuma
Alertas: e-mail
```

O intervalo de 15 minutos é a configuração oficial informada pelo responsável
pelo projeto. A equalização documental não altera o monitor externo. O estado
do monitor é transitório e deve ser consultado no UptimeRobot; não é registrado
como permanentemente saudável neste documento.

Fluxo:

```text
UptimeRobot
    ↓
HTTP HEAD /functions/v1/health
    ↓
Supabase Edge Function — health
    ↓
public.check_rsvp_health()
    ↓
HTTP 200 ou HTTP 503
    ↓
UptimeRobot
    ↓
alerta por e-mail em caso de falha
```

O UptimeRobot não depende do computador local estar ligado, não depende do
painel administrativo, não cria RSVPs, não acessa a função `rsvp`, não altera o
rate limiting e não consulta o Google Sheets.

O alerta atual é externo ao painel administrativo. Não existe notificação para
cada RSVP realizado com sucesso; o objetivo é alertar somente quando houver uma
condição que exija atenção.

## Monitoramento do frontend

O frontend atualmente publicado em GitHub Pages possui monitoramento externo
separado:

```text
https://bispoid.github.io/wedding-invitation-project
```

Esse monitor verifica a disponibilidade da página. O monitor do Supabase
verifica a saúde da infraestrutura necessária ao RSVP. Eles têm objetivos
diferentes.

O frontend é estático e independente do provedor, com publicação atual no
GitHub Pages. O monitor de health não depende desse provedor: consulta
diretamente a Edge Function do Supabase.

## Limitações

O health check não executa o `INSERT` real de um convidado e não cria nem
remove registros fictícios. Portanto, ele valida a disponibilidade das tabelas,
do RPC de rate limiting e dos privilégios necessários, mas não prova por si só
uma persistência end-to-end de um RSVP real.

Uma resposta `200` confirma que as dependências verificadas estavam operacionais
no momento da consulta. Ela não substitui testes funcionais completos nem
garante a disponibilidade futura do frontend.

Não é necessário provocar deliberadamente uma falha real em produção para gerar
um `503`. Os cenários de erro são cobertos pelos testes do handler, enquanto a
validação remota confirma o caminho saudável e a rejeição de métodos não
suportados.

## Validações realizadas

A migration foi aplicada no Supabase remoto e o RPC foi validado:

```text
public.check_rsvp_health() = true
```

Permissões confirmadas:

- `service_role`: `EXECUTE`;
- `anon`: sem `EXECUTE`;
- `authenticated`: sem `EXECUTE`.

A função publicada foi validada remotamente:

- `GET`: HTTP `200` com `{"status":"healthy"}`;
- `HEAD`: HTTP `200` sem corpo;
- `POST`: HTTP `405` com `{"error":"METHOD_NOT_ALLOWED"}`.

O TypeScript dos testes foi validado com `deno test --no-run`. O runner do Deno
`2.9.7` apresentou panic de named pipe no Windows dentro do isolamento local,
antes de executar asserções. Em 08/10/2026, a suíte completa executou fora desse
isolamento, no mesmo Windows: 57 testes aprovados e zero falhas, incluindo os
dez testes do health. A restrição de rede foi mantida; nenhuma dependência real
do health foi acessada pelos testes unitários.

O workflow `.github/workflows/test.yml` executa a regressão em Linux, incluindo
estes testes e as métricas administrativas. A baseline atual de 144 testes Deno
(incluindo os dez de health) e 119 Node passou localmente e no GitHub Actions
em 09/10/2026, no Bloco 7 (execução 37934156785). Os resultados anteriores são
registros de validação, não garantia de disponibilidade futura.
O contrato `GET`/`HEAD`, o RPC e o escopo de pré-requisitos do RSVP permanecem
inalterados. `event_config` já está implementado e publicado, mas não integra
este health: o probe continua restrito aos pré-requisitos read-only do RSVP.

## Teste local

O teste local completo depende de uma instância local do Supabase. Quando ela
estiver disponível, configurar as variáveis do ambiente para o projeto local e
executar:

```powershell
supabase functions serve health
curl.exe -i http://127.0.0.1:54321/functions/v1/health
curl.exe -I http://127.0.0.1:54321/functions/v1/health
curl.exe -i -X POST http://127.0.0.1:54321/functions/v1/health
```

Não é necessário utilizar Supabase local para a validação remota já concluída.

Os testes unitários estão em:

```text
supabase/functions/health/health_test.ts
```

Com o runtime Deno disponível, o comando é:

```powershell
deno test supabase/functions/health/health_test.ts
```

## Teste da função publicada

Os testes remotos read-only são:

```powershell
curl.exe -i https://bkkienyemqlkueygknzl.supabase.co/functions/v1/health
curl.exe -I https://bkkienyemqlkueygknzl.supabase.co/functions/v1/health
curl.exe -i -X POST https://bkkienyemqlkueygknzl.supabase.co/functions/v1/health
```

Não enviar payload de RSVP, Authorization, JWT ou service role. Não executar
migrations, `supabase start`, Docker ou operações de escrita durante essa
validação.

As ferramentas e os serviços externos utilizados pelo projeto estão
centralizados em [external-services.md](external-services.md).
