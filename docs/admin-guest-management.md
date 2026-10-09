# Administração de convidados

O administrador autentica sua própria conta pelo Supabase Auth. A autenticação
confirma a identidade do usuário, mas não concede, por si só, autorização
administrativa na aplicação.

O dashboard lista os registros de `public.guests` pela Edge Function
`admin-list-guests`. A função valida o JWT e compara o UUID autenticado com a
lista `ADMIN_AUTH_USER_IDS` antes de consultar os dados com `service_role`. O
cliente do navegador não tem permissão de leitura direta nessa tabela.

As operações de edição e exclusão passam pela Edge Function
`admin-manage-guests`; listagem e recuperação da contingência também verificam a
mesma lista compartilhada no backend. Cada função valida o JWT e rejeita
usuários cujo UUID não esteja autorizado.

## Autorização administrativa

As Edge Functions administrativas `admin-list-guests`,
`admin-list-contingency`, `admin-manage-guests` e
`admin-recover-contingency` exigem JWT válido (`verify_jwt=true`) e verificam a
autorização exclusivamente no backend. Cada função compara o UUID do usuário
validado com a lista de UUIDs mantida no secret `ADMIN_AUTH_USER_IDS`, separados
por vírgulas. O backend remove espaços, normaliza maiúsculas e minúsculas e
rejeita configuração ausente ou inválida. Um JWT válido sozinho não concede
permissão administrativa: usuário autenticado cujo UUID não esteja na lista
recebe HTTP 403. O frontend não decide quem é administrador nem recebe essa
lista.

Cada administrador possui sua própria conta do Supabase Auth. O Email Provider
está habilitado, a confirmação de e-mail é exigida e o cadastro público de novos
usuários está desabilitado. A senha deve ter no mínimo oito caracteres. A
proteção contra senhas vazadas não está disponível no plano atual. Convidados
que enviam RSVP não possuem conta no Supabase Auth.

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

## Extensão local — Bloco 3 (ainda não publicada)

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
do evento usa seção independente, GET/PUT e 12 campos completos; consulte
[event-config.md](event-config.md) para contratos, segurança e pré-requisitos.
Links do convite/previews derivam de APP_BASE_URL sem host/subpath fixo.
Recuperação atualiza listas sem refresh geral que descarte edições do evento.

## Indicadores

Os indicadores são calculados sobre a lista atualmente carregada e recalculados
após uma nova listagem, edição ou exclusão:

- **Total de convidados:** número total de registros.
- **Confirmados:** registros com `attendance=true`.
- **Não poderão comparecer:** registros com `attendance=false`.
- **Total de acompanhantes:** soma de `companions` de todos os registros.
- **Pessoas confirmadas:** convidados confirmados mais seus acompanhantes.

## Contingência

A seção de contingência permanece independente. Sua listagem e recuperação
continuam passando pelas Edge Functions administrativas; o navegador não
acessa o Google Sheets.
