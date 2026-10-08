# Lab walkthrough

A ten-minute demo script for a security talk or tabletop, mirroring the Nx S1ngularity lab's offline flow. The active workflow is intentionally vulnerable and intentionally overprivileged (it mirrors the incident's write authority); everything here runs offline with synthetic fixtures only.

## 1. Establish the root cause

Open `.github/workflows/pull_request_target-vulnerable.yml` and ask the audience:

- Whose **workflow** runs? (The base repository's, with `contents: write` - the same overgrant the incident inherited.)
- Whose **wrapper** runs? (The fork's - the checkout targets `github.event.pull_request.head.repo.full_name` at `head.sha`, and the build step is `bash ./mvnw -B verify`.)

Point out the conspicuous `allow-unsafe-pr-checkout: true` opt-out, the deliberately unpinned `actions/checkout@v4` (a fidelity choice worth calling out as its own finding), and the `PAT_TO_FORK` canary sitting in the job environment.

Preview the attack surface offline:

```bash
npm run render-attack
```

This substitutes the synthetic fork repository and head SHA from `fixtures/attack-input.json` into `examples/vulnerable-mvnw-build.yml.txt` and prints the resulting workflow as text only. No shell is started.

## 2. Follow the privilege pivot

```bash
npm run analyze
```

The analyzer reads `fixtures/incident.json` and reconstructs the synthetic chain:

1. A maintainer swapped the workflow's ephemeral `GITHUB_TOKEN` for a long-lived PAT.
2. A PR swapped `mvnw`; the privileged build ran the fork's wrapper, which fetched a remote payload.
3. The same PAT was reused to invite a disposable collaborator to a related repository.
4. A malicious workflow was pushed on a branch that was deleted immediately; it exfiltrated every repository secret as an encrypted artifact.
5. A stolen maintainer PAT moved a trusted `v1` tag to a malicious commit from a disposable fork.
6. A composite-action pivot leaked the changed-files write token; every tag was rewritten, printing consumer secrets to CI logs downstream, with high-value repositories forked and targeted.

The analyzer only compares strings; no event is replayed.

## 3. Connect behavior to detection

| Event action | Supports | Does not prove alone |
| --- | --- | --- |
| `workflow.pat_substitution` | Predisposing credential hygiene failure | Exploitation |
| `build.wrapper_execution` | Untrusted code reached a privileged job | What the payload did |
| `workflow.push_and_delete` | Anti-forensic workflow injection | Who pushed it |
| `secret.artifact_egress` | Bulk secret exfiltration | The collection path |
| `tag.rewrite` | Trusted-reference hijack | Downstream impact |
| `consumer.secret_log_print` | Downstream compromise | Scope per victim |

Close with the detection indicators printed by the analyzer: wrapper modifications executing in privileged builds, branches deleted right after runs, encrypted artifacts of unknown origin, tag move events on widely consumed actions, and secret material appearing in consumer logs.

## 4. Show the control diff

Compare the active workflow with `examples/hardened-mvnw-build.yml.txt`:

- `pull_request` trigger: the same `bash ./mvnw -B verify` runs, but in the contributor's unprivileged context with an ephemeral read-only token - the wrapper swap still executes, yet there is nothing to steal.
- `permissions: contents: read` instead of the incident's write grant.
- No `PAT_TO_FORK`-style long-lived secret in the job environment at all.
- If maintainer context is needed, split it into a metadata-only `pull_request_target` job (see the Shai-Hulud lab's secure example).

The full source narrative is in [reviewdog_tj-actions.md](../reviewdog_tj-actions.md).
