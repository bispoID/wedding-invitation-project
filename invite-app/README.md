# Invite app

Aplicação estática inicial do convite virtual.

## Arquitetura

- **Apresentação:** `index.html`, com HTML semântico e acessível.
- **Estilos:** `styles/main.css`, que importa tokens (`styles/base/variables.css`), fontes, base, componentes e responsividade mobile-first.
- **Comportamento:** `scripts/main.js`, que inicializa os módulos de envelope, título e RSVP.
- **Tokens compartilhados:** os tempos e curvas de movimento ficam em `styles/base/variables.css`; `scripts/shared/css.js` permite que o JavaScript reutilize esses valores.
- **Assets de estilo:** imagens usadas pelo CSS também ficam centralizadas como tokens `--asset-*` em `styles/base/variables.css`.
- **Interações:** `scripts/welcome/envelope.js` bloqueia reentrância durante a abertura e `scripts/letter/rsvp.js` aplica um cooldown enquanto o RSVP ainda é local.
- **Integrações futuras:** API/Edge Function, Supabase e área administrativa serão adicionados em camadas separadas.

Essa estrutura vanilla é suficiente para a Fase 1 e evita adicionar framework ou build system antes de existir uma necessidade real.

## Como visualizar

Abra `index.html` no navegador. A capa permite abrir a carta e o formulário de RSVP exibe um aviso enquanto a integração com o backend ainda não foi implementada.

Os nomes e detalhes do evento são dados iniciais do protótipo e deverão ser substituídos pelos dados finais.


## Modo desenvolvedor

Para trabalhar diretamente na seção `letter` sem precisar abrir o envelope a cada carregamento, o projeto possui a configuração `DEV_SKIP_WELCOME` em `scripts/main.js`.

```js
const DEV_SKIP_WELCOME = true;
```

- `true`: inicia diretamente na carta.
- `false`: restaura o fluxo normal, iniciando pela capa/envelope.

Mesmo com o modo desenvolvedor ativado, o botão **Voltar para a capa** continua funcionando normalmente, permitindo testar a abertura do envelope quando necessário.
