# Invite app

Aplicação estática do convite virtual, com RSVP e área administrativa integrados.
GitHub Pages é a hospedagem atual/canônica; Vercel é uma alternativa futura e
opcional. A arquitetura deve permanecer independente do provedor estático.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título e RSVP.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` bloqueia reentrância durante a abertura e `scripts/letter/rsvp.js` envia o RSVP à Supabase Edge Function.
- **Modo desenvolvedor:** `scripts/devmode/preview.js` controla os previews estáticos e `styles/devmode/devmode.css` concentra os estilos do painel.
- **Área administrativa:** `admin/` mantém o login Supabase Auth, a listagem de convidados restrita ao administrador por Edge Function e uma seção de contingência independente do fluxo público do convite e RSVP.

Essa estrutura vanilla atende à aplicação atual e evita adicionar framework ou
build system antes de existir uma necessidade real. A interface e a integração
já possuem implementação significativa, mas o aceite final permanece pendente
no roadmap.

## Como visualizar

Sirva a pasta `invite-app` por HTTP (por exemplo, com o Live Server do VS Code) e acesse `index.html`. A área administrativa fica em `admin/login.html`.

Os nomes e detalhes do evento ainda são dados do protótipo versionados no HTML.
A retirada dos dados reais/configuráveis do código por meio de `event_config`
está aprovada para implementação futura; ela não foi realizada neste lote.

## Configuração da área administrativa

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
dependência npm ou etapa de build foi adicionada. A configuração e as páginas
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

Para publicar em root, use, por exemplo, `https://example.vercel.app/`.
Sirva/publice o conteúdo de `_site`, não os marcadores do source. Em desenvolvimento,
continue servindo `invite-app`: os marcadores não participam do comportamento do
convite, mas os metadados de compartilhamento só ficam prontos no artefato.

No Pages, a URL operacional vem de `actions/configure-pages`; a política de
publicação continua na branch `feature/landing-page`. A branch de desenvolvimento
não ganha trigger de deploy. Vercel permanece opcional; não há bundler ou leitura
de `.env` pelo browser. `event_config` e a retirada dos dados personalizados
continuam futuros.

Testes locais, sem rede, na raiz do repositório:

```text
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs
```

O workflow de testes executa essa suíte além dos testes Deno existentes. O workflow
Pages executa os mesmos testes Node como gate simples antes da preparação, sem
dependência circular ou duplicação da suíte Deno.


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
