import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const policyPath = process.argv.find((arg) => arg.startsWith("--policy="))?.slice("--policy=".length) ?? "governance/repositories.json";
const policy = JSON.parse(await readFile(policyPath, "utf8"));
const token = process.env.GOVERNANCE_AUDIT_TOKEN ?? process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const apiBase = (process.env.GITHUB_API_URL ?? "https://api.github.com").replace(/\/$/, "");
if (!token) throw new Error("GOVERNANCE_AUDIT_TOKEN (or GH_TOKEN/GITHUB_TOKEN) is required for queued-check watchdog");

const now = Date.now();
const slaMs = policy.rules.queuedChecksSlaMinutes * 60_000;
const failures = [];
for (const repository of policy.repositories) {
  const prefix = `${policy.organization}/${repository.name}`;
  const pulls = await get(`/repos/${prefix}/pulls?state=open&per_page=100`);
  if (pulls.status !== 200 || !Array.isArray(pulls.body)) {
    failures.push(`${prefix}: cannot read open pull requests (HTTP ${pulls.status})`);
    continue;
  }
  for (const pull of pulls.body) {
    const checks = await get(`/repos/${prefix}/commits/${pull.head.sha}/check-runs?per_page=100`);
    if (checks.status !== 200 || !Array.isArray(checks.body?.check_runs)) {
      failures.push(`${prefix}#${pull.number}: cannot read checks for ${pull.head.sha} (HTTP ${checks.status})`);
      continue;
    }
    for (const check of checks.body.check_runs) {
      if (!["queued", "in_progress"].includes(check.status)) continue;
      const started = Date.parse(check.started_at ?? check.created_at ?? "");
      if (!Number.isFinite(started) || now - started <= slaMs) continue;
      const ageMinutes = Math.floor((now - started) / 60_000);
      const fingerprint = createHash("sha256").update(`${prefix}#${pull.number}:${pull.head.sha}:${check.name}`).digest("hex").slice(0, 16);
      failures.push(`fingerprint=governance-watchdog:${fingerprint} ${prefix}#${pull.number} ${check.name} ${check.status} for ${ageMinutes}m at ${pull.head.sha}`);
    }
  }
}

if (failures.length) {
  console.error(`Queued-check SLA exceeded (${policy.rules.queuedChecksSlaMinutes}m):`);
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exitCode = 1;
} else console.log(`queued-check watchdog OK: no check exceeded ${policy.rules.queuedChecksSlaMinutes}m`);

async function get(path) {
  const response = await fetch(`${apiBase}${path}`, { headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "fabvyx-governance-watchdog",
  }});
  let body = null;
  try { body = await response.json(); } catch { /* retain HTTP status */ }
  return { status: response.status, body };
}