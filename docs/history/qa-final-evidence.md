# QA final — evidências técnicas e manuais

> Registro histórico. As pendências e autorizações descrevem o checkpoint
> indicado, sem substituir a operação vigente. [Estado atual](../development_roadmap.md#estado-atual)
> e [índice de evidências](../README.md#evidências-históricas).

## Publicação e conferência PRD das refatorações administrativas — 28/10/2026

**Publicação PRD e conferência administrativa concluídas**, com as restrições
de cobertura abaixo. Candidato executável exato:
`59d5ddc59cc6e8e47913d154f68aa1d9416e7a2c`, previamente publicado e homologado
em UAT. Não houve alteração funcional ou avanço para outro candidato.

### Autorização, Git e isolamento dos artefatos

- Autorização PRD recebida no anexo e confirmada diretamente pelo responsável
  no chat antes do deploy. A revisão automática rejeitou a primeira solicitação
  de execução por não aceitar o anexo como autorização direta; o comando não
  foi executado nessa tentativa. A confirmação posterior liberou o escopo
  exato, sem efeitos parciais daquele comando bloqueado.
- Checkout principal em `feature/landing-page`, HEAD inicialmente no candidato,
  índice vazio e somente este QA modificado. Uma cópia integral do documento
  foi preservada antes da etapa PRD; suas evidências UAT foram mantidas.
- Fetch, refs remotas, worktrees e ancestralidade conferidos. Feature e staging
  remotas estavam no candidato; production em
  `c25e2cd266540210efc0297697ce54a2e5de9e03`, ancestral, diferença `0 5`.
- Artefatos extraídos dos blobs do candidato em worktree destacado e isolado,
  sem incluir o QA não commitado, dados locais ou outros arquivos não versionados.
  Configuração operacional das cinco Functions preparada fora do checkout,
  com project-ref PRD explícito, flags JWT/import map preservadas e nenhum
  override local de duração introduzido.
- Regra remota Protect Production `25768402` ativa, sem bypass: exclusão e
  non-fast-forward bloqueados; check exigido `validate / JavaScript and Deno
  tests`, integração `15368`, aprovado para o SHA exato antes da promoção.
- Após aprovar os contratos do backend, production avançou por fast-forward
  com comparação do valor anterior, sem trocar o checkout principal. Push
  normal exclusivo de production, sem force, reset, rebase ou merge commit.

### Estado anterior real e rollback por camada

- Frontend servido antes das alterações: `appEnv=prd`, ref
  `bkkienyemqlkueygknzl`, buildId `c25e2cd266540210efc0297697ce54a2e5de9e03`.
  Foram preservados **75 recursos publicados**, com hashes. Deployment Vercel
  real anterior `dpl_PaytKBpZHjmVbppUgR22XmawwZrP`, READY, domínio oficial
  `https://bruna-e-diego.vercel.app/`; não foi inferido somente da branch.
- Projeto Vercel `prj_ddkuhQTns4qqaGCXtBoq5ilWoteb`, equipe
  `team_fTI9LQxhX6q7r3XC5gxy8jxl`. Após autorização da equipe, o conector ainda
  recusou a listagem específica de candidatos a rollback por permissão
  `deploymentRollback`; CLI Vercel indisponível. O painel autenticado confirmou,
  antes da substituição, Redeploy do mesmo código-fonte em Production e no
  domínio oficial. O formulário foi cancelado sem publicar. Após a nova
  publicação, **Instant Rollback ficou habilitado para o deployment anterior**,
  com captura preservada; a ação não foi executada.
- Projeto Supabase confirmado por metadados: `wedding-invitation-project`, ref
  `bkkienyemqlkueygknzl`, região `sa-east-1`, ACTIVE_HEALTHY e organização PRD
  distinta da UAT. Fontes e bundles binários reais das cinco Functions foram
  baixados antes de qualquer substituição, com versões, configurações e hashes.
- Os cinco backups tiveram integridade conferida e cópias de restauração
  aprovadas por `deno check --cached-only`, sem instalação. Locks preservados
  do mesmo SDK exato `2.117.2`, cuja resolução foi confirmada independentemente
  em cada bundle implantado. Não se presumiu correspondência com o Git.
- Em `admin-list-guests`, a API de fontes e o unbundle local omitiram o import
  map, embora o metadado fosse verdadeiro. Seu único alias bare foi reconstruído
  usando o único SDK resolvido no bundle real. Essa reconstrução está explícita
  no manifesto; não se atribui identidade de bytes ao import map original
  ausente. Os outros três mapas foram preservados das fontes remotas. A extração
  local usou imagem Edge Runtime já instalada, sem rede, pull ou volumes DEV.
- Procedimentos por camada em `.dev/prd-refactors-20261028/ROLLBACK.md`: redeploy
  individual das cópias anteriores com project-ref explícito; retorno Vercel ao
  deployment salvo por Instant Rollback ou Redeploy, com reconferência de
  domínio, buildId e recursos. Rollback não reescreve Git, banco, Auth ou Sheets.
  Não foi necessário executar rollback nesta publicação.

### Functions PRD publicadas e contratos conferidos

| Function | Versão anterior → resultante | Resultado |
| --- | --- | --- |
| `admin-list-guests` | 8 → 9 | ACTIVE, `verify_jwt=true`, import map preservado |
| `admin-list-contingency` | 7 → 8 | ACTIVE, `verify_jwt=true`, import map preservado |
| `admin-manage-event-config` | 4 → 5 | ACTIVE, `verify_jwt=true`, sem import map, como antes |
| `admin-manage-guests` | 9 → 10 | ACTIVE, `verify_jwt=true`, import map preservado |
| `admin-recover-contingency` | 12 → 13 | ACTIVE, `verify_jwt=true`, import map preservado |

- Publicações individuais, somente dessas cinco Functions. As fontes posteriores
  foram novamente baixadas e comparadas ao candidato; todos os artefatos incluem
  `_shared/admin-auth.ts` e `_shared/admin-runtime.ts`. `_shared` não foi publicado
  como Function. Os cinco hashes EZBR novos coincidem com os artefatos UAT.
- **25 cenários HTTP reais PRD** aprovados: Bearer ausente/inválido (401), Origin
  não permitida (403), preflight (204) e método não suportado (405), nas cinco
  Functions. Foram requisições rejeitadas antes de operações de dados; nenhum
  usuário Auth foi criado para os testes. Usuário autenticado fora da allowlist
  não foi ensaiado novamente em PRD; a evidência UAT desse caso permanece separada.
- A conta PRD existente foi autenticada privadamente pelo responsável. Antes da
  promoção do frontend, as leituras autorizadas de convidados, contingência e
  Event Config responderam 200 com issuer e namespace PRD conferidos. A asserção
  inicial do executor ocorreu enquanto a resposta de contingência ainda estava
  pendente; sua conclusão com 200 foi observada, sem mudança da aplicação.
- `rsvp` permaneceu na versão **20**, `health` na **3** e `event-config` público
  na **4**, com metadados/hashes preservados. Todos os digests de secrets foram
  mantidos, assim como timestamps dos quatro secrets customizados. Nenhuma
  alteração de origins, allowlist, secrets, import maps de dependências, banco,
  migrations, SMTP, templates, redirects ou limites foi executada.

### Frontend, CI e conferência funcional PRD

- Deployment publicado:
  [dpl_86kRh9L2BsL2k2GyE2omadCRcy4c](https://vercel.com/d7-af27/wedding-invitation-project/86kRh9L2BsL2k2GyE2omadCRcy4c),
  READY, target `production`, SHA exato do candidato, domínio oficial
  [bruna-e-diego.vercel.app](https://bruna-e-diego.vercel.app/).
- Runtime servido: `buildId` igual a `59d5ddc59cc6e8e47913d154f68aa1d9416e7a2c`,
  `appEnv=prd`, ref `bkkienyemqlkueygknzl`, URL Supabase PRD e base root exatas.
  **78 recursos** comparados byte a byte ao artefato esperado, preparado dos
  blobs do candidato com um GET real de Event Config público PRD. Os três módulos
  novos estão presentes e carregaram no navegador.
- [CI de production 40802255961](https://github.com/bispoID/wedding-invitation-project/actions/runs/40802255961)
  aprovado, job `123212849154`. Logs conferidos: **421 testes Node e 165 Deno**,
  sem falhas. São execuções da cobertura existente; não são somadas aos testes
  UAT como casos distintos. Nenhuma suíte local completa foi repetida.
- Sessão privada nova no Edge instalado, sem importar cookies ou storage de
  DEV/UAT. Login, manutenção da sessão após reload, lista, pesquisa com um
  registro existente, pesquisa vazia, limpeza do filtro, métricas globais,
  próxima/anterior e tamanho de página 20 foram conferidos no frontend novo.
- Interfaces de convidados, Event Config e contingência carregadas; Event Config
  foi aberto e recolhido sem edição, com hash da resposta preservado antes/depois.
  Nenhum registro de contingência foi recuperado ou inserido.
- Logout pela interface aprovado, storage de sessão removido e retorno ao login.
  A asserção imediata de foco na abertura de recuperação não foi satisfeita pelo
  executor. Uma conferência isolada, sem sessão, com espera explícita do DOM,
  aprovou abertura por teclado, foco no e-mail e botão de envio disponível.
  **Nenhum e-mail de recuperação foi enviado em PRD.**
- Nenhum erro de página/carregamento ou conexão bloqueada foi observado nos
  ensaios concluídos. Os contextos privados foram fechados. Capturas do dashboard
  ocultam conta, linhas de convidados e contingência; não se atribui aceite visual
  humano à inspeção automatizada.

### Preservação, cobertura e fechamento documental

- Conferência PRD somente de leitura de aplicação: **zero convidados sintéticos**,
  zero escritas administrativas e nenhuma limpeza de convidados necessária.
  Convidados reais, Event Config, senhas, cadastros Auth e planilha PRD não foram
  alterados pelo ensaio. CRUD e recuperação de pendências aprovados em UAT não
  são apresentados como executados em PRD.
- Abertura do formulário de recuperação PRD é distinta do callback UAT validado
  posteriormente. Não houve nova troca manual de senha nem login posterior com
  nova credencial nesta publicação. Nenhum teste RSVP, health funcional, falha
  provocada, leitor de tela, Firefox/Safari ou dispositivo físico foi executado.
- Onze fingerprints do vínculo CLI principal e `.gitignore`, incluindo `*.zip`,
  foram preservados. A evidência UAT local anterior foi conferida por hash antes
  desta inclusão. O worktree temporário forneceu somente o candidato commitado
  e foi removido após conferir HEAD e árvore limpa; os backups foram preservados.
- Staging permaneceu no candidato e não houve nova publicação Pages decorrente
  da promoção de production. O único deployment Vercel do candidato identificado
  nesta etapa é Production; domínios atribuídos pertencem ao projeto PRD esperado.
- Este fechamento é documental: commit posterior somente deste arquivo, na
  feature, com mensagem `docs(qa): record UAT and production validation of admin
  refactors`. Seu push e CI são acompanhados após criar o commit. Staging e
  production não são repromovidas para incluir essa evidência. Portanto, o SHA
  documental posterior da feature difere do SHA executável publicado, embora a
  diferença se restrinja ao QA. O hash e o resultado desse CI constam do relatório
  final, sem tentar incluir o hash de um commit em seu próprio conteúdo.
- Evidências operacionais, manifestos, backups e capturas preservados no diretório
  ignorado `.dev/prd-refactors-20261028/`, sem credenciais ou conteúdo de sessão.

## Publicação e homologação UAT das refatorações administrativas — 28/10/2026

Candidato autorizado: `59d5ddc59cc6e8e47913d154f68aa1d9416e7a2c`.
O código executável corresponde ao checkpoint DEV
`8f49a387f9f1d968c51498e8b155ecf1abedfaaf`; o commit posterior registra QA.
Frontend e cinco Functions administrativas foram publicados exclusivamente em
UAT. A pendência do callback de recuperação foi resolvida pela tentativa
controlada descrita abaixo, sem alteração de código, configuração ou senha.
O aceite atual abrange solicitação, verificação, inicialização, formulário
habilitado e encerramento da sessão de recuperação; não inclui uma nova troca
manual de senha nem login posterior com nova credencial.

### Git, CI e frontend efetivamente publicado

- Checkout inicial e final em `feature/landing-page`, HEAD no candidato. Árvore
  e índice estavam limpos antes da execução. Referências e ancestralidade foram
  conferidas com atualização remota antes de cada push.
- Push normal exclusivo de `feature/landing-page`; CI do SHA exato aprovado:
  [40761499936](https://github.com/bispoID/wedding-invitation-project/actions/runs/40761499936).
  Somente após essa aprovação, staging avançou por fast-forward do SHA anterior
  `c25e2cd266540210efc0297697ce54a2e5de9e03` ao candidato, seguido de push
  normal exclusivo. A atualização local de staging preservou o checkout DEV.
- CI de staging aprovado:
  [40764122547](https://github.com/bispoID/wedding-invitation-project/actions/runs/40764122547).
  Pages aprovado:
  [40764123089](https://github.com/bispoID/wedding-invitation-project/actions/runs/40764123089),
  com validação do mesmo SHA e deploy dependente da aprovação.
- Logs dos jobs conferidos: **421 testes Node, 165 Deno e sintaxe de 36 módulos
  JavaScript** por execução da validação. O job Pages também aprovou sua seleção
  portátil de **102 testes Node**. Execuções e subconjuntos sobrepostos não são
  somados como testes distintos. As suítes completas não foram repetidas
  localmente; tipagem dos backups e comparação dos artefatos têm outro alcance.
- Publicação real em
  [GitHub Pages UAT](https://bispoid.github.io/wedding-invitation-project/):
  `buildId` igual ao candidato, `appEnv=uat`, ref `eugvobtvjicvocttnkka`,
  backend `https://eugvobtvjicvocttnkka.supabase.co` e base/subpath exatos.
  **78 recursos HTTP 200** comparados byte a byte ao artefato preparado a partir
  dos blobs Git, incluindo `login.js`, `guests-ui.js` e `contingency-ui.js`.
  Manifesto SHA-256:
  `a7aa1830cc3c5b353542e169b1811cc87d4faff4696a7a5f099f3071f8ee297f`.
- A preparação de comparação usou um GET real de Event Config UAT. Não houve
  seleção de backend por sessão DEV nem fallback para outro ambiente.
- Conferência remota posterior: feature e staging no candidato; production
  permanece em `c25e2cd266540210efc0297697ce54a2e5de9e03`. A API pública GitHub
  listou para o candidato somente o deployment `7396625190`, ambiente
  `github-pages`. Não houve operação Vercel nem consulta funcional PRD.

### Backend UAT, configuração e restauração preparada

O projeto foi conferido por metadados: `wedding-invitation-project-uat`,
ref `eugvobtvjicvocttnkka`, região `sa-east-1`, estado `ACTIVE_HEALTHY` e
organização esperada. Antes de qualquer substituição, fontes efetivamente
implantadas foram baixadas separadamente para as cinco Functions; versões,
hashes EZBR, import maps e `verify_jwt` foram registrados.

| Function | Antes → depois | Configuração conferida |
| --- | --- | --- |
| `admin-list-guests` | 1 → 2, ACTIVE | `verify_jwt=true`, import map preservado |
| `admin-list-contingency` | 1 → 2, ACTIVE | `verify_jwt=true`, import map preservado |
| `admin-manage-event-config` | 1 → 2, ACTIVE | `verify_jwt=true`, sem import map, como anteriormente |
| `admin-manage-guests` | 1 → 2, ACTIVE | `verify_jwt=true`, import map preservado |
| `admin-recover-contingency` | 1 → 2, ACTIVE | `verify_jwt=true`, import map preservado |

- Deploys individuais em diretório isolado, com project-ref UAT explícito e
  configuração correspondente aos deployments anteriores. Cada fonte remota
  posterior foi novamente baixada e comparada ao candidato; os cinco artefatos
  incluem `_shared/admin-auth.ts` e `_shared/admin-runtime.ts`. `_shared` não foi
  publicado como Function independente.
- `rsvp`, `health` e `event-config` público conservaram versão 1, hashes e
  metadados anteriores. Não houve migrations, db push, reset ou mudança de
  configuração raiz, origins, allowlist ou secrets.
- Todos os digests de secrets permaneceram iguais. Os seis secrets customizados
  também preservaram timestamps; timestamps de `SUPABASE_*` foram atualizados
  pela plataforma durante deploy sem mudança dos digests. A primeira parada do
  harness decorreu dessa comparação excessiva de timestamps; a Function já
  publicada foi reconciliada por fonte e metadados, sem redeploy duplicado.
- Restauração por fontes anteriores disponível em diretórios separados por
  Function. A CLI omite lockfiles no download; as cópias de restauração receberam
  os locks versionados do mesmo SDK exato, com proveniência registrada. Os cinco
  entrypoints de restauração passaram na tipagem com cache, sem instalação.
  Isso valida a preparação para rebuild, não identidade binária de um redeploy.
- Frontend anterior preservado: **75 recursos** publicados, hashes e buildId
  `c25e2cd266540210efc0297697ce54a2e5de9e03`. Procedimento Pages preparado:
  reexecutar o job deploy `121593993089`, execução `40329203374`, cujo checkout
  usa o SHA original. O artefato antigo não está mais listado; o rerun depende
  da elegibilidade/permissão vigente. O snapshot preservado permite preparar
  uma alternativa aprovada se necessário, sem reescrever branches.
- Backups, manifestos, configurações isoladas e instruções de restauração ficam
  em `.dev/uat-refactors-20261028/`, ignorado pelo Git. Rollback não executado;
  não foi necessário restaurar a operação dos fluxos administrativos aprovados.

### Contratos HTTP e navegador com backend UAT real

Antes de avançar o frontend, **30 cenários HTTP reais** foram aprovados nas cinco
Functions: Bearer ausente e inválido (401), usuário autenticado fora da allowlist
(403 `ADMIN_ACCESS_DENIED`), Origin não permitida (403 `INVALID_ORIGIN`),
preflight (204) e método não suportado (405). CORS para a origem autorizada foi
conferido. O usuário Auth não administrativo era sintético e foi removido por
UUID, com 404 posterior. Leituras administrativas autenticadas foram conferidas
com a conta UAT autorizada antes da promoção do frontend.

O responsável realizou o login privado. Após limitações do navegador integrado,
foi autorizado Playwright já disponível (`1.62.1`) com Edge instalado
(`156.0.4314.42`). O ensaio utilizou contexto novo e não persistente, storage
inicial vazio e namespace UAT; nenhuma sessão DEV/PRD foi transportada. A
instrumentação permitiu somente destinos UAT e os recursos públicos necessários,
bloqueou atualizações de senha e limitou mutações aos identificadores sintéticos
acompanhados. Não houve respostas simuladas, substituição de conteúdo ou atraso
artificial no ensaio UAT.

| Fluxo observado | Resultado real |
| --- | --- |
| Login e sessão | Autenticação HTTP 200, UUID e issuer UAT conferidos, dashboard e lista após reload. Uma asserção inicial do harness ocorreu antes de a lista terminar de carregar; a espera explícita posterior confirmou a sessão. |
| Lista, pesquisa e métricas | Onze fixtures, paginação 10+1, navegação anterior/próxima, tamanho 20, pesquisa exata e limpeza do filtro. Métricas globais preservadas durante pesquisa. |
| CRUD e foco | Criação 201 e edição 200; ausência zerou/desabilitou acompanhantes. Foco inicial no nome, Tab para e-mail e Escape com retorno ao botão de criação. |
| Cancelamento de exclusão | No Edge privado, confirmação nativa dispensada: **zero requisições de exclusão**, registro e total preservados. Captura `edge-cancel-preserved.png`. |
| Exclusão confirmada | Confirmação aceita em etapa separada, uma requisição real, HTTP 200, feedback e métricas atualizados. |
| Contingência e integração | Pendência sintética recuperada por uma requisição real, feedback de sucesso, linha removida da planilha e convidado encontrado na pesquisa preservada. Métricas de **11/6/5/6/12** para **12/7/5/8/15**. |
| Event Config durante recuperação | Formulário expandido manteve edição não salva; nenhuma reinicialização adicional de Event Config nem PUT de atualização no navegador. Valor de ensaio descartado, singleton preservado por hash. |
| Módulos e encerramento normal | Três módulos novos carregados, sem erros de página nem destinos bloqueados nas conferências do dashboard. Logout normal pela interface, remoção da sessão UAT do storage e retorno ao login. |
| Solicitação de recuperação | Interface enviou `/auth/v1/recover`, HTTP 200, com callback UAT exato. Nenhuma senha preexistente foi alterada. |
| Callback de recuperação — tentativas iniciais | Primeira abertura manual exibiu “Não foi possível validar o link de recuperação”; outra captura apresentou link inválido ou expirado. Aberturas fora da aba instrumentada não tiveram resposta de verificação capturada. No segundo contexto privado, envios foram aceitos com HTTP 200, mas não houve GET `/auth/v1/verify` observado; a captura posterior mostrou novamente o formulário de solicitação, com HTTP **429 `over_email_send_rate_limit`** confirmado no envio. Os envios foram interrompidos. A investigação posterior e o callback controlado bem-sucedido estão registrados na seção complementar, sem atribuir causa às rejeições anteriores além da evidência disponível. |

A tentativa inicial de cancelamento no navegador integrado ficou inconclusiva:
o comando teve timeout no diálogo nativo, o responsável informou Cancelar, mas
a inspeção posterior encontrou o registro excluído. Esse resultado não foi
usado como aprovação nem classificado isoladamente como regressão. A repetição
controlada em Edge distinguiu dispensar/aceitar e comprovou zero/uma requisição,
respectivamente. Nenhuma correção de código foi introduzida para esse ensaio.

`reset-password.html`, `reset-password.js`, `password-recovery.js` e `supabase.js`
publicados conservaram os mesmos bytes do frontend anterior. Isso não comprova
o callback funcional nem identifica a causa da falha apresentada. A nova aba de
diagnóstico registra somente status e indicadores sanitizados, sem tokens.
Tentativas de navegação para um mecanismo de busca foram bloqueadas pelo
executor; parâmetros de busca não foram registrados. O HTTP 429 foi retornado
pelo Auth UAT na solicitação de e-mail e não comprova uma resposta do callback.
Não foi presumido prazo de liberação da cota nem alterada configuração do Auth.

### Diagnóstico complementar da recuperação UAT — 28/10/2026

Esta etapa preservou o candidato, a publicação e os demais ensaios aprovados.
O estado local inicial continuava em `feature/landing-page`, HEAD `59d5ddc`,
índice vazio e somente este documento modificado. Antes da complementação foi
preservada uma cópia integral do registro em diretório ignorado.

**Fatos confirmados por leitura do Auth UAT:** configuração obtida pela
Management API do ref `eugvobtvjicvocttnkka`, sem alteração remota. Site URL
`https://bispoid.github.io/wedding-invitation-project/` e allowlist com somente
`https://bispoid.github.io/wedding-invitation-project/admin/reset-password.html`.
Email habilitado, signup desabilitado, SMTP customizado e Send Email hook
desabilitados. Serviço padrão Supabase, `rate_limit_email_sent=2`,
`smtp_max_frequency=60` segundos e `mailer_otp_exp=3600` segundos.
O limite de e-mails é por projeto/hora, conforme a
[documentação oficial de limites Auth](https://supabase.com/docs/guides/auth/rate-limits).
O único link do template configurado de recuperação usa `{{ .ConfirmationURL }}`, sem
`.Token`, `.TokenHash`, `.SiteURL` ou `.RedirectTo`; foram registrados somente
indicadores e hash, sem HTML ou credenciais SMTP. Não foi demonstrado ajuste
necessário de Site URL, redirects ou template.

A leitura Auth Admin confirmou a existência do mesmo UUID autorizado, e-mail
correspondente ao hash previamente conferido, conta confirmada e provider
`email`. `recovery_sent_at` correspondia a 20h33min09s e `last_sign_in_at` a
17h58min20s. Não houve enumeração de outras contas ou alteração da conta usada.

Os logs foram consultados em janela explícita, com seleção sanitizada e sem
persistir eventos brutos, IPs, conteúdo de sessão, tokens ou links completos.
Os caminhos abaixo foram extraídos do JSON do evento; o campo normalizado
`log_attributes.path` apresentava `/`. Horários de Brasília (UTC−3), em
28/10/2026:

| Horário | Evidência Auth UAT |
| --- | --- |
| 17:57:13 | POST `/recover`, 200, `user_recovery_requested`, conta autorizada. |
| 17:58:20 | GET `/verify`, 303, evento `login` da conta autorizada, sem erro; horário igual ao `last_sign_in_at`. Evidência de verificação aceita pelo Auth, sem provar liberação do formulário nesse navegador. |
| 17:58:56 e 17:59:13 | GET `/verify`, erro estático `One-time token not found`, seguido de 303. |
| 18:06:51 | POST `/recover`, 200, conta autorizada. |
| 20:30:09 | POST `/recover`, 200, conta autorizada. |
| 20:31:20 | GET `/verify`, erro `One-time token not found`, seguido de 303. |
| 20:33:11 | POST `/recover`, 200, conta autorizada. |
| 20:37:47 | POST `/recover`, 429, `over_email_send_rate_limit`, `email rate limit exceeded`. |

O 404 `user_not_found` às 18h07min43s refere-se ao UUID sintético removido no
ensaio anterior, não ao administrador autorizado. O 403 `session_not_found` às
18h14min01s ocorreu em `/logout`; não foi atribuído ao callback. Os logs confirmam
acessos a `/verify` fora da aba instrumentada: a ausência de GET nessa aba não
constitui ausência de acesso ao serviço.

**Causas e hipóteses:** o bloqueio de envio por cota foi confirmado pelo 429 e
pela configuração de dois e-mails/hora. As rejeições de verificação confirmam
que o token apresentado não foi encontrado naquele momento. Reutilização após
consumo, mensagem antiga, substituição por novo envio, expiração e consumo por
outra ferramenta/scanner continuam hipóteses; os dados sanitizados não permitem
vincular cada tentativa a uma mensagem específica nem identificar quem abriu
o link. O 303 isolado não foi tratado como sucesso, pois também acompanha erros.

**Comparação de código:** seis arquivos são idênticos byte a byte entre o
frontend anterior `c25e2cd` e o candidato: `reset-password.html`,
`reset-password.js`, `password-recovery.js`, `recovery-request.js`, `supabase.js`
e `shared/app-config.js`. O corpo de `initializeLogin`, extraído de `main.js`
para `login.js`, também permaneceu idêntico. `APP_BASE_URL` deriva da base real
do módulo e produz o callback exato com subpath; o cliente mantém Promise
compartilhada, SDK `2.117.2`, `flowType: implicit` e `detectSessionInUrl: true`.
`observeRecovery` é registrado antes de aguardar inicialização/sessão; seu
callback é síncrono e exige `PASSWORD_RECOVERY` com o token esperado. A página
aguarda a inicialização e um turno de evento antes de conferir a continuidade
da sessão; a URL é limpa no `finally`. Nenhuma dessas proteções foi contornada.
Não há defeito de código demonstrado nem atribuição causal à refatoração.

**Tentativa controlada:** uma nova solicitação realizada pela interface UAT às
21h47min41s de 28/10/2026, aceita pelo Auth com HTTP 200. E-mail correspondente
ao hash autorizado e `redirect_to` exato conferidos antes da transmissão;
requisição sem PKCE, consistente com `flowType: implicit`. Contexto privado novo,
sem cookies/sessão importados, com observação
anterior à navegação. Verificação e callback não recebem GET/HEAD preliminar
nem interceptação de navegação; são observados status, destinos sanitizados dos
redirects, indicadores do fragmento e resultado do SDK, sem persistir tokens.
Há orçamento de uma única requisição `/recover`, validação do e-mail por hash
e callback exato, bloqueio de destinos externos e de alterações de senha.
O envio foi executado após a margem conservadora de 21h34, sem sondagem da cota.
O orçamento está consumido e novos envios permanecem bloqueados; não haverá
reenvio automático. Nenhum 429 ocorreu nesta solicitação única.
Uma tentativa de POST anterior a essa janela foi bloqueada localmente pelo
executor; não foi transmitida ao Auth nem contabilizada como novo envio.

O responsável confirmou disponibilidade com a caixa UAT aberta e forneceu o
endereço do link após a solicitação identificada pelo horário. O endereço foi
validado sintaticamente em memória e aberto uma única vez no navegador privado
instrumentado, por canal local transitório, sem GET/HEAD preliminar ou gravação
do link em arquivo de evidência. Não foi gerado link por API administrativa.

| Horário de Brasília | Resultado da tentativa controlada |
| --- | --- |
| 21:47:41 | Uma solicitação real pela interface, POST `/auth/v1/recover`, HTTP 200, e-mail e callback exatos conferidos. |
| 21:50:45 | Navegação real GET `/auth/v1/verify`, HTTP 303, `type=recovery`; Location apontou à origem e ao caminho exatos do callback UAT. Somente indicadores do fragmento foram registrados. |
| Após o redirect | Callback HTTP 200. O fragmento inicial indicava sessão de recuperação; o SDK executou GET `/auth/v1/user`, HTTP 200, e inicializou sem erro. A sessão pertencia ao UUID autorizado, com `recovery.allows(session)=true`. |
| Formulário | Feedback “Link validado. Defina sua nova senha.”, formulário visível e não inerte, foco no primeiro campo e URL sem query/hash. Captura preservada com os campos vazios. |
| 21:51:23 | `signOut({scope:'local'})`, HTTP 204, sem erro. Retorno ao login conferido e contexto privado fechado. |

Contagem final desta etapa: **uma nova solicitação transmitida ao Auth**, aceita
com 200. Duas tentativas adicionais de POST, uma antes da janela prevista e
outra após consumir o orçamento, foram bloqueadas localmente, sem chegar ao
Auth. Não houve sondagem da liberação da cota por reenvios. **Zero requisições
PUT/PATCH de atualização de senha** foram observadas. O agente não preencheu
ou submeteu nova credencial. A troca manual e o login posterior com nova senha
não foram executados nem classificados como aprovados nesta etapa.

A leitura posterior Auth Admin confirmou o mesmo UUID/e-mail autorizado,
`recovery_sent_at` às 21h47min41s e `last_sign_in_at` às 21h50min44s, coerentes
com a navegação observada. A primeira consulta da janela final no stream Auth
retornou sem linhas; essa limitação de consulta não foi tratada como ausência de
acesso. A prova desta tentativa usa as respostas de rede do navegador, o estado
do SDK e os metadados Auth Admin, distintos dos logs históricos anteriores.

**Conclusão:** a limitação de envio e as rejeições históricas de token não
encontrado estão confirmadas; o motivo de cada token ter deixado de ser válido
continua não identificado. A tentativa controlada demonstrou o funcionamento
atual do link, redirect, inicialização, observador de recuperação, liberação do
formulário e limpeza da URL. Não foi reproduzido defeito de código ou configuração;
não há correção proposta, reprodução DEV necessária ou novo candidato.
O impedimento específico do callback para a próxima etapa PRD foi removido,
mantidos os limites de cobertura descritos. Isso não representa aprovação de
uma nova troca completa de senha, aceite visual humano ou ensaio PRD.
Não houve commit, push, deploy, promoção, alteração de SMTP/template/redirects,
limites ou secrets; os demais ensaios UAT não foram repetidos.
Evidências complementares: `.dev/uat-recovery-diagnosis-20261028/`, ignorado,
incluindo `callback-proof.json` e `controlled-callback.png`.

### Isolamento, limpeza e limites do aceite

- Planilha conferida antes da inserção: “Wedding Invitation — RSVP Contingency
  UAT”, ID `1nNFUDLfoqXPWBTIsYbtkE-iRmYzC8YS2dmhRS1jG_Bs`, aba `RSVP`,
  sheetId `2008120883`, service account de escrita identificada como UAT.
  Digest de `GOOGLE_SPREADSHEET_ID` correspondente ao destino exato; sem acesso
  público/domain. Baseline sem pendências; cabeçalhos e tipos de nove colunas
  conferidos. Foi inserida somente a linha sintética desta execução, sem
  modificar formatação ou configuração. Não se provocou falha de serviço.
- **14 convidados criados e removidos**: onze fixtures de paginação, um criado
  no navegador integrado, um no Edge privado e um pela recuperação. Exclusões
  da interface foram acompanhadas pelos UUIDs; a limpeza complementar removeu
  somente os doze UUIDs ainda existentes. Estado final: zero convidados, igual
  ao baseline UAT. Nenhum registro anterior foi removido.
- Uma pendência sintética removida pela própria recuperação; leitura final de
  `RSVP!A1:I997` encontrou somente os nove cabeçalhos. A exclusão da linha pela
  Function reduziu a grade de 998 para 997 linhas. Inspeção visual automatizada
  da planilha confirmou cabeçalhos e ausência da linha de teste.
- Um usuário Auth sintético removido; UUID/e-mail da conta administrativa e
  singleton Event Config preservados. Dados de senha, tokens e links de
  recuperação não integram os arquivos de evidência.
- Onze fingerprints de arquivos de vínculo Supabase preservados. `.gitignore`,
  incluindo `*.zip`, snapshot DEV, `functions.env` e credencial local sincronizada
  anteriormente pelo responsável conservaram hashes. As três pendências DEV
  anteriores conservaram IDs e hashes. Serviços DEV não foram encerrados.
- A sessão UAT inicial no navegador integrado também foi encerrada pela
  interface; o retorno ao login foi conferido. O primeiro contexto privado Edge
  foi fechado após o logout normal. O segundo foi fechado antes do ensaio
  controlado final, após conferir ausência de storage Auth. O contexto final
  também foi fechado após encerrar sua sessão de recuperação; nenhuma sessão
  foi importada entre contextos ou ambientes.
- Cobertura funcional UAT em Edge automatizado, sem aceite visual humano
  atribuído, sem Firefox/Safari, leitor de tela ou dispositivo físico. Contratos
  negativos e navegador real são distintos das suítes Node/Deno simuladas.
- Não houve promoção, deploy, teste funcional ou alteração de serviço PRD, nem
  publicação Vercel. O candidato permanece inalterado; somente este registro
  fica modificado, sem staging ou commit adicional das evidências.

## Validação conjunta das refatorações administrativas — 28/10/2026

SHA validado: `8f49a387f9f1d968c51498e8b155ecf1abedfaaf`, na branch
`feature/landing-page`. O checkpoint abrange a separação das interfaces do Admin
em `a08ffcbb` e o runtime compartilhado das Edge Functions em `8f49a38`.
Branch, HEAD, histórico, working tree e índice foram conferidos; a árvore estava
limpa no início. Não foi identificada regressão concreta que exigisse alteração
do código da aplicação. A alteração versionável desta execução restringe-se a
este registro; não houve staging, commit, push, deploy ou promoção.

### Tipagem dos cinco entrypoints

Ambiente: Windows, Node.js `22.14.0`, Deno `2.9.7` e TypeScript `6.0.3`.
`deno info --json` identificou caches distintos: o sandbox usava um diretório
em `%LOCALAPPDATA%/Packages/sandbox.../AC/deno`, enquanto o processo fora do
sandbox usava `%LOCALAPPDATA%/deno`. Os pacotes do SDK `2.117.2`, Auth e Storage
estavam presentes no segundo e ausentes no primeiro. A resolução anterior
encontrava cache incompleto e falhava no DNS ao tentar obter os pacotes; essa
falha não constituía diagnóstico de incompatibilidade de tipos.

A execução com acesso ao cache do usuário aprovou os cinco `index.ts`:
`admin-list-guests`, `admin-list-contingency`, `admin-manage-guests`,
`admin-recover-contingency` e `admin-manage-event-config`.

- Nas quatro Functions com `deno.json`, foram usados seus próprios import maps
  e lockfiles: `deno check --node-modules-dir=none --frozen-lockfile --config
  supabase/functions/<function>/deno.json supabase/functions/<function>/index.ts`.
- `admin-list-guests` foi a primeira checagem e reutilizou o cache sem downloads
  relatados. As três checagens seguintes também usaram `--cached-only`.
- `admin-manage-event-config` não possui configuração/lockfile próprios e importa
  o mesmo SDK por versão exata. Foi checada com `--cached-only
  --node-modules-dir=none --no-config --lock
  supabase/functions/admin-list-guests/deno.lock --frozen-lockfile`, reutilizando
  o lockfile existente, cujo grafo é igual ao das outras três Functions.
- Não houve atualização de versões, instalação de dependências no projeto,
  alteração de imports, configuração ou lockfiles, nem introdução de `any`,
  supressões ou desativação da checagem.

### Testes automatizados e preparação estática

| Camada | Resultado e alcance |
| --- | --- |
| Suítes anteriores | Evidências informadas de **421 Node e 165 Deno** reutilizadas para o mesmo código e escopo. Não foram reexecutadas integralmente; não houve correção executável nesta validação. |
| Seleção executada nesta etapa | **42 testes Node aprovados**, zero falhas: `prepare-static-site.test.mjs` e `environment-isolation.test.mjs`, com `--experimental-test-isolation=none` e preload que rejeita chamadas reais de `fetch`. São parte da cobertura existente, não testes adicionais a somar aos 421. |
| Preparação portátil | Artefatos root/subpath com configuração e Event Config simuladas, comparação dos assets permitidos e exclusão dos operacionais. Não foi executado build CLI com consulta a Event Config remoto. |
| Imports e manifesto | **36 módulos JavaScript** no manifesto e **51 imports locais literais** conferidos quanto à existência e inclusão na allowlist. `login.js`, `guests-ui.js` e `contingency-ui.js` presentes. O import externo permanece o SDK declarado `https://esm.sh/@supabase/supabase-js@2.117.2`. |
| Whitespace e escopo | Diff completo revisado e `git diff --check` aprovado; índice vazio. `.gitignore`, incluindo `*.zip`, e os quatro lockfiles Deno preservados. |

### Backend DEV real e ensaio em navegador

Docker Desktop/Engine `29.8.2` foi iniciado e restaurou os containers e volumes
existentes; as imagens necessárias já estavam disponíveis. Supabase CLI local
`2.120.0`, Functions e sidecar foram reutilizados/iniciados sem reset, importação
produtiva ou instalação de infraestrutura. `npm run dev:health` aprovou API,
Functions, Event Config e contingência.

O snapshot `.dev/event-config.json` já existia, com os 14 campos e SHA-256
`D1F6C79819ED22E6166E0AEB1B98540DABF629527E193115452B0268955E7E8F`.
O singleton local correspondia ao snapshot. `dev:up` não foi executado: além de
reaplicar Event Config, seu fallback poderia redefinir a senha administrativa
quando a credencial armazenada fosse rejeitada. A rejeição inicial foi
`400 invalid_credentials`. O responsável realizou a recuperação da senha no
Mailpit DEV, informou novo login bem-sucedido e sincronizou o arquivo local.
Uma autenticação posterior confirmou HTTP 200 e preservação do UUID; nenhuma
senha foi alterada pelo agente.

Os destinos efetivos foram conferidos antes das operações:

- frontend: `http://127.0.0.1:8000/invite-app/admin/`;
- Auth e Functions do navegador: `http://127.0.0.1:54321`;
- Supabase a partir da Edge Runtime: `http://host.docker.internal:54321`;
- contingência: provider `local`, host `127.0.0.1:54328` e endereço interno
  `host.docker.internal:54328`, com `APP_ENV=dev`;
- caixa de e-mail de teste: `http://127.0.0.1:54324/`.

O ensaio no navegador integrado usou os módulos versionados e respostas reais
do backend DEV. Um servidor temporário em `.dev/qa-refactors-20261028/` limitou
os assets ao manifesto, restringiu conexões de aplicação aos destinos locais e
registrou somente métodos, destinos, status e tempos, sem credenciais ou corpos.
Para observar estados pendentes, a entrega das respostas reais de mutação e
recuperação recebeu atraso artificial de **700 ms**; status e conteúdo não foram
substituídos. Essa instrumentação não integra o código da aplicação.
O atraso foi desativado ao concluir o ensaio, com a versão utilizada preservada
no diretório de evidências ignorado.

| Fluxo observado | Resultado |
| --- | --- |
| Login e recuperação | Campos obrigatórios, credencial sintética inválida e feedback neutro conferidos. Abertura de “Esqueci minha senha” por teclado moveu o foco para o e-mail. Após a sincronização privada, novo login por senha foi executado pelo agente. |
| Sessão e logout | Dashboard autenticado, sessão preservada após reload, logout e redirecionamento de acesso direto sem sessão para o login. A sessão do ensaio foi encerrada ao final. |
| Lista, métricas e filtros | Onze fixtures produziram paginação **10+1**, retorno à primeira página e tamanho 20. Pesquisa exata retornou um registro; pesquisa sem resultado preservou as métricas globais. |
| Criação e edição | Criação HTTP 201, conflito de e-mail HTTP 409 com formulário recuperável e edição HTTP 200. Presença negativa zerou/desabilitou acompanhantes. Lista e métricas refletiram cada mutação. |
| Validação e concorrência | Campos inválidos não geraram mutação. Cliques duplos na criação e edição produziram uma única requisição por ação, com controles desabilitados e `aria-busy=true` enquanto a resposta estava pendente. |
| Exclusão | Registro criado pela interface excluído com HTTP 200; feedback, resultado vazio da pesquisa e métricas atualizados. O comando de clique teve timeout da automação no confirm nativo; a inspeção posterior confirmou a exclusão concluída. Cancelamento desse confirm não foi validado. |
| Contingência | Pendência identificada desta execução recuperada com HTTP 200 e uma única requisição após clique duplo. A fila voltou de quatro para as três pendências anteriores. |
| Integração após recuperação | Convidado recuperado apareceu na pesquisa preservada. Métricas passaram de **11/6/5/6/12** para **12/7/5/8/15** (total/confirmados/ausentes/acompanhantes/pessoas confirmadas). A edição não salva permaneceu no formulário expandido, com apenas o GET inicial de Event Config e nenhuma escrita. O valor de ensaio foi descartado. |
| Foco e carregamento | Diálogo de convidado abriu com foco no nome, Tab alcançou o e-mail e Escape devolveu o foco ao botão de criação. Não foram observados erros de carregamento dos módulos nem erros de console nas conferências do dashboard. |

Foram aprovados **30 cenários HTTP reais** nos cinco endpoints administrativos:
ausência de Bearer (401), Bearer inválido (401), usuário autenticado fora da
allowlist (403 `ADMIN_ACCESS_DENIED`), Origin não permitida (403
`INVALID_ORIGIN`), preflight (204) e método não suportado (405).
O Kong local acrescenta `Access-Control-Allow-Origin: *`, inclusive em rejeições
e preflights. A expectativa inicial do harness de ausência desse header foi
corrigida antes da execução completa; não houve alteração no CORS da aplicação.
Os headers do gateway real não foram atribuídos ao contrato do handler isolado.

### Limpeza, preservação e limites

- Foram removidos os **13 convidados** do ensaio: onze fixtures de paginação,
  um criado pela interface e um persistido pela recuperação. A exclusão via UI
  utilizou o identificador do registro; a limpeza complementar filtrou os UUIDs
  registrados e os e-mails sintéticos exatos. Estado final: zero convidados,
  correspondente ao baseline anterior ao ensaio.
- A pendência sintética foi removida pela recuperação. As três pendências
  preexistentes conservaram seus identificadores e hashes de conteúdo.
- Os dois usuários Auth sintéticos não administrativos, usados nas execuções
  inicial e completa das rejeições, foram removidos por UUID; consultas
  posteriores confirmaram 404. As sessões temporárias foram encerradas.
- Hashes confirmaram preservação do singleton de Event Config, snapshot,
  `functions.env` e `.gitignore`. O arquivo administrativo permaneceu igual ao
  estado sincronizado pelo responsável após sua troca de senha.
- Evidências operacionais e capturas ficaram no diretório ignorado
  `.dev/qa-refactors-20261028/`. Docker, Functions, sidecar e servidor DEV
  permaneceram disponíveis; nenhum dado anterior foi descartado.
- Não houve nova execução SQL ou do smoke amplo `dev:integration`, que inclui
  RSVP fora do escopo necessário. A recuperação completa de senha foi informada
  pelo responsável; o agente validou abertura, novo login e sessão, sem executar
  outra troca. Não houve ensaio adicional em Firefox/Safari, leitor de tela ou
  dispositivo físico, nem aceite visual humano atribuído a esta etapa.
- Respostas simuladas pertencem somente aos testes Node/Deno indicados.
  Não houve ensaio de aplicação em UAT/PRD, consulta remota de Event Config,
  alteração de secrets ou operação em serviços de aplicação remotos.

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
3. Seguir [o procedimento canônico](../environments.md#proteções-e-promoção), passo
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

- Procedimento de [DEV local](../local-development.md) seguido: snapshot
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
nesta revisão documental. Estado de operação: [ambientes](../environments.md);
pendências e decisões: [roadmap](../development_roadmap.md#estado-atual).

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
[roadmap](../development_roadmap.md) continua sendo a fonte oficial do estado das
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
