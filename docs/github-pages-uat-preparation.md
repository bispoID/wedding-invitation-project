# GitHub Pages UAT — preparação e proteção, Etapa 5B

## Resultado e limites — 23/10/2026

**PREPARADO COM RESSALVAS; PUBLICAÇÃO NÃO AUTORIZADA.** Três variáveis públicas
UAT foram criadas exclusivamente no environment `github-pages`. Gates de
workflow e artefato foram corrigidos somente localmente. Não houve push, merge,
PR, workflow_dispatch, deployment ou modificação de proteções remotas.

O Pages publicado continua sendo o artefato anterior à migração UAT. Não usar
esse endereço para RSVP, login ou administração até a Etapa 5C autorizada.

O último CI remoto aprovado continua sendo [40043031879](https://github.com/bispoID/wedding-invitation-project/actions/runs/40043031879),
SHA `82450ab9727b932a7c5e04fe52ae0f3b38c57065`: 342 Node e 150 Deno.
Os novos commits locais não possuem CI remoto aprovado.

## Estado inicial e ancestralidade

Checkout inicial limpo em `feature/landing-page`, HEAD e remoto `82450ab`.
Fetch reconfirmou `staging=5ca164fc4b0842378355a5eab350b540d061f068` e
`production=b5995cf53be3085f9b1d418b8cddf08154afd303`.

Comparações remotas antes das alterações locais:

| Destino versus desenvolvimento | Exclusivos destino | Exclusivos desenvolvimento | Fast-forward matemático |
| --- | ---: | ---: | --- |
| origin/staging...origin/feature/landing-page | 0 | 26 | Sim |
| origin/production...origin/feature/landing-page | 0 | 24 | Sim |

Os merge-bases são os próprios HEADs dos destinos. Não há necessidade técnica
de merge commit ou rebase nessa fotografia; regras futuras podem exigir PR.
Nenhuma promoção foi executada. Dois commits locais adicionais acrescentam
somente os gates/regressões e a documentação desta preparação; os números
devem ser recalculados antes de qualquer promoção.

## Auditoria do workflow e correção local

O remoto tem somente `Test baseline` e `Deploy invite-app to GitHub Pages` ativos.
O Pages original faz build e deploy em um único job, com testes parciais Node,
mas não depende da aprovação da suíte completa do mesmo SHA. Além disso,
checkout por nome `staging` podia selecionar um commit diferente do evento.

Proposta implementada **somente localmente**:

1. `test.yml` aceita `workflow_call`, mantendo seus triggers de teste anteriores.
2. O job Pages `validate` chama `./.github/workflows/test.yml`, somente em staging,
   com token `contents: read`; executa a suíte Node completa, Deno, sintaxe e whitespace.
3. O job `deploy` tem `needs: validate` e guard `github.ref == 'refs/heads/staging'`.
   Nele, build, auditoria, upload e publicação continuam sequenciais; falha anterior
   impede as etapas seguintes. Não há `always()`, continue-on-error ou secrets herdados.
4. Checkout usa `${{ github.sha }}` e `persist-credentials: false`, não a branch móvel.
5. Permissões globais: somente contents/read. Pages/write e id-token/write ficam
   exclusivamente no job de publicação, sem ampliação em relação ao job original.
6. `actions/configure-pages@v5` fornece base_url; `_site` continua sendo a saída
   enviada por `actions/upload-pages-artifact@v3` e `actions/deploy-pages@v4`.
7. `scripts/prepare-pages-uat.mjs` envolve o preparador portátil existente, sem
   mudar o runtime ou a preparação PRD. O helper exige UAT/ref/URL/site exatos,
   publishable (não JWT/secret), BUILD_ID igual ao SHA completo do checkout e,
   no Actions, GITHUB_REF staging e GITHUB_SHA igual a HEAD.
8. Um GET UAT sem seguir redirects deve retornar 200/success e nomes marcados UAT.
   Falha ou dados sem identificação de teste bloqueiam Pages, sem fallback silencioso.
9. Antes do upload, toda a saída é enumerada e auditada: allowlist completa,
   ausência de symlinks/secrets/URL PRD ativa, runtime exato, hashes dos assets,
   metadados de homologação e referências relativas confinadas ao subpath.

A referência local de reusable workflow usa o mesmo commit do caller,
conforme a [documentação oficial](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows).
Os grupos de concorrência do caller (`pages`) e do CI (`tests-...`) são diferentes.
Validação local não substitui o futuro CI remoto desse workflow.

## Variáveis públicas UAT e consumo

Destino confirmado na sessão autenticada: `bispoID/wedding-invitation-project`,
environment `github-pages`, ID `20459424781`. Antes: nenhum secret ou variable
no environment; Repository Variables e Repository Secrets também estavam vazios.
Os environments Production/Preview não foram alterados.

| Environment Variable criada | Valor público / origem | Consumidor |
| --- | --- | --- |
| UAT_SUPABASE_PROJECT_REF | eugvobtvjicvocttnkka | step Prepare site → SUPABASE_PROJECT_REF |
| UAT_SUPABASE_URL | https://eugvobtvjicvocttnkka.supabase.co | step Prepare site → SUPABASE_URL |
| UAT_SUPABASE_PUBLIC_KEY | publishable UAT; valor integral omitido | step Prepare site → SUPABASE_PUBLIC_KEY |

APP_ENV é literal `uat`; PUBLIC_SITE_URL vem de configure-pages; BUILD_ID vem
de github.sha. Não foi criada variável redundante para esses valores.
O step de build pertence ao job associado a `github-pages`, consumindo `vars.*`
após o início do job; o job de CI reutilizável não recebe esse environment.
Não colocar essas expressões em um job de build futuro sem a associação adequada.
Ver [variáveis e escopos](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-variables).

A chave foi reconfirmada por metadados oficiais da CLI com ref UAT explícito,
sem --reveal. Publishable é opaca: não foram inferidas claims JWT. Hash SHA-256:
`623a2bff3bad0bfadb2c4ff350b98f9d749c4e2300fb9a2333f22fdb54a3b39e`.
Esse hash corresponde ao runtime público anterior e ao valor relido na interface
GitHub após recarga. Nenhuma variável PRD foi sobrescrita, nenhum secret criado.
As três criações de variáveis não dispararam workflow ou deployment observado.

## Pages, environment e bypass

Dashboard autenticado confirmou Source `GitHub Actions`, endereço
`https://bispoid.github.io/wedding-invitation-project/`, sem custom domain e
HTTPS obrigatório. O endpoint público REST /pages não estava disponível (404);
o modo de publicação foi confirmado pela interface, não inferido desse erro.

Environment github-pages: somente staging, zero tags; sem required reviewers,
sem wait timer; `can_admins_bypass=true`. Nada disso foi alterado. O bypass não
substitui CI, não apaga os guards YAML e não é uma proteção adicional; reduz a
garantia de aprovação humana caso regras sejam adicionadas no futuro.

Propor, mediante nova autorização: revisão humana de publicação, eventual wait
timer e desativação de bypass administrativo. Se houver só um mantenedor, não
ativar prevent-self-review com reviewer indisponível: isso bloquearia a operação.
Essas proteções estão disponíveis para repositórios públicos nos planos atuais,
inclusive Free; não se recomenda contratação de recurso pago. Referência:
[environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## Proteções Git — diagnóstico e proposta, não aplicadas

As branches feature/landing-page, staging e production retornaram protected=false,
sem required checks efetivos; lista de rulesets vazia. Portanto não há hoje
proteção comprovada contra force push, exclusão ou push direto por quem tem escrita.

Proposta de branch rulesets ativos (não confundir com push rulesets):

- Staging/production: bloquear force push e exclusão; exigir o check atual
  `JavaScript and Deno tests`, GitHub Actions app ID 15368, e branch atualizada.
  Reconfirmar o nome após a mudança dos workflows, sem escolher um check inexistente.
- Staging: manter uma via controlada de fast-forward de SHA já aprovado se esse
  for o modelo autorizado. Se PR obrigatório for escolhido, explicitar que a
  política muda o procedimento e pode gerar outro SHA, exigindo nova validação.
- Production: exigir PR e revisão deliberada; número de revisores deve refletir
  pessoas realmente disponíveis. Não impor uma regra impossível de cumprir por
  um mantenedor solo. Considerar restrição de atualização em ruleset separado,
  sem bypass geral que neutralize os bloqueios de force push/exclusão do primeiro.
- Desenvolvimento: impedir force push/exclusão e exigir checks conforme o fluxo
  escolhido, sem transformar essa branch em destino de deploy.

Branch rulesets são suportados para repositórios públicos mesmo no GitHub Free;
a auditoria não leu o plano privado da conta. Não é necessário conhecer o plano
pago para essa recomendação. [Regras oficiais](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).

Nenhuma regra, reviewer, bypass ou política remota foi criada/modificada.

## Build local, rastreabilidade e integridade

Primeiro build limpo desta etapa: HEAD
`773fd598b604c85082b84f04e06a9b40184487ce`, BUILD_ID igual ao SHA completo.
O envelope operacional chama `preparePagesUatSite`, que usa `prepareStaticSite`.
Executado `node .dev/vercel-audit/stage5b-build.mjs`: um único GET real Event Config
UAT 200, corpo comparado integralmente à fixture fictícia de 14 campos da Etapa 4.
Nenhum GET PRD, RSVP, login ou escrita remota. A resposta pública verificada foi
guardada em cache ignorado para regenerações locais sem nova consulta remota.

Saída inicial ignorada:
`C:/Users/diegg/OneDrive/Documentos/Estudos/TI/projects/wedding-invitation-project/.dev/vercel-audit/pages-uat-773fd598b604c85082b84f04e06a9b40184487ce/`.

Resultado: 71 arquivos (70 assets revisados + runtime-config.json), 81 referências
relativas válidas; único recurso externo estático identificado: https://esm.sh.
Backend ativo, Event Config, RSVP e Admin derivam exclusivamente do UAT validado;
namespace `invitation-v1-uat-eugvobtvjicvocttnkka-auth`. Referência PRD no validador
é uma regra de rejeição, não destino ativo.

Manifesto de hashes inicial:
`0ef92e8250b13be14fa2caf4baee0019f3ae1430afba2c6b758dbb2d29b8e55d`.
Após o commit documental, a regeneração `--cached` usa o novo HEAD completo;
o relatório operacional ignorado registra seu SHA, diretório e manifesto finais.
Não sobrescrever artefatos antigos; cada saída leva o SHA no nome.

Canonical e OG URL correspondem ao Pages/subpath; OG/Twitter image corresponde a
`images/preview-link.webp` nessa base. Títulos têm [Homologação], descrições
identificam testes fictícios e robots contém noindex/nofollow. Não restam marcadores.
Não há `.dev`, `.env`, migrations, seeds, dumps, testes ou scripts CLI internos.
Os módulos públicos de administração são necessários e permanecem na allowlist;
não devem ser confundidos com scripts operacionais privilegiados.

Limite visual: fontes, imagens de locais e monograma B&D são assets legados
preservados byte a byte; o preview foi inspecionado visualmente e não contém
nomes completos/data. Isso não certifica anonimização visual integral nem
substitui aceite humano. Não foi autorizado redesign ou publicação dessas imagens.

Validações locais: 370 Node (28 regressões Pages), 150 Deno com deny-net,
51 JS/MJS sintaticamente válidos, contratos do workflow e whitespace aprovados.
Há avisos não bloqueantes de module type. Não foi instalado linter YAML nem
executada validação remota dos novos commits; o CI futuro permanece obrigatório.

## Procedimento condicionado — Etapa 5C, não executar agora

1. Obter autorização específica para as proteções propostas e para as escritas
   Git/publicação. Resolver a política de revisão/bypass antes da publicação.
2. Revalidar variáveis de github-pages, chave UAT, fixture, Pages Source e Preview
   Vercel desligado. Staging deve continuar não produtiva na Vercel.
3. Autorizar separadamente push exclusivo dos novos commits de desenvolvimento,
   sem force; aguardar Test baseline aprovado no SHA exato final. O CI antigo
   82450ab não aprova novos commits.
4. Fetch e comparação de refs. Se staging ainda for ancestral e as proteções
   permitirem fast-forward, promover apenas o SHA aprovado por ff-only. Se houver
   divergência ou PR obrigatório, interromper e aprovar outro procedimento.
5. A promoção/atualização de staging pode acionar Pages imediatamente: só realizá-la
   com autorização de deploy da Etapa 5C e os gates já ativos.
6. O Pages revisado executa CI completo do mesmo SHA, valida UAT/BUILD_ID/artefato
   e então faz upload/deploy. Não reutilizar este artefato local como oficial.
7. Confirmar runtime-config, BUILD_ID, canonical/noindex e destinos no site novo;
   somente então homologar RSVP/Auth/Admin com dados sintéticos e limpeza autorizada.
8. Fazer aceite visual/funcional, incluindo dispositivos reais, e reconfirmar PRD
   (Git, Vercel e Supabase) preservado. Production não faz parte dessa promoção.

Nenhuma ação desse procedimento foi executada na Etapa 5B.
