# Ambientes e isolamento

Este é o guia operacional canônico de configuração e publicação. O
[roadmap](development_roadmap.md#estado-atual) registra status e backlog; o
[QA final](qa-final-evidence.md#publicação-devuatprd--24102026) registra a
publicação homologada. Observações datadas não garantem disponibilidade atual.

## Matriz de ambientes

| Ambiente | Branch | Frontend | Backend |
| --- | --- | --- | --- |
| DEV | feature/landing-page | Local: Live Server/Python/emulador | Supabase Docker; projectRef local |
| UAT | staging | [GitHub Pages](https://bispoid.github.io/wedding-invitation-project/) | Supabase eugvobtvjicvocttnkka |
| PRD | production | [Vercel](https://bruna-e-diego.vercel.app/) | Supabase bkkienyemqlkueygknzl |

UAT tem Auth, CORS, Event Config e contingência próprios, sem convidados,
sessões ou credenciais copiados de PRD. DEV usa contingência JSON local;
ambientes publicados usam Google Sheets separados. Inicialização, manutenção
e SQL exclusivamente local: [local-development.md](local-development.md).

```text
feature/* → feature/landing-page → staging (UAT) → production (PRD)
```

## Contrato público v1

O validador compartilhado é `invite-app/scripts/shared/environment-config.js`.
Todos os campos abaixo são públicos; nenhum segredo de backend é permitido.

| Campo JSON | Entrada do preparador | Regra |
| --- | --- | --- |
| contractVersion | gerado como 1 | versão suportada |
| appEnv | APP_ENV | dev, uat ou prd; build publicado aceita uat/prd |
| projectRef | SUPABASE_PROJECT_REF | local em DEV; ref aprovado no build remoto |
| supabaseUrl | SUPABASE_URL | HTTP local em DEV; HTTPS exato do project ref remoto |
| supabaseAnonKey | SUPABASE_PUBLIC_KEY | JWT anon legado ou sb_publishable_ |
| publicSiteUrl | PUBLIC_SITE_URL | base absoluta do frontend, incluindo subpath |
| buildId | BUILD_ID (opcional) | identificador público, até 128 caracteres |

Campos extras são recusados. JWTs são decodificados para conferir role e ref;
essa inspeção **não verifica assinatura**. Chaves publishable são opacas:
não é possível deduzir seu projeto criptograficamente. A correspondência real
de uma publishable exige conferência no painel do projeto durante o
provisionamento. Não usar service_role, sb_secret_, senha ou chave privada.

`config/environments.json` aprova os destinos do build. O ref PRD público é
`bkkienyemqlkueygknzl`; UAT aprova exclusivamente `eugvobtvjicvocttnkka`.
Destinos sintéticos ou não aprovados continuam bloqueados pelo preparador.
A política sintética injetada pelos testes não é uma opção do CLI.

UAT exige URL github.io e ref diferente de PRD; PRD recusa github.io e só aceita
seu ref conhecido. Domínio customizado UAT exige revisão explícita desta política.
O navegador confere a base do módulo contra publicSiteUrl (origem, porta e
subpath). Copiar o artefato para preview desconhecido falha fechado. Não há
seleção por query string, localStorage ou devmode.

## Inicialização e sessões

As páginas públicas e administrativas (incluindo `admin/reset-password.html`)
carregam somente `shared/bootstrap.js`. Em host local, ele
carrega `dev-config.json`; nos demais hosts, `runtime-config.json`. Essa leitura
na própria origem é a única consulta anterior à validação. Redirects do
manifesto são recusados e o carregamento possui timeout de 12 segundos.
Formulários começam inertes no HTML e só são liberados após validação. Configuração inválida impede a importação da aplicação,
Auth, RSVP e Event Config, desabilita formulários e apresenta alerta acessível.

O arquivo DEV legado de três campos continua aceito exclusivamente nos hosts
locais: o adaptador completa o contrato v1 com projectRef local e a base real
do módulo. Isso preserva portas Live Server/Python e emulador sem editar o
arquivo ignorado. Arquivos DEV v1 devem declarar sua base exata.

A sessão usa `invitation-v1-<ambiente>-<projectRef>-auth`. Sessões antigas
`sb-<ref>-auth-token` não são reutilizadas, removidas nem encerradas remotamente.
Na primeira adoção do contrato é necessário autenticar novamente, inclusive
em PRD; a transição foi publicada. Não migre storage/token entre ambientes.

A recuperação administrativa usa callback exato derivado da mesma base validada,
sem destinos fornecidos pela URL. O callback exato foi configurado no Auth UAT
em 25/10/2026, após publicação de `ed5f7c9`; a validação funcional dessa versão
foi concluída, incluindo logins e dashboard confirmados pelo responsável. O
refinamento visual posterior tem entrega e registro de publicação separados
daquele aceite funcional. PRD não recebeu essa entrega/configuração. Evidências:
[recuperação UAT](password-recovery-uat-validation.md). URLs e pré-requisitos:
[recuperação administrativa](admin-guest-management.md#pré-requisitos-posteriores-em-uat-e-prd).

## Build e artefatos

Com as variáveis reais da tabela definidas, executar na raiz:

```text
node scripts/prepare-static-site.mjs
```

Não execute um build PRD durante validações sem autorização para o GET público.
O preparador valida contrato, manifesto, arquivos e destino antes de consultar
Event Config. O endpoint deriva apenas do Supabase selecionado; EVENT_CONFIG_URL
é recusado. Redirects HTTP são tratados manualmente e bloqueiam o build sem
seguir Location. Indisponibilidade do endpoint mantém título genérico no mesmo
ambiente; nunca troca de backend.

A saída nova `_site` contém apenas os caminhos revisados de
`config/public-assets.json` mais runtime-config.json gerado. Fonte e saída não
podem se sobrepor; saída existente não é apagada. Symlinks públicos, recursos
faltantes e padrões de credenciais privilegiadas em arquivos textuais são
bloqueados. Esta inspeção complementa a allowlist; não é um detector universal
de segredos. Novos recursos precisam ser incluídos e revisados na lista.

DEV, .env, snapshots, testes, fixtures, seeds, scripts operacionais e o manifesto
de destinos não são copiados. Menções textuais ao ref PRD na regra de bloqueio
ou a dev-config.json no carregador não são dependências operacionais desses
destinos. CSS, JS, fontes e imagens revisados são preservados byte a byte.

Canonical, OG, Twitter, descrição e imagem mantêm root/subpath. UAT recebe
título de homologação e noindex/nofollow. PRD mantém a identidade existente.

## CI/CD e próximas etapas

### GitHub Pages — UAT

- `.github/workflows/deploy-pages.yml`: push em staging e execução manual
  com guard de branch em ambos os jobs.
- `validate` chama test.yml do mesmo SHA; `deploy` depende de sua aprovação.
  Checkout por github.sha, sem credenciais persistidas.
- Environment github-pages, variables UAT_SUPABASE_PROJECT_REF,
  UAT_SUPABASE_URL e UAT_SUPABASE_PUBLIC_KEY. APP_ENV=uat,
  PUBLIC_SITE_URL vem de configure-pages e BUILD_ID=github.sha.
- `scripts/prepare-pages-uat.mjs` exige ref/URL/origem exatos, chave publishable
  UAT, SHA completo e Event Config com nomes sintéticos identificados como UAT.
  Audita allowlist, bytes, runtime, metadados e referências antes do upload.
- Publica `_site`, nunca a pasta-fonte diretamente.

### Vercel — PRD

Projeto `prj_ddkuhQTns4qqaGCXtBoq5ilWoteb`, wedding-invitation-project,
repositório bispoID/wedding-invitation-project. Configuração conferida na Etapa 6C:
Production Branch production, raiz do repositório, Framework Other,
Output Directory _site, instalação padrão e Node 24.x.

Build Command salvo no projeto:

```sh
node -e 'let e=process.env,s=e.VERCEL_GIT_COMMIT_SHA;if(!/^[a-f0-9]{40}$/.test(s)||e.BUILD_ID&&e.BUILD_ID!==s)throw Error();e.BUILD_ID=s;process.argv[1]="./scripts/prepare-static-site.mjs";import(process.argv[1])'
```

O wrapper exige SHA Git completo, rejeita conflito e passa BUILD_ID ao CLI
existente. Não criar BUILD_ID estático. Exposição de variáveis de sistema
habilitada; APP_ENV, SUPABASE_PROJECT_REF, SUPABASE_URL e SUPABASE_PUBLIC_KEY
são exclusivos de Production. PUBLIC_SITE_URL canônica:
https://bruna-e-diego.vercel.app/. Valores Secret não são recuperáveis pela
interface após salvar; não substituir ou exportar para conferir.

Preview Branch Tracking foi desligado. `vercel.json` também desabilita
deployment de feature/landing-page e staging; não bloqueia todas as outras
branches por padrão. Ignored Build Step Only build production filtra builds,
não é garantia isolada de ausência de registro de deployment.

### Proteções e promoção

Protect Staging 25768317 e Protect Production 25768402 bloqueiam exclusão e
non-fast-forward, sem bypass. Production exige
`validate / JavaScript and Deno tests`, GitHub Actions App 15368,
sem PR/segundo revisor obrigatório e sem atualização estrita de branch.

Antes de promoção autorizada: árvore limpa, fetch, comparar refs/ancestralidade,
confirmar CI do SHA exato e destino de publicação. Se houver divergência,
interromper; não usar force, reset, rebase ou desabilitar proteções.

```sh
git fetch origin
git switch <branch-destino>
git merge --ff-only <SHA-homologado>
git rev-parse HEAD
git diff --check
git push origin <branch-destino>
```

Executar passo a passo, verificando cada resultado. O push em staging aciona
Pages UAT; o push em production aciona Vercel PRD. A autorização deve abranger
esse efeito. Não há necessidade de merge commit, tag ou redeploy manual.

Depois: acompanhar CI/deployment do SHA, conferir domínio e runtime-config.json
(appEnv, projectRef, publicSiteUrl e buildId), assets e fluxo público essencial.
Não registrar chave pública integral, tokens ou dados de convidados em relatórios.
RSVP/CRUD/recovery reais não são smoke checks de publicação.

### Rollback

Identificar antes da publicação o deployment estável e sua elegibilidade.
Se build falhar, conferir qual versão o domínio ainda serve; não presumir
publicação. Se READY apresentar ambiente errado, exposição de credencial ou
falha essencial, interromper e pedir autorização específica de recuperação.

Rollback Vercel restaura o frontend elegível, não Git, banco, Auth ou Functions.
Não retornar a branch com reset/force. Rollback pode desabilitar autoatribuição
de domínios; conferir essa política antes de nova publicação, sem corrigi-la
automaticamente. Reversão Git ou backend exige plano próprio.

### Recriação de UAT ou mudança de destino

UAT já foi provisionado e homologado. Para recriá-lo, não reutilizar cegamente
o vínculo CLI principal: usar contexto operacional isolado, confirmar project-ref
antes de cada operação, revisar as 16 migrations em ordem e autorizar aplicação
separadamente. Configurar Auth/admin, CORS, Event Config e Sheets próprios;
não importar dados privados PRD. Conferir a chave pública no projeto correto,
atualizar manifesto/variables sob autorização e validar antes da publicação.

O snapshot DEV em .dev é preservado. Seu bootstrap só consulta Event Config
pública PRD se o snapshot estiver ausente, por comando explícito; isso não é
fallback do runtime/build. Não executar essa consulta sem autorização.
