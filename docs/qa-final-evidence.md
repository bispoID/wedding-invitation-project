# QA final — evidências técnicas e manuais

## Etapa 4 UAT — 23/10/2026, execução parcial

312 Node, 150 Deno e sintaxe de 46 JS/MJS aprovados. Artefatos reais UAT em
raiz/subpath: 71 arquivos cada, runtime público validado, fixture fictícia e
metadados de homologação. Foram dois GETs públicos UAT nesta etapa (ensaio e
build final), sem escritas. Não houve acesso funcional PRD ou ao Pages atual.
Convite, RSVP, login, dashboard e CORS em navegador **não executados** por
ausência de interceptação/contexto isolado disponível. As evidências HTTP da
Etapa 3.2B não substituem esses critérios. [Detalhes](uat-frontend-validation.md).

Consolidação documental final: **13/10/2026**. Projeto:
`wedding-invitation-project`.
Branch de produção: `production`.
HEAD final deste escopo: `b5995cf53be3085f9b1d418b8cddf08154afd303`.

Este documento preserva abaixo o histórico da consolidação anterior de
09/10/2026, originalmente registrada em `feature/landing-page`, e acrescenta
o encerramento específico da pesquisa e paginação administrativa. O
[roadmap](development_roadmap.md) continua sendo a fonte oficial do estado das
13 fases.

## Encerramento da pesquisa e paginação administrativa

O escopo foi concluído, publicado e aprovado manualmente. A migration
`20261013010000_create_admin_guest_list.sql` foi aplicada em produção após
validação local, e a RPC `public.admin_list_guests` foi validada com os
privilégios previstos. A Edge Function `admin-list-guests` está ativa na versão
8.

O frontend publicado pela branch `production` mantém pesquisa dinâmica,
paginação server-side em 10/20/50 registros, indicadores globais, estados de
erro e recuperação. O hotfix do cursor dos botões de paginação desabilitados
foi publicado no commit
`b5995cf53be3085f9b1d418b8cddf08154afd303`, deployment Vercel
`dpl_F8r3e6u28EY2NimfGtZLSUmP1Bvf`, com alvo `production` e estado `READY`.

O aceite visual autenticado dos estados de paginação foi confirmado pelo
responsável. Esse registro encerra a funcionalidade de pesquisa, paginação,
métricas e cursor administrativo. Não reabre nem declara concluídos aceites
independentes, como a configuração do GitHub Pages ou outras limitações de
cobertura descritas no histórico abaixo.

## Origem e alcance das evidências

- **Execução técnica na consolidação local:** revisão de todos os diffs e arquivos
  novos, testes Node/Deno, typecheck, syntax checks e whitespace locais.
- **Aceite manual informado:** resultados relatados pelo responsável pelo QA
  durante os testes de navegador. Não foram repetidos pelo agente nesta execução;
  não há nova captura de tela ou matriz de versões dos navegadores anexada aqui.
- **Histórico operacional:** os checkpoints anteriores registram CI, publicação
  e suíte SQL local. São distintos das novas execuções de CI e Pages do commit
  consolidado, registradas abaixo.

Automação com DOM, fontes, geometria e timers simulados verifica contratos e
regressões; não comprova renderização, contraste ou compatibilidade universal.

## Evidências manuais relatadas

| Grupo | Cenários | Resultado informado |
| --- | --- | --- |
| A — teclado e funcionalidade | Abertura por teclado; navegação pela carta; foco visível no select do RSVP; funcionamento do formulário; login e dashboard administrativos | Aprovados pelo responsável pelo QA |
| B — movimento | Redução de movimento na capa, selo, flores e envelope; redução de movimento no conteúdo da carta | Aprovados pelo responsável pelo QA |
| C — responsividade | Nomes longos na capa; estratégia híbrida; cobertura do papel de parede; nomes longos no cartão e na carta; zoom de 200%; largura de 65% no cartão | Aprovados pelo responsável pelo QA |
| D — navegadores/dispositivo | Edge Desktop, Chrome Desktop, Firefox Desktop e celular real | Aprovados pelo responsável pelo QA |

As larguras **320, 375, 390, 699, 700 e 1000 px** foram informadas para os
cenários relatados. Não foi fornecido um cruzamento completo de cada largura
com cada cenário, navegador e dispositivo; este registro não presume esse
produto cartesiano.

O aceite do foco do RSVP e da coerência Presença/Acompanhantes foi relatado em
Edge Desktop local durante as correções. Os resultados dos outros grupos são
consolidados conforme o relato, sem atribuir ambiente local/publicado a cada
caso quando essa informação não foi especificada.

### Limitações de cobertura

- Versões dos navegadores desktop não especificadas.
- Navegador e sistema operacional do celular real não especificados.
- **Safari/iOS não têm evidência específica de teste**; não são declarados
  aprovados, nem inferidos a partir do aceite em celular real.
- Não há evidência específica de redução de movimento no celular real, nem
  matriz dessa preferência por navegador. É uma limitação de cobertura, não
  uma falha confirmada.
- Palavras sem espaços, erros de medição, métricas de fontes tardias e alguns
  formatos extremos de viewport têm regressões simuladas; isso não significa
  que cada um recebeu aceite visual manual.
- CI, Pages e smoke checks estáticos da versão consolidada passaram. O
  responsável também confirmou o aceite visual final após testar a publicação.
  Não foram especificados novos navegadores, versões ou dispositivos nesse
  aceite; os limites de cobertura anteriores permanecem.

## Revisão técnica das correções acumuladas

- **RSVP:** `:focus-visible` explícito no select, usando token existente;
  Acompanhantes habilitado com presença vazia/Sim, zerado e desabilitado em Não,
  com diferenciação visual. O payload normaliza ausência para zero mesmo com
  campo excluído do `FormData`; o reset após HTTP 201 restaura vazio/zero/habilitado.
  A seleção obrigatória, limites 0–15, erros e bloqueio de envio duplicado seguem
  cobertos. Contrato HTTP e backend não foram alterados.
- **Selo/flores:** a animação da Web Animations API consulta a preferência de
  movimento a cada abertura; em `reduce`, cancela movimento decorativo anterior
  e conserva os assets estáticos. Em `no-preference`, keyframes e tempos
  originais permanecem. Abertura e retorno com foco estão cobertos por simulação.
- **Capa:** tipografia híbrida somente quando a composição original exigiria
  fonte inferior ao piso legível; medição invisível com remoção da sonda,
  atualização por conteúdo/fontes/resize, preservando o caminho dos nomes usuais.
- **Papel de parede:** cobertura proporcional; capa cresce com o conteúdo em
  mobile compacto; `overflow: clip` evita extensão rolável apenas decorativa
  abaixo do fundo. As regressões de geometria são modelos, não screenshots.
- **Cartão/carta:** estados específicos de nomes longos, quebras controladas,
  preservação dos spans, separador e ornamentos; sem regra global nova de
  `.script-name` e sem mudança no contrato de Event Config.
- **Ajuste de 65%:** a regra manual em
  `.envelope__card-names.has-long-names` foi preservada. Nesta consolidação,
  o limite de medição do cartão foi alinhado de `0.72` para `0.65`, e o teste
  de CSS/limiar foi atualizado. A fixture de 225 px detecta retorno indevido ao
  limite antigo. O alinhamento foi validado por automação; não houve novo aceite
  de navegador pelo agente após essa alteração.

Não foram encontrados conflitos de merge, arquivos de QA dispensáveis ou
regressões nos gates executados. A inspeção seguiu o roteiro conservador do
frontend: imports/cascata, seletores e foco foram preservados, sem refatoração
de componentes alheios ao QA.

## Regressão executada nesta consolidação

Ambiente: Windows, Node.js **22.14.0**, Deno **2.9.7**.

| Gate | Resultado observado |
| --- | --- |
| Node completo | **212 aprovados**, 0 falhas, 0 ignorados/cancelados |
| Deno completo | **144 aprovados**, 0 falhas |
| Total de testes | **356 aprovados** |
| Typecheck | 8 entrypoints aprovados |
| Syntax | 26 arquivos `.js` + 9 `.mjs`: 35 aprovados |
| Whitespace | `git diff --check` e inspeção dos arquivos novos aprovados |

```text
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/event-config.test.mjs

deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts

deno check supabase/functions/rsvp/index.ts supabase/functions/health/index.ts supabase/functions/admin-list-guests/index.ts supabase/functions/admin-manage-guests/index.ts supabase/functions/admin-list-contingency/index.ts supabase/functions/admin-recover-contingency/index.ts supabase/functions/event-config/index.ts supabase/functions/admin-manage-event-config/index.ts

node --check <cada JavaScript versionado ou novo e cada scripts/*.mjs>
git diff --check
```

As quatro suítes novas (`envelope-motion`, `welcome-typography`,
`welcome-wallpaper`, `invitation-names`) são importadas por
`admin-block3.test.mjs`: o comando completo as executa sem duplicar a contagem.
O acréscimo em relação à baseline histórica de 119 Node é de 93 testes.

O primeiro runner Deno no isolamento do Windows falhou com panic de named pipe
antes das asserções. A repetição integral fora do isolamento passou, mantendo
`--deny-net` e as mesmas permissões restritas. Não foi usado `--no-run` como
substituto de execução. O aviso Node `MODULE_TYPELESS_PACKAGE_JSON` não impede
os testes; não foi alterado o modo de módulos global para suprimi-lo.

A baseline de **144 Deno + 119 Node = 263** aprovada no Linux/CI do Bloco 7
continua como evidência histórica no roadmap. Na consolidação local ainda não
havia push; o checkpoint de publicação posterior confirmou a nova suíte em
Linux, conforme o registro abaixo.

## Publicação do QA — 09/10/2026

Commit: `9d34e6c8c79c5553f8fc3177a5becca53a5a32db`.
Mensagem: `feat(ui): finalize accessibility and responsive QA`.
Conjunto: exatamente 20 arquivos, sem alterações de backend ou workflows.
Push para `origin feature/landing-page` aprovado e branch sincronizada.

- **Test baseline: SUCCESS**, execução
  [37982999446](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999446).
  Os logs confirmaram Ubuntu 24.04.5, 26 syntax checks de JavaScript,
  **212 Node e 144 Deno, zero falhas**, além de whitespace aprovado.
  Typecheck dos oito entrypoints permanece como evidência local, não como
  etapa adicional presumida do CI.
- **Deploy invite-app to GitHub Pages: SUCCESS**, execução
  [37982999447](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999447).
  Gate portátil: **26 testes Node aprovados**, zero falhas. Preparação de
  `_site`, upload e publicação concluídos para o mesmo SHA.
- URL: [convite publicado](https://bispoid.github.io/wedding-invitation-project/).

### Smoke checks operacionais

Verificação principal em **09/10/2026, 19:52:33 UTC** (16:52:33 em
America/Sao_Paulo), seguida de confirmação nas URLs normais sem parâmetros.
Somente GET de arquivos estáticos; nenhum JavaScript da página foi executado.

- HTTP **200** na raiz pública, `admin/`, `admin/index.html` e `admin/login.html`.
- **64 arquivos** retornaram HTTP 200 e corresponderam por SHA-256 aos bytes
  do commit: os **44 CSS/JS**, três HTML e 17 imagens/fontes referenciadas.
  Para o HTML público, a comparação utilizou o resultado exato de
  `resolveMetadata` aplicado ao source, como faz o preparador de publicação.
- **76 referências relativas** de imports, CSS e HTML resolveram para arquivos
  existentes; os recursos identificados foram verificados por HTTP.
- `scripts/shared/invitation-names.js`, `scripts/welcome/typography.js` e seus
  imports estão disponíveis. CSS com largura de 65%, cálculo JS de 0.65,
  foco visível, estado disabled, wallpaper e nomes longos foi confirmado.
- Canonical, Open Graph e Twitter correspondem ao HTML preparado; nenhum
  marcador `__PUBLIC_*__` permaneceu. A imagem de compartilhamento retornou 200.

Esses checks confirmam disponibilidade e integridade da publicação, **não
renderização visual, execução do login/Admin ou aceite funcional em navegador**.
Não houve RSVP, chamadas à API Supabase ou operações administrativas.

A suíte SQL local aprovada no Bloco 7 permanece válida como registro anterior.
Não foi repetida: nenhuma migration ou schema foi alterado durante este QA.

## Encerramento e publicação

Os aceites informados e os gates locais sustentam o encerramento das Fases 9 e
12 no escopo validado, com os limites de cobertura acima. Em 09/10/2026, o
responsável pelo QA respondeu à solicitação de aceite final no navegador:

> Aprovado após testar a versão publicada

A solicitação identificava a URL publicada e os cenários de abertura,
teclado/foco, RSVP sem enviar, redução de movimento e responsividade. Esta é
uma confirmação manual do responsável; o agente não repetiu o teste visual nem
presume execução de cenários adicionais, envio de RSVP ou operações do Admin.

A referência da publicação no registro é
`47439eee7357e16bcb3ca845d5e1537c7f25849f`, com a mesma implementação de interface
de `9d34e6c`; a diferença é exclusivamente documental. Esse checkpoint também
teve [CI 37983470306](https://github.com/bispoID/wedding-invitation-project/actions/runs/37983470306)
e [Pages 37983470523](https://github.com/bispoID/wedding-invitation-project/actions/runs/37983470523)
aprovados. Os logs repetiram 212 Node + 144 Deno sem falhas, 26 syntax checks e
whitespace aprovado; o gate Pages executou 26 testes. Os smoke checks posteriores
confirmaram 65 arquivos por HTTP/SHA-256, incluindo o README publicado, e as
mesmas 76 referências relativas, sem executar JavaScript ou APIs de produção.

Com publicação, regressão, smoke checks e aceite final registrados, a Fase 13
está concluída e o escopo das 13 fases do roadmap está integralmente encerrado.
Os limites de cobertura acima não foram apagados nem tratados como aprovação
universal. O commit de encerramento altera somente documentação.

Andamento do checkpoint autorizado de publicação:

1. Concluído: revisar e versionar o conjunto exato de 20 arquivos.
2. Concluído: sucesso do workflow `Test baseline` para o commit consolidado.
3. Concluído: publicação pelo workflow previsto e smoke checks aprovados.
4. Concluído: confirmação explícita do aceite visual final pelo responsável
   após testar a versão publicada, conforme o relato acima.
5. Concluído: SHA, runs, resultados operacionais e aceite final registrados,
   permitindo o encerramento da Fase 13.

Na consolidação local anterior não houve staging, commit, push ou deploy. O
checkpoint posterior autorizou commit, push e publicação de frontend, realizados
conforme o registro acima. Não houve consulta/escrita de dados remotos ou envio
de RSVP. Supabase, banco, migrations, Functions, Auth, secrets, Google Sheets e
UptimeRobot não foram modificados.

## Validação final do DEV — 16/10/2026

### Escopo e ponto de retomada

Validação exclusivamente local na branch `feature/dev-environment-isolation`,
a partir de `703d3a541aa57e0f53782ca5f97b581477c6749d`
(`fix(build): exclude local DEV config from static artifacts`). Na retomada,
as alterações em workflow, package, orquestrador, testes de isolamento, helper
de processos e suíte SQL foram preservadas. Não houve reset, merge, push,
deploy, alteração de outras branches ou escrita em serviços remotos.

O aceite visual do convite e do Admin foi informado pelo responsável no prompt
desta tarefa. Não foi repetido nem convertido em uma nova prova de navegador.
As evidências operacionais aprovadas antes da interrupção foram conservadas;
a retomada concluiu os testes Node, Deno, artefatos e documentação pendentes.

### Docker, integração e SQL

- Docker Engine 29.8.2 e Supabase CLI 2.120.0; serviços de banco, Auth, gateway,
  REST, storage, realtime, Studio, pg-meta, inbucket e analytics disponíveis.
- Functions inicialmente retornavam 503, mas o bootstrap aceitava qualquer
  resposta diferente de 502. A correção exige HTTP 200. Um PID persistido havia
  sido reutilizado por um aplicativo Lenovo; agora o tipo de comando é conferido
  antes de encerrar o processo. O aplicativo alheio não foi encerrado.
- `npm run dev:up` concluiu após a correção, reutilizando o snapshot existente.
  Não houve `dev:reset`, novo GET de Event Config em PRD ou cópia de convidados.
- `npm run dev:health`: aprovado para API/Functions, Event Config e sidecar.
- `npm run dev:integration`: Auth sintético, contrato Event Config de 14 campos,
  bloqueio de Admin sem sessão, RSVP 201, duplicidade 409, inválido 400, criação,
  edição, listagem/busca paginada, contingência local e recuperação aprovados.
  A pendência foi removida; consulta SQL posterior confirmou zero convidados
  residuais com os padrões sintéticos da integração.
- API/Functions em `127.0.0.1:54321`, PostgreSQL em `54322`, Studio em `54323`,
  inbucket em `54324` e contingência em `54328`. As Functions alcançam o host
  por `host.docker.internal`; o sidecar escuta `0.0.0.0` com token local.
- As 16 versões de migrations locais correspondem às 16 versões aplicadas.
  Nenhuma migration histórica foi alterada; essa comparação não é uma
  certificação criptográfica das statements armazenadas pelo banco.
- `block3.sql`: execução integral com `ON_ERROR_STOP=1`, incluindo RLS, grants,
  singleton, constraints, opcionais, trigger e negação de acesso indevido;
  todos os blocos concluídos, encerrados em `ROLLBACK`, exit code 0.
- `dev-rpc.sql`: RLS de convidados/rate limits/locks, privilégios do browser e
  grants das RPCs aprovados; health aprovado; dez requisições permitidas, décima
  primeira bloqueada e janela expirada renovada; paginação 10+2 sem sobreposição,
  busca literal `%_`, `include_all`, métricas globais e página inválida aprovados.
  Todos os blocos concluídos, encerrados em `ROLLBACK`, exit code 0.

As suítes SQL foram passadas pelo stdin a
`docker exec -i supabase_db_wedding-invitation-project psql -X -U postgres -d postgres -v ON_ERROR_STOP=1`.
São validações locais transacionais, não uma execução de migrations remotas
nem uma prova de concorrência/carga de produção.

### Regressão e descoberta

Node 22.14.0 e Deno 2.9.7, correspondentes às versões declaradas no CI:

| Execução | Aprovados | Reprovados | Ignorados/cancelados |
| --- | ---: | ---: | ---: |
| `npm run test:node` | 239 | 0 | 0 |
| `npm run dev:test` | 239 | 0 | 0 |
| `node --test scripts/*.test.mjs` | 314 | 0 | 0 |
| Gate portátil Pages: App Config + preparador | 32 | 0 | 0 |
| Deno, comando abaixo | 150 | 0 | 0 |

```text
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
```

A seleção canônica tem seis entradas: `app-config`, `prepare-static-site`,
`admin-block3`, `guest-list-controller`, `event-config`, `environment-isolation`.
As outras quatro entradas descobertas pelo glob (`envelope-motion`,
`welcome-typography`, `welcome-wallpaper`, `invitation-names`) já são importadas
pelo agregador Admin. Assim, todos os dez arquivos estão cobertos; o glob
repete 75 testes, sem ampliar cobertura. Deno descobre 12 arquivos nas Functions
e o arquivo de métricas do Admin.

A auditoria anterior tinha 236 distintos/311 com glob. A regressão de exclusão
do `dev-config.json` em `703d3a5` elevou para 237/312. Os dois novos testes
pertinentes à classificação de PIDs resultam nos atuais 239/314. Os três testes
de isolamento originais foram preservados e agora participam do CI e DEV.
As contagens históricas de 212 Node/144 Deno permanecem válidas apenas para
seus checkpoints anteriores.

Sintaxe: 27 arquivos `.js` versionados (equivalente à etapa do CI) e os 15 `.mjs`
de `scripts/` aprovados. O Node emite o aviso não bloqueante
`MODULE_TYPELESS_PACKAGE_JSON` ao importar módulos ES `.js`; não foi feita
mudança global de formato de módulos para silenciar esse aviso.

### CI e artefatos

`test.yml` usa `npm run test:node`; `dev:test` delega ao mesmo comando, removendo
a entrada duplicada de movimento. Não há Docker, credenciais de produção ou
novas etapas de deploy no CI. Gatilhos e permissões permanecem os mesmos.
As execuções acima são locais: não houve push nem novo run Linux/GitHub Actions.

O gate Pages (App Config + preparador, 32 testes contidos na seleção aprovada)
foi reexecutado após a atualização do README publicado e passou integralmente.
O workflow permanece inalterado e publica somente `staging`, inclusive no guard
da execução manual e no checkout explícito. O preparador exclui a configuração
DEV; o código de frontend e os contratos HTTP não foram alterados nesta etapa.

Preparações adicionais para root Vercel e subpath Pages usaram fetch simulado,
sem GET real. Cada artefato contém 69 arquivos e 79 referências relativas
HTML/CSS/imports JS verificadas; todos os destinos existem. Não há `.dev`,
arquivos de env, `dev-config.json`, valores de credenciais locais ou marcadores
`__PUBLIC_*` não resolvidos. Hashes dos 70 arquivos de origem foram preservados.
As saídas temporárias exclusivas dessa inspeção foram removidas após a leitura.

Uma checagem comportamental do bootstrap com hosts públicos confirmou zero
fetches locais e seleção do backend remoto existente, mesmo com configuração
DEV injetada. Em host local, configuração ausente ou remota foi recusada.
O primeiro ensaio desse check usou `undefined` enquanto o global DEV ainda
estava preenchido; a asserção de ausência foi corrigida no próprio ensaio,
removendo o global, e passou sem alteração do código de aplicação.

A consulta somente leitura pelo conector Vercel confirmou projeto sem framework
declarado (`framework: null`), Node 24.x e deployment de produção `READY`
`dpl_F8r3e6u28EY2NimfGtZLSUmP1Bvf`. A consulta detalhada ao deployment retornou
403 por escopo de autorização. **Root Directory, Build Command e Production
Branch atuais: NÃO COMPROVADOS nesta auditoria.** O registro histórico anterior
não foi apagado nem tratado como verificação atual. Não houve mudança de
configuração, deploy ou reautenticação.

### Isolamento, limites e veredito

O env local contém `APP_ENV=dev`, provider `local` e URLs Docker/host locais,
sem variáveis Google. Senha sintética, service-role e token do sidecar não são
expostos no frontend nem nos artefatos. `.dev/` e `invite-app/dev-config.json`
continuam ignorados pelo Git. O snapshot Event Config foi preservado, SHA-256
`D1F6C79819ED22E6166E0AEB1B98540DABF629527E193115452B0268955E7E8F`.

Ressalvas operacionais não bloqueantes para integração na branch de desenvolvimento:

- O Vector local reinicia porque seu coletor `docker_logs` recebe conexão
  recusada no endpoint Docker `192.168.65.254:2375`. A coleta centralizada de logs
  está degradada; serviços e fluxos funcionais acima passaram. Não se habilitou
  uma API Docker TCP sem autenticação nem se alterou Docker Desktop para isso.
- Configurações externas detalhadas da Vercel precisam de consulta autorizada
  antes de uma futura publicação. Compatibilidade estática local não prova
  qual comando externo de build está configurado.
- O isolamento remoto UAT é uma etapa futura, fora deste escopo. Não há promessa
  de backend remoto separado já implantado. Nenhum aceite de UAT/PRD ou execução
  remota de CI foi inferido a partir dos testes DEV.

**APROVADO PARA INTEGRAÇÃO** em `feature/landing-page`, sujeito à autorização
explícita da integração e à reconferência de ancestralidade/refs nesse momento.
As pendências técnicas locais da auditoria foram encerradas; as ressalvas acima
devem permanecer visíveis antes da promoção a ambientes publicados.
