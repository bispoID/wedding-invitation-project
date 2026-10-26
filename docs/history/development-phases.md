# Histórico das fases de desenvolvimento

Registro consolidado a partir de `docs/development_roadmap.md` no checkout
`479ce54b0833f2a551333c74305a43bb9c142d95`, em 26/10/2026. Esse SHA identifica
a fonte documental, não uma nova execução de todos os testes citados.
As fases foram encerradas nos escopos e checkpoints descritos abaixo.
Datas, ambientes, métodos, resultados e limitações pertencem a cada registro;
quando uma identificação não foi registrada, ela não deve ser inferida.

Estado e trabalho restante: [roadmap](../development_roadmap.md#estado-atual).
Operação vigente: [ambientes](../environments.md).
Evidências detalhadas: [QA final](qa-final-evidence.md).
Os checklists concluídos e comandos históricos não constituem novas tarefas
nem autorização para repetir operações remotas.

# Cronologia geral

```text
FASE 1 — BASE DO PROJETO
        ↓
FASE 2 — BANCO / SUPABASE
        ↓
FASE 3 — SEGURANÇA E PERMISSÕES
        ↓
FASE 4 — API / EDGE FUNCTION
        ↓
FASE 5 — RSVP
        ↓
FASE 6 — CONTINGÊNCIA
        ↓
FASE 7 — ÁREA ADMINISTRATIVA
        ↓
FASE 8 — MONITORAMENTO
        ↓
FASE 9 — INTERFACE / DESIGN
        ↓
FASE 10 — INTEGRAÇÃO
        ↓
FASE 11 — HOSPEDAGEM ESTÁTICA / AMBIENTES
        ↓
FASE 12 — TESTES / QUALIDADE
        ↓
FASE 13 — PUBLICAÇÃO / OPERAÇÃO
```

---

# FASE 1 — Base do projeto

Objetivo: preparar o repositório e a estrutura inicial da aplicação.

- [x] Estruturar pastas e arquivos.
- [x] Configurar HTML, CSS e JavaScript.
- [x] Configurar `.gitignore`.
- [x] Criar `.env.example`.
- [x] Fazer primeiro commit organizado.
- [x] Conectar e/ou validar o repositório no GitHub.
- [x] Validar a estrutura inicial.

**Resultado esperado:**

Repositório organizado e pronto para receber as próximas camadas.

**Estado: CONCLUÍDA.** Estrutura, App Config e preparação portátil do artefato
implementadas, testadas e integradas à publicação.

---

# FASE 2 — Banco / Supabase

Objetivo: criar a estrutura de dados necessária para o RSVP.

- [x] Criar projeto no Supabase.
- [x] Modelar tabela de convidados.
- [x] Definir campos e tipos de dados.
- [x] Definir chave primária.
- [x] Criar restrição `UNIQUE(email)`.
- [x] Definir timestamps/status necessários.
- [x] Validar inserção e estrutura do banco.

**Resultado esperado:**

Banco estruturado e capaz de armazenar os RSVPs.

**Estado: CONCLUÍDA.** A extensão do Bloco 3 acrescentou
schema singleton de `event_config` e limites de convidados originalmente NOT VALID.
Migrations aplicadas nos checkpoints autorizados, incluindo localização própria
da recepção. Auditoria histórica e VALIDATE concluídas no Bloco 6, sem correção
dos dados existentes. A suite SQL local integral foi aprovada no Bloco 7, com
as 15 migrations em PostgreSQL/Supabase local descartável, sem usar produção.

---

# FASE 3 — Segurança e permissões

Objetivo: garantir que os dados dos convidados permaneçam privados e que cada tipo de usuário tenha somente as permissões necessárias.

- [x] Ativar RLS.
- [x] Criar policies.
- [x] Separar acesso público de administrativo.
- [x] Configurar Supabase Auth.
- [x] Criar usuário administrador.
- [x] Exigir confirmação de e-mail.
- [x] Garantir que credenciais privilegiadas não sejam expostas no frontend.
- [x] Validar permissões.

### Regra conceitual

**Público:**

```text
INSERT → permitido através do fluxo controlado de RSVP
SELECT → bloqueado
UPDATE → bloqueado
DELETE → bloqueado
```

**Administrador:**

```text
SELECT → permitido
INSERT → permitido, se necessário
UPDATE → permitido
DELETE → permitido, se necessário
```

**Resultado esperado:**

Banco protegido e permissões funcionando de acordo com o modelo definido.

**Estado: CONCLUÍDA no escopo definido.** RLS/grants restritivos
na migration de evento, DTO público limitado e Auth/allowlist/origem nas APIs
administrativas. Testes simulados e verificações remotas de schema/HTTP passaram;
a suite SQL local integral foi aprovada no Bloco 7 em banco descartável.

---

# FASE 4 — API / Edge Function

Objetivo: criar a camada responsável por receber e processar os RSVPs.

- [x] Criar endpoint do RSVP.
- [x] Receber os dados.
- [x] Validar os dados.
- [x] Validar regras de negócio.
- [x] Validar formato do e-mail.
- [x] Validar campos obrigatórios.
- [x] Validar limite de acompanhantes.
- [x] Tratar e-mail duplicado.
- [x] Implementar proteção contra abuso na Edge Function.
- [x] Definir estratégia de rate limiting.
- [x] Limitar requisições por IP.
- [x] Definir janela de tempo e número máximo de tentativas.
- [x] Retornar `429 Too Many Requests` quando o limite for excedido.
- [x] Evitar exposição de informações internas nas respostas.
- [x] Garantir o funcionamento normal para convidados legítimos.
- [x] Definir armazenamento persistente do contador de requisições.
- [x] Realizar a validação final do rate limiting.
- [x] Inserir no Supabase.
- [x] Retornar respostas padronizadas.
- [x] Implementar tratamento de erros.

**Resultado esperado:**

A API consegue receber, validar e persistir um RSVP corretamente, com proteção contra abuso implementada e validada na Edge Function.

**Estado: CONCLUÍDA.** APIs de configuração
do evento, validação compartilhada e minimização dos logs implementadas e
testadas offline. O algoritmo, chave, RPC e limites do rate limiting foram
preservados. Backend implantado e aceite funcional concluído nos checkpoints;
frontend atualizado integrado e publicado no Bloco 5.

---

# FASE 5 — RSVP

Objetivo: conectar o formulário do convite ao fluxo real de confirmação de presença.

- [x] Criar formulário.
- [x] Criar validações no frontend.
- [x] Adicionar campo de quantidade de acompanhantes, aceitando de 0 a 15.
- [x] Enviar dados para a API.
- [x] Criar estado de carregamento.
- [x] Criar tratamento de erro.
- [x] Criar mensagem de sucesso.
- [x] Garantir que o sucesso somente seja apresentado após persistência real.

### Regra fundamental

```text
Formulário
    ↓
API
    ↓
Supabase
    ↓
Persistência confirmada
    ↓
Resposta confirmada (HTTP 201)
Mensagem adequada à presença ou ausência informada
```

Nunca apresentar sucesso falso.

**Resultado esperado:**

O convidado consegue confirmar presença de forma confiável.

**Estado: CONCLUÍDA.** Contratos preservados após as extensões, com reset do
formulário após HTTP 201 e mensagem de sucesso adequada à presença ou ausência.
Esses comportamentos integram a regressão automatizada.

---

# FASE 6 — Contingência

Objetivo: preservar um RSVP quando ocorrer uma falha de infraestrutura no fluxo principal.

- [x] Criar Google Sheets privado.
- [x] Criar mecanismo de fallback.
- [x] Definir quais falhas acionam a contingência.
- [x] Evitar duplicação.
- [x] Registrar ocorrência.
- [x] Alertar o administrador.
- [x] Preparar sincronização posterior.
- [x] Validar o fluxo de recuperação.
- [x] Validar o fluxo normal com HTTP 201.
- [x] Validar a contingência com HTTP 202.
- [x] Validar a falha dupla com HTTP 500.
- [x] Documentar a recuperação manual.
- [x] Remover a função temporária de teste.

O fallback Google Sheets, o contrato HTTP 202 e a falha dupla foram validados.
Os alertas administrativos são registrados nos Supabase Logs. O procedimento
manual de recuperação foi documentado em
`docs/google-sheets-contingency-recovery.md`.

### Fluxo normal

```text
Convidado
   ↓
Landing Page
   ↓
API
   ↓
Supabase
   ↓
INSERT OK
   ↓
Confirmação
```

### Fluxo de contingência

```text
Convidado
   ↓
Landing Page
   ↓
API
   ↓
Supabase
   ↓
FALHA
   ↓
Google Sheets
   ↓
Registro temporário
   ↓
Alerta ao administrador
```

### Regra importante

Erro de regra de negócio, como e-mail duplicado, **não deve ser tratado como falha de infraestrutura**.

O Google Sheets é uma contingência/fila de emergência, e não um segundo banco permanente.

**Resultado esperado:**

Um problema temporário de infraestrutura não causa perda silenciosa do RSVP.

**Estado: CONCLUÍDA.** Reconciliação, lock e limpeza segura preservados após
as validações compartilhadas e minimização de logs, com regressão offline.

---

# FASE 7 — Área administrativa

Objetivo: criar o ambiente privado para gerenciamento dos convidados.

- [x] Criar tela de login.
- [x] Criar estrutura inicial independente para `/admin`.
- [x] Integrar login por e-mail e senha com Supabase Auth.
- [x] Verificar sessão e proteger o acesso ao dashboard.
- [x] Implementar logout.
- [x] Criar estrutura inicial do dashboard com estados de carregamento e erro.
- [x] Configurar a chave pública Supabase; no Lote 2, centralizada em `invite-app/scripts/shared/app-config.js`.
- [x] Criar listagem administrativa de convidados por Edge Function restrita ao administrador.
- [x] Exibir nome, e-mail, presença, acompanhantes e data de envio.
- [x] Implementar estados de carregamento, erro e lista vazia.
- [x] 7A — Implementar a base administrativa privada, autenticação e dashboard.
- [x] 7B — Listar os convidados e validar a consulta autenticada.
- [x] 7C.1 — Recuperar com segurança registros da contingência.
- [x] 7C.2 — Listar e recuperar registros pendentes da contingência no dashboard.
- [x] 7D — Editar e excluir convidados com validação administrativa.
- [x] 7D — Exibir e recalcular indicadores dos convidados.
- [x] Implementar hardening de segurança para a área administrativa.
- [x] Implementar autorização com JWT válido e `ADMIN_AUTH_USER_IDS`, com suporte a múltiplos administradores.
- [x] Publicar as cinco Edge Functions administrativas com `verify_jwt=true`.
- [x] Criar convidados manualmente e editar a configuração do evento pelo painel.
- [x] Documentar a autorização e operação administrativa em `docs/admin-guest-management.md`.

### Indicadores

```text
Total de convidados
Confirmados
Não poderão comparecer
Total de acompanhantes
Total de pessoas confirmadas
```

**Resultado esperado:**

O administrador consegue visualizar e gerenciar a lista de forma privada.

**Estado: CONCLUÍDA.** A extensão do Bloco 3 acrescentou
criação manual de convidados, edição de `event_config` e navegação para
convite/previews. Asserções backend e UI simulada passaram; aceite funcional e
visual registrado, incluindo Event Config do Bloco 4. Frontend atualizado
integrado e publicado no Bloco 5; o micro-hotfix touch preserva focus-visible.

### Extensão concluída — pesquisa e paginação de convidados (13/10/2026)

Foi implementada, validada e publicada uma listagem administrativa paginada
(10/20/50), pesquisa dinâmica por nome/e-mail com debounce, indicadores
agregados independentes do filtro e respostas administrativas `private,
no-store`. A alteração inclui a RPC protegida `public.admin_list_guests`, a
estabilização dos indicadores durante carregamentos e testes com fixtures
sintéticas.

A migration `20261013010000_create_admin_guest_list.sql` foi aplicada e
validada no PostgreSQL local descartável e posteriormente aplicada em
produção. A Edge Function `admin-list-guests` foi publicada na versão 8 e
validada com autenticação, autorização, pesquisa, paginação e métricas. O
frontend foi publicado na Vercel pela branch `production` no commit
`b5995cf53be3085f9b1d418b8cddf08154afd303`, deployment
`dpl_F8r3e6u28EY2NimfGtZLSUmP1Bvf`.

O hotfix do cursor dos botões de paginação desabilitados foi incluído no mesmo
encerramento e publicado com a versão final. O aceite visual autenticado foi
confirmado pelo responsável. Este registro encerra somente o escopo de
pesquisa, paginação, métricas e cursor administrativo; não altera os critérios
ou pendências de outras fases.

---

# FASE 8 — Monitoramento

Objetivo: verificar a saúde dos componentes importantes do sistema.

- [x] Criar health check.
- [x] Verificar disponibilidade da API.
- [x] Verificar Edge Function.
- [x] Verificar Supabase.
- [x] Verificar banco.
- [x] Validar a operação necessária ao RSVP.
- [x] Configurar monitoramento externo.
- [x] Configurar alertas de falha.
- [x] Evitar notificações para operações normais.

### O administrador deve ser alertado quando houver problemas como:

- Falha ao inserir no Supabase.
- Supabase indisponível.
- Edge Function indisponível.
- Erro inesperado.
- Falha de infraestrutura.
- Falha ao registrar a contingência.

Não enviar uma notificação para cada RSVP realizado com sucesso.

**Resultado esperado:**

O administrador consegue saber quando o sistema precisa de atenção.

**Estado: CONCLUÍDA.**

Health Check publicado na Supabase Edge Function `health` e validado no
endpoint remoto. O monitor externo do UptimeRobot consulta o endpoint por
`HEAD` a cada 15 minutos e envia alertas por e-mail em caso de falha. O
monitoramento é independente do computador local e não executa o fluxo real de
RSVP nem gera notificações para confirmações normais.

Detalhes técnicos: [health-check.md](../health-check.md). Ferramentas e serviços:
[external-services.md](../external-services.md).

---

# FASE 9 — Interface / Design

Os aceites desta seção são o checkpoint de 09/10/2026. O aceite atualizado do
release de isolamento e seus limites ficam em [estado atual](../development_roadmap.md#estado-atual).

Objetivo: desenvolver a experiência visual do convite.

Esta fase vem depois da definição da base técnica, evitando construir a interface sobre uma arquitetura ainda instável.

**Estado: CONCLUÍDA no escopo visual e manual validado.** Envelope/capa,
animação, carta, tipografia, monograma, informações do evento, RSVP,
responsividade e previews estão implementados. Os aceites ampliados de teclado,
redução de movimento e nomes longos foram informados pelo responsável pelo QA
e consolidados em [qa-final-evidence.md](qa-final-evidence.md), em 09/10/2026.
As correções foram versionadas e publicadas no commit `9d34e6c`, com CI e smoke
checks aprovados. O aceite visual final da versão publicada foi registrado na Fase 13.
A aprovação não implica cobertura universal de navegadores.

- [x] Definir identidade visual.
- [x] Integrar monograma estático nos dois slots.
- [x] Definir tipografia e paleta nos tokens compartilhados.
- [x] Criar envelope/capa e animação de abertura.
- [x] Criar estrutura e mensagem do convite.
- [x] Carregar nomes, data, horário e locais pela Event Config.
- [x] Exibir mapas HTTPS e ocultar opcionais ausentes.
- [x] Integrar RSVP.
- [x] Criar responsividade, animações e transições.
- [x] Aprovar os ajustes mobile registrados nos checkpoints.
- [x] Consolidar aceite manual de teclado no fluxo completo e redução de movimento.
- [x] Consolidar aceite de nomes longos e matriz ampliada de telas/navegadores.
- [x] Adicionar o controle `Pausar / Continuar` para a apresentação do cartão,
  com identidade visual compartilhada com o RSVP, dimensionamento proporcional,
  área segura móvel, foco acessível e preview estático no modo desenvolvedor.

### Direção visual

A experiência deve transmitir:

- Sofisticação;
- Elegância;
- Clássico;
- Minimalismo;
- Aparência de papelaria fina;
- Experiência de convite físico transformada em experiência digital.

**Resultado esperado:**

Convite visualmente finalizado e funcional.

**Critérios atendidos:** aceites manuais relatados de teclado, redução de
movimento, nomes longos, zoom de 200% e larguras 320/375/390/699/700/1000 px nos
cenários informados; Edge/Chrome/Firefox Desktop e celular real aprovados.
Safari/iOS e redução de movimento especificamente no celular real não têm
evidência. Event Config, loading/erro/opcionais e metadata genérica/build-time já estão
integrados. A fonte manual e os limites estão no documento de evidências;
focus-visible e testes simulados, isoladamente, não substituem aceite visual.

---

# FASE 10 — Integração

Objetivo: conectar todas as camadas.

**Estado: CONCLUÍDA no escopo funcional atual.** RSVP, banco, Auth/admin,
contingência, health e Event Config estão integrados e publicados. Contratos,
testes e aceites funcionais dos checkpoints sustentam a conclusão; a revisão
documental não repete operações de produção nem simula novas falhas remotas.

```text
Frontend
    ↓
API / Edge Function
    ↓
Supabase
    ↓
Autenticação / Autorização
    ↓
Contingência
    ↓
Monitoramento
```

Checklist:

- [x] Frontend → API funcionando, incluindo consumo público de Event Config.
- [x] API → Supabase funcionando.
- [x] API → contingência e recuperação validadas nos checkpoints.
- [x] Área administrativa → Auth e autorização no backend funcionando.
- [x] Área administrativa → banco, CRUD e edição do evento funcionando.
- [x] Monitoramento → serviços configurados e contratos validados.
- [x] Variáveis operacionais configuradas nos ambientes utilizados.
- [x] Credenciais privilegiadas restritas ao backend.
- [x] Fluxo funcional integrado validado nos registros de aceite.

**Resultado esperado:**

Todo o sistema funciona como uma única aplicação.

**Critérios atendidos:** configuração única por carregamento, CRUD administrativo,
edição do evento e regressão dos contratos de RSVP/contingência. Evoluções futuras
exigem seu próprio aceite; não são extensões faltantes do escopo entregue.

---

# FASE 11 — Hospedagem estática / ambientes

Objetivo: validar a hospedagem atual e a portabilidade operacional do frontend
estático, sem dependência de um provedor nas regras de negócio.

**Estado: CONCLUÍDA.** DEV local, UAT Pages/Supabase independente e PRD
Vercel/Supabase foram separados, homologados e publicados.

- [x] Contrato público explícito, bootstrap fail-closed e sessão por ambiente/projeto.
- [x] Supabase local, Auth sintético, contingência JSON e testes SQL DEV.
- [x] Supabase UAT independente com 16 migrations, Auth, CORS e Sheets próprios.
- [x] Pages staging-only, CI do mesmo SHA e auditoria do artefato antes do upload.
- [x] Proteção contra exclusão/force push e check obrigatório em production.
- [x] Preview Vercel desligado e deployment não produtivo bloqueado nas branches definidas.
- [x] BUILD_ID vinculado ao SHA e configuração pública PRD explícita.
- [x] Homologação UAT, promoção PRD fast-forward e smoke público aprovados.

Operação e rollback: [environments.md](../environments.md#cicd-e-próximas-etapas).
Diagnósticos DEV e testes SQL: [QA DEV](qa-final-evidence.md#validação-final-do-dev--16102026)
e [revalidação dinâmica](uat-dynamic-revalidation.md).
Histórico da integração: [uat-git-ci-integration.md](uat-git-ci-integration.md).
A preparação inicial não é tratada como pendência atual.

---

# FASE 12 — Testes / qualidade

Objetivo: verificar funcionamento, segurança, confiabilidade e experiência.

**Estado: CONCLUÍDA no escopo de QA local e manual relatado.** Regressão
automatizada e aceites ampliados estão consolidados em
[qa-final-evidence.md](qa-final-evidence.md). A suíte SQL local aprovada no Bloco
7 permanece como evidência anterior; não foi repetida, pois não houve mudança
de migration/schema. CI e smoke checks da publicação consolidada passaram;
o responsável confirmou o aceite visual final, registrado na Fase 13.
Testes simulados não equivalem a aceite visual nem representam uma auditoria
de segurança exaustiva.

## Baseline automatizada

Regressão local consolidada em 09/10/2026: **144 Deno e 212 Node, total 356,
zero falhas**, com typecheck de oito entrypoints, syntax de 35 arquivos
JavaScript e whitespace aprovados. Inclui as suítes adicionadas durante o QA.
O CI do commit consolidado `9d34e6c` também aprovou 212 Node e 144 Deno,
conforme os logs da execução
[37982999446](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999446).
Nesse CI passaram 26 syntax checks e whitespace; o typecheck dos oito
entrypoints foi executado localmente.

Baseline histórica do Bloco 7: **144 Deno e 119 Node, total 263, zero falhas**, com typecheck dos
cinco entrypoints, syntax checks e whitespace. Passou localmente e no Linux/CI
do Bloco 7, execução
[37934156785](https://github.com/bispoID/wedding-invitation-project/actions/runs/37934156785).
Publicação correspondente aprovada pelo workflow Pages, execução
[37934156824](https://github.com/bispoID/wedding-invitation-project/actions/runs/37934156824).

Os testes cobrem App Config, preparação portátil, contratos backend, validações,
RSVP, métricas e UI administrativa/Event Config com DOM simulado. O Bloco 4
registrou aceite visual desktop/mobile aproximadamente 390px, incluindo READY,
localização própria da recepção, mapas, monograma, timestamps, espaçamentos e
collapsible. Integração e publicação foram concluídas no Bloco 5; hotfixes de
sucesso por ausência e tap highlight do Admin integram a versão publicada.
O fluxo do envelope também possui cobertura específica para o controle manual da
apresentação do cartão: pausa da revelação automática, continuação após o
movimento natural, proteção contra callbacks antigos e restauração ao retornar
para a capa. A alteração foi posteriormente homologada e publicada; os resultados
numéricos acima continuam pertencendo ao checkpoint histórico de 09/10/2026.
Contratos detalhados: [event-config.md](../event-config.md).

- [x] Criar workflow independente `.github/workflows/test.yml` em Linux.
- [x] Configurar descoberta de JavaScript versionado e `node --check`.
- [x] Incluir testes das Functions e o teste de métricas explicitamente.
- [x] Restringir permissões dos testes e dispensar secrets de produção.
- [x] Configurar verificação de whitespace.
- [x] Confirmar baseline inicial do Lote 1: execução 37852513840, em 08/10/2026.
- [x] Integrar testes de App Config, preparação portátil, Admin e Event Config ao CI.
- [x] Aprovar a baseline histórica de 263 testes localmente e em Linux no Bloco 7.
- [x] Aprovar a regressão local consolidada de 356 testes, incluindo as correções de QA.
- [x] Cobrir o fluxo `Pausar / Continuar` e seus estados de transição em
  `scripts/envelope-motion.test.mjs`.
- [x] Executar `supabase/tests/block3.sql` em PostgreSQL local descartável:
  Bloco 7, em 09/10/2026, PostgreSQL 17.6/Supabase CLI 2.120.0 em Docker/WSL2;
  reset local sem seed, 15 migrations e duas execuções integrais com ROLLBACK
  aprovadas, sem utilizar produção.
- [x] Registrar aceites funcionais e visuais dos checkpoints, sem apagar seus limites.

O workflow utiliza Node.js `22.14.0` e Deno `2.9.7` em `ubuntu-24.04`. A execução
Windows dentro do isolamento local apresentou panic de named pipe no runner;
o comando completo passou fora do isolamento. Nesta consolidação, a repetição
integral fora do isolamento também aprovou 144 testes Deno com rede negada.
`--no-run` é checagem, não execução de asserções. Comandos:
[invite-app/README.md](../../invite-app/README.md#configuração-pública-e-publicação-portátil).
Comandos Deno e permissões: [external-services.md](../external-services.md#baseline-linux--ci).

## RSVP

- [x] RSVP válido e contratos 201/202, incluindo reset e sucesso por ausência.
- [x] RSVP duplicado.
- [x] E-mail inválido, campos vazios e limites de acompanhantes.
- [x] Requisição manual à API validada nos checkpoints anteriores.

Validações automatizadas usam dependências simuladas. Não é necessário enviar
RSVP de produção a cada fechamento documental.

## Segurança

- [x] Restrições de acesso público verificadas nas migrations; a suíte SQL local
  cobre RLS/grants de Event Config e constraints de convidados.
- [x] Rejeição administrativa sem autenticação ou autorização nos testes backend.
- [x] RLS e grants verificados no banco local com migrations versionadas.
- [x] Revisão estática de credenciais no conteúdo textual versionado.

Essas evidências não equivalem a pentest nem a auditoria de todo o histórico Git.

## Falhas

- [x] Falha do Supabase/API e erro inesperado nos testes simulados.
- [x] Contingência e falha dupla nos testes e registros anteriores de validação.
- [x] Logs minimizados e contratos de health/alertas verificados.

O monitor externo está configurado; sua disponibilidade instantânea não é uma
constante documental. Não se provocam falhas de produção para fechar este bloco.

## Interface

- [x] Mobile aproximadamente 390px e desktop nos aceites registrados.
- [x] Formulários, estados e collapsible nos testes e aceites registrados.
- [x] Animações implementadas e ajustes visuais registrados.
- [x] Consolidar matriz ampliada de telas/navegadores e nomes longos.
- [x] Consolidar aceite manual por teclado e redução de movimento no fluxo completo.

As evidências manuais foram informadas pelo responsável pelo QA, não repetidas
pelo agente nesta consolidação. Não há matriz completa por cenário/navegador,
versões desktop, navegador/SO do celular real ou evidência de Safari/iOS e de
redução de movimento especificamente nesse celular. Esses limites de cobertura
estão registrados sem serem tratados automaticamente como defeitos.

**Resultado esperado:**

Sistema validado antes da publicação.

**Critérios de conclusão:** suíte executada em runtime funcional e evidências
dos testes de RLS/CORS, RSVP, Admin, contingência, health e Event Config já
existem. Os critérios manuais ampliados foram consolidados conforme o relato,
sem testes destrutivos em produção e sem declarar aprovação universal de
interface pela suíte automatizada. A publicação e os smoke checks da versão
consolidada passaram; o responsável também aprovou o aceite visual final,
registrado na Fase 13.

---

# FASE 13 — Publicação / operação

Objetivo: colocar o sistema em funcionamento real.

**Estado: CONCLUÍDA no escopo publicado e validado.**
Registro histórico de 09/10/2026: o commit `9d34e6c` foi publicado, com Test baseline e Pages aprovados:
[CI 37982999446](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999446)
e [Pages 37982999447](https://github.com/bispoID/wedding-invitation-project/actions/runs/37982999447).
Os smoke checks confirmaram HTTP 200, metadados e integridade de 64 arquivos.
Em 09/10/2026, o responsável confirmou o aceite visual final após testar a
versão publicada: "Aprovado após testar a versão publicada". A referência
operacional desse aceite é `47439ee`, cujo código de interface é idêntico ao
commit consolidado `9d34e6c`; o commit intermediário alterou somente documentos.
Essa confirmação é evidência manual informada, não inferência dos smoke checks
nem teste de navegador executado pelo agente. Evidências:
[qa-final-evidence.md](qa-final-evidence.md#publicação-do-qa--09102026).

- [x] Disponibilizar a publicação inicial via GitHub Pages (atualmente UAT; PRD na Vercel).
- [x] Publicar a versão equalizada e os hotfixes aprovados.
- [x] Revisar a configuração pública e operacional do ambiente escolhido.
- [x] Registrar a configuração Supabase validada nos checkpoints operacionais.
- [x] Configurar monitoramento e validar o contrato do health check.
- [x] Registrar os smoke checks e aceites publicados anteriores.
- [x] Validar RSVP/Admin/contingência com cenários sintéticos nos checkpoints.
- [x] Validar os controles de segurança definidos, incluindo suíte SQL local.
- [x] Consolidar o aceite manual ampliado das Fases 9/12.
- [x] Aprovar o workflow Test baseline para o commit consolidado de QA.
- [x] Publicar a versão consolidada pelo workflow previsto, com deploy aprovado.
- [x] Executar smoke checks operacionais e registrar SHA e runs da publicação.
- [x] Receber e registrar o aceite visual final do responsável na versão publicada.

Domínio personalizado é melhoria opcional, não requisito de publicação.

**Resultado esperado:**

Convite disponível para os convidados e infraestrutura pronta para uso real.

**Critérios de conclusão:** versão equalizada aprovada, smoke checks,
monitoramento, procedimentos operacionais e evidências de segurança/integração
documentados, com publicação, CI, smoke checks e aceite visual final do
responsável aprovados. As 13 fases estão concluídas nos escopos definidos,
preservando os limites de cobertura documentados; isso não garante
compatibilidade universal nem disponibilidade futura dos serviços.

---

### Validação do rate limiting da Fase 4

A proteção contra abuso foi implementada diretamente na **Supabase Edge
Function** e não depende do provedor estático. O rate limiting foi testado e validado,
incluindo o uso do IP encaminhado em `x-forwarded-for`, hash SHA-256 e
armazenamento persistente no Supabase.

O fluxo esperado é:

```text
Frontend estático (independente do provedor)
        ↓
Supabase Edge Function
        ↓
Proteção contra abuso
        ↓
Validação
        ↓
Supabase
```

---

## Etapa 1 do isolamento UAT — 16/10/2026, somente local

Checkpoint histórico: contrato v1 e gates locais foram preparados a partir do
DEV 6b51bf8, sem provisionamento remoto naquela etapa. Provisionamento, aceites,
proteções e publicações posteriores encerraram esse checklist; consultar
[histórico UAT](uat-frontend-validation.md) e [estado atual](../development_roadmap.md#estado-atual).

Revalidação dinâmica e diagnóstico do 503 local:
[uat-dynamic-revalidation.md](uat-dynamic-revalidation.md). O erro reproduzido
ocorreu antes da prontidão das Functions; com o stack pronto as consultas e a
edição retornaram 200. Nenhuma mudança de regra de negócio foi necessária.

## Etapa 1 UAT — cobertura local

Registro histórico de 16–17/10/2026; não representa backlog atual.

App Config exercita validação v1 DEV/UAT/PRD, chaves legadas/publishable,
destinos cruzados, hosts desconhecidos, compatibilidade do DEV legado, namespace
do cliente Supabase e bootstrap ordenado com erro acessível. Os testes de build
comparam todos os assets permitidos byte a byte, verificam o manifesto gerado,
metadados, exclusão de arquivos internos e bloqueio de credenciais privilegiadas.

Fixtures e políticas sintéticas vivem somente em scripts/environment-fixtures.mjs;
não são configuração real de UAT e não integram o artefato. Nenhum teste do CI
precisa consultar Supabase. Deno e a seleção canônica do package.json permanecem
inalterados. As novas verificações estão nas suítes já selecionadas, sem duplicação.
Naquele primeiro checkpoint, DEV integrado estava pendente de infraestrutura;
a retomada abaixo resolveu a indisponibilidade. Doubles não equivalem a
navegação, autenticação ou submissão real no Docker.

Resultado local em 16/10/2026 nesta etapa: **308 testes Node aprovados, 150 Deno
aprovados**, sem falhas, cancelamentos ou skips na seleção canônica. Sintaxe
aprovada em 46 arquivos JS/MJS (incluindo os novos) e git diff --check limpo.
Quatro artefatos sintéticos (UAT/PRD × root/subpath) foram gerados, inspecionados
nos testes e removidos pelo teardown. Nenhum artefato real PRD foi preparado.
A configuração DEV ignorada existente foi validada sem imprimir valores;
portas locais consultadas indisponíveis e dev:health sem conclusão, interrompido.
Não houve execução remota de CI, deploy ou GET Event Config PRD.

Retomada em 17/10/2026: **310 testes Node aprovados**, incluindo duas regressões
de recuperação explícita após HTTP 503. Health e integração DEV passaram, e os
fluxos administrativos foram verificados no navegador com backend local.
Detalhes, captura sanitizada e limites de aceite:
[uat-dynamic-revalidation.md](uat-dynamic-revalidation.md).
