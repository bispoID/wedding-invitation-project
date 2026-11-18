# Versionamento

O projeto usa tags Git anotadas no formato `vMAJOR.MINOR.PATCH`. Escolha o incremento pelo impacto no contrato público descrito no [guia de ambientes](environments.md).

| Componente | Quando incrementar | Exemplo |
| --- | --- | --- |
| MAJOR | Mudança incompatível, como remover um campo obrigatório para clientes existentes. | `v1.7.0` → `v2.0.0` |
| MINOR | Nova funcionalidade compatível com os clientes existentes. | `v1.7.0` → `v1.8.0` |
| PATCH | Correção de comportamento que preserva a compatibilidade. | `v1.7.0` → `v1.7.1` |

Quando uma entrega reúne várias mudanças, use o maior incremento aplicável e zere os componentes à direita.

## Branches, tags e Releases

Uma branch acompanha o trabalho e pode avançar a cada commit. O desenvolvimento ocorre em `feature/landing-page`, a homologação em `staging` e a publicação em `production`.

Uma tag anotada identifica um commit específico e registra autor da anotação, data e mensagem. Preserve cada tag publicada. Se houver erro, registre a correção em uma nova versão, sem mover, substituir ou excluir a tag anterior.

Uma GitHub Release é opcional. Ela associa notas de versão e, quando necessário, arquivos de distribuição a uma tag existente.

## Histórico

As oito tags abaixo foram criadas retrospectivamente. A origem identifica a referência usada na migração.

| Tag | Origem | Commit |
| --- | --- | --- |
| `v1.0.0` | `version/1.0` | `d71202feae0cb760d586faf2045d2ee8c3922f61` |
| `v1.1.0` | `version/1.1` | `df8c730df5d7d06029a06310d16c9c976eb42504` |
| `v1.2.0` | `version/1.2` | `c37814a47c070746e5f6f84df5390da2b6cb8537` |
| `v1.3.0` | `version/1.3` | `f19de7f63e468d80692bdf2975471f62e55076bb` |
| `v1.4.0` | `version/1.4` | `c991e8457902eaba8de8c247d589422c9cb86c98` |
| `v1.5.0` | `version/1.5` | `2c4f7466560b921d4b19c482234917d7ad528c6b` |
| `v1.6.0` | `version/1.6` | `5ca164fc4b0842378355a5eab350b540d061f068` |
| `v1.7.0` | `production` | `0531b4aab467603386cbbfd1b3261fef9a1bd6af` |

## Publicação de uma versão estável

1. Execute `git fetch origin --tags`. No deployment ativo do domínio de PRD na Vercel, confira o repositório, a branch `production` e o SHA completo. Compare esse SHA com `git rev-parse origin/production`. Prossiga apenas se o deploy estiver pronto, atender ao domínio de PRD e os SHAs coincidirem.
2. Escolha a versão de acordo com a tabela. Nos comandos abaixo, substitua `<tag>` pelo nome escolhido e `<sha-prd>` pelo SHA confirmado. Execute `git tag --list "<tag>"` e `git ls-remote --tags origin "refs/tags/<tag>"`. Ambas as consultas devem terminar com sucesso e sem resultados.
3. Crie a tag com `git tag -a <tag> <sha-prd> -m "<resumo da versão>"`. Confira que `git cat-file -t <tag>` retorna `tag` e que `git rev-parse "<tag>^{commit}"` retorna o SHA de PRD.
4. Publique somente essa referência com `git push origin refs/tags/<tag>`. Em caso de conflito, interrompa e confira as referências.
5. Execute `git ls-remote --tags origin "refs/tags/<tag>" "refs/tags/<tag>^{}"`. A primeira linha deve corresponder ao objeto anotado local (`git rev-parse refs/tags/<tag>`) e a linha terminada em `^{}` deve apontar para o SHA publicado em PRD.
