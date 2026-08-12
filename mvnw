#!/usr/bin/env bash
set -euo pipefail

echo "Trusted Maven wrapper simulation reached."
echo "Arguments: $*"
echo "No build is performed in the baseline repository."

mkdir -p .rca-demo
cat > .rca-demo/evidence.txt <<'EOT'
trusted_baseline=true
attacker_control=false
EOT
