# Recuperação da contingência no Google Sheets

A aba `RSVP` é uma fila temporária de recuperação. O banco principal permanece
como fonte dos convidados. A recuperação automatizada é executada somente pela
Edge Function `admin-recover-contingency` do Supabase. O navegador administrativo
nunca acessa o Google Sheets ou suas credenciais diretamente.

## Listagem no painel

O painel carrega linhas pendentes pela Edge Function independente
`admin-list-contingency`. Ela verifica o JWT e o UUID administrativo, lê a
planilha no backend e retorna somente ID da requisição, data de criação, nome,
e-mail, presença, acompanhantes, status, tipo de erro e timestamp de
sincronização. Linhas com status diferente de `pending` não são retornadas.
O campo `attendance` aceita `attendance` ou `presence` como cabeçalho da planilha.

O navegador envia somente `request_id` ao invocar `admin-recover-contingency`.
Conflito ou falha mantém a linha visível; a lista é atualizada somente após a
confirmação de reconciliação e remoção pela função.

## Contrato da recuperação automatizada

O administrador envia somente `request_id`, acompanhado do JWT do Supabase
Auth. A função verifica o JWT e compara o usuário com `ADMIN_AUTH_USER_IDS`,
mantido exclusivamente no backend, antes de criar o cliente privilegiado ou
acessar credenciais Google. O secret contém UUIDs autorizados separados por
vírgulas; configuração ausente ou malformada bloqueia a operação.

A função serializa recuperações da planilha pelo lock persistido
`google_sheets_rsvp_recovery`. A concessão do lock dura 180 segundos; a duração
máxima da função está configurada como 120 segundos. Locks expirados podem ser
adquiridos por outra requisição; somente o proprietário pode liberar seu lock.

Para cada requisição:

1. Ler a aba `RSVP` e mapear os campos pelo cabeçalho; presença aceita
   `attendance` ou o nome legado `presence`.
2. Exigir exatamente uma linha com o `request_id` informado e status `pending`.
3. Remover espaços nas extremidades do e-mail e convertê-lo para minúsculas.
   Validar nome, e-mail, presença e acompanhantes antes de qualquer escrita.
4. Consultar `public.guests` pelo e-mail normalizado. Se não houver registro,
   inserir somente `name`, `email`, `attendance` e `companions`; PostgreSQL gera
   ID e timestamps. Se nome, presença e acompanhantes coincidirem com um
   registro existente, reutilizá-lo sem novo INSERT. Se divergirem, retornar
   conflito sem inserir, sobrescrever ou remover a linha da contingência.
5. Após INSERT ou disputa pela unicidade do e-mail, consultar `public.guests`
   novamente e confirmar que os valores persistidos coincidem com a contingência.
6. Somente após a confirmação, reler a planilha e localizar novamente o
   `request_id`. Exigir uma única linha pendente, com dados inalterados.
7. Excluir a linha pelo índice recém-consultado e pelo `sheetId` da aba.
8. Reler a planilha e confirmar a ausência do `request_id`.

A linha é removida fisicamente somente após confirmação no banco. Se a
persistência ocorrer, mas a remoção ou sua verificação falhar, a função retorna
`CLEANUP_PENDING`, com `persisted: true` e `contingency_removed: false`; não
informa sucesso completo.

## Repetições seguras e conflitos

- A restrição única de `public.guests.email` permanece. Se um RSVP concorrente
  inserir o mesmo e-mail, a recuperação consulta novamente e prossegue somente
  se nome, presença e acompanhantes coincidirem.
- Se o mesmo e-mail tiver dados diferentes, manter a linha para revisão manual.
  A recuperação nunca sobrescreve um convidado.
- Repetir uma requisição cuja linha já foi removida não gera outro INSERT ou
  exclusão; a função informa que o ID não foi encontrado. Após perda da resposta
  de exclusão Google, conferir a presença da linha antes de tentar excluí-la.
- IDs ausentes ou duplicados, status diferente de `pending`, dados inválidos,
  lock ocupado ou resultado do banco sem confirmação impedem a exclusão.
- A perda da resposta de INSERT permite nova tentativa: consultar primeiro o
  e-mail normalizado e confirmar os dados antes de considerar a limpeza.

## Configuração do backend

UAT e PRD usam planilhas e configurações de conta de serviço separadas. DEV
utiliza o provider JSON local: [ambientes](environments.md). A recuperação de
linhas não corresponde à recuperação de senha administrativa.

Configurar somente nas Edge Functions:

- `ADMIN_AUTH_USER_IDS`: UUIDs Supabase Auth autorizados para funções
  administrativas, incluindo recuperação, separados por vírgulas.
- `ADMIN_ALLOWED_ORIGINS`: origens exatas autorizadas, separadas por vírgulas,
  sem caminhos ou curingas.
- `GOOGLE_SERVICE_ACCOUNT_JSON_B64`: secret JSON existente da conta de serviço.
- `GOOGLE_SPREADSHEET_ID`: identificador existente da planilha.

A conta de serviço Google precisa ler a planilha e excluir linhas da aba
`RSVP`. A função verifica o usuário pelo Supabase Auth antes de criar o cliente
privilegiado ou acessar a configuração Google. `service_role`, credenciais da
conta de serviço, tokens OAuth e dados da planilha nunca são retornados ao
navegador nem registrados em logs.

O endpoint exige JWT e verifica separadamente a lista de UUIDs administrativos.
CORS aceita somente as origens exatas configuradas e não substitui a validação
do JWT e da autorização administrativa.

## Limites operacionais

O RSVP público alcança o fallback Sheets somente após sucesso na verificação
de rate limiting PostgreSQL. Não cobre indisponibilidade total do banco antes
dessa verificação.

O lock persistido serializa recuperações por esta função; não impede que uma
pessoa ou integração externa insira, exclua ou mova linhas manualmente durante
a recuperação. A função relê por `request_id` imediatamente antes da exclusão
e verifica o resultado, mas Sheets não oferece exclusão condicional por
`request_id`. Evitar reorganização manual da aba durante a recuperação.

`request_id` fica na planilha, não em `public.guests`; o e-mail normalizado é a
chave de idempotência entre os sistemas. Nunca inserir chaves privilegiadas,
credenciais Google ou tokens em histórico SQL, código do navegador, logs ou
notas de suporte.
