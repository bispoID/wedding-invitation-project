# Configuração do evento — Bloco 3

Implementação local, ainda não publicada nem aplicada ao Supabase remoto.
Não há seed; a tabela começa vazia. O convite público continua estático neste
bloco e ainda não consome este endpoint. Dados cadastrados na Event Config
serão públicos pela API, mesmo que não sejam versionados no Git.

## Separação de responsabilidades

- App Config: infraestrutura pública do browser (URL/chave pública Supabase,
  base das Functions e base root/subpath da aplicação).
- Event Config: os 12 campos públicos do evento, persistidos no banco.
- Secrets: service_role, credenciais Google e allowlist administrativa,
  exclusivamente no backend. Nunca pertencem a nenhuma configuração pública.

## Schema e singleton

`public.event_config` possui `id smallint DEFAULT 1 PRIMARY KEY CHECK(id=1)`,
12 campos editáveis e `updated_at timestamptz`. Não há segunda configuração.
O trigger reutiliza `public.set_updated_at()`. O PUT completo utiliza upsert
atômico em id=1; a estratégia inicial é last-write-wins, sem histórico ou
controle de concorrência por versão.

| Campo | Tipo | Validação da API |
|---|---|---|
| bride_name | text | obrigatório, trim, 1–200 caracteres |
| groom_name | text | obrigatório, trim, 1–200 |
| event_date | date | data civil válida YYYY-MM-DD |
| event_time | time(0) | HH:mm; HH:mm:00 do banco normalizado para HH:mm |
| city | text | obrigatório, trim, 1–150 |
| state | text | obrigatório, trim, 1–100 |
| ceremony_name | text | obrigatório, trim, 1–200 |
| ceremony_address | text | opcional, até 500 |
| ceremony_maps_url | text | opcional, HTTPS, até 2048 |
| reception_name | text | opcional, até 200 |
| reception_address | text | opcional, até 500; exige reception_name |
| monogram_url | text | opcional, HTTPS, até 2048 |

Opcionais vazios tornam-se NULL. Unicode é preservado; comprimentos da API
usam pontos de código, não bytes. Valores excessivos não são truncados.
Todos os 12 campos devem estar presentes no PUT, inclusive opcionais como null.
Campos internos e desconhecidos são rejeitados.

URLs exigem esquema e autoridade HTTPS válidos, sem credenciais, espaços,
barra invertida ou escapes percentuais malformados. O banco contém restrição
HTTPS complementar; o parser completo está na API. Não há busca server-side
dessas URLs, upload, validação de MIME, dimensões, disponibilidade ou segurança
do arquivo remoto. HTTPS não garante que o recurso seja uma imagem ou permaneça
disponível; URLs assinadas podem expirar. A renderização do monograma e os
cuidados com privacidade/conteúdo remoto ficam para o próximo bloco.

## Segurança

RLS está ativo e não existem policies para acesso direto. PUBLIC, anon e
authenticated não recebem privilégios. service_role recebe SELECT e
INSERT/UPDATE somente nas colunas necessárias ao upsert; id é incluído,
mas CHECK fixa o valor 1. updated_at fica a cargo do default/trigger.
DELETE/TRUNCATE não são concedidos nem expostos pelos endpoints.

A Function pública usa credenciais backend e devolve apenas os 12 campos.
A Function administrativa exige Origin permitido, JWT verificado por
Supabase Auth (`auth.getUser(token)`) e UUID na allowlist
`ADMIN_AUTH_USER_IDS`. Dependências service_role são criadas somente após
autorização. JWT válido, por si só, não concede acesso administrativo.
As respostas usam no-store e os erros não expõem detalhes de banco/payload.

## Contratos HTTP

### event-config

`verify_jwt=false`; GET e OPTIONS. CORS público `*`, sem sessão administrativa.
Consulta exclusivamente id=1 e seleciona explicitamente os campos públicos.

- 200: `{success:true, config:{...12 campos...}}`.
- 404: `EVENT_CONFIG_NOT_FOUND`.
- 405: `METHOD_NOT_ALLOWED`.
- 503: `EVENT_CONFIG_UNAVAILABLE`.
- OPTIONS: 204, sem consulta ao banco.

Não retorna id, updated_at, secrets ou campos adicionais.

### admin-manage-event-config

`verify_jwt=true`; GET, PUT e OPTIONS. CORS limitado a
`ADMIN_ALLOWED_ORIGINS`, com Vary: Origin.

- GET: `{success:true,config:null}` quando vazio; caso contrário, DTO e
  updated_at legítimo do banco.
- PUT: recebe `{config:{...12 campos...}}`; retorna a configuração
  efetivamente persistida, com updated_at. Nunca aceita id/updated_at do cliente.
- 400 INVALID_REQUEST; 401 UNAUTHORIZED; 403 INVALID_ORIGIN ou
  ADMIN_ACCESS_DENIED; 405 METHOD_NOT_ALLOWED; 422 INVALID_EVENT_CONFIG
  (field quando identificado); 502 DATABASE_ERROR.
- OPTIONS: 204; não permite PATCH ou DELETE.

## Primeiro preenchimento

Após implantação futura autorizada, efetuar login administrativo, abrir a
seção de configuração, preencher os campos obrigatórios e salvar. O formulário
vazio é esperado; não há fallback fictício. A interface só anuncia sucesso
após resposta confirmada, desabilita controles durante operações e preserva
edições se o PUT falhar. Falha de GET oferece nova tentativa e não impede
convidados/contingência. A recuperação não recarrega mais a página inteira.

## Migrations e pré-requisitos de implantação futura

Nenhum comando de implantação foi executado neste bloco.

1. Conferir migrations históricas existentes, RLS e grants; manter seus arquivos.
2. Aplicar posteriormente `20261009000000_create_event_config.sql`, que exige
   o mecanismo `public.set_updated_at()` das migrations anteriores.
3. Aplicar `20261009000100_add_guest_length_constraints.sql`.
   CHECKs name/email usam btrim e NOT VALID: não varrem dados históricos,
   mas são exigidos nas novas inserções/atualizações. Nenhum dado é corrigido,
   truncado ou removido automaticamente.
4. Antes de criar/aplicar outra migration com VALIDATE CONSTRAINT, executar
   auditoria somente leitura dos históricos, por exemplo:

```sql
select count(*) as invalid_name_count from public.guests
where char_length(btrim(name)) not between 1 and 200;
select count(*) as invalid_email_count from public.guests
where char_length(btrim(email)) not between 1 and 320;
```

Resolver violações por procedimento explicitamente aprovado e só então criar
uma migration posterior com `VALIDATE CONSTRAINT guests_name_length` e
`VALIDATE CONSTRAINT guests_email_length`. Este bloco não cria essa migration
porque os históricos não foram auditados; registros antigos excessivos podem
precisar de correção autorizada para serem editados.

5. Conferir variáveis backend SUPABASE_URL, SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, ADMIN_AUTH_USER_IDS e ADMIN_ALLOWED_ORIGINS.
6. Implantar depois as duas Functions novas e versões atualizadas de RSVP e
   administração/recuperação de convidados; preservar configurações JWT.
7. Fazer aceite integrado de Auth, gateway/CORS, permissões SQL e UI antes
   de publicar o painel. GitHub Pages é hospedagem atual; Vercel é opcional.

## Validação local

```text
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs
```

Asserções unitárias e integrações simuladas, sem banco/Sheets reais.
O script `supabase/tests/block3.sql` é separado do CI e só deve ser executado
num banco LOCAL DESCARTÁVEL, com migrations aplicadas e role proprietário capaz
de SET ROLE. Usa transação/rollback e dados exclusivamente sintéticos.
Testa singleton, RLS, grants, upsert, bloqueio de DELETE/TRUNCATE, acesso direto,
constraints, opcionais e trigger. Não foi executado: PostgreSQL/Docker não
estavam disponíveis. Testes de UI usam DOM simulado; não substituem aceite
visual desktop/mobile ou integração com serviços publicados.
