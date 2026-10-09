# QA final — evidências técnicas e manuais

Consolidação: **09/10/2026**. Projeto: `wedding-invitation-project`.
Branch: `feature/landing-page`.
HEAD de referência: `1d9939a28d27c83e9eb7f3336378f6aaa1c698ac`.

As correções de QA e este registro estão no working tree, ainda sem commit ou
publicação. O HEAD identifica a referência anterior, não a versão consolidada.
O [roadmap](development_roadmap.md) é a fonte oficial do estado das 13 fases.

## Origem e alcance das evidências

- **Execução técnica nesta consolidação:** revisão de todos os diffs e arquivos
  novos, testes Node/Deno, typecheck, syntax checks e whitespace locais.
- **Aceite manual informado:** resultados relatados pelo responsável pelo QA
  durante os testes de navegador. Não foram repetidos pelo agente nesta execução;
  não há nova captura de tela ou matriz de versões dos navegadores anexada aqui.
- **Histórico operacional:** os checkpoints anteriores registram CI, publicação
  e suíte SQL local. Esses resultados não representam CI ou deploy das correções
  ainda não commitadas.

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
- A versão consolidada ainda precisa de CI e verificação após publicação.

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
continua como evidência histórica no roadmap. **Não houve nova execução de CI
desta consolidação**, pois não houve push.

A suíte SQL local aprovada no Bloco 7 permanece válida como registro anterior.
Não foi repetida: nenhuma migration ou schema foi alterado durante este QA.

## Encerramento e publicação

Os aceites informados e os gates locais sustentam o encerramento das Fases 9 e
12 no escopo validado, com os limites de cobertura acima. A Fase 13 permanece
parcial até publicar e verificar a versão consolidada.

Após autorização específica para commit/publicação:

1. Revisar e versionar o conjunto exato de arquivos de QA e documentação.
2. Exigir sucesso do workflow `Test baseline` para o commit consolidado.
3. Publicar pelo workflow previsto e verificar sucesso do deploy.
4. Verificar a versão publicada: abertura e navegação por teclado, foco do RSVP,
   estados de Acompanhantes sem enviar RSVP sintético, redução de movimento,
   wallpaper e nomes usuais/longos nos componentes afetados. Usar fixtures
   locais de inspeção para nomes sintéticos, sem editar dados reais do evento.
5. Registrar SHA, runs de CI/deploy e resultado do aceite da publicação antes
   de concluir a Fase 13.

Nesta execução não houve staging, commit, push, deploy, consulta/escrita de dados
remotos ou envio de RSVP. Supabase, banco, migrations, Functions, Auth, secrets,
Google Sheets e UptimeRobot não foram modificados.
