# Fabvyx organization configuration

This repository is the versioned source for organization-level governance policy that applies to the five Fabvyx product repositories.

`governance/repositories.json` records the protected domains, release/CI workflows and runner/check rules expected across the organization. Validate it locally with:

```bash
node tools/validate-governance.mjs
```

The policy is declarative. Applying branch protection, rulesets and required checks still requires an organization owner with the corresponding GitHub plan and administrative permissions; the workflow fails closed on malformed policy rather than claiming that remote settings are already enforced.