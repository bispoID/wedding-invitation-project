# Frontend UAT — integração local, 23/10/2026

## Escopo e resultado

Branch `feature/uat-environment-isolation`; baseline
`b3e4397cd8cba2dc86862efa04f4608e0cdabc33`, limpa e quatro commits à frente
de feature/landing-page, sem divergência. As demais branches não foram alteradas.
Implementação: `c0903a4346d5e18cf586b8ee9d73d46f9ed919ee`.

**BLOQUEADO / INCOMPLETO quanto ao aceite integral da Etapa 4.** Configuração,
build real e regressões foram concluídos; os critérios de navegador não foram
executados. Não houve publicação do frontend, push, merge ou escrita remota.

## Configuração e build

Contrato v1 preservado. O manifesto aprova exclusivamente o UAT
`eugvobtvjicvocttnkka`, URL `https://eugvobtvjicvocttnkka.supabase.co`,
organização Teste, sa-east-1. Oito Functions ACTIVE/v1 reconferidas por metadados.

Foi selecionada uma chave publishable por metadados oficiais da CLI com
project-ref UAT explícito e sem --reveal. Ela é opaca; não possui claims JWT.
A associação foi conferida pelo destino da consulta, não pela decodificação.
A chave foi transmitida ao processo de build por variável temporária, restaurada
ao sair; integra somente os runtime-config públicos ignorados, não o Git.

O wrapper operacional usa `prepareStaticSite` de `scripts/prepare-static-site.mjs`
com config equivalente a `configFromEnvironment`. Para reprodução, disponibilizar
em processo local os valores públicos autorizados, sem imprimir a chave:

```text
APP_ENV=uat
SUPABASE_PROJECT_REF=eugvobtvjicvocttnkka
SUPABASE_URL=https://eugvobtvjicvocttnkka.supabase.co
SUPABASE_PUBLIC_KEY=<publishable UAT obtida por metadados oficiais>
PUBLIC_SITE_URL=https://bispoid.github.io/wedding-invitation-project/
BUILD_ID=<commit-validado>.stage4-local
node scripts/prepare-static-site.mjs
```

O CLI padrão usa saída nova `_site`; não apaga saída existente. Nesta execução
o wrapper escolheu diretórios novos dentro do contexto operacional ignorado.

Artefatos finais (71 arquivos cada):

- `C:/Users/diegg/OneDrive/Documentos/Estudos/TI/projects/wedding-invitation-project/.dev/uat-cli/eugvobtvjicvocttnkka/stage4-artifact-final/`
- `C:/Users/diegg/OneDrive/Documentos/Estudos/TI/projects/wedding-invitation-project/.dev/uat-cli/eugvobtvjicvocttnkka/stage4-root-final/`

Build ID `c0903a4346d5.stage4-local`. Um GET real UAT alimentou ambos os builds
finais; a resposta pública foi reutilizada em memória. O ensaio inicial usou
outro GET: total de dois GETs de Event Config nesta etapa, ambos 200.
Nenhum GET do backend PRD ou do Pages foi executado.

Fixture confirmada: Pessoa Alfa UAT / Pessoa Beta UAT, 15/01/2030, 18:30,
Cidade Ficticia UAT / Estado Ficticio UAT e locais explicitamente sintéticos.
Nenhuma alteração no singleton ou cópia do snapshot DEV.

Canonical, OG URL e imagens usam a base root/subpath correspondente. Título
tem [Homologação], as três descrições identificam testes fictícios e robots
contém noindex/nofollow. Regressão existente confirma que a atualização dinâmica
mantém o prefixo de homologação; metadados PRD permanecem inalterados.

## Artefato e isolamento

Árvore enumerada e hashes SHA-256 registrados: somente os 70 assets da allowlist
mais runtime-config.json. Runtime comparado integralmente à configuração UAT.
Não foram incluídos dev-config.json, .dev, envs, migrations, seeds, testes,
scripts CLI, snapshots ou credenciais privadas. Padrões de chave privada e
service_role foram recusados na inspeção. Os testes de build também comparam
assets permitidos byte a byte e verificam root/subpath UAT/PRD com fetch simulado.
Uma inspeção adicional resolveu 80 referências relativas HTML/CSS/imports JS
em cada artefato final; todos os destinos existem dentro da árvore permitida.

Menções ao ref PRD na regra de rejeição não são configuração ativa ou chamadas
de rede. Endpoints derivam somente do runtime validado. Namespace UAT esperado
e testado localmente: `invitation-v1-uat-eugvobtvjicvocttnkka-auth`.
Nenhuma sessão real foi criada ou reutilizada nesta etapa.

O monograma estático `monograma_bd.webp` e o preview compartilhado não foram
redesenhados. Iniciais/identidade visual estáticas devem ser avaliadas separadamente
dos nomes fictícios recebidos do backend; não equivalem a dados UAT de produção.

## Cobertura efetivamente executada

- `npm run test:node`: 312 aprovados, zero falhas/skips, Node 22.14.0.
- Suíte Deno oficial com deny-net: 150 aprovados, Deno 2.9.7.
- `node --check`: 46 arquivos JS/MJS aprovados.
- `git diff --check`: aprovado.
- Builds UAT/PRD root/subpath e negativos em fixtures: aprovados, sem rede real no CI.
- Novas regressões: namespace UAT exato e recusa de UAT como fallback localhost.
- Gate atualizado: ref UAT aprovado; manifesto não provisionado/sintético continua recusado.
- Configuração ausente/inválida, destinos cruzados, chave contraditória, redirects,
  host desconhecido, bootstrap com falha e ausência de fallback cobertos com doubles.

DEV foi preservado por regressões; Docker/health/navegação DEV não foram
reexecutados. CI remoto não foi disparado. As 121 verificações HTTP da Etapa
3.2B são evidência anterior de backend, não evidência de navegador nesta etapa.

## Bloqueio de navegador e dados finais

As APIs documentadas do navegador disponível e suas capabilities não expõem
criação de contexto temporário, bloqueio de service workers ou interceptação
de rotas com fulfilment a partir do disco. A aba existente oferece apenas
pageAssets e webmcp. Não há como comprovar, nesse ambiente, que a origem Pages
seria usada sem buscar/executar o site publicado e sem compartilhar sessões.

Não se usaram localhost com UAT, mudanças de CORS, override publicado, proxies
que enfraquecem TLS, acesso ao Pages atual ou outro mecanismo não suportado.

Pendentes: bootstrap real/renderização, envelope/selo/cartão/carta, Esperar/
Continuar, responsividade, teclado/foco, RSVP 201/loading/reenvio/erro, login,
dashboard, CORS, storage real, paginação/métricas e contingência vazia no navegador.
Não foram solicitadas senhas nem enviados POSTs de teste. Zero convidados ou
pendências criados; nenhuma limpeza necessária. Fixture Event Config preservada.

Para retomar, disponibilizar um executor autorizado com contexto efêmero e
rotas instaladas antes da navegação: servir todos os arquivos Pages localmente,
negar PRD/DEV, permitir somente UAT e dependências revisadas, sem capturar tokens.
Só então solicitar inserção interativa da senha e testar os fluxos mínimos,
registrando/limpando apenas IDs sintéticos próprios. Não publicar como substituto.

Após aceite E2E e visual, em etapa separadamente autorizada: conferir refs e
ancestralidade, integrar em feature/landing-page, publicar essa branch e validar
CI pelo SHA; configurar variables públicas UAT do Pages; promover a staging e
homologar o deploy. Nenhuma dessas ações foi executada aqui. PRD/Vercel continuam
fora do escopo e não devem ser alterados nessa sequência.
