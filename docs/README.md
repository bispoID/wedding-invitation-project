# Documentação do projeto

Ponto de entrada: [README do repositório](../README.md).
O [roadmap](development_roadmap.md#estado-atual) concentra o estado resumido;
os resultados citados são checkpoints, sem consulta de disponibilidade atual.

## Responsabilidades e fontes principais

| Assunto | Fonte principal | Responsabilidade |
| --- | --- | --- |
| Objetivos, requisitos, regras de negócio e decisões estáveis | [Contexto do projeto](project_context.md) | Define o produto e suas fronteiras; não mantém backlog ou histórico de release. |
| Estado, trabalho restante e riscos aceitos | [Roadmap](development_roadmap.md) | Resume entregas e aponta para as evidências, sem reproduzir procedimentos. |
| Ambientes, contrato público, publicação e rollback | [Ambientes](environments.md) | Guia operacional DEV/UAT/PRD e fluxo Git. |
| Configuração e operação local | [Desenvolvimento local](local-development.md) | Pré-requisitos, snapshot, inicialização, Auth, contingência, testes SQL e parada. |
| Camadas, seleção e comandos de testes | [Estratégia de testes](testing-strategy.md) | Define o alcance de cada verificação, sem transformar teste estático em aceite visual. |
| Módulos e compatibilidade | [Arquitetura do código](source-architecture.md) | Entradas, fachadas, dependências e critérios para limpeza. |
| Modelo de dados e segurança do banco | [Schema](database-schema.md) | Modelo consolidado; migrations históricas são a fonte de reconstrução. |
| Configuração do evento | [Event Config](event-config.md) | Schema, contratos HTTP, limites e formulários. |
| Autenticação, autorização, convidados e recuperação de senha | [Administração](admin-guest-management.md) | Contratos e pré-requisitos; aceites no histórico por ambiente. |
| Reconciliação da contingência | [Recuperação Sheets](google-sheets-contingency-recovery.md) | Idempotência, lock, exclusão segura e limites; independente da recuperação de senha. |
| Monitoramento e alertas | [Health check](health-check.md) | Probe e configuração; seções de conferência são evidências datadas. |
| Ferramentas e permissões | [Serviços externos](external-services.md) | Runtimes, permissões e referências; publicação segue o guia de ambientes. |
| Frontend, previews e interação do cartão | [README do frontend](../invite-app/README.md) | Orientação específica de apresentação. |
| Foco e movimento reduzido | [Regressões de acessibilidade](qa-accessibility-motion.md) | Contrato técnico e executor opcional local, com checkpoint identificado. |
| Emulador e inspeção móvel | [Android Emulator](android-emulator-local-devtools.md) | Acesso local, ADB e recuperação da inspeção remota. |

Os demais documentos resumem o assunto ou referenciam a fonte principal.
Textos de interface, contratos e comandos literais são preservados. Caminhos
em código ou comandos partem da raiz do repositório, salvo indicação contrária;
`<REPO_ROOT>` representa essa raiz, sem depender de diretórios pessoais.

## Evidências históricas

Um único nível, `history/`, reúne os registros de execução. Suas pendências,
autorizações, configurações, contagens e estados pertencem à data, ao ambiente
e ao candidato indicados, mesmo quando há uma continuação posterior no arquivo.
Não são instruções para repetir uma operação nem backlog vigente.

| Registro | Escopo e período |
| --- | --- |
| [Fases concluídas](history/development-phases.md) | Checklists e validações das fases 1–13, extraídos do roadmap em 26/10/2026. |
| [QA consolidado](history/qa-final-evidence.md) | Resultados locais, CI, publicações e aceites manuais de outubro de 2026. |
| [Revalidação dinâmica DEV](history/uat-dynamic-revalidation.md) | Diagnóstico de prontidão e integração local, 17/10/2026. |
| [Frontend UAT](history/uat-frontend-validation.md) | Configuração e artefatos UAT, 23/10/2026. |
| [E2E Edge](history/uat-edge-e2e.md) | Navegador, dados sintéticos, limpeza e limites, 23/10/2026. |
| [Integração Git e CI](history/uat-git-ci-integration.md) | Checkpoints e políticas de publicação, 23–24/10/2026. |
| [Preparação Pages UAT](history/github-pages-uat-preparation.md) | Artefato, proteções e etapas condicionadas, 23–24/10/2026. |
| [Recuperação de senha DEV](history/password-recovery-dev-validation.md) | Reprodução, correção, testes automatizados e troca humana, 25/10/2026. |
| [Recuperação de senha UAT](history/password-recovery-uat-validation.md) | Publicação, callback e aceite funcional, 25/10/2026. |
| [Recuperação de senha PRD](history/password-recovery-prd-validation.md) | Publicação e aceite funcional com atribuição das observações, 25/10/2026. |

Conferências históricas específicas de um guia permanecem junto ao assunto
quando separá-las criaria documentos pequenos: [monitor PRD](health-check.md#conferência-do-frontend-prd--25102026)
e [implantação de Event Config](event-config.md#histórico-de-implantação-e-validação).

Ao acrescentar evidência, informar data, ambiente, SHA do candidato quando
disponível, método, resultado, limitações e referências a testes, CI ou
deployment. Identificar teste automatizado, inspeção técnica ou relato humano.
Se um campo não foi registrado, declarar essa ausência; não inferir versão,
dispositivo, ambiente ou novo aceite a partir de outro checkpoint.
Identificadores técnicos úteis à rastreabilidade permanecem. Artefatos privados
ignorados, como capturas em `.dev/`, podem ser citados sem serem publicados;
sua existência não é comprovada pelo link no documento.

## Resíduos locais e descoberta do repositório

`.dev/`, `invite-app/dev-config.json`, dependências e caches Supabase são
artefatos locais ignorados. A regra `*.zip` cobre ZIPs não rastreados em
qualquer nível, inclusive pacotes de compartilhamento e cópias locais; não
retira do versionamento arquivos já rastreados. Cópias de `.dev/` com outro
nome não são cobertas automaticamente pela regra desse diretório e devem ser
avaliadas antes do compartilhamento. Manter exemplos sanitizados versionáveis,
como `.env.example`. Arquivos ignorados não foram apagados; logs continuam
cobertos por `*.log`.

A presença de um arquivo antigo ou sem referência textual direta não comprova
obsolescência. Os [critérios e candidatos preservados](source-architecture.md#compatibilidade-e-critérios-para-limpeza)
explicitam dependências e incertezas.

A página inicial depende da branch exibida. O README deste checkout encaminha
para este índice; a [recomendação sobre main e a branch padrão](environments.md#descoberta-do-repositório-e-papel-de-main)
é separada do fluxo de publicação e não altera configurações remotas.
