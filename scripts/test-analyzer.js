const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { detectedFindings, incident } = require('./analyze-incident');

const findings = detectedFindings(incident.events).map((finding) => finding.name);

assert.deepEqual(findings, incident.expectedFindings);
assert.equal(incident.package.name, 'tj-actions/changed-files');
assert.equal(incident.package.version, 'v39-mock');
assert.equal(incident.attackSurface.event, 'pull_request_target');
assert.deepEqual(incident.attackSurface.interpolatedFields, [
  'github.event.pull_request.head.repo.full_name',
  'github.event.pull_request.head.sha'
]);
assert.ok(incident.metadata.source.includes('Synthetic'));
assert.ok(incident.events.length >= 5);

const workflow = fs.readFileSync(
  path.join(__dirname, '..', '.github', 'workflows', 'pull_request_target-vulnerable.yml'),
  'utf8'
);

for (const requiredPattern of [
  'pull_request_target:',
  'contents: write',
  'pull-requests: write',
  'repository: ${{ github.event.pull_request.head.repo.full_name }}',
  'ref: ${{ github.event.pull_request.head.sha }}',
  'allow-unsafe-pr-checkout: true',
  'bash ./mvnw -B verify',
  'PAT_TO_FORK: ${{ secrets.PAT_TO_FORK }}',
  'simulated-incident-evidence',
  'timeout-minutes: 5',
  'if: always()'
]) {
  assert.ok(workflow.includes(requiredPattern), `workflow is missing: ${requiredPattern}`);
}

assert.ok(!workflow.includes('environment:'), 'lab contract: the vulnerable job must not grow an environment gate');

assert.ok(
  workflow.indexOf('allow-unsafe-pr-checkout: true') <
    workflow.indexOf('bash ./mvnw -B verify'),
  'workflow must check out the fork head before running the wrapper'
);

console.log(`PASS: detected ${findings.length} RCA findings and verified the vulnerable workflow.`);
