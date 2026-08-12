# reviewdog / tj-actions pull_request_target RCA Demo

This private workshop repository demonstrates the `pull_request_target` attack pattern behind the reviewdog / tj-actions compromise using only a canary repository secret.

The repo intentionally keeps the vulnerable control flow active:

1. A maintainer workflow accepts a forked pull request.
2. The workflow checks out contributor-controlled code.
3. A build step executes a contributor-controlled script such as `mvnw`.
4. Because the workflow runs under `pull_request_target`, a canary secret from the base repository is visible to the script.

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

   if [[ -n "${PAT_TO_FORK:-}" ]]; then
     echo "PAT_TO_FORK_VISIBLE=true"
     echo "PAT_TO_FORK_LENGTH=${#PAT_TO_FORK}"
     printf "%s" "$PAT_TO_FORK" | sha256sum | awk '{ print "PAT_TO_FORK_SHA256_PREFIX=" substr($1, 1, 16) }'
   else
     echo "PAT_TO_FORK_VISIBLE=false"
   fi
   ```

4. Push the branch and open a pull request back to the private base repository.
5. Watch the `Vulnerable pull_request_target lab` workflow logs.
6. Confirm the log contains `SIMULATED_ATTACK_CONTROL_REACHED`.
7. Confirm the log contains `PAT_TO_FORK_VISIBLE=true`.

That marker shows that contributor-controlled code reached CI execution and could read the canary secret. In the real incident, that same class of mistake exposed useful maintainer-context credentials.

## Source Notes

- Narrative: [reviewdog_tj-actions.md](reviewdog_tj-actions.md)
- GitHub `pull_request_target` security guidance: https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target
- GitHub private fork workflow settings: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- GitHub private repository forking policy: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-the-forking-policy-for-your-repository
