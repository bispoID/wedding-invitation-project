# Revalidação dinâmica DEV após isolamento UAT

## Escopo e estado inicial — 17/10/2026

Branch `feature/uat-environment-isolation`, HEAD inicial
`7f84fc93185608c148ab35bac6b46940a5eb1b81`, worktree limpo.
A implementação anterior foi preservada. O snapshot `.dev/event-config.json`
continuava disponível. Docker e os servidores haviam parado durante a
interrupção; foram restaurados sem reset, migrations remotas ou novo GET de
Event Config PRD. `dev:up` reutilizou o snapshot e conferiu seus 14 campos.

## Diagnóstico administrativo

O sintoma anterior era `FunctionsFetchError`, seguido de sucesso após recarga.
Não havia captura completa de rede daquela primeira ocorrência; sua causa exata
não pode ser afirmada retrospectivamente.

Na retomada foi reproduzida a indisponibilidade durante a inicialização do
runtime: as três consultas administrativas retornaram HTTP 503, e o Console
registrou `name resolution failed`. A página foi aberta antes de `dev:up`
concluir a restauração das Functions. As URLs já apontavam para o projeto local;
o JWT tinha role `authenticated`, issuer `http://127.0.0.1:54321/auth/v1`,
subject presente e validade vigente. Não havia indício de sessão PRD.

Após a mensagem de prontidão de `dev:up`, `dev:health` e `dev:integration`
passaram. Uma recarga com a mesma configuração passou nas três consultas.
Logout e novo login também carregaram o dashboard normalmente. A falha
reproduzida foi de disponibilidade do runtime local, sem evidência de defeito
persistente no bootstrap, seleção do backend, JWT ou contrato HTTP.

Não foi adicionada repetição automática de escritas nem troca de backend.
O procedimento operacional é aguardar `DEV ready` e health aprovado antes de
validar o painel. Se ele foi aberto antes, usar retry ou recarregar após a
prontidão. Falhas persistentes depois desse ponto exigem nova investigação.

## Evidências de rede e sessão

O servidor de diagnóstico ignorado em `.dev/` adicionou observação temporária
de fetch e Resource Timing ao HTML servido. O código versionado da aplicação
não foi modificado para instrumentar requisições. Foram observados apenas nomes
de headers, claims básicos e campos de payload; tokens e senhas não integram
este relatório. Esta captura não substitui um HAR completo nem registra todo
o tráfego do computador.

| Operação no navegador | Método e destino | Resultado |
| --- | --- | --- |
| Manifesto DEV | GET na própria origem | 200 |
| Event Config administrativo | GET local /functions/v1/admin-manage-event-config | 200 |
| Lista, páginas 1 e 2, tamanho 10 | GET local /functions/v1/admin-list-guests | 200 |
| Contingência | GET local /functions/v1/admin-list-contingency | 200 |
| Edição de convidado sintético | POST local /functions/v1/admin-manage-guests | 200 |
| Event Config público em subdiretório | GET local /functions/v1/event-config | 200 |

Headers administrativos: `apikey`, `authorization`, `x-client-info` e, na
escrita, `content-type`. Payload de edição: `action`, `id`, `guest`, com
`action=update`. Nenhum token foi publicado.

Os preflights HTTP das origens 5500 e 8000 retornaram 200, permitindo os headers
solicitados. O GET autenticado equivalente retornou 200 e ACAO `*` no DEV.
O header ACAO não era exposto ao JavaScript da página, portanto seu valor nulo
na observação de fetch não foi interpretado como falha de CORS.

A única chave de sessão observada era `invitation-v1-dev-local-auth`. Logout
voltou ao login e deixou a lista de chaves localStorage vazia. Novo login
recriou a sessão DEV. Não houve logout PRD nem limpeza global do navegador.
A separação UAT/PRD permanece coberta por testes sintéticos, sem autenticar
em ambientes remotos.

Todos os destinos de backend observados eram `127.0.0.1:54321`. O único serviço
externo necessário ao Admin era o CDN `esm.sh` para o SDK já existente. Não
foram observadas chamadas a `.supabase.co`, inclusive ao ref PRD, nas capturas
de sucesso e de configuração inválida.

## Validações funcionais

- Bootstrap DEV em estado `ready`.
- Envelope, carta, imagens e RSVP pela interface aprovados na execução anterior
  desta mesma revalidação, antes do limite de uso; não repetidos sem necessidade.
- Login, dashboard, listagem e logout aprovados na retomada.
- Paginação real de 12 convidados: página 1 com 10 e página 2 com 2; métricas
  globais preservadas.
- Edição sintética confirmada na interface; acompanhantes e métricas atualizados.
- Formulário Event Config carregado com os 14 campos; não foi necessário salvar
  alterações no singleton para validar sua leitura.
- Porta típica de Live Server 5500 e base adicional `/nested/invite-app/`
  aprovadas com servidor Node equivalente. A extensão Live Server do VS Code
  não foi executada.
- CSS, JS, imagens e quatro fontes carregaram sem respostas de erro na captura
  bem-sucedida; `devmode=letter` permaneceu apenas visual.
- Manifesto ausente e manifesto DEV com URL PRD, em rotas diagnósticas locais:
  alerta acessível, formulários desabilitados e nenhuma consulta a backend.

Os 11 convidados de paginação e o RSVP sintético da interface foram removidos
por seus IDs/e-mail exatos. A limpeza confirmou ausência dos 12 registros.
Pendências antigas da contingência foram preservadas. O smoke de integração
também confirmou a limpeza dos registros que ele próprio criou.

## Regressões e testes

Foram acrescentadas duas regressões ao comando Node canônico:

1. HTTP 503 administrativo continua sendo erro; nova tentativa explícita usa
   a mesma Function e não repete automaticamente a operação.
2. A listagem recupera-se de 503 por reload explícito sem perder a página atual.

Resultado: **310 testes Node aprovados**, sem falhas ou skips. Health e integração
DEV aprovados após a restauração. Deno não foi reexecutado nesta retomada porque
nenhum arquivo de backend foi alterado; a evidência anterior de 150 testes é
histórica. Não houve execução remota de CI.

## Limites e encerramento

A validação técnica local está aprovada. O aceite visual humano em dispositivo
real continua separado: conferir abertura/pausa/continuação, rolagem da carta,
legibilidade e layout do Admin nas larguras efetivamente usadas. A evidência
automatizada de desktop não equivale a aceite humano ou teste no Android.

Nenhuma publicação, push, merge, alteração remota ou provisionamento UAT foi
executado. UAT continua não provisionado e seu manifesto mantém ref nulo.
A próxima etapa depende de autorização própria.
