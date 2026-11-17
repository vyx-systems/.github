# Perfil GitHub da VYX

Este repositório alimenta o perfil público da organização VYX Systems no GitHub.

O conteúdo visível do perfil está em [`profile/README.md`](profile/README.md), com assets de marca em [`profile/assets/`](profile/assets/).

## Fabvyx organization configuration

This repository is the versioned source for organization-level governance policy that applies to the Fabvyx product repositories: platform, floorconnect, edge-agent and protocol. `fabvyx-agents` stays listed as `retiring` while its code moves into `fabvyx-floorconnect/agents/` (decided 2026-10-27); it is archived after the transition.

`governance/repositories.json` records the protected domains, release/CI workflows and runner/check rules expected across the organization. Validate it locally with:

```bash
node tools/validate-governance.mjs
```

With an organization administration token, compare the declared policy with the remote `main` branch protection and required workflow files:

```bash
GOVERNANCE_AUDIT_TOKEN=... node tools/audit-remote-governance.mjs
```

The remote audit is read-only and fails closed. Store the token only as a protected organization secret; never put it in a pull request or repository file.

See [governance/bootstrap.md](governance/bootstrap.md) for the protected setup and result interpretation.

The queued-check watchdog can be run with the same protected token: `node tools/check-queued-checks.mjs`. It exits non-zero when a check exceeds the policy SLA.

The policy is declarative. Applying branch protection, rulesets and required checks still requires an organization owner with the corresponding GitHub plan and administrative permissions; the workflow fails closed on malformed policy rather than claiming that remote settings are already enforced.

## CI/CD comum (uso obrigatório)

Este repositório é também a fonte única dos workflows de CI/CD partilhados por todos os repos da organização. **O uso é obrigatório.** Um repo de produto não mantém a sua própria cópia de um workflow que exista aqui: chama o daqui.

Âmbito: todos os repos de produto da `vyx-systems` com CI (fabvyx-platform, fabvyx-floorconnect, shopvyx-platform, shopvyx-web, construvyx-platform, fabvyx-webquote, vyx-ai, fabvyx-ai, vyx-platform-kit, fabvyx-protocol, fabvyx-obs, fabvyx-edge-agent, vyx-license-server, vyx-telemetry e os que vierem a ser criados). Uma exceção só vale se estiver escrita em `governance/repositories.json`, com o motivo.

### Catálogo

| Workflow | Para quê | Check que produz | Obrigatório em |
|---|---|---|---|
| `.github/workflows/reusable-security.yml` | Procura segredos e artefactos proibidos no repo (corre o script do próprio repo) | `security / basic-security-checks` | Todos os repos de produto |
| `.github/workflows/reusable-dependency-hygiene.yml` | `pnpm install --frozen-lockfile` + auditoria das dependências de produção | `dependency-hygiene / dependency-hygiene` | Todos os repos Node com pnpm |
| `.github/workflows/reusable-main-watchdog.yml` | Vigia o CI de `main`: repete uma vez quando falta runner, abre a issue «main vermelho» quando falha, fecha-a quando volta a verde | — (não é check de PR) | Todos os repos com CI em `main` |

### Regras obrigatórias

1. **Sem cópias.** Os workflows do catálogo usam-se só por `uses:`. É proibido copiá-los para um repo, ou manter lá uma versão própria com o mesmo papel. Se falta uma opção, abre-se PR aqui e não se diverge no repo.
2. **Pin por SHA.** A chamada fixa o commit completo (40 hex) deste repo, com a tag em comentário: `uses: vyx-systems/.github/.github/workflows/reusable-security.yml@<sha> # v1`. Nunca `@main` nem só `@v1`. O Dependabot (`package-ecosystem: github-actions`) atualiza o SHA.
3. **Runners declarados.** `runner_labels` é obrigatório e é JSON com os labels do runner. Os workflows que correm em PR usam só labels de CI (`vyx-ci`, `fabvyx-ci`, `fabvyx-checks`). É proibido passar labels privilegiadas (`*-cd`, `prod`, `lan`) a um workflow que corra em `pull_request`.
4. **Segredos só quando é preciso.** `secrets: inherit` só no `reusable-security` e no `reusable-dependency-hygiene` (usam `DOCKERHUB_USERNAME`/`DOCKERHUB_TOKEN` para a limpeza do runner). O watchdog não recebe segredos.
5. **Permissões mínimas.** O workflow chamador declara `permissions:` no topo. O watchdog precisa de `contents: read`, `issues: write`, `actions: write`; os outros só de `contents: read`.
6. **Pré-requisitos no repo:**
   - `tools/scripts/security-static-check.sh` (ou outro caminho, passado em `script`);
   - repos Node: campo `packageManager` no `package.json` (define a versão do pnpm), `pnpm-lock.yaml` e o script `deps:audit:prod` (ou outro comando, passado em `audit_command`).
7. **Checks obrigatórios.** Os nomes dos checks passam a ser `<job do chamador> / <job do reusable>` (tabela acima). Ao adotar, atualizar `requiredChecks` em `governance/repositories.json` e a proteção do `main` do repo no mesmo dia.
8. **Mudanças aqui.** Todas por PR, com o `workflow-lint` verde (actionlint, pin por SHA, sem self-hosted nos workflows próprios). Mudança compatível: nova tag `v1.x.y` e mover `v1`. Mudança que parte os chamadores (input renomeado, check renomeado, novo pré-requisito): nova major `v2`, com nota de migração no PR.
9. **Repo público.** Este repo é público: nada de segredos, IPs, nomes de hosts ou de contentores internos nos ficheiros. Os workflows próprios deste repo correm só em runners do GitHub. Os `reusable-*.yml` correm no repo chamador e com os runners dele.

### Como chamar

`.github/workflows/security.yml` no repo de produto:

```yaml
name: Security
on:
  workflow_dispatch:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  security:
    uses: vyx-systems/.github/.github/workflows/reusable-security.yml@<sha> # v1
    with:
      runner_labels: '["self-hosted","linux","x64","vyx-ci","docker"]'
    secrets: inherit
```

`.github/workflows/dependency-hygiene.yml`:

```yaml
name: Dependency Hygiene
on:
  workflow_dispatch:
  pull_request:
  push:
    branches: [main]
concurrency:
  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
permissions:
  contents: read
jobs:
  dependency-hygiene:
    uses: vyx-systems/.github/.github/workflows/reusable-dependency-hygiene.yml@<sha> # v1
    with:
      runner_labels: '["self-hosted","linux","x64","vyx-ci","docker"]'
    secrets: inherit
```

`.github/workflows/main-watchdog.yml`:

```yaml
name: Main CI Watchdog
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
permissions:
  contents: read
  issues: write
  actions: write
jobs:
  watchdog:
    uses: vyx-systems/.github/.github/workflows/reusable-main-watchdog.yml@<sha> # v1
    with:
      runner_labels: '["self-hosted","linux","x64","vyx-ci"]'
```

### Adaptações nos repos ao adotar

- Validadores locais que leem `runs-on` (por exemplo o `validate-workflow-runner-isolation` do fabvyx-platform) têm de aceitar jobs com `uses:` e ler os labels de `with.runner_labels`. O validador de pin por SHA já aceita a chamada, desde que a regra 2 seja cumprida.
- Apagar o workflow local antigo no mesmo PR que cria o chamador.

### Fases

1. **Agora (v1):** security, dependency-hygiene e main-watchdog.
2. **A seguir:** CI de monorepo Node (planeamento pelo diff a partir do `ci-plan.mjs` do fabvyx-platform, prova de `main` pela árvore do PR, caches persistentes de pnpm/Turbo, job `result` como único check obrigatório).
3. **Depois:** CD (build das imagens com `docker buildx bake` e builder persistente, deploy em staging, promoção a produção).
4. **Runners:** um só grupo com labels por capacidade e uma única manutenção semanal. Fica num repo privado de infra, não aqui, porque este repo é público.
