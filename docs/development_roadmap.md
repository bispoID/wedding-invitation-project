# Cronologia de Desenvolvimento — Convite Virtual de Casamento

## Objetivo

Este arquivo define a **ordem geral de desenvolvimento** do projeto Convite Virtual de Casamento.

Ele deve ser utilizado como um **roteiro de acompanhamento**, permitindo avançar por etapas sem misturar responsabilidades de diferentes camadas do sistema.

A regra principal é:

> **Validar cada camada antes de avançar para a próxima.**

---

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

Detalhes técnicos: [health-check.md](health-check.md). Ferramentas e serviços:
[external-services.md](external-services.md).

---

# FASE 9 — Interface / Design

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
evidência. Event Config, loading/erro/opcionais e metadata genérica já estão
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

**Estado: CONCLUÍDA para o ambiente utilizado.** GitHub Pages foi a hospedagem
inicialmente adotada, com publicação operacional validada. App Config centraliza
infraestrutura pública; o preparador e os testes cobrem root/subpath.

- [x] Implementar publicação de `invite-app` no GitHub Pages por workflow.
- [x] Validar root/subpath nos testes e o subpath publicado `/wedding-invitation-project/`.
- [x] Validar comunicação Frontend → Edge Functions nos aceites publicados.
- [x] Centralizar configuração pública e preparar URLs de metadados no Lote 2.
- [x] Validar origins/CORS dos ambientes efetivamente utilizados.
- [x] Documentar preparação e testes locais do artefato estático.
- [x] Documentar configuração operacional e previews disponíveis.

A arquitetura é independente do provedor. Outros serviços compatíveis podem
publicar o mesmo artefato; novos ambientes exigem validar suas URLs/origins.
Não é necessário adotar outro provedor, ambiente de preview separado ou domínio
personalizado para concluir o ambiente definido.

**Resultado esperado:**

GitHub Pages validado, configuração operacional documentada e portabilidade de
paths verificada, sem modificar regras de negócio. A aplicação está pronta
para os testes finais no provedor estático escolhido.

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
Contratos detalhados: [event-config.md](event-config.md).

- [x] Criar workflow independente `.github/workflows/test.yml` em Linux.
- [x] Configurar descoberta de JavaScript versionado e `node --check`.
- [x] Incluir testes das Functions e o teste de métricas explicitamente.
- [x] Restringir permissões dos testes e dispensar secrets de produção.
- [x] Configurar verificação de whitespace.
- [x] Confirmar baseline inicial do Lote 1: execução 37852513840, em 08/10/2026.
- [x] Integrar testes de App Config, preparação portátil, Admin e Event Config ao CI.
- [x] Aprovar a baseline histórica de 263 testes localmente e em Linux no Bloco 7.
- [x] Aprovar a regressão local consolidada de 356 testes, incluindo as correções de QA.
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
[invite-app/README.md](../invite-app/README.md#configuração-pública-e-publicação-portátil).
Comandos Deno e permissões: [external-services.md](external-services.md#baseline-linux--ci).

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
O commit `9d34e6c` foi publicado, com Test baseline e Pages aprovados:
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

- [x] Disponibilizar a publicação atual via GitHub Pages.
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

# Regra de avanço entre fases

A progressão deve seguir este princípio:

```text
FASE ATUAL
    ↓
Implementar
    ↓
Testar
    ↓
Validar
    ↓
Está funcionando?
   ↙       ↘
 NÃO       SIM
  ↓         ↓
Corrigir   Próxima fase
```

Não avançar simplesmente porque a implementação "parece pronta".

---

# Ordem resumida para acompanhamento

```text
[x] 01 — Base do projeto (App Config/preparador integrados à publicação)
[x] 02 — Banco / Supabase (migrations aplicadas; auditoria/VALIDATE concluídas; SQL local aprovado)
[x] 03 — Segurança / Permissões (extensão implantada; suite SQL local aprovada)
[x] 04 — API / Edge Function (extensão implantada e aceite funcional concluído)
[x] 05 — RSVP (contratos, reset e sucesso por ausência validados)
[x] 06 — Contingência (recuperação e regressão validadas)
[x] 07 — Área Administrativa (CRUD, Event Config e frontend publicados)
[x] 08 — Monitoramento
[x] 09 — Interface / Design (CONCLUÍDA no escopo visual e manual relatado)
[x] 10 — Integração (CONCLUÍDA no escopo funcional atual)
[x] 11 — Hospedagem estática / ambientes (CONCLUÍDA no ambiente utilizado)
[x] 12 — Testes / qualidade (356 testes locais; SQL anterior e aceites manuais consolidados)
[x] 13 — Publicação / operação (QA publicado; CI, smoke checks e aceite visual final aprovados)
```

---

# Estado atual

As Fases 1–13 estão concluídas nos escopos definidos, com as evidências e limites
das Fases 9/12 registrados em [qa-final-evidence.md](qa-final-evidence.md). App Config,
Event Config, CRUD administrativo, RSVP e contingência estão integrados e
publicados. O monitor externo utiliza HEAD a cada 15 minutos; sua saúde
instantânea deve ser consultada no serviço, não presumida por este registro.

No Bloco 6, as constraints de convidados foram validadas após auditoria histórica
sem violações, preservando dados. No Bloco 7, as 15 migrations e a suíte SQL
integral passaram em banco local descartável, eliminando essa pendência técnica.
Baseline histórica do Bloco 7: 144 Deno + 119 Node = 263, aprovada localmente e
em Linux/CI. Regressão local do QA consolidado: 144 Deno + 212 Node = 356, zero
falhas, também confirmada em Linux no CI do commit consolidado `9d34e6c`.

**Encerramento integral do escopo:** CI, Pages e smoke checks passaram, e o
responsável confirmou o aceite visual final da versão publicada em 09/10/2026.
Não restam pendências obrigatórias identificadas para o encerramento das 13
fases. O QA manual ampliado e o aceite final foram informados como aprovados
e consolidados, respeitando a ausência de evidência específica para Safari/iOS e
redução de movimento no celular real. Não há defeito aberto identificado nos
gates locais; esses limites de cobertura não são garantia de aprovação universal.

**Melhorias opcionais, não dívidas técnicas do escopo vigente:** domínio próprio,
outros provedores ou ambientes separados, MFA, CAPTCHA se necessário,
observabilidade adicional e metadata personalizada para crawlers. Cada adoção
exige avaliação e aceite próprios; nenhuma é iniciada por este fechamento.

Arquitetura e requisitos estáveis: [project_context.md](project_context.md).
Contratos/validações: [event-config.md](event-config.md),
[admin-guest-management.md](admin-guest-management.md) e
[health-check.md](health-check.md).

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

# Regra de trabalho neste projeto

Este arquivo funciona como o **mapa geral da execução**.

Os detalhes técnicos de cada fase devem ser definidos e documentados durante o desenvolvimento.

A execução deve permanecer organizada em camadas:

```text
INTERFACE
     ↓
API / EDGE FUNCTION
     ↓
BANCO
     ↓
AUTENTICAÇÃO / AUTORIZAÇÃO
     ↓
MONITORAMENTO / CONTINGÊNCIA
```

A interface visual não deve ser o ponto de partida da arquitetura.

Primeiro estabelecemos uma base técnica segura e funcional; depois conectamos e refinamos a experiência visual.

---

## Relação com o Project Context

Este arquivo complementa o `project_context.md`.

- `project_context.md` → **o que o projeto é, seus requisitos e suas decisões arquiteturais.**
- `development_roadmap.md` → **em que ordem o projeto deve ser desenvolvido, qual é o status de cada fase e qual é o próximo objetivo.**
- Documentos específicos de fase → **detalhes técnicos de implementação e validação.**

O `development_roadmap.md` é a fonte oficial para o status do projeto. Em caso
de diferença de status entre os documentos, deve prevalecer o roadmap.
