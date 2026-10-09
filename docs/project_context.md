# Project Context — Convite Virtual de Casamento

## 1. Visão geral

Projeto de **convite digital de casamento em formato de landing page web**, acessado por um link enviado diretamente aos convidados pelo WhatsApp.

O objetivo é criar uma experiência sofisticada, clássica, elegante e personalizada, semelhante à experiência de um convite físico de alta qualidade, mas com recursos interativos e confirmação de presença integrada.

O convite **não utilizará fotos do casal**.

---

## 2. Identidade visual

A identidade visual utiliza principalmente:

- Monograma dos noivos;
- Tipografia clássica e elegante;
- Folhagens;
- Elementos florais;
- Arabescos e ornamentos discretos;
- Linhas finas;
- Texturas que remetam a papelaria fina;
- Animações e transições suaves;
- Envelope/carta digital com animação de abertura;
- Design minimalista e sofisticado.

### Paleta de cores

A paleta principal utiliza **tons de verde oliva**, combinados com tons neutros, principalmente off-white e outras tonalidades claras.

Os tokens de cores, tipografia e movimento estão definidos em
`invite-app/styles/base/variables.css`; refinamentos devem preservar a identidade.

A intenção é transmitir a aparência de um **convite físico sofisticado transformado em uma experiência digital interativa**.

---

## 3. Experiência do convidado

O convidado receberá o link do convite pelo WhatsApp.

Fluxo conceitual:

```text
Link do convite
      ↓
Tela inicial
      ↓
Envelope / capa
      ↓
Animação de abertura
      ↓
Convite
      ↓
Informações do casamento
      ↓
Confirmação de presença
```

A experiência será projetada principalmente para celulares, mas deverá ser responsiva para desktops.

Não haverá necessidade de indicar número de WhatsApp para contato dentro do site.

Caso o convidado precise corrigir alguma informação depois do envio, poderá entrar em contato diretamente com os noivos pelo mesmo canal de WhatsApp através do qual recebeu o convite.

---

## 4. Frontend

Tecnologias definidas:

- HTML;
- CSS;
- JavaScript.

A aplicação deverá ser:

- Leve;
- Responsiva;
- Otimizada para dispositivos móveis;
- Visualmente sofisticada;
- Independente de templates de plataformas de convite.

Seções implementadas:

- Abertura do convite;
- Monograma;
- Nomes dos noivos;
- Mensagem/conteúdo do convite;
- Data;
- Horário;
- Local;
- Mapa/localização;
- Confirmação de presença;

---

## 5. Hospedagem

O **GitHub Pages** foi a hospedagem inicialmente adotada para o frontend.
A arquitetura é estática e independente do provedor. Vercel foi uma das opções
consideradas durante o desenvolvimento; serviços como Vercel, Cloudflare Pages
ou Netlify são exemplos de alternativas compatíveis, não destinos preferenciais.

Publicar em outro provedor exige configuração operacional de URLs, origins/CORS
e deploy, sem alterar regras de negócio. App Config deriva a base root/subpath;
o preparador resolve metadados no artefato. O provedor e os ambientes efetivamente
utilizados são registrados na documentação operacional, não requisitos fixos
da arquitetura.

Posteriormente poderá ser utilizado um domínio personalizado.

A solução deverá priorizar o plano gratuito sempre que for suficiente para o projeto.

---

## 6. Banco de dados

O banco de dados utiliza PostgreSQL no **Supabase**.

O Supabase também fornece a autenticação administrativa.

Arquitetura principal:

```text
Convidado
   │
   │ envia RSVP
   ▼
Landing Page
   │
   ▼
API / Edge Function
   │
   ▼
Supabase
   │
   └── INSERT
        ├── nome
        ├── email
        ├── presença
        └── acompanhantes
```

---

## 7. RSVP / Lista de presença

A confirmação de presença é realizada diretamente dentro da landing page.

O convidado **não precisará criar conta ou fazer login**.

Dados necessários:

```text
nome
email
presença
acompanhantes
```

O campo `acompanhantes` representa a quantidade de acompanhantes informada pelo
convidado e aceita valores inteiros entre `0` e `15`. O valor
`0` indica que o convidado não levará acompanhantes. Esse limite deverá ser
validado no frontend, na API/Edge Function e, quando aplicável, nas regras de
negócio do backend.

Fluxo:

```text
Convidado
    ↓
Preenche formulário
    ↓
Frontend realiza validações básicas
    ↓
Envia dados para API / Edge Function
    ↓
API valida novamente os dados
    ↓
API verifica regras de negócio
    ↓
INSERT no Supabase
    ↓
Confirmação apresentada ao convidado
```

O RSVP somente será considerado **confirmado** depois que a API receber confirmação de que o registro foi efetivamente salvo.

Se o registro falhar, o sistema não deverá informar falsamente que a presença foi confirmada.

---

## 8. Regra de e-mail único

O campo `email` deverá possuir uma restrição de unicidade no banco:

```text
email → UNIQUE
```

Isso impede que o mesmo endereço seja cadastrado mais de uma vez.

A validação deverá existir em dois níveis:

### Frontend

Para melhorar a experiência do usuário.

### Backend / Banco

Para garantir a regra de negócio mesmo que alguém tente burlar o frontend.

A restrição `UNIQUE` no banco será a garantia definitiva contra duplicidade.

Um e-mail já cadastrado será tratado como **regra de negócio**, e não como erro de infraestrutura.

---

## 9. Alteração dos dados

Depois do envio do RSVP, o convidado **não poderá alterar diretamente os dados cadastrados**.

Caso precise corrigir alguma informação, deverá entrar em contato com os noivos pelo WhatsApp através do qual recebeu o convite.

A alteração será realizada manualmente pelo administrador.

Não haverá:

- Sistema público de edição;
- Link público de alteração;
- Conta individual para convidados;
- Necessidade de armazenar número de telefone para contato.

Isso reduz a complexidade e a superfície de ataque.

---

## 10. Permissões do usuário público

O convidado terá acesso somente ao fluxo necessário para enviar seu RSVP.

```text
USUÁRIO PÚBLICO

INSERT → permitido através do fluxo controlado de RSVP
SELECT → não permitido
UPDATE → não permitido
DELETE → não permitido
```

O convidado não deverá conseguir:

- Consultar a lista de convidados;
- Consultar dados de outros convidados;
- Consultar diretamente a tabela;
- Alterar um RSVP já enviado;
- Excluir registros;
- Descobrir informações privadas de outros convidados.

---

## 11. API / Edge Function

A landing page não deverá realizar operações administrativas diretamente no banco.

O RSVP é enviado para uma **API / Edge Function**.

Responsabilidades:

1. Receber os dados;
2. Validar os dados;
3. Aplicar regras de negócio;
4. Validar formato do e-mail;
5. Validar campos obrigatórios;
6. Validar limites de acompanhantes;
7. Tratar e-mail duplicado;
8. Aplicar proteção contra abuso;
9. Executar o INSERT;
10. Retornar resposta adequada ao frontend;
11. Acionar o mecanismo de contingência caso ocorra uma falha de infraestrutura que impeça o cadastro normal.

A API deve assumir que requisições podem ser feitas diretamente, sem utilizar a interface oficial.

---

## 12. Segurança da API e proteção contra abuso

Como o RSVP é público, a API não deve confiar no frontend.

Medidas adotadas:

- Validação no frontend;
- Validação novamente no backend;
- Restrição `UNIQUE` no e-mail;
- Limite de tamanho dos campos;
- Validação de formatos;
- Limite para acompanhantes;
- Rate limiting;
- Proteção contra spam;
- Tratamento de requisições inválidas;
- Controle de erros;

CAPTCHA/Turnstile é uma melhoria opcional, condicionada à necessidade; não faz
parte das medidas implementadas.

A implementação deverá ser proporcional ao tamanho e à finalidade do projeto.

---

## 13. Segurança do Supabase

O projeto deverá utilizar:

- Row Level Security (RLS);
- Policies adequadas;
- Autenticação;
- Autorização;
- HTTPS.

O acesso público não deverá permitir leitura dos dados dos convidados. A leitura
do DTO público do evento ocorre somente pela Function `event-config`, não por
acesso direto à tabela.

Credenciais privilegiadas nunca deverão ser expostas no frontend.

A `service_role key` do Supabase **nunca deverá ser colocada em HTML, CSS ou JavaScript enviado ao navegador**.

---

## 14. Operações no banco

### Usuário público

```text
INSERT → permitido através do fluxo controlado da API
SELECT → bloqueado
UPDATE → bloqueado
DELETE → bloqueado
```

### Administrador

```text
SELECT → permitido
INSERT → permitido, se necessário
UPDATE → permitido
DELETE → permitido, se necessário
```

As operações administrativas deverão exigir autenticação e autorização adequadas.

---

## 15. Área administrativa

Existe uma área administrativa com autenticação e autorização no backend,
criação manual, listagem, edição e exclusão de convidados, indicadores,
recuperação da contingência e edição de `event_config`. O painel e as APIs
correspondentes estão implementados e integrados.

O painel permite visualizar:

```text
Nome
E-mail
Presença
Acompanhantes
```

Os indicadores implementados são:

```text
Total de convidados
Confirmados
Não poderão comparecer
Total de acompanhantes
Total de pessoas confirmadas
```

O administrador pode realizar:

- Correção de dados;
- Alteração de confirmação;
- Exclusão de registros, se necessário;
- Gerenciamento da lista.

---

## 16. Supabase Auth

O **Supabase Auth** autentica os administradores.

O convidado não terá conta.

Fluxo:

```text
ADMIN
   ↓
Login
   ↓
Supabase Auth
   ↓
Verificação de e-mail
   ↓
Área Administrativa
```

A **confirmação do e-mail do administrador será obrigatória**.

O **MFA não será implementado inicialmente**.

A arquitetura deverá permitir a inclusão de MFA posteriormente.

---

## 17. Autenticação x autorização

### Autenticação

Pergunta:

> Quem é o usuário?

Responsabilidade:

**Supabase Auth**

### Autorização

Pergunta:

> O que esse usuário pode fazer?

Responsabilidade:

- RLS;
- Policies;
- Controle de acesso;
- API/Edge Functions.

Descobrir a URL da área administrativa não deverá ser suficiente para acessar os dados.

---

## 18. Privacidade

Dados inicialmente coletados:

```text
nome
email
presença
acompanhantes
```

Não deverão ser coletados dados desnecessários.

Os dados dos convidados deverão permanecer privados.

Não haverá exposição pública da lista.

A comunicação deverá utilizar HTTPS.

O Supabase fornecerá criptografia dos dados em repouso.

Não haverá inicialmente necessidade de criptografar individualmente o campo de e-mail dentro do banco.

A prioridade será:

- Autenticação;
- Autorização;
- RLS;
- Proteção da API;
- Controle de acesso;
- Proteção das credenciais;
- Validação dos dados;
- Privacidade da tabela.

---

## 19. Monitoramento de saúde

O sistema possui um mecanismo de **health check** público para os
pré-requisitos operacionais read-only do RSVP.

A ideia é verificar não apenas se a página está acessível, mas se os componentes importantes do fluxo estão funcionando.

Conceito:

```text
UptimeRobot
      ↓
GET/HEAD /functions/v1/health
      ↓
public.check_rsvp_health()
      ↓
PostgreSQL e pré-requisitos do RSVP
      ↓
HTTP 200 ou HTTP 503
```

O health atual verifica a existência e acessibilidade das tabelas e do RPC de
rate limiting, além dos privilégios necessários ao RSVP. Não executa INSERT de
convidados, não incrementa o contador, não acessa Google Sheets e não simula uma
confirmação real. O UptimeRobot consulta o endpoint por `HEAD` a cada **15
minutos**; há monitoramento separado do frontend publicado em GitHub Pages.

O monitor é externo, independente de sessão administrativa e do provedor de
hospedagem estática. Detalhes: [health-check.md](health-check.md).

Caso seja identificada uma falha, o administrador deverá receber um alerta.

O monitoramento deverá preferencialmente ser executado por um serviço externo, e não depender do computador pessoal do administrador.

O objetivo é **monitorar a saúde do sistema**, e não criar um mecanismo artificial para evitar regras de inatividade do plano gratuito.

---

## 20. Notificações de erro

Não haverá notificação para cada RSVP realizado com sucesso.

O administrador deverá receber notificações **somente quando houver algum problema que exija atenção**.

Exemplos:

- Falha ao inserir no Supabase;
- Supabase indisponível;
- Edge Function indisponível;
- Erro inesperado no fluxo;
- Falha ao registrar a contingência;
- Falha de infraestrutura;
- Outro erro que impeça o cadastro normal.

Uma confirmação normal não deverá gerar notificação.

Também deverá ser evitado o envio desnecessário de dados pessoais do convidado na notificação.

---

## 21. Contingência com Google Sheets

O **Google Sheets é utilizado como contingência/fila de emergência**, e não como segundo banco permanente.

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
Confirmação ao convidado
```

### Fluxo em caso de falha de infraestrutura

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

O Google Sheets somente deverá participar do fluxo quando necessário.

A contingência deverá ser protegida adequadamente, considerando:

- Credenciais da API do Google;
- Permissões da planilha;
- Privacidade;
- Não exposição da planilha;
- Não exposição de credenciais no frontend;
- Controle de duplicidade;
- Sincronização posterior.

---

## 22. Regras da contingência

É importante diferenciar tipos de falha.

### Erro recuperável de infraestrutura

Exemplo:

```text
Supabase temporariamente indisponível
```

A aplicação deverá tentar preservar o RSVP na contingência e alertar o administrador.

### Erro de regra de negócio

Exemplo:

```text
E-mail já cadastrado
```

Não deverá ser tratado como falha de infraestrutura nem simplesmente duplicado na planilha.

### Erro inesperado

Exemplo:

```text
Erro não previsto na API
```

O sistema deverá tentar preservar o máximo possível das informações, registrar o erro e alertar o administrador.

A planilha de contingência não deverá se transformar em uma segunda lista permanente de convidados.

---

## 23. Confiabilidade do RSVP

Regra fundamental:

> O sistema somente deverá informar ao convidado que a presença foi confirmada quando houver confirmação de que o registro foi realmente persistido.

### Sucesso

```text
INSERT realizado
      ↓
Resposta confirmada (HTTP 201)
Mensagem adequada à presença ou ausência informada
```

### Falha com contingência

```text
INSERT no Supabase falhou
      ↓
Registro preservado na contingência
      ↓
Administrador alertado
      ↓
Convidado recebe mensagem apropriada
```

### Falha total

Se nem o banco principal nem a contingência conseguirem preservar o registro:

```text
Nenhum registro confirmado
      ↓
Administrador alertado
      ↓
Convidado recebe instrução para tentar novamente
```

Nunca apresentar sucesso falso.

---

## 24. Arquitetura geral

```text
                         ┌──────────────────────┐
                         │      CONVIDADO       │
                         │                      │
                         │ Acessa convite       │
                         │ Preenche RSVP        │
                         └──────────┬───────────┘
                                    │
                                  HTTPS
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  FRONTEND ESTÁTICO   │
                         │                      │
                         │ HTML / CSS / JS      │
                         │ Landing Page         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ API / EDGE FUNCTION  │
                         │                      │
                         │ Validação            │
                         │ Regras de negócio    │
                         │ Proteção contra      │
                         │ abuso                 │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       SUPABASE       │
                         │                      │
                         │ PostgreSQL           │
                         │ RLS                  │
                         │ Auth                 │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                       SUCESSO                FALHA
                         │                     │
                         ▼                     ▼
                  RSVP confirmado       Google Sheets
                                              │
                                              ▼
                                        Alerta ao admin
                                              │
                                              ▼
                                          Sincronização


        ┌────────────────────────────────────────────┐
        │              MONITORAMENTO                 │
        │                                            │
        │ health → RPC read-only → PostgreSQL        │
        │ Frontend: monitor independente             │
        └──────────────────────┬─────────────────────┘
                               │
                             FALHA
                               │
                               ▼
                         ALERTA ADMIN
```

---

## 25. Princípios do projeto

As decisões técnicas deverão seguir:

### Simplicidade

Não adicionar componentes ou serviços sem necessidade.

### Segurança

Considerar que o frontend público pode ser manipulado.

### Privacidade

Dados dos convidados nunca devem ficar disponíveis publicamente.

### Baixo custo

Priorizar recursos gratuitos ou de baixo custo quando forem adequados.

### Manutenção

A arquitetura deve ser simples de compreender e manter.

### Escalabilidade proporcional

Não construir arquitetura empresarial desnecessária para um convite de casamento.

### Confiabilidade

Um RSVP somente deve ser considerado confirmado quando houver persistência real ou, em caso de falha recuperável, preservação na contingência.

### Experiência

A tecnologia deve servir ao design e à experiência do convidado.

---

## 26. Tecnologias definidas

```text
Frontend
→ HTML
→ CSS
→ JavaScript

Hospedagem
→ Frontend estático independente do provedor
→ GitHub Pages foi a escolha inicial

Backend/API
→ Edge Function / API

Banco
→ Supabase
→ PostgreSQL

Autenticação
→ Supabase Auth
→ Confirmação de e-mail obrigatória

Segurança
→ RLS
→ Policies
→ HTTPS
→ Validação frontend/backend
→ UNIQUE(email)
→ Rate limiting / proteção contra abuso

Monitoramento
→ Health check
→ Monitoramento externo
→ Alertas em caso de falha

Contingência
→ Google Sheets
→ Somente em caso de falha do fluxo principal
→ Não utilizar como banco permanente

MFA
→ Futuro
→ Não implementar inicialmente
```

---

## 27. Requisitos consolidados do projeto

Este documento consolida a visão do produto, os requisitos funcionais, os
requisitos de segurança e as decisões arquiteturais do projeto.

Ele não é o documento oficial para acompanhar o status das fases ou o próximo
passo de execução. Essas informações devem permanecer no
`development_roadmap.md`.

### Requisitos funcionais

- Landing page de convite;
- Experiência visual interativa;
- RSVP;
- Cadastro de nome, e-mail, presença e acompanhantes;
- E-mail único;
- Área administrativa;
- Criação manual e gerenciamento de convidados;
- Configuração centralizada do evento e leitura pública por API;
- Leitura dos convidados somente pelo administrador;
- Alteração dos convidados e do evento somente pelo administrador;
- Autenticação administrativa;
- Confirmação de e-mail do administrador;
- Monitoramento de saúde;
- Alertas somente em caso de erro;
- Contingência via Google Sheets;
- Sincronização posterior da contingência.

### Requisitos de segurança

- RLS;
- Policies;
- API/Edge Function;
- Validação no frontend e backend;
- `UNIQUE(email)`;
- Não expor `service_role key`;
- HTTPS;
- Proteção contra spam/abuso;
- Autenticação administrativa;
- Autorização administrativa;
- Privacidade dos dados;
- Google Sheets privado e protegido;
- Não permitir leitura pública dos convidados.

### Requisitos deliberadamente adiados

- MFA;
- Domínio personalizado;
- Recursos administrativos avançados;
- CAPTCHA/Turnstile, caso não seja necessário;
- Outras funcionalidades que não sejam essenciais ao RSVP.

### Configuração pública e separação de responsabilidades

`scripts/shared/app-config.js` é a fonte única de URL e
chave pública Supabase do browser. A base da aplicação é derivada do módulo;
metadados absolutos são preparados no artefato por `scripts/prepare-static-site.mjs`
com `PUBLIC_SITE_URL` operacional. Não há secrets no módulo nem `.env` no browser.
Detalhes de execução e limites: [invite-app/README.md](../invite-app/README.md#configuração-pública-e-publicação-portátil).

Event Config contém 14 campos públicos do evento em um singleton no Supabase.
A Function pública `event-config` oferece GET; `admin-manage-event-config`
oferece GET/PUT com Auth, allowlist e Origin autorizado. O frontend consome uma
Promise/GET por página, com timeout, validação e textContent; mantém estados
loading/ready/not-configured/error, sem fallback pessoal nem cache persistente.
Opcionais ausentes ficam ocultos. A recepção tem localização própria, sem herdar
city/state da cerimônia. Contratos, limites e histórico de validação:
[event-config.md](event-config.md).

Monograma e preview genérica são assets versionados, não campos configuráveis
do evento. Datas/horários do evento são civis; timestamps de auditoria permanecem
instantes absolutos. America/Sao_Paulo é aplicada somente à apresentação
administrativa desses timestamps. O painel mantém formulários independentes
e Event Config recolhível, sem persistência do estado de expansão.

A validação de convidados é compartilhada por RSVP, administração e recuperação.
Logs técnicos não devem conter PII nem erros externos brutos. Credenciais
privilegiadas e allowlist administrativa pertencem exclusivamente ao backend.
Dados reais do evento permanecem no Supabase, não no Git; porém, a API e o
convite são públicos. Não versionar esses dados não os torna secretos em runtime.
O status, os aceites realizados e os critérios restantes ficam no roadmap.

---

## 28. Relação com o development_roadmap.md

O `project_context.md` e o `development_roadmap.md` possuem responsabilidades
diferentes e complementares:

- `project_context.md` define o que o projeto é, seus requisitos, suas regras
  de segurança e suas decisões arquiteturais;
- `development_roadmap.md` define a ordem de execução, o status das fases, as
  tarefas concluídas, as pendências e o próximo objetivo;
- documentos específicos de fase registram detalhes técnicos de implementação,
  validação e decisões locais.

O `development_roadmap.md` é a fonte oficial para o status do projeto. Em caso
de diferença de status entre os documentos, deve prevalecer o roadmap.

O projeto deve ser desenvolvido em etapas, mantendo a separação:

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

Cada camada deverá ser validada antes de avançar para a próxima.
