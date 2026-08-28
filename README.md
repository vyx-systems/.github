# Fabvyx organization configuration

This repository is the versioned source for organization-level governance policy that applies to the five Fabvyx product repositories.

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