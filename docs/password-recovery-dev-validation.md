# Recuperação administrativa — validação DEV

## Conclusão em 25/10/2026

**Implementação e validação funcional DEV concluídas.** Configuração, publicação
e homologação UAT/PRD permanecem pendentes de autorização e execução separadas.

Checkout revisado: `feature/landing-page`, HEAD
`837f4e883089589820c783d7b080afa9a3429673`. A revisão final abrangeu o diff
completo, inclusive arquivos novos, integração ao login/bootstrap, allowlist de
publicação, Auth local, testes e documentação. Não encontrou outro defeito
concreto de funcionamento ou segurança; corrigiu referências documentais a
pendências DEV já resolvidas e removeu checkpoints contraditórios.
Sem commit, push, merge, deploy, alteração remota ou teste UAT/PRD neste ciclo.

## Evidências e limites

| Camada | Resultado |
| --- | --- |
| Navegador DEV / Auth local / Mailpit | Solicitação, recebimento, callback e formulário real verificados. O responsável digitou e submeteu a nova senha e confirmou a troca. O agente verificou pela interface a rejeição da senha anterior e o login com a nova, chegando ao dashboard DEV. |
| Identidade e credencial local | UUID preservado; responsável sincronizou privadamente `.dev/admin.json`. Conferência adicional no Auth local confirmou credencial válida e UUID, sem outra alteração de senha. |
| Alternância do cartão | Login → recuperação → login, e-mail compartilhado, foco e teclado e tela móvel verificados no navegador DEV no ciclo de implementação; ocultação com hidden/inert e mensagens próprias também cobertas por testes DOM. Não equivale a homologação com leitor de tela real. |
| Último ajuste de apresentação | Após a troca real, foi removido o retorno automático sem aviso perceptível. A confirmação persistente **Senha alterada com sucesso**, com link focado **Ir para o login**, foi validada por testes automatizados do DOM. Não houve outra troca real após esse ajuste; não se declara esse detalhe visual homologado por nova submissão real. |
| Automatizados recentes | `npm run test`: **411 aprovados**, zero falhas/cancelamentos/skips; inclui **34 testes de recuperação**. Sintaxe dos JS/MJS alterados/adicionados aprovada. Resultados reaproveitados na revisão final, pois somente documentação mudou. |
| Revisão final | `git diff --check` executado novamente; inspeção dos arquivos versionáveis e verificação privada da credencial local, sem expor valores. Fixtures sintéticas de teste não são credenciais reais. |

Os testes diretos no SDK realizados no primeiro checkpoint não substituem a
submissão real posterior pela interface. O trace HTTP dessa submissão manual não
foi preservado; não se atribui um status HTTP observado à tentativa histórica.
Deno/SQL não foram repetidos: nenhuma Function, migration, RPC ou política de
banco mudou. Não se repetiu outra troca real apenas para revisar o aviso visual.

### Causa reproduzida e evidências

O observador anterior apagava a prova de recuperação em **qualquer** `SIGNED_IN`.
Na versão efetiva `@supabase/supabase-js` / `auth-js` **2.117.2**, esse evento também
é uma renotificação da sessão existente. `_recoverAndRefresh` o emite quando
recupera a sessão armazenada; `_onVisibilityChanged(false)` chama esse caminho
quando a aba volta à visibilidade. A notificação pode também vir de outra aba
via BroadcastChannel. Não significa necessariamente novo login.

Fonte conferida na cópia local da mesma versão e no
[código oficial 2.117.2](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueClient.ts).

Reprodução real com novo e-mail Mailpit e frontend local temporário na porta
**5500**, já permitida no Auth DEV. O servidor diagnóstico em `.dev/qa/` serve
somente o frontend local e adiciona uma saída DOM oculta com fases, nomes de
eventos, códigos de erro e comparações booleanas. Não captura credenciais, IDs,
tokens, corpos de requisições ou URLs de recuperação.

Sequência observada **antes da correção**, sem recarregar o callback:

```text
PASSWORD_RECOVERY: sameSession=true, allowed=true
getSession: error=false, allowed=true
abertura de outra página Auth da mesma origem
SIGNED_IN: sameSession=true, allowed=false
```

Após o novo callback, a sequência foi repetida **com a correção**:

```text
PASSWORD_RECOVERY: sameSession=true, allowed=true
getSession: error=false, allowed=true
SIGNED_IN: sameSession=true, allowed=true
SIGNED_IN: sameSession=true, allowed=true
```

O teste de regressão da submissão confirmou o efeito: antes da correção,
`PASSWORD_RECOVERY → SIGNED_IN da mesma sessão → submit` retornava `expired`,
**antes de chamar updateUser**; após a correção chama updateUser uma vez e
conclui o caminho de sucesso com doubles. O teste foi executado primeiro com a
implementação antiga e falhou (`expired` em vez de `success`), depois passou.
Isso comprova a causa do bug reproduzido; o teste manual histórico não estava
instrumentado, portanto não permite afirmar o resultado HTTP daquela tentativa.

Artefatos sanitizados ignorados: `.dev/qa/recovery-before-trace.json`,
`.dev/qa/recovery-after-trace.json`, `.dev/qa/recovery-regression-before.log`.

| Hipótese | Evidência / limite |
| --- | --- |
| Navegação/reload involuntário | Não observado na reprodução até o formulário. O handler chama preventDefault sincronamente; regressão DOM o confirma. A submissão manual histórica não foi capturada. Os handlers agora são instalados antes de liberar o formulário. |
| updateUser chamado e resultado real | No teste automatizado da falha antiga, zero chamadas; a prova já havia sido apagada antes do envio. Após a correção o responsável confirmou troca bem-sucedida pelo navegador; o agente confirmou que a senha anterior é rejeitada no formulário. O trace HTTP da submissão manual não foi preservado após a navegação, portanto não se atribui um código HTTP observado a essa tentativa. |
| Momento do erro | No caminho reproduzido, o controlador retorna expired ao verificar a prova, antes da requisição de atualização e antes do logout. Não é timeout de updateUser. |
| Timer tardio | A página só aguarda o setTimeout(0) de inicialização e o evento inicial do SDK antes de liberar o formulário; não há timer próprio de expiração ou timeout de atualização. Não foi introduzido deadline que possa substituir sucesso por erro. |
| Listeners duplicados | Um cliente compartilhado e um observador da aplicação por página. O diagnóstico adiciona intencionalmente um observador síncrono extra, só no servidor temporário. O evento real é uma renotificação do SDK, não evidência de handler submit duplicado. |
| Callback Auth bloqueante | O observador permanece síncrono, sem await ou chamada Auth dentro dele. Comparações de identidade e registro sanitizado não fazem requisições. |

### Correção aplicada

- A prova continua exigindo o evento PASSWORD_RECOVERY correspondente ao token
  do callback validado pelo SDK. Passa a comparar usuário e **identidade da
  sessão**, preservando notificações da mesma sessão e renovação de token.
  Outra sessão (inclusive do mesmo UUID) ou logout invalidam a prova.
- Acesso direto, parâmetro isolado, sessão anterior sem recovery, link inválido
  e reload continuam recusados. Não há prova de recuperação persistida.
- `updateUser({ password })` é aguardado; sucesso exige resposta do usuário
  esperado. A interface apresenta **Senha alterada com sucesso** imediatamente
  após essa confirmação e então aguarda `signOut({ scope: 'local' })`.
- Após o responsável relatar sucesso da troca, mas retorno sem aviso perceptível,
  o redirecionamento imediato foi removido: o resultado positivo permanece na
  página e o link **Ir para o login** recebe foco e descreve a confirmação.
  O retorno é explícito, sem timer. O login também recebe o aviso informativo.
- Falha de logout mantém o sucesso da senha e oferece retry só de logout.
  Resultado de sucesso terminal não volta a expired por eventos posteriores.
- Rede/5xx após iniciar updateUser produz **resultado não confirmado**, sem
  afirmar falha da troca e sem reenviar automaticamente. Falha de comunicação
  antes de enviar, rejeição explícita de senha e expiração são distintas.
- Dupla submissão é bloqueada; os campos são limpos após confirmação ou resultado
  não confirmado. O link de retorno fica oculto durante a operação pendente.
- `npm run test` foi adicionado como alias da seleção canônica `test:node`.

## Arquivos que compõem o commit

Todos os 23 arquivos abaixo pertencem ao escopo; credenciais, configuração DEV
gerada e artefatos privados de diagnóstico ficam fora do versionamento.

| Grupo | Arquivos |
| --- | --- |
| Solicitação/login | `invite-app/admin/login.html`, `invite-app/admin/styles/login.css`, `invite-app/admin/scripts/main.js`, `invite-app/admin/scripts/recovery-request.js` |
| Auth e regras | `invite-app/admin/scripts/auth.js`, `invite-app/admin/scripts/supabase.js`, `invite-app/admin/scripts/password-recovery.js` |
| Callback | `invite-app/admin/reset-password.html`, `invite-app/admin/scripts/reset-password.js`, `invite-app/scripts/shared/bootstrap.js` |
| Publicação/Auth local | `config/public-assets.json`, `supabase/config.toml` |
| Testes | `scripts/password-recovery.test.mjs`, `scripts/app-config.test.mjs`, `scripts/admin-block3.test.mjs`, `scripts/pages-uat.test.mjs`, `package.json` |
| Documentação | este registro, `docs/admin-guest-management.md`, `docs/local-development.md`, `docs/environments.md`, `docs/testing-strategy.md`, `docs/development_roadmap.md` |

## Próximas atividades — UAT e depois PRD

1. Sob autorização separada, publicar os recursos no ambiente correto e conferir
   APP_ENV, projeto e base/callback exatos, sem compartilhar sessões ou credenciais.
2. Configurar/conferir provider Email, Site URL e redirect permitido, SMTP,
   remetente/domínio, destinatário administrativo autorizado, template oficial,
   expiração, política de senha e rate limits. Não habilitar cadastro público.
3. Homologar envio → e-mail → callback → troca → confirmação persistente → logout
   local → login, rejeição da senha antiga e preservação do UUID. Conferir também
   links inválidos/reutilizados, reload, sessão diferente, rede e falha de logout.
4. Registrar evidências sanitizadas e aceite UAT antes de planejar promoção PRD.
   A contingência manual via Auth Admin API continua não validada operacionalmente.

URLs exatas e pré-requisitos:
[guia administrativo](admin-guest-management.md#pré-requisitos-posteriores-em-uat-e-prd).
Nenhuma configuração ou homologação remota foi realizada neste ciclo.

Mensagem sugerida: `feat(admin): add secure password recovery flow`.
