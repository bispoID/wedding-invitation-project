# Recuperação administrativa — publicação e homologação UAT

> Registro histórico. As pendências e autorizações descrevem o checkpoint
> indicado, sem substituir a operação vigente. [Estado atual](../development_roadmap.md#estado-atual)
> e [índice de evidências](../README.md#evidências-históricas).

## Estado em 25/10/2026

**Versão atual publicada em UAT: `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`.**
O refinamento visual foi publicado com sucesso; a inspeção do estado normal do
login e dos arquivos publicados foi concluída. O novo estado de sucesso tem
cobertura automatizada, sem nova recuperação ou troca real neste ciclo.

**Publicação e validação funcional da versão UAT `ed5f7c9` concluídas.**
Solicitação, recebimento, callback, submissão humana, sucesso persistente e
retorno pelo link foram verificados na versão publicada. O responsável confirmou
pela interface a rejeição da senha anterior, a autenticação com a atual e a
abertura do **Painel de administração UAT**. O agente verificou separadamente
UUID preservado e bloqueio do acesso direto e do link reutilizado.

O dashboard nesse login foi confirmado pelo responsável; não se atribui essa
observação ao agente, cuja conferência posterior encontrou a aba já sem sessão.
O refinamento visual posterior compõe esta nova entrega, com testes automatizados,
sem integrar o aceite funcional anterior de ed5f7c9. A publicação e os limites
da inspeção desta atualização são registrados separadamente abaixo. PRD não foi
promovido ou configurado.

## Primeira versão e publicação — ed5f7c9

- Entrega: `ed5f7c9c99dfa269607c5628e5514ca703b75217`,
  `feat(admin): add secure password recovery flow`.
- Checkout inicial limpo em `feature/landing-page`, sem commits posteriores à
  entrega. Após fetch, `origin/staging` era ancestral da entrega (`0 2`);
  `origin/production` estava em `09267d1188d26e95a2295897da6695a20a1e6b27`.
- Push da feature para CI; depois fast-forward e push exclusivo de `staging`
  para o mesmo SHA. A branch local staging estava desatualizada e foi avançada
  sem reset, force ou reescrita. Nenhum commit novo foi criado naquele primeiro
  ciclo de publicação.
- Gatilhos conferidos: `test.yml` em push; `deploy-pages.yml` somente staging,
  com validação do mesmo SHA. `vercel.json` desabilita deployments das branches
  feature/landing-page e staging; production não foi movimentada.
- [CI feature 40199872917](https://github.com/bispoID/wedding-invitation-project/actions/runs/40199872917),
  [CI staging 40199947460](https://github.com/bispoID/wedding-invitation-project/actions/runs/40199947460)
  e [Pages 40199947457](https://github.com/bispoID/wedding-invitation-project/actions/runs/40199947457): success.
- Logs do job validate do Pages: **411 Node, 150 Deno**, sintaxe de **33 JS** e
  whitespace aprovados. Não se repetiu a suíte local já aprovada.
- Artefato CI `github-pages`, ID `12601277635`, SHA-256 do arquivo
  `06578105c220c58243b4882351cb0e7d09d4b6d6dc58a1391b810e06afdddb5c`.
  Os **75 arquivos** publicados coincidem por SHA-256 com o artefato extraído.
- Runtime publicado: appEnv=uat, projectRef=`eugvobtvjicvocttnkka`, buildId igual
  ao SHA completo e base `https://bispoid.github.io/wedding-invitation-project/`.
  A referência remota production foi conferida e permaneceu no SHA anterior.

URL de entrada: [login UAT](https://bispoid.github.io/wedding-invitation-project/admin/login.html).
Evidência privada sanitizada da comparação: `.dev/qa/uat-password-recovery/published-audit.json`.
Artefatos, credenciais e e-mails não integram o versionamento.

## Auth UAT conferido e ajustes aplicados

- Projeto confirmado no Dashboard: wedding-invitation-project-uat,
  ref `eugvobtvjicvocttnkka`. O rótulo main/PRODUCTION do ramo interno Supabase
  pertence a esse projeto UAT; não é o projeto PRD da aplicação.
- Administrador existente: UUID `593275a5-decb-4948-83fa-f1d802c99f26`.
  O digest do secret remoto `ADMIN_AUTH_USER_IDS` corresponde a esse UUID.
  Nenhum valor de secret foi registrado ou alterado.
- O e-mail sintético anterior não recebia mensagens. A caixa controlada indicada
  pelo responsável foi associada e confirmada no mesmo usuário via Auth Admin
  API UAT; UUID preservado, sem recriar conta, alterar senha ou ampliar allowlist.
  O endereço pessoal não é registrado nesta documentação pública.
- Site URL já correto e preservado:
  `https://bispoid.github.io/wedding-invitation-project/`.
- Redirect inicialmente ausente. Após confirmação específica do responsável,
  foi incluída somente a URL exata
  `https://bispoid.github.io/wedding-invitation-project/admin/reset-password.html`.
  Salvamento confirmado no Dashboard, sem wildcard ou destino PRD.
- Provider Email habilitado; cadastro público e login anônimo desabilitados.
  Secure email change habilitado; secure password change e exigência de senha
  atual desabilitados, preservados. Expiração Email OTP/link: **3600 segundos**.
  A ferramenta ocultou o valor numérico do mínimo de senha e o limite de e-mails;
  não se infere seu valor pelo mínimo de 6 exibido no frontend.
- SMTP customizado desativado, serviço padrão Supabase mantido. Template Reset
  password padrão conferido com `{{ .ConfirmationURL }}`. Sem contratação ou
  substituição de provedor/template. A entrega à caixa autorizada foi comprovada
  pelo e-mail real recebido; isso não atesta entregabilidade universal.
- Bootstrap, base e projeto conferidos no runtime/artefato. Namespace de sessão
  derivado do contrato: `invitation-v1-uat-eugvobtvjicvocttnkka-auth`.
  Nenhuma sessão ou credencial DEV/PRD foi transferida.

## Verificações reais e aceite

| Etapa | Resultado |
| --- | --- |
| Acesso direto ao callback publicado | Rejeitado; formulário oculto e orientação para solicitar outro link. |
| Solicitação na interface publicada | Executada para o administrador com a caixa autorizada; mensagem neutra exibida. |
| Recebimento do e-mail | Confirmado pelo Gmail; mensagem Reset your password, remetente Supabase Auth. |
| Link recebido | Inspeção sanitizada confirmou host Auth UAT, caminho /auth/v1/verify, type=recovery e redirect_to exato; token e URL completa não registrados. |
| Callback real | URL limpa, formulário liberado, foco no campo de nova senha e mensagem Link validado. |
| Submissão da nova senha | Executada pelo responsável no navegador UAT; confirmada pelo relato e pelo estado real posterior. |
| Sucesso persistente e Ir para o login | Observados no navegador após a troca e novamente antes de seguir o link. Formulário oculto, confirmação persistente e link visível; retorno explícito ao login com aviso aprovado. |
| Senha anterior rejeitada | Confirmada pelo responsável após a troca, pela interface UAT; não repetida pelo agente. |
| Nova senha autenticando | Confirmada pelo responsável pela interface UAT; nenhuma credencial enviada ao chat. |
| Dashboard após o novo login | Responsável confirmou explicitamente que o Painel de administração UAT abriu com a nova senha. A conferência posterior do agente encontrou a aba já sem sessão; a evidência desse login é humana. |
| UUID após a troca | Conferência somente leitura do Auth Admin UAT confirmou o mesmo UUID e o e-mail autorizado após a troca. |
| Link reutilizado | Tentativa real manteve o formulário bloqueado e exibiu orientação para solicitar outro link; URL limpa. A mensagem foi genérica de validação/conexão, não se atribui a ela um código HTTP não observado. |

A ferramenta exige entrada e submissão humanas de novas credenciais. Nenhuma
atualização direta de senha pelo SDK/Admin API substitui esse teste. Não capturar
campos preenchidos, tokens, sessões ou links completos em screenshots/relatórios.
Os dois testes de senha e a exibição do dashboard foram confirmados pelo
responsável, encerrando o aceite funcional da versão publicada. Não é necessária
outra troca de senha.
O aviso persistente, o retorno, o UUID e o bloqueio do reuso já foram verificados.
Credenciais UAT devem continuar privadas e distintas do `.dev/admin.json` local.

## Refinamento visual final — nova entrega UAT

O responsável observou que a orientação de criação de senha continuava junto ao
resultado e pediu remover o complemento de sucesso sobre sessão/login. A
atualização oculta `reset-description` após confirmação real de updateUser e reduz
as confirmações normais da página e do login a **Senha alterada com sucesso.**
Erros de logout continuam separados e informativos. O retorno explícito é mantido.

Esse refinamento **não integra a versão ed5f7c9 já homologada**. Foi incluído no
commit `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`,
`fix(admin): refine password recovery success feedback`, com 11 arquivos
(implementação, testes e documentação consolidada). Regressões DOM atualizadas,
**411 testes locais**, sintaxe dos quatro JS/MJS envolvidos e `git diff --check` aprovados. Não se repetiu
outra troca de senha para esse ajuste. O sucesso persistente da versão publicada
foi observado realmente; o texto simplificado e a ocultação da orientação foram
validados automaticamente nesta atualização.

### Publicação e verificação de bf35bc2

- Working tree limpo após commit; staging explícito dos 11 arquivos, staged diff
  revisado e `git diff --cached --check` aprovado. Nenhum arquivo privado ou
  segredo real identificado. `.dev/admin.json` e dev-config.json seguem ignorados.
- As validações locais anteriores foram reaproveitadas: não houve nova mudança
  de código neste ciclo. Push da feature, CI do SHA exato aprovado, promoção de
  staging por fast-forward de ed5f7c9 para bf35bc2 e push somente de staging.
- [CI feature 40204682771](https://github.com/bispoID/wedding-invitation-project/actions/runs/40204682771),
  [CI staging 40204737563](https://github.com/bispoID/wedding-invitation-project/actions/runs/40204737563)
  e [Pages 40204737681](https://github.com/bispoID/wedding-invitation-project/actions/runs/40204737681):
  completed/success. Job validate do Pages confirmou **411 Node, 150 Deno**,
  sintaxe de **33 JS** e whitespace aprovados.
- Artefato `github-pages` ID `12603671041`, SHA-256
  `6c08d94acb4768beeddd4f5269aa5ac5515b23e0fe3316c268a94c11dc9bcefc`.
  Os **75 arquivos** publicados corresponderam byte a byte ao artefato CI. Os
  quatro recursos diretamente envolvidos no feedback também coincidem com os
  blobs do commit; a comparação usa Git, evitando a conversão CRLF do checkout.
- Runtime público 200: appEnv=uat, projectRef=`eugvobtvjicvocttnkka`, base Pages
  correta e buildId=`bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`.
  Feature e staging remotas no mesmo SHA. Production permanece em
  `09267d1188d26e95a2295897da6695a20a1e6b27`.
- Navegador real: login da versão publicada carregou com formulário e foco no
  e-mail. O aviso de sucesso da navegação anterior já não estava disponível.
  Não se inseriu parâmetro de sucesso, sessão, evento Auth ou mutação do DOM para
  fabricar esse estado. Nenhum e-mail de recuperação foi solicitado e nenhuma
  senha foi alterada neste ciclo.
- **Limitação visual:** a ocultação da orientação, a frase curta de sucesso e a
  permanência de Ir para o login foram verificadas pelos testes DOM e pelos
  recursos publicados, sem nova observação do estado de sucesso em UAT. Esse
  estado depende de uma atualização de senha confirmada; não foi repetida apenas
  para conferir textos. O E2E funcional de ed5f7c9 permanece como evidência anterior,
  sem ser reatribuído ao novo SHA.
- Evidências privadas sanitizadas, fora do commit:
  `.dev/qa/uat-password-feedback/published-audit.json` e
  `.dev/qa/uat-password-feedback/login-published.png`.
- Retorno ao checkout feature/landing-page após a promoção. Apenas este registro
  e o status correspondente no roadmap foram atualizados após o commit e ficaram
  locais para revisão, sem segundo commit automático naquele ciclo. A consolidação
  documental posterior recebeu autorização explícita para commit local.

## Limites e preservação

Configuração e recursos PRD não foram consultados ou alterados. A conferência da
referência Git production não envolveu o frontend ou Auth PRD. Nenhuma Function,
migration, política de banco, Google Sheets ou configuração SMTP foi modificada.
O ciclo de publicação de bf35bc2 autorizou o commit e a publicação do ajuste,
testes e documentação consolidada. As evidências acrescentadas após aquele commit
foram revisadas neste encerramento documental; seu commit local não publica uma
nova versão em UAT ou PRD. O plano PRD é uma preparação separada, somente leitura.

Procedimento: [ambientes](../environments.md). Histórico da entrega e aceite DEV:
[validação DEV](password-recovery-dev-validation.md).
