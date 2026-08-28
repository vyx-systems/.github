import { readFile } from "node:fs/promises";

const path = process.argv.find((arg) => arg.startsWith("--policy="))?.slice("--policy=".length) ?? "governance/repositories.json";
const policy = JSON.parse(await readFile(path, "utf8"));
const expectedRepositories = ["fabvyx-platform", "fabvyx-floorconnect", "fabvyx-agents", "fabvyx-edge-agent", "fabvyx-protocol"];
const requiredRuleKeys = ["pullRequestRunners", "releaseRunners", "requiredChecksMustUseMergeSha", "queuedChecksSlaMinutes", "forbidPrivilegedSecretsOnUntrustedPullRequests"];
assert(policy.version === 1, "unsupported policy version");
assert(policy.organization === "vyx-systems", "organization must be vyx-systems");
assert(JSON.stringify(policy.repositories.map((repo) => repo.name).sort()) === JSON.stringify([...expectedRepositories].sort()), "policy must cover exactly the five Fabvyx repositories");
for (const key of requiredRuleKeys) assert(Object.hasOwn(policy.rules ?? {}, key), `missing rule ${key}`);
assert(policy.rules.pullRequestRunners === "ephemeral-isolated", "PR runners must be ephemeral-isolated");
assert(policy.rules.releaseRunners === "protected-environment", "release runners must use a protected environment");
assert(Number.isInteger(policy.rules.queuedChecksSlaMinutes) && policy.rules.queuedChecksSlaMinutes > 0, "queued check SLA must be a positive integer");
for (const repo of policy.repositories) {
  assert(Array.isArray(repo.requiredWorkflows) && repo.requiredWorkflows.length > 0, `${repo.name}: required workflows missing`);
  assert(new Set(repo.requiredWorkflows).size === repo.requiredWorkflows.length, `${repo.name}: duplicate required workflow`);
  assert(Array.isArray(repo.protectedDomains) && repo.protectedDomains.length > 0, `${repo.name}: protected domains missing`);
  assert(repo.requiredWorkflows.every((workflow) => workflow.startsWith(".github/workflows/")), `${repo.name}: workflow path must be under .github/workflows`);
  assert(Array.isArray(repo.requiredChecks) && repo.requiredChecks.length > 0, `${repo.name}: required checks missing`);
  assert(new Set(repo.requiredChecks).size === repo.requiredChecks.length, `${repo.name}: duplicate required check`);
}
console.log(`governance policy OK: ${policy.repositories.length} repositories`);

function assert(condition, message) {
  if (!condition) throw new Error(`invalid governance policy: ${message}`);
}