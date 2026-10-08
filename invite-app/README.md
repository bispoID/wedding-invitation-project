# Invite app

Aplicação estática inicial do convite virtual.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título e RSVP.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` bloqueia reentrância durante a abertura e `scripts/letter/rsvp.js` envia o RSVP à Supabase Edge Function.
- **Modo desenvolvedor:** `scripts/devmode/preview.js` controla os previews estáticos e `styles/devmode/devmode.css` concentra os estilos do painel.
- **Área administrativa:** `admin/` mantém o login Supabase Auth, a listagem de convidados restrita ao administrador por Edge Function e uma seção de contingência independente do fluxo público do convite e RSVP.

Essa estrutura vanilla é suficiente para a Fase 1 e evita adicionar framework ou build system antes de existir uma necessidade real.

## Como visualizar

Sirva a pasta `invite-app` por HTTP (por exemplo, com o Live Server do VS Code) e acesse `index.html`. A área administrativa fica em `admin/login.html`.

Os nomes e detalhes do evento são dados iniciais do protótipo e deverão ser substituídos pelos dados finais.

## Configuração da área administrativa

O frontend é estático e não carrega arquivos `.env`. Antes de usar o login, copie
a chave **publishable** (ou a chave legada **anon**) do Supabase Dashboard para
`admin/scripts/supabase-config.js`, na constante `SUPABASE_PUBLIC_KEY`.
Essa chave é pública e pode ser enviada ao navegador; não use a chave
`service_role`. A listagem e as alterações administrativas de convidados são
servidas por Edge Functions que validam o JWT e o UUID de administrador antes
de consultar ou alterar `public.guests`.

O cliente `@supabase/supabase-js` é importado como módulo ES da versão fixada
no CDN esm.sh, portanto o navegador precisa de acesso à internet. Nenhuma
dependência npm ou etapa de build foi adicionada. A configuração e as páginas
administrativas devem ser servidas por HTTP; abrir por `file://` não é suportado.


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
