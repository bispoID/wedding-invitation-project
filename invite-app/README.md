# Invite app

Aplicação estática inicial do convite virtual.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título e RSVP.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` bloqueia reentrância durante a abertura e `scripts/letter/rsvp.js` aplica um cooldown enquanto o RSVP ainda é local.
- **Modo desenvolvedor:** `scripts/devmode/preview.js` controla os previews estáticos e `styles/devmode/devmode.css` concentra os estilos do painel.
- **Integrações futuras:** API/Edge Function, Supabase e área administrativa serão adicionados em camadas separadas.

Essa estrutura vanilla é suficiente para a Fase 1 e evita adicionar framework ou build system antes de existir uma necessidade real.

## Como visualizar

Abra `index.html` no navegador. A capa permite abrir a carta e o formulário de RSVP exibe um aviso enquanto a integração com o backend ainda não foi implementada.

Os nomes e detalhes do evento são dados iniciais do protótipo e deverão ser substituídos pelos dados finais.


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
