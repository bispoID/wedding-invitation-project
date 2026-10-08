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

**Entrega anterior concluída; extensão do Lote 2 implementada:** App Config e
preparação portátil do artefato. Revisão e aceite publicado permanecem pendentes.

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

**Entrega anterior concluída; extensão pendente:** schema de `event_config` e
constraints adicionais de convidados serão implementados em lotes posteriores.

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

**Entrega anterior concluída; extensão pendente:** aplicar o padrão de segurança
às futuras APIs/tabela de evento e revalidar os acessos.

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

**Entrega anterior concluída; extensão pendente:** APIs de configuração do evento,
validação compartilhada e minimização dos logs. O rate limit não será alterado
como parte do Lote 1.

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
"Presença confirmada!"
```

Nunca apresentar sucesso falso.

**Resultado esperado:**

O convidado consegue confirmar presença de forma confiável.

**Entrega anterior concluída; revalidação futura:** preservar os contratos e o
comportamento do RSVP após as extensões de configuração e validação.

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

**Entrega anterior concluída; revalidação futura:** preservar reconciliação,
lock e limpeza segura após as novas validações e minimização de logs.

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
- [x] Publicar as quatro Edge Functions administrativas com `verify_jwt=true`.
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

**Entrega anterior concluída; extensão pendente:** criação manual de convidados,
edição de `event_config` e navegação para convite/previews. Atualmente existem
listagem, edição e exclusão; a criação manual ainda não foi implementada.

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

**Resultado da Fase 8:**

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

**Estado: PARCIAL.** Envelope/capa, animação, carta, tipografia, monograma,
informações do evento, RSVP, responsividade e previews já possuem implementação
significativa. Os itens abaixo permanecem como checklist de aceite final, não
como afirmação de que a interface está vazia.

- [ ] Definir identidade visual.
- [ ] Integrar monograma.
- [ ] Definir tipografia.
- [ ] Definir paleta de cores.
- [ ] Criar envelope/capa.
- [ ] Criar animação de abertura.
- [ ] Criar estrutura do convite.
- [ ] Inserir nomes dos noivos.
- [ ] Inserir mensagem/conteúdo.
- [ ] Inserir data e horário.
- [ ] Inserir local.
- [ ] Inserir mapa/localização.
- [ ] Integrar RSVP.
- [ ] Criar responsividade.
- [ ] Criar animações e transições.
- [ ] Refinar experiência mobile.

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

**Critérios de conclusão:** validar desktop/mobile, teclado e redução de
movimento; aprovar layout e nomes longos; nos lotes posteriores, integrar os
dados de `event_config`, tratar loading/erro/campos opcionais e substituir
conteúdo/assets personalizados versionados por alternativas genéricas.

---

# FASE 10 — Integração

Objetivo: conectar todas as camadas.

**Estado: PARCIAL.** RSVP, banco, Auth/admin, contingência e health já estão
integrados no escopo atual. Falta o aceite ponta a ponta do escopo equalizado,
incluindo as extensões ainda não implementadas. O checklist é de revalidação.

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

- [ ] Frontend → API funcionando.
- [ ] API → Supabase funcionando.
- [ ] API → contingência funcionando.
- [ ] Área administrativa → Auth funcionando.
- [ ] Área administrativa → banco funcionando.
- [ ] Monitoramento → serviços funcionando.
- [ ] Variáveis de ambiente configuradas.
- [ ] Segredos protegidos.
- [ ] Fluxo completo validado.

**Resultado esperado:**

Todo o sistema funciona como uma única aplicação.

**Critérios de conclusão:** validar os contratos atuais e futuros de ponta a
ponta, configuração única por carregamento, CRUD administrativo completo,
edição do evento, erros e ausência de regressões no RSVP/contingência.

---

# FASE 11 — Hospedagem estática / ambientes

Objetivo: validar a hospedagem atual e a portabilidade operacional do frontend
estático, sem dependência de um provedor nas regras de negócio.

**Estado: PARCIAL.** GitHub Pages é a hospedagem atual/canônica, com publicação
implementada. O Lote 2 centraliza configuração pública e prepara metadados de
root/subpath, com testes locais. O aceite publicado e de origins segue pendente.

- [x] Implementar publicação de `invite-app` no GitHub Pages por workflow.
- [ ] Validar paths na raiz e no subpath `/wedding-invitation-project/`.
- [ ] Validar comunicação Frontend → Edge Functions no ambiente publicado.
- [x] Centralizar configuração pública e preparar URLs de metadados no Lote 2.
- [ ] Validar origins/CORS dos ambientes efetivamente utilizados.
- [x] Documentar preparação e testes locais do artefato estático.
- [ ] Validar configuração operacional de Preview/Production, quando necessária.

Vercel é uma alternativa futura/opcional. Caso adotada, configurar publicação
do mesmo frontend e validar URLs/origins. Não é necessário criar conta, migrar
ou publicar na Vercel para concluir esta fase. Domínio personalizado também
permanece opcional.

**Resultado esperado:**

GitHub Pages validado, configuração operacional documentada e portabilidade de
paths verificada, sem modificar regras de negócio. A aplicação está pronta
para os testes finais no provedor estático escolhido.

---

# FASE 12 — Testes / qualidade

Objetivo: verificar funcionamento, segurança, confiabilidade e experiência.

**Estado: PARCIAL.** Existem sete arquivos de teste das Functions e um de
métricas administrativas. O Lote 1 acrescenta a baseline em Linux/CI, sem
representar aceite completo de segurança, integração ou interface.

## Baseline automatizada

- [x] Criar workflow independente `.github/workflows/test.yml` em Linux.
- [x] Configurar descoberta de JavaScript versionado e `node --check`.
- [x] Incluir testes das Functions e o teste de métricas explicitamente.
- [x] Restringir permissões dos testes e dispensar secrets de produção.
- [x] Configurar verificação de whitespace.
- [x] Executar os oito arquivos localmente fora do isolamento: 57 testes aprovados em 08/10/2026.
- [x] Confirmar baseline do Lote 1 no GitHub Actions: execução 37852513840, em 08/10/2026.
- [x] Acrescentar testes Node de App Config e preparação portátil no Lote 2.
- [x] Executar localmente o Lote 2: 26 testes Node novos e os 57 Deno existentes aprovados.
- [ ] Confirmar a execução remota da extensão de testes do Lote 2 após revisão.

O workflow utiliza Node.js `22.14.0` e Deno `2.9.7` em `ubuntu-24.04`. A execução
Windows dentro do isolamento local apresentou panic de named pipe no runner;
o mesmo comando passou fora do isolamento, com 57 testes e zero falhas.
`--no-run` é checagem, não execução de asserções. A baseline Linux do Lote 1
passou; a extensão do Lote 2 ainda não foi publicada. Comandos novos:
[invite-app/README.md](../invite-app/README.md#configuração-pública-e-publicação-portátil).
Comandos Deno e permissões: [external-services.md](external-services.md#baseline-linux--ci).

## RSVP

- [ ] RSVP válido.
- [ ] RSVP duplicado.
- [ ] E-mail inválido.
- [ ] Campos vazios.
- [ ] Limite de acompanhantes.
- [ ] Requisição manual à API.

## Segurança

- [ ] Tentativa de `SELECT` público.
- [ ] Tentativa de `UPDATE` público.
- [ ] Tentativa de `DELETE` público.
- [ ] Acesso à área administrativa sem autenticação.
- [ ] Validação das policies.
- [ ] Verificação de credenciais expostas.

## Falhas

- [ ] Falha do Supabase.
- [ ] Falha da API.
- [ ] Falha da contingência.
- [ ] Erro inesperado.
- [ ] Verificação dos alertas.

## Interface

- [ ] Mobile.
- [ ] Desktop.
- [ ] Diferentes tamanhos de tela.
- [ ] Animações.
- [ ] Formulário.
- [ ] Fluxo completo do convite.

**Resultado esperado:**

Sistema validado antes da publicação.

**Critérios de conclusão:** suíte executada em runtime funcional e evidências
dos testes de RLS/CORS, RSVP, admin, contingência, health e interface. As futuras
APIs de evento, limites e portabilidade deverão integrar esse aceite, sem
testes destrutivos em produção.

---

# FASE 13 — Publicação / operação

Objetivo: colocar o sistema em funcionamento real.

**Estado: PUBLICADO; ACEITE FINAL PENDENTE.** O frontend atual já está publicado
via GitHub Pages e a infraestrutura Supabase possui validações anteriores. A
publicação existente não equivale ao aceite do escopo equalizado.

- [x] Disponibilizar a publicação atual via GitHub Pages.
- [ ] Publicar a versão equalizada somente após os critérios das Fases 10 a 12.
- [ ] Revisar a configuração pública e operacional do ambiente escolhido.
- [ ] Confirmar a configuração do Supabase de produção.
- [ ] Configurar monitoramento.
- [ ] Validar health check.
- [ ] Realizar smoke checks não destrutivos no ambiente publicado.
- [ ] Validar o RSVP completo em ambiente de teste com registros sintéticos.
- [ ] Testar área administrativa.
- [ ] Validar contingência.
- [ ] Validar segurança.
- [ ] Considerar domínio personalizado posteriormente.

**Resultado esperado:**

Convite disponível para os convidados e infraestrutura pronta para uso real.

**Critérios de conclusão:** versão equalizada aprovada, smoke checks,
monitoramento, procedimentos operacionais e evidências de segurança/integração
documentados. Vercel e domínio personalizado não são requisitos obrigatórios.

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
[x] 01 — Base do projeto (entrega anterior; App Config/preparador implementados)
[x] 02 — Banco / Supabase (entrega anterior; extensão pendente)
[x] 03 — Segurança / Permissões (entrega anterior; extensão pendente)
[x] 04 — API / Edge Function (entrega anterior; extensão pendente)
[x] 05 — RSVP (entrega anterior; revalidação futura)
[x] 06 — Contingência (entrega anterior; revalidação futura)
[x] 07 — Área Administrativa (Blocos 7A–7D; extensão pendente)
[x] 08 — Monitoramento
[ ] 09 — Interface / Design (PARCIAL)
[ ] 10 — Integração (PARCIAL)
[ ] 11 — Hospedagem estática / ambientes (PARCIAL; Pages implementado)
[ ] 12 — Testes / qualidade (PARCIAL; baseline CI criada)
[ ] 13 — Publicação / operação (PUBLICADO; ACEITE FINAL PENDENTE)
```

---

# Estado atual

**Fase 6 — Contingência: concluída.**

**Fase 7 — Área administrativa: entrega anterior concluída; extensão pendente.** A autenticação Supabase Auth e a
proteção de sessão estão implementadas. A autorização é verificada no backend
por JWT válido e associação do UUID à lista `ADMIN_AUTH_USER_IDS`; suporta
múltiplos administradores e retorna 403 a usuários autenticados não autorizados.
Listagem, edição e exclusão de convidados, os indicadores e a integração da
contingência ao painel estão implementados. A criação manual ainda não existe.
O hardening de segurança foi realizado, mantendo
`service_role` exclusivamente no backend. As quatro Edge Functions
administrativas foram verificadas como ACTIVE e com `verify_jwt=true` na
auditoria de 08/10/2026. Listagem, edição e exclusão administrativas foram
validadas anteriormente com registros sintéticos temporários, removidos ao
final.

As entregas anteriores das Fases 1 a 8 estão concluídas. App Config e preparador
estático foram implementados no Lote 2; demais extensões das Fases 2 a 7 seguem
pendentes.

**Fase 8 — Monitoramento: concluída.** A configuração oficial do UptimeRobot é
`HEAD` a cada 15 minutos. Este lote equaliza somente sua documentação.

**Fases 9, 10 e 12: parciais.** Já há interface, integração e testes. O workflow
Linux do Lote 1 passou; os novos testes do Lote 2 aguardam execução remota.

**Fase 11: parcial.** Pages é atual/canônico; a portabilidade operacional foi
testada localmente para configuração/metadados; aceite publicado ainda pendente.
Vercel é alternativa opcional.

**Fase 13: publicado, com aceite final pendente.** A publicação atual em Pages
não encerra a equalização.

`event_config`, criação manual, minimização de PII/logs,
constraints adicionais e novas Functions/migrations permanecem como extensões
aprovadas para lotes posteriores.

A proteção contra abuso / rate limiting está implementada na Supabase Edge
Function e foi validada. O IP é obtido pelo header `x-forwarded-for`, seu hash
SHA-256 é usado no controle persistido no Supabase, e os testes e o
comportamento do rate limiting foram verificados.

A Fase 5 — RSVP está concluída. O fluxo real de confirmação de presença foi implementado, testado e validado, incluindo validações do frontend, integração com a API, estado de carregamento, tratamento de erros, confirmação após persistência real e tratamento de e-mail duplicado.

A Fase 6 — Contingência está concluída: contingência Google Sheets
implementada; fallback e retorno HTTP 202 validados; falha dupla HTTP 500
validada; logging administrativo via Supabase Logs implementado; procedimento
de recuperação manual documentado; função temporária de teste removida.

### Validação do rate limiting da Fase 4

A proteção contra abuso foi implementada diretamente na **Supabase Edge
Function** e não depende da Vercel. O rate limiting foi testado e validado,
incluindo o uso do IP encaminhado em `x-forwarded-for`, hash SHA-256 e
armazenamento persistente no Supabase.

O fluxo esperado é:

```text
Frontend estático (GitHub Pages atual; outro provedor opcional)
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
