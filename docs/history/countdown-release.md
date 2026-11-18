# Contagem regressiva do casamento — encerramento em 18/11/2026

A carta exibe os dias, horas, minutos e segundos entre os detalhes do evento e o local da cerimônia. O contador recebe `event_date` e `event_time` da Event Config já validada e interpreta o horário em `America/Sao_Paulo`. A cada segundo e ao retornar à aba, recalcula o tempo restante pelo relógio atual, sem nova consulta à API. Se a configuração estiver indisponível ou inválida, o componente permanece oculto. Ao alcançar o horário, encerra o temporizador e exibe “O grande dia chegou!”. [Commit homologado e publicado — `1aa8ac15fd622483575efc7d7dfd509e024e3674`](https://github.com/bispoID/wedding-invitation-project/commit/1aa8ac15fd622483575efc7d7dfd509e024e3674)

## Validação automatizada em DEV

Passaram 425 testes Node e 165 Deno. A suíte Node cobriu as transições entre unidades, fusos do visitante, retorno à aba, instante exato e evento passado com relógio simulado. Também verificou a ausência de temporizadores duplicados e de consultas adicionais. O CI da branch de desenvolvimento aprovou o candidato. [CI da feature](https://github.com/bispoID/wedding-invitation-project/actions/runs/44225481351)

No Chrome automatizado, a carta em `?devmode=letter` foi verificada em larguras de 320, 768 e 1365 px, com Event Config simulada e cenários de movimento normal e reduzido. A correção da coluna “Segundos” eliminou o transbordamento observado a 320 px. A inspeção incluiu a árvore de acessibilidade. O temporizador usa `aria-live="off"` e a mensagem final ocupa uma região com `role="status"`.

## Homologação e publicação

| Ambiente | Evidência da publicação do mesmo SHA |
| --- | --- |
| UAT | Promoção por fast-forward para `staging`. O GitHub Pages publicou o candidato após a aprovação do CI. [CI de staging](https://github.com/bispoID/wedding-invitation-project/actions/runs/44226316174) · [Deployment UAT](https://github.com/bispoID/wedding-invitation-project/actions/runs/44226316246) |
| PRD | Após o aceite de UAT, promoção por fast-forward para `production`. A Vercel confirmou o deployment `dpl_2BqozWTAg96vYCe6rveiMAygvq2A` em estado `READY`, com o SHA homologado. [CI de production](https://github.com/bispoID/wedding-invitation-project/actions/runs/44226785398) |

Na conferência técnica em Chrome dos dois sites publicados, cada domínio respondeu HTTP 200 e serviu o runtime do próprio ambiente, com o SHA homologado em `buildId`. O percurso cobriu abrir o envelope, continuar até a carta, conferir o valor e o avanço do contador e voltar à capa. Em cada ambiente houve um único GET à Event Config, sem erros de página ou console. Os hashes de 77 recursos coincidiram com os do commit. As verificações foram de leitura, sem submissão de RSVP.

## Aceite humano e limites

Em 18/11/2026, o responsável informou o aceite funcional da contagem regressiva. O relato não especificou roteiro, navegador, dispositivo ou tecnologia assistiva.

A mensagem de encerramento foi verificada em DEV com relógio simulado. Nos sites publicados, a observação cobriu a contagem em andamento. Leitor de tela real e dispositivo físico ficaram fora da validação técnica desta entrega.
