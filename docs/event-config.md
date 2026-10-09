# Configuração do evento — contrato final do Bloco 4

O primeiro PUT real foi realizado pelo usuário e o convite local já alcançou
READY. O checkpoint pós-READY adicionou a localização própria da recepção:
schema remoto e as duas Functions estão sincronizados no contrato de 14 campos.
Na implantação, o registro real e seus timestamps anteriores foram preservados,
com os dois campos novos inicialmente NULL. O usuário posteriormente concluiu
o preenchimento manual e validou a localização independente da recepção.
Este checkpoint não reaplica migrations, deploys ou PUT remoto.
O frontend continua somente local, sem publicação ou integração com
feature/landing-page. Dados cadastrados na Event Config são públicos pela API,
mesmo que não sejam versionados no Git.

## Separação de responsabilidades

- App Config: infraestrutura pública do browser (URL/chave pública Supabase,
  base das Functions e base root/subpath da aplicação).
- Event Config: os 14 campos públicos do evento, persistidos no banco.
- Secrets: service_role, credenciais Google e allowlist administrativa,
  exclusivamente no backend. Nunca pertencem a nenhuma configuração pública.

## Schema e singleton

`public.event_config` possui `id smallint DEFAULT 1 PRIMARY KEY CHECK(id=1)`,
14 campos editáveis e `updated_at timestamptz`. Não há segunda configuração.
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
| reception_city | text | opcional, trim, até 150 |
| reception_state | text | opcional, trim, até 100 |
| reception_maps_url | text | opcional, HTTPS, até 2048 |

Opcionais vazios tornam-se NULL. Unicode é preservado; comprimentos da API
usam pontos de código, não bytes. Valores excessivos não são truncados.
Todos os 14 campos devem estar presentes no PUT, inclusive opcionais como null.
Campos internos e desconhecidos são rejeitados.

URLs exigem esquema e autoridade HTTPS válidos, sem credenciais, espaços,
barra invertida ou escapes percentuais malformados. O banco contém restrição
HTTPS complementar; o parser completo está na API. Não há busca server-side
dessas URLs nem integração nova com provedores de
mapas. Os links são opcionais e independentes dos endereços; a recepção só é
exibida quando seu nome existe. O monograma não pertence à Event Config: é o
asset estático/versionado `invite-app/images/monograma_bd.webp`, usado no cartão
do envelope e na carta, sem hospedagem externa.

## Segurança

RLS está ativo e não existem policies para acesso direto. PUBLIC, anon e
authenticated não recebem privilégios. service_role recebe SELECT e
INSERT/UPDATE somente nas colunas necessárias ao upsert; id é incluído,
mas CHECK fixa o valor 1. updated_at fica a cargo do default/trigger.
DELETE/TRUNCATE não são concedidos nem expostos pelos endpoints.

A Function pública usa credenciais backend e devolve apenas os 14 campos.
A Function administrativa exige Origin permitido, JWT verificado por
Supabase Auth (`auth.getUser(token)`) e UUID na allowlist
`ADMIN_AUTH_USER_IDS`. Dependências service_role são criadas somente após
autorização. JWT válido, por si só, não concede acesso administrativo.
As respostas usam no-store e os erros não expõem detalhes de banco/payload.

## Contratos HTTP

### event-config

`verify_jwt=false`; GET e OPTIONS. CORS público `*`, sem sessão administrativa.
Consulta exclusivamente id=1 e seleciona explicitamente os campos públicos.

- 200: `{success:true, config:{...14 campos...}}`.
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
- PUT: recebe `{config:{...14 campos...}}`; retorna a configuração
  efetivamente persistida, com updated_at. Nunca aceita id/updated_at do cliente.
- 400 INVALID_REQUEST; 401 UNAUTHORIZED; 403 INVALID_ORIGIN ou
  ADMIN_ACCESS_DENIED; 405 METHOD_NOT_ALLOWED; 422 INVALID_EVENT_CONFIG
  (field quando identificado); 502 DATABASE_ERROR.
- OPTIONS: 204; não permite PATCH ou DELETE.

## Preenchimento e edição

O primeiro preenchimento real e a edição da localização da recepção já foram
validados pelo usuário. Os campos opcionais começam vazios em um novo cadastro;
não existe herança automática de city/state da cerimônia nem salvamento automático.
Em um evento ainda não cadastrado, o formulário vazio continua esperado, sem
fallback fictício. A interface só anuncia sucesso
após resposta confirmada, desabilita controles durante operações e preserva
edições se o PUT falhar. Falha de GET oferece nova tentativa e não impede
convidados/contingência. A recuperação não recarrega mais a página inteira.

## Migrations aplicadas e pendências de validação

As migrations e Functions do Bloco 3 foram implantadas no checkpoint operacional.
A migration `20261009000200_replace_event_monogram_with_reception_map.sql` foi
aplicada no checkpoint anterior: substituiu a coluna de monograma por mapa da
recepção. O checkpoint pós-READY aplicou somente
`20261009000300_add_reception_location.sql`: duas colunas nullable com limites
150/100 e grants mínimos INSERT/UPDATE para service_role, sem seed ou UPDATE.
Singleton, trigger, RLS e demais constraints/grants foram preservados. Os
fingerprints dos campos anteriores permaneceram iguais, incluindo updated_at.
Somente event-config e admin-manage-event-config foram publicadas neste ajuste,
ambas na versão 3, mantendo verify_jwt false/true respectivamente.
As migrations já aplicadas não foram editadas.

1. Conferir migrations históricas existentes, RLS e grants; manter seus arquivos.
2. Aplicada no Bloco 3: `20261009000000_create_event_config.sql`, que exige
   o mecanismo `public.set_updated_at()` das migrations anteriores.
3. Aplicada no Bloco 3: `20261009000100_add_guest_length_constraints.sql`.
   CHECKs name/email usam btrim e foram criados como NOT VALID: nessa etapa,
   não houve varredura histórica, mas os limites já eram exigidos nas novas
   inserções/atualizações. Nenhum dado foi corrigido, truncado ou removido.
4. Concluída no Bloco 6: auditoria histórica somente leitura, sem violações,
   seguida de `20261009000400_validate_guest_length_constraints.sql`.
   `guests_name_length` e `guests_email_length` estão com `convalidated=true`;
   limites, expressões e dados existentes foram preservados. A auditoria
   verifica as condições exatas dos CHECKs, sem retornar nomes ou e-mails:

```sql
select count(*) as invalid_name_count from public.guests
where char_length(btrim(name)) not between 1 and 200;
select count(*) as invalid_email_count from public.guests
where char_length(btrim(email)) not between 1 and 320;
```

O Bloco 6 executou somente VALIDATE das duas constraints existentes, sem
recriá-las ou corrigir, truncar ou excluir registros. A verificação posterior
confirmou o estado validado e a mesma contagem de convidados.

5. Conferir variáveis backend SUPABASE_URL, SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, ADMIN_AUTH_USER_IDS e ADMIN_ALLOWED_ORIGINS.
6. Em checkpoints futuros, implantar somente as Functions autorizadas, preservando
   configurações JWT; as duas de Event Config já estão sincronizadas.
7. Aceites dos checkpoints anteriores e revisão manual do Bloco 4 foram
   concluídos; a suite SQL local integral foi aprovada no Bloco 7. A publicação
   do frontend permanece pendente neste registro. GitHub Pages é hospedagem
   atual; Vercel é opcional.

## Validação local

```text
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/event-config.test.mjs
```

Asserções unitárias e integrações simuladas, sem banco/Sheets reais.
O script `supabase/tests/block3.sql` é separado do CI e só deve ser executado
num banco LOCAL DESCARTÁVEL, com migrations aplicadas e role proprietário capaz
de SET ROLE. Usa transação/rollback e dados exclusivamente sintéticos.
Testa singleton, RLS, grants, upsert, bloqueio de DELETE/TRUNCATE, acesso direto,
constraints, opcionais e trigger. Executado integralmente no Bloco 7 em
09/10/2026, com PostgreSQL 17.6 do Supabase local, Docker Desktop/WSL2 e CLI
2.120.0. O banco descartável foi recriado com
`npx --no-install supabase db reset --local --no-seed`, aplicando as 15 migrations,
incluindo `20261009000400_validate_guest_length_constraints.sql`.
Duas execuções integrais com `psql -X -v ON_ERROR_STOP=1` passaram e terminaram
em ROLLBACK; a auditoria confirmou histórico, RLS/RPCs e constraints validadas,
com `guests` e `event_config` vazias antes e depois. Produção não foi utilizada.
Testes de UI usam DOM simulado; não substituem aceite visual desktop/mobile
ou integração com serviços publicados.

## Frontend público dinâmico — Bloco 4 local

`scripts/event-config.js` consome apenas GET da Function, via FUNCTIONS_BASE_URL.
A Promise compartilhada conserva sucesso/falha em memória: um GET por página,
timeout de 12 segundos, sem polling, retry ou armazenamento persistente.
Os 14 campos são validados antes de textContent/bindings declarativos. Datas
são civis, formatadas por componentes numéricos sem conversão de timezone.

Estados: loading, ready, not-configured (404 contratado) e error. Não há fallback
com nomes/local/data pessoais. A estrutura do envelope e o RSVP permanecem
independentes; campos dependentes ficam invisíveis até ready. Endereço/mapa
ausentes ficam ocultos; recepção depende do nome, endereço continua opcional.
Ambos os mapas exigem HTTPS sem credenciais. Cidade/estado ocupam a posição
geográfica existente da cerimônia. A recepção usa exclusivamente reception_city
e reception_state, com separador apenas quando ambos existem; sem valores, o
texto fica oculto. Não há fallback da localização principal. A aplicação dos
dados dispara
`invitation:content-updated` para recálculo de tipografia/geometria.

Metadata estática e título administrativo são genéricos. PUBLIC_SITE_URL e seus
markers continuam resolvidos no artefato; a imagem social usa o asset genérico
`invite-app/images/previa-link-envelope.webp`, preservado sem alterações, com
MIME image/webp e dimensões 611 × 867. O monograma estático BD foi restaurado
nos dois slots originais; o antigo screenshot personalizado permanece removido.
Metadata personalizada por evento exige preparação futura adequada a crawlers,
não apenas atualização por JavaScript.

Testes novos: `node --test scripts/event-config.test.mjs`, sem Supabase real.
O primeiro PUT real e READY já foram informados pelo usuário. O GET remoto foi
validado com HTTP 200, exatamente 14 campos, no-store e os dois campos novos NULL,
sem reproduzir dados pessoais. O aceite manual já confirmou READY, cerimônia,
recepção e sua localização independente, mapas, monograma nos dois locais,
timestamp administrativo, espaçamentos, desktop e mobile aproximadamente 390px.
O workflow Test baseline acompanha o commit de encerramento; integração com
feature/landing-page e publicação/preview social real permanecem pendentes
neste registro. A auditoria prévia e a VALIDATE dos convidados foram concluídas
posteriormente no Bloco 6, sem alteração dos dados existentes; a suite SQL local
integral foi aprovada no Bloco 7, exclusivamente em banco descartável.

## Painel administrativo recolhível

O título Configuração do evento contém um button nativo com aria-expanded e
aria-controls associado ao conteúdo. Cada carregamento começa recolhido,
sem localStorage/sessionStorage. Clique, Enter e Space alternam a apresentação;
o foco é visível e o chevron indica o estado. GET e preenchimento continuam
ocorrendo com a seção recolhida, sem lazy loading nem requisições ao alternar.
Os 14 campos e suas edições são preservados. Feedback importante expande a seção;
salvar e receber sucesso não a recolhem automaticamente. A responsividade e os
estados recolhido/expandido/recolhido novamente foram aprovados pelo usuário.

## Timestamps e apresentação administrativa

created_at/updated_at continuam instantes absolutos no schema existente;
updated_at permanece timestamptz com default now() e trigger. Não há alteração
de timezone do banco, conversão antes de gravar ou alteração de históricos.
O formatador compartilhado `admin/scripts/date-time.js` usa Intl.DateTimeFormat
com America/Sao_Paulo explícito somente na apresentação: dd/MM/yyyy às HH:mm.
É reutilizado nos timestamps já exibidos de convidados/contingência.
event_date e event_time são data/horário civis; HH:mm não sofre conversão.
O painel preserva 12px abaixo de #event-feedback e acrescenta 12px acima
de #event-updated, sem redesenhar o formulário.
