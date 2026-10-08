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
FASE 11 — VERCEL / AMBIENTE DE DEPLOY
        ↓
FASE 12 — TESTES
        ↓
FASE 13 — DEPLOY / PRODUÇÃO
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
- [ ] Realizar a validação final do rate limiting.
- [x] Inserir no Supabase.
- [x] Retornar respostas padronizadas.
- [x] Implementar tratamento de erros.

**Resultado esperado:**

A API consegue receber, validar e persistir um RSVP corretamente, com proteção contra abuso implementada e validada na Edge Function.

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

---

# FASE 7 — Área administrativa

Objetivo: criar o ambiente privado para gerenciamento dos convidados.

- [x] Criar tela de login.
- [x] Criar estrutura inicial independente para `/admin`.
- [x] Integrar login por e-mail e senha com Supabase Auth.
- [x] Verificar sessão e proteger o acesso ao dashboard.
- [x] Implementar logout.
- [x] Criar estrutura inicial do dashboard com estados de carregamento e erro.
- [x] Configurar a chave pública Supabase em `invite-app/admin/scripts/supabase-config.js`.
- [x] Criar listagem administrativa de convidados via sessão autenticada e RLS.
- [x] Exibir nome, e-mail, presença, acompanhantes e data de envio.
- [x] Implementar estados de carregamento, erro e lista vazia.
- [x] 7A — Implementar a base administrativa privada, autenticação e dashboard.
- [x] 7B — Listar os convidados e validar a consulta autenticada.
- [x] 7C.1 — Recuperar com segurança registros da contingência.
- [x] 7C.2 — Listar e recuperar registros pendentes da contingência no dashboard.
- [x] 7D — Editar e excluir convidados com validação administrativa.
- [x] 7D — Exibir e recalcular indicadores dos convidados.
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

---

# FASE 8 — Monitoramento

Objetivo: verificar a saúde dos componentes importantes do sistema.

- [ ] Criar health check.
- [ ] Verificar disponibilidade da API.
- [ ] Verificar Edge Function.
- [ ] Verificar Supabase.
- [ ] Verificar banco.
- [ ] Validar a operação necessária ao RSVP.
- [ ] Configurar monitoramento externo.
- [ ] Configurar alertas de falha.
- [ ] Evitar notificações para operações normais.

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

---

# FASE 9 — Interface / Design

Objetivo: desenvolver a experiência visual do convite.

Esta fase vem depois da definição da base técnica, evitando construir a interface sobre uma arquitetura ainda instável.

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

---

# FASE 10 — Integração

Objetivo: conectar todas as camadas.

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

---

# FASE 11 — Vercel / Ambiente de Deploy

Objetivo: preparar e validar o ambiente de hospedagem da aplicação antes dos testes finais e da publicação em produção.

- [ ] Criar conta na Vercel.
- [ ] Conectar a conta da Vercel ao repositório GitHub.
- [ ] Criar e configurar o projeto na Vercel.
- [ ] Configurar o projeto para a estrutura utilizada pelo frontend.
- [ ] Configurar as variáveis de ambiente necessárias.
- [ ] Separar corretamente variáveis de ambiente de Preview e Production, quando necessário.
- [ ] Fazer um primeiro deploy de Preview/validação.
- [ ] Validar o carregamento do frontend através da Vercel.
- [ ] Validar a comunicação Frontend → API / Edge Function.
- [ ] Validar o uso das variáveis de ambiente no ambiente hospedado.
- [ ] Validar o comportamento da aplicação em ambiente hospedado.
- [ ] Preparar a configuração de domínio personalizado, se aplicável.

**Resultado esperado:**

Ambiente de Preview funcionando na Vercel, integrado ao GitHub e com as variáveis de ambiente necessárias configuradas corretamente. A aplicação está pronta para os testes finais antes da publicação em produção.

---

# FASE 12 — Testes

Objetivo: verificar funcionamento, segurança, confiabilidade e experiência.

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

---

# FASE 13 — Deploy / Produção

Objetivo: colocar o sistema em funcionamento real.

- [ ] Promover/publicar a versão validada na Vercel em Production.
- [ ] Revisar e configurar as variáveis de ambiente de Production.
- [ ] Confirmar a configuração do Supabase de produção.
- [ ] Configurar monitoramento.
- [ ] Validar health check.
- [ ] Fazer testes reais.
- [ ] Testar RSVP em produção.
- [ ] Testar área administrativa.
- [ ] Validar contingência.
- [ ] Validar segurança.
- [ ] Considerar domínio personalizado posteriormente.

**Resultado esperado:**

Convite disponível para os convidados e infraestrutura pronta para uso real.

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
[x] 01 — Base do projeto
[x] 02 — Banco / Supabase
[x] 03 — Segurança / Permissões
[ ] 04 — API / Edge Function (validação final do rate limiting pendente)
[x] 05 — RSVP
[x] 06 — Contingência
[x] 07 — Área Administrativa (Blocos 7A–7D)
[ ] 08 — Monitoramento
[ ] 09 — Interface / Design
[ ] 10 — Integração
[ ] 11 — Vercel / Ambiente de Deploy
[ ] 12 — Testes
[ ] 13 — Deploy / Produção
```

---

# Estado atual

**Fase 6 — Contingência: concluída.**

**Fase 7 — Área administrativa: concluída até o Bloco 7D.** Os Blocos 7A e 7B
entregam autenticação, proteção de sessão e listagem de convidados; o Bloco 7C
entrega listagem e recuperação da contingência; e o Bloco 7D entrega edição,
exclusão confirmada e indicadores. O CRUD administrativo foi validado com
registros sintéticos temporários, removidos ao final.

As Fases 1 a 3 e 5 a 7 estão concluídas. A Fase 4 permanece pendente
exclusivamente da validação final do rate limiting.

A proteção contra abuso / rate limiting está implementada na Supabase Edge
Function. Falta somente a validação final definida para a Fase 4.

A Fase 5 — RSVP está concluída. O fluxo real de confirmação de presença foi implementado, testado e validado, incluindo validações do frontend, integração com a API, estado de carregamento, tratamento de erros, confirmação após persistência real e tratamento de e-mail duplicado.

A Fase 6 — Contingência está concluída: contingência Google Sheets
implementada; fallback e retorno HTTP 202 validados; falha dupla HTTP 500
validada; logging administrativo via Supabase Logs implementado; procedimento
de recuperação manual documentado; função temporária de teste removida.

### Validação final da Fase 4

A proteção contra abuso foi implementada diretamente na **Supabase Edge
Function** e não depende da Vercel. A validação final do rate limiting
permanece pendente; a Fase 4 não está concluída até essa validação.

O fluxo esperado é:

```text
Frontend / Vercel
        ↓
Supabase Edge Function
        ↓
Proteção contra abuso
        ↓
Validação
        ↓
Supabase
```

Próximo objetivo:

> **Concluir a validação final do rate limiting pendente da Fase 4.**

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
