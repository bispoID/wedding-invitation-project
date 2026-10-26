# QA final — evidências técnicas e manuais

## Publicação e conferência PRD da correção de acessibilidade — 26/10/2026

**Promoção, publicação e aceite técnico focado PRD concluídos**, no escopo
capa/cartão/carta e transições de foco descrito abaixo. Resultado observado
pelo agente na interface publicada; não se atribui um novo aceite humano PRD.

### Git, candidato e preservação documental

- Candidato exato autorizado e publicado:
  `c25e2cd266540210efc0297697ce54a2e5de9e03`.
- Antes da promoção, feature e staging remotas estavam nesse SHA; production
  estava em `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`. Fetch e comparação
  confirmaram ancestralidade `0 4`, sem divergência.
- Intervalo aprovado preservado: 9e3ad34, 67fb605, 76bf55f e c25e2cd;
  **12 arquivos**, oito documentais, com 529 inserções e 48 exclusões. Alteração
  executável restrita ao HTML e aos dois módulos do cartão; regressão no teste
  do envelope. Sem alteração de workflow, política Vercel ou configuração de
  ambiente, Functions, migrations, Auth ou banco.
- QA e roadmap tinham alterações locais posteriores ao candidato. Foram
  copiados para evidência ignorada e guardados temporariamente em stash de
  escopo explícito. Com árvore limpa, production avançou por fast-forward ao
  SHA autorizado e recebeu push normal exclusivo. Sem reset, force-push,
  merge commit ou inclusão das alterações documentais locais.
- Retorno à feature e restauração dos dois documentos conferida byte a byte
  pelas cópias/hash anteriores, antes desta consolidação. Stash temporário
  removido somente após essa verificação. Nenhum novo commit documental naquele
  ciclo de promoção.

### CI, deployment e integridade

- [CI production 40339455956](https://github.com/bispoID/wedding-invitation-project/actions/runs/40339455956):
  completed/success no candidato exato. Logs do job 121629842350 confirmaram
  **414 Node, 150 Deno**, sintaxe de **33 JS** e whitespace aprovados.
  Não se repetiram suítes locais; CI executou o workflow previsto no push.
- Deployment Git Vercel **`dpl_PaytKBpZHjmVbppUgR22XmawwZrP`**, READY,
  ambiente Production, source branch production e commit c25e2cd, conferidos
  no dashboard autenticado. A inspeção continuou pelo navegador, dado o limite
  de acesso ao escopo de deployments da conexão MCP registrado no ciclo UAT.
- Domínio oficial: [frontend PRD](https://bruna-e-diego.vercel.app/).
  Runtime HTTP 200: appEnv `prd`, projectRef `bkkienyemqlkueygknzl`,
  supabaseUrl PRD, publicSiteUrl oficial e buildId igual ao SHA completo acima.
- **75 recursos públicos HTTP 200, todos correspondentes byte a byte ao build
  esperado.** Preparo canônico em diretório local ignorado, usando o candidato
  extraído com `git -c core.autocrlf=false archive`; HTML gerado e runtime
  incluídos na comparação. A primeira comparação usou texto convertido para
  CRLF pelo Git Windows, inclusive no archive padrão, e diferiu dos bytes LF
  publicados. A causa foi confirmada contra o blob Git do módulo; a extração
  LF eliminou as diferenças sem mudar fonte, configuração Git ou deployment.
  A preparação lê somente a Event Config pública para os metadados; nenhum
  dado ou configuração remota foi alterado.

### Conferência real focada na interface PRD

Navegador integrado automatizado **IAB, viewport 1280 × 720**, versão do engine
não aferida. Aba aberta no domínio oficial após o deployment READY, com recursos
atualizados; o cartão foi exposto corretamente já na primeira execução. Método:
interações pela interface, teclado, inspeção DOM/árvore acessível e capturas.
Não houve injeção de estado, alteração de animações ou uso de preview DEV.

| Etapa | Resultado observado |
| --- | --- |
| Capa | Cartão `aria-hidden=true`, monograma/citação do cartão ausentes da árvore. Primeiro Tab focou o selo com contorno visível. Sem rolagem horizontal. |
| Abertura | Enter no selo iniciou a animação normal; Pausar antes de abrir a carta foi acionado pela interface durante a janela natural, preservando a ação de espera. |
| Cartão apresentado | `aria-hidden=false`, monograma/citação disponíveis na árvore e cartão legível visualmente. Continuar visível; carta permaneceu oculta após terminar a apresentação. |
| Retomada | Enter em Continuar revelou a carta, ocultou a capa e focou `letter-title`. Contorno de foco, aparência e ausência de rolagem horizontal conferidos. |
| Retorno | Enter em Voltar para a capa restaurou foco visível no selo e scrollY=0. Cartão novamente `aria-hidden=true` e ausente da árvore, carta oculta. |

Nenhuma regressão de funcionamento, aparência ou progressão identificada nesse
percurso/viewport. Não houve envio de RSVP, troca de senha, alteração de Auth,
banco, monitores, Functions ou migrations; homologações anteriores preservadas.

Inspeção de árvore acessível **não é teste com leitor de tela**; viewport não é
zoom real de 200%. Esses testes específicos não foram executados neste ciclo.
Confirmação humana anterior em Firefox/Safari permanece separada, com versões,
dispositivo, sistema operacional e ambiente não informados. Não se atribui a
esse relato execução desta versão em PRD, iOS, zoom ou leitor de tela, nem se
declara conformidade integral com WCAG.

### Rollback efetivamente conferido

Antes do push, o deployment estável
**`dpl_VhUcj8Lvq56JTxFYgwgyxLCeN8Kr`**, SHA
`bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`, estava READY/current e associado ao
domínio oficial. Diálogo Instant Rollback disponível; o plano Hobby oferece
retorno ao deployment de produção imediatamente anterior, conforme a
[documentação Vercel](https://vercel.com/docs/cli/rollback).

Naquele momento bf35bc2 ainda era Current, e 09267d1 era Previous; não se
afirmou que bf35bc2 já aparecia como Previous antes de substituí-lo. Após a
publicação, nova inspeção do diálogo confirmou c25e2cd/PaytKBpZH como Current e
**bf35bc2/VhUcj8Lvq como Previous elegível**, referência exata autorizada para
reversão. Inspeções canceladas, sem Continue ou confirmação de rollback.
Nenhuma regressão justificou utilizar a autorização de recuperação.

Rollback Vercel restaura o frontend; não reverte Git, Auth, senha, banco ou
Functions. Não desfazer esses estados automaticamente; após uma reversão,
conferir domínio/runtime e política de autoatribuição antes de nova publicação.

Evidências sanitizadas ignoradas sob `.dev/qa/prd-accessibility-2026-10-26/`:
`published-audit.json`, `deployment-ready.png`/`.ax.txt`,
`rollback-before.png`/`.ax.txt`, `rollback-after.png`/`.ax.txt`,
`cover.png`, `card-paused.png`, `letter.png`, `cover-return.png` e respectivas
árvores `.ax.txt`. Sem credenciais, sessões ou links completos de recuperação.
Ao encerrar o ciclo de promoção, QA e roadmap ficaram como diff documental local
para revisão, sem staging ou commit automático; feature, staging e production
remotas estavam no mesmo candidato. O fechamento documental posterior tem
escopo exclusivo nesses dois documentos e envio somente à feature, sem nova
promoção ou publicação.

## Publicação UAT da correção de acessibilidade — 26/10/2026

### Candidato, promoção e CI

Candidato exato: `c25e2cd266540210efc0297697ce54a2e5de9e03`
(`fix(a11y): hide covered invitation card from assistive technology`).
Checkout inicial limpo na feature. Refs remotas consultadas e atualizadas por
fetch antes da promoção; staging e production estavam em
`bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`.

O intervalo completo, sem divergência (`0 4`), contém:

- `9e3ad34`: documentação do aceite da recuperação UAT.
- `67fb605`: documentação do encerramento da recuperação PRD.
- `76bf55f`: documentação do monitoramento do frontend PRD.
- `c25e2cd`: correção de acessibilidade, regressão e consolidação QA/roadmap.

São 12 arquivos: oito documentos, HTML, dois módulos JS e o teste do envelope.
Nenhuma mudança em workflows, política Vercel, Auth, Functions, migrations ou
configuração de ambiente. Nenhuma mudança inesperada identificada.

Push normal da feature concluído; staging avançada por fast-forward e push ao
mesmo candidato. `deploy-pages.yml` publica somente staging, inclusive no
dispatch manual; `vercel.json` bloqueia deployments Git da feature e de staging.
Production permaneceu em bf35bc2. Nenhum force-push, novo commit ou deploy PRD.

| Execução | Resultado e evidência |
| --- | --- |
| [CI feature 40328977848](https://github.com/bispoID/wedding-invitation-project/actions/runs/40328977848) | completed/success no SHA exato. Logs: 414 Node, 150 Deno e sintaxe de 33 JS aprovados; whitespace aprovado. |
| [CI staging 40329203284](https://github.com/bispoID/wedding-invitation-project/actions/runs/40329203284) | completed/success no mesmo SHA, com os mesmos totais confirmados nos logs. |
| [Pages UAT 40329203374](https://github.com/bispoID/wedding-invitation-project/actions/runs/40329203374) | completed/success. Job validate: 414 Node, 150 Deno, sintaxe e whitespace aprovados. Job deploy: 102 testes de preparação aprovados, artefato preparado, upload e publicação concluídos. As execuções não são somadas como testes distintos. |

Suítes locais não repetidas: os resultados DEV existentes foram aproveitados.
CI executou automaticamente as verificações previstas nos workflows.

### Integridade da publicação

URL: [frontend UAT](https://bispoid.github.io/wedding-invitation-project/).
Runtime HTTP 200: appEnv `uat`, projectRef `eugvobtvjicvocttnkka`, URL canônica
Pages e buildId igual ao candidato completo. Artefato github-pages
`12654250674`, ZIP SHA-256
`f3840e1eb342de00140057ab8bfb431d6887de670376dc127b5f151f6b9f9474`.

Os **75 arquivos publicados** retornaram HTTP 200 e corresponderam byte a byte
ao conteúdo preparado do artefato Pages, incluindo HTML gerado e runtime.
Não se comparou o HTML gerado diretamente com o fonte. Registro sanitizado
ignorado: `.dev/qa/uat-accessibility-2026-10-26/published-audit.json`.

### Conferência focada no navegador UAT

Executada pelo agente no navegador integrado automatizado (IAB), viewport
**794 × 884**, versão do engine não aferida. Interações reais da interface,
inspeção DOM/árvore acessível e capturas visuais; sem simular estado de fluxo,
alterar temporizadores ou executar preview DEV no site publicado.

| Estado/ação | Resultado observado |
| --- | --- |
| Capa | Cartão com `aria-hidden=true`; monograma e citação do cartão ausentes da árvore acessível. Tab chegou ao selo com contorno de foco visível. |
| Abertura | Enter no selo iniciou o fluxo normal e a animação existente. Controle Pausar antes de abrir a carta (ação de espera) acionado pela interface durante sua janela natural. |
| Cartão apresentado/pausado | `aria-hidden=false`; monograma e citação disponíveis na árvore. Cartão legível na captura, controle Continuar visível e carta ainda oculta após a conclusão da apresentação. |
| Continuar | Enter no controle revelou a carta e focou `letter-title`; capa oculta. Aparência da carta e contorno de foco conferidos em captura. |
| Retorno | Enter em Voltar para a capa restaurou o selo como foco visível e scrollY=0. Cartão novamente `aria-hidden=true` e ausente da árvore; carta oculta. |

Nenhuma regressão visual ou de progressão identificada nesse percurso/viewport.
Estilos e recursos de animação não foram alterados pelo candidato. Não se
reenviou RSVP, não se alterou senha e não se modificaram Auth, banco ou monitores.

A aba inicial havia carregado módulos antes da publicação. Após recarga, HTML
novo com JS ainda em cache manteve transitoriamente o cartão oculto na árvore
durante a pausa. O recurso publicado já continha a correção; headers indicaram
`Cache-Control: max-age=600`. Após a validade desse cache e nova recarga, o
mesmo percurso confirmou os três estados corretos acima. Não se modificaram
cache da aplicação, estilos ou tempos para contornar a observação. A primeira
tentativa de alcançar Pausar também excedeu a janela da ferramenta; a execução
concluída acionou o controle durante o fluxo natural, sem congelar a animação.

Capturas e árvores sanitizadas, ignoradas pelo Git, sob
`.dev/qa/uat-accessibility-2026-10-26/`: `cover.png`, `card-paused.png`,
`letter.png`, `cover-return.png` e respectivos registros `.ax.txt`.
`prd-current-reference.png`/`.ax.txt` registram a consulta PRD somente leitura.

**Publicação e conferência focada UAT concluídas.** Inspeção de árvore não é
teste com leitor de tela. Não houve novo teste de zoom real de 200%, Firefox,
Safari ou iOS pelo agente. A confirmação humana prévia de Firefox/Safari mantém
versões, dispositivo, sistema operacional e ambiente não informados; não se
reatribui como execução específica desta publicação. Não se declara conformidade
integral com WCAG. A promoção PRD subsequente foi autorizada e concluída no
registro acima, sem ampliar retroativamente a cobertura deste ciclo UAT.

### Plano PRD preparado por consultas de leitura

O plano abaixo foi preparado somente por leitura no ciclo UAT e posteriormente
executado por autorização específica, conforme o registro PRD acima. Preserva-se
como histórico do plano aprovado: candidato exclusivamente c25e2cd, excluindo
as alterações documentais locais produzidas após a publicação UAT.

1. Após autorização específica, atualizar refs e conferir árvore limpa,
   ancestralidade e candidato exato. Base ao preparar o plano: production em bf35bc2; intervalo
   efetivo: os quatro commits e 12 arquivos discriminados acima, com 529 inserções
   e 48 exclusões. Mudanças executáveis: `invite-app/index.html`,
   `invite-app/scripts/welcome/envelope.js` e
   `invite-app/scripts/devmode/preview.js`; regressão em
   `scripts/envelope-motion.test.mjs`. Os outros oito arquivos são documentação.
   Sem alterações de backend, Auth, banco, dependências ou configuração de deploy.
2. Reconfirmar os checks exigidos do SHA e a referência estável de rollback.
   Dashboard Vercel consultado em modo somente leitura: projeto
   `prj_ddkuhQTns4qqaGCXtBoq5ilWoteb`, Production Branch `production`, deployment
   **`dpl_VhUcj8Lvq56JTxFYgwgyxLCeN8Kr`**, READY/current, SHA bf35bc2 e domínio
   `bruna-e-diego.vercel.app`. GET do runtime oficial confirmou `prd`, projeto
   `bkkienyemqlkueygknzl` e buildId bf35bc2. Essa é a referência estável para
   reversão da próxima publicação; reconfirmar disponibilidade/elegibilidade no
   mecanismo Vercel no ciclo autorizado, sem usar a referência anterior 09267d1
   como alvo automático. A conexão MCP de deployments recebeu 403 por escopo;
   as informações atuais foram conferidas no dashboard autenticado.
3. Seguir [o procedimento canônico](environments.md#proteções-e-promoção), passo
   a passo: `git switch production`,
   `git merge --ff-only c25e2cd266540210efc0297697ce54a2e5de9e03`, conferir HEAD e
   `git diff --check`, então `git push origin production`. Interromper se refs,
   diff ou ancestralidade divergirem. Push dessa branch aciona CI e Vercel PRD;
   Pages permanece restrito a staging. Sem merge commit, reset ou force-push.
4. Acompanhar CI e Vercel até READY; conferir domínio oficial, appEnv `prd`,
   projeto Supabase PRD, buildId exato e recursos publicados. Repetir somente a
   conferência focada de capa/cartão/carta, teclado e foco após transições,
   com módulos atualizados. Não exigir novo RSVP ou troca de senha por esta
   alteração; não há ajuste Auth/e-mail/callback necessário ao diff proposto.
5. Se houver regressão essencial, com autorização de recuperação, usar o
   mecanismo Vercel para restaurar o deployment estável acima e conferir
   domínio/runtime. Rollback restaura frontend; não reverte Git, Auth, senha,
   banco ou Functions. Conferir a política de autoatribuição de domínios antes
   de publicação posterior. Não executar reset/force ou reversão de backend.

## Cobertura evolutiva DEV — 26/10/2026

Checkout inicial limpo em `feature/landing-page`, SHA
`76bf55fa2f766a846245da231e99a4493c412917`. Este ciclo acrescenta uma correção
local e documentação; não representa publicação ou novo aceite UAT/PRD.
Recuperação administrativa e monitoramento PRD continuam concluídos nos
registros anteriores, sem reabertura de auditorias.

### Ambiente e ferramentas

- Procedimento de [DEV local](local-development.md) seguido: snapshot
  `.dev/event-config.json` existente e preservado, Docker Desktop/WSL2 e imagens
  Supabase já disponíveis. `dev:up` sem reset e sem o GET condicionado à ausência
  do snapshot. Nenhuma consulta ao backend UAT/PRD ou alteração remota.
- Node 22.14.0 e servidor Python 3.12.2, restrito a `127.0.0.1:8000`.
  Supabase API/Functions em `127.0.0.1:54321`, Mailpit em `:54324` e contingência
  em `:54328`; `npm run dev:health` aprovado.
- Navegador efetivamente exercitado: navegador integrado automatizado (IAB),
  viewport 1280 × 720. Versão do engine não aferida. Isso não é Firefox real
  nem um teste do Edge instalado.
- Edge 155.0.4283.62 encontrado no Windows, mas a ferramenta de automação nativa
  recusou seu controle por falta de aprovação do aplicativo. Foram fornecidos
  os passos de liberação; não houve nova autorização confirmada neste ciclo.
- Firefox e NVDA não encontrados no inventário local de aplicativos nem nos caminhos
  consultados; Firefox também não encontrado nas entradas App Paths consultadas.
  Nenhum navegador/leitor foi instalado. Narrador 10.0.26100.8972 presente, sem
  teste de fala realizado. Inspeção da árvore acessível não equivale a leitor de tela.
- Zoom real de 200% e Safari/iOS não executados pelo agente. O viewport acima não é evidência
  de zoom, emulação de aparelho ou execução nesses ambientes.

### Confirmação humana em Firefox e Safari

Na consolidação deste ciclo, o responsável confirmou testes manuais de todos
os recursos em Firefox e Safari, sem relatar problemas. Essa é evidência humana,
separada das verificações automatizadas DEV e do inventário local do agente.

Versões dos navegadores, dispositivo, sistema operacional e ambiente acessado
não foram informados. Também não houve confirmação específica de zoom real de
200% ou uso de leitor de tela. Safari não estabelece, por si só, execução em iOS.
Não se atribuem esses detalhes nem uma nova execução pelo agente à confirmação.

### Percursos reais no navegador automatizado

| Percurso | Resultado observado |
| --- | --- |
| Capa e selo | Selo acessível como botão; primeiro Tab da capa chegou ao selo, com foco visível. Enter abriu o convite; clique no selo também exercitado. |
| Cartão | Controle existente Pausar/Continuar (ação de espera solicitada) acionado por Espaço/Enter. Pausa manteve a carta oculta; retomada focou `letter-title`; retorno focou o selo. Os tokens normais de animação foram preservados. |
| Carta e teclado | Tab percorreu os dois links de localização, nome, e-mail, presença, acompanhantes, envio e retorno; foco visível nos controles. Links externos não foram abertos. |
| RSVP | Campos obrigatórios, e-mail inválido e quantidade acima de 15 rejeitados nativamente, com foco no campo correspondente. Ausência desabilitou acompanhantes e zerou o valor; presença reabilitou o campo. Um RSVP sintético foi confirmado no backend DEV, com feedback `role=status`, `aria-live=polite` e botão bloqueado após sucesso. |
| Login | Credencial sintética local autenticou pela interface; dashboard e lista carregaram sem erro. Sessão de teste encerrada pela interface. Uma credencial inválida apresentou erro genérico com `role=alert`, excluído da árvore ao ocultar o painel de login. Senha e UUID locais preservados; nenhum segredo impresso. |
| Login/recuperação | Alternância nos dois sentidos restaurou título/descrição e focou o e-mail. Cópia do e-mail sintético conferida visualmente. Painel oculto com `hidden`/`inert`, sem seus controles na árvore acessível. E-mail inválido rejeitado nativamente; solicitação válida apresentou mensagem neutra. |
| Redefinição bloqueada | Acesso direto e reload com URL limpa mantiveram formulário `hidden`/`inert`, controles ausentes da árvore e mensagem com `role=alert`. |
| Redefinição válida | Link legítimo do Mailpit, com host Auth e callback DEV conferidos sem registrar token/URL completa. Campos rotulados, instrução de mínimo, foco em Nova senha, status polite e ordem Nova senha → confirmação → salvar → voltar. Submissão vazia rejeitada nativamente e foco no primeiro campo. Nenhuma nova senha digitada ou alterada. |

As inspeções visuais/DOM da capa, cartão, carta, login e reset não identificaram
problema adicional neste viewport. Não ampliam cobertura para zoom ou outros
navegadores. O registro sintético deste ciclo foi removido por filtro exato no
banco Docker local; não houve reset, CRUD remoto ou alteração de outros convidados.

### Defeito comprovado e correção

Antes da correção, a capa mostrava o envelope fechado, mas a árvore acessível
expunha monograma e citação do cartão coberto. Isso é exposição indevida na
árvore; não se afirma que houve anúncio por um leitor de tela efetivamente ouvido.

O cartão agora começa com `aria-hidden=true` no HTML e no reset do controlador.
O atributo passa a false no início da apresentação e volta a true no retorno.
O preview DEV acompanha capa/cartão/carta, sem mudar geometria, estilos,
temporizadores, autenticação ou regras de negócio. O cartão não contém controles
interativos que receberiam foco sob `aria-hidden`.

Reverificação no navegador: citação ausente na capa, disponível durante a pausa
real e novamente ausente após retorno; Continuar manteve o foco de transição.
Uma primeira reverificação ainda utilizou o módulo antigo em cache em
`127.0.0.1`; a origem DEV permitida `localhost:8000` carregou o grafo atualizado
e confirmou ambos os estados. Não se alteraram os tempos para compensar latência
da automação ou a janela curta de acionamento do controle.

### Verificações automatizadas e estáticas

- Regressões reproduziram a falha antes da correção: três novos casos de
  estado/preview e a asserção HTML falharam; os demais 21 testes do arquivo passaram.
- `node --test scripts/envelope-motion.test.mjs`: **25 aprovados**, zero falhas,
  após a correção. Cobertura normal/reduced-motion, pausa/retorno e preview.
- `npm run test:node`: **414 aprovados**, zero falhas. Inclui os 25 acima;
  as contagens não devem ser somadas. DOM/timers/WAAPI simulados não provam voz.
- Sintaxe aprovada em `scripts/main.js`, `scripts/welcome/envelope.js`,
  `scripts/devmode/preview.js` (sob `invite-app`) e
  `scripts/envelope-motion.test.mjs`; `git diff --check` aprovado.
- Deno, SQL e integração ampla não repetidos: nenhuma camada backend alterada.
  Login, RSVP e recuperação de link deste ciclo foram exercitados pela interface
  DEV real, sem substituir esses percursos por testes diretos no SDK.
- Sucesso após troca de senha não foi recriado. Reutilizam-se os aceites
  funcionais existentes e as fixtures de recuperação, sem novo aceite de voz
  ou zoom para esse estado e sem fabricar sessão/sucesso.

Evidências ignoradas pelo Git em `.dev/qa/accessibility-2026-10-26/`:
`cover-after.png`, `cover-after.ax.txt`, `card-paused-before.png`,
`card-paused-after.ax.txt`, `rsvp-layout.png`, `reset-valid-required.png`, `reset-blocked.png`,
`envelope-tests.log` e `node-tests.log`. Sem campos de senha preenchidos,
sessões ou links completos de recuperação nessas evidências.

### Pendências e roteiro manual curto

1. Complementar, quando disponíveis, os metadados dos testes humanos já
   confirmados em Firefox e Safari: versão, dispositivo, sistema operacional e
   ambiente acessado. Não é necessário repetir os percursos funcionais apenas
   para consolidar essa confirmação.
2. Em navegador real autorizado, usar zoom do próprio navegador até o indicador
   mostrar **200%**. Conferir leitura, controles, cortes, sobreposição e rolagem
   nas mesmas telas. Não usar CSS zoom ou viewport estreito como substituto.
3. Com Narrador ou outro leitor real, ouvir nomes, instruções, erros, status e
   foco; verificar que cartão coberto e painéis ocultos não sejam lidos, mas o
   cartão apresentado seja. Registrar leitor/versão e resultado ouvido.
4. Para reset válido, usar somente outro link DEV do Mailpit, navegar pelos
   campos e validar vazio; não é necessário salvar nova senha. Sucesso após troca
   continua amparado pelas evidências anteriores, sem novo teste assistivo desse estado.
5. A cobertura específica de iOS permanece não informada. Se necessária à
   matriz de dispositivos, requer execução real e registro próprio; não inferir
   esse resultado da confirmação de Safari nem dos testes IAB.

Cobertura evolutiva **parcial** quanto à matriz detalhada de dispositivos,
zoom e tecnologias assistivas, com defeito concreto corrigido e testes funcionais
em Firefox e Safari confirmados pelo responsável. Este ciclo não declara
conformidade integral com WCAG e não modifica os aceites históricos.

## Recuperação administrativa — PRD, 25/10/2026

Candidato exato `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb` promovido por
fast-forward e push exclusivo de production; 9e3ad34 preservado e excluído.
[CI 40216876597](https://github.com/bispoID/wedding-invitation-project/actions/runs/40216876597)
aprovou 411 Node, 150 Deno, sintaxe e whitespace. Deployment Vercel
`dpl_VhUcj8Lvq56JTxFYgwgyxLCeN8Kr` READY, domínio oficial e runtime PRD com o SHA
correto. Conferidos 75 recursos; 73 estáticos idênticos ao candidato.

Auth recebeu somente Site URL oficial e callback exato de recuperação. Conta,
UUID, allowlist administrativa e serviço padrão de e-mail preservados. Login anterior/painel,
acesso direto rejeitado, solicitação, recebimento e callback reais verificados.
Troca e resultado da etapa de sucesso simplificado confirmados pelo responsável,
assim como senha anterior rejeitada e nova autenticando. UUID/e-mail preservados
por comparação após a troca; reuso rejeitado em outra aba. O responsável confirmou
que o novo login abriu o painel PRD e carregou a lista, concluindo o aceite
funcional. A evidência desse acesso posterior é humana; na conferência do agente,
a aba já estava no login. Rollback elegível para
`dpl_7wXbLSv8F8DjzasFubCoasRDgvJU` conferido,
sem executar reversão. [Resultados e limites](password-recovery-prd-validation.md).

## Recuperação administrativa — UAT, 25/10/2026

Entrega `ed5f7c9c99dfa269607c5628e5514ca703b75217` publicada em Pages UAT,
[run 40199947457](https://github.com/bispoID/wedding-invitation-project/actions/runs/40199947457),
com CI aprovado e 75 arquivos publicados idênticos ao artefato. Auth UAT recebeu
somente o callback exato e o e-mail autorizado do mesmo administrador, preservando
UUID; serviço padrão de e-mail e template mantidos. Solicitação → recebimento →
callback, troca humana, sucesso persistente, retorno ao login, UUID e bloqueio de
reuso aprovados. O responsável confirmou senha anterior rejeitada, nova senha
autenticando e abertura do Painel de administração UAT. Validação funcional da
versão publicada concluída; a evidência dos logins e do dashboard é humana.
Refinamento posterior do texto e da orientação de senha validado localmente
(411 testes), com commit/publicação UAT próprios registrados no relatório.
PRD preservado. [Evidências e pendências](password-recovery-uat-validation.md).

## Publicação DEV/UAT/PRD — 24/10/2026

Registro consolidado da homologação e Etapa 6C, não nova execução de testes
nesta revisão documental. Estado de operação: [ambientes](environments.md);
pendências e decisões: [roadmap](development_roadmap.md#estado-atual).

- SHA homologado/publicado: `09267d1188d26e95a2295897da6695a20a1e6b27`.
- UAT Pages: [run 40096509221](https://github.com/bispoID/wedding-invitation-project/actions/runs/40096509221).
  Homologação registrou 377 Node, 150 Deno e 102 verificações do gate portátil.
- Aceite humano atualizado: Edge desktop, foco RSVP e redução de movimento;
  Galaxy A21 físico/Chrome, incluindo redução de movimento. iPhone SE foi perfil
  emulado no DevTools, não aparelho físico; Android 15 virtual foi complementar.
- Limites aceitos: Safari/iOS e Firefox não testados nesse release; zoom real 200%
  e leitores de tela não revalidados. Aceites mais antigos abaixo não são
  automaticamente atribuídos ao novo SHA.
- Production promovida por fast-forward de b5995cf para o mesmo SHA, sem merge
  commit. Push exclusivo de production; staging remota preservada.
- [CI production 40129755999](https://github.com/bispoID/wedding-invitation-project/actions/runs/40129755999)
  completed/success, incluindo Node, Deno, sintaxe e whitespace.
- Deployment Git Vercel `dpl_7wXbLSv8F8DjzasFubCoasRDgvJU`, READY, domínio
  https://bruna-e-diego.vercel.app/, sem redeploy manual.
- Runtime público 200: appEnv=prd, projectRef=bkkienyemqlkueygknzl,
  URL Supabase PRD, publicSiteUrl canônica e buildId igual ao SHA completo.
- Home, bootstrap, main.js, main.css, módulo RSVP e imagem social retornaram 200;
  selo → carta → formulário visível → retorno à capa funcionaram no navegador.
  Nenhum envio RSVP, CRUD ou login administrativo pelo agente nessa publicação.
- Administração PRD: responsável atestou login real e consultas de convidados,
  métricas e contingência pelo domínio oficial. URL canônica e configuração
  Sheets PRD separado de UAT foram atestados; não equivalem a inspeção de secrets
  nem novo E2E de contingência.
- Auditoria 6B: 16 migrations/schema/RPC compatíveis; oito Functions PRD baixadas
  oficialmente. 27 arquivos corresponderam ao fonte PRD anterior; comparação
  com o homologado encontrou 5 equivalentes textuais, 18 AST e 4 diferenças
  estruturais no adapter de contingência, sem incompatibilidade HTTP identificada.
  Imports relativos disponíveis; npm transitivo, lockfiles e import map de
  admin-list-guests não integralmente recuperados. Compatibilidade estática,
  não reprodução completa do runtime.
- Recuperação administrativa incompleta: risco residual explicitamente aceito.
  Runbook planejado não foi testado; nenhum ajuste Auth ou redefinição de senha.
- Sem alteração de Supabase, Functions, migrations, Google Sheets ou secrets
  durante a promoção. Worktree terminou limpo e sincronizado em production.

A criação inicial das branches partiu de `d3f35d98d594ae1885bb94135204a872c5809dec`;
`1e19f5bc86a2a80aebcc9b2a5cceb2f247cc6e57` introduziu a separação inicial.
São marcos históricos, não referências para republicar.

A seguir, checkpoints anteriores preservados para diagnóstico e rastreabilidade.
Termos como “atual”, “pendente” e “não publicado” referem-se à sua própria data.

## Continuação da Etapa 4 — E2E Edge aprovado com ressalvas, 23/10/2026

Login real com senha digitada pelo usuário no contexto de teste, namespace/JWT
UAT, convite por teclado, Pausar/Continuar, foco, RSVP 201/loading/trava, dashboard,
paginação 10+1, busca, métricas globais, edição, Event Config, contingência vazia,
limpeza de 11 UUIDs e logout aprovados. 17 cenários funcionais, sem erros;
checagem complementar de assets/layout em desktop e mobile emulado aprovada.
Nenhuma chamada Pages real/PRD/DEV, alteração remota de configuração ou publicação.
312 Node/150 Deno passaram. Aceite humano em aparelho real continua separado.
[Evidências e UUIDs](uat-edge-e2e.md). O checkpoint parcial abaixo é histórico.

## Etapa 4 UAT — 23/10/2026, execução parcial

312 Node, 150 Deno e sintaxe de 46 JS/MJS aprovados. Artefatos reais UAT em
raiz/subpath: 71 arquivos cada, runtime público validado, fixture fictícia e
metadados de homologação. Foram dois GETs públicos UAT nesta etapa (ensaio e
build final), sem escritas. Não houve acesso funcional PRD ou ao Pages atual.
Convite, RSVP, login, dashboard e CORS em navegador **não executados** por
ausência de interceptação/contexto isolado disponível. As evidências HTTP da
Etapa 3.2B não substituem esses critérios. [Detalhes](uat-frontend-validation.md).

Checkpoint de consolidação documental: **13/10/2026**. Projeto:
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
