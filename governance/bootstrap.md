# Bootstrap da auditoria de governança

Este procedimento prepara a verificação de XR-004. A auditoria é somente de
leitura e não altera branch protection, rulesets, runners ou secrets.

## Pré-requisitos

1. Um organization owner cria o environment `governance-audit` neste repositório.
2. O environment recebe o secret `GOVERNANCE_AUDIT_TOKEN`.
3. O token deve ter somente permissões de leitura suficientes para consultar a
   proteção da branch `main` e os workflows dos cinco repositórios. Não usar
   tokens de publicação, deploy ou acesso a produção.
4. O owner configura as regras GitHub exigidas pela política e disponibiliza os
   runners isolados definidos pelo ambiente da organização.

## Execução

No repositório `.github`, abrir Actions → `governance-policy` → `Run workflow`.
O job `validate` confirma o ficheiro declarativo; `audit-remote` consulta a
configuração efetiva da organização e falha quando encontra divergências.

Também é possível executar localmente, sem guardar o token em ficheiros:

```bash
GOVERNANCE_AUDIT_TOKEN=... node tools/audit-remote-governance.mjs
```

## Interpretação

- HTTP 403 indica token sem permissão administrativa de leitura; não significa
  que a configuração esteja correta.
- Um workflow ausente em `main` significa que a PR que o fornece ainda não foi
  integrada, ou que o nome divergiu da política.
- Um resultado verde só prova os repositórios consultados no SHA atual; não
  substitui a revisão e os required checks do SHA de merge.