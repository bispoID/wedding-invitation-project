# Invite app

Aplicação estática do convite virtual, com RSVP e área administrativa integrados.
Inicialmente, o artefato foi publicado no GitHub Pages. A arquitetura do frontend
permanece independente do provedor de hospedagem, permitindo sua publicação em
outros serviços compatíveis, como Vercel, Cloudflare Pages ou Netlify, sem
alterações nas regras de negócio.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título, RSVP e Event Config.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` bloqueia reentrância durante a abertura e `scripts/letter/rsvp.js` envia o RSVP à Supabase Edge Function.
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

O frontend público está integrado na branch `feature/landing-page` e publicado.
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
`images/previa-link-envelope.webp`; os markers PUBLIC_SITE_URL permanecem.
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

O frontend é estático e não carrega arquivos `.env`. Antes de usar o login, copie
a chave **publishable** (ou a chave legada **anon**) do Supabase Dashboard para
`scripts/shared/app-config.js`, na constante `SUPABASE_PUBLIC_KEY`.
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

`scripts/shared/app-config.js` centraliza `SUPABASE_URL` e
`SUPABASE_PUBLIC_KEY`. `FUNCTIONS_BASE_URL` é derivada pela API URL; o RSVP
mantém seu contrato e o admin mantém Auth/sessão. `APP_BASE_URL` é derivada de
`import.meta.url`, dois diretórios acima do módulo, preservando root e subpath.
Nomes das Functions continuam contratos locais, não configuração do evento.

Na raiz do repositório, execute o preparador com `PUBLIC_SITE_URL` definida:

```powershell
$env:PUBLIC_SITE_URL = 'https://example.github.io/wedding-invitation-project/'
node scripts/prepare-static-site.mjs
```

Ele copia `invite-app` para um `_site` novo e resolve somente os marcadores
`__PUBLIC_SITE_URL__` e `__PUBLIC_SHARE_IMAGE_URL__` nos metadados canonical,
Open Graph e Twitter. Não modifica o HTML-fonte, os textos ou as imagens.
URL HTTP(S) absoluta é obrigatória; credenciais, query e fragmento são rejeitados.
Uma barra final é normalizada. Destino existente é recusado, sem limpeza automática.

Para publicar em root, use a URL operacional do provedor escolhido, por exemplo,
`https://example.net/`. As fixtures também cobrem `https://example.vercel.app/`
como exemplo concreto de portabilidade, não como destino preferencial.
Sirva/publice o conteúdo de `_site`, não os marcadores do source. Em desenvolvimento,
continue servindo `invite-app`: os marcadores não participam do comportamento do
convite, mas os metadados de compartilhamento só ficam prontos no artefato.

No Pages, a URL operacional vem de `actions/configure-pages`; a política de
publicação continua na branch `feature/landing-page`. A branch de desenvolvimento
não ganha trigger de deploy. Não há bundler ou leitura
de `.env` pelo browser. O consumo de `event_config` e a retirada dos dados pessoais
hardcoded foram implementados no Bloco 4 e estão incluídos na publicação atual.

Testes locais, sem rede, na raiz do repositório:

```text
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/event-config.test.mjs
```

O workflow de testes executa essa suíte além dos testes Deno existentes. O workflow
Pages executa os testes de App Config e do preparador como gate antes da preparação, sem
dependência circular ou duplicação da suíte Deno.

O QA consolidado aprovou localmente e em Linux/CI **212 testes Node e 144 Deno (356)**,
incluindo as suítes de movimento, tipografia, wallpaper e nomes no cartão/carta
importadas por `admin-block3.test.mjs`. CI e publicação do commit consolidado
`9d34e6c` estão registrados em [qa-final-evidence.md](../docs/qa-final-evidence.md).
A baseline histórica de **119 Node e 144 Deno (263)** foi
aprovada localmente e em Linux/CI no Bloco 7. A suíte SQL integral foi aprovada
separadamente em banco local
descartável; consulte [event-config.md](../docs/event-config.md#validação-local).


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

Esse modo foi pensado para inspeção de layout e ajustes visuais sem precisar executar a sequência de abertura a cada carregamento.
