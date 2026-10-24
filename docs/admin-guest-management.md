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
PRD registrada, Email Provider está habilitado, confirmação de e-mail é exigida,
cadastro público está desabilitado e a senha exige no mínimo oito caracteres.
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
O frontend implementa login, sessão e logout, mas não um fluxo completo de
redefinição. Na liberação PRD, o responsável atestou login e consultas funcionais
pelo domínio oficial e acesso independente ao Dashboard Supabase. A ausência
de recuperação completa foi aceita como risco residual e melhoria futura.

O plano é preservar o usuário e seu UUID autorizado. Antes de qualquer execução,
confirmar projeto, identidade, permissão e método oficial; usar ambiente confiável
e entrada privada da senha. A atualização por ID deve alterar somente a senha,
sem recriar conta ou mudar allowlist. A Auth Admin API é exclusivamente server-side;
nunca expor service_role no frontend, argumentos, logs ou relatórios.

O procedimento ainda não foi validado operacionalmente. Acesso a Users não
comprova capacidade de redefinição; parar se os pré-requisitos não estiverem
confirmados. Troca de senha, revogação ou mudanças Auth exigem autorização.
Não presumir revogação imediata de todo token nem usar SQL direto em auth.users.
Depois de execução autorizada, conferir UUID e login, sem CRUD. Não há rollback
automático para senha antiga.

Site URL Auth local e redirects vazios são observações da auditoria PRD,
não uma prova de falha em signInWithPassword. A opção administrativa direta não
usa e-mail de recuperação. Se for escolhido self-service, implementar e validar
seu callback real antes de alterar URLs; só mudar URLs não completa o fluxo.

Referência: [Auth Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
Classificação: [backlog](development_roadmap.md#backlog).
