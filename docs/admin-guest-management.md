# Administração de convidados

O administrador autentica sua própria conta pelo Supabase Auth. A autenticação
confirma a identidade do usuário, mas não concede, por si só, autorização
administrativa na aplicação.

O dashboard lista os registros de `public.guests` pela Edge Function
`admin-list-guests`. A função valida o JWT e compara o UUID autenticado com a
lista `ADMIN_AUTH_USER_IDS` antes de consultar os dados com `service_role`. O
cliente do navegador não tem permissão de leitura direta nessa tabela.

A listagem paginada e a pesquisa são executadas no servidor. O navegador recebe
somente a página solicitada e os indicadores agregados globais; o endpoint não
carrega a tabela completa no cliente.

As operações de criação manual, edição e exclusão passam pela Edge Function
`admin-manage-guests`; listagem e recuperação da contingência também verificam a
mesma lista compartilhada no backend. Cada função valida o JWT e rejeita
usuários cujo UUID não esteja autorizado.

## Autorização administrativa

As Edge Functions administrativas `admin-list-guests`,
`admin-list-contingency`, `admin-manage-guests`, `admin-recover-contingency` e
`admin-manage-event-config` exigem JWT válido (`verify_jwt=true`) e verificam a
autorização exclusivamente no backend. Cada função compara o UUID do usuário
validado com a lista de UUIDs mantida no secret `ADMIN_AUTH_USER_IDS`, separados
por vírgulas. O backend remove espaços, normaliza maiúsculas e minúsculas e
rejeita configuração ausente ou inválida. Um JWT válido sozinho não concede
permissão administrativa: usuário autenticado cujo UUID não esteja na lista
recebe HTTP 403. O frontend não decide quem é administrador nem recebe essa
lista.

Cada administrador possui sua própria conta do Supabase Auth. Na configuração
PRD registrada, Email Provider está habilitado, confirmação de e-mail é exigida
e cadastro público está desabilitado. Um registro anterior indicava mínimo de
oito caracteres; na conferência de 25/10/2026, a ferramenta ocultou esse valor,
sem nova aferição numérica ou alteração da política de senha.
A proteção contra senhas vazadas estava indisponível no plano inspecionado;
políticas remotas devem ser conferidas quando forem alteradas, não inferidas do
config.toml local. Convidados que enviam RSVP não possuem conta Auth.

Novos administradores são criados manualmente pelo proprietário no Supabase
Dashboard e, em seguida, seus UUIDs são incluídos em `ADMIN_AUTH_USER_IDS`.
A autorização na aplicação é independente do acesso ao Dashboard/projeto
Supabase: ser administrador da aplicação não concede automaticamente acesso
administrativo ao projeto Supabase, e esse acesso deve ser gerenciado
separadamente.

O modelo histórico utilizava o secret singular `ADMIN_AUTH_USER_ID`; ele foi
substituído por `ADMIN_AUTH_USER_IDS` e não é mais usado como mecanismo de
autorização.

`service_role` permanece exclusivamente no backend e nunca é entregue ao
navegador. A função atualiza somente
`name`, `email`, `attendance` e `companions`, por UUID, e exclui somente o UUID
solicitado. E-mails são normalizados com trim e lowercase. A constraint
`UNIQUE(email)` rejeita duplicidade sem alterar o registro existente.

A edição valida os campos no frontend e novamente no backend. A constraint
`guests_absent_without_companions` no banco garante que `attendance=false`
sempre implique `companions=0`. Grants de UPDATE (somente nas quatro colunas
editáveis) e DELETE são usados somente por `service_role`. Não há policies
`public.guests` para `anon` ou `authenticated`, e esses roles não têm
privilégios de leitura ou mutação na tabela. O privilégio de TRUNCATE também
foi removido de `service_role`, `PUBLIC`, `anon` e `authenticated`.

## Criação de convidados e configuração do evento

`admin-manage-guests` mantém POST/update/delete e acrescenta
`{action:"create",guest:{name,email,attendance,companions}}`.
Criação exige a mesma autenticação, allowlist e origem; rejeita campos extras,
id e timestamps; usa defaults do banco, retorna 201/created/id ou 409 por
email duplicado. Não usa fallback Sheets nem o rate limiting público.
Nome/e-mail têm limites 200/320, trim/lowercase; presença é boolean e
acompanhantes inteiro 0–15, normalizados para zero na ausência.
Validação compartilhada também atende RSVP e recuperação.

O painel reutiliza o diálogo para criar/editar, desabilita controles durante
envio e atualiza listagem/métricas depois da confirmação backend. A configuração
do evento usa seção independente, GET/PUT e 14 campos completos; consulte
[event-config.md](event-config.md) para contratos, segurança e pré-requisitos.
Links do convite/previews derivam de APP_BASE_URL sem host/subpath fixo.
Recuperação atualiza listas sem refresh geral que descarte edições do evento.

## Pesquisa, paginação e contrato da listagem

O painel exibe a pesquisa acima da tabela com o placeholder `Pesquisar por nome
ou e-mail...`. O termo é aplicado a `name` e `email` com comparação
case-insensitive, preservando Unicode, e a consulta é disparada 300 ms após a
última digitação. O termo é enviado como parâmetro, não como trecho de SQL ou
filtro montado pelo usuário; `%`, `_` e `\\` são tratados como texto literal na
função SQL. Uma pesquisa nova retorna à primeira página. Respostas de uma
consulta anterior são descartadas quando uma consulta mais recente já foi
iniciada. Durante uma nova consulta, a tabela e os indicadores confirmados
permanecem estáveis até a resposta; estados vazios aguardam a nova resposta
antes de exibir novamente a mensagem de vazio.

A página padrão tem 10 registros. Os tamanhos permitidos são 10, 20 e 50. A
interface informa a faixa exibida, a quantidade total encontrada e as páginas,
desabilitando `Anterior`/`Próxima` nos limites. O backend rejeita página fora de
`1..100000`, tamanhos diferentes de 10/20/50 e termos com mais de 320 caracteres.
A ordenação é determinística por `created_at DESC, id DESC`.

Uma chamada paginada usa `GET /functions/v1/admin-list-guests?page=1&page_size=10`
e pode incluir `search`. A resposta mantém `success` e `records` e acrescenta
`pagination` e `metrics`.
Respostas de dados e erros administrativos usam `Cache-Control: private,
no-store`; o preflight `OPTIONS` mantém seu cache CORS separado:

```json
{
  "success": true,
  "records": [],
  "pagination": {
    "page": 1,
    "page_size": 10,
    "total": 47,
    "total_pages": 5
  },
  "metrics": {
    "totalGuests": 47,
    "confirmedGuests": 32,
    "declinedGuests": 15,
    "totalCompanions": 21,
    "confirmedPeople": 53
  }
}
```

Os cinco indicadores são calculados pela RPC protegida
`public.admin_list_guests` diretamente sobre `public.guests`, sem depender do
filtro ou da página visível:

- **Total de convidados:** número total de registros.
- **Confirmados:** registros com `attendance=true`.
- **Não poderão comparecer:** registros com `attendance=false`.
- **Total de acompanhantes:** soma de `companions` de todos os registros.
- **Pessoas confirmadas:** convidados confirmados mais seus acompanhantes.

A migration `20261013010000_create_admin_guest_list.sql` cria essa RPC como
`security definer`, revoga execução de `public`, `anon`, `authenticated` e
`service_role` antes de concedê-la somente a `service_role`. Ela foi validada
em PostgreSQL local descartável e aplicada em produção. A Edge Function
`admin-list-guests` usa essa RPC; a versão 8 foi a referência PRD conferida no
checkpoint de implantação, não um número de versão garantido em tempo real.

Sem parâmetros de paginação, o endpoint mantém temporariamente a resposta
completa para compatibilidade com versões antigas do dashboard durante uma
publicação em duas etapas. O frontend novo sempre envia `page` e `page_size`,
portanto usa o caminho paginado.

Os estados da interface são distintos: `Nenhum convidado cadastrado.` quando o
total global é zero; `Nenhum convidado encontrado para esta pesquisa.` quando o
filtro não encontra registros; e uma mensagem de erro com ação `Tentar
novamente` em falhas de comunicação. CRUD e recuperação de contingência
recarregam a página atual, preservando pesquisa e tamanho sempre que possível;
se a exclusão tornar a página inválida, a última página válida é carregada.

## Testes locais e publicação segura

Os testes utilizam somente fixtures sintéticas. A cobertura inclui validação e
encaminhamento dos parâmetros, busca Unicode/caracteres especiais, paginação,
totais, estados de autorização/origem e contrato da resposta no handler Deno;
no frontend inclui debounce, mudança de página/tamanho, respostas fora de
ordem, páginas vazias, erros, métricas globais e marcação acessível.

A migration deve ser aplicada primeiro em um banco de desenvolvimento/UAT
descartável e validada antes de qualquer ambiente compartilhado. Neste
encerramento, a ordem operacional foi: validar a migration/RPC localmente,
aplicá-la em produção, publicar a Edge Function e confirmar o endpoint com
autenticação e autorização administrativas; somente depois o frontend foi
publicado pela branch `production` da Vercel. O backend continua aceitando o
cliente antigo sem parâmetros, mas o frontend novo depende dos campos
`pagination` e `metrics`.

A publicação final desta funcionalidade corresponde ao commit
`b5995cf53be3085f9b1d418b8cddf08154afd303` e ao deployment Vercel
`dpl_F8r3e6u28EY2NimfGtZLSUmP1Bvf`. O hotfix do cursor dos botões desabilitados
foi incluído nessa publicação. Novas alterações remotas continuam exigindo
validação e autorização próprias.

## Contingência

A seção de contingência permanece independente. Sua listagem e recuperação
continuam passando pelas Edge Functions administrativas; o navegador não
acessa o Google Sheets.

## Recuperação do acesso administrativo

Não confundir recuperação de senha com recuperação de RSVPs da contingência.
O fluxo de senha utiliza Supabase Auth e preserva a identidade administrativa.
O estado resumido fica no [roadmap](development_roadmap.md#estado-atual).
As validações e os limites por ambiente estão nos registros
[DEV](history/password-recovery-dev-validation.md),
[UAT](history/password-recovery-uat-validation.md) e
[PRD](history/password-recovery-prd-validation.md), sem reatribuir observações técnicas
ou relatos humanos entre versões.

No login, **Esqueci minha senha** abre o formulário de e-mail. A chamada oficial
`resetPasswordForEmail` usa uma resposta neutra para contas existentes/ausentes;
falhas de comunicação e rate limit têm mensagens genéricas. Envios simultâneos
são bloqueados na interface e no controlador. A proteção de abuso continua
dependendo dos limites do Supabase Auth, não do botão.

O callback deriva exclusivamente de `APP_BASE_URL`, validada pelo bootstrap,
como `admin/reset-password.html`, preservando root/subpath e ambiente. Não há
destino por query string nem fallback. A nova página e seus módulos integram a
allowlist de publicação. Configuração inválida mantém os controles bloqueados.

O SDK existente `@supabase/supabase-js@2.117.2` usa explicitamente **implicit**,
com detecção de sessão na URL. O listener é registrado imediatamente após
`createClient`, antes de aguardar Auth. Seu callback é síncrono e não chama
métodos Auth. A página aguarda `initialize`, o evento agendado pelo SDK e
`getSession`; exige `PASSWORD_RECOVERY` com o token do callback e o usuário da
sessão corrente. A autorização fica vinculada ao usuário e ao `session_id` do
token validado pelo SDK; a leitura desse identificador serve só para comparar
continuidade, não para autenticar JWTs por conta própria. Revalidações
`SIGNED_IN` da mesma sessão e renovação do token preservam recovery; logout ou
troca efetiva de sessão o invalidam, mesmo para o mesmo usuário. Se o token não
contiver identificador de sessão, só o mesmo access token mantém continuidade.
`type=recovery`, `INITIAL_SESSION` e sessão anterior, sozinhos,
não liberam o formulário. O retorno válido aparece antes de qualquer dashboard.

Link inválido, expirado, reutilizado, acesso direto ou recarregamento solicitam
outro link no login, inclusive com sessão anterior existente. A prova de recovery
vive somente na memória dessa navegação. Não há marcador persistido que autorize
o reload. A sessão preexistente não é encerrada por uma visita inválida; não
confundir sua existência com autorização para redefinir a senha nessa página.
O link de retorno usa `login.html?recovery=request` para abrir a solicitação
mesmo com sessão anterior. Esse parâmetro só escolhe a interface de envio;
nunca libera a redefinição ou escolhe um destino.
Query e fragmento são removidos com `replaceState` depois do processamento do SDK;
se a configuração falhar antes dele, o bootstrap limpa o retorno sem iniciar Auth.
A página usa meta `referrer` com `no-referrer`. Não copiar links, senhas, tokens
ou sessões para console, evidências ou relatórios.

A política mínima deste frontend é **6 caracteres**, coerente com
`minimum_password_length=6` local; espaços são preservados e a confirmação deve
coincidir. Prefira senha longa e exclusiva. O servidor permanece autoridade para
política mais forte, senha repetida, reautenticação e expiração; conferir a
política real antes de homologar outros ambientes. Só `updateUser({ password })`
é utilizado: não recria usuário, não muda UUID nem `ADMIN_AUTH_USER_IDS`.

Depois da atualização, `signOut({ scope: 'local' })` encerra **a sessão atual**
pelo SDK. Em sucesso, mantém **Senha alterada com sucesso** visível e oferece
**Ir para o login**, com foco e descrição acessível da confirmação. Não há
redirecionamento imediato nem timer que impeça a leitura. O link abre o login
com aviso de sucesso. Se o logout falhar, a interface informa que a senha já mudou, limpa os campos e oferece
retry de logout, sem repetir a atualização. Outros dispositivos não são
explicitamente desconectados por esse escopo; não se promete invalidação
imediata de todos os JWTs já emitidos. O aviso de sucesso no login é apenas
informativo, nunca prova de recuperação/autorização.

O resultado de `updateUser` deve confirmar o usuário esperado. Só então aparece
**Senha alterada com sucesso**, antes de aguardar o logout. Uma falha de rede ou
resposta 5xx depois do envio não comprova que a senha deixou de mudar: o resultado
é apresentado como **não confirmado**, os campos são limpos e o formulário não
reenvia a atualização. A orientação é tentar a nova senha no login ou solicitar
outro link. Falha de comunicação ao verificar a sessão, antes do envio, permite
nova tentativa e não é apresentada como link expirado. Rejeições explícitas de
senha/política, expiração e falha de logout têm tratamentos separados.

### Pré-requisitos posteriores em UAT e PRD

Conferir separadamente no projeto correto, sob autorização. UAT: callback exato
configurado e entrega publicada e funcionalmente validada em 25/10/2026; ver o
registro UAT para as evidências e a versão do refinamento visual posterior.
PRD: Site URL e callback configurados em 25/10/2026; publicação e aceite
funcional concluídos, incluindo painel/lista após o novo login confirmados pelo
responsável no registro PRD.
A tabela define os destinos;
não comprova homologação funcional:

| Ambiente / projeto | Site URL | Redirect URL exata de recuperação |
| --- | --- | --- |
| UAT / `eugvobtvjicvocttnkka` | `https://bispoid.github.io/wedding-invitation-project/` | `https://bispoid.github.io/wedding-invitation-project/admin/reset-password.html` |
| PRD / `bkkienyemqlkueygknzl` | `https://bruna-e-diego.vercel.app/` | `https://bruna-e-diego.vercel.app/admin/reset-password.html` |

Login UAT: `https://bispoid.github.io/wedding-invitation-project/admin/login.html`.
Login PRD: `https://bruna-e-diego.vercel.app/admin/login.html`.

Antes de enviar e-mail real, conferir destinatário autorizado/controlado do
administrador, conta existente e UUID autorizado no próprio ambiente. Conferir
provider Email, Site URL, redirect exato na allowlist do Auth, expiração de links,
política de senha, reautenticação e rate limits. Não habilitar cadastro público
para implementar recuperação e não transportar credenciais/sessões entre projetos.

Conferir **SMTP**: remetente e domínio verificados, host/porta/TLS, credenciais
privadas e destinatários permitidos pelo provedor. O SMTP padrão hospedado tem
restrições de destinatário (membros autorizados da organização) e limites; não
assumir que um login existente garante entrega de recuperação. Conferir o template
**Reset password**: usar o link oficial `{{ .ConfirmationURL }}`, respeitando o
`RedirectTo` aprovado; não substituir pelo SiteURL sozinho, token próprio ou
rota PKCE/OTP que este frontend não implementa. Verificar reescrita de links,
tracking e scanners do e-mail, que podem consumir links antes do clique humano.
Depois, testar envio/recebimento e percurso completo autorizado em cada ambiente.

Referências oficiais: [resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail),
[SDK 2.117.2 e emissão do evento](https://github.com/supabase/supabase-js/blob/v2.117.2/packages/core/auth-js/src/GoTrueClient.ts),
[signOut e escopos](https://supabase.com/docs/reference/javascript/auth-signout),
[SMTP](https://supabase.com/docs/guides/auth/auth-smtp) e
[templates](https://supabase.com/docs/guides/auth/auth-email-templates).

### Contingência manual

Permanece uma alternativa **não validada operacionalmente neste ciclo**. Antes
de qualquer execução autorizada, confirmar projeto, identidade, permissão e método
oficial; usar ambiente confiável e entrada privada da senha. A atualização
administrativa por ID deve alterar somente a senha, sem recriar conta ou mudar
allowlist. A [Auth Admin API](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid)
é exclusivamente server-side; nunca expor service_role no frontend, argumentos,
logs ou relatórios. Acesso a Users não comprova a execução do procedimento.
Não usar SQL direto em auth.users nem presumir revogação imediata de todo token.
Depois, conferir UUID e login, sem CRUD. Não há rollback automático da senha.
