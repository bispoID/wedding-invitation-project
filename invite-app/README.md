# Invite app

Continuação de 23/10/2026: E2E Playwright/Edge aprovado com ressalvas, origem
Pages simulada com arquivos locais, sessão efêmera, CORS UAT e limpeza por UUID.
O bloqueio do primeiro executor descrito abaixo é histórico.
[Evidências atuais](../docs/uat-edge-e2e.md). Nenhum frontend foi publicado.

Etapa 4 (23/10/2026): ref UAT aprovado e build real local validado; nenhum
frontend publicado. Não abrir o Pages antigo para testes nem servir UAT em
localhost como se fosse DEV. O E2E requer contexto temporário e interceptação
de todas as requisições do site sob sua origem futura, com PRD bloqueado.
Essa capacidade não está disponível no navegador desta execução; os testes
de convite/RSVP/Auth/Admin em navegador permanecem pendentes.
[Detalhes e build](../docs/uat-frontend-validation.md).

Aplicação estática do convite virtual, com RSVP e área administrativa integrados.
Inicialmente, o artefato foi publicado no GitHub Pages. A arquitetura do frontend
permanece independente do provedor de hospedagem, permitindo sua publicação em
outros serviços compatíveis, como Vercel, Cloudflare Pages ou Netlify, sem
alterações nas regras de negócio.

O fluxo de ambientes é `feature/landing-page` (desenvolvimento local/Codex) →
`staging` (homologação no GitHub Pages) → `production` (produção na Vercel).
As branches `staging` e `production` foram preparadas localmente a partir do
commit estável publicado e já foram publicadas no GitHub no commit de separação
`1e19f5b`. A Production Branch da Vercel ainda precisa ser trocada manualmente
para `production`; os pushes recentes geraram apenas previews `READY`.

O job de testes do GitHub passou após a publicação. O job do Pages falhou
imediatamente sem etapas/logs disponíveis pelo conector, então a configuração
do Pages/ambiente `github-pages` precisa ser revisada antes da homologação
publicada em `staging`.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título, RSVP e Event Config.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` coordena a abertura, o controle manual `Pausar / Continuar`, o foco da carta e o retorno idempotente à capa; `scripts/letter/rsvp.js` envia o RSVP à Supabase Edge Function.
- **Controles visuais:** `.button` e `.card-pause-control` compartilham identidade visual, tokens de cor, marca d’água floral, estados de foco e dimensionamento proporcional; o botão do cartão também respeita a área segura inferior em telas móveis.
- **Modo desenvolvedor:** `scripts/devmode/preview.js` controla os previews estáticos e `styles/devmode/devmode.css` concentra os estilos do painel.
- **Área administrativa:** `admin/` mantém login Supabase Auth, criação/listagem/edição/exclusão de convidados, indicadores, Event Config e contingência, sempre por Edge Functions com autorização no backend.

Essa estrutura vanilla atende à aplicação atual e evita adicionar framework ou
build system antes de existir uma necessidade real. A interface e a integração
já estão implementadas e possuem publicação anterior validada. Os aceites
manuais ampliados de interface/acessibilidade foram consolidados; suas correções
de QA estão versionadas e publicadas, com CI e smoke checks aprovados. O aceite
visual final da publicação foi aprovado pelo responsável pelo QA e registrado
no encerramento da Fase 13. Evidências e limites:
[qa-final-evidence.md](../docs/qa-final-evidence.md).

## Como visualizar

Sirva a pasta `invite-app` por HTTP (por exemplo, com o Live Server do VS Code) e acesse `index.html`. A área administrativa fica em `admin/login.html`.

Os nomes e detalhes do evento são carregados pela Function pública `event-config`,
sem dados pessoais de fallback no HTML. O mesmo consumo dinâmico está presente
na versão publicada.

## Configuração da área administrativa

O frontend público está integrado na branch `feature/landing-page`; a branch de
homologação publicada pelo GitHub Pages é `staging`, e a produção da Vercel deve
ser promovida somente pela branch `production` após a configuração manual do
projeto.
Os dados públicos vêm exclusivamente da
Function event-config: um GET/Promise por página, timeout de 12 segundos,
loading/ready/not-configured/error, sem cache persistente ou fallback pessoal.
O contrato final tem 14 campos públicos, incluindo reception_city,
reception_state e reception_maps_url. O monograma não é configurável:
`images/monograma_bd.webp` é estático/versionado,
no cartão e na carta. Endereços e mapas são opcionais; city/state mantêm a
posição geográfica da cerimônia, sem fallback para a recepção. Esta possui
cidade/estado próprios opcionais, sem placeholders ou separadores órfãos.
Metadata estática é genérica e usa
`images/preview-link.webp`; os markers PUBLIC_SITE_URL permanecem.
O contrato completo está em [event-config.md](../docs/event-config.md).
O primeiro PUT real foi realizado pelo usuário e READY já foi alcançado.
A nova migration de localização e as duas Functions foram implantadas em
checkpoints anteriores, sem alteração automática do registro ou seus timestamps.
O preenchimento manual e a localização independente da recepção foram validados
pelo usuário. Este checkpoint não reaplica migrations, deploys ou PUT remoto.
O painel formata updated_at e timestamps já exibidos de convidados/contingência
em America/Sao_Paulo, por Intl.DateTimeFormat compartilhado, só na apresentação.
A persistência de instantes absolutos permanece inalterada. event_time continua
horário civil HH:mm sem conversão. Há 12px acima de #event-updated; o espaçamento
aprovado de #event-feedback permanece.
O Event Config usa seção recolhível: botão nativo com aria-expanded/aria-controls,
inicialmente recolhida, mantendo GET e valores dos inputs. Feedback importante
expande a seção; salvar não a recolhe. Não há persistência do estado.
Aceite manual concluído em desktop e mobile aproximadamente 390px, incluindo
mapas, monograma, timestamp, espaçamentos e seção recolhível. A publicação atual
inclui essas funcionalidades.
O RSVP funciona independente do carregamento dos dados.

Funcionalidades administrativas implementadas e publicadas: criação manual de convidados,
configuração do evento e links portáteis para convite/previews. A configuração
do evento é pública pela API, não um armazenamento de dados privados. O convite
publicado consome dinamicamente esses dados; o primeiro consumo foi implementado
no Bloco 4. Requisitos e testes:
[event-config.md](../docs/event-config.md).

O frontend é estático e não carrega arquivos `.env`. A chave **publishable**
(ou **anon** legada) é recebida pelo contrato público validado, por
SUPABASE_PUBLIC_KEY no build ou pelo dev-config.json local. Não edite
app-config.js para inserir destinos ou chaves.
Essa chave é pública e pode ser enviada ao navegador; não use a chave
`service_role`. O Supabase Auth autentica os administradores. As Edge Functions
administrativas validam o JWT e autorizam separadamente o usuário comparando
seu UUID com a lista configurada em `ADMIN_AUTH_USER_IDS` antes de consultar ou
alterar `public.guests`. Um JWT válido não basta: usuário autenticado que não
esteja nessa lista recebe 403.

Os UUIDs autorizados são mantidos somente no secret de backend
`ADMIN_AUTH_USER_IDS`, como uma lista separada por vírgulas; nunca copie essa
lista nem credenciais privilegiadas para o frontend. O cadastro público de
usuários Auth está desativado. Convidados do RSVP não possuem contas Auth;
administradores possuem contas individuais criadas manualmente no Supabase
Dashboard e autorizadas no secret. `service_role` permanece exclusivamente no
backend. Consulte `../docs/admin-guest-management.md` para detalhes da
autorização administrativa.

O cliente `@supabase/supabase-js` é importado como módulo ES da versão fixada
no CDN esm.sh, portanto o navegador precisa de acesso à internet. Nenhuma
dependência npm de frontend ou bundler é necessária. A preparação do artefato
usa Node.js, e o Supabase CLI é uma dependência de desenvolvimento na raiz.
A configuração e as páginas
administrativas devem ser servidas por HTTP; abrir por `file://` não é suportado.

## Configuração pública e publicação portátil

As três páginas usam shared/bootstrap.js e só importam a aplicação após validar
o manifesto da própria origem. app-config.js exporta os valores já validados;
FUNCTIONS_BASE_URL e APP_BASE_URL preservam os contratos e root/subpath.

O preparador exige APP_ENV, SUPABASE_PROJECT_REF, SUPABASE_URL,
SUPABASE_PUBLIC_KEY e PUBLIC_SITE_URL; BUILD_ID é opcional. O manifesto
config/environments.json aprova o ref selecionado. UAT está não provisionado
e bloqueado. Não use placeholders como configuração real.

```text
node scripts/prepare-static-site.mjs
```

Com configuração real aprovada, o comando gera _site novo, copia somente os
recursos de config/public-assets.json e gera runtime-config.json. A consulta
Event Config deriva do projeto validado; redirects são recusados. Falha de rede
preserva título genérico sem trocar backend. UAT recebe homologação/noindex.
O arquivo DEV, testes, snapshots e arquivos operacionais nunca são publicados.

O build pode consultar Event Config do ambiente selecionado; nos testes, todas
as consultas são mocks. Não executar build PRD como teste sem autorização.
Sirva invite-app diretamente em DEV; produção requer o artefato preparado.
O Pages mantém o guard staging e passa a exigir variáveis UAT. Vercel requer
confirmação externa antes de publicar esta arquitetura. Contrato, variáveis,
sessões e provisionamento: [environments.md](../docs/environments.md).

Testes locais, sem rede, na raiz do repositório:

```text
npm run test:node
```

O workflow de testes e `npm run dev:test` usam a mesma seleção, incluindo
paginação e isolamento DEV. Não use o glob como contagem de testes distintos:
ele repete as suítes importadas pelo agregador Admin. Comandos e resultados
vigentes: [testing-strategy.md](../docs/testing-strategy.md) e
[QA DEV](../docs/qa-final-evidence.md#validação-final-do-dev--16102026).
O workflow de testes executa essa suíte além dos testes Deno existentes. O workflow
Pages executa os testes de App Config e do preparador como gate antes da preparação, sem
dependência circular ou duplicação da suíte Deno.

O checkpoint histórico de QA `9d34e6c` aprovou localmente e em Linux/CI
**212 testes Node e 144 Deno (356)**,
incluindo as suítes de movimento, tipografia, wallpaper e nomes no cartão/carta
importadas por `admin-block3.test.mjs`. CI e publicação do commit consolidado
`9d34e6c` estão registrados em [qa-final-evidence.md](../docs/qa-final-evidence.md).
A baseline histórica de **119 Node e 144 Deno (263)** foi
aprovada localmente e em Linux/CI no Bloco 7. A suíte SQL integral foi aprovada
separadamente em banco local
descartável; consulte [event-config.md](../docs/event-config.md#validação-local).

O controle do cartão possui cobertura específica em
`scripts/envelope-motion.test.mjs`: a execução local direta validou a exibição de
“Pausar”, a suspensão da revelação automática, a troca para “Continuar”, a espera
pela conclusão natural do cartão, a proteção contra cliques repetidos e a
restauração do estado ao retornar para a capa. O runner paralelo do Node pode
apresentar `spawn EPERM` no Windows; nesse caso, os arquivos de teste devem ser
executados individualmente, sem tratar a falha do runner como aprovação.


## Modo desenvolvedor

Para trabalhar sem depender da animação do envelope, o projeto aceita um preview estático por configuração ou por parâmetro na URL.

```js
const DEV_PREVIEW = {
  enabled: false,
  target: 'envelope-card'
};
```

Opções suportadas:

- `cover`: mantém a capa normal.
- `envelope-card`: deixa a capa visível, mas com o cartão interno do envelope exposto de forma estática.
- `letter`: inicia diretamente na carta.

Também é possível usar a URL:

```text
?devmode=envelope-card
?devmode=letter
?devmode=cover
```

No preview `?devmode=envelope-card`, o cartão aparece estaticamente e o botão
“Pausar” é exibido apenas para inspeção visual. O clique alterna a apresentação
entre “Pausar” e “Continuar”, mas permanece sem efeito funcional: a sequência não
é iniciada e a carta não é revelada nesse modo.
Nos previews `cover` e `letter`, o controle permanece oculto. Em telas pequenas,
o painel de desenvolvimento ocupa a faixa superior e o controle do cartão fica
ancorado na faixa inferior segura, evitando sobreposição entre os controles.

No fluxo real, “Pausar” aparece quando o cartão começa a sair do envelope. A
animação do cartão continua até o fim, enquanto a revelação automática da carta
é suspensa. O cartão permanece apresentado por tempo indeterminado e o botão
muda para “Continuar”. Ao continuar, a carta é revelada sem reiniciar o
movimento do cartão. Sem interação, os marcos automáticos originais permanecem.
O botão usa navegação nativa por teclado, `focus-visible`, gerenciamento de foco
na carta e respeita `prefers-reduced-motion`.
