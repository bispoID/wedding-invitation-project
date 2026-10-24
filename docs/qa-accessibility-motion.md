# Regressões de foco RSVP e movimento reduzido — Etapa 5D.1

## Contrato

- Inputs e select do RSVP compartilham `:focus-visible`, contorno de 2px em
  `--color-heading` e afastamento de 4px. Outline não altera a geometria dos
  campos. O reset sem foco, required, disabled e a validação RSVP permanecem.
- Sem redução de movimento, os tokens CSS, keyframes e tempos JS permanecem:
  pausa inicial 600ms, início do cartão 4700ms após essa pausa, movimento do
  cartão 3300ms e passagem automática para a carta 9500ms após a pausa.
- Com `prefers-reduced-motion: reduce`, os tempos efetivos JS são zero e o
  atraso CSS residual da aba/sombra também é eliminado. O cartão fica retido
  automaticamente; o mesmo controle mostra **Continuar** e recebe foco.
  Não há prazo automático para acioná-lo. A retenção equivale à espera já
  solicitada, evitando um botão Pausar impossível de usar numa janela curta.
- Continuar usa a máquina de estados existente e só revela a carta após a
  conclusão do cartão. Carta e retorno à capa preservam a transferência de foco.
- A preferência é capturada em cada abertura. Assim como antes, não há listener
  que ressincronize timers de uma abertura já em curso. CSS e decorações mantêm
  seus mecanismos existentes; a abertura seguinte lê a preferência atual.
- Cancelamento e `flowRunId` continuam impedindo callbacks antigos após reset,
  inclusive nos controles de preview. Não há dependência de `animationend`.

## Regressões sem navegador

`npm run test:node` inclui `scripts/envelope-motion.test.mjs` por meio de
`scripts/admin-block3.test.mjs`. A suíte usa relógio controlado, sem sleeps reais:

- Tempos normais, abertura automática, Pausar próximo ao deadline e Continuar
  antes/depois da conclusão do cartão.
- Click, Enter e espaço; ativações repetidas e foco final.
- Cartão reduzido imediato, retenção sem timeout, retorno e nova abertura.
- Preferência diferente na abertura seguinte.
- Reset de preview e execução deliberada de callbacks obsoletos, que não podem
  afetar a abertura atual.
- Semântica e CSS de foco como verificação complementar, não substituto do browser.

A suíte Deno permanece independente de navegador e rede:

```sh
deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts
```

## Regressão real em navegador, sem chamadas remotas

`scripts/accessibility-browser.mjs` é uma ferramenta opcional; não instala
dependências nem é executada implicitamente pelo CI Node. Requer Playwright
já disponível e os executáveis Edge e Chrome. Em PowerShell:

```powershell
$env:QA_PLAYWRIGHT_MODULE = '<caminho absoluto para o módulo playwright existente>'
node scripts/accessibility-browser.mjs
```

Se necessário, definir `QA_EDGE_EXECUTABLE` e `QA_CHROME_EXECUTABLE`. Os defaults
são os caminhos usuais de instalação Windows; ausência de requisito é falha,
nunca instalação ou skip silencioso.

O executor prepara um artefato **local** em `.dev/qa/stage5d1/`, com BUILD_ID
diagnóstico `local-qa-5d1-not-a-published-commit` e chave pública inteiramente
sintética. Não representa o GitHub Pages publicado nem um SHA com CI remoto.

A origem lógica Pages conserva o contrato UAT, mas todas as rotas são atendidas
localmente: arquivos do artefato ou GET da Event Config fictícia em memória.
Não existe `route.continue`/fetch remoto, login ou envio de RSVP. Demais destinos
e todos os métodos de escrita são bloqueados antes da navegação. Service workers
ficam bloqueados; os contextos são temporários e encerrados em finally.

A matriz cobre Edge/Chrome × normal/reduce × 1365×900/390×844. Verifica:

- Contorno computado, cor, geometria, Tab/Shift+Tab, select, botão e disabled.
- Capturas do foco real, não somente correspondência textual de CSS.
- Tempos normais e durações CSS; cartão reduzido disponível em menos de 1,5s,
  sem continuação automática, inclusive após avançar o relógio em 60s.
- Selo, cartão, carta, foco, repetição, retorno, preview e overflow horizontal.
- Artefato de 71 arquivos, igualdade com os assets locais e ausência de chaves
  privilegiadas; zero rede real e zero tentativas de escrita.

JSONs e capturas ficam ignorados pelo Git. Aceite visual humano das correções,
aparelhos físicos, CI do novo commit e publicação UAT são etapas separadas.
