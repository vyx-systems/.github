import { readFile } from "node:fs/promises";

const policyPath = process.argv.find((arg) => arg.startsWith("--policy="))?.slice("--policy=".length) ?? "governance/repositories.json";
const policy = JSON.parse(await readFile(policyPath, "utf8"));
const token = process.env.GOVERNANCE_AUDIT_TOKEN ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const apiBase = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
const organization = policy.organization;

if (!token) throw new Error("GOVERNANCE_AUDIT_TOKEN (or GH_TOKEN/GITHUB_TOKEN) is required for remote governance audit");

const failures = [];
for (const repository of policy.repositories) {
  const prefix = `${organization}/${repository.name}`;
  const protection = await get(`/repos/${prefix}/branches/main/protection`);
  if (protection.status === 404) failures.push(`${prefix}: main branch protection is not readable or not configured`);
  else if (protection.status !== 200) failures.push(`${prefix}: branch protection API returned HTTP ${protection.status}`);
  else {
    const body = protection.body;
    if (body.enforce_admins?.enabled !== true) failures.push(`${prefix}: enforce_admins is not enabled`);
    if (!body.required_pull_request_reviews) failures.push(`${prefix}: required pull request review rule is missing`);
    if (body.required_status_checks?.strict !== true) failures.push(`${prefix}: required status checks must require the branch to be up to date`);
  }

  const workflows = await get(`/repos/${prefix}/contents/.github/workflows?ref=main`);
  if (workflows.status !== 200 || !Array.isArray(workflows.body)) {
    failures.push(`${prefix}: cannot read .github/workflows on main (HTTP ${workflows.status})`);
    continue;
  }
  const actual = new Set(workflows.body.filter((item) => item.type === "file").map((item) => `.github/workflows/${item.name}`));
  for (const expected of repository.requiredWorkflows) if (!actual.has(expected)) failures.push(`${prefix}: required workflow missing on main: ${expected}`);
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else console.log(`remote governance OK: ${policy.repositories.length} repositories`);

async function get(path) {
  const response = await fetch(`${apiBase}${path}`, { headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "fabvyx-governance-audit",
  }});
  let body = null;
  try { body = await response.json(); } catch { /* preserve status for useful diagnostics */ }
  return { status: response.status, body };
}