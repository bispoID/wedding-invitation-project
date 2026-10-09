# Convite Virtual de Casamento

Convite digital de casamento em formato de landing page web, com uma experiência sofisticada e interativa e confirmação de presença (RSVP) integrada.

O convite é acessado por um link enviado aos convidados, principalmente pelo WhatsApp. A experiência é mobile-first e também responsiva para desktops.

## Visão geral

O projeto combina:

- **Frontend:** HTML, CSS e JavaScript;
- **Backend/API:** Supabase Edge Functions;
- **Banco de dados:** PostgreSQL via Supabase;
- **Autenticação administrativa:** Supabase Auth;
- **Contingência:** Google Sheets como fila temporária de recuperação;
- **Monitoramento:** Health Check e UptimeRobot;
- **Hospedagem:** frontend estático e independente do provedor; GitHub Pages foi a escolha inicial.

A arquitetura prioriza simplicidade, segurança, privacidade, baixo custo, manutenção e confiabilidade proporcional ao projeto.

App Config centraliza a infraestrutura pública do browser; o preparador estático
resolve metadados de root/subpath no artefato. Outros provedores compatíveis com
hospedagem estática podem publicar o mesmo frontend, sem alterar regras de
negócio. Instruções: [invite-app/README.md](invite-app/README.md#configuração-pública-e-publicação-portátil).

## Arquitetura principal

```text
                           CONVIDADO
                               │
                               │ HTTPS
                               ▼
                  ┌─────────────────────────┐
                  │ FRONTEND                │
                  │ HTML / CSS / JavaScript │
                  │ Hospedagem estática     │
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │ SUPABASE EDGE FUNCTIONS │
                  │ RSVP / Evento / Admin   │
                  │ Health Check            │
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │ SUPABASE                │
                  │ PostgreSQL / Auth / Logs│
                  └──────────┬──────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                  SUCESSO           FALHA DE INFRAESTRUTURA
                    │                 │
                    ▼                 ▼
              RSVP persistido    Google Sheets
                                      │
                                      ▼
                              Recuperação administrativa

                 UptimeRobot ──► Health Check ──► alerta por e-mail
```

O frontend público não acessa diretamente a lista de convidados. O RSVP passa pela Edge Function, e a confirmação somente é apresentada depois que a persistência é confirmada.

## Funcionalidades principais

### Experiência do convidado

- abertura do convite digital com foco em dispositivos móveis;
- conteúdo visual do casamento e informações do evento;
- informações carregadas pela API pública Event Config, sem dados reais de fallback no Git;
- formulário de confirmação de presença sem necessidade de criar conta;
- confirmação somente após o processamento do RSVP.

### RSVP

O formulário coleta:

- nome;
- e-mail;
- presença;
- quantidade de acompanhantes, de `0` a `15`.

O e-mail possui restrição `UNIQUE` no banco. A validação existe no frontend e no backend, enquanto a proteção definitiva contra duplicidade é garantida pelo banco de dados.

### Administração

A área administrativa utiliza Supabase Auth e permite:

- autenticação por e-mail e senha;
- criação manual, listagem, edição e exclusão de convidados;
- indicadores da lista;
- edição centralizada da configuração pública do evento;
- visualização e recuperação de registros da contingência.

A autorização é verificada no backend. O frontend não decide quem é administrador, e o `service_role` permanece restrito às Edge Functions.

### Contingência e monitoramento

Quando uma falha de infraestrutura impede a persistência normal, o RSVP pode ser encaminhado para o Google Sheets como registro temporário. A recuperação é feita administrativamente e a linha somente é removida depois da confirmação do registro no banco.

A Edge Function pública `health` verifica os pré-requisitos operacionais do RSVP. O UptimeRobot consulta esse endpoint por `HEAD` a cada 15 minutos e envia alertas quando há falha.

## Desenvolvimento local

Para testar o frontend localmente sem realizar um novo deploy:

```powershell
python -m http.server 8000 --bind 0.0.0.0
```

Endereços úteis:

- computador: `http://localhost:8000`;
- Android Emulator: `http://10.0.2.2:8000`;
- inspeção remota: `edge://inspect/#devices`.

Os detalhes do fluxo de testes mobile estão em [android-emulator-local-devtools.md](docs/android-emulator-local-devtools.md).

## Baseline de testes

O workflow [test.yml](.github/workflows/test.yml) executa a validação em Linux
(`ubuntu-24.04`), com Node.js `22.14.0` e Deno `2.9.7`. Ele verifica a sintaxe dos
JavaScript versionados, executa os testes das Functions e inclui explicitamente
`invite-app/admin/scripts/guest-metrics.test.ts`, além de verificar whitespace.
Também executa os testes Node de App Config, preparação portátil, Admin e Event
Config em `scripts/`. O QA consolidado passou localmente e em Linux/CI com **356 testes:
144 Deno e 212 Node**, incluindo as regressões de acessibilidade, movimento
e nomes longos. Suas correções foram versionadas e publicadas; o aceite visual
final da publicação permanece pendente na Fase 13.

Os testes usam dependências simuladas e dados sintéticos. Não exigem secrets de
produção, não acessam banco ou Google Sheets reais e não fazem deploy. O
workflow de deploy permanece independente, com gate Node antes da preparação.
A baseline histórica do Bloco 7, de **263 testes (144 Deno e 119 Node)**, passou
localmente e no GitHub Actions; o novo CI de 356 testes está registrado nas
evidências do QA final.
A suíte SQL
`supabase/tests/block3.sql`, separada do CI, também foi aprovada integralmente
em PostgreSQL/Supabase local descartável, com as 15 migrations e ROLLBACK.
Detalhes SQL: [event-config.md](docs/event-config.md#validação-local).
Regressão e aceites manuais consolidados:
[qa-final-evidence.md](docs/qa-final-evidence.md).

Permissões, comando local equivalente e o registro histórico do runner no Windows
estão descritos em [external-services.md](docs/external-services.md#deno).

## Roadmap

O desenvolvimento do projeto está organizado em 13 fases, que estruturam sua evolução desde a base técnica até a publicação e validação em produção:

1. Base do projeto;
2. Banco / Supabase;
3. Segurança / permissões;
4. API / Edge Function;
5. RSVP;
6. Contingência;
7. Área administrativa;
8. Monitoramento;
9. Interface / Design;
10. Integração;
11. Hospedagem estática / ambientes;
12. Testes / qualidade;
13. Publicação / operação.

O [development_roadmap.md](docs/development_roadmap.md) é a fonte oficial para a ordem, o status e os próximos objetivos das fases.

O escopo funcional atual está implementado e publicado, incluindo App Config,
Event Config, criação manual de convidados e minimização de PII nos logs.
O roadmap distingue essas entregas validadas dos critérios de aceite manual
ampliado de interface/acessibilidade ainda sem evidência consolidada e das
melhorias opcionais. Publicação funcional não equivale a validar toda combinação
de navegador, tela ou tecnologia assistiva.

## Documentação

| Documento | Finalidade |
|---|---|
| [project_context.md](docs/project_context.md) | Visão do produto, requisitos e arquitetura estável |
| [development_roadmap.md](docs/development_roadmap.md) | Ordem de execução, status e próximos objetivos |
| [external-services.md](docs/external-services.md) | Ferramentas e serviços externos |
| [health-check.md](docs/health-check.md) | Arquitetura e operação do Health Check |
| [admin-guest-management.md](docs/admin-guest-management.md) | Autenticação, autorização e gerenciamento administrativo |
| [event-config.md](docs/event-config.md) | Configuração centralizada do evento, contratos e validações SQL |
| [google-sheets-contingency-recovery.md](docs/google-sheets-contingency-recovery.md) | Recuperação da contingência |
| [android-emulator-local-devtools.md](docs/android-emulator-local-devtools.md) | Testes locais no Android Emulator |
| [README do invite-app](invite-app/README.md) | Orientações específicas do frontend |

## Princípios

- **Simplicidade:** evitar componentes e serviços desnecessários.
- **Segurança:** nunca confiar no frontend público.
- **Privacidade:** não expor os dados dos convidados publicamente.
- **Baixo custo:** priorizar recursos gratuitos ou de baixo custo.
- **Manutenção:** manter a arquitetura compreensível.
- **Escalabilidade proporcional:** evitar complexidade empresarial desnecessária.
- **Confiabilidade:** nunca apresentar um RSVP como confirmado sem persistência real.
- **Experiência:** fazer a tecnologia servir à experiência do convite.
