# Convite Virtual de Casamento

Estado e próximos objetivos: [roadmap](docs/development_roadmap.md#estado-atual).
Operação DEV/UAT/PRD: [ambientes e publicação](docs/environments.md).

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
- **Hospedagem:** frontend estático e independente do provedor; homologação no GitHub Pages e produção na Vercel.

A arquitetura prioriza simplicidade, segurança, privacidade, baixo custo, manutenção e confiabilidade proporcional ao projeto.

## Fluxo de ambientes

```text
feature/landing-page → staging → production
 desenvolvimento        homologação   produção
 local/Codex             GitHub Pages  Vercel
```

GitHub Pages publica UAT somente de `staging`; a Vercel publica PRD de
`production`. DEV usa Supabase local; UAT e PRD têm projetos Supabase separados.
Promoções exigem autorização e CI aprovado no SHA exato.

App Config centraliza a infraestrutura pública do browser; o preparador estático
resolve metadados de root/subpath no artefato. Outros provedores compatíveis com
hospedagem estática podem publicar o mesmo frontend, sem alterar regras de
negócio. Instruções: [invite-app/README.md](invite-app/README.md#configuração-pública-e-publicação-portátil).

Contrato público, destinos e procedimentos de release:
[environments.md](docs/environments.md).

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

## Requisitos e operação

Objetivos, identidade visual, regras de RSVP, privacidade, autorização e
contingência: [contexto do projeto](docs/project_context.md).
Contratos e procedimentos: [índice documental](docs/README.md).

## Desenvolvimento local

O DEV isolado usa Docker/Supabase local, Auth local e uma contingência JSON local.
Antes de inicializar, conferir os [pré-requisitos e o snapshot do evento](docs/local-development.md#inicialização).
O primeiro bootstrap pode consultar a configuração pública remota se o snapshot
local não existir; sem autorização para essa consulta, interromper.
Com o ambiente preparado:

```powershell
npm run dev:up
```

Os comandos de reset, saúde, testes e parada estão documentados em
[local-development.md](docs/local-development.md). A arquitetura e a matriz de
ambientes estão em [environments.md](docs/environments.md).

Para testar somente o frontend localmente sem realizar um novo deploy:

```powershell
python -m http.server 8000 --bind 0.0.0.0
```

Endereços úteis:

- computador: `http://localhost:8000/invite-app/` (servidor na raiz do repositório);
- Android Emulator: `http://10.0.2.2:8000/invite-app/`;
- inspeção remota: `edge://inspect/#devices`.

Os detalhes do fluxo de testes mobile estão em [android-emulator-local-devtools.md](docs/android-emulator-local-devtools.md).

## Baseline de testes

Na raiz, `npm run test:node` executa a seleção canônica de testes Node.
O workflow [test.yml](.github/workflows/test.yml) também verifica sintaxe,
testes Deno e whitespace em Linux. SQL e integração DEV são camadas locais
separadas. Comandos, permissões e limites:
[estratégia de testes](docs/testing-strategy.md).

Resultados por data, SHA e ambiente: [QA final](docs/history/qa-final-evidence.md).
Testes locais não comprovam CI remoto, publicação nem aceite visual.

## Roadmap

As 13 fases estão concluídas nos escopos homologados. O
[roadmap](docs/development_roadmap.md) reúne entregas, backlog e riscos aceitos,
sem transformar melhorias opcionais em bloqueios de publicação.

## Documentação

O [índice documental](docs/README.md) reúne todos os guias e registros históricos
e define uma fonte principal por assunto.

- [Contexto do projeto](docs/project_context.md): objetivos, requisitos e decisões estáveis.
- [Roadmap](docs/development_roadmap.md): estado, trabalho restante e riscos aceitos.
- [Ambientes](docs/environments.md) e [DEV local](docs/local-development.md): configuração e operação.
- [Evidências históricas](docs/README.md#evidências-históricas): validações datadas e seus limites.
- [README do frontend](invite-app/README.md): implementação visual e previews.

Princípios técnicos: [contexto](docs/project_context.md#25-princípios-do-projeto).
Papel de `main` e descoberta pela branch padrão:
[recomendação operacional](docs/environments.md#descoberta-do-repositório-e-papel-de-main).
