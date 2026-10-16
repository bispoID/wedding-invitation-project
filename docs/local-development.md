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

Em uma revalidação sem autorização para consultar PRD, confirme primeiro que
`.dev/event-config.json` existe. Se estiver ausente, interrompa antes de `dev:up`:
o bootstrap inicial descrito abaixo possui um GET público condicionado à ausência
do snapshot. Não remova nem atualize esse arquivo para repetir os testes.

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

Com o snapshot existente, nenhuma nova consulta remota de Event Config é feita.
A prontidão das Functions exige HTTP 200 no health, não apenas a ausência de
502. Antes de encerrar um PID persistido, o script confere se a linha de comando
corresponde ao servidor de Functions ou ao sidecar; um PID reutilizado por outro
aplicativo não deve ser encerrado.

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

O sidecar escuta em `0.0.0.0:54328` para permitir o acesso pelo container;
`127.0.0.1` é o endereço usado no host, não uma restrição de bind. Mantenha o
token em `.dev/` e não exponha essa porta fora do ambiente de desenvolvimento.

## Manutenção

```powershell
npm run dev:health
npm run dev:test
npm run dev:integration
```

`dev:test` delega a `npm run test:node`, a mesma seleção usada pelo CI, sem
Docker. Health e integração exigem o stack local já iniciado. A integração usa
somente entidades sintéticas e remove os convidados e a pendência criados no
caminho de sucesso; uma interrupção antes da limpeza exige inspeção local.

Para encerrar o stack explicitamente, use `npm run dev:down`. **Não execute
`npm run dev:reset` como rotina de validação:** ele remove dados locais.
`dev:reset` executa `supabase db reset --local --no-seed`, reaplica as migrations
no banco Docker local, recria o administrador, reinicia as Functions e repopula
o Event Config a partir do snapshot ignorado. Não use `--linked`.

Logs das Functions e da contingência ficam em `.dev/functions.log` e
`.dev/contingency.log`. O snapshot de Event Config contém somente a configuração
pública autorizada; convidados, RSVPs, bloqueios e rate limits de PRD nunca são
copiados.

## SQL local

Com as migrations aplicadas, execute somente no container deste projeto:

```powershell
Get-Content -Raw supabase/tests/block3.sql | docker exec -i supabase_db_wedding-invitation-project psql -X -U postgres -d postgres -v ON_ERROR_STOP=1
Get-Content -Raw supabase/tests/dev-rpc.sql | docker exec -i supabase_db_wedding-invitation-project psql -X -U postgres -d postgres -v ON_ERROR_STOP=1
```

As duas suítes usam transação com `ROLLBACK`; não precisam de reset e não
alteram migrations históricas. Não substitua o destino por banco remoto.
`block3.sql` valida Event Config; `dev-rpc.sql` complementa as permissões,
health, rate limiting, paginação, busca e métricas globais. Resultados datados
e limites de validação: [qa-final-evidence.md](qa-final-evidence.md#validação-final-do-dev--16102026).

## Preparação estática

O preparador de publicação aceita somente UAT/PRD explícitos, com manifesto
aprovado. DEV continua servindo invite-app diretamente; não precisa gerar _site.
O dev-config.json legado gerado pelo setup é adaptado ao contrato v1 somente
em hosts locais. Nenhum arquivo local precisa ser regenerado para esta etapa.
Parâmetros devmode continuam exclusivamente visuais. Sessões agora usam namespace
por ambiente e projeto, exigindo novo login local sem apagar armazenamento antigo.
Detalhes de build e variáveis: [environments.md](environments.md).

Na revalidação de 16/10/2026 da Etapa 1 UAT, o arquivo DEV existente passou no
novo validador sem expor seus valores. As portas 54321, 5500 e 8000 não responderam;
dev:health não concluiu e foi interrompido. Não houve start/reset, teste
autenticado, teste SQL nem aceite visual nesta etapa. O funcionamento integrado
DEV deve ser revalidado com a infraestrutura disponível.
