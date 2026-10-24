# Arquitetura do código-fonte

Este mapa descreve responsabilidades do código versionado. Contrato de ambiente
e publicação: [environments.md](environments.md); evidências datadas:
[qa-final-evidence.md](qa-final-evidence.md).

## Entrada do frontend público

`index.html`, `admin/index.html` e `admin/login.html` carregam uma única
entrada `scripts/shared/bootstrap.js`. Ela aguarda o manifesto da própria origem
e a validação de `environment-config.js` antes de importar o main correspondente.
`app-config.js` só exporta valores revalidados, sem destino padrão.
Falhas exibem alerta acessível e bloqueiam formulários. O contrato e a
compatibilidade do arquivo DEV legado estão em [environments.md](environments.md).

`scripts/main.js` coordena as fachadas `scripts/envelope.js` e
`scripts/letter.js`, além de `event-config.js`, `invitation-names.js` e RSVP.
As responsabilidades internas ficam separadas assim:

- `welcome/envelope.js` controla a máquina de estados da abertura, timers,
  pausa/continuação e retorno à capa.
- `welcome/decorations.js` executa a trajetória WAAPI do grupo floral e do
  selo; `welcome/typography.js` cuida somente da tipografia da capa.
- `letter/letter.js` alterna visibilidade/foco; `letter/rsvp.js` traduz o
  formulário para o contrato HTTP e diferencia 201 de contingência 202.
  Ambos travam reenvio na mesma página; erros permitem nova tentativa.
- `event-config.js` valida o DTO, atualiza campos `data-event-*`, metadados e
  emite `invitation:content-updated` para os módulos tipográficos.
- `styles/main.css` é o entrypoint da cascata; `base`, `welcome`, `letter`,
  `responsive` e `devmode` mantêm tokens e áreas visuais separadas.

## Painel administrativo

`invite-app/admin/scripts/main.js` escolhe login ou dashboard pelo atributo
`data-page`. `auth.js` concentra sessão; `supabase.js` cria o cliente sob
demanda, com storageKey por ambiente/project ref; `functions.js` normaliza erros das Edge Functions.

No dashboard, `guest-list-controller.js` é a fonte do estado de pesquisa,
debounce, paginação e descarte de respostas obsoletas. `guests.js` busca a
API; `guest-validation.js` fornece feedback antecipado mantendo as mesmas
regras de `_shared/guest-validation.ts`; `main.js` apenas renderiza e conecta
eventos. `event-config.js` administra o singleton do evento. `contingency.js`
e as funções correspondentes exibem e recuperam a fila operacional.

## Edge Functions

Cada pasta de função separa o entrypoint (`index.ts`) das regras testáveis em
`handler.ts`:

1. validar origem e método;
2. autenticar JWT quando aplicável;
3. verificar allowlist administrativa;
4. validar query/payload;
5. executar a dependência injetada (RPC, provider ou banco);
6. devolver um contrato HTTP sem detalhes sensíveis.

`_shared/admin-auth.ts`, `event-validation.ts` e `guest-validation.ts` são
contratos reutilizados por várias funções. `contingency.ts` seleciona o
provider: Google Sheets nos ambientes publicados e sidecar JSON somente no
DEV. `admin-recover-contingency/recovery.ts` mantém o lock, a idempotência e a
verificação de limpeza fora do handler HTTP.

## Banco, build e testes

As migrations em `supabase/migrations` são históricas e aplicadas em ordem.
`docs/database-schema.md` descreve o modelo consolidado sem substituir essas
migrations. O build em `scripts/prepare-static-site.mjs` copia para `_site`,
valida o contrato e o manifesto de destinos antes de qualquer GET externo,
deriva Event Config e resolve metadados. Copia somente public-assets.json e
gera runtime-config.json do ambiente selecionado. O helper de título puro
fica em shared/invitation-title.js, sem importar configuração do navegador.

Os testes Node modelam DOM, timers e filesystem; os testes Deno exercitam
handlers e módulos compartilhados com dependências sintéticas; `block3.sql`
verifica grants/RLS/constraints em uma transação local revertida. Nenhum deles
é aceite visual de navegador ou validação de produção por si só.
