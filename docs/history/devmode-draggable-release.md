# Painel DevMode arrastável — encerramento em 18/11/2026

Com o DevMode ativo, o painel pode ser reposicionado por mouse ou toque usando a alça de seis pontos (duas colunas por três linhas) à esquerda dos controles. Com foco na alça, as teclas direcionais movem o painel. O movimento respeita os limites visíveis da tela, e o painel reajusta a posição após um redimensionamento. Capa, Cartão e Carta continuam alternando o preview, atualizando a URL e o estado `aria-pressed`. Sair encerra o DevMode. O fluxo público sem o parâmetro abre sem painel. [Commit homologado — `469af3a2d10581f5d855da7bba469a1763739375`](https://github.com/bispoID/wedding-invitation-project/commit/469af3a2d10581f5d855da7bba469a1763739375)

A implementação captura o ponteiro ativo, ignora ponteiros secundários e encerra o arraste ao soltar, cancelar ou perder a captura. Ao sair ou recriar o painel, remove os listeners e desconecta o observador de tamanho. O CSS mantém a alça à esquerda quando os botões quebram de linha. [Controle do painel](../../invite-app/scripts/devmode/preview.js) · [Estilos](../../invite-app/styles/devmode/devmode.css)

## Validação em DEV

Passaram 427 testes Node, as verificações de sintaxe JavaScript e as de whitespace. A suíte cobriu arraste, contenção nas quatro bordas, cancelamento, limpeza de listeners e movimentação por teclado. A validação visual e funcional em Chrome automatizado cobriu larguras de 320, 375, 768, 1366 e 1920 px, com mouse e touch emulado. [Testes do painel e do envelope](../../scripts/envelope-motion.test.mjs) · [CI da implementação](https://github.com/bispoID/wedding-invitation-project/actions/runs/44230777581)

## Homologação e publicação

| Ambiente | Publicação e verificação do mesmo SHA |
| --- | --- |
| UAT | A promoção por fast-forward para `staging` acionou o CI e o deployment do GitHub Pages. Ambos passaram. O runtime serviu `appEnv=uat` e o SHA homologado em `buildId`. [CI de staging](https://github.com/bispoID/wedding-invitation-project/actions/runs/44231816353) · [Deployment UAT](https://github.com/bispoID/wedding-invitation-project/actions/runs/44231816427) |
| PRD | Após o aceite de UAT, a promoção por fast-forward para `production` publicou o mesmo SHA. O CI passou e a Vercel reportou o deployment `dpl_749oGeDX29XC9TBbRF2nxQa7Qr4e` em estado `READY`. O runtime serviu `appEnv=prd` e o SHA homologado em `buildId`. [CI de production](https://github.com/bispoID/wedding-invitation-project/actions/runs/44232319696) · [Domínio PRD](https://bruna-e-diego.vercel.app/) |

Nos dois ambientes, a página respondeu HTTP 200 e os hashes dos 77 recursos verificados coincidiram com os do commit. O smoke test percorreu capa, envelope, cartão e carta, observou o avanço da contagem regressiva e retornou à capa. As verificações usaram somente requisições de leitura.

No Chrome, o painel passou nas verificações de arraste por mouse e touch emulado, teclado, contenção, redimensionamento e uso dos quatro controles em 320, 375, 768 e 1366 px. Em PRD, a primeira asserção de teclado logo após o toque falhou. Na repetição, o teste aguardou o fim do gesto antes de enviar a tecla e confirmou o deslocamento de 16 px nas quatro larguras.

## Aceites humanos e limites

Em 18/11/2026, o responsável confirmou o aceite manual e visual em DEV e os aceites manuais em UAT e PRD. O relato de aceite não especificou dispositivos, navegadores, versões ou tecnologias assistivas. A cobertura técnica de toque descrita acima utilizou emulação no Chrome.
