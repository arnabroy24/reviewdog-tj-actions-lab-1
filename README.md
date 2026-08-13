# reviewdog / tj-actions pull_request_target RCA Demo

This public workshop repository demonstrates the `pull_request_target` attack pattern behind the reviewdog / tj-actions compromise using only a canary repository secret.

The repo intentionally keeps the vulnerable control flow active:

1. A maintainer workflow accepts a forked pull request.
2. The workflow checks out contributor-controlled code from the fork.
3. A normal-looking build step runs `bash ./mvnw -B verify`.
4. Because the workflow runs under `pull_request_target`, a canary secret from the base repository is visible to the script.
5. The workflow uploads a local artifact named `simulated-incident-evidence`, modeling how collected material could be retrieved from the workflow run.

The enabled workflow is `.github/workflows/pull_request_target-vulnerable.yml`.

The checkout step explicitly sets `allow-unsafe-pr-checkout: true` so GitHub will permit this demonstration to check out the fork's pull-request code. This setting is intentionally unsafe: do not copy it into a production workflow or combine it with real secrets.

## Repository Setup

This lab is intentionally public so a separate GitHub account can fork it and open a test pull request. The workflow is intentionally vulnerable and should only be used with the dummy canary secret described below.

Publish from this directory:

```bash
git init
git add .
git commit -m "Create reviewdog tj-actions RCA demo"
gh repo create OWNER/REPO-NAME --public --source . --remote origin --push
```

Recommended repository settings:

- Keep the repository public for this lab.
- Keep Actions enabled.
- Allow forking for the repository or organization.
- Do not send secrets to workflows from fork pull requests.
- Do not send write tokens to workflows from fork pull requests.
- Use GitHub-hosted runners only.
- Do not add production secrets to this repository.
- Add one repository secret named `PAT_TO_FORK` with a dummy canary value, for example `conference-canary-reviewdog-demo-2026`.
- Treat this repository as disposable. A contributor-controlled PR can execute shell commands in the vulnerable `pull_request_target` workflow.

## Participant Flow

1. Fork the base repository using a separate GitHub account.
2. Create a branch in the fork.
3. Replace `mvnw` in that branch with this harmless canary probe:

   ```bash
   #!/usr/bin/env bash
   set -euo pipefail

   echo "SIMULATED_ATTACK_CONTROL_REACHED"
   echo "The pull request changed mvnw, and CI executed it."
   echo "The command looked like a normal build: $*"

   mkdir -p .rca-demo
   evidence_file=".rca-demo/evidence.txt"

   {
     echo "simulated_stage=initial-pr-compromise"
     echo "attacker_control=true"
     echo "base_repository=${BASE_REPOSITORY:-unknown}"
     echo "head_repository=${HEAD_REPOSITORY:-unknown}"
     echo "head_sha=${HEAD_SHA:-unknown}"
     echo "pr_number=${PR_NUMBER:-unknown}"
   } > "$evidence_file"

   if [[ -n "${PAT_TO_FORK:-}" ]]; then
     echo "PAT_TO_FORK_VISIBLE=true"
     echo "PAT_TO_FORK_LENGTH=${#PAT_TO_FORK}"
     {
       echo "canary_secret_present=true"
       echo "canary_secret_length=${#PAT_TO_FORK}"
       printf "%s" "$PAT_TO_FORK" | sha256sum | awk '{ print "canary_secret_sha256_prefix=" substr($1, 1, 16) }'
     } >> "$evidence_file"
   else
     echo "PAT_TO_FORK_VISIBLE=false"
     echo "canary_secret_present=false" >> "$evidence_file"
   fi

   cat >> "$evidence_file" <<'EOT'
simulated_stage_2=would_invite_disposable_user_or_push_workflow
simulated_stage_3=would_reuse_maintainer_token_against_related_repo
simulated_stage_4=would_move_trusted_tag_to_malicious_commit
external_exfiltration=false
EOT
   ```

4. Push the branch to the fork.
5. Open a pull request from `your-fork:branch` into the original repository's `master` branch. Do not open the PR against the fork itself.
6. Watch the `Vulnerable pull_request_target lab` workflow logs.
7. Confirm the log contains `SIMULATED_ATTACK_CONTROL_REACHED`.
8. Confirm the log contains `PAT_TO_FORK_VISIBLE=true`.
9. Download the `simulated-incident-evidence` workflow artifact and inspect `evidence.txt`.

The important relationship is that the workflow belongs to the original repository, while the changed `mvnw` comes from the fork. Because the workflow uses `pull_request_target` and checks out `github.event.pull_request.head.sha`, the base workflow executes contributor-controlled code with access to the base repository's canary secret.

That marker shows that contributor-controlled code reached CI execution and could read the canary secret. In the real incident, that same class of mistake exposed useful maintainer-context credentials.

## Source Notes

- Narrative: [reviewdog_tj-actions.md](reviewdog_tj-actions.md)
- GitHub `pull_request_target` security guidance: https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- GitHub private fork workflow settings: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- GitHub private repository forking policy: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-forking-policy-for-your-repository
