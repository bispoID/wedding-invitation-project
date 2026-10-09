# QA final — evidências técnicas e manuais

Consolidação: **09/10/2026**. Projeto: `wedding-invitation-project`.
Branch: `feature/landing-page`.
HEAD de referência: `1d9939a28d27c83e9eb7f3336378f6aaa1c698ac`.

O HEAD acima identifica a referência anterior à consolidação. As correções de
QA foram versionadas e publicadas no commit
`9d34e6c8c79c5553f8fc3177a5becca53a5a32db`; os resultados estão na seção de
publicação abaixo. O responsável confirmou o aceite visual final dessa
publicação em 09/10/2026, conforme o registro de encerramento.
O [roadmap](development_roadmap.md) é a fonte oficial do estado das 13 fases.

## Origem e alcance das evidências

- **Execução técnica na consolidação local:** revisão de todos os diffs e arquivos
  novos, testes Node/Deno, typecheck, syntax checks e whitespace locais.
- **Aceite manual informado:** resultados relatados pelo responsável pelo QA
  durante os testes de navegador. Não foram repetidos pelo agente nesta execução;
  não há nova captura de tela ou matriz de versões dos navegadores anexada aqui.
- **Histórico operacional:** os checkpoints anteriores registram CI, publicação
  e suíte SQL local. São distintos das novas execuções de CI e Pages do commit
  consolidado, registradas abaixo.

Automação com DOM, fontes, geometria e timers simulados verifica contratos e
regressões; não comprova renderização, contraste ou compatibilidade universal.

## Evidências manuais relatadas

| Grupo | Cenários | Resultado informado |
| --- | --- | --- |
| A — teclado e funcionalidade | Abertura por teclado; navegação pela carta; foco visível no select do RSVP; funcionamento do formulário; login e dashboard administrativos | Aprovados pelo responsável pelo QA |
| B — movimento | Redução de movimento na capa, selo, flores e envelope; redução de movimento no conteúdo da carta | Aprovados pelo responsável pelo QA |
| C — responsividade | Nomes longos na capa; estratégia híbrida; cobertura do papel de parede; nomes longos no cartão e na carta; zoom de 200%; largura de 65% no cartão | Aprovados pelo responsável pelo QA |
| D — navegadores/dispositivo | Edge Desktop, Chrome Desktop, Firefox Desktop e celular real | Aprovados pelo responsável pelo QA |

As larguras **320, 375, 390, 699, 700 e 1000 px** foram informadas para os
cenários relatados. Não foi fornecido um cruzamento completo de cada largura
com cada cenário, navegador e dispositivo; este registro não presume esse
produto cartesiano.

O aceite do foco do RSVP e da coerência Presença/Acompanhantes foi relatado em
Edge Desktop local durante as correções. Os resultados dos outros grupos são
consolidados conforme o relato, sem atribuir ambiente local/publicado a cada
caso quando essa informação não foi especificada.

### Limitações de cobertura

- Versões dos navegadores desktop não especificadas.
- Navegador e sistema operacional do celular real não especificados.
- **Safari/iOS não têm evidência específica de teste**; não são declarados
  aprovados, nem inferidos a partir do aceite em celular real.
- Não há evidência específica de redução de movimento no celular real, nem
  matriz dessa preferência por navegador. É uma limitação de cobertura, não
  uma falha confirmada.
- Palavras sem espaços, erros de medição, métricas de fontes tardias e alguns
  formatos extremos de viewport têm regressões simuladas; isso não significa
  que cada um recebeu aceite visual manual.
- CI, Pages e smoke checks estáticos da versão consolidada passaram. O
  responsável também confirmou o aceite visual final após testar a publicação.
  Não foram especificados novos navegadores, versões ou dispositivos nesse
  aceite; os limites de cobertura anteriores permanecem.

## Revisão técnica das correções acumuladas

- **RSVP:** `:focus-visible` explícito no select, usando token existente;
  Acompanhantes habilitado com presença vazia/Sim, zerado e desabilitado em Não,
  com diferenciação visual. O payload normaliza ausência para zero mesmo com
  campo excluído do `FormData`; o reset após HTTP 201 restaura vazio/zero/habilitado.
  A seleção obrigatória, limites 0–15, erros e bloqueio de envio duplicado seguem
  cobertos. Contrato HTTP e backend não foram alterados.
- **Selo/flores:** a animação da Web Animations API consulta a preferência de
  movimento a cada abertura; em `reduce`, cancela movimento decorativo anterior
  e conserva os assets estáticos. Em `no-preference`, keyframes e tempos
  originais permanecem. Abertura e retorno com foco estão cobertos por simulação.
- **Capa:** tipografia híbrida somente quando a composição original exigiria
  fonte inferior ao piso legível; medição invisível com remoção da sonda,
  atualização por conteúdo/fontes/resize, preservando o caminho dos nomes usuais.
- **Papel de parede:** cobertura proporcional; capa cresce com o conteúdo em
  mobile compacto; `overflow: clip` evita extensão rolável apenas decorativa
  abaixo do fundo. As regressões de geometria são modelos, não screenshots.
- **Cartão/carta:** estados específicos de nomes longos, quebras controladas,
  preservação dos spans, separador e ornamentos; sem regra global nova de
  `.script-name` e sem mudança no contrato de Event Config.
- **Ajuste de 65%:** a regra manual em
  `.envelope__card-names.has-long-names` foi preservada. Nesta consolidação,
  o limite de medição do cartão foi alinhado de `0.72` para `0.65`, e o teste
  de CSS/limiar foi atualizado. A fixture de 225 px detecta retorno indevido ao
  limite antigo. O alinhamento foi validado por automação; não houve novo aceite
  de navegador pelo agente após essa alteração.

Não foram encontrados conflitos de merge, arquivos de QA dispensáveis ou
regressões nos gates executados. A inspeção seguiu o roteiro conservador do
frontend: imports/cascata, seletores e foco foram preservados, sem refatoração
de componentes alheios ao QA.

## Regressão executada nesta consolidação

Ambiente: Windows, Node.js **22.14.0**, Deno **2.9.7**.

| Gate | Resultado observado |
| --- | --- |
| Node completo | **212 aprovados**, 0 falhas, 0 ignorados/cancelados |
| Deno completo | **144 aprovados**, 0 falhas |
| Total de testes | **356 aprovados** |
| Typecheck | 8 entrypoints aprovados |
| Syntax | 26 arquivos `.js` + 9 `.mjs`: 35 aprovados |
| Whitespace | `git diff --check` e inspeção dos arquivos novos aprovados |

```text
node --test scripts/app-config.test.mjs scripts/prepare-static-site.test.mjs scripts/admin-block3.test.mjs scripts/event-config.test.mjs

deno test --no-prompt --deny-net --allow-env=GOOGLE_SERVICE_ACCOUNT_JSON_B64,GOOGLE_SPREADSHEET_ID supabase/functions invite-app/admin/scripts/guest-metrics.test.ts

deno check supabase/functions/rsvp/index.ts supabase/functions/health/index.ts supabase/functions/admin-list-guests/index.ts supabase/functions/admin-manage-guests/index.ts supabase/functions/admin-list-contingency/index.ts supabase/functions/admin-recover-contingency/index.ts supabase/functions/event-config/index.ts supabase/functions/admin-manage-event-config/index.ts

node --check <cada JavaScript versionado ou novo e cada scripts/*.mjs>
git diff --check
```

As quatro suítes novas (`envelope-motion`, `welcome-typography`,
`welcome-wallpaper`, `invitation-names`) são importadas por
`admin-block3.test.mjs`: o comando completo as executa sem duplicar a contagem.
O acréscimo em relação à baseline histórica de 119 Node é de 93 testes.

O primeiro runner Deno no isolamento do Windows falhou com panic de named pipe
antes das asserções. A repetição integral fora do isolamento passou, mantendo
`--deny-net` e as mesmas permissões restritas. Não foi usado `--no-run` como
substituto de execução. O aviso Node `MODULE_TYPELESS_PACKAGE_JSON` não impede
os testes; não foi alterado o modo de módulos global para suprimi-lo.

A baseline de **144 Deno + 119 Node = 263** aprovada no Linux/CI do Bloco 7
continua como evidência histórica no roadmap. Na consolidação local ainda não
havia push; o checkpoint de publicação posterior confirmou a nova suíte em
Linux, conforme o registro abaixo.

## Publicação do QA — 09/10/2026

Commit: `9d34e6c8c79c5553f8fc3177a5becca53a5a32db`.
Mensagem: `feat(ui): finalize accessibility and responsive QA`.
Conjunto: exatamente 20 arquivos, sem alterações de backend ou workflows.
Push para `origin feature/landing-page` aprovado e branch sincronizada.

- **Test baseline: SUCCESS**, execução
  [37982999446](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999446).
  Os logs confirmaram Ubuntu 24.04.5, 26 syntax checks de JavaScript,
  **212 Node e 144 Deno, zero falhas**, além de whitespace aprovado.
  Typecheck dos oito entrypoints permanece como evidência local, não como
  etapa adicional presumida do CI.
- **Deploy invite-app to GitHub Pages: SUCCESS**, execução
  [37982999447](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999447).
  Gate portátil: **26 testes Node aprovados**, zero falhas. Preparação de
  `_site`, upload e publicação concluídos para o mesmo SHA.
- URL: [convite publicado](https://bispoid.github.io/wedding-invitation-project/).

### Smoke checks operacionais

Verificação principal em **09/10/2026, 19:52:33 UTC** (16:52:33 em
America/Sao_Paulo), seguida de confirmação nas URLs normais sem parâmetros.
Somente GET de arquivos estáticos; nenhum JavaScript da página foi executado.

- HTTP **200** na raiz pública, `admin/`, `admin/index.html` e `admin/login.html`.
- **64 arquivos** retornaram HTTP 200 e corresponderam por SHA-256 aos bytes
  do commit: os **44 CSS/JS**, três HTML e 17 imagens/fontes referenciadas.
  Para o HTML público, a comparação utilizou o resultado exato de
  `resolveMetadata` aplicado ao source, como faz o preparador de publicação.
- **76 referências relativas** de imports, CSS e HTML resolveram para arquivos
  existentes; os recursos identificados foram verificados por HTTP.
- `scripts/shared/invitation-names.js`, `scripts/welcome/typography.js` e seus
  imports estão disponíveis. CSS com largura de 65%, cálculo JS de 0.65,
  foco visível, estado disabled, wallpaper e nomes longos foi confirmado.
- Canonical, Open Graph e Twitter correspondem ao HTML preparado; nenhum
  marcador `__PUBLIC_*__` permaneceu. A imagem de compartilhamento retornou 200.

Esses checks confirmam disponibilidade e integridade da publicação, **não
renderização visual, execução do login/Admin ou aceite funcional em navegador**.
Não houve RSVP, chamadas à API Supabase ou operações administrativas.

A suíte SQL local aprovada no Bloco 7 permanece válida como registro anterior.
Não foi repetida: nenhuma migration ou schema foi alterado durante este QA.

## Encerramento e publicação

Os aceites informados e os gates locais sustentam o encerramento das Fases 9 e
12 no escopo validado, com os limites de cobertura acima. Em 09/10/2026, o
responsável pelo QA respondeu à solicitação de aceite final no navegador:

> Aprovado após testar a versão publicada

A solicitação identificava a URL publicada e os cenários de abertura,
teclado/foco, RSVP sem enviar, redução de movimento e responsividade. Esta é
uma confirmação manual do responsável; o agente não repetiu o teste visual nem
presume execução de cenários adicionais, envio de RSVP ou operações do Admin.

A referência da publicação no registro é
`47439eee7357e16bcb3ca845d5e1537c7f25849f`, com a mesma implementação de interface
de `9d34e6c`; a diferença é exclusivamente documental. Esse checkpoint também
teve [CI 37983470306](https://github.com/bispoID/wedding-invitation-project/actions/runs/37983470306)
e [Pages 37983470523](https://github.com/bispoID/wedding-invitation-project/actions/runs/37983470523)
aprovados. Os logs repetiram 212 Node + 144 Deno sem falhas, 26 syntax checks e
whitespace aprovado; o gate Pages executou 26 testes. Os smoke checks posteriores
confirmaram 65 arquivos por HTTP/SHA-256, incluindo o README publicado, e as
mesmas 76 referências relativas, sem executar JavaScript ou APIs de produção.

Com publicação, regressão, smoke checks e aceite final registrados, a Fase 13
está concluída e o escopo das 13 fases do roadmap está integralmente encerrado.
Os limites de cobertura acima não foram apagados nem tratados como aprovação
universal. O commit de encerramento altera somente documentação.

Andamento do checkpoint autorizado de publicação:

1. Concluído: revisar e versionar o conjunto exato de 20 arquivos.
2. Concluído: sucesso do workflow `Test baseline` para o commit consolidado.
3. Concluído: publicação pelo workflow previsto e smoke checks aprovados.
4. Concluído: confirmação explícita do aceite visual final pelo responsável
   após testar a versão publicada, conforme o relato acima.
5. Concluído: SHA, runs, resultados operacionais e aceite final registrados,
   permitindo o encerramento da Fase 13.

Na consolidação local anterior não houve staging, commit, push ou deploy. O
checkpoint posterior autorizou commit, push e publicação de frontend, realizados
conforme o registro acima. Não houve consulta/escrita de dados remotos ou envio
de RSVP. Supabase, banco, migrations, Functions, Auth, secrets, Google Sheets e
UptimeRobot não foram modificados.
