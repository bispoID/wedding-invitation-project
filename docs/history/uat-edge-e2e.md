# Etapa 4 — E2E no Microsoft Edge, 23/10/2026

> **Registro histórico de etapa.** Estados, limites, bloqueios e próximas ações
> abaixo valem na data do checkpoint, não como backlog atual. A separação foi
> concluída posteriormente: [estado atual](../development_roadmap.md#estado-atual).
> Operação vigente: [environments.md](../environments.md).

## Resultado e escopo

**APROVADA COM RESSALVAS** de cobertura: Edge Windows e layout mobile emulado,
sem aceite humano em aparelho real ou matriz completa de navegadores.
O bloqueio do primeiro executor foi resolvido por autorização explícita do
usuário para Playwright com o Edge instalado. Nenhum frontend foi publicado.

Inicial: feature/uat-environment-isolation, HEAD
`ed04d5cec2bc8ab12eaa004fc0629d8f7c0bdb84`, worktree limpo. Commits e artefatos
anteriores preservados. Runtime público UAT e hashes de todos os arquivos do
artefato anterior conferidos antes da execução. Ref autorizado
`eugvobtvjicvocttnkka`; backend respondeu com a fixture fictícia esperada.

## Executor, artefato e interceptação

Node 22.14.0, Playwright 1.62.1 reutilizado do runtime e Edge 155.0.4283.62 em
`C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`. Não se instalou
pacote permanente, não se alteraram package.json/package-lock e não se baixou
outro navegador. Execução funcional headful para a entrada humana da senha;
checagem complementar somente leitura de assets em Edge headless.

O artefato anterior foi preservado; o preparador existente gerou saída nova em:
`<REPO_ROOT>/.dev/uat-cli/eugvobtvjicvocttnkka/edge-artifact/`.
Build ID diagnóstico: `ed04d5c.edge-e2e-local`, contendo a correção local RSVP.
Os bytes RSVP usados no teste foram comparados com o commit da correção
`bf0f44b9df6e68c56058d695acf866591d8b341f` e são idênticos.

Contextos novos, não persistentes; nenhum perfil pessoal ou storageState usado.
Service workers bloqueados e rotas instaladas no contexto antes da navegação.
O roteamento Playwright desabilita cache HTTP; os recursos locais também usam
no-store no fluxo funcional. TLS não foi enfraquecido.

Origem do documento: `https://bispoid.github.io/wedding-invitation-project/`.
Toda navegação/recurso dessa aplicação foi atendido por route.fulfill lendo do
disco. O ramo Pages nunca chama continue/fetch; caminhos fora do prefixo/raiz,
traversal ou arquivo inexistente são recusados. Não há servidor público local
nem publicação disfarçada. A origem HTTP do documento foi preservada para CORS.

Allowlist remota: somente Auth/Functions do UAT e GETs de scripts https://esm.sh
necessários ao SDK Supabase 2.117.2 e dependências públicas observadas. Demais
origens são abortadas; PRD e DEV não têm caminho permitido. POSTs de convidados
exigem prefixo sintético próprio; update/delete exigem UUID no conjunto owned.

No fluxo funcional: 242 recursos/navegações locais interceptados, 51 requisições
UAT e 102 requisições de scripts CDN (17 caminhos distintos, com novos imports
nas navegações sem cache). São contagens de requisições, não de cenários nem
de gravações. A checagem complementar de assets é separada dessas contagens.
Zero recursos Pages obtidos por rede, zero tentativas PRD/DEV, zero destinos
recusados inesperadamente e zero erros no executor funcional.

## Cenários executados

17 grupos funcionais passaram:

- Bootstrap UAT, nomes fictícios e título [Homologação].
- Selo acionado por teclado; Pausar/Continuar; carta e foco em letter-title.
- Layout básico mobile em viewport 390x844, além do desktop 1365x900.
- Configuração ausente: erro acessível e nenhuma inicialização de backend.
- Configuração com ref/URL PRD em fixture: recusada antes de qualquer requisição PRD.
- Login real, issuer/sub/role UAT e namespace exclusivo comprovados.
- Dashboard inicialmente sem convidados e sem contingências.
- Validação nativa RSVP impedindo POST inválido.
- RSVP sintético: loading observado, HTTP 201, mensagem de sucesso e trava de reenvio.
- Persistência do RSVP consultada pelo dashboard.
- Dez criações sintéticas adicionais pela interface, mínimo para ultrapassar página 10.
- Paginação 10+1, busca com um resultado e métricas globais preservadas.
- Edição pela interface, persistência e atualização das métricas.
- Event Config fictício administrativo e contingência vazia, sem gravações no singleton.
- CORS exato nos GETs administrativos 200 e isolamento dos destinos observados.
- Limpeza dos 11 UUIDs próprios e lista/métrica total novamente zero.
- Logout pela interface, redirecionamento ao login e namespace removido.

Checagem complementar aprovada: document.fonts carregado, zero imagens quebradas
e scrollWidth igual à largura do viewport em 1365x900 e 390x844. Screenshots
desktop/mobile e do painel foram inspecionados. Iniciais do monograma estático
permanecem as originais; dados de backend exibidos são inteiramente fictícios.

O usuário digitou a senha diretamente na janela isolada. A senha não foi
impressa nem gravada em arquivos ou relatórios. Claims retornados
para prova limitaram-se a issuer, UUID e role; nenhum access/refresh token,
cookie ou Authorization foi registrado. Não se gravaram traces ou storageState.

Namespace comprovado: `invitation-v1-uat-eugvobtvjicvocttnkka-auth`.
O SDK foi carregado do CDN revisado e suas requisições foram somente ao UAT.
Respostas administrativas observadas permitiram exatamente a origem Pages,
com validação CORS real no navegador. Não houve alteração do CORS remoto.

Métricas com 11 convidados: 11 confirmados, zero ausentes, 2 acompanhantes,
13 pessoas confirmadas. Após editar RSVP para 3 acompanhantes: 14 pessoas.
A busca retornou um convidado sem reduzir as métricas globais.

## Correção e regressão

O frontend 201 mantinha isSubmitted=false e reabilitava o botão. Para cumprir
o bloqueio de reenvio pedido, passou a marcar isSubmitted=true e manter botão
desabilitado. Reset/mensagem, retry em erros e comportamento 202 preservados;
nenhum contrato HTTP ou regra de backend foi modificado. O teste anterior que
permitia segundo envio foi atualizado; presença e ausência agora cobrem a trava.
No Edge, uma submissão programática após sucesso também produziu zero novos POSTs.

`npm run test:node`: 312 aprovados, zero falhas/skips, Node 22.14.0.
Suíte Deno oficial com deny-net: 150 aprovados, Deno 2.9.7.
Sintaxe dos arquivos modificados e git diff --check aprovados. Testes comuns
continuam sem dependência de Auth remoto, Edge ou Playwright. Não houve CI remoto.

## Limpeza e evidências

Prefixo desta execução: `edge-uat-mvldqakk-`, e-mails example.invalid.
Um RSVP e dez convidados de paginação criados; uma edição sintética; onze
exclusões físicas por UUID usando o cliente UAT autenticado, sem exclusão ampla.
Não há lixeira no CRUD; dados fictícios e IDs foram preservados nas evidências.

UUIDs removidos:

```text
d72ab986-e2e9-4fa1-aac8-66aa67f709a1
58ee8537-b7fc-430f-853c-1ebfbff5e673
56ca0766-5638-4d5b-8676-8da22eaebf78
fe325297-caf4-49ed-8f20-c34832c03825
0308a305-6322-49e7-9dc8-cb2bcb18a568
162f2acc-3615-4d7b-b7c5-216739984142
12f79cff-c8b7-4b0f-8aa3-f293663c4410
9c3163c9-f9df-4849-9cde-0ababc73e83d
aec2579b-7ff3-4854-a73a-f008995eed2c
bf083bca-ab8c-4fc8-9741-8bf7eb07a763
0a07d12f-d339-4426-9655-bd40094511a0
```

Zero owned IDs pendentes e zero convidados na consulta final; logout pela
interface confirmado e contextos encerrados. A fila Google permaneceu vazia:
nenhuma linha inserida ou recuperada. Event Config preservada. Nenhum usuário
Auth adicional, segredo, Function, migration, grant, RLS ou configuração alterado.
Nove fingerprints do vínculo CLI principal preservados.

Runner, JSONs sanitizados, screenshots e artefato ficam exclusivamente no
diretório ignorado:
`<REPO_ROOT>/.dev/uat-cli/eugvobtvjicvocttnkka/`.
Arquivos principais: edge-e2e.mjs, edge-authenticated.mjs, edge-evidence.json,
edge-assets.mjs, edge-assets-proof.json e screenshots edge-*.png.
Uma nova execução exige novos diretórios/identificadores e revalidação do alvo;
o runner desta evidência não sobrescreve o artefato existente.

## Limites e próxima autorização

Aceite automatizado em Edge Windows não equivale a aparelho Android/iOS real,
outros navegadores ou aprovação visual humana integral. Não se repetiram rate
limiting, recuperação de contingência ou a bateria HTTP anterior desnecessariamente.
Não foram consultados logs remotos. Publicação, CI remoto, variables Pages e
promoção de branches continuam pendentes de autorização própria; PRD/Vercel e
o Pages atualmente publicado não foram alterados ou utilizados funcionalmente.
