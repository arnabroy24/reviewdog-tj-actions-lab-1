#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', 'examples', 'vulnerable-mvnw-build.yml.txt');
const inputPath = path.join(__dirname, '..', 'fixtures', 'attack-input.json');
const workflow = fs.readFileSync(workflowPath, 'utf8');
const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const rendered = workflow
  .replaceAll('${{ github.event.pull_request.head.repo.full_name }}', input.forkRepo)
  .replaceAll('${{ github.event.pull_request.head.sha }}', input.headSha);

console.log('Synthetic GitHub expression substitution preview');
console.log('The rendered workflow is printed as text only; no shell is started and nothing is checked out.');
console.log(`Command that would run the fork-controlled wrapper: ${input.buildCommand}`);
console.log('');
console.log(rendered);
