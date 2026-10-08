#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const fixturePath = path.join(__dirname, '..', 'fixtures', 'incident.json');
const incident = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

const findingRules = [
  {
    name: 'long-lived PAT in workflow secrets',
    evidence: ['workflow.pat_substitution'],
    control: 'Never substitute a personal access token for GITHUB_TOKEN; keep credentials per-workflow and ephemeral.'
  },
  {
    name: 'fork-owned build wrapper executed in privileged job',
    evidence: ['build.wrapper_execution'],
    control: 'Run external contributions under pull_request with no secrets; a build wrapper is code, not configuration.'
  },
  {
    name: 'credential reuse across repositories',
    evidence: ['pat.reuse', 'repo.collaborator_add'],
    control: 'Separate credentials per purpose and repository; alert on collaborator adds performed by automation identities.'
  },
  {
    name: 'malicious workflow push with deleted-branch exfiltration',
    evidence: ['workflow.push_and_delete', 'secret.artifact_egress'],
    control: 'Restrict who can push workflow files; alert on branch deletion right after a run starts and on unexpected artifact uploads.'
  },
  {
    name: 'trusted tag hijack',
    evidence: ['tag.rewrite'],
    control: 'Pin actions by full commit SHA, publish immutable releases, and protect tags.'
  },
  {
    name: 'downstream consumer compromise',
    evidence: ['consumer.secret_log_print', 'repo.targeted_fork'],
    control: 'Minimize consumer workflow permissions, alert on secret material in logs, and watch forks of high-value repositories.'
  }
];

function detectedFindings(events) {
  const actions = new Set(events.map((event) => event.action));
  return findingRules.filter((rule) => rule.evidence.some((action) => actions.has(action)));
}

function printReport(data) {
  const findings = detectedFindings(data.events);
  console.log(`\n${data.metadata.caseId}`);
  console.log(data.metadata.source);
  console.log('\nReconstructed timeline');
  for (const event of data.events) {
    console.log(`${event.time} | ${event.source.padEnd(18)} | ${event.action.padEnd(30)} | ${event.detail}`);
  }

  console.log('\nRCA findings');
  for (const finding of findings) {
    console.log(`- ${finding.name}: ${finding.control}`);
  }

  console.log('\nAction fixture');
  console.log(`- ${data.package.name}@${data.package.version} (${data.package.status})`);
  console.log(`- runner behavior is represented as text only: ${data.package.installScript}`);

  console.log('\nDetection indicators');
  for (const indicator of data.hostIndicators) console.log(`- ${indicator}`);

  console.log('\nSafety: no network requests, shell commands, package installs, or fixture-driven code execution occurred.');
  return findings;
}

if (require.main === module) printReport(incident);

module.exports = { detectedFindings, findingRules, incident };
