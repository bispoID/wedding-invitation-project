# Administração de convidados

O dashboard lista os registros de `public.guests` pela Edge Function
`admin-list-guests`. Ela valida o JWT e compara o UUID do usuário com
`ADMIN_AUTH_USER_ID` antes de consultar os dados com `service_role`. O cliente
do navegador não tem permissão de leitura direta nessa tabela.

As operações de edição e exclusão passam pela Edge Function
`admin-manage-guests`, que valida o mesmo JWT e UUID administrativo antes de
inicializar o cliente `service_role`.

O navegador nunca recebe a chave `service_role`. A função atualiza somente
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
