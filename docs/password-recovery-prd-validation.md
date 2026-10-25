# Recuperação administrativa — publicação e validação PRD

## Estado em 25/10/2026

**Promoção, publicação e aceite funcional PRD concluídos.**
Versão publicada: `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`.
O administrador realizou a troca pela interface e confirmou o resultado da
etapa preparada, a rejeição da senha anterior e a autenticação com a nova.
UUID/e-mail preservados e bloqueio de reuso foram conferidos pelo agente.
O responsável confirmou também que o novo login abriu o Painel de administração
PRD e carregou a lista de convidados. Essa confirmação é evidência humana; na
conferência posterior do agente, a aba já estava no login. Não se repetiu a troca.
Nenhuma credencial é registrada neste documento.

## Candidato, Git e publicação

- Checkout inicial limpo em feature/landing-page, HEAD documental local
  `9e3ad34ebf2f803ee36ccf292f80bdf65d6e8b24`, preservado e não publicado.
- Após fetch, production remota estava em
  `09267d1188d26e95a2295897da6695a20a1e6b27`; staging e feature remotas em
  `bf35bc2e485a9ae9731ed2d1319c7e924cdfb2fb`. Ancestralidade `0 3`, sem divergência.
- Intervalo aprovado confirmado: `837f4e8` (consolidação documental), `ed5f7c9`
  (recuperação) e `bf35bc2` (feedback). Total: 40 arquivos. Nenhuma alteração de
  Functions, migrations, workflows ou vercel.json nesse intervalo.
- Production avançada por fast-forward ao SHA exato aprovado e push exclusivo
  dessa branch. Sem reset, force, merge commit ou inclusão de 9e3ad34. Nenhum
  deploy de Functions ou migrations. Retorno posterior à feature preservada.
- O check obrigatório do candidato estava aprovado antes do push. O push em
  production acionou o CI e a integração Git Vercel, conforme o procedimento;
  Pages permaneceu restrito a staging.
- [CI production 40216876597](https://github.com/bispoID/wedding-invitation-project/actions/runs/40216876597):
  completed/success. Logs confirmaram **411 Node, 150 Deno**, sintaxe de **33 JS**
  e whitespace aprovados. Não se repetiram testes locais sem mudança de código.
- Deployment Git Vercel **`dpl_VhUcj8Lvq56JTxFYgwgyxLCeN8Kr`**, READY, target
  production, branch production e SHA exato; domínio oficial associado sem erro.
- [Frontend PRD](https://bruna-e-diego.vercel.app/) e
  [login PRD](https://bruna-e-diego.vercel.app/admin/login.html).
- Runtime público HTTP 200: appEnv=prd, projectRef=`bkkienyemqlkueygknzl`,
  supabaseUrl PRD, publicSiteUrl canônica e buildId igual ao SHA aprovado.
- **75 recursos públicos** HTTP 200; **73 arquivos estáticos** corresponderam aos
  blobs do candidato. Runtime validado separadamente; index gerado conferido com
  domínio PRD e sem destino Pages/markers não resolvidos. Strings de validação
  multiambiente no fonte não são destinos operacionais UAT.

Evidência sanitizada ignorada: `.dev/qa/prd-password-recovery/published-audit.json`.

## Auth PRD — conferências e alterações mínimas

- Projeto confirmado no Dashboard: wedding-invitation-project,
  ref `bkkienyemqlkueygknzl`, distinto do UAT. Duas contas existentes; a conta
  utilizada foi identificada pelo login real do responsável, painel visível e
  listagem carregada sem erro. A autorização foi comprovada funcionalmente;
  nenhum secret de allowlist foi alterado.
- UUID e e-mail da conta escolhida conferidos por leitura da Auth Admin API;
  conta confirmada, sem recriar usuário ou alterar sua identidade. A comparação
  posterior confirmou UUID e e-mail preservados por comparação com a evidência
  privada sanitizada de identidade anterior à troca.
  O endereço pessoal e o UUID integral não são necessários neste relatório.
- **Alteração 1:** Site URL de `http://localhost:3000` para
  `https://bruna-e-diego.vercel.app/`.
- **Alteração 2:** allowlist de redirects inicialmente vazia recebeu apenas
  `https://bruna-e-diego.vercel.app/admin/reset-password.html`, sem wildcard.
  Os dois ajustes receberam confirmação específica do responsável no momento
  da ação e foram conferidos após salvar.
- Provider Email habilitado. Cadastro público e login anônimo desabilitados;
  secure email change habilitado; secure password change, exigência de senha
  atual e proteção de senhas vazadas desabilitados. Estado existente preservado.
- Expiração Email OTP/link: **3600 segundos**; comprimento OTP: **8 dígitos**.
  A ferramenta ocultou o mínimo numérico de senha e o limite de e-mails/h;
  não se infere seu valor pelo mínimo de 6 do formulário. Limites e políticas
  não foram enfraquecidos ou modificados.
- SMTP customizado desativado; serviço padrão Supabase e template padrão Reset
  password com `{{ .ConfirmationURL }}` preservados. Nenhuma contratação.
  A entrega real chegou à caixa do administrador, remetente Supabase Auth
  `noreply@mail.app.supabase.io`; não se presume entregabilidade universal.
- Sessões/credenciais não foram copiadas entre ambientes. Nenhuma credencial
  PRD foi gravada em `.dev/admin.json` ou em arquivo destinado ao versionamento.

## Verificações reais

| Etapa | Resultado |
| --- | --- |
| Login anterior à recuperação | Responsável confirmou painel/lista corretos. Agente observou dashboard liberado, listagem sem loading/erro e identificou a conta existente. |
| Acesso direto à redefinição | Rejeitado mesmo com sessão anterior; formulário oculto, mensagem de link inválido/expirado e URL limpa. |
| Solicitação pela interface PRD | Uma solicitação ao administrador identificado; mensagem neutra exibida. |
| Recebimento | Confirmado na caixa controlada via Gmail; sem alteração de SMTP/template. |
| Destino do link | Host Auth PRD, /auth/v1/verify, type=recovery e callback exato conferidos sem registrar token ou URL completa. E-mails UAT da mesma conversa não foram usados. |
| Callback legítimo | URL limpa, formulário liberado, foco em Nova senha e mensagem Link validado. |
| Troca manual e feedback simplificado | Responsável respondeu “funcionou” à etapa que solicitava conferir “Senha alterada com sucesso.”, sem orientação de tamanho e com “Ir para o login”. Evidência humana; o agente não recapturou esse estado após a navegação. |
| Retorno e testes das senhas | Responsável confirmou senha anterior bloqueada e nova senha validada, após a troca pela interface. |
| Dashboard após o novo login | Responsável confirmou que o Painel de administração PRD abriu e carregou a lista de convidados com a nova senha. Evidência humana; o painel/lista anterior à troca foi observado pelo agente. |
| UUID/e-mail após troca | Preservados, por leitura da Auth Admin API e comparação sanitizada antes/depois. |
| Reuso do link consumido | Rejeitado em outra aba: formulário oculto, URL limpa e mensagem de impossibilidade de validar o link. Não se atribui um código de erro específico a essa mensagem genérica. |

A entrada, confirmação e submissão da nova senha foram humanas, no formulário
legítimo. Não houve atualização direta por SDK/Admin API para substituir a
interface. A leitura administrativa posterior verificou somente a identidade.
Não foram capturados campos preenchidos, sessões, tokens ou links completos;
o link temporário mantido em memória foi descartado após o teste de reuso.
Evidências privadas ignoradas: `identity-before.json`, `identity-after.json` e
`reuse-rejected.png`, sob `.dev/qa/prd-password-recovery/`.

## Cobertura e limitações

O refinamento visual tinha cobertura automatizada em DEV/UAT, sem outra troca
real nesses ambientes após o ajuste. Em PRD, a troca real foi feita no candidato
`bf35bc2`; a confirmação do resultado visual é humana. Não se repete a troca
apenas para obter uma captura. Os resultados automatizados são os do CI acima;
as conferências reais e suas fontes estão discriminadas na tabela.

O mínimo numérico da política de senha e o limite de e-mails/h permaneceram
ocultos pela ferramenta. A entrega efetiva foi verificada para a conta testada,
sem contratação ou mudança do serviço existente. Isso limita a inspeção dos
valores, não substitui nem invalida os testes reais registrados.

## Rollback

Referência anterior conferida antes da publicação: deployment
`dpl_7wXbLSv8F8DjzasFubCoasRDgvJU`, SHA
`09267d1188d26e95a2295897da6695a20a1e6b27`, READY, target production e domínio
oficial associado. Runtime anterior confirmou esse SHA.

O mecanismo Instant Rollback estava disponível. A inspeção do diálogo foi
somente leitura, sem Continue ou Confirm Rollback. Após a publicação, o diálogo
mostrou explicitamente o novo deployment como Current e **esse mesmo deployment
anterior como Previous/elegível**, compatível com o plano Hobby. Nenhuma reversão
foi executada; não foi observada regressão que a justificasse.

Se uma regressão comprometer acesso/funcionamento, a autorização cobre restaurar
esse alvo pelo mecanismo Vercel e conferir domínio/runtime. Não desfazer Auth ou
senha automaticamente; rollback de frontend não restaura esses estados. Não
usar reset/force no Git. Após rollback, conferir a política de atribuição automática
de domínios antes de qualquer publicação seguinte.

Referência oficial: [Instant Rollback](https://vercel.com/docs/instant-rollback).
Evidência privada sanitizada: `.dev/qa/prd-password-recovery/rollback-eligible.png`.

## Encerramento documental

O encerramento documental abrange este registro, administração, roadmap,
ambientes e QA final, em commit local autorizado na feature, sem push ou nova
publicação. O commit documental 9e3ad34 permanece como ancestral preservado na
feature, separado do candidato publicado. Production permanece em bf35bc2.
O aceite UAT anterior não é reatribuído como teste PRD. Não foram repetidos
testes funcionais ou troca de senha durante esta revisão documental.
