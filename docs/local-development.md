# Desenvolvimento local DEV

## Pré-requisitos

- Docker Desktop com o engine Linux disponível;
- WSL2 funcionando;
- Node.js 22 e npm;
- a dependência local Supabase CLI `2.120.0` instalada pelo lockfile;
- Deno 2.9.7 para a suíte das Edge Functions.

Não é necessário instalar CLI globalmente. Os comandos usam
`npx --no-install supabase` e desativam a telemetria da CLI.

## Inicialização

Na raiz do projeto:

```powershell
npm run dev:up
```

Esse comando, somente localmente:

1. inicia o Supabase no Docker;
2. aplica as migrations locais;
3. cria o arquivo local de configuração do frontend;
4. cria ou atualiza o administrador sintético `dev-admin@local.test`;
5. inicia as Edge Functions locais;
6. inicia a contingência JSON em `127.0.0.1:54328`;
7. consulta `GET /functions/v1/event-config` do projeto publicado apenas se
   `.dev/event-config.json` ainda não existir;
8. valida e insere os 14 campos no singleton local `event_config`.

O comando não executa `db push`, reset vinculado, deploy de Functions, alteração
de secrets, Google Sheets ou qualquer escrita em serviço remoto.

Endpoints usuais do Supabase local:

- API/Functions: `http://127.0.0.1:54321`;
- PostgreSQL: porta `54322`;
- Studio: `http://127.0.0.1:54323`;
- e-mail de teste: `http://127.0.0.1:54324`;
- contingência DEV: `http://127.0.0.1:54328`.

As portas efetivas devem ser confirmadas com `npx --no-install supabase status`.

## Frontend e emulador Android

Com Live Server, abra `http://127.0.0.1:5500/invite-app/`. Com servidor Python,
use a porta configurada pelo servidor. Para o Android Emulator, regenere a
configuração apontando o backend para o host:

```powershell
$env:DEV_FRONTEND_HOST = '10.0.2.2'
npm run dev:up
```

O navegador do emulador deve acessar `http://10.0.2.2:5500/invite-app/` (ou a
porta do servidor escolhido). As origens locais usadas pelas Functions incluem
as portas 5500 e 8000 para os hosts suportados.

## Auth e contingência

O administrador sintético é criado pela API administrativa do Auth local com
uma senha gerada e armazenada somente em `.dev/admin.json`. O UUID local é
configurado somente no env-file usado pelas Functions.

O provider de contingência é selecionado por `APP_ENV=dev` e
`CONTINGENCY_PROVIDER=local`. O provider local grava `.dev/contingency.json`,
aceita o RSVP pendente, lista registros pelo painel e remove a linha somente
depois da recuperação confirmada. Ele é protegido por um token local e só é
usado pelo Edge Runtime local via `host.docker.internal`. Se DEV tentar
selecionar Google Sheets, a Function falha na inicialização.

O browser usa o endereço do host (`127.0.0.1` ou `10.0.2.2`), enquanto as
Functions locais usam `host.docker.internal` para alcançar o host a partir do
Edge Runtime em container. Essa diferença é necessária no Docker Desktop e não
é um endpoint remoto.

## Manutenção

```powershell
npm run dev:health
npm run dev:reset
npm run dev:test
npm run dev:down
```

`dev:reset` executa `supabase db reset --local --no-seed`, reaplica as migrations
no banco Docker local, recria o administrador, reinicia as Functions e repopula
o Event Config a partir do snapshot ignorado. Não use `--linked`.

Logs das Functions e da contingência ficam em `.dev/functions.log` e
`.dev/contingency.log`. O snapshot de Event Config contém somente a configuração
pública autorizada; convidados, RSVPs, bloqueios e rate limits de PRD nunca são
copiados.

## Preparação estática

Um build com `APP_ENV=dev` precisa receber explicitamente
`EVENT_CONFIG_URL` local; sem isso o preparador recusa o endpoint remoto. UAT e
PRD continuam usando seus valores de build existentes.
