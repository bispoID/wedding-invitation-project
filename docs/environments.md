# Ambientes e isolamento

## Atualização — Etapa 5B.1, 23–24/10/2026, proteção Git sem publicação

Rulesets remotos ativos: Protect Staging `25768317`, somente refs/heads/staging;
Protect Production `25768402`, somente refs/heads/production. Ambos bloqueiam
exclusão (`deletion`) e force push (`non_fast_forward`), sem bypass, curingas,
PR/reviews/checks obrigatórios ou restrição geral de atualização. Fast-forward
legítimo continua permitido pela política, mas depende de autorização separada.
Releitura API e regras efetivas aprovadas; bypass vazio conferido no Dashboard
autenticado, não inferido do campo omitido pela API pública. As outras nove
branches e todos os 11 SHAs remotos permaneceram iguais.

Environment github-pages, suas variáveis e bypass administrativo não foram
alterados. Pages segue Source Actions e staging-only, no deployment antigo;
Vercel continua em production, Preview desligado, sem deployment novo observado.
Nenhum push, merge, deploy ou acesso funcional Supabase/Google nesta etapa.
Dois commits locais anteriores preservados, mais um registro documental local,
todos sem push/CI novo. Requisitos adicionais de revisão/CI e Etapas 5B.2/5C
continuam pendentes. [IDs, evidências e revisão administrativa](github-pages-uat-preparation.md).
Os checkpoints anteriores abaixo permanecem como histórico.

## Atualização — Etapa 5B, 23/10/2026, preparação sem deploy

O desenvolvimento 82450ab foi publicado na Etapa 5A.3 e seu CI 40043031879 passou.
Preview Vercel permanece desligado. Pages continua no deployment antigo, não UAT.
Nesta etapa, somente três variáveis públicas UAT foram criadas no environment
github-pages, com persistência conferida; nenhuma configuração PRD foi sobrescrita.
Workflow/gates de SHA, URL, publishable e artefato foram corrigidos apenas localmente.
370 Node, 150 Deno e 51 JS/MJS aprovados; build UAT local inspecionado. Proteções
Git e revisão/bypass ainda exigem autorização; novos commits não possuem CI remoto.
[Auditoria, variáveis, artefato e plano 5C](github-pages-uat-preparation.md).
As seções 5A.1 e Etapa 1 abaixo são checkpoints históricos.

## Proteção Git Vercel — Etapa 5A.1, 23/10/2026, somente local

Dashboard consultado sem alterações: projeto wedding-invitation-project,
repositório bispoID/wedding-invitation-project, Production Branch `production`,
Root Directory na raiz do repositório (sem subdiretório; ./ na interface), Other,
build `node scripts/prepare-static-site.mjs` e saída `_site`. Preview Branch
Tracking está habilitado para branches não atribuídas; o Ignored Build Step
Only build production pode cancelar builds, mas não prova ausência de deployments.

O novo `vercel.json` na raiz contém somente git.deploymentEnabled com
`feature/landing-page: false` e `staging: false`. Não há bloqueio global ou globs;
production e demais branches mantêm o comportamento não sobrescrito. Nenhum
setting remoto, build command, output directory, domínio ou workflow foi alterado.
O arquivo não integra os assets publicados nem muda o runtime DEV/UAT/PRD.

**PREPARADA COM RESSALVAS:** testes locais aprovados, mas a política não está
publicada/ativa remotamente. O primeiro push continua sujeito a comprovação de
segurança e autorização separada. Staging não foi alterada e não recebe proteção
apenas por existir uma regra em outra branch. Reauditar se Production Branch,
Root Directory ou regras mudarem. [Evidências, schema e procedimento](uat-git-ci-integration.md).

## Estado atual — 23/10/2026, E2E no Edge aprovado com ressalvas

O aceite técnico de navegador foi concluído em Playwright/Edge instalado,
contexto efêmero, service workers bloqueados e recursos Pages servidos somente
do artefato local sob sua origem futura. CORS, RSVP, Auth, sessões e Admin foram
validados, com limpeza de 11 UUIDs sintéticos. Nenhum ambiente foi publicado.
Limites de cobertura e instruções: [uat-edge-e2e.md](uat-edge-e2e.md).

## Checkpoint anterior — 23/10/2026, Etapa 4 parcial

O manifesto aprova UAT `eugvobtvjicvocttnkka`, independente de PRD. O backend
foi revalidado por metadados (oito Functions ACTIVE/v1); builds reais UAT locais
root/subpath passaram com chave publishable obtida por metadados oficiais do
projeto. A chave é pública e opaca: não se inferem claims ou assinatura JWT.
Nenhuma credencial privada foi versionada. Os registros abaixo da Etapa 1 são
históricos, inclusive suas referências ao manifesto ainda não provisionado.

O Pages publicado **não foi atualizado**. A validação E2E de navegador continua
pendente: o navegador disponível não expõe contexto temporário e interceptação
de rotas para servir disco sob a origem Pages. Não adicionar localhost ao CORS,
não abrir o Pages antigo para testes e não habilitar overrides publicados.
Procedimento, evidências e limites: [uat-frontend-validation.md](uat-frontend-validation.md).

## Estado da Etapa 1 — implementação local, sem publicação

O histórico de promoção permanece:

```text
feature/* → feature/landing-page → staging (GitHub Pages) → production (Vercel)
```

O isolamento DEV foi integrado em 6b51bf8. A auditoria posterior identificou
que Pages ainda selecionava o backend PRD. Esta etapa prepara a correção no
código; **não altera os ambientes publicados nem comprova isolamento remoto**.

| Ambiente | Frontend | Backend selecionado pelo novo código |
| --- | --- | --- |
| DEV | Live Server/Python/emulador | Supabase Docker, configuração local obrigatória |
| UAT | GitHub Pages | Projeto exclusivo ainda não provisionado; build bloqueado |
| PRD | Vercel | Projeto existente, somente com configuração explícita |

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

As três páginas carregam somente `shared/bootstrap.js`. Em host local, ele
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
Na primeira adoção do novo contrato será necessário autenticar novamente,
inclusive em PRD; essa transição ainda não foi publicada.

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

O workflow Pages conserva push em staging e o guard de execução manual.
Exige APP_ENV=uat, as variables UAT_SUPABASE_PROJECT_REF, UAT_SUPABASE_URL,
UAT_SUPABASE_PUBLIC_KEY, PUBLIC_SITE_URL vindo de configure-pages e BUILD_ID
com o SHA. Além disso, o ref precisa estar aprovado no manifesto. As variables
remotas não foram criadas. A suíte Node canônica e Deno continuam sem Docker
ou serviços externos. Nenhum workflow remoto foi disparado nesta etapa.

Para Vercel, confirmar futuramente Production Branch, Root Directory,
Build Command e Output Directory. A preparação proposta usa raiz do repositório,
comando Node acima e saída _site; depende de confirmação externa antes de
publicar. APP_ENV=prd e todas as entradas públicas serão obrigatórios.
Não publicar diretamente invite-app, pois falta runtime-config.json.

Antes de provisionar UAT:
1. Autorizar uma etapa remota específica e criar projeto independente; registrar
   organização, nome, ref e URL e conferir que diferem de PRD.
2. Conferir o inventário e ordem de supabase/migrations; revisar extensão,
   grants/RLS e requisitos de Functions. Usar contexto CLI isolado, sem reutilizar
   supabase/.temp ou vínculo de PRD e conferir destino antes de cada operação.
3. Aplicar migrations somente no novo projeto confirmado, sem importar convidados,
   sessões, secrets ou snapshots privados de PRD; carregar dados sintéticos.
4. Provisionar Auth/admin UAT, allowlists CORS, Event Config e contingência próprios.
   Credenciais privilegiadas ficam somente no backend; definir destino de
   contingência de teste antes de habilitar RSVP.
5. Conferir chave pública no painel UAT, atualizar o ref aprovado no manifesto,
   configurar variables de Pages e testar o artefato com UAT real.
6. Autorizar separadamente merge/push/publicação, validar navegador/admin/RSVP
   e só depois considerar a migração explícita PRD.

O setup DEV mantém seu snapshot local. O GET público legado ocorre somente
quando ele não existe, por comando DEV explícito; não integra o runtime/build.
Nesta etapa não foi realizado GET de Event Config PRD.
