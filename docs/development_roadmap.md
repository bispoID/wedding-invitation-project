# Roadmap — Convite Virtual de Casamento

Este documento concentra o estado resumido, o trabalho restante e os riscos
aceitos. Requisitos e decisões estáveis ficam no [contexto](project_context.md);
procedimentos e evidências estão no [índice documental](README.md).

## Estado atual

As 13 fases estão concluídas nos escopos homologados. As conclusões abaixo
resumem registros até 26/10/2026; não afirmam disponibilidade em tempo real.
Melhorias opcionais não reabrem fases encerradas.

| Entrega concluída | Referência principal |
| --- | --- |
| Fases 1–13: base, banco, segurança, API, RSVP, contingência, administração, monitoramento, interface, integração, hospedagem, testes e operação | [Histórico das fases](history/development-phases.md) |
| Pesquisa e paginação administrativa, métricas globais e cursor, 13/10/2026, `b5995cf` | [QA administrativo](history/qa-final-evidence.md#encerramento-da-pesquisa-e-paginação-administrativa) |
| Isolamento DEV/UAT/PRD homologado e publicado em 24/10/2026, `09267d1` | [Publicação e limites](history/qa-final-evidence.md#publicação-devuatprd--24102026) |
| Recuperação administrativa concluída em DEV/UAT/PRD em 25/10/2026; PRD em `bf35bc2` | [DEV](history/password-recovery-dev-validation.md), [UAT](history/password-recovery-uat-validation.md), [PRD](history/password-recovery-prd-validation.md) |
| Monitor do frontend PRD configurado e teste de alerta recebido em 25/10/2026 | [Monitoramento](health-check.md#conferência-do-frontend-prd--25102026) |
| Correção da exposição acessível do cartão coberto, `c25e2cd`, publicada em UAT e PRD em 26/10/2026 | [QA PRD](history/qa-final-evidence.md#publicação-e-conferência-prd-da-correção-de-acessibilidade--26102026) |

No registro PRD de 26/10, CI aprovou 414 Node e 150 Deno; deployment READY,
runtime e integridade de 75 recursos foram conferidos. A inspeção focada no
navegador integrado automatizado cobriu os três estados do cartão, abertura,
pausa, continuação, carta e retorno com foco. Esses resultados pertencem ao
candidato publicado, não a uma execução desta reorganização documental.

## Backlog

| Trabalho restante | Critério para priorizar e validar |
| --- | --- |
| Detalhar a matriz de navegadores, dispositivos, tecnologias assistivas e zoom | Priorizar pelo público e pelas áreas alteradas. Registrar ambiente, versão, dispositivo, método e resultado; roteiro no [ciclo DEV](history/qa-final-evidence.md#cobertura-evolutiva-dev--26102026). |
| Avaliar MFA, CAPTCHA/Turnstile se necessário, domínio próprio e observabilidade adicional | Justificar benefício, risco e custo antes de implementar; cada mudança exige validação própria. |

Recuperação de senha e configuração do monitor PRD são entregas concluídas,
rastreáveis na tabela anterior. Recuperação de senha não é recuperação de
RSVPs Sheets: [procedimento administrativo](admin-guest-management.md#recuperação-do-acesso-administrativo).

## Riscos aceitos e limites de cobertura

- O aceite UAT do isolamento incluiu Edge desktop e Galaxy A21/Chrome físico
  com redução de movimento; não corresponde a uma matriz universal.
- Há relato humano posterior de testes de todos os recursos em Firefox e
  Safari, sem problemas informados. Versões, dispositivo, sistema operacional
  e ambiente não foram registrados; o relato não é reatribuído aos releases
  seguintes. Zoom real de 200%, leitor de tela e execução específica em iOS
  não foram informados nesse ciclo. Inspeção DOM/árvore acessível não substitui
  essas verificações nem comprova conformidade integral com WCAG.
- A recuperação manual de acesso administrativo por contingência permanece
  sem validação. O fluxo normal de senha teve aceite funcional PRD humano;
  preservação de identidade e bloqueio de reuso tiveram conferência técnica
  separada. [Cobertura e limitações](history/password-recovery-prd-validation.md#cobertura-e-limitações).
- O monitoramento HTTP não comprova execução JavaScript nem persistência de
  RSVP. Estados Up/Paused e elegibilidade de rollback são observações datadas,
  não garantias permanentes. [Limites do health](health-check.md#limitações).

## Critérios proporcionais de manutenção

Bloqueiam release problemas relevantes de segurança, integridade, funcionamento
essencial ou confiabilidade da publicação. Riscos não bloqueantes exigem
mitigação e aceite explícito. Reutilizar evidências do mesmo escopo e repetir
validações quando houver mudança ou regressão concreta.

Validar cada camada antes de avançar: implementar, testar, validar e corrigir
falhas antes da próxima etapa. A execução prioriza uma base técnica segura e
funcional, seguida pela integração e pelo refinamento visual. Agrupar atividades
relacionadas e manter autorização para ações de impacto. Operações de publicação
e recuperação seguem [environments.md](environments.md), sem serem repetidas
para fechar uma revisão documental.

## Relação com o contexto do projeto

O [contexto](project_context.md) define objetivos, requisitos, regras de negócio
e decisões arquiteturais. Este roadmap é a fonte principal para status e
próximos objetivos. Guias descrevem como operar; o [histórico](README.md#evidências-históricas)
registra o que foi verificado em cada checkpoint, com seus limites.
