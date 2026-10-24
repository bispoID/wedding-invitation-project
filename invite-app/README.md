# Invite app

Aplicação estática do convite, com RSVP e administração via Edge Functions.
DEV é local, UAT está no GitHub Pages e PRD na Vercel. Destinos e publicação:
[environments.md](../docs/environments.md); estado: [roadmap](../docs/development_roadmap.md#estado-atual).

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

Prepare o DEV isolado com `npm run dev:up` e sirva `invite-app` por HTTP.
O arquivo ignorado `dev-config.json` é obrigatório nos hosts locais; não há
fallback para PRD. A área administrativa fica em `admin/login.html`.
Setup, portas e emulador: [local-development.md](../docs/local-development.md).

Os nomes e detalhes do evento são carregados pela Function pública `event-config`,
sem dados pessoais de fallback no HTML. O mesmo consumo dinâmico está presente
na versão publicada.

## Configuração da área administrativa

O painel oferece CRUD de convidados, métricas globais, Event Config e
contingência. Contratos e limites: [admin-guest-management.md](../docs/admin-guest-management.md)
e [event-config.md](../docs/event-config.md). A configuração do evento tem 14
campos públicos, com localização independente da recepção; não contém secrets.
O frontend consulta Event Config uma vez por página; falhas não trocam backend
nem impedem o RSVP. Monograma e imagem social são assets estáticos.

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
SUPABASE_PUBLIC_KEY e PUBLIC_SITE_URL. O manifesto
config/environments.json aprova os projetos independentes UAT/PRD. BUILD_ID
é opcional no contrato genérico, mas obrigatório nos pipelines publicados:
Pages exige o SHA completo e o wrapper Vercel o deriva do commit Git.

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
Pages usa staging e variáveis UAT; Vercel usa production. Contrato, variáveis,
sessões e procedimento de publicação/rollback: [environments.md](../docs/environments.md).

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

Contagens históricas, publicação e aceites estão em
[qa-final-evidence.md](../docs/qa-final-evidence.md). SQL local:
[event-config.md](../docs/event-config.md#validação-local).

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
O botão usa teclado nativo, `focus-visible` e transferência de foco à carta.
Com `prefers-reduced-motion: reduce`, o cartão aparece sem os atrasos normais,
fica retido sem timeout e **Continuar** recebe foco; só a ação explícita abre a carta.
Contrato e regressões: [qa-accessibility-motion.md](../docs/qa-accessibility-motion.md).
